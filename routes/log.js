const models = require('../models'),
    mapper = require('../lib/mappers'),
    handler = require('../lib/handler'),
    helpers = require('../lib/helpers'),
    crypto = require('../lib/crypto'),
    router = require('express').Router();

// Shipment EnvVars
router.post('/logs', post);
router.get('/logs/shipment/:shipment/environment/:environment', get);
router.get('/logs/shipment/:shipment', get);


module.exports = router;

/**
 * get - get either logs for an environment or logs for all environments in a shipment
 *
 * @param req  The express request object
 * @param res  the express response object
 * @param next The next function to perform in the express middleware chain
 *
 */
function get(req, res, next) {
    let query = {
        attributes: { exclude: ['id'] },
        where: getWhereClause(req.params),
        order: '"timestamp" DESC',
        include: []
    },
    authz = req.authorized || null;

    models.Log.findAll(query)
        .then(logs => {
            if (!logs) {
              return [];
            }

            return logs.map(log => {
                log = log.toJSON();
                log.updated = new Date(log.timestamp).getTime();
                log.diff = crypto.decrypt(log.diff)
                if (!authz) {
                    log.diff = helpers.hideValue();
                }
                return log;
            });
        })
        .then(handler.fetched(res, `Logs not found for query ${query.where}`))
        .catch(reason => next(reason));
}

/**
 * post - create a single log
 *
 * @param req  The express request object
 * @param res  the express response object
 * @param next The next function to perform in the express middleware chain
 *
 */
function post(req, res, next) {
    let log = req.body;

    log.name = log.shipment;

    models.Log.create(log)
        .then(result => result.toJSON())
        .then(handler.created(res))
        .catch(handler.error(next));
}


/**
 * getWhereClause - get the where clause for the request
 *
 * @param {Object} params The params from the request
 *
 * @returns {Object} The where clause object
 */
function getWhereClause(params) {
    let where = {$and: {shipment: params.shipment}};

    if (params.shipment && params.environment) {
        where.$and.environment = params.environment;
    }

    return where;
}
