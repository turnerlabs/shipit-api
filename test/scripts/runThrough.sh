#!/usr/bin/env bash

main() {
    local user
    local host='localhost:6055'
    local token="${TOKEN}"

    while true; do
        case "$1" in
            -h | --help )   usage 0 ;;
            -H | --host )   host="$2"; shift 2 ;;
            -u | --user )   user="$2"; shift 2 ;;
            -t | --token )  token="$2"; shift 2 ;;
            * ) break ;;
        esac
    done

    if [ -z "${user}" ]; then
        usage 0
    fi
    if [ -z "${token}" ]; then
        echo >&2 "Missing token!"
        usage 1
    fi

    # make the calls
    call 'POST' '/v1/shipments' '{"name": "foo", "group": "test", "contact_email": "test@turner.com"}'
    call 'POST' '/v1/shipment/foo/envVars' '{"name": "PORT", "value": 8080, "type": "basic"}'
    call 'POST' '/v1/shipment/foo/envVars' '{"name": "PORT_2", "value": 8080, "type": "basic"}'
    call 'POST' '/v1/shipment/foo/environments' '{"name": "bar"}'
    call 'PUT' '/v1/shipment/foo/environment/bar' '{"name": "baz"}'
    call 'POST' '/v1/shipment/foo/environment/baz/envVars' '{"name": "PORT", "value": "8080", "type": "basic"}'
    call 'POST' '/v1/shipment/foo/environment/baz/envVars' '{"name": "PORT_1", "value": 8080, "type": "basic"}'
    call 'POST' '/v1/shipment/foo/environment/baz/providers' '{"name": "ec2", "replicas": 20, "barge": "test"}'
    call 'POST' '/v1/shipment/foo/environment/baz/providers' '{"name": "east-1", "replicas": 20, "barge": "test-east"}'
    call 'PUT' '/v1/shipment/foo/environment/baz/provider/ec2' '{"replicas": 10}'
    call 'POST' '/v1/shipment/foo/environment/baz/provider/ec2/envVars' '{"name": "THING", "value": "SO COOL!!!", "type": "basic"}'
    call 'POST' '/v1/shipment/foo/environment/baz/containers' '{"name": "webapp", "image": "quay.io/turner/foo:bar"}'
    call 'PUT' '/v1/shipment/foo/environment/baz/container/webapp' '{"image": "quay.io/turner/foo:baz"}'
    call 'POST' '/v1/shipment/foo/environment/baz/container/webapp/ports' "@test/mocks/models/port.json"
    call 'PUT' '/v1/shipment/foo/environment/baz/container/webapp/port/PORT' '{"public_port": 8080, "ssl_arn": "bar"}'
    call 'POST' '/v1/bulk/shipments' "@test/mocks/models/bulk_shipment.json"
    call 'PUT' '/v1/shipment/foo/environment/back' '{"enableMonitoring": "false"}'
    call 'PUT' '/v1/shipment/foo/environment/back' '{"enableMonitoring": "true"}'
    echo 'Done!'
}

call() {
    local method=$1
    local path=$2
    local data=$3

    echo "curl ${method} ${host}${path}"
    local response=$(curl -sS -w %{http_code} -o /dev/null -X "${method}" -H'Content-Type: application/json' -H"x-username: ${user}" -H"x-token: ${token}" "http://${host}${path}" --data-binary "${data}")
    echo "> ${response}"
}

usage() {
    echo 'usage: runThrough.sh [options]'
    echo 'options:'
    echo ' -u, --user    required   User to run commands'
    echo ' -t, --token   optional   Token for user, defaults to value in $TOKEN'
    echo ' -H, --host    optional   Host, defaults to localhost:6055'
    exit ${1:-1}
}

main "$@"
