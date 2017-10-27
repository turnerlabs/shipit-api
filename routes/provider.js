const models = require('../models'),
    mapper = require('../lib/mappers'),
    handler = require('../lib/handler'),
    helpers = require('../lib/helpers'),
    checkAuth = require('.').checkAuth,
    router = require('express').Router();

router.post('/shipment/:shipment/environment/:environment/providers', checkAuth, post);
router.get('/shipment/:shipment/environment/:environment/provider/:provider', get);
router.put('/shipment/:shipment/environment/:environment/provider/:provider', checkAuth, put);
router.delete('/shipment/:shipment/environment/:environment/provider/:provider', checkAuth, deleteIt);
module.exports = router;

/**
 * get - gets a single provider
 *
 * @param req  The express request object
 * @param res  the express response object
 * @param next The next function to perform in the express middleware chain
 *
 */
function get(req, res, next) {
    let authz = req.authorized || null,
        query = {
            attributes: { exclude: helpers.excludes.provider(authz) },
            where: { composite: getComposite(req.params) },
            order: [
                ['composite', 'ASC'],
                [{ model: models.EnvVar, as: 'envVars' }, 'composite', 'ASC']
            ],
            include: [
              { model: models.EnvVar, as: "envVars", attributes: { exclude: helpers.excludes.envVar(authz) } }
            ]
        };

    models.Provider.findOne(query)
        .then(envVar => {
            if (!envVar) {
              return null;
            }

            let payload = envVar.toJSON();

            return payload;
        })
        .then(handler.fetched(res, `Provider '${req.params.provider}' not found for Query: '${query.where.composite}'.`))
        .catch(reason => next(reason));
}

/**
 * post - save a new provider object
 *
 * @param req  The express request object
 * @param res  the express response object
 * @param next The next function to perform in the express middleware chain
 *
 */
function post(req, res, next) {
    let body = req.body,
        authz = req.authorized || null;

    body.composite = getComposite(req.params, body.name);
    body.environmentId = `${req.params.shipment}-${req.params.environment}`;

    models.Provider.create(body)
        .then(result => {
            if (result) {
                result = helpers.exclude('provider', authz, result.toJSON());

                req.params.name = result.name;
                helpers.updateAuditLog({}, result, req);
            }
            return result;
        })
        .then(handler.created(res, `Provider not created. Query ${body.composite} failed.`))
        .catch(handler.error(next));
}

/**
 * put - update a single provider
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
            attributes: { exclude: helpers.excludes.provider(authz) },
            where: { composite: getComposite(req.params) }
        };

    // need to update the composite if the name changes
    if (data.name) {
        data.composite = `${req.params.shipment}-${req.params.environment}-${data.name}`;
    }

    models.Provider.findOne(options)
        .then(provider => {
            if (!provider) {
                return next({statusCode: 404, message: `Cannot update, provider query ${options.where.composite} not found.`});
            }

            models.Provider.update(data, options)
                .then(result => {
                    if (result[0] === 1) {
                        result = helpers.exclude('provider', authz, result[1][0].toJSON());

                        req.params.name = result.name;
                        helpers.updateAuditLog(provider.toJSON(), result, req);
                    }
                    else {
                        result = null;
                    }
                    return result;
                })
                .then(handler.updated(res, `Provider not updated. Query ${options.where.composite} failed.`))
                .catch(handler.error(next));
        });
}

/**
 * deleteIt - delete a single provider
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
            attributes: { exclude: helpers.excludes.provider(authz) },
            where: { composite: getComposite(req.params) }
        };

    models.Provider.findOne(options)
        .then(provider => {
            if (!provider) {
                return next({statusCode: 404, message: `Cannot delete, provider query ${options.where.composite} not found`});
            }

            models.Provider.destroy(options)
                .then(result => {
                    if (result) {
                        req.params.name = req.params.provider;
                        helpers.updateAuditLog(provider.toJSON(), {}, req);
                    }
                    return result;
                })
                .then(handler.deleted(res, `Provider not deleted. Query ${options.where.composite} failed.`))
                .catch(handler.error(next));
        });
}

/**
 * getComposite - get the composite ID for a provider object based on request params
 *
 * @param {Object} params The request params from the url
 * @param {Object} name The name of the object to update
 *
 * @returns {String} The compositeID
 *
 */
function getComposite(params, name) {
    return `${params.shipment}-${params.environment}-${name || params.provider}`;
}
