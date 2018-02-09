# Model Overview

There are several types of objects that are related to a Shipment in ShipIt.


## Shipment

```json
{
    "name":         "String. Name of Shipment.",
    "group":        "String. Group who has authorization for the Shipment.",
    "envVars":      "Array. Env Var objects.",
    "environments": "Array. Environment objects."
}
```


## Environment

```json
{
    "name":                         "String. Name of the environment.",
    "buildToken":                   "String. Long lived auth token.",
    "enableMonitoring":             "Boolean. Whether alerts should be sent to DOC when Shipment is failing; defaults to true.",
    "access_logs_s3_bucket_name":   "String. The name of the bucket to be used, example harbor-lb-access-logs-news-ec2. For example, the default value is `harbor-lb-access-logs-${barge}-${location}`. Must be a string value that is a DNS compliant name https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html",
    "access_logs_s3_bucket_prefix": "String. The prefix for the path for the access logs from the load balancer. For example, the default value is `harbor-lb-access-logs-${barge}-${location}`. Must be a string value that is a DNS compliant name https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html",
    "iamRole":                      "String. IAM Role ARN that the container will assume for permissions to cloud resources",
    "envVars":                      "Array. Env Var objects.",
    "annotations":                  "Array. Annotation objects.",
    "containers":                   "Array. Container objects.",
    "ports":                        "Array. Port objects.",
    "providers":                    "Array. Provider objects."
}
```


## Env Var

```json
{
    "name":  "String. The name, or key of the Env Var",
    "value": "String. Value of the Env Var, or value that to use in Discover.",
    "type":  "String. Either basic, discover, or hidden; defaults to basic."
}
```


## Annotation

```json
{
    "key":  "String. The key, or name, of the Annotation.",
    "value": "String. Value of the Annotation."
}
```


## Container

```json
{
    "name":    "String. Name of the Container.",
    "image":   "String. Location of image; docker_image_name:tag",
    "ports":   "Array. Port objects",
    "envVars": "Array. Env Var objects."
}
```


## Port

```json
{
    "name":                   "String. Name of the port object. This value will be used as the Env Var in the Container.",
    "value":                  "Number. A number that is a valid port (1-65535).",
    "primary":                "Boolean. When true, this Port's healthcheck value will be used by the load balancer",
    "protocol":               "String. The protocol the port uses. Valid values; http, https, and tcp",
    "healthcheck":            "String. The value of the health check structured in a potentially protocol-dependent way",
    "external":               "Boolean. Whether the port should be exposed outside on the Kube Service. Typically, at least one port is exposed.",
    "public_vip":             "Boolean. Whether the load balancer that is created is internal only (default) or publicly available.",
    "private_key":            "String. Private key for a SSL Certificate (pem encoded)",
    "public":                 "Boolean. Whether the port should be exposed outside the VPC.",
    "public_key_certificate": "String. Public key for a SSL Certificate (pem encoded)",
    "certificate_chain":      "String. SSL certificate chain (pem encoded)",
    "enable_proxy_protocol":  "Boolean. Should the load balancer forward client IP information via Proxy Protocol scheme (only applies when protocol is tcp); defaults false.",
    "ssl_arn":                "String. ARN for an AWS ACM SSL Certificate or manually upload IAM server certificate",
    "ssl_management_type":    "String. SSL management type, currently supporting 'iam' or 'acm'",
    "healthcheck_timeout":    "Integer. Number of seconds the health check should wait before considering the service to have timed out. Defaults to 1.",
    "healthcheck_interval":    "Integer. Number of seconds the health check should wait between healthcheck runs. Defaults to 10.",
    "lbtype":                 "String. Type of load balancer to create. Defaults to 'default'."
}
```


## Provider

```json
{
    "name":     "String. Name of Provider (ec2, 56m, cop, azure, google, etc.)",
    "replicas": "Integer. Number of replicas to run; 0 to shut it down, 1 or more to make it active.",
    "barge":    "String. Name of the Barge that will run the Shipment.",
    "envVars":  "Array. Env Var objects."
}
```
