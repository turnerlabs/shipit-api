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
    testProvider = helpers.fetchMockData('provider'),
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

describe('Provider', function () {
    describe('Create', function () {
        before(function () {
            models.sequelize.sync();
            models.Shipment.create(testShipment);
            // Need id
            testEnvironment.composite = `${testShipment.name}-${testEnvironment.name}`;
            models.Environment.create(testEnvironment);
        });

        it('should create Shipment Provider with atomic model', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/providers`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testProvider)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'replicas', 'barge'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('ec2');
                    expect(data.replicas).to.equal(100);
                    expect(data.barge).to.equal('tester');

                    done();
                });
        });

        it('should be able to create a EnvVar on a Provider', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}/envVars`)
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
                            'createdAt', 'updatedAt', 'deletedAt', 'sha_value'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('PORTX');
                    expect(data.value).to.equal('8080');
                    expect(data.type).to.equal('basic');

                    done();
                });
        });

        it('should fail when creating the same Provider', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/providers`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testProvider)
                .expect('Content-Type', /json/)
                .expect(409, done);
        });

        it('should fail when creating the same EnvVar', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}/envVars`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(envVar)
                .expect('Content-Type', /json/)
                .expect(409, done);
        });
    });

    describe('Update', function () {
        it('should be able to update the values on a Provider', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({replicas: 10})
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'replicas', 'barge'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('ec2');
                    expect(data.replicas).to.equal(10);
                    expect(data.barge).to.equal('tester');

                    done();
                });
        });
        it('should be able to update the values on a EnvVar on a Provider', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}/envVar/${envVar.name}`)
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
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId',
                            'createdAt', 'updatedAt', 'deletedAt', 'sha_value'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.value).to.equal('8888');

                    done();
                });
        });
        it('should fail to update a non-existent Provider', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/fake`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({replicas: 10})
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
        it('should fail to update a non-existent EnvVar', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}/envVar/FAKER`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({value: '8888'})
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
    });

    describe('Read', function () {
        it('should be able to read the Provider on a Shipment', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'replicas', 'barge'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    data.providers.forEach(provider => {
                        props.forEach(prop => expect(provider).to.have.property(prop));
                        excludes.forEach(prop => expect(provider).to.not.have.property(prop));
                    });

                    expect(data.providers).to.have.lengthOf(1);
                    expect(data.providers[0].name).to.equal('ec2');

                    done();
                });
        });
        it('should be able to read the values on a Provider', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'replicas', 'barge'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('ec2');
                    expect(data.replicas).to.equal(10);
                    expect(data.barge).to.equal('tester');

                    done();
                });
        });
        it('should be able to read a EnvVar of a Provider', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}/envVar/${envVar.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'value', 'type'],
                        excludes = ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId',
                            'createdAt', 'updatedAt', 'deletedAt', 'sha_value'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal('PORTX');
                    expect(data.value).to.equal('8888');
                    expect(data.type).to.equal('basic');

                    done();
                });
        });
        it('should fail to read a non-existent Provider', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/fake`)
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
        it('should be able to delete a Provider', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}`)
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
        it('should not be able to see a EnvVar on a deleted Provider', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}/envVar/${envVar.name}`)
                .expect('Content-Type', /json/)
                .expect(404, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('should fail to delete a non-existent Provider', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/provider/${testProvider.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
    });
});
