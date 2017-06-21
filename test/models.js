/*global beforeEach, describe, it */

const expect = require('chai').expect,
    models = require('../models');

describe('Model unit tests', function () {
    it('returns the shipment model', function () {
        expect(models.Shipment).to.be.ok;
    });

    it('returns the environment model', function () {
        expect(models.Environment).to.be.ok;
    });

    it('returns the container model', function () {
        expect(models.Container).to.be.ok;
    });

    it('returns the port model', function () {
        expect(models.Port).to.be.ok;
    });

    it('returns the provider model', function () {
        expect(models.Provider).to.be.ok;
    });

    it('returns the envVar model', function () {
        expect(models.EnvVar).to.be.ok;
    });
});
