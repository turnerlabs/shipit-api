module.exports = {
    up: function (queryInterface, Sequelize) {
        let changes = [];

        // public_port
        changes.push(
            queryInterface.changeColumn(
                'Ports',
                'public_port',
                {
                    type: Sequelize.INTEGER,
                    field: "public_port",
                    validate: {
                        min: 1,
                        max: 65535
                    },
                    get() {
                        return this.getDataValue('public_port') || this.getDataValue('value');
                    }
                }
            )
        );

        // ssl_management_type
        changes.push(
            queryInterface.changeColumn(
                'Ports',
                'ssl_management_type',
                {
                    type: Sequelize.STRING,
                    defaultValue: ''
                }
            )
        );

        // ssl_arn
        changes.push(
            queryInterface.changeColumn(
                'Ports',
                'ssl_arn',
                {
                    type: Sequelize.TEXT,
                    defaultValue: "",
                    set(val) {
                        this.setDataValue('ssl_arn', val ? crypto.encrypt(val.toString()) : val);
                    },
                    get() {
                        let val = this.getDataValue('ssl_arn');
                        return val ? crypto.decrypt(val) : val;
                    }
                }
            )
        );

        // private_key
        changes.push(
            queryInterface.changeColumn(
                'Ports',
                'private_key',
                {
                    type: Sequelize.BLOB,
                    defaultValue: "",
                    set(val) {
                        this.setDataValue('private_key', val ? crypto.encrypt(val.toString()) : val);
                    },
                    get() {
                        let val = this.getDataValue('private_key');
                        return val ? crypto.decrypt(val) : val;
                    }
                }
            )
        );

        // public_key_certificate
        changes.push(
            queryInterface.changeColumn(
                'Ports',
                'public_key_certificate',
                {
                    type: Sequelize.BLOB,
                    defaultValue: "",
                    set(val) {
                        this.setDataValue('public_key_certificate', val ? crypto.encrypt(val.toString()) : val);
                    },
                    get() {
                        let val = this.getDataValue('public_key_certificate');
                        return val ? crypto.decrypt(val) : val;
                    }
                }
            )
        );

        // certificate_chain
        changes.push(
            queryInterface.changeColumn(
                'Ports',
                'certificate_chain',
                {
                    type: Sequelize.BLOB,
                    defaultValue: "",
                    set(val) {
                        this.setDataValue('certificate_chain', val ? crypto.encrypt(val.toString()) : val);
                    },
                    get() {
                        let val = this.getDataValue('certificate_chain');
                        return val ? crypto.decrypt(val) : val;
                    }
                }
            )
        );

        return Promise.all(changes);
    },

    down: function (queryInterface, Sequelize) {
        let changes = [];

        changes.push(
            queryInterface.changeColumn(
                'Ports',
                'ssl_management_type',
                {
                    type: Sequelize.STRING
                }
            )
        );

        return Promise.all(changes);
    }
};
