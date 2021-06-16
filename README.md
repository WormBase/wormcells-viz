# Wormcells-viz
> Visualization tools for *C. elegans* single cell data 

### Repository structure

- Backend: a Python API based on Falcon to manage single cell datasets
- Frontend: a ReactJS app that fetches data from the backend and displays them through d3 charts

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
   
### Deploy the app on AWS with nginx and gunicorn

1. Clone the git repo on the AWS instance
2. Copy the desired nginx config files from deployment/nginx to the /etc/nginx/site-enabled folder on the AWS instance
3. Copy the systemd unit files and their config directories to /etc/systemd/system/ on the AWS instance
4. Modify the config files to point to the correct anndata file locations   
5. Enable the services and start them
6. Modify the .env file in the frontend react app folder to point to the AWS instance address with the configured api port for cengen   
7. Build the frontend react app (`npm run build --production`) locally and copy the bundle to /var/www/wormcells-viz/cengen
8. Repeat 6. and 7. for the other datasets
9. Restart nginx
