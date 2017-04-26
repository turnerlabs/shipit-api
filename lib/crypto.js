"use strict";

let crypto = require('node-cryptojs-aes'),
    CryptoJS = crypto.CryptoJS,
    JsonFormatter = crypto.JsonFormatter,
    futurama = process.env.FUTURAMA || null;


module.exports = {
  decrypt: decrypt,
  encrypt: encrypt
};

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
