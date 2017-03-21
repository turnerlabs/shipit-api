const request = require('request');
var READ_ONLY_GROUPS = process.env.READ_ONLY_GROUPS || 'doc,iso';
READ_ONLY_GROUPS = READ_ONLY_GROUPS.split(',');

module.exports = {
    checkToken: (obj, callback) => {
        if (obj.username && obj.token) {
            check('http://auth.services.dmtio.net/v1/auth/checktoken', obj, callback);
        } else {
            callback(false);
        }
    },
    checkGroup: (obj, method, callback) => {
        check('https://argonaut.turner.com/checkGroup', obj, method, callback);
    }
}

function check(uri, obj, method, callback) {
    request({uri: uri, method: 'POST', json: obj}, (err, resp, body) => {
        if (err) {
            callback(false);
            return;
        }

        if (typeof body.success !== 'undefined') {
            // if the user is not authzed then, we should check to see if the method is GET and if they have
            // READ_ONLY access
            if (body.success === false && method.toLowerCase() === 'get') {
              body.success = READ_ONLY_GROUPS.indexOf(obj.groupname);
            }
            callback(body.success, typeof body.type !== 'undefined' ? body.type : null);
        } else {
            callback(false);
        }
    });
}
