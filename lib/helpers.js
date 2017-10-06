const models = require('../models'),
    randomStr = require('randomstring').generate,
    jsondiff = require('jsondiffpatch'),
    crypto = require('./crypto'),
    Promise = require('bluebird');

const self = module.exports = {
    hideValue: () => '*******',
    generateToken,
    getWhereClause,
    updateAuditLog,
    exclude,
    flatten,
    sortByName: (a, b) => a.name > b.name ? 1 : -1,
    findIndex,
    prepEnvVar,
    excludes: {
        container: () => ['composite', 'environmentId'],
        environment: _getEnvironmentExcludes,
        envVar: () => ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId', 'shaValue'],
        port: _getPortExcludes,
        provider: () => ['composite', 'environmentId'],
        shipment: () => ['composite']
    }
};

/**
 * exclude - Remove properties off of a model
 *
 * @param {String} type  The type of Model
 * @param {Boolean} auth  The authorization
 * @param {Object} obj  The model to have properties remove from
 *
 * @returns {Object} The sanitized model
 */
function exclude(type, auth, obj) {
    let arr = self.excludes[type](type);

    arr.forEach(prop => {
        if (typeof obj[prop] !== 'undefined') {
            delete obj[prop];
        }
    });

    return obj;
}

/**
 * flatten - Flatten an array of objects
 *
 * Takes an array of object and flattens any arrays found within
 * the array into the array.
 *
 * @param {Array} items  The array to flatten
 *
 * @returns {Array} A flatten array
 */
function flatten(items) {
    return items.reduce((arr, val) => {
            if (Array.isArray(val)) {
                return arr.concat(val);
            }
            arr.push(val);
            return arr;
        }, []);
}

/**
 * generateToken - Create a random token
 *
 * @param {String} len  Optional, length of the token; defaults to 50
 *
 * @returns {String} The token
 */
function generateToken(len) {
    return randomStr(len || 50)
}

/**
 * getWhereClause - Get a common where clause based on the request params
 *
 * @param {Object} params The request parameters
 * @param {String} name   The name of the object being updated
 *
 * @returns {String} The where string
 */
function getWhereClause(params, name) {
    name = name || params.name;
    let where = { name: name, composite: params.shipment, shipmentId: params.shipment };

    if (params.environment) {
        where.composite += ('-' + params.environment);
        where.environmentId = where.composite;
        where.shipmentId = null;
    }

    if (params.provider) {
        where.composite += ('-' + params.provider);
        where.providerId = where.composite;
        where.environmentId = null;
    } else if (params.container) {
        where.composite += ('-' + params.container);
        where.containerId = where.composite;
        where.environmentId = null;
    }

    where.composite += ('-' + name);
    return where;
}

/**
*  updateAuditLog - Save something to the audit log
*  @param {Object} jsonA
*  @param {Object} jsonB
*  @param {Object} req
*
*  take in two different json objects and save a log with the difference between the two.
*  Also save, who made the change and when. This can later be queried by shipment + environment pair.
*  If there is no environment, then we know that we are saving against the parent shipment, and hence we
*  are naming the environment parent.
*
*  We are doing a stringify and a parse on each json object passed in. This is because we can either pass in a
*  raw json object or a mongoose document object.
*
*  @returns {Promise} Returns the promise so this can be chained by other functions
*/
function updateAuditLog(jsonA, jsonB, req) {
    let diff = jsondiff.diff(JSON.parse(JSON.stringify(jsonA)), JSON.parse(JSON.stringify(jsonB))) || {};

    if (diff._id) delete diff._id;
    if (diff.__v) delete diff.__v;
    if (diff._parentId) delete diff._parentId;

    diff = JSON.stringify(diff);

    let log = {
        shipment: req.params.shipment,
        environment: req.params.environment || 'parent',
        user: req.username,
        name: req.params.name,
        hidden: req.hidden || false,
        updated: Math.floor(Date.now()),
        diff: diff
    };

    return models.Log.create(log);
}

/**
 * prepEnvVar - preps an env var to save
 *
 * @param {Object} envVar The env var to be prepped
 *
 * @return {Object} Prepped env var
 */
function prepEnvVar(envVar) {
    envVar.shaValue = crypto.sha(envVar.value);
    return envVar;
}

/**
 * findIndex - Find the index of an item in an array
 *
 * Finds the index of an item in an array of objects whose name
 * matches the provided name
 *
 * @param {Array} arr The array to check
 * @param {String} name The name to look for in the array
 *
 * @return {Number} The index of the matching item or -1 if not found
 */
 function findIndex(arr, name) {
     let idx = -1;

     for (let i = 0, l = arr.length; i < l; i++) {
         if (arr[i].name === name) {
             idx = i;
             break;
         }
     }

     return idx;
 }

/**
 * _getPortExcludes - return array of fields to be excluded in query
 *
 * @param {Boolean} authorized  Whether the request is authorized or not
 *
 * @return {Array} Fields to exclude
 */
function _getPortExcludes(authorized) {
    let excludes = ['composite', 'containerId'];

    if (!authorized) {
        excludes.push('private_key', 'public_key_certificate', 'certificate_chain');
    }

    return excludes;
}

/**
 * _getEnvironmentExcludes - return array of fields to be excluded in query
 *
 * @param {Boolean} authorized  Whether the request is authorized or not
 *
 * @return {Array} Fields to exclude
 */
function _getEnvironmentExcludes(authorized) {
    let excludes = ['composite', 'shipmentId'];

    if (!authorized) {
        excludes.push('buildToken');
    }

    return excludes;
}
