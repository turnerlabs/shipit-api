const request = require('request');

module.exports = {
    checkToken: (obj, callback) => {
        if (obj.username && obj.token) {
            check('http://auth.services.dmtio.net/v1/auth/checktoken', obj, callback);
        } else {
            callback(false);
        }
    },
    checkGroup: (obj, callback) => {
        check('https://argonaut.turner.com/checkGroup', obj, callback);
    }
}

function check(uri, obj, callback) {
    request({uri: uri, method: 'POST', json: obj}, (err, resp, body) => {
        if (err) {
            callback(false);
            return;
        }

        if (typeof body.success !== 'undefined') {
            callback(body.success, typeof body.type !== 'undefined' ? body.type : null);
        } else {
            callback(false);
        }
    });
}
