const models = require('../models'),
    mapper = require('../lib/mappers'),
    handler = require('../lib/handler'),
    helpers = require('../lib/helpers'),
    checkAuth = require('.').checkAuth,
    router = require('express').Router(),
    Promise = require('bluebird');

router.post('/bulk/shipments', checkAuth, bulk);
router.post('/shipments', checkAuth, post);
router.get('/shipments', getAll);
router.put('/shipment/:shipment', checkAuth, put);
router.get('/shipment/:shipment', get);
router.delete('/shipment/:shipment', checkAuth, deleteIt);
module.exports = router;


/**
 * getAll - gets all shipments
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function getAll(req, res, next) {
    let query = {
            attributes: { exclude: ['composite'] },
            include: [
                {
                    model: models.Environment,
                    as: "environments",
                    attributes: ['name']
                }
            ]
        };

    models.Shipment.findAll(query)
        .then(shipments => {
            shipments = shipments.map(shipment => {
                shipment = shipment.toJSON();
                shipment.environments = shipment.environments.map(env => env.name);
                return shipment;
            });

            res.json(shipments);
        })
        .catch(reason => next(reason));
}


/**
 * post - Save a new Shipment
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function post(req, res, next) {
    let body = req.body,
        authz = req.authorized || null;

    models.Shipment.create(body)
        .then(result => {
            if (result) {
                result = helpers.exclude('shipment', authz, result.toJSON());

                req.params.shipment = result.name;
                req.params.name = result.name;
                helpers.updateAuditLog({}, result, req);
            }
            return result;
        })
        .then(handler.created(res))
        .catch(handler.error(next));
}


/**
 * put - update a shipment
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
            where: {
                name: req.params.shipment
            }
        };

    models.Shipment.findOne(options)
        .then(shipment => {
            if (!shipment) {
                return next({statusCode: 404, message: `Cannot update, shipment ${options.where.composite} not found.`});
            }

            models.Shipment.update(data, options)
                .then(result => {
                    if (result[0] === 1) {
                        result = helpers.exclude('shipment', authz, result[1][0].toJSON());

                        req.params.name = result.name;
                        helpers.updateAuditLog(shipment.toJSON(), result, req);
                    }
                    else {
                        result = null;
                    }
                    return result;
                })
                .then(handler.updated(res, `Shipment not updated. Query ${options.where.name} failed.`))
                .catch(handler.error(next));
        });
}

/**
 * get - get a single shipment
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function get(req, res, next) {
    let authz = req.authorized || null,
        options = {
            where: { name: req.params.shipment },
            include: [
                { model: models.Environment, as: 'environments', attributes: { exclude: ['buildToken', 'composite', 'enableMonitoring', 'shipmentId'] } },
                { model: models.EnvVar, as: 'envVars', attributes: { exclude: helpers.excludes.envVar(authz) } }
            ]
        };

    models.Shipment.findOne(options)
        .then(handler.fetched(res, `Shipment ${req.params.shipment} not found`))
        .catch(handler.error(next));
}

/**
 * deleteIt - Delete a single shipment
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function deleteIt(req, res, next) {
    let options = {
        where: { name: req.params.shipment }
    };


    // TODO: need to test and make sure all child objects that are attached to this shipment are deleted. should
    // be the case since it's part of the constraint (jkurz)
    models.Shipment.findOne(options)
        .then(shipment => {
            if (!shipment) {
                return next({statusCode: 404, message: `Cannot delete, shipment ${options.where.name} not found.`});
            }

            models.Shipment.destroy(options)
                .then(result => {
                    if (result) {
                        req.params.name = req.params.shipment;
                        helpers.updateAuditLog(shipment.toJSON(), {}, req);
                    }
                    return result;
                })
                .then(handler.deleted(res, `Shipment not deleted. Query ${options.where.composite} failed.`))
                .catch(handler.error(next));
        });
}

/**
 * bulk - A bulk endpoint, which creates all subdocuments of a shipment. This endpoint, starts
 * a transaction and only completes, if every single document is updated successfully. If something
 * is left out of the document, and an object has already been created, whatever was left out, will be
 * deleted. This method ensures that whatever document is posted, is what the current state of that environment is.
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function bulk(req, res, next) {
    let shipment = mapper.shipment(req.body),
        shipName = shipment.name,
        envName = shipment.environments[0].name,
        baseComposite = `${shipName}-${envName}`,
        laterObjects = [];

    _get(shipName, envName)
        .then(environment => {
            if (!environment) {
                return null;
            }

            return environment.toJSON();
        })
        .then(originalShipment => {
            models.sequelize.transaction(taction => {
                return models.Shipment.upsert(shipment, {
                    transaction: taction,
                    include: _include(shipName, envName)
                })
                .then(result => {
                    let envVars = shipment.envVars || [],
                        deletes,
                        promises;

                    promises = envVars.map((envVar) => {
                        envVar.composite = `${shipment.name}-${envVar.name}`;
                        envVar.shipmentId = shipment.name;
                        envVar = helpers.prepEnvVar(envVar);

                        return models.EnvVar.upsert(envVar, {
                            transaction: taction,
                            include: []
                        });
                    });

                    // if originalShipment exists, check for deletes
                    if (originalShipment) {
                        deletes = getDeletes('EnvVar', originalShipment.envVars || [], envVars || [], taction).nowObjects;
                        deletes = deletes.map(obj => models[obj.model][obj.method](obj.options));
                    }

                    return Promise.all(promises.concat(deletes));
                })
                .then(result => {
                    let environment = shipment.environments[0] || null,
                        deletes,
                        promises = [];

                    if (!environment) {
                        return null;
                    }

                    environment.composite = baseComposite;
                    environment.shipmentId = `${shipment.name}`;

                    // During the migration, we will allow buildToken to be passed in if it exists regardless of
                    // whether the Shipment is new or not
                    if (originalShipment) {
                        environment.buildToken = shipment.environments[0].buildToken || originalShipment.environments[0].buildToken || helpers.generateToken();
                    } else {
                        environment.buildToken = shipment.environments[0].buildToken || helpers.generateToken();
                    }

                    let promise = models.Environment.upsert(environment, {
                        transaction: taction,
                        include: _include(shipName, envName, 'environments').include
                    });
                    promises.push(promise);

                    // should have a way to cross check if an envVar is not in in the array
                    // and if it's not there, but is in the current model, then we should delete it.
                    if (environment.envVars && environment.envVars.length) {
                        environment.envVars.map((envVar) => {
                            envVar.composite = `${environment.composite}-${envVar.name}`;
                            envVar.environmentId = `${environment.composite}`;
                            envVar = helpers.prepEnvVar(envVar);

                            let promise = models.EnvVar.upsert(envVar, {
                                transaction: taction,
                                include: []
                            });
                            promises.push(promise);
                        });
                    }

                    // if originalShipment exists then check for deletes
                    if (originalShipment) {
                        deletes = getDeletes('EnvVar', originalShipment.environments[0].envVars || [], environment.envVars || [], taction).nowObjects;
                        deletes = deletes.map(obj => models[obj.model][obj.method](obj.options));
                    }

                    return Promise.all(promises.concat(deletes));
                })
                .then(result => {
                    if (!result) {
                        return null;
                    }

                    let promises = [],
                        allPromises,
                        curContainers = originalShipment && originalShipment.environments[0].containers ? originalShipment.environments[0].containers : [],
                        newContainers = shipment.environments[0].containers || [],
                        curProviders = originalShipment && originalShipment.environments[0].providers ? originalShipment.environments[0].providers : [],
                        newProviders = shipment.environments[0].providers || [];

                    // 1. Delete the things that are not in "new", but are in "current"
                    allPromises = getDeletes('Container', curContainers, newContainers, taction);
                    promises = promises.concat(allPromises.nowObjects);
                    laterObjects = laterObjects.concat(allPromises.laterObjects);

                    allPromises = getDeletes('Provider', curProviders, newProviders, taction);
                    promises = promises.concat(allPromises.nowObjects);
                    laterObjects = laterObjects.concat(allPromises.laterObjects);

                    // 2. Upsert all the things in "new"
                    allPromises = getUpserts('Container', newContainers, baseComposite, 'environmentId', taction);
                    promises = promises.concat(allPromises.nowObjects);
                    laterObjects = laterObjects.concat(allPromises.laterObjects);

                    allPromises = getUpserts('Provider', newProviders, baseComposite, 'environmentId', taction);
                    promises = promises.concat(allPromises.nowObjects);
                    laterObjects = laterObjects.concat(allPromises.laterObjects);

                    promises = promises.map(obj => {
                        if (obj.method === 'upsert') {
                            return models[obj.model][obj.method](obj.values, obj.options);
                        }
                        else if (obj.method === 'destroy') {
                            return models[obj.model][obj.method](obj.options);
                        }
                    });
                    return Promise.all(promises);
                })
                .then(result => {
                    if (!result) {
                        return null;
                    }

                    let promises = laterObjects.map(obj => {
                        if (obj.method === 'upsert') {
                            return models[obj.model][obj.method](obj.values, obj.options);
                        }
                        else if (obj.method === 'destroy') {
                            return models[obj.model][obj.method](obj.options);
                        }
                    });
                    return Promise.all(promises);
                });
            })
            .then(result => {
                let code,
                    original;

                if (originalShipment) {
                    code = 200;
                    original = originalShipment;
                }
                else {
                    code = 201;
                    original = {};
                }

                req.params.shipment = shipment.name;
                req.params.name = shipment.name;
                req.params.environment = shipment.environments[0].name || 'parent';

                helpers.updateAuditLog(original, shipment, req);

                res.status(code);
                res.json(mapper.reverseShipment(shipment));
            })
            .catch(handler.error(next));
        });
}

/**
 * _get - abstract shipment fetcher
 *
 * @param {String} ship  Name of Shipment to fetch
 * @param {String} env   Name of Environment to fetch
 *
 * Return a Promise to fetch the Shipment Environment
 *
 * @returns {Promise} The Shipment Environment promise
 */
function _get(ship, env) {
    let options = {
            where: { name: ship },
            include: _include(ship, env)
        };

    return models.Shipment.findOne(options);
}

/**
 * _include - Abstract of include query
 *
 * @param {String} ship  Name of Shipment to fetch
 * @param {String} env   Name of Environment to fetch
 * @param {String} name  Optional limit on item to return
 *
 * @returns {Array} The include array
 */
function _include(ship, env, name) {
    let include = [
            { model: models.EnvVar, as: "envVars" },
            { model: models.Environment, as: "environments", where: { composite: `${ship}-${env}` }, include: [
                { model: models.EnvVar, as: "envVars" },
                { model: models.Provider, as: "providers", include: [
                    { model: models.EnvVar, as: "envVars" }
                ] },
                { model: models.Container, as: "containers", include: [
                    { model: models.EnvVar, as: "envVars" },
                    { model: models.Port, as: "ports" }
                ] }
            ] }
        ];

    if (name) {
        for (let i = 0, l = include.length; i < l; i++) {
            if (include[i].as === name) {
                return include[i];
                break;
            }
        }
    }

    return include;
}

/**
 * getUpserts - Get the update/insert objects (not Promises)
 *
 * @param {String} model            The model type to update or create
 * @param {Array} incoming          Array of items to be updated, or added
 * @param {String} composite        Base id or composite
 * @param {String} foriegnKeyId     The type of foriegn key (e.g., 'environmentId' or 'containerId')
 * @param {Object} taction          The transaction
 *
 * Will recursively get all the items for upsert (update/insert). If the call
 * is a Container, it will recursively add upserts for Ports and EnvVars. If
 * the call is a Provider, it will recursively add upserts for EnvVars.
 *
 * This returns an object with two properties; nowObjects and laterObjects. Both are arrays
 * of objects with properties; model, method, values, and options. These objects, via their properties,
 * will be used to create Promises. But the order and execution of the Promises matters a great
 * deal.
 *
 * @returns {Object} With two properties, nowObjects and laterObjects, for upsertion
 */
function getUpserts(model, incoming, composite, foriegnKeyId, taction) {
    let nowObjects = [],
        laterObjects = [];

    incoming.forEach(inc => {
        let options = {
                transaction: taction,
                include: _getUpsertIncludes(model)
            }

        inc.composite = `${composite}-${inc.name}`;
        inc[foriegnKeyId] = composite;
        if (model === 'EnvVar') {
            // we need to make sure that Env Vars have their shaValue set
            inc = helpers.prepEnvVar(inc);
        }
        nowObjects.push({model: model, method: 'upsert', values: inc, options: options});

        if (model === 'Container') {
            let incPorts = inc.ports || [],
                key = `${model.toLowerCase()}Id`,
                id = `${composite}-${inc.name}`;

            // getUpserts returns an object, and we know the items we want are in prop nowObjects
            laterObjects = laterObjects.concat(getUpserts('Port', incPorts, id, key, taction).nowObjects);
        }
        if (model === 'Container' || model === 'Provider') {
            let incEnvVars = inc.envVars || [],
                key = `${model.toLowerCase()}Id`,
                id = `${composite}-${inc.name}`;

            // getUpserts returns an object, and we know the items we want are in prop nowObjects
            laterObjects = laterObjects.concat(getUpserts('EnvVar', incEnvVars, id, key, taction).nowObjects);
        }
    });

    return {nowObjects: nowObjects, laterObjects: laterObjects};
}

/**
 * _getUpsertIncludes - Get includes for upsert
 *
 * @param {String} model    The model to get includes for
 *
 * Will return an array of objects to be used for the includes on a upsert action
 *
 * @returns {Array} The array of objects to be included
 */
function _getUpsertIncludes(model) {
    let includes = [];

    if (model === 'Container' || model === 'Provider') {
        includes.push({model: models.EnvVar, as: "envVars"});
    }
    if (model === 'Container') {
        includes.push({model: models.Ports, as: "ports"});
    }

    return includes;
}

/**
 * getDeletes - Get the delete objects to make into Promises later
 *
 * @param {String} model        The model type to destroy
 * @param {Array} current       Array of current/original items to compare against
 * @param {Array} incoming      Array of incoming/new items to compare against
 * @param {Object} taction      The transaction
 *
 * Will recursively get all the items to destroy. If the call is for a Container,
 * it will recursively get the Ports and EnvVars. If the call is for a Provider,
 * it will recursively get the EnvVars.
 *
 * This returns an object with two properties; nowObjects and laterObjects. Both are arrays
 * of objects with properties; model, method, and options. These objects, via their properties,
 * will be used to create Promises. But the order and execution of the Promises matters a great
 * deal.
 *
 * @returns {Object} With two properties, nowObjects and laterObjects, for upsertion
 */
function getDeletes(model, current, incoming, taction) {
    let nowObjects = [],
        laterObjects = [];

    current.forEach(cur => {
        let shouldDelete = true;

        incoming.forEach(inc => {
            if (inc.name === cur.name) {
                shouldDelete = false;
            }

            if (model === 'Container') {
                let curPorts = cur.ports || [],
                    incPorts = inc.ports || [];

                // getDeletes returns an object, and we know the items we want are in prop nowObjects
                laterObjects = laterObjects.concat(getDeletes('Port', curPorts, incPorts, taction).nowObjects);
            }
            if (model === 'Container' || model === 'Provider') {
                let curEnvVars = cur.envVars || [],
                    incEnvVars = inc.envVars || [];

                // getDeletes returns an object, and we know the items we want are in prop nowObjects
                laterObjects = laterObjects.concat(getDeletes('EnvVar', curEnvVars, incEnvVars, taction).nowObjects);
            }
        });

        if (shouldDelete) {
            nowObjects.push({
                model: model,
                method: 'destroy',
                options: {
                    where: { composite: cur.composite },
                    transaction: taction
                }
            });
        }
    });

    return {nowObjects: nowObjects, laterObjects: laterObjects};
}
