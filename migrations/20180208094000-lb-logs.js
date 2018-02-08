module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Environments').then(attributes => {
            if (!attributes.hasOwnProperty('enableLoadBalancerAccessLogs')) {
                changes.push(
                    queryInterface.addColumn(
                        'Environments',
                        'enableLoadBalancerAccessLogs',
                        {
                            type: DataTypes.STRING,
                            defaultValue: null,
                            allowNull: true
                        }
                    )
                );
            }
        });

        return Promise.all(changes);
    },

    down: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Environments').then(attributes => {
            if (attributes.hasOwnProperty('enableLoadBalancerAccessLogs')) {
                changes.push(
                    queryInterface.removeColumn('Environments', 'enableLoadBalancerAccessLogs')
                );
            }
        });

        return Promise.all(changes);
    }
};
