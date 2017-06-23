const crypto = require('../lib/crypto');

module.exports = (sequelize, DataTypes) => {
    let Port = sequelize.define(
        'Port',
        {
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isUppercase: true,
                    notContains: '-'
                }
            },
            composite: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                primaryKey: true
            },
            value: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 65535
                }
            },
            public_port: {
                type: DataTypes.INTEGER,
                field: "public_port",
                validate: {
                    min: 1,
                    max: 65535
                }
            },
            protocol: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'http',
                validate: {
                    isIn: [['http', 'https', 'tcp']]
                }
            },
            healthcheck: {
                type: DataTypes.STRING,
                defaultValue: '',
                allowNull: false
            },
            external: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            primary: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            public_vip: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            enable_proxy_protocol: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            ssl_management_type: {
                type: DataTypes.STRING
            },
            ssl_arn: {
                type: DataTypes.TEXT,
                set(val) {
                    this.setDataValue('ssl_arn', val ? crypto.encrypt(val.toString()) : val);
                },
                get() {
                    let val = this.getDataValue('ssl_arn');
                    return val ? crypto.decrypt(val) : val;
                }
            },
            private_key: {
                type: DataTypes.BLOB,
                set(val) {
                    this.setDataValue('private_key', val ? crypto.encrypt(val.toString()) : val);
                },
                get() {
                    let val = this.getDataValue('private_key');
                    return val ? crypto.decrypt(val) : val;
                }
            },
            public_key_certificate: {
                type: DataTypes.BLOB,
                set(val) {
                    this.setDataValue('public_key_certificate', val ? crypto.encrypt(val.toString()) : val);
                },
                get() {
                    let val = this.getDataValue('public_key_certificate');
                    return val ? crypto.decrypt(val) : val;
                }
            },
            certificate_chain: {
                type: DataTypes.BLOB,
                set(val) {
                    this.setDataValue('certificate_chain', val ? crypto.encrypt(val.toString()) : val);
                },
                get() {
                    let val = this.getDataValue('certificate_chain');
                    return val ? crypto.decrypt(val) : val;
                }
            },
            healthcheck_timeout: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                field: "healthcheck_timeout",
                validate: {
                    min: 1,
                    max: 3600
                }
            }
        },
        {
            timestamps: false,
            classMethods: {
                associate: models => {
                    Port.belongsTo(models.Container, {
                        foreignKey: 'containerId',
                        targetKey: 'composite',
                        onDelete: 'cascade'
                    });
                }
            }
        }
    );

    return Port;
};
