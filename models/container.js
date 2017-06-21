module.exports = (sequelize, DataTypes) => {
    let Container = sequelize.define(
        'Container',
            {
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    validate: {
                        isLowercase: true
                    }
                },
                composite: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    unique: true,
                    primaryKey: true
                },
                image: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    validate: {
                        isDnsLabel: val => {
                            let regexp = /^([a-zA-Z0-9.-]*)(\/?([a-z0-9.-]{1,63}))+:?([a-zA-Z0-9.-]*)$/
                            if (!regexp.test(val)) {
                                throw new Error('Image must be a DNS label')
                            }
                        }
                    }
                }
            },
            {
                timestamps: false,
                classMethods: {
                    associate: models => {
                        Container.hasMany(models.Port, {
                            as: 'ports',
                            foreignKey: 'containerId'
                        });
                        Container.hasMany(models.EnvVar, {
                            as: 'envVars',
                            foreignKey: 'containerId'
                        });
                        Container.belongsTo(models.Environment, {
                            foreignKey: 'environmentId',
                            targetKey: 'composite',
                            onDelete: 'cascade'
                        });
                    },
                }
            }
    );

    return Container;
};
