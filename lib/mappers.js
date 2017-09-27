module.exports = {
    shipment: env => {
        let shipment = env.parentShipment;
        delete env.parentShipment;

        shipment.environments = [];
        shipment.environments.push(env);

        return shipment;
    },
    reverseShipment: obj => {
        let env = obj.environments[0],
            temp = {
                name: env.name,
                buildToken: env.buildToken || null,
                enableMonitoring: env.enableMonitoring || false,
                iamRole: env.iamRole || "",
                envVars: env.envVars || [],
                containers: env.containers || [],
                providers: env.providers || [],
                parentShipment: {
                    name: obj.name,
                    group: obj.group,
                    envVars: obj.envVars || []
                }
            };

        // remove orm items
        if (temp.containers && temp.containers.length) {
            temp.containers = temp.containers.map(container => {
                if (container.ports && container.ports.length)
                    container.ports = container.ports.map(port => _removeDebris(port));

                if (container.envVars && container.envVars.length)
                    container.envVars = container.envVars.map(envVar => _removeDebris(envVar));

                return _removeDebris(container);
            });
        }
        if (temp.providers && temp.providers.length) {
            temp.providers = temp.providers.map(provider => {
                if (provider.envVars && provider.envVars.length)
                    provider.envVars = provider.envVars.map(envVar => _removeDebris(envVar));

                if (provider.ports)
                    delete provider.ports;

                return _removeDebris(provider);
            });
        }
        if (temp.envVars && temp.envVars.length) {
            temp.envVars = temp.envVars.map(envVar => _removeDebris(envVar));
        }
        if (temp.parentShipment.envVars && temp.parentShipment.envVars.length) {
            temp.parentShipment.envVars = temp.parentShipment.envVars.map(envVar => _removeDebris(envVar));
        }
        temp.parentShipment = _removeDebris(temp.parentShipment);

        temp = _removeDebris(temp);

        return temp;
    }
};

/**
 * _removeDebris - removes orm debris
 *
 * @param {Object} item  Item to remove debris from
 *
 * @returns {Object} Returns a clean item
 */
function _removeDebris(item) {
    let debris = ['composite', 'shipmentId', 'environmentId', 'containerId', 'providerId']

    debris.forEach(p => {
        if (typeof item[p] !== 'undefined') {
            delete item[p];
        }
    });

    return item;
}
