module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Environments').then(attributes => {
            if (!attributes.hasOwnProperty('cnames')) {
                changes.push(
                    queryInterface.addColumn(
                        'Environments',
                        'cnames',
                        {
                            type: DataTypes.JSONB,
                            field: "cnames",
                            defaultValue: []
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
            if (attributes.hasOwnProperty('cnames')) {
                changes.push(
                    queryInterface.removeColumn('Environments', 'cnames')
                );
            }
        });

        return Promise.all(changes);
    }
};
