module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Environments').then(attributes => {
            if (!attributes.hasOwnProperty('annotations')) {
                changes.push(
                    queryInterface.addColumn(
                        'Environments',
                        'annotations',
                        {
                            type: DataTypes.JSONB,
                            field: "annotations",
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
            if (attributes.hasOwnProperty('annotations')) {
                changes.push(
                    queryInterface.removeColumn('Environments', 'annotations')
                );
            }
        });

        return Promise.all(changes);
    }
};
