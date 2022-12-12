const util = require('@node-red/util').util

const store = {}

module.exports = {
    init: function (app) {
        app.log.info('FlowForge File Server using Memory Context')
    },
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
    clean: async function (projectId, activeIds) {
        activeIds = activeIds || []
        const keys = Object.keys(store[projectId] || {})
        if (keys.includes('global')) {
            keys.splice(keys.indexOf('global'), 1)
        }
        if (keys.length === 0) {
            return
        }
        const flows = []
        const ids = []
        for (let idx = 0; idx < activeIds.length; idx++) {
            const id = activeIds[idx]
            const keyIdx = keys.indexOf(id)
            if (keyIdx >= 0) {
                flows.push(id)
                keys.splice(keyIdx, 1)
            } else {
                ids.push(id)
            }
        }

        for (let idx = 0; idx < keys.length; idx++) {
            const key = keys[idx]
            if (store[projectId]?.[key]) {
                delete store[projectId][key]
            }
        }

        for (let idx = 0; idx < flows.length; idx++) {
            const flow = flows[idx]
            const nodes = Object.keys(store[projectId]?.[flow]?.nodes || {}) || []
            for (const nodeId in nodes) {
                const node = nodes[nodeId]
                if (!ids.includes(node)) {
                    delete store[projectId].nodes[node]
                }
            }
        }
    }
}
