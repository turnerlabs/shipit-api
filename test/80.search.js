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

describe('Search', function () {
    describe('Env Var', function () {
        it('should return shipments from search', function (done) {
            request(server)
                .get(`/v1/envVar/search?NODE_ENV=development`)
                .expect('Content-Type', /json/)
                .expect(200, (err, res) => {
                    if (err) {
                        return done(err)
                    }

                    let data = res.body;

                    expect(data, 'data').to.have.length(3);
                    data.forEach(ele => {
                        expect(ele, 'data[][ele]').to.be.an('object');
                    });

                    expect(data[0].environments, 'data[0].environments').to.have.length(4);
                    data[0].environments.forEach(ele => {
                        expect(ele, 'data[0].environments[][ele]').to.be.an('object');
                    });

                    expect(data[1].environments, 'data[1].environments').to.have.length(1);
                    data[1].environments.forEach(ele => {
                        expect(ele, 'data[1].environments[][ele]').to.be.an('object');
                    });

                    expect(data[2].environments, 'data[2].environments').to.have.length(1);
                    data[2].environments.forEach(ele => {
                        expect(ele, 'data[2].environments[][ele]').to.be.an('object');
                    });

                    done();
                })
        });
    });
});
