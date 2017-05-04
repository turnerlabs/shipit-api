"use strict";

let crypto = require('./crypto');

module.exports = function (o) {
  if(typeof o === 'object') {
    if(Array.isArray(o)) {
      var r = [];
      r = documentsToObject(o);
      return r;
    } else {
      var r = {};
      r = documentToObject(o);
      return r;
    }
  } else {
    return o;
  }
}

function documentsToObject(a) {
  var r = [];
  a.forEach(function(i) {
    r.push(documentToObject(i));
  });
  return r;
}

function documentToObject(o) {
  var r = {};
  if(typeof o._doc === 'object') {
    var a = o._doc;
  } else {
    var a = o;
  }
  Object.keys(a).forEach(function(key) {
    if(key !== '_id' && key !== '__v' && key !== '_parentId') {
      if (a[key] && typeof a[key].isMongooseDocumentArray === 'boolean' && a[key].isMongooseDocumentArray) {
        r[key] = [];
        a[key].forEach(function(i) {
          r[key].push(documentToObject(i));
        });
      } else {
        r[key] = crypto.decrypt(a[key]);
      }
    }
  });
  return r;
}
