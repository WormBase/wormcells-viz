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
   
        $ nohup python3 backend/api.py -m /path/to/mean_matrix.csv -f /path/to/full_matrix.HDF5.float16 -p 32323 &
   
        Or run with gunicorn for production (install it via pip if necessary):

        $ export MEAN_MATRIX_FILE_PATH=/path/to/mean_matrix.csv; export FULL_MATRIX_FILE_PATH=/path/to/full_matrix.HDF5.float16; nohup gunicorn -b 0.0.0.0:32323 backend.api:app &>/path/to/api.log &

        Where 32323 is the port used by the API

3. Modify the frontend/.env file to point to the running api hostname and port:

        > REACT_APP_API_ENDPOINT_READ_DATA_HEATMAP=http://yourhostname:32323/get_data_matrix
        > REACT_APP_API_ENDPOINT_READ_DATA_RIDGELINE=http://yourhostname:32323/get_data_gene

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
