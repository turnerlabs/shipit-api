/*global describe, it */

const expect = require('chai').expect,
    request = require('supertest'),
    nock = require('nock'),
    models = require('../models'),
    helpers = require('./helpers'),
    server = require('../app'),
    Promise = require('bluebird');

let testShipment = helpers.fetchMockData('atomic-shipment-req'),
    testEnvironment = helpers.fetchMockData('environment'),
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

describe('Environment', function () {
    describe('Create', function () {

        before(function () {
            models.sequelize.sync()
            return models.Shipment.create(testShipment);
        });

        it('should create Shipment Environment with atomic model', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environments`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testEnvironment)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'enableMonitoring', 'iamRole', 'buildToken'],
                        excludes = ['composite', 'shipmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('test-env');
                    expect(data.enableMonitoring).to.equal(true);
                    expect(data.iamRole).to.not.be.null;
                    expect(data.buildToken).to.not.be.null;
                    expect(data.buildToken).to.have.lengthOf(50);

                    done();
                });
        });

        it('should be able to create a EnvVar on an Environment', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({"name": "NODE_ENV", "value": "development"})
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'value', 'type'],
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId',
                            'createdAt', 'updatedAt', 'deletedAt', 'shaValue'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('NODE_ENV');
                    expect(data.value).to.equal('development');
                    expect(data.type).to.equal('basic');

                    done();
                });
        });

        it('should fail when trying to create the same Environment', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environments`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testEnvironment)
                .expect('Content-Type', /json/)
                .expect(409, done);
        });

        it('should fail if the required field is not present', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environments`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({})
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail if name contains underscore', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environments`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({name: "foo_bar"})
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail if name contains space', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environments`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({name: "foo bar"})
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail if name starts with number', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environments`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({name: "999foobar"})
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail auth if shipment is missing', function (done) {
            request(server)
                .post(`/v1/shipment/foobar/environments`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testEnvironment)
                .expect('Content-Type', /json/)
                .expect(401, done);
        });
    });

    describe('Update', function () {
        it('should update values on the Environment', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({"enableMonitoring": "false"})
                .send({"iamRole": "arn:partition:service:region:account:resource"})
                .send({"enableLoadBalancerAccessLogs": "harbor-lb-access-logs-tester"})
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'enableMonitoring', 'iamRole', 'buildToken', 'buildToken'],
                        excludes = ['composite', 'shipmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.enableMonitoring).to.equal(false);
                    expect(data.iamRole).to.equal("arn:partition:service:region:account:resource");
                    expect(data.enableLoadBalancerAccessLogs).to.equal("harbor-lb-access-logs-tester");
                    expect(data.buildToken).to.not.be.null;
                    expect(data.buildToken).to.be.lengthOf(50);

                    done();
                });
        });

        it('should fail if update on missing Environment', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/missing-env`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testEnvironment)
                .expect('Content-Type', /json/)
                .expect(404, done);
        });

        it('should have a build token that stays the same', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let first = res.body;

                    request(server)
                        .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                        .set('x-username', authUser)
                        .set('x-token', authToken)
                        .expect('Content-Type', /json/)
                        .expect(200, (err, res) => {
                            if (err) {
                                return done(err);
                            }

                            let later = res.body;

                            expect(later.buildToken).to.equal(first.buildToken);

                            done();
                        });
                });
        });

        it('should be able to roll a build token', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let content = res.body;

                    expect(content.buildToken).to.not.be.null;
                    expect(content.buildToken).to.be.lengthOf(50);

                    request(server)
                        .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/buildToken`)
                        .set('x-username', authUser)
                        .set('x-token', authToken)
                        .send({"enableMonitoring": "false"})
                        .send({"iamRole": "arn:partition:service:region:account:resource"})
                        .expect('Content-Type', /json/)
                        .expect(200, (err, res) => {
                            if (err) {
                                return done(err);
                            }

                            let data = res.body;

                            expect(data.buildToken).to.not.be.null;
                            expect(data.iamRole).to.equal("arn:partition:service:region:account:resource");
                            expect(data.buildToken).to.be.lengthOf(50);
                            expect(data.buildToken).to.not.equal(content.buildToken);

                            done();
                        });
                });
        });

        it('should have a build token that stays the same, after rolling it', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let first = res.body;

                    request(server)
                        .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                        .set('x-username', authUser)
                        .set('x-token', authToken)
                        .expect('Content-Type', /json/)
                        .expect(200, (err, res) => {
                            if (err) {
                                return done(err);
                            }

                            let later = res.body;

                            expect(later.buildToken).to.equal(first.buildToken);

                            done();
                        });
                });
        });
    });

    describe('Read', function () {
        it('should return a Shipment model', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'enableMonitoring', 'iamRole', 'parentShipment', 'envVars'],
                        excludes = ['composite', 'shipmentId', 'buildToken', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal(testEnvironment.name);
                    expect(data.parentShipment.group).to.equal(testShipment.group);
                    expect(data.parentShipment.name).to.equal(testShipment.name);
                    expect(data.enableLoadBalancerAccessLogs).to.equal("harbor-lb-access-logs-tester");
                    expect(data.envVars).to.have.lengthOf(1);

                    done();
                });
        });

        it('should error when fetching non-existent Environment', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/not-real`)
                .expect('Content-Type', /json/)
                .expect(404, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data.code).to.equal(404);
                    expect(data.message).to.equal(`Environment 'not-real' not found for Shipment '${testShipment.name}'.`);

                    done();
                });
        });

        it('should error when fetching non-existent Shipment', function (done) {
            request(server)
                .get(`/v1/shipment/fake/environment/not-real`)
                .expect('Content-Type', /json/)
                .expect(404, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data.code).to.equal(404);
                    expect(data.message).to.equal(`Shipment 'fake' not found.`);
                    done();
                });
        });

        it('should not show a buildToken when not authenticated', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data).to.not.have.property('buildToken');

                    done();
                });
        });

        it('should show a buildToken when authenticated', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data).to.have.property('buildToken');
                    expect(data.buildToken).to.have.lengthOf(50);

                    done();
                });
        });
    });

    describe('Delete', function () {

        after(function () {
            models.sequelize.sync();

            return Promise.all([
                models.Shipment.destroy({ where: { name: testShipment.name } })
            ]);
        });

        it('should remove the Environment', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data.status).to.equal('ok');

                    done();
                });
        });
    });
});
