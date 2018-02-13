/*global describe, it */

const expect = require('chai').expect,
    request = require('supertest'),
    nock = require('nock'),
    models = require('../models'),
    helpers = require('./helpers'),
    server = require('../app');

let testShipment = helpers.fetchMockData('atomic-shipment-req'),
    testEnvironment = helpers.fetchMockData('environment'),
    envVar = helpers.fetchMockData('envVar'),
    authUser = 'test_user',
    authToken = 'foobar_token',
    authnPostData = {username: authUser, token: authToken},
    authnSuccess = { "success": true },
    authnFailure = { "success": false },
    authzSuccess = { groups_in: ['test', 'test-group'] };

beforeEach(function () {
    nock(helpers.getUrl('authn'))
        .post('/v1/auth/checktoken', authnPostData)
        .reply(200, (uri, requestBody) => {
            return authnSuccess;
        });

    nock(helpers.getUrl('authz'))
        .get(`/getUserGroups/${authUser}`)
        .reply(200, (uri, requestBody) => {
            return authzSuccess;
        });
});

describe('Logs', function () {
    describe('View', function () {
        before(function () {
            return models.sequelize.sync();
        });

        it('should show a listing of logged events for a Shipment', function (done) {
            request(server)
                .get('/v1/logs/shipment/test-shipment')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body).to.be.instanceOf(Array);
                    expect(body.length).to.equal(31);

                    return done();
                });

        });

        it('should show a listing of logged events for a Shipment Environment', function (done) {
            request(server)
                .get('/v1/logs/shipment/test-shipment/environment/test-env')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body).to.be.instanceOf(Array);
                    expect(body.length).to.equal(24);

                    return done();
                });
        });

        it('should show a listing of logged events for bulk changes of a Shipment', function (done) {
            request(server)
                .get('/v1/logs/shipment/bulk-shipment-app')
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body).to.be.instanceOf(Array);
                    expect(body[0].diff).to.equal("*******")
                    expect(body.length).to.equal(10);

                    return done();
                });
        });

        it('should show a listing of logged events for bulk changes of a Shipment Environment', function (done) {
            request(server)
                .get('/v1/logs/shipment/bulk-shipment-app/environment/test6')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body).to.be.instanceOf(Array);
                    expect(body[0].diff).not.to.equal("*******")
                    expect(body.length).to.equal(3);

                    return done();
                });
        });
    });

    describe('Update', function () {
        it('should accept a new log entry', function (done) {
            // Need to get the buildToken to start
            let shipment = 'bulk-shipment-app',
                environment = 'test6';

            request(server)
                .get(`/v1/shipment/${shipment}/environment/${environment}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let message = {
                            shipment: shipment,
                            environment: environment,
                            hidden: false,
                            user: 'trigger',
                            updated: (new Date()).getTime(),
                            diff: "Message"
                        };


                    request(server)
                        .post('/v1/logs')
                        .set('x-username', authUser)
                        .set('x-token', authToken)
                        .send(message)
                        .expect('Content-Type', /json/)
                        .expect(201, (err, res) => {
                            if (err) {
                                return done(err);
                            }

                            let body = res.body,
                                props = ['diff', 'id', 'shipment', 'environment', 'hidden', 'user', 'name', 'timestamp'];

                            props.forEach(prop => expect(body).to.have.property(prop));

                            done();
                        });
                });
        });

        it('should accept a new log entry with buildToken', function (done) {
            // Need to get the buildToken to start
            let shipment = 'bulk-shipment-app',
                environment = 'test6';

            request(server)
                .get(`/v1/shipment/${shipment}/environment/${environment}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let message = {
                        shipment: shipment,
                        environment: environment,
                        hidden: false,
                        user: 'trigger',
                        updated: (new Date()).getTime(),
                        buildToken: res.body.buildToken,
                        diff: "Message"
                    };


                    request(server)
                        .post('/v1/logs')
                        .send(message)
                        .expect('Content-Type', /json/)
                        .expect(201, (err, res) => {
                            if (err) {
                                return done(err);
                            }

                            let body = res.body,
                                props = ['diff', 'id', 'shipment', 'environment', 'hidden', 'user', 'name', 'timestamp'];

                            props.forEach(prop => expect(body).to.have.property(prop));

                            done();
                        });
                });
        });

        it('should not accept a new log entry without a buildToken', function (done) {
            // Need to get the buildToken to start
            let shipment = 'bulk-shipment-app',
                environment = 'test6';


                let message = {
                    shipment: shipment,
                    environment: environment,
                    hidden: false,
                    user: 'trigger',
                    updated: (new Date()).getTime(),
                    diff: "Message"
                };


                request(server)
                    .post('/v1/logs')
                    .send(message)
                    .expect('Content-Type', /json/)
                    .expect(401, (err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body.message).to.equal("Authorization failure");

                        done();
                    });
        });
    });
});
