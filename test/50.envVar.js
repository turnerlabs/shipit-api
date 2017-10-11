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

describe('EnvVar', function () {
    describe('Create', function () {

        before(function () {
            models.sequelize.sync();

            return models.Shipment.create(testShipment);
        });

        it('should create Shipment EnvVar with atomic model', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(envVar)
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

                    expect(data.name).to.equal('PORTX');
                    expect(data.value).to.equal('8080');
                    expect(data.type).to.equal('basic');

                    done();
                });
        });

        it('should be able to create a hidden EnvVar', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({name: 'MY_SECRET', value: 'private', type: 'hidden'})
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

                    expect(data.name).to.equal('MY_SECRET');
                    expect(data.value).to.equal('private');
                    expect(data.type).to.equal('hidden');

                    done();
                });
        });

        it('should fail when missing required fields', function (done) {
            let failVar = {"name": "FAILURE"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when sending an invalid type', function (done) {
            let failVar = envVar;

            failVar.type = 'wrong';

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when name has a dash', function (done) {
            let failVar = {name: "FAIL-1", value: "foobar"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when name has a - at end', function (done) {
            let failVar = {name: "FAIL1-", value: "foobar"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when name has a - at beginning', function (done) {
            let failVar = {name: "-FAIL1", value: "foobar"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail with multiple spaces', function (done) {
            let failVar = {name: "FAIL---1", value: "foobar"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when name has a space', function (done) {
            let failVar = {name: "FAIL 1", value: "foobar"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when name has a space at beginning', function (done) {
            let failVar = {name: " FAIL1", value: "foobar"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when name has a space at end', function (done) {
            let failVar = {name: "FAIL1 ", value: "foobar"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail with multiple spaces', function (done) {
            let failVar = {name: "FAIL    1", value: "foobar"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail numbers at beginning', function (done) {
            let failVar = {name: "888FAIL1", value: "foobar"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail with empty value', function (done) {
            let failVar = {name: "TEST", value: ""};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail with empty values', function (done) {
            let failVar = {name: "TEST", value: "   "};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });
    });

    describe('Update', function () {
        it('should update values on the Shipment EnvVar', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/envVar/${envVar.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({"value": '8081'})
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'value', 'type'],
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId',
                            'createdAt', 'updatedAt', 'deletedAt', 'shaValue'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.value).to.equal('8081');

                    done();
                });
        });
        it('should fail when being updated to the wrong type', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/envVar/${envVar.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({"type": '8081'})
                .expect('Content-Type', /json/)
                .expect(422, done);
        });
    });

    describe('Read', function () {
        it('should return a Shipment EnvVar model', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/envVar/${envVar.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'value', 'type'],
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId',
                            'createdAt', 'updatedAt', 'deletedAt', 'shaValue'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('PORTX');
                    expect(data.value).to.equal('8081');
                    expect(data.type).to.equal('basic');

                    done();
                });
        });

        it('should error when fetching non-existent EnvVar', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/envVar/not-real`)
                .expect('Content-Type', /json/)
                .expect(404, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data.code).to.equal(404);
                    expect(data.message).to.equal(`EnvVar 'not-real' not found for Query: '${testShipment.name}-not-real'.`);
                    done();
                });
        });

        it('should not show the value of hidden EnvVar when not authorized', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/envVar/MY_SECRET`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'value', 'type'],
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId',
                            'createdAt', 'updatedAt', 'deletedAt', 'shaValue'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('MY_SECRET');
                    expect(data.value).to.equal('*******');
                    expect(data.type).to.equal('hidden');

                    done();
                });
        });

        it('should show the value of hidden EnvVar when authorized', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/envVar/MY_SECRET`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'value', 'type'],
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId',
                            'createdAt', 'updatedAt', 'deletedAt', 'shaValue'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('MY_SECRET');
                    expect(data.value).to.equal('private');
                    expect(data.type).to.equal('hidden');

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

        it('should fail when trying to remove an EnvVar does not exist', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/envVar/${envVar.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should remove the Shipment EnvVar', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/envVar/${envVar.name}`)
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
