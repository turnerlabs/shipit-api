FROM node:6.10.3
WORKDIR /opt/shipit-api
ADD . .
RUN npm install
CMD ["./bin/www"]
