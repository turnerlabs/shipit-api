var models    = require('../models/models');

var e = module.exports;

e.genSchemas = function() {
  var r = {};
  Object.keys(models).forEach(function(model) {
    r[model] = genSchema(models[model]);
  });
  return r;
}

function genSchema(model) {
  var r = {
    model:   {},
    indexes: []
  };
  addFieldsToSchema(r.model,model);
  addIndexesToSchema(r.indexes,model);
  return r;
}

function addFieldsToSchema(schema,fields) {
  var topLevel = (typeof fields._metadata.topLevel === 'boolean' && fields._metadata.topLevel);
  Object.keys(fields).forEach(function(field) {
    if (field !== '_metadata') {
      schema[field] = {};
      mergeProp(fields[field],schema[field],'type');
      mergeProp(fields[field],schema[field],'default');
    }
  });
  if (! topLevel) {
    schema._parentId = {
      type: String,
      required: true
    }
  }
}

function addIndexesToSchema(indexes,fields) {
  var topLevel = (typeof fields._metadata.topLevel === 'boolean' && fields._metadata.topLevel);
  Object.keys(fields).forEach(function(field) {
    if (field !== '_metadata') {
      var index = false;
      if (typeof fields[field].index === 'boolean' && fields[field].index) {
        var index = true;
        var unique = false;
      }
      if (typeof fields[field].unique === 'boolean' && fields[field].unique) {
        var index = true;
        var unique = true;
      }
      if (index) {
        var f = {
          fields: {},
        }
        f.fields[field] = 1;
        if (! topLevel) {
          f.fields._parentId    = 1;
        }
        f.unique = unique;
        indexes.push(f);
      }
    }
  });
}

function mergeProp(source, destination, prop) {
  if(typeof source[prop] !== 'undefined') {
    destination[prop] = source[prop];
  }
}
