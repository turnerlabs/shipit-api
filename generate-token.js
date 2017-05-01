//import crypto module to generate random binary data
var crypto = require('crypto');

// generate random passphrase binary data
var r_pass = crypto.randomBytes(128);

// convert passphrase to base64 format
// must base64 encode it twice because k8s will decode it once
var r_pass_base64 = r_pass.toString("base64").toString('base64');

console.log("passphrase base64 format: ");
console.log(r_pass_base64);
