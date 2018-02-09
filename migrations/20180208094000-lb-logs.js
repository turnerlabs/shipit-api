module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = [];

        queryInterface.describeTable('Environments').then(attributes => {
            if (!attributes.hasOwnProperty('access_logs_s3_bucket_name')) {
                changes.push(
                    queryInterface.addColumn(
                        'Environments',
                        'access_logs_s3_bucket_name',
                        {
                            type: DataTypes.STRING,
                            defaultValue: null,
                            allowNull: true
                        }
                    )
                );
            }
            if (!attributes.hasOwnProperty('access_logs_s3_bucket_prefix')) {
                changes.push(
                    queryInterface.addColumn(
                        'Environments',
                        'access_logs_s3_bucket_prefix',
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
            if (attributes.hasOwnProperty('access_logs_s3_bucket_name')) {
                changes.push(
                    queryInterface.removeColumn('Environments', 'access_logs_s3_bucket_name')
                );
            }
            if (attributes.hasOwnProperty('access_logs_s3_bucket_prefix')) {
                changes.push(
                    queryInterface.removeColumn('Environments', 'access_logs_s3_bucket_prefix')
                );
            }
        });

        return Promise.all(changes);
    }
};
