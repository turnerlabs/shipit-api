/*global describe, it */

const expect = require('chai').expect,
    db = require('../models').sequelize;

describe('SQL Table', function () {
    describe('EnvVar', function () {
        it('should have a value for every `shaValue`', function (done) {
            db.query('SELECT "composite", "shaValue" FROM "EnvVars"', { type: db.QueryTypes.SELECT })
                .then(envVars => {
                    envVars.forEach(envVar => {
                        expect(envVar.shaValue, `composite ${envVar.composite} has "shaValue" === null`).to.not.be.null;
                    });

                    done();
                })
                .catch(reason => done(reason));
        });
    });
});
