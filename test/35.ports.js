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
    minimumPort = helpers.fetchMockData('port-minimum'),
    maximumPort = helpers.fetchMockData('port'),
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

describe('Port', function () {
    describe('Create', function () {
        before(function (done) {
            models.sequelize.sync();
            models.Shipment.create(testShipment);
            testEnvironment.composite = `${testShipment.name}-${testEnvironment.name}`;
            models.Environment.create(testEnvironment);

            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/containers`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(testContainer)
                .expect('Content-Type', /json/)
                .expect(201, done);
        });

        it('should create Shipment Port with minimum atomic model', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/ports`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(minimumPort)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = [ 'name', 'healthcheck', 'external', 'primary', 'public_vip', 'public_port', 'enable_proxy_protocol',
                            'ssl_management_type', 'ssl_arn', 'private_key', 'public_key_certificate', 'certificate_chain',
                            'healthcheck_timeout' ],
                        excludes = ['composite', 'containerId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name, 'data.name').to.equal('PORT_MIN');
                    expect(data.value, 'data.value').to.equal(5000);
                    expect(data.healthcheck, 'data.healthcheck').to.equal('');
                    expect(data.external, 'data.external').to.be.true;
                    expect(data.primary, 'data.primary').to.be.true;
                    expect(data.public_vip, 'data.public_vip').to.be.false;
                    expect(data.public_port, 'data.public_port').to.equal(5000);
                    expect(data.enable_proxy_protocol, 'data.enable_proxy_protocol').to.be.false;
                    expect(data.ssl_management_type, 'data.ssl_management_type').to.be.a('string');
                    expect(data.ssl_arn, 'data.ssl_arn').to.be.a('string');
                    expect(data.private_key, 'data.private_key').to.be.a('string');
                    expect(data.public_key_certificate, 'data.public_key_certificate').to.be.a('string');
                    expect(data.certificate_chain, 'data.certificate_chain').to.be.a('string');
                    expect(data.healthcheck_timeout, 'data.healthcheck_timeout').to.equal(1);

                    done();
                });
        });

        it('should fail when trying to create the same container again', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/ports`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(minimumPort)
                .expect('Content-Type', /json/)
                .expect(409, done);
        });

        it('should create Shipment Port with maximum atomic model', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/ports`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(maximumPort)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = [ 'name', 'healthcheck', 'external', 'primary', 'public_vip', 'public_port', 'enable_proxy_protocol',
                            'ssl_management_type', 'ssl_arn', 'private_key', 'public_key_certificate', 'certificate_chain',
                            'healthcheck_timeout' ],
                        excludes = ['composite', 'containerId', 'createdAt', 'updatedAt', 'deletedAt'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name, 'data.name').to.equal('PORT');
                    expect(data.value, 'data.value').to.equal(17290);
                    expect(data.healthcheck, 'data.healthcheck').to.equal('/_');
                    expect(data.external, 'data.external').to.be.true;
                    expect(data.primary, 'data.primary').to.be.true;
                    expect(data.public_vip, 'data.public_vip').to.be.false;
                    expect(data.public_port, 'data.public_port').to.equal(80);
                    expect(data.enable_proxy_protocol, 'data.enable_proxy_protocol').to.be.false;
                    expect(data.ssl_management_type, 'data.ssl_management_type').to.equal('acm');
                    expect(data.ssl_arn, 'data.ssl_arn').to.equal('foo');
                    expect(data.private_key, 'data.private_key').to.be.a('string');
                    expect(data.public_key_certificate, 'data.public_key_certificate').to.be.a('string');
                    expect(data.certificate_chain, 'data.certificate_chain').to.be.a('string');
                    expect(data.healthcheck_timeout, 'data.healthcheck_timeout').to.equal(5);

                    done();
                });
        });

        it('should fail to create when name is not uppercase', function (done) {
            let port = {
                    name: "primary_1",
                    value: 5000
                };

            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/ports`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(port)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail if a dash is in the name', function (done) {
            let port = {
                    name: "PORT-1",
                    value: 5000
                };

            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/ports`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(port)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when trying to create the same container again', function (done) {
            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/ports`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(maximumPort)
                .expect('Content-Type', /json/)
                .expect(409, done);
        });

        it('should fail to create a Port that is missing required fields', function (done) {
            let failPort = {name: "PORT_FAIL"};

            request(server)
                .post(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/ports`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(failPort)
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

    });

    describe('Read', function () {
        it('should be able to read the Port on a Shipment', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = [ 'name', 'healthcheck', 'external', 'primary', 'public_vip', 'public_port',
                            'enable_proxy_protocol', 'healthcheck_timeout', 'ssl_management_type', 'ssl_arn' ],
                        excludes = ['composite', 'containerId', 'private_key', 'public_key_certificate',
                            'certificate_chain' ];

                    expect(data.containers, 'data.containers').to.have.lengthOf(1);
                    expect(data.containers[0], 'data.containers[0]').to.be.instanceOf(Object);
                    expect(data.containers[0].ports, 'data.containers[0].ports').to.be.instanceOf(Array);
                    expect(data.containers[0].ports, 'data.containers[0].ports').to.have.lengthOf(2);

                    data.containers.forEach(container => {
                        container.ports.forEach(port => {

                            props.forEach(prop => expect(port).to.have.property(prop));
                            excludes.forEach(prop => expect(port).to.not.have.property(prop));

                            switch (port.name) {
                                case 'PORT':
                                    expect(port.value, 'port.value').to.equal(17290);
                                    break;

                                case 'PORT_MIN':
                                    expect(port.value, 'port.value').to.equal(5000);
                                    break;
                            }
                        });
                    });

                    done();
                });
        });
        it('should be able to read the values on a Port', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/port/${minimumPort.name}`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = [ 'name', 'healthcheck', 'external', 'primary', 'public_vip', 'public_port',
                            'enable_proxy_protocol', 'healthcheck_timeout', 'ssl_management_type', 'ssl_arn' ],
                        excludes = ['composite', 'containerId', 'private_key',
                            'public_key_certificate', 'certificate_chain'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name, 'data.name').to.equal('PORT_MIN');
                    expect(data.value, 'data.value').to.equal(5000);
                    expect(data.healthcheck, 'data.healthcheck').to.equal('');
                    expect(data.external, 'data.external').to.be.true;
                    expect(data.primary, 'data.primary').to.be.true;
                    expect(data.public_vip, 'data.public_vip').to.be.false;
                    expect(data.public_port, 'data.public_port').to.equal(5000);
                    expect(data.enable_proxy_protocol, 'data.enable_proxy_protocol').to.be.false;
                    expect(data.healthcheck_timeout, 'data.healthcheck_timeout').to.equal(1);
                    expect(data.ssl_arn, 'data.ssl_arn').to.equal('');
                    expect(data.ssl_management_type, 'data.ssl_management_type').to.equal('iam');

                    done();
                });
        });
        it('should be able to read all fields on a Port when authenticated', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/port/${minimumPort.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = [ 'name', 'healthcheck', 'external', 'primary', 'public_vip', 'public_port',
                            'enable_proxy_protocol', 'healthcheck_timeout', 'ssl_management_type', 'ssl_arn', 'private_key',
                                'public_key_certificate', 'certificate_chain' ],
                        excludes = ['composite', 'containerId'];

                    props.forEach(prop => expect(data).to.have.property(prop));
                    excludes.forEach(prop => expect(data).to.not.have.property(prop));

                    expect(data.name, 'data.name').to.equal('PORT_MIN');
                    expect(data.value, 'data.value').to.equal(5000);
                    expect(data.healthcheck, 'data.healthcheck').to.equal('');
                    expect(data.external, 'data.external').to.be.true;
                    expect(data.primary, 'data.primary').to.be.true;
                    expect(data.public_vip, 'data.public_vip').to.be.false;
                    expect(data.public_port, 'data.public_port').to.equal(5000);
                    expect(data.enable_proxy_protocol, 'data.enable_proxy_protocol').to.be.false;
                    expect(data.healthcheck_timeout, 'data.healthcheck_timeout').to.equal(1);

                    done();
                });
        });
        it('should fail to read a non-existant Port', function (done) {
            request(server)
                .get(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/port/NOT_REAL`)
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
    });

    describe('Update', function () {
        it('should be able to update the values on a Port', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/port/${minimumPort.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({value: 7000})
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body,
                        props = ['name', 'value'];

                    props.forEach(prop => expect(data).to.have.property(prop));

                    expect(data.name, 'data.name').to.equal('PORT_MIN');
                    expect(data.value, 'data.value').to.equal(7000);

                    done();
                });
        });
        it('should fail to update a non-existant Port', function (done) {
            request(server)
                .put(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/port/PORT_FAIL`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send({value: 7000})
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
                models.Container.destroy({ where: { name: testContainer.name } }),
                models.Environment.destroy({ where: { name: testEnvironment.name } }),
                models.Shipment.destroy({ where: { name: testShipment.name } })
            ]);
        });

        it('should be able to delete a Port', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/port/${minimumPort.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data.status, 'data.status').to.equal('ok');

                    done();
                });
        });

        it('should be able to delete a Port (again)', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/port/${maximumPort.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let data = res.body;

                    expect(data.status, 'data.status').to.equal('ok');

                    done();
                });
        });

        it('should fail to delete a non-existant Port', function (done) {
            request(server)
                .delete(`/v1/shipment/${testShipment.name}/environment/${testEnvironment.name}/container/${testContainer.name}/port/PORT_FAIL`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
    });
});
