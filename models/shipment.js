module.exports = (sequelize, DataTypes) => {
    let Shipment = sequelize.define(
        "Shipment",
        {
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                primaryKey: true,
                unique: true
            },
            group: {
                type: DataTypes.STRING,
                allowNull: false
            }
        },
        {
            timestamps: false,
            classMethods: {
                associate: models => {
                    Shipment.hasMany(models.EnvVar, {
                        as: 'envVars',
                        foreignKey: 'shipmentId'
                    });
                    Shipment.hasMany(models.Environment, {
                        as: 'environments',
                        foreignKey: 'shipmentId'
                    });
                }
            }
        }
    );

    return Shipment;
};
