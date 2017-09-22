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
                        let regexp = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,5})+$/
                        if (!regexp.test(val)) {
                            throw new Error('contact_email must be a valid email address')
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
