# Wormcells-viz
> Visualization tools for *C. elegans* single cell data 

### Current Deployments

- **CeNGEN L4 neuron dataset**: [cengen.textpressolab.com](https://cengen.textpressolab.com/)
- **Packer 2019 embryogenesis dataset**: [packer2019.textpressolab.com](https://packer2019.textpressolab.com/)
- **Ben-David 2021 L2 larvae dataset**: [bendavid2021.textpressolab.com](https://bendavid2021.textpressolab.com/)

### Repository structure

- backend: a Python API based on Falcon to manage single cell datasets
- frontend: a ReactJS app that fetches data from the backend and displays them through d3 charts
- manual_deployment: configuration files for nginx and systemd to help with deployment
- data_preparation: a Python pipeline that uses [scvi-tools](https://scvi-tools.org) and [anndata](https://anndata.readthedocs.io)

### Data preparation

This Python pipeline uses scvi-tools to go from gene count matrix to the 
three anndatas that are used to deploy the app:
- Heatmap anndata
- Histogram anndata
- Swarm plot anndata 

The script `data_preparation.py` will perform all the steps and create these files.
However it is relatively complex and if the input anndata doesn't conform to the 
[WormBase anndata wrangling guidelines](https://github.com/WormBase/anndata-wrangling) it will fail.
In order to help explain what the formats are, all the steps performed by the pipeline 
are reviewed in [this Colab notebook](https://colab.research.google.com/github/WormBase/wormcells-notebooks/blob/main/wormcells_viz_pipeline_example.ipynb).

Please note that the swarm plot anndata is the slowest one to generate because it requires pairwise DE of all cell types,
if you have >100 celltypes it can take days to run the pipeline without parallelization, and the intermediary files can be quite big. 
To make it easier to parallelize and run the pipeline on a cluster, we provide a snakemake file for running the pairwise DE step in parallel for each cell type.
If you have trouble using it please open an issue.

### Installation

#### Docker

The repository contains a `docker-compose.yml` file that can be used to easily deploy the api and the web application.
Before running docker-compose, modify the *_FILE_PATH variables in the .env file in the root folder of the project to 
point to the three .h5ad files generated for the dataset. You can also change the port used by the web application and 
the api through the variable WEB_APP_PORT.

To start the stack, run the following command:

        $ docker-compose up -d

To run multiple instances of the application through docker on the same machine, clone the project multiple times in 
separate folders, set different ports for the api and the web app of each instance, and run each of them with 
`docker-compose up`.

#### Manual installation

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
        > REACT_APP_API_AUTOCOMPLETE_ENDPOINT=https://caltech-curation.textpressolab.com/pub/cgi-bin/forms/datatype_objects.cgi?action=autocompleteXHR

4. Install the frontend requirements:

        $ cd frontend
   
        $ yarn install
   
        Or

        $ npm install

5. Start the React app:

        $ yarn start

        Or

        $ npm start
   
### Deploy the app on AWS with nginx and gunicorn

We based the instructions below on [this Digital Ocean guide](https://www.digitalocean.com/community/tutorials/how-to-serve-flask-applications-with-uswgi-and-nginx-on-ubuntu-18-04) for deploying Flask apps with Gunicorn on Ubuntu 18.04. 

In addition to `requirements.txt` in order to make the front end build at step 10 you need _or_ you can build the app locally and scp the files to the server.

1. Clone the git repo on the AWS instance
2. Create a Python venv in the repo main folder
```
cd wormcells-viz;
python3 -m venv venv
```
3. Activate the venv
```
source venv/bin/activate
```
4. Install Python requirements
```
pip3 install -r requirements.txt
```
5. Copy the desired nginx config files from `deployment/nginx` to the `/etc/nginx/site-enabled` folder on the AWS instance
6. Copy the systemd unit files and their config directories to `/etc/systemd/system/` on the AWS instance
```
# for example
sudo cp test.service /etc/systemd/system
sudo cp -r test.service.d/ /etc/systemd/system
```
7. Modify the config files to point to the correct anndata file locations   
8. Enable the services and start them
```
# project name is the filename, here `test`
sudo systemctl enable test
sudo systemctl start test
# to verify the status
sudo systemctl status test
```
9. Modify the .env file in the frontend react app folder to point to the AWS instance address with the configured api port for cengen   
10. Build the frontend react app (`npm install` and then `npm run build --production`) locally and copy the bundle to `/var/www/wormcells-viz/test`
```
# if the built was done in the deploy machine wormcells-viz folder just do:
sudo cp -r build/ /var/www/wormcells-viz/test
```
11. Repeat from 6 (Copy the desired nginx config files...) to the step above for the other datasets
12. Restart nginx: `sudo service nginx restart`
