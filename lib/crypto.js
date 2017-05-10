"use strict";

let crypto = require('node-cryptojs-aes'),
    fs = require('fs'),
    CryptoJS = crypto.CryptoJS,
    sha256 = require('crypto'),
    JsonFormatter = crypto.JsonFormatter,
    futurama,
    SALT = process.env.SALT || '';


module.exports = {
  decrypt: decrypt,
  sha256: sha,
  encrypt: encrypt
};

try {
  futurama = fs.readFileSync(process.env.SECRET_FILE || '/tmp/foo', 'utf8').replace(/\n$/, '');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('File not found!');
  } else {
    throw err;
  }
}

function sha(value) {
  value = value + SALT;
  return sha256.createHash('sha256').update(value).digest('base64');
}

function decrypt(value) {

    if (!futurama) return value;
    let new_value = "";

    try {
        let decrypted = CryptoJS.AES.decrypt(value, futurama, { format: JsonFormatter });
        new_value = CryptoJS.enc.Utf8.stringify(decrypted);
    } catch(err) { }

    return new_value || value;
}

function encrypt(value) {

    if (!futurama) return value;
    if (!value) return value;

    let new_value = "";

    try {
        new_value = CryptoJS.AES.encrypt(value, futurama, { format: JsonFormatter }).toString();
    } catch(err) {
        console.log('ENCRYPT_ERROR => ', err);
    }

    return new_value || value;
}
