const crypto = require('../lib/crypto');

module.exports = (sequelize, DataTypes) => {
    let EnvVar = sequelize.define(
        "EnvVar",
        {
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    not: ["(?:(^([0-9])|[a-zA-Z0-9]*[- ][a-zA-Z0-9]*)+)",'i']
                }
            },
            composite: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                primaryKey: true
            },
            value: {
                type: DataTypes.TEXT,
                allowNull: false,
                validate: {
                    not: ["^[\s]*$"]
                },
                set(val) {
                    if (!val) return val;
                    val = val.trim();
                    this.setDataValue('value', val ? crypto.encrypt(val.toString()) : val);
                },
                get() {
                    let val = this.getDataValue('value');
                    return val ? crypto.decrypt(val) : val;
                }
            },
            type: {
                type: DataTypes.STRING,
                allowNull: true,
                defaultValue: 'basic',
                validate: {
                    isIn: [['basic', 'discover', 'hidden']]
                }
            },
            shaValue: {
                type: DataTypes.STRING,
                allowNull: true
            }
        },
        {
            timestamps: false,
            classMethods: {
                associate: models => {
                    EnvVar.belongsTo(models.Shipment, {
                        foreignKey: 'shipmentId',
                        targetKey: 'name',
                        onDelete: 'cascade'
                    });
                    EnvVar.belongsTo(models.Environment, {
                        foreignKey: 'environmentId',
                        targetKey: 'composite',
                        onDelete: 'cascade'
                    });
                    EnvVar.belongsTo(models.Provider, {
                        foreignKey: 'providerId',
                        targetKey: 'composite',
                        onDelete: 'cascade'
                    });
                    EnvVar.belongsTo(models.Container, {
                        foreignKey: 'containerId',
                        targetKey: 'composite',
                        onDelete: 'cascade'
                    });
                }
            }
        }
    );

    return EnvVar;
};
