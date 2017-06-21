const models = require('../models'),
    mapper = require('../lib/mappers'),
    handler = require('../lib/handler'),
    helpers = require('../lib/helpers'),
    checkAuth = require('.').checkAuth,
    router = require('express').Router();

router.post('/shipment/:shipment/environment/:environment/containers', checkAuth, post);
router.get('/shipment/:shipment/environment/:environment/container/:container', get);
router.put('/shipment/:shipment/environment/:environment/container/:container', checkAuth, put);
router.delete('/shipment/:shipment/environment/:environment/container/:container', checkAuth, deleteIt);
module.exports = router;

/**
 * get - gets a single container
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function get(req, res, next) {
    let authz = req.authorized || null,
        query = {
            attributes: { exclude: helpers.excludes.container(authz) },
            where: { composite: getComposite(req.params) },
            include: [
              { model: models.EnvVar, as: "envVars", attributes: { exclude: helpers.excludes.envVar(authz) } },
              { model: models.Port, as: "ports", attributes: { exclude: helpers.excludes.port(authz) } }
            ]
        };

    models.Container.findOne(query)
        .then(container => {
            if (!container) {
              return null;
            }
            return container.toJSON();
        })
        .then(handler.fetched(res, `Container '${req.params.container}' not found for Query: '${query.where.composite}'.`))
        .catch(reason => next(reason));
}

/**
 * post - create a single container
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
    body.environmentId = `${req.params.shipment}-${req.params.environment}`;

    models.Container.create(body)
        .then(result => {
            if (result) {
                result = helpers.exclude('container', authz, result.toJSON());

                req.params.name = result.name;
                helpers.updateAuditLog({}, result, req);
            }
            return result;
        })
        .then(handler.created(res, `Container not created. Query ${body.composite} failed.`))
        .catch(handler.error(next));
}

/**
 * put - update a single container
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
            attributes: { exclude: helpers.excludes.container(authz) },
            where: { composite: getComposite(req.params) }
        };

    // need to update the composite if the name changes
    if (data.name) {
        data.composite = `${req.params.shipment}-${req.params.environment}-${data.name}`;
    }

    models.Container.findOne(options)
        .then(container => {
            if (!container) {
                return next({statusCode: 404, message: `Cannot update, container query ${options.where.composite} not found.`});
            }

            models.Container.update(data, options)
                .then(result => {
                    if (result[0] === 1) {
                        result = helpers.exclude('container', authz, result[1][0].toJSON());

                        req.params.name = container.name;
                        helpers.updateAuditLog(container.toJSON(), result, req);
                    }
                    else {
                        result = null;
                    }
                    return result;
                })
                .then(handler.updated(res, `Container not updated. Query ${options.where.composite} failed.`))
                .catch(handler.error(next));
        });
}

/**
 * deleteIt - delete a single container
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function deleteIt (req, res, next) {
    let authz = req.authorized || null,
        options = {
            returning: true,
            attributes: { exclude: helpers.excludes.container(authz) },
            where: { composite: getComposite(req.params) }
        };

    models.Container.findOne(options)
        .then(container => {
            if (!container) {
                return next({statusCode: 404, message: `Cannot delete, container query ${options.where.composite} not found.`});
            }

            models.Container.destroy(options)
                .then(result => {
                    if (result) {
                        req.params.name = req.params.container;
                        helpers.updateAuditLog(container.toJSON(), {}, req);
                    }
                    return result;
                })
                .then(handler.deleted(res, `Container not deleted. Query ${options.where.composite} failed.`))
                .catch(handler.error(next));
        });
}

/**
 * getComposite - gets a compositeId for a container
 *
 * @param {Object} params  The path parameters
 * @param {String} name    The name of the container
 *
 * @returns {String}       The compositeID for a container
 */
function getComposite(params, name) {
    return `${params.shipment}-${params.environment}-${name || params.container}`;
}
