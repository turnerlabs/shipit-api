# Getting Started

To use the ShipIt API directly will require a tool such as cURL.

### JQ

These examples will assume that you have the jq binary installed in your path. JQ is a lightweight and flexible
command-line JSON processor. If you’re doing anything with JSON on the command-line, make sure you [install jq][jq].


## Authentication and Authorization

Most calls to the ShipIt API require authorization, and most operations are authorized by Argonauts. To authenticate,
you will need to get a token.

```sh
TOKEN=$(curl -sSXPOST -H"Content-Type: application/json" \
    http://auth.services.dmtio.net/v1/auth/gettoken \
    --data-binary '{"username": "my_username", "password": "1234"}' |jq -r .token)
# If your username is different than your NT username, then make sure to also do this
USER=my_username
```


## Create a Shipment

Using the [API reference][api] you can learn all the various endpoints available. But, here are some commonly used
endpoints that should hopefully provide insight into how to use ShipIt.

```sh
# Create the base Shipment
curl -sSXPOST -H'Content-Type: application/json' \
    -H"x-username: ${USER}" -H"x-token: ${TOKEN}" \
    http://shipit.services.dmtio.net/v1/shipments \
    --data-binary '{"group": "mss", "name": "mss-hello-world-app", "contact_email": "your-email@turner.com"}'

# Add an Env Var to the Shipment
curl -sSXPOST -H'Content-Type: application/json' \
    -H"x-username: ${USER}" -H"x-token: ${TOKEN}" \
    http://shipit.services.dmtio.net/v1/shipment/mss-hello-world-app/envVars \
    --data-binary '{"name": "CUSTOMER", "value": "mss"}'

# Now create an Environment.
curl -XPOST -H'Content-Type: application/json' \
    -H"x-username: ${USER}" -H"x-token: ${TOKEN}" \
    http://shipit.services.dmtio.net/v1/shipment/mss-hello-world-app/environments \
    --data-binary '{"name": "dev"}'

# Add an Env Var to the dev Environment
curl -XPOST -H'Content-Type: application/json' \
    -H"x-username: ${USER}" -H"x-token: ${TOKEN}" \
    http://shipit.services.dmtio.net/v1/shipment/mss-hello-world-app/environment/dev/envVars \
    --data-binary '{"name": "NODE_ENV", "value": "development"}'

# Add a Container. Your container can exist in any Docker registry that our infrastructure can access
curl -XPOST -H'Content-Type: application/json' \
    -H"x-username: ${USER}" -H"x-token: ${TOKEN}" \
    http://shipit.services.dmtio.net/v1/shipment/mss-hello-world-app/environment/dev/containers \
    --data-binary '{"name": "mss-hello-world", "image": "registry.services.dmtio.net/mss-hello-world:0.1.0"}'

# Add a Port. Ports are one of the more complex pieces in ShipIt, make sure to read the documentation on Models to learn more
curl -XPOST -H'Content-Type: application/json' \
    -H"x-username: ${USER}" -H"x-token: ${TOKEN}" \
    http://shipit.services.dmtio.net/v1/shipment/mss-hello-world-app/environment/dev/ports \
    --data-binary '{"name": "main", "container": "mss-hello-world", "value": 8000, "protocol": "http", "healthcheck": "/hc", "public": false, "public_port": 80}'

# Add a Provider.
curl -XPOST -H'Content-Type: application/json' \
    -H"x-username: ${USER}" -H"x-token: ${TOKEN}" \
    http://shipit.services.dmtio.net/v1/shipment/mss-hello-world-app/environment/dev/providers \
    --data-binary '{"name": "ec2", "replicas": 2}'
```





[jq]: https://stedolan.github.io/jq/
[api]: API_REFERENCE.md
