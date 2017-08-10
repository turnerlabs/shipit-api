/*global describe, it */

const expect = require('chai').expect,
    request = require('supertest'),
    nock = require('nock'),
    models = require('../models'),
    helpers = require('./helpers'),
    server = require('../app');

let testShipment = helpers.fetchMockData('atomic-shipment-req'),
    authUser = 'test_user',
    authToken = 'foobar_token',
    serviceUser = 'service_user',
    serviceToken = 'service_token',
    authnPostData = {username: authUser, token: authToken},
    authnSuccess = { "success": true, "type": "user" },
    authnFailure = { "success": false },
    authnServiceSuccess = { "success": true, "type": "service" },
    authzSuccess = { groups_in: ['test', 'test-group'] };

describe('Auth', function () {
    beforeEach(function () {
        nock(helpers.getUrl('authn'))
            .post('/v1/auth/checktoken', authnPostData)
            .reply(200, (uri, requestBody) => {
                return authnSuccess;
            });

        nock(helpers.getUrl('authn'))
            .post('/v1/auth/checktoken', {username: serviceUser, token: serviceToken})
            .reply(200, (uri, requestBody) => {
                return authnServiceSuccess;
            });

        nock(helpers.getUrl('authz'))
            .get(`/getUserGroups/${authUser}`)
            .reply(200, (uri, requestBody) => {
                return authzSuccess;
            });
    });

    it('should be able to see buildToken when authorized as user', function (done) {
        request(server)
            .get('/v1/shipment/bulk-test-app/environment/test')
            .set('x-username', authUser)
            .set('x-token', authToken)
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let body = res.body;

                expect(body).to.have.property('buildToken');
                expect(body.buildToken).to.have.lengthOf(50);

                done();
            });
    });

    it('should not be able to see buildToken when not-authorized as user', function (done) {
        request(server)
            .get('/v1/shipment/bulk-test-app/environment/test')
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let body = res.body;

                expect(body).to.not.have.property('buildToken');

                done();
            });
    });

    it('should be able to see buildToken when authenticated as service', function (done) {
        request(server)
            .get('/v1/shipment/bulk-test-app/environment/test')
            .set('x-username', serviceUser)
            .set('x-token', serviceToken)
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let body = res.body;

                expect(body).to.have.property('buildToken');
                expect(body.buildToken).to.have.lengthOf(50);

                done();
            });
    });
});
