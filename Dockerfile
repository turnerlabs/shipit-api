From node:6.10.3
ADD . /opt/shipit-api
WORKDIR /opt/shipit-api
CMD ["./bin/www"]
