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
        check('https://argonaut.turner.com/checkGroup', obj, callback, method);
    }
}

function check(uri, obj, callback, method) {
    request({uri: uri, method: 'POST', json: obj}, (err, resp, body) => {
        if (err) {
            callback(false);
            return;
        }

        if (body && typeof body.success !== 'undefined') {
            // if the user is not authzed then, we should check to see if the method is GET and if they have
            // READ_ONLY access
            if (method && body.success === false && method.toLowerCase() === 'get') {
              request({uri: `https://argonaut.turner.com/getUserGroups/${obj.username}`, method: 'GET'}, (err, resp, body) => {
                  if (err) {
                      callback(false);
                      return;
                  }

                  body = JSON.parse(body);

                  body.groups_adminned = body.groups_adminned || [];
                  body.groups_in = body.groups_in || [];

                  var groups = body.groups_adminned.concat(body.groups_in);
                  groups.forEach((group) => {
                    if (READ_ONLY_GROUPS.indexOf(group) !== -1) {
                      body.success = true;
                    }
                  });

                  callback(body.success, typeof body.type !== 'undefined' ? body.type : null);
              });
            } else {
              callback(body.success, typeof body.type !== 'undefined' ? body.type : null);
            }
        } else {
            callback(false);
        }
    });
}
