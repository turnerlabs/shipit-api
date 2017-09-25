/*global describe, it */

const expect = require('chai').expect,
    request = require('supertest'),
    nock = require('nock'),
    models = require('../models'),
    helpers = require('./helpers'),
    server = require('../app'),
    compare = require('./value_equals').compare;

let authUser = 'test_user',
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

describe('Bulk', function () {
    describe('Create', function () {
        it('should create with full model', function (done) {
            let data = helpers.fetchMockData('bulk_shipment');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body,
                        result;

                    let props = {
                            environment: ['name', 'enableMonitoring', 'buildToken', 'envVars', 'containers', 'providers'],
                            parentShipment: ['name', 'group', 'contact_email', 'envVars'],
                            container: ['name', 'image', 'envVars', 'ports'],
                            provider: ['name', 'replicas', 'barge', 'envVars'],
                            port: ['name', 'healthcheck', 'external', 'primary', 'public_vip', 'enable_proxy_protocol', 'healthcheck_timeout', 'healthcheck_interval'],
                            envVar: ['name', 'value', 'type']
                        },
                        excludes = {
                            environment: ['composite', 'shipmentId'],
                            parentShipment: ['composite'],
                            container: ['composite', 'environmentId'],
                            provider: ['composite', 'environmentId'],
                            port: ['composite', 'containerId'],
                            envVars: ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId']
                        };

                    props.environment.forEach(prop => expect(body, 'body').to.have.property(prop));
                    excludes.environment.forEach(prop => expect(body, 'body').to.not.have.property(prop));
                    props.parentShipment.forEach(prop => expect(body.parentShipment, 'body.parentShipment').to.have.property(prop));
                    excludes.parentShipment.forEach(prop => expect(body.parentShipment, 'body.parentShipment').to.not.have.property(prop));
                    body.providers.forEach(provider => {
                        props.provider.forEach(prop => expect(provider, 'provider').to.have.property(prop));
                        excludes.provider.forEach(prop => expect(provider, 'provider').to.not.have.property(prop));
                    });
                    body.containers.forEach(container => {
                        props.container.forEach(prop => expect(container, 'container').to.have.property(prop));
                        excludes.container.forEach(prop => expect(container, 'container').to.not.have.property(prop));

                        container.ports.forEach(port => {
                            props.port.forEach(prop => expect(port, 'port').to.have.property(prop));
                            excludes.port.forEach(prop => expect(port, 'port').to.not.have.property(prop));
                        });
                    });

                    result = compare(data.envVars, body.envVars);
                    expect(result, 'result').to.be.true;

                    result = compare(data.providers, body.providers);
                    expect(result, 'result').to.be.true;

                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);

                    result = compare(data.parentShipment.envVars, body.parentShipment.envVars);
                    expect(result, 'result').to.be.true;

                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(50);

                    // Containers are tough, since Ports will likely not match
                    data.containers.forEach((container, i) => {
                        let bodyContainer = body.containers[i];

                        result = compare(container.envVars, body.containers[i].envVars);
                        expect(result, 'result').to.be.true;
                        expect(bodyContainer.name, 'bodyContainer.name').to.equal(container.name);
                        expect(bodyContainer.image, 'bodyContainer.image').to.equal(container.image);

                        // Ports
                        container.ports.forEach((port, j) => {
                            let bodyPort = bodyContainer.ports[j];

                            expect(bodyPort.name, 'bodyPort.name').to.equal(port.name);
                            expect(bodyPort.value, 'bodyPort.value').to.equal(port.value);
                        });
                    });
                    //*/

                    done();
                });
        });

        it('should create a Shipment with just an Environment', function (done) {
            let data = helpers.fetchMockData('bulk/0.shipment_env');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.name, 'body.name').to.equal(data.name);
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal(data.parentShipment.group);
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal(data.parentShipment.contact_email);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(50);

                    done();
                });
        });

        it('should create a Shipment with a Provider', function (done) {
            let data = helpers.fetchMockData('bulk/1.shipment_provider');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.name, 'body.name').to.equal(data.name);
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal(data.parentShipment.group);
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal(data.parentShipment.contact_email);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(compare(body.providers, data.providers), 'compare(body.providers, data.providers)').to.be.true;
                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(50);

                    done();
                });
        });

        it('should create a Shipment with two Providers', function (done) {
            let data = helpers.fetchMockData('bulk/2.shipment_2providers');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.name, 'body.name').to.equal(data.name);
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal(data.parentShipment.group);
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal(data.parentShipment.contact_email);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(compare(body.providers, data.providers), 'compare(body.providers, data.providers)').to.be.true;
                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(50);

                    done();
                });
        });

        it('should create a Shipment with a Provider and a Container', function (done) {
            let data = helpers.fetchMockData('bulk/3.shipment_provider_container');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.name, 'body.name').to.equal(data.name);
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal(data.parentShipment.group);
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal(data.parentShipment.contact_email);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(compare(body.providers, data.providers), 'compare(body.providers, data.providers)').to.be.true;
                    expect(compare(body.containers, data.containers), 'compare(body.containers, data.containers)').to.be.true;
                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(50);

                    done();
                });
        });

        it('should create a Shipment with two Containers', function (done) {
            let data = helpers.fetchMockData('bulk/4.shipment_2containers');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.name, 'body.name').to.equal(data.name);
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal(data.parentShipment.group);
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal(data.parentShipment.contact_email);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(compare(body.providers, data.providers), 'compare(body.providers, data.providers)').to.be.true;
                    expect(compare(body.containers, data.containers), 'compare(body.containers, data.containers)').to.be.true;
                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(50);

                    done();
                });
        });

        it('should create a Shipment with a Container with two Ports', function (done) {
            let data = helpers.fetchMockData('bulk/5.shipment_container_2ports');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.name, 'body.name').to.equal(data.name);
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal(data.parentShipment.group);
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal(data.parentShipment.contact_email);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(50);

                    // Containers are tough, since Ports will likely not match
                    data.containers.forEach((container, i) => {
                        let bodyContainer = body.containers[i];

                        result = compare(container.envVars, body.containers[i].envVars);
                        expect(result, 'result').to.be.true;
                        expect(bodyContainer.name, 'bodyContainer.name').to.equal(container.name);
                        expect(bodyContainer.image, 'bodyContainer.image').to.equal(container.image);

                        // Ports
                        container.ports.forEach((port, j) => {
                            let bodyPort = bodyContainer.ports[j];

                            expect(bodyPort.name, 'bodyPort.name').to.equal(port.name);
                            expect(bodyPort.value, 'bodyPort.value').to.equal(port.value);
                        });
                    });

                    done();
                });
        });

        it('should create a Shipment with two Providers and two Containers each with two Ports', function (done) {
            let data = helpers.fetchMockData('bulk/6.shipment_2providers_2containers_3ports');
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.name, 'body.name').to.equal(data.name);
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal(data.parentShipment.group);
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal(data.parentShipment.contact_email);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(compare(body.providers, data.providers), 'compare(body.providers, data.providers)').to.be.true;
                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(50);

                    // Containers are tough, since Ports will likely not match
                    data.containers.forEach((container, i) => {
                        let bodyContainer = body.containers[i];

                        result = compare(container.envVars, body.containers[i].envVars);
                        expect(result, 'result').to.be.true;
                        expect(bodyContainer.name, 'bodyContainer.name').to.equal(container.name);
                        expect(bodyContainer.image, 'bodyContainer.image').to.equal(container.image);

                        // Ports
                        container.ports.forEach((port, j) => {
                            let bodyPort = bodyContainer.ports[j];

                            expect(bodyPort.name, 'bodyPort.name').to.equal(port.name);
                            expect(bodyPort.value, 'bodyPort.value').to.equal(port.value);
                        });
                    });

                    done();
                });
        });

        it('should fail when creating Shipment Environment if missing required fields', function (done) {
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(helpers.fetchMockData('bulk/10.shipment_env.failure'))
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when creating Shipment Provider if missing required fields', function (done) {
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(helpers.fetchMockData('bulk/11.shipment_provider.failure'))
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when creating Shipment Two Providers if missing required fields', function (done) {
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(helpers.fetchMockData('bulk/21.shipment_2providers.failure'))
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when creating Shipment Provider Container if missing required fields', function (done) {
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(helpers.fetchMockData('bulk/31.shipment_provider_container.failure'))
                .expect('Content-Type', /json/)
                .expect(422, (err, res) => {
                    if (err) return done(err);

                    done();
                });
        });

        it('should fail when creating Shipment Two Containers if missing required fields', function (done) {
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(helpers.fetchMockData('bulk/41.shipment_2containers.failure'))
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when creating Shipment Container Two Ports if missing required fields', function (done) {
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(helpers.fetchMockData('bulk/51.shipment_container_2ports.failure'))
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when creating Shipment Two Providers Two Containers Three Ports if missing required fields', function (done) {
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(helpers.fetchMockData('bulk/61.shipment_2providers_2containers_3ports.failure'))
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail when creating Shipment Provider Two Containers Two Ports if missing required fields', function (done) {
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(helpers.fetchMockData('bulk/71.shipment_provider_2containers_2ports.failure'))
                .expect('Content-Type', /json/)
                .expect(422, done);
        });

        it('should fail to create a Shipment based on a validation error, and it really should not be created', function (done) {
            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(helpers.fetchMockData('bulk/81.shipment_env.failure'))
                .expect('Content-Type', /json/)
                .expect(422, (err, res) => {
                    request(server)
                        .get('/v1/shipment/tester-test/environment/dev')
                        .expect('Content-Type', /json/)
                        .expect(404, done);
                });
        })
    });

    describe('Update', function () {
        it('should update a Shipment with all the changes', function (done) {
            let data = helpers.fetchMockData('bulk/7.shipment_provider_2containers_2ports');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.name, 'body.name').to.equal(data.name);
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal(data.parentShipment.group);
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal(data.parentShipment.contact_email);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(5);
                    expect(body.buildToken, 'body.buildToken').to.equal(data.buildToken);

                    done();
                });
        });

        it('should update a Shipment will all changes, including removals', function (done) {
            let data = helpers.fetchMockData('bulk/8.shipment_env');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        console.log('err?', err);
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.name, 'body.name').to.equal(data.name);
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal(data.parentShipment.name);
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal(data.parentShipment.group);
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal(data.parentShipment.contact_email);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(body.buildToken, 'body.buildToken').to.not.be.null;
                    expect(body.buildToken, 'body.buildToken').to.have.lengthOf(5);

                    done();
                });
        });
    });

    describe('Read', function () {
        it('should return a merged and sorted list of Shipments', function (done) {
            request(server)
                .get('/v1/shipments')
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    res.body.forEach(shipment => {
                        shipment.environments.forEach(env => {
                            expect(env, 'env').to.be.a('string');
                        });
                    });

                    done();
                });
        });

        it('should show values on the Shipment correctly while not authorized', function (done) {
            request(server)
                .get('/v1/shipment/bulk-shipment-app/environment/test6')
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;
                        props = {
                            environment: ['name', 'enableMonitoring', 'envVars', 'containers', 'providers'],
                            parentShipment: ['name', 'group', 'contact_email', 'envVars'],
                            container: ['name', 'image', 'envVars', 'ports'],
                            provider: ['name', 'replicas', 'barge', 'envVars'],
                            port: ['name', 'healthcheck', 'external', 'primary', 'public_vip', 'enable_proxy_protocol',
                                'healthcheck_timeout', 'healthcheck_interval', 'ssl_management_type', 'ssl_arn'],
                            envVar: ['name', 'value', 'type']
                        },
                        excludes = {
                            environment: ['composite', 'shipmentId', 'buildToken'],
                            parentShipment: ['composite'],
                            container: ['composite', 'environmentId'],
                            provider: ['composite', 'environmentId'],
                            port: ['composite', 'containerId', 'private_key',
                                'public_key_certificate', 'certificate_chain' ],
                            envVars: ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId']
                        };

                    props.environment.forEach(prop => expect(body, 'body').to.have.property(prop));
                    excludes.environment.forEach(prop => expect(body, 'body').to.not.have.property(prop));
                    props.parentShipment.forEach(prop => expect(body.parentShipment, 'body.parentShipment').to.have.property(prop));
                    excludes.parentShipment.forEach(prop => expect(body.parentShipment, 'body.parentShipment').to.not.have.property(prop));
                    body.providers.forEach(provider => {
                        props.provider.forEach(prop => expect(provider, 'provider').to.have.property(prop));
                        excludes.provider.forEach(prop => expect(provider, 'provider').to.not.have.property(prop));
                    });
                    body.containers.forEach(container => {
                        props.container.forEach(prop => expect(container, 'container').to.have.property(prop));
                        excludes.container.forEach(prop => expect(container, 'container').to.not.have.property(prop));

                        container.ports.forEach(port => {
                            props.port.forEach(prop => expect(port, 'port').to.have.property(prop));
                            excludes.port.forEach(prop => expect(port, 'port').to.not.have.property(prop));
                        });
                    });

                    body.envVars.forEach(envVar => {
                        if (envVar.type === 'hidden') {
                            expect(envVar.value, 'envVar.value').to.equal('*******');
                        }
                    });
                    body.parentShipment.envVars.forEach(envVar => {
                        if (envVar.type === 'hidden') {
                            expect(envVar.value, 'envVar.value').to.equal('*******');
                        }
                    });
                    body.containers.forEach(container => {
                        container.envVars.forEach(envVar => {
                            if (envVar.type === 'hidden') {
                                expect(envVar.value, 'envVar.value').to.equal('*******');
                            }
                        });
                    });
                    body.providers.forEach(provider => {
                        provider.envVars.forEach(envVar => {
                            if (envVar.type === 'hidden') {
                                expect(envVar.value, 'envVar.value').to.equal('*******');
                            }
                        });
                    });

                    done();
                });
        });

        it('should show values on the Shipment correctly while authorized', function (done) {
            request(server)
                .get('/v1/shipment/bulk-shipment-app/environment/test6')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;
                        props = {
                            environment: ['name', 'enableMonitoring', 'buildToken', 'envVars', 'containers', 'providers'],
                            parentShipment: ['name', 'group', 'contact_email', 'envVars'],
                            container: ['name', 'image', 'envVars', 'ports'],
                            provider: ['name', 'replicas', 'barge', 'envVars'],
                            port: ['name', 'healthcheck', 'external', 'primary', 'public_vip', 'enable_proxy_protocol',
                                'ssl_management_type', 'ssl_arn', 'private_key', 'public_key_certificate',
                                'certificate_chain', 'healthcheck_timeout', 'healthcheck_interval'],
                            envVar: ['name', 'value', 'type']
                        },
                        excludes = {
                            environment: ['composite', 'shipmentId'],
                            parentShipment: ['composite'],
                            container: ['composite', 'environmentId'],
                            provider: ['composite', 'environmentId'],
                            port: ['composite', 'containerId'],
                            envVars: ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId']
                        };

                    props.environment.forEach(prop => expect(body, 'body').to.have.property(prop));
                    excludes.environment.forEach(prop => expect(body, 'body').to.not.have.property(prop));
                    props.parentShipment.forEach(prop => expect(body.parentShipment, 'body.parentShipment').to.have.property(prop));
                    excludes.parentShipment.forEach(prop => expect(body.parentShipment, 'body.parentShipment').to.not.have.property(prop));
                    body.providers.forEach(provider => {
                        props.provider.forEach(prop => expect(provider, 'provider').to.have.property(prop));
                        excludes.provider.forEach(prop => expect(provider, 'provider').to.not.have.property(prop));
                    });
                    body.containers.forEach(container => {
                        props.container.forEach(prop => expect(container, 'container').to.have.property(prop));
                        excludes.container.forEach(prop => expect(container, 'container').to.not.have.property(prop));

                        container.ports.forEach(port => {
                            props.port.forEach(prop => expect(port, 'port').to.have.property(prop));
                            excludes.port.forEach(prop => expect(port, 'port').to.not.have.property(prop));
                        });
                    });

                    body.envVars.forEach(envVar => {
                        if (envVar.type === 'hidden') {
                            expect(envVar.value, 'envVar.value').to.not.equal('*******');
                        }
                    });
                    body.parentShipment.envVars.forEach(envVar => {
                        if (envVar.type === 'hidden') {
                            expect(envVar.value, 'envVar.value').to.not.equal('*******');
                        }
                    });
                    body.containers.forEach(container => {
                        container.envVars.forEach(envVar => {
                            if (envVar.type === 'hidden') {
                                expect(envVar.value, 'envVar.value').to.not.equal('*******');
                            }
                        });
                    });
                    body.providers.forEach(provider => {
                        provider.envVars.forEach(envVar => {
                            if (envVar.type === 'hidden') {
                                expect(envVar.value, 'envVar.value').to.not.equal('*******');
                            }
                        });
                    });

                    done();
                });
        });

        it('should show values on list of Shipment Environments', function (done) {
            request(server)
                .get('/v1/shipment/bulk-shipment-app')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;
                        props = {
                            shipment: ['name', 'group', 'contact_email', 'envVars', 'environments'],
                            environment: ['name'],
                            envVar: ['name', 'value', 'type']
                        },
                        excludes = {
                            shipment: ['composite'],
                            environment: ['composite', 'shipmentId', 'enableMonitoring', 'buildToken', 'envVars', 'containers', 'providers'],
                            envVar: ['composite', 'containerId', 'environmentId', 'providerId', 'shipmentId']
                        };

                    props.shipment.forEach(prop => expect(body, 'body').to.have.property(prop));
                    excludes.shipment.forEach(prop => expect(body, 'body').to.not.have.property(prop));

                    body.envVars.forEach(envVar => {
                        props.envVar.forEach(prop => expect(envVar, 'envVar').to.have.property(prop));
                        excludes.envVar.forEach(prop => expect(envVar, 'envVar').to.not.have.property(prop));
                    });

                    body.environments.forEach(environment => {
                        props.environment.forEach(prop => expect(environment, 'environment').to.have.property(prop));
                        excludes.environment.forEach(prop => expect(environment, 'environment').to.not.have.property(prop));
                    });

                    done();
                });
        });

        it('should not show the value of hidden EnvVars when not authorized', function (done) {
            request(server)
                .get('/v1/shipment/foo/environment/back')
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    body.envVars.forEach(envVar => {
                        if (envVar.type === 'hidden') {
                            expect(envVar.value, 'envVar.value').to.equal('*******');
                        }
                    });

                    body.parentShipment.envVars.forEach(envVar => {
                        if (envVar.type === 'hidden') {
                            expect(envVar.value, 'envVar.value').to.equal('*******');
                        }
                    });

                    body.providers.forEach(provider => {
                        provider.envVars.forEach(envVar => {
                            if (envVar.type === 'hidden') {
                                expect(envVar.value, 'envVar.value').to.equal('*******');
                            }
                        });
                    });

                    body.containers.forEach(container => {
                        container.envVars.forEach(envVar => {
                            if (envVar.type === 'hidden') {
                                expect(envVar.value, 'envVar.value').to.equal('*******');
                            }
                        });
                    });

                    done();
                });
        });

        it('should show the value of hidden EnvVars when authorized', function (done) {
            request(server)
                .get('/v1/shipment/foo/environment/back')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    body.envVars.forEach(envVar => {
                        if (envVar.type === 'hidden') {
                            expect(envVar.value, 'envVar.value').to.not.equal('*******');
                        }
                    });

                    body.parentShipment.envVars.forEach(envVar => {
                        if (envVar.type === 'hidden') {
                            expect(envVar.value, 'envVar.value').to.not.equal('*******');
                        }
                    });

                    body.providers.forEach(provider => {
                        provider.envVars.forEach(envVar => {
                            if (envVar.type === 'hidden') {
                                expect(envVar.value, 'envVar.value').to.not.equal('*******');
                            }
                        });
                    });

                    body.containers.forEach(container => {
                        container.envVars.forEach(envVar => {
                            if (envVar.type === 'hidden') {
                                expect(envVar.value, 'envVar.value').to.not.equal('*******');
                            }
                        });
                    });

                    done();
                });
        });

        it('should not be able to find a Shipment that was not created', function (done) {
            request(server)
                .get('/v1/shipment/tester-test/environment/dev')
                .expect('Content-Type', /json/)
                .expect(404, done);
        });
    });

    describe('Upsert', function () {
        it('should create a Shipment as though it were new', function (done) {
            let data = helpers.fetchMockData('bulk/9a.shipment');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(201, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.enableMonitoring, 'body.enableMonitoring').to.be.false;
                    expect(body.name, 'body.name').to.equal('test');

                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal('bulk-test-app');
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal('test');
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal('test@turner.com');
                    expect(body.parentShipment.envVars, 'body.parentShipment.envVars').to.have.lengthOf(2);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;

                    expect(body.envVars, 'body.envVars').to.have.lengthOf(2);
                    expect(compare(body.envVars, data.envVars), 'compare(body.envVars, data.envVars)').to.be.true;

                    expect(body.providers, 'body.providers').to.have.lengthOf(1);
                    expect(body.providers[0].replicas, 'body.providers[0].replicas').to.equal(2);
                    expect(body.providers[0].barge, 'body.providers[0].barge').to.equal('test');
                    expect(body.providers[0].name, 'body.providers[0].name').to.equal('aws:us-east-1');
                    expect(compare(body.providers[0].envVars, data.providers[0].envVars), 'compare(body.providers[0].envVars, data.providers[0].envVars)').to.be.true;

                    expect(body.containers, 'body.containers').to.have.lengthOf(1);
                    expect(body.containers[0].image, 'body.containers[0].image').to.equal('registry.services.dmtio.net/hello-world:0.1.0');
                    expect(body.containers[0].name, 'body.containers[0].name').to.equal('hello-world-app');
                    expect(compare(body.containers[0].envVars, data.containers[0].envVars), 'compare(body.containers[0].envVars, data.containers[0].envVars)').to.be.true;
                    expect(body.containers[0].ports[0].protocol, 'body.containers[0].ports[0].protocol').to.equal('http');
                    expect(body.containers[0].ports[0].healthcheck, 'body.containers[0].ports[0].healthcheck').to.equal('/_hc');
                    expect(body.containers[0].ports[0].external, 'body.containers[0].ports[0].external').to.be.true;
                    expect(body.containers[0].ports[0].primary, 'body.containers[0].ports[0].primary').to.be.true;
                    expect(body.containers[0].ports[0].public_vip, 'body.containers[0].ports[0].public_vip').to.be.false;
                    expect(body.containers[0].ports[0].enable_proxy_protocol, 'body.containers[0].ports[0].enable_proxy_protocol').to.be.false;
                    expect(body.containers[0].ports[0].ssl_management_type, 'body.containers[0].ports[0].ssl_management_type').to.equal('iam');
                    expect(body.containers[0].ports[0].healthcheck_timeout, 'body.containers[0].ports[0].healthcheck_timeout').to.equal(1);
                    expect(body.containers[0].ports[0].healthcheck_interval, 'body.containers[0].ports[0].healthcheck_interval').to.equal(10);
                    expect(body.containers[0].ports[0].public_port, 'body.containers[0].ports[0].public_port').to.equal(80);
                    expect(body.containers[0].ports[0].value, 'body.containers[0].ports[0].value').to.equal(15080);
                    expect(body.containers[0].ports[0].name, 'body.containers[0].ports[0].name').to.equal('PORT');

                    done();
                });
        });

        it('should have all the correct properties on read', function (done) {
            let data = helpers.fetchMockData('bulk/9a.shipment');

            request(server)
                .get(`/v1/shipment/${data.parentShipment.name}/environment/${data.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.enableMonitoring, 'body.enableMonitoring').to.be.false;
                    expect(body.name, 'body.name').to.equal('test');

                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal('bulk-test-app');
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal('test');
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal('test@turner.com');
                    expect(body.parentShipment.envVars, 'body.parentShipment.envVars').to.have.lengthOf(2);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;

                    expect(body.envVars, 'body.envVars').to.have.lengthOf(2);
                    expect(compare(body.envVars, data.envVars), 'compare(body.envVars, data.envVars)').to.be.true;

                    expect(body.providers, 'body.providers').to.have.lengthOf(1);
                    expect(body.providers[0].replicas, 'body.providers[0].replicas').to.equal(2);
                    expect(body.providers[0].barge, 'body.providers[0].barge').to.equal('test');
                    expect(body.providers[0].name, 'body.providers[0].name').to.equal('aws:us-east-1');
                    expect(compare(body.providers[0].envVars, data.providers[0].envVars), 'compare(body.providers[0].envVars, data.providers[0].envVars)').to.be.true;

                    expect(body.containers, 'body.containers').to.have.lengthOf(1);
                    expect(body.containers[0].image, 'body.containers[0].image').to.equal('registry.services.dmtio.net/hello-world:0.1.0');
                    expect(body.containers[0].name, 'body.containers[0].name').to.equal('hello-world-app');
                    expect(compare(body.containers[0].envVars, data.containers[0].envVars), 'compare(body.containers[0].envVars, data.containers[0].envVars)').to.be.true;
                    expect(body.containers[0].ports[0].protocol, 'body.containers[0].ports[0].protocol').to.equal('http');
                    expect(body.containers[0].ports[0].healthcheck, 'body.containers[0].ports[0].healthcheck').to.equal('/_hc');
                    expect(body.containers[0].ports[0].external, 'body.containers[0].ports[0].external').to.be.true;
                    expect(body.containers[0].ports[0].primary, 'body.containers[0].ports[0].primary').to.be.true;
                    expect(body.containers[0].ports[0].public_vip, 'body.containers[0].ports[0].public_vip').to.be.false;
                    expect(body.containers[0].ports[0].enable_proxy_protocol, 'body.containers[0].ports[0].enable_proxy_protocol').to.be.false;
                    expect(body.containers[0].ports[0].ssl_management_type, 'body.containers[0].ports[0].ssl_management_type').to.equal('iam');
                    expect(body.containers[0].ports[0].healthcheck_timeout, 'body.containers[0].ports[0].healthcheck_timeout').to.equal(1);
                    expect(body.containers[0].ports[0].healthcheck_interval, 'body.containers[0].ports[0].healthcheck_interval').to.equal(10);
                    expect(body.containers[0].ports[0].public_port, 'body.containers[0].ports[0].public_port').to.equal(80);
                    expect(body.containers[0].ports[0].value, 'body.containers[0].ports[0].value').to.equal(15080);
                    expect(body.containers[0].ports[0].name, 'body.containers[0].ports[0].name').to.equal('PORT');
                    expect(body.containers[0].ports[0].lbtype, 'body.containers[0].ports[0].lbtype').to.equal('default');

                    done();
                });
        });

        it('should update a Shipment when it exists', function (done) {
            let data = helpers.fetchMockData('bulk/9b.shipment');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.enableMonitoring, 'body.enableMonitoring').to.be.true;
                    expect(body.name, 'body.name').to.equal('test');
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal('bulk-test-app');
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal('test');
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal('test@turner.com');
                    expect(body.parentShipment.envVars, 'body.parentShipment.envVars').to.have.lengthOf(2);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(body.envVars, 'body.envVars').to.have.lengthOf(0);
                    expect(body.providers, 'body.providers').to.have.lengthOf(0);
                    expect(body.containers, 'body.containers').to.have.lengthOf(0);

                    done();
                });
        });

        it('should have all the correct properties on read, after all the deletes', function (done) {
            let data = helpers.fetchMockData('bulk/9b.shipment');

            request(server)
                .get(`/v1/shipment/${data.parentShipment.name}/environment/${data.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    console.log('body.envVars', body.envVars);

                    expect(body.enableMonitoring, 'body.enableMonitoring').to.be.true;
                    expect(body.name, 'body.name').to.equal('test');
                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal('bulk-test-app');
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal('test');
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal('test@turner.com');
                    expect(body.parentShipment.envVars, 'body.parentShipment.envVars').to.have.lengthOf(2);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;
                    expect(body.envVars, 'body.envVars').to.have.lengthOf(0);
                    expect(body.providers, 'body.providers').to.have.lengthOf(0);
                    expect(body.containers, 'body.containers').to.have.lengthOf(0);

                    done();
                });
        });

        it('should be able to update a Shipment again', function (done) {
            let data = helpers.fetchMockData('bulk/9a.shipment');

            request(server)
                .post('/v1/bulk/shipments')
                .set('x-username', authUser)
                .set('x-token', authToken)
                .send(data)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.enableMonitoring, 'body.enableMonitoring').to.be.false;
                    expect(body.name, 'body.name').to.equal('test');

                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal('bulk-test-app');
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal('test');
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal('test@turner.com');
                    expect(body.parentShipment.envVars, 'body.parentShipment.envVars').to.have.lengthOf(2);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;

                    expect(body.envVars, 'body.envVars').to.have.lengthOf(2);
                    expect(compare(body.envVars, data.envVars), 'compare(body.envVars, data.envVars)').to.be.true;

                    expect(body.providers, 'body.providers').to.have.lengthOf(1);
                    expect(body.providers[0].replicas, 'body.providers[0].replicas').to.equal(2);
                    expect(body.providers[0].barge, 'body.providers[0].barge').to.equal('test');
                    expect(body.providers[0].name, 'body.providers[0].name').to.equal('aws:us-east-1');
                    expect(compare(body.providers[0].envVars, data.providers[0].envVars), 'compare(body.providers[0].envVars, data.providers[0].envVars)').to.be.true;

                    expect(body.containers, 'body.containers').to.have.lengthOf(1);
                    expect(body.containers[0].image, 'body.containers[0].image').to.equal('registry.services.dmtio.net/hello-world:0.1.0');
                    expect(body.containers[0].name, 'body.containers[0].name').to.equal('hello-world-app');
                    expect(compare(body.containers[0].envVars, data.containers[0].envVars), 'compare(body.containers[0].envVars, data.containers[0].envVars)').to.be.true;
                    expect(body.containers[0].ports[0].protocol, 'body.containers[0].ports[0].protocol').to.equal('http');
                    expect(body.containers[0].ports[0].healthcheck, 'body.containers[0].ports[0].healthcheck').to.equal('/_hc');
                    expect(body.containers[0].ports[0].external, 'body.containers[0].ports[0].external').to.be.true;
                    expect(body.containers[0].ports[0].primary, 'body.containers[0].ports[0].primary').to.be.true;
                    expect(body.containers[0].ports[0].public_vip, 'body.containers[0].ports[0].public_vip').to.be.false;
                    expect(body.containers[0].ports[0].enable_proxy_protocol, 'body.containers[0].ports[0].enable_proxy_protocol').to.be.false;
                    expect(body.containers[0].ports[0].ssl_management_type, 'body.containers[0].ports[0].ssl_management_type').to.equal('iam');
                    expect(body.containers[0].ports[0].healthcheck_timeout, 'body.containers[0].ports[0].healthcheck_timeout').to.equal(1);
                    expect(body.containers[0].ports[0].healthcheck_interval, 'body.containers[0].ports[0].healthcheck_interval').to.equal(10);
                    expect(body.containers[0].ports[0].public_port, 'body.containers[0].ports[0].public_port').to.equal(80);
                    expect(body.containers[0].ports[0].value, 'body.containers[0].ports[0].value').to.equal(15080);
                    expect(body.containers[0].ports[0].name, 'body.containers[0].ports[0].name').to.equal('PORT');

                    done();
                });
        });

        it('should still have all the correct properties on read, with upserts and deletes', function (done) {
            let data = helpers.fetchMockData('bulk/9a.shipment');

            request(server)
                .get(`/v1/shipment/${data.parentShipment.name}/environment/${data.name}`)
                .set('x-username', authUser)
                .set('x-token', authToken)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err);
                    }

                    let body = res.body;

                    expect(body.enableMonitoring, 'body.enableMonitoring').to.be.false;
                    expect(body.name, 'body.name').to.equal('test');

                    expect(body.parentShipment.name, 'body.parentShipment.name').to.equal('bulk-test-app');
                    expect(body.parentShipment.group, 'body.parentShipment.group').to.equal('test');
                    expect(body.parentShipment.contact_email, 'body.parentShipment.contact_email').to.equal('test@turner.com');
                    expect(body.parentShipment.envVars, 'body.parentShipment.envVars').to.have.lengthOf(2);
                    expect(compare(body.parentShipment.envVars, data.parentShipment.envVars), 'compare(body.parentShipment.envVars, data.parentShipment.envVars)').to.be.true;

                    expect(body.envVars, 'body.envVars').to.have.lengthOf(2);
                    expect(compare(body.envVars, data.envVars), 'compare(body.envVars, data.envVars)').to.be.true;

                    expect(body.providers, 'body.providers').to.have.lengthOf(1);
                    expect(body.providers[0].replicas, 'body.providers[0].replicas').to.equal(2);
                    expect(body.providers[0].barge, 'body.providers[0].barge').to.equal('test');
                    expect(body.providers[0].name, 'body.providers[0].name').to.equal('aws:us-east-1');
                    expect(compare(body.providers[0].envVars, data.providers[0].envVars), 'compare(body.providers[0].envVars, data.providers[0].envVars)').to.be.true;

                    expect(body.containers, 'body.containers').to.have.lengthOf(1);
                    expect(body.containers[0].image, 'body.containers[0].image').to.equal('registry.services.dmtio.net/hello-world:0.1.0');
                    expect(body.containers[0].name, 'body.containers[0].name').to.equal('hello-world-app');
                    expect(compare(body.containers[0].envVars, data.containers[0].envVars), 'compare(body.containers[0].envVars, data.containers[0].envVars)').to.be.true;
                    expect(body.containers[0].ports[0].protocol, 'body.containers[0].ports[0].protocol').to.equal('http');
                    expect(body.containers[0].ports[0].healthcheck, 'body.containers[0].ports[0].healthcheck').to.equal('/_hc');
                    expect(body.containers[0].ports[0].external, 'body.containers[0].ports[0].external').to.be.true;
                    expect(body.containers[0].ports[0].primary, 'body.containers[0].ports[0].primary').to.be.true;
                    expect(body.containers[0].ports[0].public_vip, 'body.containers[0].ports[0].public_vip').to.be.false;
                    expect(body.containers[0].ports[0].enable_proxy_protocol, 'body.containers[0].ports[0].enable_proxy_protocol').to.be.false;
                    expect(body.containers[0].ports[0].ssl_management_type, 'body.containers[0].ports[0].ssl_management_type').to.equal('iam');
                    expect(body.containers[0].ports[0].healthcheck_timeout, 'body.containers[0].ports[0].healthcheck_timeout').to.equal(1);
                    expect(body.containers[0].ports[0].healthcheck_interval, 'body.containers[0].ports[0].healthcheck_interval').to.equal(10);
                    expect(body.containers[0].ports[0].public_port, 'body.containers[0].ports[0].public_port').to.equal(80);
                    expect(body.containers[0].ports[0].value, 'body.containers[0].ports[0].value').to.equal(15080);
                    expect(body.containers[0].ports[0].name, 'body.containers[0].ports[0].name').to.equal('PORT');
                    expect(body.containers[0].ports[0].lbtype, 'body.containers[0].ports[0].lbtype').to.equal('default');

                    done();
                });
        });
    })
});
