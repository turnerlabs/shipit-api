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

describe('Shipments', function () {
    describe('Create', function () {
        before(function () {
            // drop all tables before running the first tests
            return models.sequelize.sync();
        });

        it('should create Shipment with atomic model', function (done) {
            request(server)
                .post('/v1/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testShipment)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'group'],
                        excludes = ['createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal(testShipment.name);
                    expect(data.group).to.equal(testShipment.group);

                    done();
                });
        });

        it('should error when the same Shipment is resent', function (done) {
            request(server)
                .post('/v1/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testShipment)
                .expect('Content-Type', /json/)
                .expect(409, done);
        });

        it('should fail when missing required group field', function (done) {
            let failShipment = {"name": "fail-shipment"};

            request(server)
                .post('/v1/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failShipment)
                .expect('Content-Type', /json/)
                .expect(401, done);
        });

        it('should fail when missing required name field', function (done) {
            let failShipment = {"group": "test"};

            request(server)
                .post('/v1/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failShipment)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when name has underscore', function (done) {
            let failShipment = {"group": "test", "name": "tester_foo"};

            request(server)
                .post('/v1/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failShipment)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when name starts with numbers', function (done) {
            let failShipment = {"group": "test", "name": "9999foooo"};

            request(server)
                .post('/v1/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failShipment)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail if name has space', function (done) {
            let failShipment = {"group": "test", "name": "foo oo"};

            request(server)
                .post('/v1/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failShipment)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when group is not in allowed list', function (done) {
            let failShipment = {"group": "test-group", "name": "group-fail"};

            request(server)
                .post('/v1/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failShipment)
                .expect('Content-Type', /json/)
                .expect(410, done);
        });
    });

    describe('Update', function () {
        it('should update values on the Shipment', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({"group": "test-group"})
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'group'],
                        excludes = ['createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal(testShipment.name);
                    expect(data.group).not.to.equal(testShipment.group);
                    expect(data.group).to.equal('test-group');

                    done();
                });
        });

        it('should fail to update if the Shipment is not found', function (done) {
            request(server)
                .put(`/v1/shipment/fakester-shipment`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({"group": "test-group"})
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
    });

    describe('Read', function () {
        it('should return a Shipment model', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'group', 'environments', 'envVars'],
                        excludes = ['createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name).to.equal(testShipment.name);
                    expect(data.group).to.equal('test-group');
                    expect(data.environments).to.have.lengthOf(0);
                    expect(data.envVars).to.have.lengthOf(0);

                    done();
                });
        });

        it('should return a list of shipments', function (done) {
            request(server)
                .get('/v1/shipments')
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data).to.have.lengthOf(1);

                    done();
                });
        });

        it('should return a list of shipments while authenticated', function (done) {
            request(server)
                .get('/v1/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data).to.have.lengthOf(1);

                    done();
                });
        });

        it('should error when fetching non-existent Shipment', function (done) {
            request(server)
                .get('/v1/shipment/not-real')
                .expect('Content-Type', /json/)
                .expect(404, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data.code).to.equal(404);
                    expect(data.message).to.equal('Shipment not-real not found');

                    done();
                });
        });
    });

    describe('Delete', function () {
        it('should remove the Shipment', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}`)
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

        it('should fail auth when trying to remove a missing Shipment', function (done) {
            request(server)
                .delete(`/v1/shipment/missing-shipment`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(401, done);
        });
    });
});
