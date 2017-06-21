let original = [
    {
        name: "del",
        composite: "test-group-del",
        envVars: [{name: "OLD", value: "asdf", composite: "test-group-del-OLD"}]
    },
    {
        name: "bar",
        composite: "test-group-bar",
        envVars: [{name: "DEL", value: "remove", composite: "test-group-bar-DEL"}]
    }
];

let newStuff = [
    {
        name: "foo",
        envVars: [{name: "PORT", value: 80}]
    },
    {
        name: "bar"
    }
];

let expected = [
    'models.Container.destroy({id: test-group-del}, {t: 1234})',
    'models.EnvVar.destroy({id: test-group-bar-DEL}, {t: 1234})',
    'models.Container.upsert({id: test-group-foo, values: {"name":"foo","envVars":[{"name":"PORT","value":80}]}}, {t: 1234})',
    'models.EnvVar.upsert({id: test-group-foo-PORT, values: {"name":"PORT","value":80}}, {t: 1234})',
    'models.Container.upsert({id: test-group-bar, values: {"name":"bar"}}, {t: 1234})'
];

/**** TEST ****/
let results = getDeletes('Container', original, newStuff, 1234);
results = results.concat(getUpserts('Container', newStuff, 'test-group', 1234));
/**** /test ****/

/**** END ****/
console.log(JSON.stringify(results, 0, 2));
results.forEach((a, i) => {
    expected.forEach((e, j) => {
        if (i === j) {
            let c = a === e ? '>' : 'X';
            console.log('%s %s', c, a);
        }
    });
});
/**** /end ****/

/**** CODE ****/
function getDeletes(model, current, incoming, transaction) {
    let promises = [];

    current.forEach(cur => {
        let shouldDelete = true;

        incoming.forEach(inc => {
            if (cur.name === inc.name) {
                shouldDelete = false;

                if (model === 'Container') {
                    let curEnvVars = cur.envVars || [],
                        incEnvVars = inc.envVars || [];

                    promises = promises.concat(getDeletes('EnvVar', curEnvVars, incEnvVars, transaction));
                }
            }
        });

        if (shouldDelete) {
            promises.push(`models.${model}.destroy({id: ${cur.composite}}, {t: ${transaction}})`);
        }
    });

    return promises;
}

function getUpserts(model, incoming, composite, transaction) {
    let promises = [];

    incoming.forEach(inc => {
        promises.push(`models.${model}.upsert({id: ${composite}-${inc.name}, values: ${JSON.stringify(inc)}}, {t: ${transaction}})`);

        if (model === 'Container') {
            let envVars = inc.envVars || [];

            promises = promises.concat(getUpserts('EnvVar', envVars, `${composite}-${inc.name}`, transaction));
        }
    });

    return promises;
}
