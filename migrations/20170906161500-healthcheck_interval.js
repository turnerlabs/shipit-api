module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Ports').then(attributes => {
          if (!attributes.hasOwnProperty('healthcheck_interval')) {
            // healthcheck_interval
            changes.push(
                queryInterface.addColumn(
                    'Ports',
                    'healthcheck_interval',
                    {
                        type: DataTypes.INTEGER,
                        field: "healthcheck_interval",
                        validate: {
                            min: 1,
                            max: 3600
                        },
                        defaultValue: 10,
                        get() {
                            return this.getDataValue('healthcheck_interval') || this.getDataValue('value');
                        }
                    }
                )
            );
          }
        });

        return Promise.all(changes);
    },

    down: function (queryInterface, DataTypes) {
        let changes = [];

        // healthcheck_interval
        changes.push(
            queryInterface.addColumn(
                'Ports',
                'healthcheck_interval',
                {
                    type: DataTypes.INTEGER,
                    field: "healthcheck_interval",
                    validate: {
                        min: 1,
                        max: 3600
                    },
                    defaultValue: 10,
                    get() {
                        return this.getDataValue('healthcheck_interval') || this.getDataValue('value');
                    }
                }
            )
        );

        return Promise.all(changes);
    }
};
