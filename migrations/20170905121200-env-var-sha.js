module.exports = {
    up: (queryInterface, DataTypes) => {
        let changes = [];

        queryInterface.describeTable('EnvVars').then(attributes => {
            if (!attributes.hasOwnProperty('shaValue')) {
                changes.push(
                    queryInterface.addColumn(
                        'Ports',
                        'shaValue',
                        {
                            type: DataTypes.STRING,
                            allowNull: true
                        }
                    )
                );
            }
        });

        return Promise.all(changes);
    },

    down: (queryInterface, DataTypes) => {
        let changes = [];

        // healthcheck_interval
        changes.push(
            queryInterface.removeColumn('EnvVars', 'shaValue')
        );

        return Promise.all(changes);
    }
};
