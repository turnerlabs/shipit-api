const express = require('express'),
    middleware = require('./routes'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    cors = require('cors');

global.status = 200;
global.appError = null;

const app = express();

app.set('x-powered-by', false);
app.set('etag', false);

app.use(bodyParser.json());
app.use(cors());

app.get('/_hc', middleware.health);

app.use(morgan('short'));

const routes = require('./routes'),
    shipment = require('./routes/shipment'),
    environment = require('./routes/environment'),
    provider = require('./routes/provider'),
    container = require('./routes/container'),
    port = require('./routes/port'),
    envVar = require('./routes/envVar'),
    log = require('./routes/log');

app.use(routes.setParams);
app.use(routes.authenticate);
app.use(routes.setGroups);
app.use(routes.authorize);
app.use('/v1', shipment);
app.use('/v1', environment);
app.use('/v1', provider);
app.use('/v1', container);
app.use('/v1', port);
app.use('/v1', envVar);
app.use('/v1', log);

// Error handling
app.use(middleware.errorHandler);

module.exports = app;
