const models = require('../models'),
    mapper = require('../lib/mappers'),
    handler = require('../lib/handler'),
    helpers = require('../lib/helpers'),
    crypto = require('../lib/crypto'),
    checkAuth = require('.').checkAuth,
    router = require('express').Router(),
    Promise = require('bluebird');

// Shipment EnvVars
router.post('/shipment/:shipment/envVars', checkAuth, post);
router.get('/shipment/:shipment/envVar/:name', get);
router.put('/shipment/:shipment/envVar/:name', checkAuth, put);
router.delete('/shipment/:shipment/envVar/:name', checkAuth, deleteIt);

// Environment EnvVars
router.post('/shipment/:shipment/environment/:environment/envVars', checkAuth, post);
router.get('/shipment/:shipment/environment/:environment/envVar/:name', get);
router.put('/shipment/:shipment/environment/:environment/envVar/:name', checkAuth, put);
router.delete('/shipment/:shipment/environment/:environment/envVar/:name', checkAuth, deleteIt);

// Container EnvVars
router.post('/shipment/:shipment/environment/:environment/container/:container/envVars', checkAuth, post);
router.get('/shipment/:shipment/environment/:environment/container/:container/envVar/:name', get);
router.put('/shipment/:shipment/environment/:environment/container/:container/envVar/:name', checkAuth, put);
router.delete('/shipment/:shipment/environment/:environment/container/:container/envVar/:name', checkAuth, deleteIt);

// Provider EnvVars
router.post('/shipment/:shipment/environment/:environment/provider/:provider/envVars', checkAuth, post);
router.get('/shipment/:shipment/environment/:environment/provider/:provider/envVar/:name', get);
router.put('/shipment/:shipment/environment/:environment/provider/:provider/envVar/:name', checkAuth, put);
router.delete('/shipment/:shipment/environment/:environment/provider/:provider/envVar/:name', checkAuth, deleteIt);

// search
router.get('/envVar/search', search);


module.exports = router;

/**
 * get - get a single environment variable
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function get(req, res, next) {
    let authz = req.authorized || null,
        query = {
            attributes: { exclude: helpers.excludes.envVar(authz) },
            where: helpers.getWhereClause(req.params),
            include: []
        };

    models.EnvVar.findOne(query)
        .then(envVar => {
            if (!envVar) {
              return null;
            }

            envVar = envVar.toJSON();

            if (envVar.type === 'hidden' && !authz) {
                envVar.value = helpers.hideValue();
            }

            return envVar;
        })
        .then(handler.fetched(res, `EnvVar '${req.params.name}' not found for Query: '${query.where.composite}'.`))
        .catch(reason => next(reason));
}

/**
 * post - create a single environment variable
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function post(req, res, next) {
    let body = req.body,
        authz = req.authorized || null,
        envVar = helpers.getWhereClause(req.params, body.name);

    envVar.value = body.value;
    envVar.type = body.type || 'basic';
    envVar = helpers.prepEnvVar(envVar);

    models.EnvVar.create(envVar)
        .then(result => {
            if (result) {
                result = helpers.exclude('envVar', authz, result.toJSON());

                req.params.name = result.name;
                helpers.updateAuditLog({}, result, req);
            }
            return result;
        })
        .then(handler.created(res, `EnvVar not created. Query ${envVar.composite} failed.`))
        .catch(handler.error(next));
}

/**
 * put - update a single environment variable
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
            attributes: { exclude: helpers.excludes.envVar(authz) },
            where: helpers.getWhereClause(req.params)
        };

    // need to update the composite if the name changes
    if (data.name) {
        data.composite = options.where.composite;
    }

    models.EnvVar.findOne(options)
        .then(envVar => {
            if (!envVar) {
                return next({ statusCode: 404, message: `Cannot update, EnvVar query ${options.where.composite} not found.` });
            }

            data.value = data.value || envVar.value;
            data = helpers.prepEnvVar(data);

            models.EnvVar.update(data, options)
                .then(result => {
                    if (result[0] === 1) {
                        result = helpers.exclude('envVar', authz, result[1][0].toJSON());

                        helpers.updateAuditLog(envVar.toJSON(), result, req);
                    }
                    else {
                        result = null;
                    }
                    return result;
                })
                .then(handler.updated(res, `EnvVar not updated. Query ${options.where.composite} failed.`))
                .catch(handler.error(next));
        });
}

/**
 * deleteIt - delete a single environment variable
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function deleteIt (req, res, next) {
    let options = {
            returning: true,
            where: helpers.getWhereClause(req.params)
        };

    models.EnvVar.findOne(options)
        .then(envVar => {
            if (!envVar) {
                let msg = `Cannot delete, envVar query ${options.where.composite} not found.`;
                return next({ statusCode: 422, message: msg, error: msg });
            }

            models.EnvVar.destroy(options)
                .then(result => {
                    if (result) {
                        helpers.updateAuditLog(envVar.toJSON(), {}, req);
                    }
                    return result;
                })
                .then(handler.deleted(res))
                .catch(handler.error(next));
        });
}

/**
 * search - find all envVars, which have a key=value.
 * There is one small breaking piece of how this function works. We only return values that
 * are set on the environment. No other object gets its environment variables queried. This is true for
 * the current version, except for the upper shipment level. We are also only returning one environment
 * per array of environments. It would be easier if we just returned one array of environments with it's parent Shipment attached.
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function search (req, res, next) {
    let query = { where: { } },
        authz = req.authorized || null;

    for (let key in req.query) {
        query.where.name = key;
        query.where.shaValue = crypto.sha(req.query[key]);
    }

    models.EnvVar.findAll(query)
        .then(envVars => {
            let promises = envVars.map(envVar => {
                // An envVar has either a shipmentId, environmentId, providerId, or containerId
                // Look for the correct item
                if (envVar.shipmentId) {
                    return models.Shipment.find({
                        where: {
                            name: envVar.shipmentId
                        }
                    });
                }
                else if (envVar.environmentId) {
                    return models.Environment.find({
                        where: {
                            composite: envVar.environmentId
                        }
                    });
                }
                else if (envVar.providerId) {
                    return models.Provider.find({
                        where: {
                            composite: envVar.providerId
                        }
                    });
                }
                else if (envVar.containerId) {
                    return models.Container.find({
                        where: {
                            composite: envVar.containerId
                        }
                    });
                }
            });

            return Promise.all(promises);
        })
        .then(objects => {

            let promises = objects.map(obj => {
                let name = obj['$modelOptions'].name.singular;

                if (name === 'Provider' || name === 'Container') {
                    return models.Environment.find({
                        where: {
                            composite: obj.environmentId
                        }
                    })
                }
                else if (name === 'Shipment') {
                    return models.Environment.findAll({
                        where: {
                            shipmentId: obj.name
                        }
                    })
                }
                else {
                    return obj;
                }

                return obj
            });
            // flatten array
            promises = helpers.flatten(promises);

            return Promise.all(promises);
        })
        .then(environments => {

            // need to flatten the array again
            environments = helpers.flatten(environments);

            let promises = environments.map(env => {
                return models.Shipment.find({
                    where: { name: env.shipmentId },
                    attributes: { exclude: helpers.excludes.shipment(authz) },
                    include: [
                        {
                            model: models.Environment,
                            where: {
                                name: env.name
                            },
                            as: "environments",
                            include: [
                                {
                                    model: models.EnvVar,
                                    as: 'envVars',
                                    attributes: { exclude: helpers.excludes.envVar(authz) }
                                },
                                {
                                    model: models.Container,
                                    as: 'containers',
                                    attributes: { exclude: helpers.excludes.container(authz) },
                                    include: [
                                        {
                                            model: models.EnvVar,
                                            as: 'envVars',
                                            attributes: { exclude: helpers.excludes.envVar(authz) }
                                        },
                                        {
                                            model: models.Port,
                                            as: 'ports',
                                            attributes: { exclude: helpers.excludes.port(authz) }
                                        }
                                    ]
                                },
                                {
                                    model: models.Provider,
                                    as: 'providers',
                                    attributes: { exclude: helpers.excludes.provider(authz) },
                                    include: [
                                        {
                                            model: models.EnvVar,
                                            as: 'envVars',
                                            attributes: { exclude: helpers.excludes.envVar(authz) }
                                        }
                                    ]
                                }
                            ],
                            attributes: ['name']
                        },
                        {
                            model: models.EnvVar,
                            as: "envVars",
                            attributes: { exclude: helpers.excludes.envVar(authz) }
                        }
                    ]
                });
            });

            return Promise.all(promises);
        })
        .then(objects => {
            const results = objects
                .sort(helpers.sortByName)
                .reduce((item, val) => {
                    let index = helpers.findIndex(item, val.name);

                    if (index !== -1) {
                        // this is a new environment to add to an existing shipment
                        item[index].environments.push(val.environments[0]);
                        item[index].environments.sort(helpers.sortByName);
                    }
                    else {
                        item.push(val);
                    }

                    return item;
                }, []);

            return results;
        })
        .then((objects) => {
            return objects.map((object) => {
                object.envVars = object.envVars.map((envVar) => helpers.toHideValue(envVar, authz))
                object.environments =  object.environments.map((environment) => {
                    environment.envVars = environment.envVars.map((envVar) => helpers.toHideValue(envVar, authz))
                    environment.providers = environment.providers.map((provider) => {
                        provider.envVars.map((envVar) => helpers.toHideValue(envVar, authz))
                    });
                    environment.containers = environment.containers.map((container) => {
                        container.envVars.map((envVar) => helpers.toHideValue(envVar, authz))
                    });
                });
                return object;
            })
        })
        .then(result => res.json(result))
        .catch(reason => next(reason));

}
