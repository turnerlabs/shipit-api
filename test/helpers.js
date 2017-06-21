const read = require('fs').readFileSync;

const config = {
    authn: 'http://auth.services.dmtio.net',
    authz: 'https://argonaut.turner.com'
}

module.exports = {
    getMockData: name => `${__dirname}/mocks/${name}.json`,
    getUrl: name => config[name],
    sortByName: (a, b) => a.name > b.name ? 1 : -1,
    fetchMockData: name => JSON.parse(read(`${__dirname}/mocks/${name}.json`, {encoding: "utf8"}))
};
