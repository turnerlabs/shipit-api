# ShipIt API

[![CircleCI](https://circleci.com/gh/turnerlabs/shipit-api/tree/master.svg?style=shield)](https://circleci.com/gh/turnerlabs/shipit-api/tree/master)

API Version `2.1.0`

[Additional documentation](http://blog.harbor.inturner.io/docs/shipit/)


### GET `/v1/shipments`

> Returns an array of all shipments

### GET `/v1/shipment/:name`

> Returns an object with information about a particular shipment

### GET `/v1/shipment/:Shipment/environment/:name`

> Returns an environment object, with a parentShipment field containing the parent shipment

### GET `/v1/envVar/search`

> Returns a shipment environment, that contains the envVar name and value

### GET `/v1/logs/shipment/:Shipment/environment/:Environment`

> Returns the changes for a shipment and environment pair.

### GET `/v1/logs/shipment/:Shipment`

> Returns all changes for a shipment. Same as searching `/v`1`/logs/shipment/:Shipment/environment/parent`

### POST `/v1/shipments`

> Creates new shipment `:Shipment`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    true
- description: Name of shipment
- requirement: Must be a string using only [A-Za-z0-9_-]

group
- type:        String
- required:    true
- description: The group that owns this shipment
- requirement: Must be a valid group from argonaut.turner.com that the user belongs to

```


### POST `/v1/shipment/:Shipment/envVars`

> Creates new envVar `:EnvVar` under `/shipment/:Shipment`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    true
- description: The name of the variable in the (unix?) environment
- requirement: Must be a string starting with [A-Za-z_] and using only [A-Za-z0-9_]

value
- type:        String
- required:    true
- description: The value the envvar gets set to
- requirement: Must be a valid string

type
- type:        String
- required:    false
- description: The type of environment variable (basic, discover, or hidden), defaults
               'basic'
- requirement: Must be 'basic', 'discover', or 'hidden'

```


### POST `/v1/shipment/:Shipment/environments`

> Creates new environment `:Environment` under `/shipment/:Shipment`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    true
- description: Name of the environment
- requirement: Must be a string using only [A-Za-z0-9_-]

dockercfg
- type:        String
- required:    false
- description: The docker cfg value
- requirement: Must be base64 encoded and be a valid docker config file

```


### POST `/v1/shipment/:Shipment/environment/:Environment/envVars`

> Creates new envVar `:EnvVar` under `/shipment/:Shipment/environment/:Environment`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    true
- description: The name of the variable in the (unix?) environment
- requirement: Must be a string starting with [A-Za-z_] and using only [A-Za-z0-9_]

value
- type:        String
- required:    true
- description: The value the envvar gets set to
- requirement: Must be a valid string

type
- type:        String
- required:    false
- description: The type of environment variable (basic, discover, or hidden), defaults
               'basic'
- requirement: Must be 'basic', 'discover', or 'hidden'

```


### POST `/v1/shipment/:Shipment/environment/:Environment/containers`

> Creates new container `:Container` under `/shipment/:Shipment/environment/:Environment`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    true
- description: Name of container (probably best to be role, like api, db)
- requirement: Must be a string using only [A-Za-z0-9_-]

image
- type:        String
- required:    true
- description: The Docker link to the Docker container
- requirement: Must be a valid docker link, formatted:
               'registry.domain/docker-image-name:tag' (must be a DNS label)

```


### POST `/v1/shipment/:Shipment/environment/:Environment/container/:Container/ports`

> Creates new port `:Port` under `/shipment/:Shipment/environment/:Environment/container/:Container`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    true
- description: Identifier of port
- requirement: Must be a string using only [A-Za-z0-9_-]

value
- type:        Number
- required:    true
- description: The value for this port
- requirement: must be a valid port (between 1-65535)

protocol
- type:        String
- required:    false
- description: Protocol of healthcheck on the port, defaults http
- requirement: Must be a valid healthcheck protocol (http, https or tcp)

healthcheck
- type:        String
- required:    false
- description: Value of healthcheck (structured in a potentially protocol-dependent way),
               defaults empty string
- requirement: Must be a valid String

external
- type:        Boolean
- required:    false
- description: Boolean, if should be exposed on the ELB, defaults true
- requirement: must be a valid boolean

primary
- type:        Boolean
- required:    false
- description: Boolean, if true then should be primary healthcheck for app at the ELB
               layer.
- requirement: must be a valid boolean

public_vip
- type:        Boolean
- required:    false
- description: Boolean, if should be exposed outside vpc or not, defaults false. Can only
               be true if External is true.
- requirement: must be a valid boolean, and can only be true if external is true

public_port
- type:        Number
- required:    false
- description: The port value for the ELB
- requirement: must be a valid port (between 1-65535)

enable_proxy_protocol
- type:        Boolean
- required:    false
- description: Boolean, if ELB should forward client IP information via Proxy Protocol
               scheme (only applies to TCP ELBs), defaults false
- requirement: must be a valid boolean

private_key
- type:        String
- required:    false
- description: Private key for a SSL Certificate (pem encoded)
- requirement: Must be a valid String

public_key_certificate
- type:        String
- required:    false
- description: Public key for a SSL Certificate (pem encoded)
- requirement: Must be a valid String

certificate_chain
- type:        String
- required:    false
- description: SSL certificate chain (pem encoded)
- requirement: Must be a valid String

ssl_arn
- type:        String
- required:    false
- description: ARN for an AWS ACM SSL Certificate or manually upload IAM server certificate
- requirement: Must be a valid String

ssl_management_type
- type:        String
- required:    false
- description: SSL management type.
- requirement: Must be a valid SSL Management type (iam or acm)

```


### POST `/v1/shipment/:Shipment/environment/:Environment/container/:Container/envVars`

> Creates new envVar `:EnvVar` under `/shipment/:Shipment/environment/:Environment/container/:Container`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    true
- description: The name of the variable in the (unix?) environment
- requirement: Must be a string starting with [A-Za-z_] and using only [A-Za-z0-9_]

value
- type:        String
- required:    true
- description: The value the envvar gets set to
- requirement: Must be a valid string

type
- type:        String
- required:    false
- description: The type of environment variable (basic, discover, or hidden), defaults
               'basic'
- requirement: Must be 'basic', 'discover', or 'hidden'

```


### POST `/v1/shipment/:Shipment/environment/:Environment/providers`

> Creates new provider `:Provider` under `/shipment/:Shipment/environment/:Environment`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    true
- description: Which provider (ec2, 56m, etc)
- requirement: Must be a valid provider (ec2 or 56m today)

replicas
- type:        Number
- required:    false
- description: Number of containers to run in this provider, defaults 0
- requirement: Must be 0 or positive Integer

barge
- type:        String
- required:    true
- description: The name of the barge, the provider should be deployed on.
- requirement: Must be a string.

```


### POST `/v1/shipment/:Shipment/environment/:Environment/provider/:Provider/envVars`

> Creates new envVar `:EnvVar` under `/shipment/:Shipment/environment/:Environment/provider/:Provider`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    true
- description: The name of the variable in the (unix?) environment
- requirement: Must be a string starting with [A-Za-z_] and using only [A-Za-z0-9_]

value
- type:        String
- required:    true
- description: The value the envvar gets set to
- requirement: Must be a valid string

type
- type:        String
- required:    false
- description: The type of environment variable (basic, discover, or hidden), defaults
               'basic'
- requirement: Must be 'basic', 'discover', or 'hidden'

```


### POST `/v1/logs`

> Creates new logs `:Logs`. Returns new object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
shipment
- type:        String
- required:    true
- description: Name of shipment for the difference.
- requirement: Must be a string using only [A-Za-z0-9_-]

environment
- type:        String
- required:    true
- description: Name of environment for the difference.
- requirement: Must be a valid group from argonaut.turner.com that the user belongs to

diff
- type:        String
- required:    true
- description: The difference, stored as a JSON string.
- requirement: Must be a valid string.

user
- type:        String
- required:    true
- description: The user that made the change.
- requirement: Must be a valid string.

updated
- type:        Number
- required:    true
- description: The timestamp the change was made.
- requirement: Must be a valid number.

```


### PUT `/v1/shipment/:name`

> Updates shipment `:Shipment`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
group
- type:        String
- required:    false
- description: The group that owns this shipment
- requirement: Must be a valid group from argonaut.turner.com that the user belongs to

```


### PUT `/v1/shipment/:Shipment/envVar/:name`

> Updates envVar `:EnvVar` under `/shipment/:Shipment`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
value
- type:        String
- required:    false
- description: The value the envvar gets set to
- requirement: Must be a valid string

type
- type:        String
- required:    false
- description: The type of environment variable (basic, discover, or hidden), defaults
               'basic'
- requirement: Must be 'basic', 'discover', or 'hidden'

```


### PUT `/v1/shipment/:Shipment/environment/:name`

> Updates environment `:Environment` under `/shipment/:Shipment`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
dockercfg
- type:        String
- required:    false
- description: The docker cfg value
- requirement: Must be base64 encoded and be a valid docker config file

```


### PUT `/v1/shipment/:Shipment/environment/:Environment/envVar/:name`

> Updates envVar `:EnvVar` under `/shipment/:Shipment/environment/:Environment`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
value
- type:        String
- required:    false
- description: The value the envvar gets set to
- requirement: Must be a valid string

type
- type:        String
- required:    false
- description: The type of environment variable (basic, discover, or hidden), defaults
               'basic'
- requirement: Must be 'basic', 'discover', or 'hidden'

```


### PUT `/v1/shipment/:Shipment/environment/:Environment/container/:name`

> Updates container `:Container` under `/shipment/:Shipment/environment/:Environment`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
image
- type:        String
- required:    false
- description: The Docker link to the Docker container
- requirement: Must be a valid docker link, formatted:
               'registry.domain/docker-image-name:tag' (must be a DNS label)

```


### PUT `/v1/shipment/:Shipment/environment/:Environment/container/:Container/port/:name`

> Updates port `:Port` under `/shipment/:Shipment/environment/:Environment/container/:Container`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
name
- type:        String
- required:    false
- description: Identifier of port
- requirement: Must be a string using only [A-Za-z0-9_-]

value
- type:        Number
- required:    false
- description: The value for this port
- requirement: must be a valid port (between 1-65535)

protocol
- type:        String
- required:    false
- description: Protocol of healthcheck on the port, defaults http
- requirement: Must be a valid healthcheck protocol (http, https or tcp)

healthcheck
- type:        String
- required:    false
- description: Value of healthcheck (structured in a potentially protocol-dependent way),
               defaults empty string
- requirement: Must be a valid String

external
- type:        Boolean
- required:    false
- description: Boolean, if should be exposed on the ELB, defaults true
- requirement: must be a valid boolean

primary
- type:        Boolean
- required:    false
- description: Boolean, if true then should be primary healthcheck for app at the ELB
               layer.
- requirement: must be a valid boolean

public_vip
- type:        Boolean
- required:    false
- description: Boolean, if should be exposed outside vpc or not, defaults false. Can only
               be true if External is true.
- requirement: must be a valid boolean, and can only be true if external is true

public_port
- type:        Number
- required:    false
- description: The port value for the ELB
- requirement: must be a valid port (between 1-65535)

enable_proxy_protocol
- type:        Boolean
- required:    false
- description: Boolean, if ELB should forward client IP information via Proxy Protocol
               scheme (only applies to TCP ELBs), defaults false
- requirement: must be a valid boolean

private_key
- type:        String
- required:    false
- description: Private key for a SSL Certificate (pem encoded)
- requirement: Must be a valid String

public_key_certificate
- type:        String
- required:    false
- description: Public key for a SSL Certificate (pem encoded)
- requirement: Must be a valid String

certificate_chain
- type:        String
- required:    false
- description: SSL certificate chain (pem encoded)
- requirement: Must be a valid String

ssl_arn
- type:        String
- required:    false
- description: ARN for an AWS ACM SSL Certificate or manually upload IAM server certificate
- requirement: Must be a valid String

ssl_management_type
- type:        String
- required:    false
- description: SSL management type.
- requirement: Must be a valid SSL Management type (iam or acm)

```


### PUT `/v1/shipment/:Shipment/environment/:Environment/container/:Container/envVar/:name`

> Updates envVar `:EnvVar` under `/shipment/:Shipment/environment/:Environment/container/:Container`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
value
- type:        String
- required:    false
- description: The value the envvar gets set to
- requirement: Must be a valid string

type
- type:        String
- required:    false
- description: The type of environment variable (basic, discover, or hidden), defaults
               'basic'
- requirement: Must be 'basic', 'discover', or 'hidden'

```


### PUT `/v1/shipment/:Shipment/environment/:Environment/provider/:name`

> Updates provider `:Provider` under `/shipment/:Shipment/environment/:Environment`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
replicas
- type:        Number
- required:    false
- description: Number of containers to run in this provider, defaults 0
- requirement: Must be 0 or positive Integer

barge
- type:        String
- required:    false
- description: The name of the barge, the provider should be deployed on.
- requirement: Must be a string.

```


### PUT `/v1/shipment/:Shipment/environment/:Environment/provider/:Provider/envVar/:name`

> Updates envVar `:EnvVar` under `/shipment/:Shipment/environment/:Environment/provider/:Provider`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
value
- type:        String
- required:    false
- description: The value the envvar gets set to
- requirement: Must be a valid string

type
- type:        String
- required:    false
- description: The type of environment variable (basic, discover, or hidden), defaults
               'basic'
- requirement: Must be 'basic', 'discover', or 'hidden'

```


### PUT `/v1/logs/:name`

> Updates logs `:Logs`. Returns updated object if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

#### Fields

```
environment
- type:        String
- required:    false
- description: Name of environment for the difference.
- requirement: Must be a valid group from argonaut.turner.com that the user belongs to

diff
- type:        String
- required:    false
- description: The difference, stored as a JSON string.
- requirement: Must be a valid string.

user
- type:        String
- required:    false
- description: The user that made the change.
- requirement: Must be a valid string.

updated
- type:        Number
- required:    false
- description: The timestamp the change was made.
- requirement: Must be a valid number.

```


### PUT `/v1/shipment/:Shipment/environment/:name/buildToken`

> Rolls the build token for this Shipment. Returns the Shipment or error

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/shipment/:name`

> Deletes shipment `:Shipment`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/shipment/:Shipment/envVar/:name`

> Deletes envVar `:EnvVar` under `/shipment/:Shipment`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/shipment/:Shipment/environment/:name`

> Deletes environment `:Environment` under `/shipment/:Shipment`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/shipment/:Shipment/environment/:Environment/envVar/:name`

> Deletes envVar `:EnvVar` under `/shipment/:Shipment/environment/:Environment`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/shipment/:Shipment/environment/:Environment/container/:name`

> Deletes container `:Container` under `/shipment/:Shipment/environment/:Environment`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/shipment/:Shipment/environment/:Environment/container/:Container/port/:name`

> Deletes port `:Port` under `/shipment/:Shipment/environment/:Environment/container/:Container`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/shipment/:Shipment/environment/:Environment/container/:Container/envVar/:name`

> Deletes envVar `:EnvVar` under `/shipment/:Shipment/environment/:Environment/container/:Container`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/shipment/:Shipment/environment/:Environment/provider/:name`

> Deletes provider `:Provider` under `/shipment/:Shipment/environment/:Environment`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/shipment/:Shipment/environment/:Environment/provider/:Provider/envVar/:name`

> Deletes envVar `:EnvVar` under `/shipment/:Shipment/environment/:Environment/provider/:Provider`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```

### DELETE `/v1/logs/:name`

> Deletes logs `:Logs`. Returns success status if successful or error otherwise

#### Headers

```
x-username
- type:        String
- required:    true
- description: The username of authenticated user
- requirement: Must be a valid turner ldap username

x-token
- type:        String
- required:    true
- description: The token of authenticated user
- requirement: Must be a valid token for username authenticated against
               http://auth.services.dmtio.net

```


Readme generated by running `./generate-readme > README.md` in repository
