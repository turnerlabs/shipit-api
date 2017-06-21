module.exports = (sequelize, DataTypes) => {
    let Provider = sequelize.define(
        'Provider',
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
            replicas: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            barge: {
                type: DataTypes.STRING,
                allowNull: true
            }
        },
        {
            timestamps: false,
            classMethods: {
                associate: models => {
                    Provider.hasMany(models.EnvVar, {
                        as: 'envVars',
                        foreignKey: 'providerId'
                    });
                    Provider.belongsTo(models.Environment, {
                        foreignKey: 'environmentId',
                        targetKey: 'composite',
                        onDelete: 'cascade'
                    });
                }
            }
        }
    );

    return Provider;
};
