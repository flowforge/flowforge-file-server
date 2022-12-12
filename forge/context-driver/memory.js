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
                if (err.code === 'INVALID_EXPR') {
                    throw err
                }
                values.push({
                    key
                })
            }
        })
        return values
    },
    keys: async function (projectId, scope) {
        if (scope !== 'global') {
            if (scope.indexOf(':') !== -1) {
                const parts = scope.split(':')
                scope = `${parts[1]}.nodes.${parts[0]}`
            } else {
                scope = `${scope}.flow`
            }
        }
        try {
            const root = util.getObjectProperty(store[projectId], scope)
            if (root) {
                return Object.keys(root)
            } else {
                return []
            }
        } catch (eee) {
            return []
        }
    },
    delete: async function (projectId, scope) {
        if (store[projectId]?.[scope]) {
            delete store[projectId][scope]
        }
    },
    clean: async function (projectId, ids) {
        const keys = Object.keys(store[projectId])
        if (keys.includes('global')) {
            keys.splice(keys.indexOf('global'), 1)
        }
        if (keys.length === 0) {
            return
        }
        const flows = []
        for (const id in ids) {
            if (keys.includes(ids[id])) {
                flows.push(ids[id])
                ids.splice(id, 1)
                keys.splice(keys.indexOf(ids[id]), 1)
            }
        }

        for (const key in keys) {
            delete store[projectId][keys[key]]
        }

        for (const flowId in flows) {
            const flow = flows[flowId]
            const nodes = Object.keys(store[projectId][flow].nodes)
            for (const nodeId in nodes) {
                const node = nodes[nodeId]
                if (!ids.includes(node)) {
                    delete store[projectId].nodes[node]
                }
            }
        }
    }
}
