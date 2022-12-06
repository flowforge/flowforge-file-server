const util = require('@node-red/util').util

const store = {}

module.exports = {
    init: function (options) {},
    set: async function (projectId, scope, input) {
        input.forEach(element => {
            const key = projectId +
                '.' + scope +
                '.' + element.key
            util.setObjectProperty(store, key, element.value)
        })
    },
    get: async function (projectId, scope, keys) {
        const values = []
        keys.forEach(key => {
            const fullKey = projectId +
                '.' + scope +
                '.' + key
            try {
                const value = util.getObjectProperty(store, fullKey)
                values.push({
                    key,
                    value
                })
            } catch (err) {
                if (err.type === 'TypeError') {
                    values.push({
                        key
                    })
                }
            }
        })
        return values
    },
    keys: async function (projectId, scope) {
        console.log('keys scope', scope)
        console.log(JSON.stringify(store, null, ' '))
        if (scope !== 'global') {
            if (scope.indexOf(':') !== -1) {
                const parts = scope.split(':')
                scope = `${parts[1]}.nodes.${parts[0]}`
            } else {
                scope = `${scope}.flow`
            }
        }
        console.log(scope)
        try {
            const root = util.getObjectProperty(store[projectId], scope)
            if (root) {
                console.log(Object.keys(root))
                return Object.keys(root)
            } else {
                return []
            }
        } catch (eee) {
            console.log(eee)
            return []
        }
    },
    delete: async function (projectId, scope) {
        delete store[projectId][scope]
    },
    clean: async function (projectId, ids) {
        console.log(store)
        console.log(projectId, ids)
        const keys = Object.keys(store[projectId])
        if (keys.includes('global')) {
            keys.splice(keys.indexOf('global'), 1)
        }
        const flows = []
        for (const id in ids) {
            if (keys.includes(ids[id])) {
                flows.push(ids[id])
                ids.splice(id, 1)
                keys.splice(keys.indexOf(ids[id]), 1)
            }
        }
        console.log('live flows', flows)
        console.log('dead flows', keys)
        console.log('nodes', ids)

        for (const key in keys) {
            console.log(`removing dead flow ${keys[key]}`)
            delete store[projectId][keys[key]]
        }

        for (const flowId in flows) {
            const flow = flows[flowId]
            const nodes = Object.keys(store[projectId].nodes)
            console.log(`context for nodes on flow ${flow}`, nodes)
            for (const nodeId in nodes) {
                const node = nodes[nodeId]
                console.log(`checking node ${node} still exists`)
                if (!ids.includes(node)) {
                    console.log(`node ${node} on flow ${flow} not in list`)
                    delete store[projectId].nodes[node]
                } else {
                    console.log('yes')
                }
            }
        }
    }
}
