/*global describe, it */

const expect = require('chai').expect,
    crypto = require('../lib/crypto');

let value = 'test value';

describe('Crypto', function () {
    let props = ['ct', 'iv', 's'],
        encrypted,
        decrypted,
        json;

    it('should correctly encrypt a value', function () {
        encrypted = crypto.encrypt(value);
        json = JSON.parse(encrypted);

        expect(encrypted).to.not.equal(value);
        props.forEach(prop => expect(json).to.have.property(prop));
    });

    it('should correctly decrypt a value', function () {
        decrypted = crypto.decrypt(encrypted);

        expect(decrypted).to.equal(value);
    });

    it('should correcly sha256 a value', function () {
        let sha1 = crypto.sha(value),
            sha2 = crypto.sha(value);

        expect(sha1).to.equal(sha2);
    });
});
