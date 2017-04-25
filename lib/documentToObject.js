"use strict";

let crypto = require('node-cryptojs-aes'),
    CryptoJS = crypto.CryptoJS,
    JsonFormatter = crypto.JsonFormatter,
    futurama = process.env.FUTURAMA || null;

module.exports = function (o, encryptMap) {
  if(typeof o === 'object') {
    if(Array.isArray(o)) {
      var r = [];
      r = documentsToObject(o, encryptMap);
      return r;
    } else {
      var r = {};
      r = documentToObject(o, encryptMap);
      return r;
    }
  } else {
    return o;
  }
}

function documentsToObject(a, encryptMap) {
  var r = [];
  a.forEach(function(i) {
    r.push(documentToObject(i, encryptMap));
  });
  return r;
}

function documentToObject(o, encryptMap) {
  var r = {};
  if(typeof o._doc === 'object') {
    var a = o._doc;
  } else {
    var a = o;
  }
  Object.keys(a).forEach(function(key) {
    if(key !== '_id' && key !== '__v' && key !== '_parentId') {
      if (typeof a[key].isMongooseDocumentArray === 'boolean' && a[key].isMongooseDocumentArray) {
        r[key] = [];
        a[key].forEach(function(i) {
          r[key].push(documentToObject(i, encryptMap));
        });
      } else {
        //if (encryptMap && encryptMap[key] && futurama) {
        if (futurama) {
            // try to decrypt. If it fails just set value as is.
            try {
                let decrypted = CryptoJS.AES.decrypt(a[key], futurama, { format: JsonFormatter });
                r[key] = CryptoJS.enc.Utf8.stringify(decrypted);
            }
            catch(err) {
                r[key] = a[key];
            }
        } else {
            r[key] = a[key];
        }
      }
    }
  });
  return r;
}
