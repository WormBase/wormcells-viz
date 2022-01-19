FROM node:12.22.7 as build-stage
RUN mkdir /usr/src/app
WORKDIR /usr/src/app
ENV PATH /usr/src/app/node_modules/.bin:$PATH
COPY frontend .
RUN npm install --silent
RUN npm run build --production

FROM nginx:1.15.2-alpine

COPY --from=build-stage /usr/src/app/build/ /var/www

COPY frontend/nginx.conf /etc/nginx/nginx.conf

# production environment
EXPOSE 5000
ENTRYPOINT ["nginx","-g","daemon off;"]