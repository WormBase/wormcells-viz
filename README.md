# Wormcells-viz
> Visualization tools for *C. elegans* single cell data 

### Repository structure

- Backend: a Python API based on Falcon to manage single cell datasets
- Frontend: a ReactJS app that fetches data from the backend and displays them through d3 charts
- Data Preparation: a Python pipeline that uses [scvi-tools](https://scvi-tools.org) and [anndata](https://anndata.readthedocs.io)


### Data preparation

This Python pipeline that uses scvi-tools to go from gene count matrix to the 
three anndatas are used to deploy the app:
- Heatmap anndata
- Histogram anndata
- Swarm plot anndata 

The script `data_preparation.py` will perform all the steps and create these files.
However it is relatively complex and if the input anndata doesn't conform to the 
[WormBase anndata wrangling guidelines](https://github.com/WormBase/anndata-wrangling) it will fail.
In order to help explain what the formats are, all the steps  performed by the pipeline 
are reviewed in [this Colab notebook](https://colab.research.google.com/github/WormBase/wormcells-notebooks/blob/main/wormcells_viz_pipeline_example.ipynb).

Please note that the swarm plot anndata is the slowest one to generate because requires pairwise DE of all cell types,
if you have >100 celltypes it can take days to run the pipeline without parallelization. 
If you have trouble using it please open an issue.

### Install

1. Follow the instructions to clone the repo form github
2. From the project root folder, create a python virtual environment and activate it:
        
        $ python3 -m venv venv
        $ source venv/bin/activate

3. Install required packages:
   
        $ pip3 install -r requirements
   
2. From the root folder of the project, run the backend api in a shell:
   
        Run with the Falcon built-in server for development:
   
        $ nohup python3 backend/api.py -e /path/to/heatmap_data.h5ad -i /path/to/histogram_data.h5ad -s /path/to/swarmplot_data.h5ad -p 32323 &
   
        Or run with gunicorn for production (install it via pip if necessary):

        $ export HEATMAP_FILE_PATH=/path/to/heatmap_data; export HISTOGRAM_FILE_PATH=/path/to/histogram_data; export SWARMPLOT_FILE_PATH=/path/to/swarmplot_data; nohup gunicorn -b 0.0.0.0:32323 backend.api:app &>/path/to/api.log &

        Where 32323 is the port used by the API

3. Modify the frontend/.env file to point to the running api hostname and port:

        > REACT_APP_API_ENDPOINT_READ_DATA_HEATMAP=<api_hostname>:<api_port>/get_data_heatmap
        > REACT_APP_API_ENDPOINT_READ_DATA_RIDGELINE=<api_hostname>:<api_port>/get_data_histogram
        > REACT_APP_API_ENDPOINT_READ_DATA_SWARMPLOT=<api_hostname>:<api_port>/get_data_swarmplot
        > REACT_APP_API_ENDPOINT_READ_ALL_GENES=<api_hostname>:<api_port>/get_all_genes
        > REACT_APP_API_ENDPOINT_READ_ALL_CELLS=<api_hostname>:<api_port>/get_all_cells
        > REACT_APP_API_AUTOCOMPLETE_ENDPOINT=https://tazendra.caltech.edu/~azurebrd/cgi-bin/forms/datatype_objects.cgi?action=autocompleteXHR

4. Install the frontend requirements:

        $ cd frontend
   
        $ yarn install
   
        Or

        $ npm install

5. Start the React app:

        $ yarn start

        Or

        $ npm start

        Run the app with nginx for production
