module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Environments').then(attributes => {
          if (!attributes.hasOwnProperty('iamRole')) {
            // iamRole
            changes.push(
                queryInterface.addColumn(
                    'Environments',
                    'iamRole',
                    {
                        type: DataTypes.STRING,
                        field: "iamRole",
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

        return Promise.all(changes);
    }
};
