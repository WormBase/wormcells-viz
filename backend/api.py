#!/usr/bin/env python3

import argparse
import json
import logging
import math
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


class FileStorageEngine(object):

    def __init__(self, mean_matrix_location, full_matrix_location):
        self.mean_matrix = pd.read_csv(mean_matrix_location)
        self.full_marix = pd.read_hdf(full_matrix_location)
        logger.info("files successfully loaded")

    def get_data_matrix(self, gene_ids: List[str] = None, cell_names: List[str] = None, dataset: str = 'cengen'):
        gene_ids = gene_ids if gene_ids else list(self.mean_matrix.gene_id)[0:20]
        cell_names = cell_names if cell_names else list(self.mean_matrix)[0:20]
        cell_names = set(cell_names)
        cell_names.add('gene_id')
        cell_names = sorted(list(cell_names), reverse=True)
        sliced_csv = self.mean_matrix.loc[self.mean_matrix.gene_id.isin(gene_ids)][cell_names]
        results_dict = defaultdict(dict)
        for _, row in sliced_csv.iterrows():
            for col_name, col_value in row.iteritems():
                if col_name != "gene_id":
                    results_dict[row.gene_id][col_name] = col_value
        return dict(results_dict)

    def get_data_gene(self, gene_id: str = None):
        gene_id = gene_id if gene_id else list(self.full_marix.columns)[0]
        gene_vec = self.full_marix[gene_id]
        results = defaultdict(list)
        for col_name, col_value in gene_vec.iteritems():
            if col_name != "gene_id":
                cell_barcode, cell_type = col_name.split("%")
                if col_value > 0:
                    results[cell_type].append(col_value)
        return results, gene_id

    def get_data_cell(self, cell: str = None):
        cell = cell if cell else [cell for cell in list(self.mean_matrix) if cell != 'gene_id'][0]
        genes_series = self.mean_matrix['gene_id']
        values_series = self.mean_matrix[cell]
        best_genes = [gene_id for gene_id, _ in sorted(zip(genes_series, values_series), key=lambda x: x[1])[0:25]]
        cell_names = self.get_all_cells()
        results = {}
        for gene_id in best_genes:
            ref_val = float(self.mean_matrix.loc[self.mean_matrix.gene_id == gene_id, cell])
            values = self.mean_matrix.loc[self.mean_matrix.gene_id == gene_id]
            results[gene_id] = (ref_val, [(cell_name, float(values[cell_name]), math.log2(values[cell_name]/ref_val))
                                          for cell_name in cell_names if float(values[cell_name]) > 0])
        return cell, results

    def get_all_genes(self):
        return list(self.mean_matrix.gene_id)

    def get_all_cells(self):
        return [cell for cell in list(self.mean_matrix.columns) if cell != 'gene_id']


class GeneCellMatrixReader:

    def __init__(self, storage_engine: FileStorageEngine):
        self.storage = storage_engine
        self.logger = logging.getLogger(__name__)

    def on_post(self, req, resp):
        if req.media:
            gene_ids = req.media["gene_ids"] if "gene_ids" in req.media and req.media["gene_ids"] and \
                                                req.media["gene_ids"] != [''] else None
            cell_names = req.media["cell_names"] if "cell_names" in req.media and req.media["cell_names"] and \
                                                    req.media["cell_names"] != [''] else None
            results = self.storage.get_data_matrix(gene_ids=gene_ids, cell_names=cell_names)
            resp.body = f'{{"response": {json.dumps(results)}}}'
            resp.status = falcon.HTTP_OK
        else:
            resp.status = falcon.HTTP_BAD_REQUEST


class SingleGeneReader:

    def __init__(self, storage_engine: FileStorageEngine):
        self.storage = storage_engine
        self.logger = logging.getLogger(__name__)

    def on_post(self, req, resp):
        if req.media:
            gene_id = req.media["gene_id"] if "gene_id" in req.media and req.media["gene_id"] else None
            try:
                results, gene_id = self.storage.get_data_gene(gene_id=gene_id)
            except KeyError:
                results, gene_id = {}, gene_id
            resp.body = f'{{"response": {json.dumps(results)}, "gene_id": "{gene_id}"}}'
            resp.status = falcon.HTTP_OK
        else:
            resp.status = falcon.HTTP_BAD_REQUEST


class SingleCellReader:

    def __init__(self, storage_engine: FileStorageEngine):
        self.storage = storage_engine
        self.logger = logging.getLogger(__name__)

    def on_post(self, req, resp):
        if req.media:
            cell = req.media.get("cell")
            try:
                cell_name, results = self.storage.get_data_cell(cell=cell)
            except KeyError:
                cell_name, results = 'None', []
            resp.body = f'{{"response": {json.dumps(results)}, "cell": "{cell_name}"}}'
            resp.status = falcon.HTTP_OK
        else:
            resp.status = falcon.HTTP_BAD_REQUEST


class GenesReader:

    def __init__(self, storage_engine: FileStorageEngine):
        self.storage = storage_engine
        self.logger = logging.getLogger(__name__)

    def on_get(self, req, resp):
        resp.body = json.dumps(self.storage.get_all_genes())
        resp.status = falcon.HTTP_OK


class CellsReader:

    def __init__(self, storage_engine: FileStorageEngine):
        self.storage = storage_engine
        self.logger = logging.getLogger(__name__)

    def on_get(self, req, resp):
        resp.body = json.dumps(self.storage.get_all_cells())
        resp.status = falcon.HTTP_OK


def main():
    parser = argparse.ArgumentParser(description="Single cell backend")
    parser.add_argument("-f", "--full-matrix", metavar="full_matrix_file", dest="full_matrix_file", type=str)
    parser.add_argument("-m", "--mean-matrix", metavar="mean_matrix_file", dest="mean_matrix_file", type=str)
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
    file_storage = FileStorageEngine(args.mean_matrix_file, args.full_matrix_file)
    gene_cell_matrix_reader = GeneCellMatrixReader(file_storage)
    app.add_route('/get_data_matrix', gene_cell_matrix_reader)
    single_gene_reader = SingleGeneReader(file_storage)
    app.add_route('/get_data_gene', single_gene_reader)
    app.add_route('/get_data_cell', SingleCellReader(file_storage))
    app.add_route('/get_all_genes', GenesReader(file_storage))
    app.add_route('/get_all_cells', CellsReader(file_storage))


    httpd = simple_server.make_server('0.0.0.0', args.port, app)
    httpd.serve_forever()


if __name__ == '__main__':
    main()
else:
    import os
    app = falcon.API(middleware=[HandleCORS()])
    file_storage = FileStorageEngine(os.environ['MEAN_MATRIX_FILE_PATH'], os.environ['FULL_MATRIX_FILE_PATH'])
    gene_cell_matrix_reader = GeneCellMatrixReader(file_storage)
    app.add_route('/get_data_matrix', gene_cell_matrix_reader)
    single_gene_reader = SingleGeneReader(file_storage)
    app.add_route('/get_data_gene', single_gene_reader)
    app.add_route('/get_data_cell', SingleCellReader(file_storage))
    app.add_route('/get_all_genes', GenesReader(file_storage))
    app.add_route('/get_all_cells', CellsReader(file_storage))


