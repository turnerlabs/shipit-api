var helpers = require('./helpers');
var schema = module.exports;

schema.envVar = {
  _metadata: {
    userEditable: true,
    find: true,
    default: 'name'
  },
  name: {
    type: String,
    unique: true,
    create: true,
    update: false,
    required: true,
    test: helpers.isValidEnvVar,
    description: "The name of the variable in the (unix?) environment",
    requirement: 'Must be a string starting with [A-Za-z_] and using only [A-Za-z0-9_]'
  },
  value: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: true,
    test: helpers.isString,
    description: "The value the envvar gets set to",
    requirement: "Must be a valid string",
  },
  type: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: 'basic',
    test: helpers.isValidEnvVarType,
    description: "The type of environment variable (basic, discover, or hidden), defaults 'basic'",
    requirement: "Must be 'basic', 'discover', or 'hidden'"
  }
}

schema.container = {
  _metadata: {
    userEditable: true,
    find: true,
    default: 'name'
  },
  name: {
    type: String,
    unique: true,
    create: true,
    update: false,
    required: true,
    test: helpers.isValidName,
    description: "Name of container (probably best to be role, like api, db)",
    requirement: 'Must be a string using only [A-Za-z0-9_-]'
  },
  image: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: true,
    test: helpers.isValidDockerLink,
    description: "The Docker link to the Docker container",
    requirement: "Must be a valid docker link, formatted: 'registry.domain/docker-image-name:tag' (must be a DNS label)"
  },
  ports: ['port'],
  envVars: ['envVar'],
}

schema.provider = {
  _metadata: {
    userEditable: true,
    find: true,
    default: 'name'
  },
  name: {
    type: String,
    unique: true,
    create: true,
    update: false,
    required: true,
    test: helpers.isValidProvider,
    description: "Which provider (ec2, 56m, etc)",
    requirement: "Must be a valid provider (ec2 or 56m today)"
  },
  replicas: {
    type: Number,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: 0,
    test: helpers.isValidInteger,
    description: "Number of containers to run in this provider, defaults 0",
    requirement: "Must be 0 or positive Integer"
  },
  barge: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: true,
    test: helpers.isString,
    description: "The name of the barge, the provider should be deployed on.",
    requirement: "Must be a string."
  },
  envVars: ['envVar']
}

schema.port = {
  _metadata: {
    userEditable: true,
    find: true,
    default: 'name'
  },
  name: {
    type: String,
    unique: true,
    create: true,
    update: true,
    required: true,
    test: helpers.isValidName,
    description: "Identifier of port",
    requirement: 'Must be a string using only [A-Za-z0-9_-]'
  },
  value: {
    type: Number,
    unique: true,
    create: true,
    update: true,
    required: true,
    test: helpers.isValidPort,
    description: "The value for this port",
    requirement: "must be a valid port (between 1-65535)"
  },
  protocol: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: 'http',
    test: helpers.isValidHealthcheckProtocol,
    description: "Protocol of healthcheck on the port, defaults http",
    requirement: "Must be a valid healthcheck protocol (http, https or tcp)"
  },
  healthcheck: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: "",
    test: helpers.isString,
    description: "Value of healthcheck (structured in a potentially protocol-dependent way), defaults empty string",
    requirement: 'Must be a valid String'
  },
  external: {
      type: Boolean,
      unique: false,
      create: true,
      update: true,
      required: false,
      default: true,
      test: helpers.isBoolean,
      description: 'Boolean, if should be exposed on the ELB, defaults true',
      requirement: 'must be a valid boolean'
  },
  primary: {
      type: Boolean,
      unique: false,
      create: true,
      update: true,
      required: false,
      'default': false,
      test: helpers.isBoolean,
      description: 'Boolean, if true then should be primary healthcheck for app at the ELB layer.',
      requirement: 'must be a valid boolean'
  },
  public_vip: {
    type: Boolean,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: false,
    test: helpers.isBooleanAndExternal,
    description: "Boolean, if should be exposed outside vpc or not, defaults false. Can only be true if External is true.",
    requirement: "must be a valid boolean, and can only be true if external is true"
  },
  public_port: {
    type: Number,
    unique: false,
    create: true,
    update: true,
    required: false,
    test: helpers.isValidPort,
    description: "The port value for the ELB",
    requirement: "must be a valid port (between 1-65535)"
  },
  enable_proxy_protocol: {
      type: Boolean,
      unique: false,
      create: true,
      update: true,
      required: false,
      default: false,
      test: helpers.isBoolean,
      description: 'Boolean, if ELB should forward client IP information via Proxy Protocol scheme (only applies to TCP ELBs), defaults false',
      requirement: 'must be a valid boolean'
  },
  private_key: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: "",
    auth: true,
    test: helpers.isString,
    description: 'Private key for a SSL Certificate (pem encoded)',
    requirement: 'Must be a valid String'
  },
  public_key_certificate: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: "",
    auth: true,
    test: helpers.isString,
    description: 'Public key for a SSL Certificate (pem encoded)',
    requirement: 'Must be a valid String'
  },
  certificate_chain: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: "",
    auth: true,
    test: helpers.isString,
    description: 'SSL certificate chain (pem encoded)',
    requirement: 'Must be a valid String'
  },
  ssl_arn: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: "",
    test: helpers.isString,
    description: 'ARN for an AWS ACM SSL Certificate or manually upload IAM server certificate',
    requirement: 'Must be a valid String'
  },
  ssl_management_type: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: false,
    default: "iam",
    test: helpers.isValidSslManager,
    description: 'SSL management type.',
    requirement: 'Must be a valid SSL Management type (iam or acm)'
  }
}

schema.environment = {
  _metadata: {
    userEditable: true,
    find: true,
    default: 'name'
  },
  name: {
    type: String,
    unique: true,
    create: true,
    update: false,
    required: true,
    test: helpers.isValidName,
    description: "Name of the environment",
    requirement: 'Must be a string using only [A-Za-z0-9_-]'
  },
  buildToken: {
    type: String,
    create: false,
    update: false,
    required: true,
    generator: helpers.generateToken,
    test: helpers.isToken,
    auth: true,
    description: "Long lived auth token",
    requirement: "Must be a random string",
  },
  dockercfg: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: false,
    test: helpers.isString,
    description: "The docker cfg value",
    requirement: "Must be base64 encoded and be a valid docker config file",
    auth: true
  },
  envVars: ['envVar'],
  containers: ['container'],
  providers: ['provider']
}

schema.shipment = {
  _metadata: {
    userEditable: true,
    find: true,
    topLevel: true,
    default: 'name'
  },
  name: {
    type: String,
    unique: true,
    create: true,
    update: false,
    required: true,
    test: helpers.isValidName,
    description: "Name of shipment",
    requirement: 'Must be a string using only [A-Za-z0-9_-]'
  },
  group: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: true,
    test: helpers.isString,
    description: "The group that owns this shipment",
    requirement: "Must be a valid group from argonaut.turner.com that the user belongs to"
  },
  envVars: ['envVar'],
  environments: ['environment']
}

schema.logs = {
  _metadata: {
    userEditable: true,
    find: true,
    topLevel: true,
    default: 'name'
  },
  shipment: {
    type: String,
    unique: true,
    create: true,
    update: false,
    required: true,
    test: helpers.isValidName,
    description: "Name of shipment for the difference.",
    requirement: 'Must be a string using only [A-Za-z0-9_-]'
  },
  environment: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: true,
    test: helpers.isString,
    description: "Name of environment for the difference.",
    requirement: "Must be a valid group from argonaut.turner.com that the user belongs to"
  },
  diff: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: true,
    test: helpers.isString,
    description: "The difference, stored as a JSON string.",
    requirement: "Must be a valid string."
  },
  user: {
    type: String,
    unique: false,
    create: true,
    update: true,
    required: true,
    test: helpers.isString,
    description: "The user that made the change.",
    requirement: "Must be a valid string."
  },
  updated: {
    type: Number,
    unique: false,
    create: true,
    update: true,
    required: true,
    test: helpers.isValidInteger,
    description: "The timestamp the change was made.",
    requirement: "Must be a valid number."
  },

}
