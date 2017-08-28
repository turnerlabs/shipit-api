const fields =['private_key', 'public_key_certificate', 'certificate_chain'];

module.exports = {
    up: function (queryInterface, DataTypes) {
        let changes = fields.map(field => {
            return queryInterface.changeColumn('Ports', field, {
                type: DataTypes.TEXT,
                set(val) {
                    this.setDataValue(field, val ? crypto.encrypt(val.toString()) : "");
                },
                get() {
                    let val = this.getDataValue(field);
                    return val ? crypto.decrypt(val) : "";
                }
            });
        });

        fields.forEach(field => {
            changes.push(queryInterface.sequelize.query(`UPDATE "Ports" SET "${field}" = ''`))
        });

        return Promise.all(changes);
    },

    down: function (queryInterface, DataTypes) {
        let changes = fields.map(field => queryInterface.changeColumn('Ports', field, { type: DataTypes.BLOB, defaultValue: "" }));

        return Promise.all(changes);
    }
};
