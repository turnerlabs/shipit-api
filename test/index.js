/*global describe, it */

const expect = require('chai').expect,
    request = require('supertest');

let server = require('../app.js');

/*
 * Mixing the use of arrow functions because Mocha can't use them,
 * but I like them, so using them where I can.
 * http://mochajs.org/#arrow-functions
 */

describe('Health check', function () {
    it('should return successfully', function (done) {
        request(server)
            .get('/_hc')
            .expect('Content-Type', /json/)
            .expect(200, done);
    });
});
