var genE             = require('./genEndpointsFromMongoose')();
var requestHandlers  = require('../lib/requestHandlers.js');
var auth             = require('../lib/auth.js');
var documentToObject = require('../lib/documentToObject');
var m                = genE.m;
requestHandlers.setMongoose(genE.m);

var genEndpoints = [];

var manualEndpoints = [
    {
        "path":         '/v1/shipments',
        "type":         'get',
        "function":     requestHandlers.getAllShipments,
        "description":  'Returns an array of all shipments',
        "fields":       []
    },
    {
        "path":         '/v1/shipment/:name',
        "type":         'get',
        "function":     requestHandlers.getShipment,
        "description":  'Returns an object with information about a particular shipment',
        "fields":       []
    },
    {
        "path":         '/v1/shipment/:Shipment/environment/:name',
        "type":         'get',
        "function":     requestHandlers.getEnvironment,
        "description":  'Returns an environment object, with a parentShipment field containing the parent shipment',
        "fields":       []
    },
    {
        "path":         '/v1/shipment/:Shipment/environment/:name/buildToken',
        "type":         'put',
        "function":     requestHandlers.rollBuildToken,
        "description":  'Rolls the build token for this Shipment. Returns the Shipment or error',
        "fields":       [
                            {field: 'username', type: 'String', required: true, requirement: 'Must be a valid turner ldap username', description: 'The username of authenticated user'},
                            {field: 'token',    type: 'String', required: true, requirement: 'Must be a valid token for username authenticated against http://auth.services.dmtio.net', description: 'The token of authenticated user'}
                        ]
    },
    {
        "path":         '/v1/envVar/search',
        "type":         'get',
        "function":     requestHandlers.searchEnvVars,
        "description":  'Returns a shipment environment, that contains the envVar name and value',
        "fields":       []
    },
    {
        "path":         '/v1/logs/shipment/:Shipment/environment/:Environment',
        "type":         'get',
        "function":     requestHandlers.getShipmentEnvironmentLogs,
        "description":  'Returns the changes for a shipment and environment pair. Must be authenticated to get hidden logs.',
        "fields":       []
    },
    {
        "path":         '/v1/logs/shipment/:Shipment',
        "type":         'get',
        "function":     requestHandlers.getShipmentLogs,
        "description":  'Returns all changes for a shipment. Same as searching /v1/logs/shipment/:Shipment/environment/parent. Must be authenticated to get hidden logs.',
        "fields":       []
    }
];

genE.endpoints.forEach(function (i) {
  var r = {path: '/v1' + i.path, type: i.type, description: i.description};
  var date = new Date();
  r.fields = genFields(i.type,i.fields);
  r.function = function(req,res) {
    auth.checkToken(req.body, function(validUser) {
      if (!validUser) {
        if (/^.*\/environment\/.*$/.test(i.path) || i.path === '/logs') {
          checkBuildToken(req.params,req.body,function(validBuildToken) {
            if(validBuildToken) {
              doer(i,r,req,res, {
                username: 'buildtoken',
                shipment: req.params.Shipment || req.params.name,
                environment: req.params.Environment
              });
            } else {
              sendAuthzError(res);
            }
          });
        } else {
          sendAuthzError(res);
        }
      } else {
        if (i.type === 'post' && typeof req.params.Shipment === 'undefined') {
          var authObject = {
            newgroup: req.body.group,
            username: req.body.username
          }
        } else {
          var authObject = {
            username: req.body.username
          }
          if (typeof req.params.Shipment === 'undefined') {
            authObject.shipment = req.params.name;
          } else {
            authObject.shipment = req.params.Shipment;
          }
          if (typeof req.body.group === 'string') {
            authObject.newgroup = req.body.group;
          }
        }
        checkUserGroup(authObject,function(err,code) {
          if(err) {
            res.status(code);
            res.send(JSON.stringify({error: err}));
          } else {
            var logObj = {
                date: date,
                username: authObject.username,
                group: authObject.newgroup,
                method: r.type,
                path: r.path,
                shipment: authObject.shipment,
                environment: req.params.Environment,
                body: JSON.parse(JSON.stringify(req.body))
            };
            authObject.environment = req.params.Environment;
            delete logObj.body.username;
            delete logObj.body.token;
            delete logObj.body.ports;
            delete logObj.body.buildToken;
            if (logObj.body.type === 'hidden' || logObj.body.private_key) {
                logObj.body.value = '***';
                authObject.hidden = true;
            } else if (logObj.body.type === 'basic' || logObj.body.type === 'discover') {
                authObject.hidden = false;
            }
            delete logObj.body;
            delete logObj.body.private_key;
            console.log(authObject, logObj);
            doer(i,r,req,res,authObject);
          }
        });
      }
    });
  }
  genEndpoints.push(r);
});

function sendAuthzError(res) {
  res.status(401);
  res.send(JSON.stringify({error: 'Authorization failure'}));
}

function checkBuildToken(f,o,callBack) {
   if(typeof f.Environment === 'undefined') {
     var environment = f.name;
   } else {
     var environment = f.Environment;
   }

   var shipment = f.Shipment || o.shipment;
   environment = environment || o.environment;
   m.Environment.findOne({name: environment, _parentId: '/Shipment_' + shipment}).limit({buildToken: 1}).exec(function(err, result) {
     if (err) callBack(false);
     else if (result === null) callBack(false);
     else callBack( (o.buildToken === result.buildToken) );
   });
}

function doer(i,r,req,res, auth) {
  if (i.type === 'post') {
    Object.keys(req.params).forEach(function(key) {
       req.body[key] = req.params[key];
    });
    i.function(req.body,function(err,o){finisher(err,o,res)}, auth);
  } else if (i.type === 'put') {
    i.function(req.params,req.body,function(err,o){finisher(err,o,res)}, auth);
  } else if (i.type === 'delete') {
    i.function(req.params,function(err,o){finisher(err,o,res)}, auth);
  } else {
    res.status(500);
    res.send(JSON.stringify({error: 'Deployit generated something it cannot run'}));
  }
}

genEndpoints = genEndpoints.concat(manualEndpoints);

module.exports = genEndpoints;

function genFields(type,fields,sub) {
  if(!sub) {
    var f = [
      {field: 'username', type: 'String', required: true, requirement: 'Must be a valid turner ldap username', description: 'The username of authenticated user'},
      {field: 'token',    type: 'String',    required: true, requirement: 'Must be a valid token for username authenticated against http://auth.services.dmtio.net', description: 'The token of authenticated user'}
    ];
  } else { var f = [];}
  Object.keys(fields).forEach(function(field) {
    var o = fields[field];
    if(type === 'post' && o.create) {
      if (o.subObj) {
        f.push({
          field: field,
          subObject: genFields('post',o.value,true)
        })
      } else {
        if(typeof o.type.name === 'undefined') {
          var myType = 'Array of ' + o.type[0].name + 's';
        } else {
          var myType = o.type.name;
        }
        f.push({
          field: field,
          type:  myType,
          required: o.required,
          description: o.description,
          requirement: o.requirement
        });
      }
    } else if (type === 'put' && o.update) {
      if (o.subObj) {
        f.push({
          field: field,
          subObject: genFields('post',o.value,true)
        })
      } else {
        if(typeof o.type.name === 'undefined') {
          var myType = 'Array of ' + o.type[0].name + 's';
        } else {
          var myType = o.type.name;
        }
        f.push({
          field: field,
          type:  myType,
          required: false,
          description: o.description,
          requirement: o.requirement
       });
      }
    }
  });
  return f;
}

function checkUserGroup(o,callBack) {
  if( typeof o.newgroup === 'undefined' ) {
    if ( typeof o.shipment === 'undefined' ) {
      callBack('When creating a shipment or modifying group, you must define a group that you are a member of',422);
    } else {
      m.Shipment.findOne({name: o.shipment}).limit({group: 1}).exec(function(err, result) {
        if(err) {
          callBack('Database error while trying to authenticate',500);
        } else if (result === null) {
          callBack('You cannot preform this action because the resource does not exist',422);
        } else {
          o.currentgroup = result.group;
          checkCurrentGroup(o,callBack) ;
        }
      });
    }
  } else {
    checkNewGroup(o,callBack);
  }
}

function checkCurrentGroup(o,callBack) {
  var n = {username: o.username, group: o.currentgroup};
  auth.checkGroup(n,function(success) {
    if(success) {
      if(typeof o.newgroup === 'string') {
        checkNewGroup(o,callBack);
      } else {
        callBack(false,200);
      }
    } else {
      callBack('User ' + n.username + ' is not a member of group ' + n.group + '. Access denied', 403);
    }
  });
}

function checkNewGroup(o,callBack) {
  var n = {username: o.username, group: o.newgroup};
  auth.checkGroup(n,function(success) {
    if(success) {
      callBack(false,200);
    } else {
      callBack('You cannot set group of this shipment to ' + n.group + ' because you are not a member',422);
    }
  });
};

function finisher(err,o,res) {
  if(err) {
    res.status(500);
    res.send(JSON.stringify({
      error: 'DB connection went wrong',
      details: err
    }));
  } else {
    if(!o || typeof o.error !== 'undefined') {
      res.status(422);
      res.send(JSON.stringify(o || 'unkown error saving object'));
    } else {
      res.send(JSON.stringify(documentToObject(o)));
    }
  }
}
