const pkg = require('../package.json'),
    auth = require('../lib/auth'),
    handler = require('../lib/handler'),
    models = require('../models');

const noAuthzPaths = [
    '/v1/shipments'
];

let showErrorStack = process.env.SHOW_ERROR_STACK || true;

let can = {
    read: group => group.permission > 0,
    write: group => group.permission === 2 || group.permission === 3 || group.permission >= 6,
    trigger: group => group.permission >= 4
}

module.exports = {
    health,
    errorHandler,
    setParams,
    setGroups,
    authenticate,
    authorize,
    checkAuth,
    preventCheck
};


/**
 * health - The health check for the application
 *
 * @param {Object} req The request object from express
 * @param {Object} res The response object form express
 *
 */
function health(req, res) {
    let response = {
        status: global.status,
        message: `running version ${pkg.version}`
    };

    if (global.appError) {
        response.message = global.appError;
    }

    res.status(global.status);
    res.json(response);
}

/**
 * errorHandler - A common error handler for the entire application
 *
 * @param {Object} err  The error object from express
 * @param {Object} req  The request object from express
 * @param {Object} res  The response object form express
 * @param {Function} next The next function in the middleware chain
 *
 */
function errorHandler(err, req, res, next) {
    let code = err.statusCode || 500,
        body = {
            status: code,
            message: err.message || err.toString() || err
        },
        context = `${req.method} ${req.path}`,
        shipment,
        environment;

    if (context === 'POST /v1/bulk/shipments') {
        // not much help for context here
        // let's get the shipment and environment
        shipment = req.body && req.body.parentShipment && req.body.parentShipment.name || 'no-shipment';
        environment = req.body && req.body.name || 'no-environment';
        context = `bulk endpoint ${shipment}:${environment}`
    }

    console.error('ERROR (%s) => ', context, err);
    res.status(code);
    res.json(body);
}

/**
 * setParams - set the shipment param for all paths
 *
 * @param {Object} req The request object from express
 * @param {Object} res The response object form express
 * @param {Function} next The next function in the express middleware chain
 *
 */
function setParams(req, res, next) {
    let values = req.originalUrl.split('/');

    if (values.length > 3) {
        req.shipment = values[3];
    }
    if (values.length > 5) {
        req.environment = values[5];
    }
    if (values[2] === 'logs') {
        if (values[4]) {
            req.shipment = values[4];
        }
        if (values[6]) {
            req.environment = values[6]
        }
    }

    next()
}

/**
 * authenticate - Check if the headers of the request contian the correct values
 * to authenticate the user. Authentication means they have logged into the auth server
 * and have a valid token.
 *
 * @param {Object} req The request object from express
 * @param {Object} res The response object form express
 * @param {Function} next The next function in the express middleware chain
 *
 */
function authenticate(req, res, next) {
    req.authenticated = false;

    // for backward compatability
    let user = req.body.username || req.get('x-username'),
        token = req.body.token || req.get('x-token'),
        buildToken = req.body.buildToken || null;

    req.username = user;

    if (user && token) {
        // User is attempting to auth
        auth.checkToken(user, token)
            .then(value => {
                if (value.success) {
                    req.authenticated = true;
                    req.authedUser = user;
                    req.tokenType = value.type;

                    return next();
                } else {
                    let err = new Error('Authentication failed');
                    err.statusCode = 401;

                    return next(err);
                }
            })
            .catch(e => next(e));
    } else if (buildToken) {
        auth.checkBuildToken(req, buildToken)
            .then(value => {
                if (value.success) {
                    req.authenticated = true;
                    req.authedUser = 'buildToken';
                    req.tokenType = 'service';

                    return next();
                } else {
                    let err = new Error('Build token authentication failed')
                    err.statusCode = 401;

                    return next(err);
                }
            })
            .catch(e => next(e));
    } else {
        // No attempt to auth, keep going
        return next();
    }
}

/**
 * setGroups - Set group objects from a shipment
 *
 * @param {Object} req The request object from express
 * @param {Object} res The response object form express
 *
 */
function setGroups(req, res, next) {
    let name = req.params.shipment || req.shipment || req.body.name || req.body.shipment;

    if (req.body.parentShipment) {
        name = req.body.parentShipment.name;
    }

    // only set groups if we can have a group
    if (req.method === 'GET' && noAuthzPaths.includes(req.path)) {
        return next();
    }

    // only get groups if we are authenticated
    // make sure we have a name to lookup the shipment on
    // if either one of these fail, just continue
    if (!req.authenticated) {
        return next();
    } else if (req.tokenType === 'service' && !name) {
        return next();
    } else if (!name) {
        return next({statusCode: 422, message: `No shipment name ${name}.`});
    }

    models.Shipment.findOne({ where: { name } })
        .then((shipment) => {
            if (!shipment) {
                // save to whatever group the user wants us too. If they don't have access to that group,
                // then it's on them, and they wont be able to edit it further.
                if (req.body.group || (req.body.parentShipment && req.body.parentShipment.group)) {
                    req.groups = [{permission: 2, name: req.body.group || req.body.parentShipment.group}];
                    return next();
                } else {
                    // no groups found for shipment
                    req.message = `Warning: No groups found for shipment ${name}`;
                    req.code = 404;
                    console.log(req.message)
                    return next();
                }
            }

            // in the future we can figure out how to incorporate more groups. Today we only have one on each shipment.
            req.groups = [{permission: 2, name: shipment.group}];

            // we couldcheck if the user is changing the group name,
            // that they are members of both the groups, which are affected
            // currently if the user sets the group to something they can't edit, then they will
            // lock themsevles out of that shipment. Could be ok for this to happen.

            return next();
        })
        .catch(e => next(e));
}

/**
 * authorize - Check if the user has the correct group access to perform the action
 * requested. This will match the username with group information and cross validate that the user
 * either has read access or the user have write access.
 *
 * @param {Object} req The request object from express
 * @param {Object} res The response object form express
 * @param {Function} next The next function in the express middleware chain
 *
 */
function authorize(req, res, next) {
    req.authorized = false;

    // only authz if we are authenticated
    if (!req.authenticated) {
        return next();
    }

    // if service then authz
    if (req.tokenType === 'service') {
        req.authorized = true;
        return next();
    }

    // if no groups then not authorized
    if (!req.groups) {
        return next();
    }

    let user = req.authedUser,
        groups = req.groups || [];
    // Filter groups to only groups with write permissions
    groups = groups.filter(can.write).map(group => group.name);

    auth.getGroups(user)
        .then(result => {
            // result is an array of groups the user is in
            // check each of these groups to see if they are
            // in the filtered groups
            result.forEach(group => {
                // as soon as we find one that is fine, move on
                if (groups.includes(group)) {
                    req.authorized = true;
                }
            });
            return next();
        })
        .catch(e => next(e));
}

/**
 * checkAuth - Check if authorized
 * @param {Object} req The request object from express
 * @param {Object} res The response object form express
 * @param {Function} next The next function in the express middleware chain
 *
 */
function checkAuth(req, res, next) {
    if (!req.authorized) {
        return next({statusCode: 401, message: 'Authorization failure'});
    }
    next();
}

/**
 * preventCheck - Check group to see if new Shipments should be prevented
 *
 * @param {Object} req  The express request object
 * @param {Object} res  the express response object
 * @param {Function} next The next function to perform in the express middleware chain
 *
 */
function preventCheck(req, res, next) {
    let group = req.groups[0].name,
        allowedGroups = typeof process.env.ALLOWED_GROUPS === 'undefined'
            ? ['cnn', 'coredev', 'cnnmoney']
            : process.env.ALLOWED_GROUPS.split(',');

    if (allowedGroups.indexOf(group) === -1) {
        // Group is NOT in list of allowed groups
        // prevent new Shipments
        req.preventNew = true;
    }
    else {
        // Do not prevent new Shipmnets
        req.preventNew = false;
    }

    return next();
}
