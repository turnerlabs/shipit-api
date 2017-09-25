const fs = require('fs'),
    path = require('path'),
    Sequelize = require('sequelize');

if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is required');
    process.exit(1);
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: process.env.SQL_LOGGING || false
});

let db = {};

// fs.readdirSync(__dirname)
//     .filter(file => {
//         return (file.indexOf(".") !== 0 && (file !== "index.js"));
//     })
//     .forEach(file => {
//         let model = sequelize.import(path.join(__dirname, file));
//         db[model.name] = model;
//     });

db.Shipment = sequelize.import('./shipment');
db.Environment = sequelize.import('./environment');
db.Provider = sequelize.import('./provider');
db.Container = sequelize.import('./container');
db.Port = sequelize.import('./port');
db.EnvVar = sequelize.import('./envVar');
db.Log = sequelize.import('./log');

// Object.keys(db).forEach(model => {
//     if ("associate" in db[model]) {
//         console.log(model)
//         db[model].associate(db);
//     }
// });

db.Log.associate(db);
db.EnvVar.associate(db);
db.Port.associate(db);
db.Container.associate(db);
db.Provider.associate(db);
db.Environment.associate(db);
db.Shipment.associate(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
