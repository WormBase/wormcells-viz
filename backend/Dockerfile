FROM python:3.8-slim

WORKDIR /usr/src/app/
ADD requirements.txt .
RUN pip3 install -r requirements.txt
COPY backend .

ENV PYTHONPATH=$PYTHONPATH:/usr/src/app/
ENV API_PORT=32323

EXPOSE ${API_PORT}
CMD python3 api.py -e /var/www/assets/heatmap_file.h5ad -i /var/www/assets/histogram_file.h5ad -s /var/www/assets/swarmplot_file.h5ad -p ${API_PORT}