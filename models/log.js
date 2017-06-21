const crypto = require('../lib/crypto');

module.exports = (sequelize, DataTypes) => {
   let Log = sequelize.define(
        "Log",
        {
            shipment: {
                type: DataTypes.STRING
            },
            environment: {
                type: DataTypes.STRING
            },
            hidden: {
                type: DataTypes.STRING
            },
            diff: {
                type: DataTypes.TEXT,
                set(val) {
                    this.setDataValue('diff', val ? crypto.encrypt(val.toString()) : val);
                },
                get() {
                    let val = this.getDataValue('diff');
                    return val ? crypto.decrypt(val) : val;
                }
            },
            user: {
                type: DataTypes.STRING
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
        },
        {
            timestamps: true,
            createdAt: false,
            updatedAt: 'timestamp',
            classMethods: {
                associate: models => {}
            }
        }
    );

    return Log;
};
