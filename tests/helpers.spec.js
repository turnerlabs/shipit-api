var expect = require("chai").expect;
var helpers = require("../models/helpers.js");

var expectTrue = (a) => expect(a).to.equal(true);
var expectFalse = (a) => expect(a).to.equal(false);

describe('generateToken', () => {
    it('should generate a random token of length 50 by default',() => {
        var token = helpers.generateToken();
        expect(typeof token).to.equal("string");
        expect(token.length).to.equal(50);
    });

    it('should generate a random token of length 100',() => {
        var token = helpers.generateToken(100);
        expect(typeof token).to.equal("string");
        expect(token.length).to.equal(100);
    });
});


describe('isString', () => {

    it('should return true if string is passed in', () => helpers.isString(expectTrue, 'token'));
    it('should return false for undefined', () => helpers.isString(expectFalse));
    it('should return false for boolean', () => helpers.isString(expectFalse, true));
    it('should return false for Number', () => helpers.isString(expectFalse, 100));
    it('should return false for Array', () => helpers.isString(expectFalse, []));
    it('should return false for Function', () => helpers.isString(expectFalse, () => true));
    it('should return false for Object', () => helpers.isString(expectFalse, {}));
});


describe('isValidDockerLink', () => {
    it('should return false for invalid links', () => helpers.isValidDockerLink(expectTrue, 'foo'));
    it('should return false for invalid links', () => helpers.isValidDockerLink(expectFalse, ':foo'));
    it('should return false for invalid links', () => helpers.isValidDockerLink(expectFalse, 'foo_bar:0.1.1'));
    it('should return false for invalid links', () => helpers.isValidDockerLink(expectTrue, 'foo-bar:0.1.1'));
    it('should return false for invalid links', () => helpers.isValidDockerLink(expectTrue, 'garbage/foo-bar:0.1.1'));
    it('should return false for invalid links', () => helpers.isValidDockerLink(expectTrue, 'garbage.io/garbage/foo-bar:0.1.1'));
});

describe('isValidPort', () => {
    it('should return true for valid ports', () => helpers.isValidPort(expectTrue, 8080));
    it('should return true for valid ports', () => helpers.isValidPort(expectTrue, 65535));
    it('should return true for valid ports', () => helpers.isValidPort(expectTrue, 1));
    it('should return false for invalid ports', () => helpers.isValidPort(expectFalse, 65536));
    it('should return false for invalid ports', () => helpers.isValidPort(expectFalse, '65536'));
    it('should return false for invalid ports', () => helpers.isValidPort(expectFalse, -1));
    it('should return false for invalid ports', () => helpers.isValidPort(expectFalse));
});

describe('isValidEnvVarType', () => {
    it('should return true for valid ENV types', () => helpers.isValidEnvVarType(expectTrue, 'discover'));
    it('should return true for valid ENV types', () => helpers.isValidEnvVarType(expectTrue, 'basic'));
    it('should return true for valid ENV types', () => helpers.isValidEnvVarType(expectFalse, 'port'));
    it('should return true for valid ENV types', () => helpers.isValidEnvVarType(expectTrue, 'hidden'));
    it('should return false for valid ENV types', () => helpers.isValidEnvVarType(expectFalse, 'healthcheck'));
    it('should return false for invalid ENV types', () => helpers.isValidEnvVarType(expectFalse, '65536'));
    it('should return false for invalid ENV types', () => helpers.isValidEnvVarType(expectFalse, -1));
    it('should return false for invalid ENV types', () => helpers.isValidEnvVarType(expectFalse));
});

describe('isValidProvider', () => {
    it('should return true for valid provider', () => helpers.isValidProvider(expectTrue, 'ec2'));
    it('should return true for valid provider', () => helpers.isValidProvider(expectTrue, '56m'));
    it('should return true for valid provider', () => helpers.isValidProvider(expectFalse, 'port'));
    it('should return false for invalid provider', () => helpers.isValidProvider(expectFalse, 'healthcheck'));
    it('should return false for invalid provider', () => helpers.isValidProvider(expectFalse, '65536'));
    it('should return false for invalid provider', () => helpers.isValidProvider(expectFalse, -1));
    it('should return false for invalid provider', () => helpers.isValidProvider(expectFalse));
});

describe('isValidHealthcheckProtocol', () => {
    it('should return true for valid healtcheck proto', () => helpers.isValidHealthcheckProtocol(expectTrue, 'http'));
    it('should return true for valid healtcheck proto', () => helpers.isValidHealthcheckProtocol(expectTrue, 'https'));
    it('should return true for valid healtcheck proto', () => helpers.isValidHealthcheckProtocol(expectTrue, 'tcp'));
    it('should return false for invalid healtcheck proto', () => helpers.isValidHealthcheckProtocol(expectFalse, 'healthcheck'));
    it('should return false for invalid healtcheck proto', () => helpers.isValidHealthcheckProtocol(expectFalse, '65536'));
    it('should return false for invalid healtcheck proto', () => helpers.isValidHealthcheckProtocol(expectFalse, -1));
    it('should return false for invalid healtcheck proto', () => helpers.isValidHealthcheckProtocol(expectFalse));
});

// --- passes, I think this should fail
// do we want to allow users to send all numbers as a valid name? Currently this test is failing.
describe('isValidName', () => {
    it('should return false name contians &', () => helpers.isValidName(expectFalse, "product-&-env"));
    it('should return true', () => helpers.isValidName(expectTrue, "product-env-test-123"));
    it('should return false for just -', () => helpers.isValidName(expectFalse, "---"));
    it('should return true for just numbers', () => helpers.isValidName(expectTrue, '65536'));
    it('should return false for string with odd chars', () => helpers.isValidName(expectFalse, '!@#$%^'));
    it('should return false for empty string', () => helpers.isValidName(expectFalse, ''));
    it('should return false for Number', () => helpers.isValidName(expectFalse, -1));
    it('should return false for undefined', () => helpers.isValidName(expectFalse));
});

describe('isValidEnvVar', () => {
    it('should return false var contians &', () => helpers.isValidEnvVar(expectFalse, "product-&-env"));
    it('should return true', () => helpers.isValidEnvVar(expectTrue, "test_23"));
    it('should return false for just ___', () => helpers.isValidEnvVar(expectFalse, "___"));
    it('should return false for just numbers', () => helpers.isValidEnvVar(expectFalse, '65536'));
    it('should return false for empty string', () => helpers.isValidEnvVar(expectFalse, ''));
    it('should return false for Number', () => helpers.isValidEnvVar(expectFalse, -1));
    it('should return false for undefined', () => helpers.isValidEnvVar(expectFalse));
});

describe('isBoolean', () => {
    it('should return true for false :)', () => helpers.isBoolean(expectTrue, false));
    it('should return true', () => helpers.isBoolean(expectTrue, true));
    it('should return false for Number', () => helpers.isBoolean(expectFalse, 1));
    it('should return false for undefined', () => helpers.isBoolean(expectFalse));
});

describe('isBooleanAndExternal', () => {
    it('should return true if bool is false and external is true', () => helpers.isBooleanAndExternal(expectTrue, false, null, {external: true}));
    it('should return true if bool is true and external is true', () => helpers.isBooleanAndExternal(expectTrue, true, null, {external: true}));
    it('should return false if bool is true and external is false', () => helpers.isBooleanAndExternal(expectFalse, true, null, {external: false}));
    it('should return false for Number', () => helpers.isBooleanAndExternal(expectFalse, 1));
    it('should return false for undefined', () => helpers.isBooleanAndExternal(expectFalse));
    it('should return false for true and undefined object', () => helpers.isBooleanAndExternal(expectFalse, true, null));
});

describe('isValidContainerArray', () => {
    it('should return true', () => helpers.isValidContainerArray(expectTrue, [1]));
    it('should return false for emtpy array', () => helpers.isValidContainerArray(expectFalse, []));
    it('should return false for non array', () => helpers.isValidContainerArray(expectFalse, {2: "test"}));
    it('should return false for non array', () => helpers.isValidContainerArray(expectFalse, 1));
    it('should return false for non array', () => helpers.isValidContainerArray(expectFalse));
    it('should return false for non array', () => helpers.isValidContainerArray(expectFalse, true));
});

describe('isValidInteger', () => {
    it('should return true', () => helpers.isValidInteger(expectTrue, 1));
    it('should return false for emtpy array', () => helpers.isValidInteger(expectFalse, []));
    it('should return false for non array', () => helpers.isValidInteger(expectFalse, {2: "test"}));
    it('should return false for negative number', () => helpers.isValidInteger(expectFalse, -1));
    it('should return false for double', () => helpers.isValidInteger(expectFalse, 1.5));
    it('should return false for undefined', () => helpers.isValidInteger(expectFalse));
});
