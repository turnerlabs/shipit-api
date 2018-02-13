const urlParse = require('url').parse,
    Sequelize = require('sequelize'),
    mode = process.env.NODE_ENV;

if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is required');
    process.exit(1);
}

const hostname = urlParse(process.env.DATABASE_URL).hostname;

if ( !mode || (mode === 'test' && hostname !== 'localhost') || (mode === 'production' && hostname === 'localhost') ) {
    console.error('Error: Mode does not match database URL!');
    process.exit(1);
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: process.env.SQL_LOGGING || false
});

let db = {};

db.Shipment = sequelize.import('./shipment');
db.Environment = sequelize.import('./environment');
db.Provider = sequelize.import('./provider');
db.Container = sequelize.import('./container');
db.Port = sequelize.import('./port');
db.EnvVar = sequelize.import('./envVar');
db.Log = sequelize.import('./log');

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
