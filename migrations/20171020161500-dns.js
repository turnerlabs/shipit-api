module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Environments').then(attributes => {
          if (!attributes.hasOwnProperty('dns')) {
            // dns
            changes.push(
                queryInterface.addColumn(
                    'Environments',
                    'dns',
                    {
                        type: DataTypes.STRING,
                        field: "dns",
                        defaultValue: "cluster",
                        get() {
                            return this.getDataValue('dns') || this.getDataValue('value');
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

        return Promise.all(changes);
    }
};
