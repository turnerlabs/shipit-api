const request = require('./request'),
    Env = require('../models').Environment,
    authnUrl = process.env.AUTHN_URL || 'http://auth.services.dmtio.net/v1/auth/checktoken',
    authzUrl = process.env.AUTHZ_URL || 'https://argonaut.turner.com',
    Promise = require('bluebird');

module.exports = {
    checkToken: (user, token) => {
        return new Promise((resolve, reject) => {
            if (user && token) {
                request.post(authnUrl, null, {username: user, token: token})
                    .then(value => resolve(value))
                    .catch(reason => reject(reason));
            } else {
                let err = new Error('Username and Token are required to authenticate');
                err.statusCode = 400;
                reject(err);
            }
        });
    },

    getGroups: user => {
        return new Promise((resolve, reject) => {
            let url = `${authzUrl}/getUserGroups/${user}`;

            request.get(url, null)
                .then(result => {
                    let groups = result && result.groups_in ? result.groups_in : [],
                        admin  = result && result.groups_adminned ? result.groups_adminned : [];

                    resolve(groups.concat(admin));
                })
                .catch(reason => reject(reason));
        });
    },

    checkGroups: (user, groups) => {
        return new Promise((resolve, reject) => {
            if (user && groups) {
                request.post(authzUrl, null, {username: user, group: group})
                    .then(value => resolve(value))
                    .catch(reason => reject(reason));
            } else {
                let err = new Error('Username and Groups are required to authorize');
                err.statusCode = 400;
                reject(err);
            }
        });
    },

    checkBuildToken: (req, token) => {
        return new Promise((resolve, reject) => {
            const ship = req.params.shipment,
                env = req.params.environment || req.params.name;
            // Get the shipment
            Env.findOne({ composite: `${ship}-${env}` })
                .then(environment => {
                    if (!environment) {
                        let err = new Error(`Cannot find ${ship} ${env}!`);
                        err.statusCode = 404;
                        return reject(err);
                    }

                    if (token === environment.get('buildToken')) {
                        resolve({success: true});
                    } else {
                        resolve({success: false});
                    }

                })
                .catch(reason => reject(reason));
        })
    }
}
