module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Shipments').then(attributes => {
          if (!attributes.hasOwnProperty('contact_email')) {
            // contact_email
            changes.push(
                queryInterface.addColumn(
                    'Shipments',
                    'contact_email',
                    {
                        type: DataTypes.STRING,
                        field: "contact_email",
                        defaultValue: ""
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
