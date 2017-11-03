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

describe('Annotation', function () {
    describe('Create', function () {
        before(function () {
            models.sequelize.sync();
            models.Shipment.create(testShipment);
            testEnvironment.composite = `${testShipment.name}-${testEnvironment.name}`;
            return models.Environment.create(testEnvironment);
        });

        it('should create an annotation', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotations`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({"key": "annotation.test.key.1", "value": "this is a value"})
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body.annotations,
                        props = ['key', 'value'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    data.forEach(item => {
                        props.forEach(prop => expect(item).to.have.property(prop));
                        excludes.forEach(prop => expect(item).to.not.have.property(prop));

                        expect(item.key, 'item.key').to.equal('annotation.test.key.1');
                        expect(item.value, 'item.value').to.equal('this is a value');
                    });

                    done();
                });
        });

        it('should create annotations', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotations`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send([{"key": "annotation.test.key.1", "value": "this is one"}, {"key": "annotation.test.key.2", "value": "this is two"}])
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body.annotations,
                        props = ['key', 'value'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    data.forEach((item, idx) => {
                        props.forEach(prop => expect(item).to.have.property(prop));
                        excludes.forEach(prop => expect(item).to.not.have.property(prop));

                        if (idx === 0) {
                            expect(item.key, 'item[0].key').to.equal('annotation.test.key.1');
                            expect(item.value, 'item[0].value').to.equal('this is one');
                        }
                        else if (idx === 1) {
                            expect(item.key, 'item[1].key').to.equal('annotation.test.key.2');
                            expect(item.value, 'item[1].value').to.equal('this is two');
                        }
                    });

                    done();
                });
        });

        it('should fail if missing required fields', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotations`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send([{"key": "annotation.test.key.1"}, {"key": "annotation.test.key.2", "value": "this is two"}])
                .expect('Content-Type', /json/)
                .expect(400, done);
        });

        it('should fail if sending empty objects', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotations`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send([{}, {"key": "annotation.test.key.2", "value": "this is two"}])
                .expect('Content-Type', /json/)
                .expect(400, done);
        });
    });

    describe('Read', function () {
        it('should be able to read all annotations', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotations`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['key', 'value'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    data.forEach((item, idx) => {
                        props.forEach(prop => expect(item).to.have.property(prop));
                        excludes.forEach(prop => expect(item).to.not.have.property(prop));

                        if (idx === 0) {
                            expect(item.key, 'item[0].key').to.equal('annotation.test.key.1');
                            expect(item.value, 'item[0].value').to.equal('this is one');
                        }
                        else if (idx === 1) {
                            expect(item.key, 'item[1].key').to.equal('annotation.test.key.2');
                            expect(item.value, 'item[1].value').to.equal('this is two');
                        }
                    });

                    done();
                });
        });

        it('should be able to read one annotation', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotation/annotation.test.key.1`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['key', 'value'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.key, 'data.key').to.equal('annotation.test.key.1');
                    expect(data.value, 'data.value').to.equal('this is one');

                    done();
                });
        });

        it('should fail if there is not a annotation', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotation/annotation.test.key`)
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
    });

    describe('Update', function () {
        it('should be able to update a annotation', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotation/annotation.test.key.1`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({"key": "annotation.test.key.1", "value": "this is now one"})
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body.annotations,
                        props = ['key', 'value'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    data.forEach((item, idx) => {
                        props.forEach(prop => expect(item).to.have.property(prop));
                        excludes.forEach(prop => expect(item).to.not.have.property(prop));

                        if (idx === 0) {
                            expect(item.key, 'item[0].key').to.equal('annotation.test.key.1');
                            expect(item.value, 'item[0].value').to.equal('this is now one');
                        }
                        else if (idx === 1) {
                            expect(item.key, 'item[1].key').to.equal('annotation.test.key.2');
                            expect(item.value, 'item[1].value').to.equal('this is two');
                        }
                    });

                    done();
                });
        });

        it('should fail when updating if missing required fields', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotation/annotation.test.key.1`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({"name": "annotation.test.key.1"})
                .expect('Content-Type', /json/)
                .expect(400, done);
        });
    });

    describe('Delete', function () {
        after(function () {
            models.sequelize.sync();

            return Promise.all([
                models.Shipment.destroy({ where: { name: testShipment.name } }),
                models.Environment.destroy({ where: { composite: `${testShipment.name}-${testEnvironment.name}` } })
            ]);
        });

        it('should be able to delete a annotation', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/annotation/annotation.test.key.1`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body.annotations,
                        props = ['key', 'value'],
                        excludes = ['composite', 'environmentId', 'createdAt', 'updatedAt', 'deletedAt'];

                    data.forEach(item => {
                        props.forEach(prop => expect(item).to.have.property(prop));
                        excludes.forEach(prop => expect(item).to.not.have.property(prop));

                        expect(item.key, 'item.key').to.equal('annotation.test.key.2');
                        expect(item.value, 'item.value').to.equal('this is two');
                    });

                    done();
                });
        });
    });
});
