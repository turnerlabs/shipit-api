/*global describe, it */

const expect = require('chai').expect,
    crypto = require('../lib/crypto');

let value = 'test value';

describe('Crypto', function () {
    let props = ['ct', 'iv', 's'],
        encrypted,
        decrypted,
        json;

    it('should encrypt a value', function () {
        encrypted = crypto.encrypt(value);
        json = JSON.parse(encrypted);

        expect(encrypted).to.not.equal(value);
        props.forEach(prop => expect(json).to.have.property(prop));
    });

    it('should decrypt a value', function () {
        decrypted = crypto.decrypt(encrypted);

        expect(decrypted).to.equal(value);
    });

    it('should sha256 a value', function () {
        let sha1 = crypto.sha(value),
            sha2 = crypto.sha(value);

        expect(sha1).to.equal(sha2);
    });

    it('should return raw value if decrypt fails', function () {
        let decrypted = crypto.decrypt(value);

        expect(decrypted).to.equal(value);
    });

    it('should handle the falsy values (null, undefined, false, zero, and empty string)', function () {
        let values = [null, undefined, false, 0, ''],
            encrypted = values.map(crypto.encrypt),
            decrypted = encrypted.map(crypto.decrypt);

        // we wanted the decrypted values to equal their value
        decrypted.forEach((value, idx) => expect(value, `value is '${value}'`).to.equal(values[idx]));
    });
});
