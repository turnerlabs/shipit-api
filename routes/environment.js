const models = require('../models'),
    mapper = require('../lib/mappers'),
    handler = require('../lib/handler'),
    helpers = require('../lib/helpers'),
    checkAuth = require('.').checkAuth,
    router = require('express').Router(),
    Promise = require('bluebird');

router.post('/shipment/:shipment/environments', checkAuth, post);
router.get('/shipment/:shipment/environment/:name', get);
router.put('/shipment/:shipment/environment/:name', checkAuth, put);
router.delete('/shipment/:shipment/environment/:name', checkAuth, deleteIt);
router.put('/shipment/:shipment/environment/:name/buildToken', checkAuth, rollBuildToken);
module.exports = router;

/**
 * get - gets a single environment object
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function get(req, res, next) {
    let authz = req.authorized || null,
        shipmentName = req.params.shipment,
        environmentName = req.params.name;

    // only reason we need to make this query for the parentShipment is to not break and put the data in the environment object. Shame...
    _get(req, 'shipment', shipmentName, environmentName)
        .then((shipment) => {
          if (!shipment) {
              return handler.fetched(res, `Shipment '${shipmentName}' not found.`)(null);
          }

          return _get(req, 'environment', shipmentName, environmentName)
              .then(environment => {
                  if (!environment) {
                    return null;
                  }

                  let payload = environment.toJSON();

                  payload.parentShipment = shipment.toJSON();
                  delete payload.parentShipment.id;

                  // if user is not authed, hide iam role
                  if (!authz) {
                      payload.iamRole = helpers.hideValue();
                  }

                  return payload;
              })
              .then(result => {
                  if (result) {
                      let hide = (envVar, authz) => {
                              if (!authz && envVar.type === 'hidden') {
                                  envVar.value = helpers.hideValue();
                              }
                              delete envVar.shaValue;
                              return envVar;
                          },
                          portFieldDel = (port, authz) => {
                              // these fields are not being excluded correctly
                              let fields = ['private_key', 'public_key_certificate', 'certificate_chain'];

                              if (!authz) {
                                  fields.forEach(field => delete port[field])
                              }

                              return port;
                          };

                      if (result.envVars) {
                          result.envVars = result.envVars
                              .map(envVar => hide(envVar, authz))
                              .sort(helpers.sortByName);
                      }
                      if (result.parentShipment && result.parentShipment.envVars) {
                          result.parentShipment.envVars = result.parentShipment.envVars
                              .map(envVar => hide(envVar, authz))
                              .sort(helpers.sortByName);
                      }
                      if (result.containers) {
                          result.containers = result.containers.map(container => {
                              if (container.envVars) {
                                  container.envVars = container.envVars
                                      .map(envVar => hide(envVar, authz))
                                      .sort(helpers.sortByName);
                              }
                              if (container.ports) {
                                  container.ports = container.ports.map(port => portFieldDel(port, authz));
                              }
                              return container;
                          });
                      }
                      if (result.providers) {
                          result.providers = result.providers.map(provider => {
                              if (provider.envVars) {
                                  provider.envVars = provider.envVars
                                      .map(envVar => hide(envVar, authz))
                                      .sort(helpers.sortByName);
                              }
                              return provider;
                          });
                      }
                  }
                  return result;
              })
              .then(handler.fetched(res, `Environment '${environmentName}' not found for Shipment '${shipmentName}'.`))
        })
        .catch(reason => next(reason));
}

/**
 * post - create a single environment
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function post(req, res, next) {
    let body = req.body,
        authz = req.authorized || null;

    body.shipmentId = req.params.shipment;
    body.composite = `${req.params.shipment}-${body.name}`;
    body.buildToken = helpers.generateToken();

    models.Environment.create(body)
        .then(result => {
            if (result) {
                result = helpers.exclude('environment', authz, result.toJSON());

                req.params.name = result.name;
                req.params.environment = req.params.name;
                helpers.updateAuditLog({}, result, req);
            }
            return result;
        })
        .then(handler.created(res, `Environment not created. Query ${body.composite} failed.`))
        .catch(handler.error(next));
}

/**
 * put - Update a single environment
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
            where: { composite: `${req.params.shipment}-${req.params.name}` }
        };

    // need to update the composite if the name changes
    if (data.name) {
        data.composite = `${req.params.shipment}-${data.name}`;
    }

    // cannot update buildToken
    if (data.buildToken) {
        delete data.buildToken;
    }

    models.Environment.findOne(options)
        .then(environment => {
            if (!environment) {
                return res.status(404).json({message: `Cannot Update! Query: ${options.where.composite} Not Found`});
            }

            models.Environment.update(data, options)
                .then(result => {
                    if (result[0] === 1) {
                        result = helpers.exclude('environment', authz, result[1][0].toJSON());

                        req.params.environment = req.params.name;
                        helpers.updateAuditLog(environment.toJSON(), result, req);
                    }
                    else {
                        result = null;
                    }
                    return result;
                })
                .then(handler.updated(res))
                .catch(handler.error(next));
        });
}

/**
 * deleteIt - delete a single environment
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function deleteIt (req, res, next) {
    let options = {
            returning: true,
            where: { composite: `${req.params.shipment}-${req.params.name}` },
            attributes: { exclude: ['composite', 'createdAt', 'updatedAt'] }
        };

    models.Environment.findOne(options)
        .then((environment) => {
            if (!environment) {
                return next({statusCode: 404, message: `Cannot delete, query '${options.where.composite}' not found.`});
            }

            models.Environment.destroy(options)
                .then(result => {
                    if (result) {
                        req.params.environment = req.params.name;
                        helpers.updateAuditLog(environment.toJSON(), {}, req);
                    }
                    return result;
                })
                .then(handler.deleted(res))
                .catch(handler.error(next));
        });
}

/**
 * rollBuildToken - roll the build token
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function rollBuildToken(req, res, next) {
    let authz = req.authorized || null,
        options = {
            returning: true,
            where: { composite: `${req.params.shipment}-${req.params.name}` }
        };

    models.Environment.findOne(options)
        .then(environment => {
            if (!environment) {
                return res.status(404).json({message: `Cannot Update! Query: ${options.where.composite} Not Found`});
            }

            let data = {buildToken: helpers.generateToken()};

            models.Environment.update(data, options)
                .then(result => {
                    if (result[0] === 1) {
                        result = helpers.exclude('environment', authz, result[1][0].toJSON());

                        req.params.environment = req.params.name;
                        helpers.updateAuditLog(environment.toJSON(), result, req);
                    }
                    else {
                        result = null;
                    }
                    return result;
                })
                .then(handler.updated(res))
                .catch(handler.error(next));
        });
}

/**
 * _get - abstract shipment fetcher
 *
 * @param {Object} req   Request object, used for auth
 * @param {String} type  The type of query to return
 * @param {String} ship  Name of Shipment to fetch
 * @param {String} env   Name of Environment to fetch
 *
 * Return a Promise to fetch the Shipment Environment
 *
 * @returns {Promise} The Shipment Environment promise
 */
function _get(req, type, ship, env) {
    let model,
        authz = req.authorized || null,
        query = {
            shipment: {
                where: { name: ship },
                order: [
                    ['name', 'ASC'],
                    [{ model: models.EnvVar, as: 'envVars' }, 'composite', 'ASC']
                ],
                include: [
                    { model: models.EnvVar, as: 'envVars', attributes: { exclude: helpers.excludes.envVar(authz) } }
                ]
            },
            environment: {
                attributes: { exclude: helpers.excludes.environment(authz) },
                where: { composite: `${ship}-${env}` },
                order: [
                    ['name', 'ASC'],
                    [{ model: models.EnvVar, as: 'envVars' }, 'composite', 'ASC'],
                    [{ model: models.Provider, as: 'providers' }, 'composite', 'ASC'],
                    [{ model: models.Provider, as: 'providers' }, { model: models.EnvVar, as: 'envVars' }, 'composite', 'ASC'],
                    [{ model: models.Container, as: 'containers'}, 'composite', 'ASC'],
                    [{ model: models.Container, as: 'containers'}, { model: models.EnvVar, as: 'envVars' }, 'composite', 'ASC'],
                    [{ model: models.Container, as: 'containers'}, { model: models.Port, as: 'ports' }, 'composite', 'ASC'],
                ],
                include: [
                    { model: models.EnvVar, as: "envVars", attributes: { exclude: helpers.excludes.envVar(authz) } },
                    { model: models.Provider, as: "providers", attributes: { exclude: helpers.excludes.provider(authz) }, include: [
                        { model: models.EnvVar, as: "envVars", attributes: { exclude: helpers.excludes.envVar(authz) } }
                    ] },
                    { model: models.Container, as: "containers", attributes: { exclude: helpers.excludes.container(authz) }, include: [
                        { model: models.EnvVar, as: "envVars", attributes: { exclude: helpers.excludes.envVar(authz) } },
                        { model: models.Port, as: "ports", attributes: { exclude: helpers.excludes.port(authz) } }
                    ] }
                ]
            }
        };

    switch (type) {
    case 'shipment': model = models.Shipment; break;
    case 'environment': model = models.Environment; break;
    }

    return model.findOne(query[type]);
}
