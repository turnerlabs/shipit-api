const read = require('fs').readFileSync;

const config = {
    authn: 'http://auth.services.dmtio.net',
    authz: 'https://argonaut.turner.com'
}

module.exports = {
    byKey: (a, b) => a.key > b.key ? 1 : -1,
    byName: (a, b) => a.name > b.name ? 1 : -1,
    fetchMockData: name => JSON.parse(read(`${__dirname}/mocks/${name}.json`, {encoding: "utf8"})),
    getMockData: name => `${__dirname}/mocks/${name}.json`,
    getUrl: name => config[name]
};
