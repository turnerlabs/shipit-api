"use strict";

let express         = require('express'),
    bodyParser      = require('body-parser'),
    cors            = require('cors'),
    genEndpoints    = require('./endpoints/endpoints'),
    appVersion      = require('./package.json').version,
    renderEndPoints = require('./endpoints/render'),
    mongoose        = require('mongoose');

let endPoints = {get:[],post:[],put:[],delete:[]},
    myPort = process.env.PORT || 6055,
    healthcheck = process.env.HEALTHCHECK || '/_hc';

let app = express();
let retriedConnection = 0;

app.use(bodyParser.json());
app.use(cors());
app.use(function (req, res, next) {
    req.body.username = null
    req.body.username = req.headers['x-username'] || '';
    req.body.token = null
    req.body.token = req.headers['x-token'] || '';
    next();
});

app.use(function (error, req, res, next) {
  if (error) {
    res.status(400);
    res.send('{"error":"'+error.message+'"}');
  } else {
    next();
  }
});

app.all('/v1/*', function (req, res, next) {
  res.header('Content-Type', 'application/json');
  next();
});

app.get(healthcheck, (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
      retriedConnection = 0;
      res.send('OK Version: ' + appVersion);
  } else {
      if (retriedConnection > 30) {
          console.error('ERROR: Mongoose Connection Is Broken');
          res.status(500).send('ERROR: Mongoose Connection Is Broken');
      } else {
          retriedConnection++;
          console.error("ERROR: Retrying Connection to DB", retriedConnection);
          res.send('OK Version: ' + appVersion);
      }
  }
});

genEndpoints.forEach(function(i) {
  app[i.type](i.path,i.function);
  endPoints[i.type].push({path: i.path, fields: i.fields, description: i.description});
});

app.get('/v1/endpoints', function (req, res) {
    endPoints = renderEndPoints(endPoints);

    res.send(JSON.stringify(endPoints));
});

let server = app.listen(myPort, function () {
  console.log('INFO', 'Server started on ' + myPort);
});

process.on('SIGTERM', function onSigterm () {
  console.info('ERROR: Got SIGTERM. Graceful shutdown start', new Date().toISOString())

  // If we get SIGTERM, then k8s is about to kill us. We should tell our server to close down. This will
  // stopy any new connections from coming in, and will all any open connections time to finish.
  server.close(function () {
    process.exit(0);
  });
})
