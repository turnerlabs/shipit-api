const models = require('../models'),
    mapper = require('../lib/mappers'),
    handler = require('../lib/handler'),
    helpers = require('../lib/helpers'),
    checkAuth = require('.').checkAuth,
    router = require('express').Router();

router.get('/shipment/:shipment/environment/:environment/annotations', getAll);
router.get('/shipment/:shipment/environment/:environment/annotation/:annotation', getOne);
router.post('/shipment/:shipment/environment/:environment/annotations', checkAuth, post);
router.put('/shipment/:shipment/environment/:environment/annotation/:annotation', checkAuth, put);
router.delete('/shipment/:shipment/environment/:environment/annotation/:annotation', checkAuth, deleteIt);
module.exports = router;

/**
 * getAll - gets the annotations on an environment
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function getAll(req, res, next) {
    let authz = req.authorized || null,
        query = { where: { composite: `${req.params.shipment}-${req.params.environment}` } };

    models.Environment.findOne(query)
        .then(environment => {
            return environment.annotations || [];
        })
        .then(handler.fetched(res, `Annotations not found for Query: '${query.where.composite}'.`))
        .catch(reason => next(reason));
}

/**
 * getOne - gets the annotations on an environment
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function getOne(req, res, next) {
    let authz = req.authorized || null,
        query = { where: { composite: `${req.params.shipment}-${req.params.environment}` } };

    models.Environment.findOne(query)
        .then(environment => {
            let all = environment.annotations || [],
                item;

            for (let i = 0, l = all.length; i < l; i++) {
                if (all[i].key === req.params.annotation) {
                    item = all[i];
                    break;
                }
            }

            return item;
        })
        .then(handler.fetched(res, `Annotation '${req.params.annotation}' not found for Query: '${query.where.composite}'.`))
        .catch(reason => next(reason));
}

/**
 * post - create an annotation or annotations
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function post(req, res, next) {
    let body = req.body,
        authz = req.authorized || null,
        query = { where: { composite: `${req.params.shipment}-${req.params.environment}` } };

    // Get the environment
    models.Environment.findOne(query)
        .then(environment => {
            let was = environment.annotations.slice() || [];

            if (Array.isArray(body)) {
                for (let i = 0, l = body.length; i < l; i++) {
                    if (typeof body[i].key === 'undefined' || typeof body[i].value === 'undefined') {
                        return next({statusCode: 400, message: `Annotations must include a key and value property. Item ${i} failed.`});
                        break;
                    }
                }

                // setting all annotations
                req.params.name = body.reduce((arr, obj) => {
                    arr.push(obj.key);
                    return arr;
                }, []).join(',');
                environment.annotations = body.sort(helpers.sortByKey);
            }
            else {
                let temp = environment.annotations || []

                if (typeof body.key === 'undefined' || typeof body.value === 'undefined') {
                    return next({statusCode: 400, message: 'Annotations must include a key and value property.'});
                }

                let exists = false;
                temp.forEach(cur => {
                    if (cur.key === body.key) {
                        cur.value = body.value;
                        exists = true;
                    }
                });

                if (!exists) {
                    // setting only one annotation
                    temp.push(body);
                }

                req.params.name = body.key;
                environment.annotations = temp.sort(helpers.sortByKey);
            }

            helpers.updateAuditLog(was, environment.annotations, req);
            return environment.save();
        })
        .then(handler.created(res, `Annotation not created. Query ${query.where.composite} failed.`))
        .catch(handler.error(next));
}

/**
 * put - updates an annotation on an environment
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function put(req, res, next) {
    let body = req.body,
        authz = req.authorized || null,
        query = { where: { composite: `${req.params.shipment}-${req.params.environment}` } };

    models.Environment.findOne(query)
        .then(environment => {
            let temp = environment.annotations || [],
                was = temp.slice();

            if (typeof body.key === 'undefined' && typeof body.value === 'undefined') {
                return next({statusCode: 400, message: 'Annotation updates must include a key or value property.'});
            }

            for (let i = 0, l = temp.length; i < l; i++) {
                if (temp[i].key === req.params.annotation) {
                    temp[i].key = body.key;
                    temp[i].value = body.value;
                    break;
                }
            }

            // setting all annotations
            environment.annotations = temp.sort(helpers.sortByKey);

            req.params.name = req.params.annotation;
            helpers.updateAuditLog(was, environment.annotations, req);
            return environment.save();
        })
        .then(handler.updated(res, `Annotations not updated. Query ${query.where.composite} failed.`))
        .catch(reason => next(reason));
}

/**
 * deleteIt - updates an annotation on an environment
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function deleteIt(req, res, next) {
    let authz = req.authorized || null,
        query = { where: { composite: `${req.params.shipment}-${req.params.environment}` } };

    models.Environment.findOne(query)
        .then(environment => {
            let temp = environment.annotations || [],
                was = temp.slice();

            environment.annotations = temp.reduce((accum, ele) => {
                if (ele.key !== req.params.annotation) {
                    accum.push(ele);
                }
                return accum;
            }, []);

            helpers.updateAuditLog(was, {}, req);
            return environment.save();
        })
        .then(handler.updated(res, `Annotations not updated. Query ${query.where.composite} failed.`))
        .catch(reason => next(reason));
}
