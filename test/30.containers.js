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
    testContainer = helpers.fetchMockData('container'),
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

describe('Container', function () {
    describe('Create', function () {
        before(function () {
            models.sequelize.sync();
            models.Shipment.create(testShipment);
            testEnvironment.composite = `${testShipment.name}-${testEnvironment.name}`;
            return models.Environment.create(testEnvironment);
        });

        it('should create Shipment Container with atomic model', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/containers`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testContainer)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'image'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('mss-hello-world');
                    expect(data.image).to.equal('registry.services.dmtio.net/mss-hello-world:0.1.0');

                    done();
                });
        });

        it('should fail when trying to create the same container again', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/containers`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testContainer)
                .expect('Content-Type', /json/)
                .expect(409, done);
        });

        it('should fail when missing require fields', function (done) {
            let failContainer = {"name": "missing-image"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/containers`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failContainer)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should be able to create a EnvVar on a Container', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/envVars`)
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
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId', 'createdAt', 'updatedAt', 'deletedAt', 'shaValue'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('PORTX');
                    expect(data.value).to.equal('8080');
                    expect(data.type).to.equal('basic');

                    done();
                });
        });

        it('should fail to create a EnvVar that already exists', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(envVar)
                .expect('Content-Type', /json/)
                .expect(409, done);
        });

        it('should fail to create a EnvVar when the EnvVar is missing required fields', function (done) {
            let failEnvVar = {"name": "FAIL"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failEnvVar)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });
    });

    describe('Read', function () {
        it('should be able to read the Container on a Shipment', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'image'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    data.containers.forEach(container => {
                        props.forEach(prop => expect(container).to.have.property(prop));
                        excludes.forEach(prop => expect(container).to.not.have.property(prop));
                    });

                    expect(data.containers).to.have.lengthOf(1);
                    expect(data.containers[0].name).to.equal('mss-hello-world');

                    done();
                });
        });
        it('should be able to read the values on a Container', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'image'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('mss-hello-world');
                    expect(data.image).to.equal('registry.services.dmtio.net/mss-hello-world:0.1.0');

                    done();
                });
        });
        it('should be able to read a EnvVar of a Container', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/envVar/${envVar.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'value', 'type'],
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId', 'createdAt', 'updatedAt', 'deletedAt', 'shaValue'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('PORTX');
                    expect(data.value).to.equal('8080');
                    expect(data.type).to.equal('basic');

                    done();
                });
        });
    });

    describe('Update', function () {
        it('should be able to update the values on a Container', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({image: 'registry.services.dmtio.net/mss-hello-world:0.2.0'})
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'image'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('mss-hello-world');
                    expect(data.image).to.equal('registry.services.dmtio.net/mss-hello-world:0.2.0');

                    done();
                });
        });
        it('should be able to update the values on a EnvVar on a Container', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/envVar/${envVar.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({value: '8888'})
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'value', 'type'],
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId', 'createdAt', 'updatedAt', 'deletedAt', 'shaValue'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.value).to.equal('8888');

                    done();
                });
        });
        it('should fail to update a Container that does not exist', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/fake`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({image: 'registry.services.dmtio.net/mss-hello-world:0.2.0'})
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
        it('should fail to update a EnvVar on a Container that does not exist', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/envVar/fake`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({value: 8888})
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
    });

    describe('Delete', function () {
        after(function () {
            models.sequelize.sync();

            return Promise.all([
                /* TODO
                 * Fix deletes so that sub-classes (e.g., env vars) are deleted when parent is deleted
                 */
                models.EnvVar.destroy({ where: { name: envVar.name } }),
                models.Environment.destroy({ where: { name: testEnvironment.name } }),
                models.Shipment.destroy({ where: { name: testShipment.name } })
            ]);
        });

        it('should be able to delete a Container', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}`)
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
        it('should not be able to see a EnvVar on a deleted Container', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/envVar/${envVar.name}`)
                .expect('Content-Type', /json/)
                .expect(404, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('should fail to delete a Container that does not exist', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/fake`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
    });
});
