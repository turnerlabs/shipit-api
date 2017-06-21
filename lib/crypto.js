const fs = require('fs'),
    crypto = require('node-cryptojs-aes'),
    sha256 = require('crypto'),
    SALT = process.env.SALT || '';

let cryptoJS = crypto.CryptoJS,
    jsonFormatter  = crypto.JsonFormatter,
    special;

try {
    special = process.env.LOCAL_SECRET || fs.readFileSync(process.env.SECRET_FILE, 'utf8').replace(/\n$/, '');
}
catch (err) {
    if (err.code === 'ENOENT') {
        console.error('File not found.');
    }
    else {
        throw err;
    }
}

module.exports = {
    encrypt: value => {
        if (!special) return value;
        if (!value) return value;

        try {
            value = cryptoJS.AES.encrypt(value, special, { format: jsonFormatter }).toString();
        }
        catch (err) {
            console.error('ERROR::ENCRYPT', err);
            throw err;
        }

        return value;
    },
    decrypt: value => {
        if (!special) return value;

        try {
            let decrypted = cryptoJS.AES.decrypt(value, special, { format: jsonFormatter });
            value = cryptoJS.enc.Utf8.stringify(decrypted);
        }
        catch (err) {
            console.error('ERROR::DECRYPT', err);
            throw err;
        }

        return value;
    },
    sha: value => {
        value += SALT;

        try {
            value = sha256.createHash('sha256').update(value).digest('base64');
        }
        catch (err) {
            console.error('ERROR::SHA', err);
            throw err;
        }

        return value;
    }
};
