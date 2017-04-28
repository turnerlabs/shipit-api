"use strict";

const auth = require('./auth'),
      schemas  = require('../models/models'),
      helpers  = require('../models/helpers'),
      saveLog  = require('./saveLog').save,
      crypto = require('./crypto'),
      sha256 = require('crypto'),
      documentToObject = require('./documentToObject');

var m = {},
    e = module.exports;

e.setMongoose = (lm) => {
    m = lm;
};

e.searchEnvVars = (req, res) => {
    let query = {},
        promises = [];

    for (var key in req.query) {
        query.name = key;
        query.value_sha256 = sha256.createHash('sha256').update(req.query[key]).digest('base64');
    }

    console.log(query)

    m.EnvVar.find(query).exec().then((data) => {
        data.forEach((envVar) => {
            console.log(envVar)
            let models = envVar._parentId.split('/'),
                shipment = models[1].split('_')[1],
                promise;

            if (models.length < 3) {
                // get shipment with all environments
                promise = getShipment(shipment).then((shipment) => {
                    let promises = [];
                    shipment.environments.forEach((environment) => {
                        promises.push(getEnvironment(shipment.name, environment.name, false));
                    });
                    return Promise.all(promises);
                });
            } else {
                // get environment and put on shipment object
                let environment = models[2].split('_')[1];
                promise = getEnvironment(shipment, environment, false);
            }
            promises.push(promise);
        });


        Promise.all(promises).then((objects) => {
            let finalData = {},
                finalArray = [];
            objects.forEach((data) => {
                if (data.sort) {
                    data.forEach((environment) => {
                        doSearchData(finalData, environment);
                    });
                } else {
                  doSearchData(finalData, data);
                }
            });

            for (var key in finalData) {
                finalArray.push(finalData[key]);
            }

            res.json(finalArray);
        });
        return;
    }, (err) => {
        res.status(500);
        res.send(JSON.stringify({error: 'Something went wrong while searching'}));
        return;
    })
}

/**
* getShipmentEnvironmentLogs
* gets logs for a single shipment environment
**/
e.getShipmentEnvironmentLogs = (req, res) => {
    let params = {shipment: req.params.Shipment, environment: req.params.Environment};
    checkAuth(req, res, function(req, res, isAuthZed) { continueLogs(req, res, params, isAuthZed); });
}

/**
* getShipmentLogs
* gets logs for an entire shipment and all of its environments
**/
e.getShipmentLogs = (req, res) => {
    let params = {shipment: req.params.Shipment};
    checkAuth(req, res, function(req, res, isAuthZed) { continueLogs(req, res, params, isAuthZed); });
}

/**
* continueLogs
* to be called after we determine if the user is authorized or not. If
* the user is authorized, then let them see all logs. If not then only
* show them logs that have been made, which contain the hidden: false field.
*/
function continueLogs(req, res, params, isAuthZed) {
  let  promise = m.Logs.find(params, {_id: 0, __v: 0})
                       .sort({updated: -1})
                       .exec();
  promise.then((logs) => {
      let new_logs = logs.map((log) => {
        log.timestamp = new Date(log.updated).toISOString();
        log.diff = crypto.decrypt(log.diff);

        if (!isAuthZed) {
            // only if specified for user friendlyness.
            if (log.hidden === undefined || log.hidden === true) {
                log.diff = "***"
            }
        }

        return {
          shipment: log.shipment,
          environment: log.enviornmnet,
          user: log.user,
          updated: log.updated,
          timestamp: log.timestamp,
          name: log.name,
          hidden: log.hidden,
          diff: log.diff
        };
      });
      res.json(new_logs);
  }, (err) => {
      res.status(500).json({error: `could not find logs for ${shipment}`})
  })
}

function doSearchData(data, environment) {

    let add = true,
        parentShipment = environment.parentShipment;

    if (!data[parentShipment.name]) {
        data[parentShipment.name] = {
            name: parentShipment.name,
            group: parentShipment.group,
            envVars: parentShipment.envVars,
            environments: [{name: environment.name, envVars: environment.envVars}]
        }
    }

    // check if we should add the environment
    for(var i = 0;i < data[parentShipment.name].environments.length;i++) {
        if (data[parentShipment.name].environments[i].name === environment.name) {
            add = false;
            break;
        }
    }

    if (add) {
        data[parentShipment.name].environments.push({name: environment.name, envVars: environment.envVars});
    }
}

e.getAllShipments = function(req, res) {
  let promises = [];

  return m.Shipment.find({}).sort({name: 1}).exec(function (err, results) {
    if (err) {
        res.status(500);
        res.send(JSON.stringify({error: 'Something went wrong'}));
        return;
    }
    results.map(function(shipment) {
        let promise = m.Environment.find({_parentId: '/Shipment_' + shipment.name})
            .select({name: 1})
            .sort({name: 1})
            .exec()
            .then((data) => {
                    return {
                        name: shipment.name,
                        group: shipment.group,
                        environments: data.map((envData) => envData.name)
                    };
                },
                (err) => {
                    res.status(500);
                    res.send(JSON.stringify({error: 'Something went wrong requesting environemnts'}));
                    return;
                }
            );

        promises.push(promise);
    });

    Promise.all(promises).then((data) => {
        res.send(JSON.stringify(data));
    });
  });
}

e.getShipment = function(req, res) {
  return getShipment(req.params.name).then((data) => {

      if (data.code) {
          res.status(data.code);
          res.json(data);
          return;
      }

      res.json(data);
  });
}

function getShipment(name) {
    return m.Shipment.findOne({name: name}).exec().then(function(shipment) {
        if(!shipment) {
          return {code: 404, error: 'Shipment not found'};
        } else {
          var r = documentToObject(shipment);
          var sent = false;
          var count = 2;
          return new Promise((resolve, reject) => {
              m.Environment.find({_parentId: '/Shipment_' + name}).select({name: 1}).sort({name: 1}).exec(function (err, results) {
                if(err) {
                  if(!sent) {
                    resolve({code: 500, error: err});
                  }
                } else {
                  r.environments = documentToObject(results);
                  count--;
                  getShipmentFinisher(sent,count,r,resolve);
                }
              });
              m.EnvVar.find({_parentId: '/Shipment_' + name}).select({_parentId: 0}).sort({name: 1}).exec(function (err, results){
                if(err) {
                  if(!sent) {
                    resolve({code: 500, error: err});
                  }
                } else {
                  r.envVars = documentToObject(results);
                  count--;
                  getShipmentFinisher(sent,count,r,resolve);
                }
              });
          });
        }
    });
}

function getShipmentFinisher(sent,count,r,resolve) {
  if (count <= 0 && !sent) {
    resolve(r);
  }
}

e.getEnvironment = (req, res) => {
    checkAuth(req, res, continueEnvironment);
}

/**
* checkAuth
* generic function that checks if the user is authenticated and authorized to a shipment.
*
* @param req
* @param res
* @param next The next function to run, that needs to have the authed information passed into it.
**/
function checkAuth(req, res, next) {
  auth.checkToken(req.body, (validUser, type) => {
      if (validUser) {
          m.Shipment.findOne({name: req.params.Shipment}).select({group: 1}).exec((err, result) => {
              if (err || result === null) {
                  next(req, res, false);
              } else {
                  if (type && type === 'service') {
                      // We have authenticated with a valid service account token
                      next(req, res, true);
                  } else {
                      auth.checkGroup({
                              username: req.body.username,
                              group:    result.group
                          },
                          req.method,
                          (isAuthed) => {
                              next(req, res, isAuthed);
                          }
                      );
                  }
              }
          });
      } else {
          next(req, res, false);
      }
  });
}

function getEnvironment(shipmentName, name, isAuthed) {
    let parentId = '/Shipment_' + shipmentName,
        nParentId = parentId + '/Environment_' + name,
        shipmentPromise = m.Shipment.findOne({name: shipmentName}).exec(),
        selectObj = getSelectObj('environment', isAuthed),
        environmentPromise = m.Environment.findOne({name: name, _parentId: parentId}).select(selectObj).exec();

    return shipmentPromise.then((shipment) => {
        return environmentPromise.then((environment) => {
            return documentToObject(environment);
        }).then((environment) => {
            if (environment.code) {
                return environment;
            }

            if (environment.buildToken) {
                environment.buildToken = crypto.decrypt(environment.buildToken);
            }

            environment.parentShipment = {name: shipment.name, group: shipment.group};

            let sets = [
                {parentId: parentId,  parent: 'parentShipment', name: 'envVars', model: 'EnvVar'},
                {parentId: nParentId, name: 'envVars',    model: 'EnvVar'},
                {parentId: nParentId, name: 'providers',  model: 'Provider',  submodels: [{name: 'envVars', model: 'EnvVar'}]},
                {parentId: nParentId, name: 'containers', model: 'Container',
                    submodels: [{name: 'envVars', model: 'EnvVar'}, {name: 'ports', model: 'Port'}]}
            ],
            callBackCount = 0,
            promise = new Promise((resolve, reject) => {
                sets.forEach(function(s) {
                    callBackCount++;
                    getAThing(s, isAuthed, (err, sub) => {
                       if (err) {
                           resolve({error: err});
                           console.log('ERROR => ', err)
                           callBackCount--;
                       } else {
                           if (typeof s.parent === 'string') {
                               environment[s.parent][s.name] = sub;
                           } else {
                               environment[s.name] = sub;
                           }

                           callBackCount--;
                           if (callBackCount <= 0) {
                              environment = obfuscate(environment, isAuthed);
                              resolve(environment);
                              return;
                           }
                      }
                    });
                });
            });
            return promise
        }, (err) => {
            console.log(err)
            return {code: 404, error: 'No environment named ' + name};
        });
    }, (err) => {
        console.log(err)
        return {code: 404, error: 'No shipment named ' + shipmentName};
    });
}

function continueEnvironment(req, res, isAuthed) {
    let selectObj = {_parentId: 0};

    getEnvironment(req.params.Shipment, req.params.name, isAuthed).then((data) => {

        if (data.code) {
            res.status(data.code);
            res.json(data);
            return;
        }

        res.json(data);
    });
}

function getAThing(o, isAuthed, callBack) {
    let selectObj = getSelectObj(o.name.replace(/s$/, ''), isAuthed);

    m[o.model].find({_parentId: o.parentId}).select(selectObj).sort({name: 1}).exec((err, results) => {
        if (err) {
            console.log('ERROR => ', err)
            callBack(err, false)
        } else {
            if (o.submodels) {
                let submodelCount = 0,
                    r = documentToObject(results);

                if (r.length === 0) {
                    callBack(false, r);
                    return;
                }

                o.submodels.map((data) => {
                    let callBackCount = 0;

                    submodelCount++;

                    r.forEach((n) => {
                        callBackCount++;

                        getAThing({
                            parentId: o.parentId + '/' + o.model + '_' + n.name,
                            model: data.model,
                            name:  data.name
                        }, isAuthed, (err, results) => {
                            if (err) {
                                console.log('ERROR => ', err)
                                callBack(err, false)
                            } else {
                                n[data.name] = documentToObject(results);
                            }

                            callBackCount--;

                            if (callBackCount <= 0) {
                                submodelCount--;

                                if (submodelCount <= 0) {
                                    callBack(false, r);
                                }
                            }
                        })
                    });
                });
            } else {
                callBack(false, documentToObject(results));
            }
        }
    });
}

function getSelectObj(name, isAuthed) {
    let result = { _parentId: 0 },
        schema = schemas[name],
        keys = Object.keys(schema);

    // Need to find any fields that are authed, and add them to the result object
    keys.forEach(key => {
        let attrs = Object.keys(schema[key]);

        if (attrs.indexOf('auth') !== -1 && !isAuthed) {
            result[key] = 0;
        }
    });

    return result;
}

function obfuscate(obj, isAuthed, encrypt) {
    if (Array.isArray(obj)) {
        obj.forEach((ele, i) => {
            obj[i] = obfuscate(ele, isAuthed);
        });
    } else {
        let keys = Object.keys(obj);

        keys.forEach(k => {
            if (typeof obj[k] === 'string') {

                if (k === 'type' && obj[k] === 'hidden' && !isAuthed) {
                    obj.value = '*******';
                }

            } else {
                obj[k] = obfuscate(obj[k], isAuthed);
            }
        });
    }

    return obj;
}

function sendError(code, message, error, response) {
    console.error('ERROR => %j', message);
    if (error) console.error('ERROR => %j', error);
    response.status(code);
    response.json({error: message});
}

e.rollBuildToken = (req, res) => {
    let shipment = req.params.Shipment,
        environment = req.params.name;

    auth.checkToken(req.body, (validUser, type) => {
        if (validUser && type !== 'service') {
            m.Shipment.findOne({name: shipment}).select({group: 1}).exec((err, shipmentDoc) => {
                if (err) {
                    sendError(500, `Unable to retrieve Shipment ${shipment}`, err, res)
                } else {
                    auth.checkGroup({ username: req.body.username, group: shipmentDoc.group }, req.method, isAuthed => {
                        if (isAuthed) {
                            // Full authed
                            m.Environment.findOne({name: environment, _parentId: `/Shipment_${shipment}`}).exec((err, envDoc) => {
                                if (err) {
                                    sendError(500, `Unable to retrieve Environment ${environment} for Shipment ${shipment}`, err, res);
                                } else {
                                    envDoc.buildToken = helpers.generateToken();
                                    envDoc.save((err, saveResult) => {
                                        if (err) {
                                            sendError(500, `Unable to update buildToken due to interal error on Shipment ${shipment} Environment ${environment}`, err, msg);
                                        } else {
                                            saveLog({buildToken: '**previous**'}, {buildToken: '**current**'}, {
                                                shipment:    shipment,
                                                environment: environment,
                                                name: environment,
                                                username:    req.body.username,
                                                hidden: true
                                            });

                                            res.json(documentToObject(saveResult));
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            sendError(403, `Not authorized to change build token for this Shipment ${shipment} environment ${environment}`, null, res);
                        }
                    });
                }
            });
        } else if (type === 'service') {
            sendError(403, 'Service accounts are not allowed to update build tokens', null, res);
        } else {
            sendError(401, 'Authorization failure while rolling build token', null, res);
        }
    });
}
