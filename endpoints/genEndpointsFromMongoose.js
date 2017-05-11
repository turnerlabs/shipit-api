"use strict";

let plural   = require('pluralize').plural,
    m        = require('../mongoose/mongoose'),
    models   = require('../models/models'),
    crypto   = require('../lib/crypto'),
    documentToObject = require('../lib/documentToObject'),
    saveLog  = require('../lib/saveLog').save,
    nils     = ['',null];

module.exports = function(){
  var r = {endpoints:[], m:m};
  Object.keys(models).forEach(function(model) {
    if (typeof models[model]._metadata.topLevel === 'boolean' && models[model]._metadata.topLevel) {
      r[model] = populateFields(r.endpoints,model,models);
    }
  });
  return r;
}

function genFromSchema(endpoints,name,schema,myParent) {
  var r = populateFields(endpoints,name,schema);
  return r;
}

function populateFields(endpoints,name,schemaO,myParent) {
  var schema = schemaO[name];
  var r = {};
  r.amSub = false;
  r.singular = name;
  r.plural   = plural(name);
  if (typeof myParent === 'object') {
    r.parent = myParent;
    r.amSub  = true;
    r.parentAncestry = r.parent.parentAncestry.slice(0);
    r.parentAncestry.push(r.parent.model);
  } else {
    r.parent = false;
    r.parentAncestry = [];
  }
  r.model = r.singular[0].toUpperCase() + r.singular.slice(1);
  r.limitObjFind         = {};
  r.limitObjFindOne      = {};
  r.fields               = {};
  r.subObj               = [];
  r.validCreateFields    = [];
  r.validUpdateFields    = [];
  r.generatorFields      = [];
  r.metadata             = schema._metadata;
  r.checkCreate = spawnCheckCreate(r);
  r.create      = spawnCreate(r);
  r.delete      = spawnDelete(r);
  r.checkUpdate = spawnCheckUpdate(r);
  r.update      = spawnUpdate(r);
  r.basePath = '';
  if (r.parent) {
    r.basePath = r.parent.itemPath;
    var descString = ' under ' + r.parent.itemPath;
  } else {
    r.basePath = '';
    var descString = '';
  }
  r.itemPath = r.basePath + '/' + r.singular + '/:' + r.model;
  r.allPath  = r.basePath + '/' + r.plural;
  descString = r.singular + ' :' + r.model + descString;
  var createDesc = 'Creates new ' + descString + '. Returns new object if successful or error otherwise';
  var updateDesc = 'Updates '     + descString + '. Returns updated object if successful or error otherwise';
  var deleteDesc = 'Deletes '     + descString + '. Returns success status if successful or error otherwise';
  if(typeof r.metadata.userEditable === 'boolean' && r.metadata.userEditable) {
    endpoints.push({path: r.basePath + '/' + r.plural, type: 'post', function: r.create, fields: r.fields, description: createDesc});
    endpoints.push({path: r.basePath + '/' + r.singular + '/:' + r.metadata.default, type: 'put', function: r.update, fields: r.fields, description: updateDesc});
    endpoints.push({path: r.basePath + '/' + r.singular + '/:' + r.metadata.default, type: 'delete', function: r.delete, fields: r.fields, description: deleteDesc});
  }
  Object.keys(schema).forEach(function(field) { if (field !== '_metadata') {
    var obj = schema[field];
    if (Array.isArray(obj)) {
      r.subObj.push(populateFields(endpoints,obj[0],schemaO,r));
    } else {
      r.fields[field] = obj;
      if (!(typeof obj.hideFind === 'boolean' && obj.hideFind === true)) {
        r.limitObjFind[field] = 1;
      }
      r.limitObjFindOne[field] = 1;
      if(typeof obj.create === 'boolean' && obj.create === true) {
        r.validCreateFields.push(field);
      }
      if(typeof obj.update === 'boolean' && obj.update === true) {
        r.validUpdateFields.push(field);
      }
      if(typeof obj.generator === 'function') {
        r.generatorFields.push({field: field, generator: obj.generator});
      }
    }
  }});
  return r;
}

function generateAncestryId(o,ancestry) {
  var ret = '';
  ancestry.forEach(function(a) {
    ret += '/' + a + '_' + o[a];
  });
  return ret;
};

function spawnCheckCreate(r) {
  return function(o,callBack) {
    var err = [];
    if(typeof o !== 'object') {
      return 'no payload provided';
    }
    var callBackCount = r.validCreateFields.length;
    r.validCreateFields.forEach(function(field) {
      if (typeof o[field] === 'undefined') {
        if (typeof r.fields[field].required === 'boolean' && r.fields[field].required == true) {
          err.push(field + ' is required but is undefined');
        }
        callBackCount--;
        if(callBackCount <= 0) {
          callBack(err);
        }
      } else {
        r.fields[field].test(function(good) {
          if(! good) {
            err.push({
              field: field,
              requirement: r.fields[field].requirement,
              description: r.fields[field].descritpion
             });
          }
          callBackCount--;
          if(callBackCount <= 0) {
            callBack(err);
          }
        },o[field], r, o, m);
      }
    });
  }
}

function spawnCreate(r) {
  return function(o, callBack, auth) {
    r.checkCreate(o,function(err) {
      if(err.length > 0) {
        callBack(false,{error: err});
        return;
      }
      var createObj = {};
      r.validCreateFields.forEach(function(field) {
        if(typeof o[field] !== 'undefined') {
          createObj[field] = o[field];
        }
      });
      r.generatorFields.forEach(function(g) {
        createObj[g.field] = g.generator(o,m);
      });
      createSetup(o,r,createObj,callBack, auth);
    });
  }
}

function createSetup(o,r,createObj,callBack, auth) {
  var findObj = {};
  findObj[r.metadata.default] = o[r.metadata.default];
  if(r.amSub) {
    var cError = '';
    var cBool  = r.parentAncestry.some(function(a) {
      if(typeof o[a] === 'undefined') {
        cError = 'Somehow the ' + a + ' field is not defined';
        return true;
      } else {
        return false;
      }
    });
    if (cBool) {
      callBack(false, {error: cError});
      return;
    }
    var a = r.parentAncestry.slice(0);
    checkAncestryExistence(a,o,r,function(systemErr,userErr) {
      if      (systemErr) callBack(systemErr);
      else if (userErr)   callBack(false, userErr);
      else {
        var gID = generateAncestryId(o,r.parentAncestry);
        findObj['_parentId']   = gID;
        createObj['_parentId'] = gID;
        create(o,r,findObj,createObj,callBack, auth);
      }
    });
  } else {
    create(o,r,findObj,createObj,callBack, auth)
  }
}

function create(o,r,findObj,createObj,callBack, auth) {
  if(typeof r.fields[r.metadata.default].unique === 'boolean' && r.fields[r.metadata.default].unique) {
    entryExists(r.model,findObj,function(err,exists) {
      if (err) {callBack(err); return}
      else if (exists) {
        callBack(false,{error: r.model + ' ' + findObj[r.metadata.default] + ' already exists'});
      } else doCreate(r,createObj,callBack, auth);
    });
  } else doCreate(r,createObj,callBack, auth);
}

function checkAncestryExistence(ancestry,o,r,callBack) {
  if (ancestry.length <= 0 ) {
    callBack(false,false);
    return;
  }
  var a    = ancestry.pop();
  var findObj = {};
  if (ancestry.length > 0) {
    var gID  = generateAncestryId(o,ancestry);
    var newR = r.parent;
    findObj._parentId = gID;
  }
  var newR = r.parent;
  findObj[newR.metadata.default] = o[a];
  entryExists(a,findObj,function(err,exists) {
    if (err) {
      callBack(err,false);
      return;
    } else if (exists) {
      checkAncestryExistence(ancestry,o,newR,callBack);
    } else {
      callBack(false,{error: a + ': ' + o[a] + ' does not exist'});
    }
  });
}

function entryExists(model,findObj,callBack) {
  m[model].findOne(findObj).exec(function(err,result) {
    if (err) {callBack(err,false)}
    else     { callBack(false,(result !== null)) }
  });
}

function doCreate(r,createObj,callBack, auth) {
  var newDoc = new m[r.model](createObj);
  for (var key in r.fields) {
      // put encryption on a field by field basis, so we can easily encrypt anything
      if (newDoc[key] && r.fields[key].encrypted === true) {
            if (r.fields[key].sha256) {
                newDoc[key + '_sha256'] = crypto.sha256(newDoc[key]);
            }
            newDoc[key] = crypto.encrypt(newDoc[key]);
      }
  }
  newDoc.save(function(err, newDoc) {
     if(err) {callBack(err); return};
     for (var key in r.fields) {
         // decrypt the doc so we can store the changes in the log
         // the entire diff will be encrypted vs the individual pieces of it
         if (newDoc[key] && r.fields[key].encrypted === true) {
               newDoc[key] = crypto.decrypt(newDoc[key]);
         }
     }
     delete newDoc.value_sha256;
     saveLog({}, newDoc, auth);
     callBack(false,documentToObject(newDoc));
  });
}

function spawnDelete(r) {
  return function(o,callBack, auth) {
    if(typeof o[r.metadata.default] !== 'string') {
      callBack(false,{error: 'Missing ' + r.metadata.default});
      return;
    }
    var findObj = {};
    var gID = '';
    if (r.amSub) {
      gID = generateAncestryId(o,r.parentAncestry);
      findObj._parentId = gID;
    }
    findObj[r.metadata.default] = o[r.metadata.default];
    var subGID = gID + '/' + r.model + '_' + o[r.metadata.default];
    deleteSubs(subGID,r, auth);
    m[r.model].find(findObj).exec(function(err, results) {
      if(! Array.isArray(results) || results.length === 0) {
        callBack(false, {error: r.model + ' resource does not exist'});
        return;
      }
      let callBackCount = 0;
      results.forEach(function(result) {
        callBackCount++;
        var errs = [];
        result.remove(function(err) {
          if (err) errs.push(err);
          callBackCount--;
          saveLog(result, {}, auth);
          if(callBackCount <= 0) {
            if (errs.length > 0) {
              callBack(errs);
            } else {
              callBack(false, {status: 'ok'});
            }
          }
        });
      });
    });
  }
}

function deleteSubs(gID, r, auth) {
  r.subObj.forEach(function(s) {
    m[s.model].find({_parentId: gID}).exec(function(err, results) {
      if(Array.isArray(results)) {
        results.forEach(function(result) {
          var subGID = gID + '/' + s.model + '_' + result[s.metadata.default];
          for (var key in r.fields) {
              // decrypt the individual values so we can save the DELETE diff
              if (result[key] && r.fields[key].encrypted === true) {
                    result[key] = crypto.decrypt(result[key]);
              }
          }
          saveLog(result, {}, auth);
          deleteSubs(subGID,s, auth);
          result.remove();
        });
      }
    });
  });
  return;
}

function spawnCheckUpdate(r) {
  return function(f,o,callBack) {
    var err = [];
    if(typeof f !== 'object') {
      return 'no find payload provided';
    }
    if(typeof o !== 'object') {
      return 'no update payload provided';
    }
    if(typeof f[r.metadata.default] === 'undefined') {
      return 'key field ' + r.metadata.default + ' undefined';
    }
    var callBackCount = r.validUpdateFields.length;
    r.validUpdateFields.forEach(function(field) {
      if (nils.indexOf(o[field]) !== -1) {
        if(r.fields[field].required) {
           err.push(field + ' is nil but is required to be set');
        }
        callBackCount--;
        if (callBackCount <= 0) {
          callBack(err);
        }
      } else if (typeof o[field] !== 'undefined') {
        r.fields[field].test(function(good) {
          if(! good) {
            err.push({
              field: field,
              requirement: r.fields[field].requirement,
              description: r.fields[field].descritpion
             });
          }
          callBackCount--;
          if(callBackCount <= 0) {
            callBack(err);
          }
        },o[field],r,o,m,f);
      } else {
        callBackCount--;
        if (callBackCount <= 0) {
          callBack(err);
        }
      }
    });
  }
}

function spawnUpdate(r) {
  return function (f, o, callBack, auth) {
    r.checkUpdate(f,o,function(err) {
      if(err.length > 0) {
        callBack(false,{error: err});
        return;
      }
      var updateObj = {};
      var unsetObj = false;
      r.validUpdateFields.forEach(function(field) {
        if(typeof o[field] !== 'undefined') {
          if(nils.indexOf(o[field]) !== -1) {
            if(typeof unsetObj === 'boolean') unsetObj = {};
            unsetObj[field] = 1;
          } else {
            updateObj[field] = o[field];
          }
        }
      });
      if(unsetObj) {
        updateObj['$unset']=unsetObj;
      }

      for (var key in r.fields) {
          // put encryption on a field by field basis, so we can easily encrypt anything
          if (updateObj[key] && r.fields[key].encrypted === true) {
              // if model say to put sha on object. This means it probably needs to be queried later.
              if (r.fields[key].sha256) {
                  updateObj[key + '_sha256'] = crypto.sha256(updateObj[key]);
              }
              updateObj[key] = crypto.encrypt(updateObj[key]);
          }
      }

      update(f,r,updateObj,callBack, auth);
    }, auth);
  }
}

function update(f,r,updateObj,callBack, auth) {
  var findObj = {};
  if (r.amSub) {
    var gID = generateAncestryId(f,r.parentAncestry);
    findObj['_parentId']   = gID;
    updateObj['_parentId'] = gID;
  }
  findObj[r.metadata.default] = f[r.metadata.default];
  m[r.model].findOne(findObj).exec(function(err, newDoc) {
    if(err) {callBack(err); return}
    if(newDoc === null) {
      callBack(false,{error: r.model + ' ' + f[r.metadata.default] + ' does not exist'});
      return;
    } else {
      let keys = Object.keys(updateObj),
          oldObject = {};

      // get just whats being changed
      keys.forEach((key) => {
          newDoc[key] = crypto.decrypt(newDoc[key]);
          oldObject[key] = newDoc[key];
      });

      newDoc.update(updateObj, function(err, newDoc) {
        if(err) {callBack(err); return}
        m[r.model].findOne(findObj).exec(function(err, newDoc) {
          if(err) {callBack(err); return}
          // save diff
          for (var key in r.fields) {
              // put encryption on a field by field basis, so we can easily encrypt anything
              if (updateObj[key] && r.fields[key].encrypted === true) {
                    updateObj[key] = crypto.decrypt(updateObj[key]);
                    if (oldObject[key]) {
                        oldObject[key] = crypto.decrypt(oldObject[key]);
                    }
              }
          }

          delete oldObject.value_sha256;
          delete updateObj.value_sha256;
          saveLog(oldObject, updateObj, auth);
          callBack(false,newDoc);
          return;
        });
      });
    }
  });
}
