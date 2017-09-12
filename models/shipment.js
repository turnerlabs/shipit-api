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
            },
            contact_email: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isValidEmail: val => {
                        let regexp = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
                        if (!regexp.test(val)) {
                            throw new Error('Email must be a valid')
                        }
                    }
                }

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
