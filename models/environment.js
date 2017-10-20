const crypto = require('../lib/crypto');

module.exports = (sequelize, DataTypes) => {
    let Environment = sequelize.define(
        'Environment',
        {
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            composite: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                primaryKey: true
            },
            buildToken: {
                type: DataTypes.TEXT,
                allowNull: true,
                set(val) {
                    this.setDataValue('buildToken', val ? crypto.encrypt(val.toString()) : val);
                },
                get() {
                    let val = this.getDataValue('buildToken');
                    return val ? crypto.decrypt(val) : val;
                }
            },
            enableMonitoring: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: true
            },
            iamRole: {
                type: DataTypes.STRING,
                defaultValue: "",
                allowNull: true
            },
            cnames: {
                type: DataTypes.STRING,
                defaultValue: "",
                allowNull: true
            },
        },
        {
            timestamps: false,
            classMethods: {
                associate: models => {
                    Environment.hasMany(models.EnvVar, {
                        as: 'envVars',
                        foreignKey: 'environmentId'
                    });
                    Environment.hasMany(models.Container, {
                        as: 'containers',
                        foreignKey: 'environmentId'
                    });
                    Environment.hasMany(models.Provider, {
                        as: 'providers',
                        foreignKey: 'environmentId'
                    });
                    Environment.belongsTo(models.Shipment, {
                        foreignKey: 'shipmentId',
                        targetKey: 'name',
                        onDelete: 'cascade'
                    });
                }
            }
        }
    );

    return Environment;
};
