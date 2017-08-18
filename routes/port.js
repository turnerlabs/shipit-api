const models = require('../models'),
    mapper = require('../lib/mappers'),
    handler = require('../lib/handler'),
    helpers = require('../lib/helpers'),
    checkAuth = require('.').checkAuth,
    router = require('express').Router();

router.post('/shipment/:shipment/environment/:environment/container/:container/ports', checkAuth, post);
router.get('/shipment/:shipment/environment/:environment/container/:container/port/:port', get);
router.put('/shipment/:shipment/environment/:environment/container/:container/port/:port', checkAuth, put);
router.delete('/shipment/:shipment/environment/:environment/container/:container/port/:port', checkAuth, deleteIt);
module.exports = router;

/**
 * get - gets a single port
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function get(req, res, next) {
    let excludes = helpers.excludes.port(req.authorized || null),
        query = {
            attributes: { exclude: excludes },
            where: { composite: getComposite(req.params) }
        };

    models.Port.findOne(query)
        .then(port => {
            if (!port) {
              return null;
            }

            // It's not exlcuding the values correctly
            port = port.toJSON();
            excludes.forEach(field => delete port[field])

            return port;
        })
        .then(handler.fetched(res, next, `Port '${req.params.port}' not found for Query: '${query.where.composite}'.`))
        .catch(reason => next(reason));
}

/**
 * post - save a new port
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function post(req, res, next) {
    let body = req.body,
        authz = req.authorized || null;

    body.composite = getComposite(req.params, body.name);
    body.containerId = `${req.params.shipment}-${req.params.environment}-${req.params.container}`;

    models.Port.create(body)
        .then(result => {
            if (result) {
                result = helpers.exclude('port', authz, result.toJSON());

                req.params.name = body.name;
                helpers.updateAuditLog({}, result, req);
            }
            return result;
        })
        .then(handler.created(res, `Port not created. Query ${body.composite} failed.`))
        .catch(handler.error(next));
}

/**
 * put - update a single port
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function put(req, res, next) {
    let data = req.body,
        authz = req.authorized || null,
        options = {
            returning: true,
            attributes: { exclude: helpers.excludes.port(req.authorized || null) },
            where: { composite: getComposite(req.params) }
        };

    // need to update the composite if the name changes
    if (data.name) {
        data.composite = `${req.params.shipment}-${req.params.environment}-${req.params.container}-${data.name}`;
    }

    models.Port.findOne(options)
        .then(port => {
            if (!port) {
                return next({statusCode: 404, message: `Cannot update, port query ${options.where.composite} not found.`})
            }

            models.Port.update(data, options)
                .then(result => {
                    if (result[0] === 1) {
                        result = helpers.exclude('port', authz, result[1][0].toJSON());

                        req.params.name = result.name;
                        helpers.updateAuditLog(port.toJSON(), result, req);
                    }
                    else {
                        result = null;
                    }
                    return result;
                })
                .then(handler.updated(res, `Port not updated. Query ${options.where.composite} failed.`))
                .catch(handler.error(next));
        });
}

/**
 * deleteIt - delete a single port
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function deleteIt (req, res, next) {
    let options = {
            returning: true,
            attributes: { exclude: helpers.excludes.port(req.authorized || null) },
            where: { composite: getComposite(req.params) }
        };

    models.Port.findOne(options)
        .then(port => {
            if (!port) {
                return next({ statusCode: 404, message: `Cannot delete, port query ${options.where.composite} not found.`});
            }

            models.Port.destroy(options)
                .then(result => {
                    if (result) {
                        req.params.name = req.params.port;
                        helpers.updateAuditLog(port.toJSON(), {}, req);
                    }
                    return result;
                })
                .then(handler.deleted(res, `Port not deleted. Query ${options.where.composite} failed.`))
                .catch(handler.error(next));
        });
}

/**
 * getComposite - get the compositeId for the port
 *
 * @param {Object} params  The request params from the URL
 * @param {String} name The name of the port
 *
 * @returns {String} The composite ID
 *
 */
function getComposite(params, name) {
    return `${params.shipment}-${params.environment}-${params.container}-${name || params.port}`;
}
