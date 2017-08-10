const path = require('path'),
    child_process = require('child_process'),
    Promise = require('bluebird'),
    Sequelize = require('sequelize'),
    Umzug = require('umzug');

if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is required');
    process.exit(1);
}

// Module exports
module.exports = {
    status: cmdStatus,
    migrate: cmdMigrate
}

const sequelize = new Sequelize(process.env.DATABASE_URL);

const umzug = new Umzug({
    storage: 'sequelize',
    storageOptions: {
        sequelize: sequelize
    },
    migrations: {
        params: [
            sequelize.getQueryInterface(),
            sequelize.constructor,
        ],
        path: './migrations',
        pattern: /\.js$/
    },
    logging: null
});

umzug.on('migrating', logUmzugEvent('migrating'));
umzug.on('migrated',  logUmzugEvent('migrated'));
umzug.on('reverting', logUmzugEvent('reverting'));
umzug.on('reverted',  logUmzugEvent('reverted'));

function logUmzugEvent(eventName) {
    return (name, migration) => console.log(`${eventName.toUpperCase()}: '${name}'`);
}

function cmdStatus() {
    let result = {};

    return umzug.executed()
        .then(executed => {
            result.executed = executed;
            return umzug.pending();
        })
        .then(pending => {
            result.pending = pending;
            return result;
        })
        .then(({ executed, pending }) => {
            executed = executed.map(migration => {
                migration.name = path.basename(migration.file, '.js');
                return migration;
            });

            pending = pending.map(migration => {
                migration.name = path.basename(migration.file, '.js');
                return migration;
            });

            const current = executed.length > 0 ? executed[0].file : '<NO_MIGRATION>';
            const status = {
                current: current,
                executed: executed.map(migration => migration.file),
                pending: pending.map(migration => migration.file)
            };

            console.log(JSON.stringify(status, null, 2));

            return { executed, pending };
        });
}

function cmdMigrate() {
    return umzug.up();
}
