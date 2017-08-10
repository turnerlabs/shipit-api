/*global describe, it */

const models = require('../models'),
    migration = require('../lib/migration');

describe('Test setup', function () {
    it('should run migrations', function (done) {
        models.sequelize.sync()
            .then(() => {
                // check migration status
                return migration.status();
            })
            .then(status => {
                if (status.pending.length > 0) {
                    return migration.migrate();
                }
                return Promise.resolve();
            })
            .then(result => done());
    });
});
