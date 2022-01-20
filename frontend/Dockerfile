FROM node:12.22.7 as build-stage
RUN mkdir /usr/src/app
WORKDIR /usr/src/app
ENV PATH /usr/src/app/node_modules/.bin:$PATH
COPY frontend .
COPY .env main.env
RUN echo -e "\n" >> main.env
RUN cat .env >> main.env
RUN mv main.env .env
RUN npm install --silent
RUN npm run build --production

FROM nginx:1.15.2-alpine

COPY --from=build-stage /usr/src/app/build/ /var/www
COPY --from=build-stage /usr/src/app/.env /var/www/.env

COPY frontend/nginx.conf /etc/nginx/nginx.conf

# production environment
EXPOSE 5000
ENTRYPOINT ["nginx","-g","daemon off;"]