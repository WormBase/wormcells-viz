#!/usr/bin/env python3

import argparse
import json
import logging
from collections import defaultdict
from typing import List

import pandas as pd

import falcon

from wsgiref import simple_server
from falcon import HTTPStatus


logger = logging.getLogger(__name__)


class HandleCORS(object):
    def process_request(self, req, resp):
        allow_headers = req.get_header(
            'Access-Control-Request-Headers',
            default='*'
        )
        resp.set_header('Access-Control-Allow-Origin', '*')
        resp.set_header('Access-Control-Allow-Methods', '*')
        resp.set_header('Access-Control-Allow-Headers', allow_headers)
        resp.set_header('Access-Control-Max-Age', 1728000)  # 20 days
        if req.method == 'OPTIONS':
            raise HTTPStatus(falcon.HTTP_200, body='\n')


class CSVStorageEngine(object):

    def __init__(self, csv_location):
        self.csv_location = csv_location
        self.csv = pd.read_csv(self.csv_location)
        logger.info("CSV file successfully loaded")

    def get_data(self, gene_ids: List[str] = None, cell_names: List[str] = None, experiment: str = 'cengen'):
        gene_ids = gene_ids if gene_ids else list(self.csv.gene_id)[0:50]
        cell_names = cell_names if cell_names else list(self.csv)[0:50]
        cell_names = set(cell_names)
        cell_names.add('gene_id')
        cell_names = sorted(list(cell_names), reverse=True)
        sliced_csv = self.csv.loc[self.csv.gene_id.isin(gene_ids)][cell_names]
        results_dict = defaultdict(dict)
        for _, row in sliced_csv.iterrows():
            for col_name, col_value in row.iteritems():
                if col_name != "gene_id":
                    results_dict[row.gene_id][col_name] = col_value
        return dict(results_dict)


class CSVReader:

    def __init__(self, storage_engine: CSVStorageEngine):
        self.storage = storage_engine
        self.logger = logging.getLogger(__name__)

    def on_post(self, req, resp):
        if req.media:
            gene_ids = req.media["gene_ids"] if "gene_ids" in req.media and req.media["gene_ids"] and \
                                                req.media["gene_ids"] != [''] else None
            cell_names = req.media["cell_names"] if "cell_names" in req.media and req.media["cell_names"] and \
                                                    req.media["cell_names"] != [''] else None
            results = self.storage.get_data(gene_ids=gene_ids, cell_names=cell_names)
            resp.body = f'{{"response": {json.dumps(results)}}}'
            resp.status = falcon.HTTP_OK
        else:
            resp.status = falcon.HTTP_BAD_REQUEST


def main():
    parser = argparse.ArgumentParser(description="Single cell backend")
    parser.add_argument("-f", "--file", metavar="csv_file", dest="csv_file", type=str)
    parser.add_argument("-l", "--log-file", metavar="log_file", dest="log_file", type=str, default=None,
                        help="path to the log file to generate")
    parser.add_argument("-L", "--log-level", dest="log_level", choices=['DEBUG', 'INFO', 'WARNING', 'ERROR',
                                                                        'CRITICAL'], default="INFO",
                        help="set the logging level")
    parser.add_argument("-p", "--port", metavar="port", dest="port", type=int, help="API port")
    args = parser.parse_args()

    logging.basicConfig(filename=args.log_file, level=args.log_level,
                        format='%(asctime)s - %(name)s - %(levelname)s:%(message)s')

    app = falcon.API(middleware=[HandleCORS()])
    storage = CSVStorageEngine(args.csv_file)
    reader = CSVReader(storage)
    app.add_route('/get_data', reader)

    httpd = simple_server.make_server('0.0.0.0', args.port, app)
    httpd.serve_forever()


if __name__ == '__main__':
    main()
else:
    import os
    app = falcon.API(middleware=[HandleCORS()])
    storage = CSVStorageEngine(os.environ['CSV_FILE_PATH'])
    reader = CSVReader(storage)
    app.add_route('/get_data', reader)
