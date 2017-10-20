module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Environments').then(attributes => {
          if (!attributes.hasOwnProperty('cnames')) {
            // iamRole
            changes.push(
                queryInterface.addColumn(
                    'Environments',
                    'cnames',
                    {
                        type: DataTypes.STRING,
                        field: "cnames",
                        defaultValue: "",
                        get() {
                            return this.getDataValue('cnames') || this.getDataValue('value');
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
