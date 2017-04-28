"use strict";

const jsondiff = require('jsondiffpatch'),
      mongoose   = require('../mongoose/mongoose'),
      crypto = require('./crypto');

/**
*  saveLog
*  @param: jsonA {Object|MongooseDocObject}
*  @param: jsonB {Object|MongooseDocObject}
*
*  take in two different json objects and save a log with the difference between the two.
*  Also save, who made the change and when. This can later be queried by shipment + environment pair.
*  If there is no environment, then we know that we are saving against the parent shipment, and hence we
*  are naming the environment parent.
*
*  We are doing a stringify and a parse on each json object passed in. This is because we can either pass in a
*  raw json object or a mongoose document object.
*/
function saveLog(jsonA, jsonB, auth) {
    let diff = jsondiff.diff(JSON.parse(JSON.stringify(jsonA)), JSON.parse(JSON.stringify(jsonB))) || {};
    delete diff._id;
    delete diff.__v;
    delete diff._parentId;
    diff = JSON.stringify(diff);
    auth = auth || {};

    if (!Object.keys(diff).length > 0) {
        // don't save non changes
        return;
    }
    
    diff = crypto.encrypt(diff);
    let log = {
      shipment: auth.shipment,
      environment: auth.environment || 'parent',
      user: auth.username,
      name: auth.name,
      hidden: auth.hidden,
      updated: Math.floor(Date.now()),
      diff: diff
    };
    let logDoc = new mongoose.Logs(log);
    logDoc.save();
}

module.exports = {
    save: saveLog
};
