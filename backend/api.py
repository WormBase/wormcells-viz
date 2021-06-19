#!/usr/bin/env python3

import argparse
import json
import logging
from collections import defaultdict
from typing import List

import anndata

import falcon

from wsgiref import simple_server
from falcon import HTTPStatus
import urllib.request


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

    def __init__(self, heatmap_file_path, histogram_file_path, swarmplot_file_path):
        self.heatmap = anndata.read_h5ad(heatmap_file_path)
        self.histogram = anndata.read_h5ad(histogram_file_path)
        self.swarmplot = anndata.read_h5ad(swarmplot_file_path)
        logger.info("files successfully loaded")

    def get_data_heatmap(self, gene_ids: List[str] = None, cell_names: List[str] = None, dataset: str = 'cengen'):
        gene_ids = gene_ids if gene_ids else self.get_all_genes()[0:20]
        cell_names = sorted(list(set(cell_names if cell_names else self.get_all_cells()[0:20])), reverse=True)
        results_dict = defaultdict(dict)
        for cell_name in cell_names:
            for gene_id in gene_ids:
                results_dict[gene_id][cell_name] = float(self.heatmap[cell_name, gene_id].X)
        return dict(results_dict)

    def get_data_histogram(self, gene_id: str = None):
        gene_id = gene_id if gene_id else self.get_all_genes()[0]
        return {cell_name: self.histogram.layers[gene_id][idx].toarray()[0].tolist() for
                idx, cell_name in enumerate(self.histogram.obs.index)}, gene_id

    def get_data_swarmplot(self, cell: str = None, sort_by: str = 'p_value', ascending: bool = True,
                           max_num_genes: int = 50):
        cell = cell if cell else self.get_all_cells()[0]
        cell_names = self.get_all_cells()
        best_genes = []
        sort_by = sort_by if sort_by else 'p_value'
        max_num_genes = max_num_genes if max_num_genes else 50
        if sort_by == 'p_value':
            best_genes = list(self.swarmplot.uns[cell].proba_not_de.sort_values(ascending=ascending)[0:max_num_genes].index.values)
        elif sort_by == 'lfc':
            best_genes = list(self.swarmplot.uns[cell].lfc_mean.sort_values(ascending=ascending)[0:max_num_genes].index.values)
        elif sort_by == 'expr':
            best_genes = list(self.swarmplot.uns[cell].scale1.sort_values(ascending=ascending)[0:max_num_genes].index.values)
        best_genes_loc = {gene_id: self.swarmplot.var_names.get_loc(gene_id) for gene_id in best_genes}
        cell_names_loc = {cell_name: self.swarmplot.obs_names.get_loc(cell_name) for cell_name in cell_names}
        results = {}
        for gene_id in best_genes:
            ref_val = float(self.swarmplot.uns['heatmap'][cell][gene_id])
            results[gene_id] = (ref_val, [(cell_name, float(self.swarmplot.uns['heatmap'][cell_name][gene_id]),
                                           float(self.swarmplot.layers[cell_name][cell_names_loc[cell]][best_genes_loc[gene_id]]))
                                          for cell_name in cell_names if
                                          float(self.swarmplot.uns[cell_name].lfc_mean[gene_id]) > 0])
        return cell, results

    def get_all_genes(self):
        return list(self.heatmap.var_names)

    def get_all_cells(self):
        return list(self.heatmap.obs_names)


class HeatmapReader:

    def __init__(self, storage_engine: FileStorageEngine):
        self.storage = storage_engine
        self.logger = logging.getLogger(__name__)

    def on_post(self, req, resp):
        if req.media:
            gene_ids = req.media["gene_ids"] if "gene_ids" in req.media and req.media["gene_ids"] and \
                                                req.media["gene_ids"] != [''] else None
            cell_names = req.media["cell_names"] if "cell_names" in req.media and req.media["cell_names"] and \
                                                    req.media["cell_names"] != [''] else None
            results = self.storage.get_data_heatmap(gene_ids=gene_ids, cell_names=cell_names)
            gene_ids = list(results.keys())
            cell_names = list(results[gene_ids[0]].keys())
            print("Requested heatmap data by IP " + req.access_route[0] + " gene_ids=" + ",".join(gene_ids) +
                  " cells=" + ",".join(cell_names))
            resp.body = f'{{"response": {json.dumps(results)}}}'
            resp.status = falcon.HTTP_OK
        else:
            resp.status = falcon.HTTP_BAD_REQUEST


class HistogramReader:

    def __init__(self, storage_engine: FileStorageEngine):
        self.storage = storage_engine
        self.logger = logging.getLogger(__name__)

    def on_post(self, req, resp):
        if req.media:
            gene_id = req.media["gene_id"] if "gene_id" in req.media and req.media["gene_id"] else None
            try:
                results, gene_id = self.storage.get_data_histogram(gene_id=gene_id)
            except KeyError:
                results, gene_id = {}, gene_id
            print("Requested histogram data by IP " + req.access_route[0] + " gene_id=" + gene_id)
            resp.body = f'{{"response": {json.dumps(results)}, "gene_id": "{gene_id}"}}'
            resp.status = falcon.HTTP_OK
        else:
            resp.status = falcon.HTTP_BAD_REQUEST


class SwarmplotReader:

    def __init__(self, storage_engine: FileStorageEngine):
        self.storage = storage_engine
        self.logger = logging.getLogger(__name__)

    def on_post(self, req, resp):
        if req.media:
            cell = req.media.get("cell")
            max_num_genes = req.media.get("max_num_genes")
            ascending = req.media.get("ascending")
            ascending = ascending == "true" if ascending else True
            max_num_genes = int(max_num_genes) if max_num_genes else max_num_genes
            sort_by = req.media.get("sort_by")
            cell_name, results = self.storage.get_data_swarmplot(cell=cell, max_num_genes=max_num_genes,
                                                                 sort_by=sort_by, ascending=ascending)
            print("Requested swarmplot data by IP " + req.access_route[0] + " cell=" + cell_name +
                  " max_num_genes=" + str(max_num_genes) + " ascending=" + str(ascending) + " sort_by=" + sort_by)
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


class GeneDescriptionsReader:

    def on_get(self, req, resp, gene_id):
        with urllib.request.urlopen(f'http://rest.wormbase.org/rest/field/gene/{gene_id}/concise_description') as response:
            desc = json.loads(response.read())
            desc = desc["concise_description"]["data"]["text"]
            resp.body = json.dumps(desc)
            resp.status = falcon.HTTP_OK


class GeneNameReader:

    def on_get(self, req, resp, gene_id):
        with urllib.request.urlopen(f'http://rest.wormbase.org/rest/field/gene/{gene_id}/name') as response:
            name = json.loads(response.read())
            name = name["name"]["data"]["label"]
            resp.body = json.dumps(name)
            resp.status = falcon.HTTP_OK


def main():
    parser = argparse.ArgumentParser(description="Single cell backend")
    parser.add_argument("-e", "--heatmap-file", metavar="heatmap_file", dest="heatmap_file", type=str)
    parser.add_argument("-i", "--histogram-file", metavar="histogram_file", dest="histogram_file", type=str)
    parser.add_argument("-s", "--swarmplot-file", metavar="swarmplot_file", dest="swarmplot_file", type=str)
    parser.add_argument("-p", "--port", metavar="port", dest="port", type=int, help="API port")
    parser.add_argument("-l", "--log-file", metavar="log_file", dest="log_file", type=str, default=None,
                        help="path to the log file to generate")
    parser.add_argument("-L", "--log-level", dest="log_level", choices=['DEBUG', 'INFO', 'WARNING', 'ERROR',
                                                                        'CRITICAL'], default="INFO",
                        help="set the logging level")
    args = parser.parse_args()

    logging.basicConfig(filename=args.log_file, level=args.log_level,
                        format='%(asctime)s - %(name)s - %(levelname)s:%(message)s')

    app = falcon.API(middleware=[HandleCORS()])
    file_storage = FileStorageEngine(args.heatmap_file, args.histogram_file, args.swarmplot_file)
    app.add_route('/get_data_heatmap', HeatmapReader(file_storage))
    app.add_route('/get_data_histogram', HistogramReader(file_storage))
    app.add_route('/get_data_swarmplot', SwarmplotReader(file_storage))
    app.add_route('/get_all_genes', GenesReader(file_storage))
    app.add_route('/get_all_cells', CellsReader(file_storage))
    app.add_route('/get_gene_concise_desc/{gene_id}', GeneDescriptionsReader())
    app.add_route('/get_gene_name/{gene_id}', GeneNameReader())
    httpd = simple_server.make_server('0.0.0.0', args.port, app)
    httpd.serve_forever()


if __name__ == '__main__':
    main()
else:
    import os
    app = falcon.API(middleware=[HandleCORS()])
    file_storage = FileStorageEngine(os.environ['HEATMAP_FILE_PATH'], os.environ['HISTOGRAM_FILE_PATH'],
                                     os.environ['SWARMPLOT_FILE_PATH'])
    app.add_route('/get_data_heatmap', HeatmapReader(file_storage))
    app.add_route('/get_data_histogram', HistogramReader(file_storage))
    app.add_route('/get_data_swarmplot', SwarmplotReader(file_storage))
    app.add_route('/get_all_genes', GenesReader(file_storage))
    app.add_route('/get_all_cells', CellsReader(file_storage))
    app.add_route('/get_gene_concise_desc/{gene_id}', GeneDescriptionsReader())
    app.add_route('/get_gene_name/{gene_id}', GeneNameReader())


