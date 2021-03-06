const crypto = require('../lib/crypto');

module.exports = (sequelize, DataTypes) => {
    let Port = sequelize.define(
        'Port',
        {
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
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
                },
                get() {
                    return this.getDataValue('public_port') || this.getDataValue('value');
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
                type: DataTypes.STRING,
                defaultValue: 'iam'
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
                type: DataTypes.TEXT,
                set(val) {
                    if (val) {
                        try {
                            val = crypto.encrypt(val)
                        }
                        catch (e) {
                            val = ""
                        }
                    }
                    else {
                        val = ""
                    }
                    this.setDataValue('private_key', val);
                },
                get() {
                    let val = this.getDataValue('private_key');
                    if (val) {
                        try {
                            val = crypto.decrypt(val);
                        }
                        catch (e) {
                            val = ""
                        }
                    }
                    else {
                        val = "";
                    }

                    return val;
                }
            },
            public_key_certificate: {
                type: DataTypes.TEXT,
                set(val) {
                    if (val) {
                        try {
                            val = crypto.encrypt(val)
                        }
                        catch (e) {
                            val = ""
                        }
                    }
                    else {
                        val = ""
                    }
                    this.setDataValue('public_key_certificate', val);
                },
                get() {
                    let val = this.getDataValue('public_key_certificate');
                    if (val) {
                        try {
                            val = crypto.decrypt(val);
                        }
                        catch (e) {
                            val = ""
                        }
                    }
                    else {
                        val = "";
                    }

                    return val;
                }
            },
            certificate_chain: {
                type: DataTypes.TEXT,
                set(val) {
                    if (val) {
                        try {
                            val = crypto.encrypt(val)
                        }
                        catch (e) {
                            val = ""
                        }
                    }
                    else {
                        val = ""
                    }
                    this.setDataValue('certificate_chain', val);
                },
                get() {
                    let val = this.getDataValue('certificate_chain');
                    if (val) {
                        try {
                            val = crypto.decrypt(val);
                        }
                        catch (e) {
                            val = ""
                        }
                    }
                    else {
                        val = "";
                    }

                    return val;
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
            },
            healthcheck_interval: {
                type: DataTypes.INTEGER,
                defaultValue: 10,
                field: "healthcheck_interval",
                validate: {
                    min: 1,
                    max: 3600
                }
            },
            lbtype: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'default'
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
