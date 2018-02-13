/*global describe, it */

const expect = require('chai').expect,
    request = require('supertest'),
    nock = require('nock'),
    models = require('../models'),
    helpers = require('./helpers'),
    server = require('../app');

describe('Order', function () {
    // Shipments from bulk tests, env are added out of order
    it('should be enforced on Shipments', function (done) {
        request(server)
            .get('/v1/shipments')
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let data = res.body,
                    names = ['bulk-shipment-app', 'bulk-test-app', 'foo'],
                    envs = [
                        ['test0', 'test1', 'test12', 'test2', 'test3', 'test4', 'test5', 'test6'],
                        ['test'],
                        ['back']
                    ];

                data.forEach((ele, i) => {
                    expect(ele.name, `ele.name == names[${i}]`).to.equal(names[i]);

                    ele.environments.forEach((env, j) => {
                        expect(env, `env == env[${j}]`).to.equal(envs[i][j])
                    });
                });

                done();
            });
    });

    // /test/mocks/bulk_shipment.json
    it('should be enforced on a Shipment', function (done) {
        request(server)
            .get('/v1/shipment/foo')
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let data = res.body,
                    envVars = ['NODE_ENV', 'PORT', 'PORT_3'];

                data.envVars.forEach((envVar, i) => {
                    expect(envVar.name, 'name == envVars[i]').to.equal(envVars[i])
                });

                done();
            });
    });

    // Environment providers
    // /test/mocks/bulk/2.shipment_2providers.json
    it('should be enforced on Environment (providers)', function (done) {
        request(server)
            .get('/v1/shipment/bulk-shipment-app/environment/test2')
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let data = res.body,
                    providers = ['aws:us-east-1', 'aws:us-east-2'];

                data.providers.forEach((provider, i) => {
                    expect(provider.name, 'name == provider[i]').to.equal(providers[i]);
                });

                done();
            });

    });

    // Environment containers
    // /test/mocks/bulk/4.shipment_2containers.json
    it('should be enforced on Environment (containers)', function (done) {
        request(server)
            .get('/v1/shipment/bulk-shipment-app/environment/test4')
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let data = res.body,
                    containers = ['hello-world-app', 'sidecar-app'];

                data.containers.forEach((container, i) => {
                    expect(container.name, 'name == container[i]').to.equal(containers[i]);
                });

                done();
            });
    });

    // Ports
    // /test/mocks/bulk_shipment.json
    it('should be enforced on Ports', function (done) {
        //  PORT PORT_SSL
        request(server)
            .get('/v1/shipment/foo/environment/back')
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let data = res.body,
                    ports = ['PORT', 'PORT_SSL'];

                data.containers[0].ports.forEach((port, i) => {
                    expect(port.name, 'port name == ports[i]').to.equal(ports[i])
                });

                done();
            });
    });


    // EnvVars
    // test/mocks/bulk/9a.shipment.json
    it('should be enforced on EnvVars', function (done) {
        request(server)
            .get('/v1/shipment/bulk-test-app/environment/test')
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let data = res.body,
                    envVars = {
                        shipment: ['CUSTOMER', 'MY_SECRET'],
                        environment: ['MY_SECRET', 'NODE_ENV'],
                        container: ['HEALTHCHECK', 'MY_SECRET'],
                        provider: ['LOCATION', 'MY_SECRET']
                    };

                data.envVars.forEach((ele, i) => {
                    expect(ele.name, 'environment envVar name == ele[i]').to.equal(envVars.environment[i])
                });

                data.parentShipment.envVars.forEach((ele, i) => {
                    expect(ele.name, 'shipment envVar name == ele[i]').to.equal(envVars.shipment[i])
                });

                data.containers[0].envVars.forEach((ele, i) => {
                    expect(ele.name, 'container envVar name == ele[i]').to.equal(envVars.container[i])
                });

                data.providers[0].envVars.forEach((ele, i) => {
                    expect(ele.name, 'provider envVar name == ele[i]').to.equal(envVars.provider[i])
                });


                done();
            });
    });

    // Annotations
    // test/mocks/bulk/9a.shipment.json
    it('should be enforced on Annotations', function (done) {
        request(server)
            .get('/v1/shipment/bulk-test-app/environment/test')
            .expect('Content-Type', /json/)
            .expect(200, (err, res) => {
                if (err) {
                    return done(err);
                }

                let data = res.body,
                    keys = ['abba', 'zz top'];

                data.annotations.forEach((ele, i) => {
                    expect(ele.key, `annotation key(${ele.key}) == ele[i](${keys[i]})`).to.equal(keys[i])
                });

                done();
            });
    });
});
