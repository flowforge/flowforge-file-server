const util = require('@node-red/util').util

const store = {}

module.exports = {
    init: function (app) {
        app.log.info('FlowForge File Server using Memory Context')
    },
    set: async function (projectId, scope, input) {
        input.forEach(element => {
            const fullPath = projectId + '.' + scope + '.' + element.key
            util.setObjectProperty(store, fullPath, element.value)
        })
    },
    get: async function (projectId, scope, keys) {
        const values = []
        const projectStore = store?.[projectId] || {}
        keys.forEach(key => {
            const path = scope + '.' + key
            try {
                const value = util.getObjectProperty(projectStore, path)
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
        const projectStore = store?.[projectId] || {}
        try {
            const root = util.getObjectProperty(projectStore, scope)
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
        const projectStore = store[projectId]
        if (projectStore && typeof projectStore === 'object') {
            delete projectStore[scope]
        }
        return Promise.resolve()
    },
    clean: async function (projectId, activeNodes) {
        activeNodes = activeNodes || []
        const projectStore = store[projectId]
        for (const id in projectStore) {
            if (projectStore[id] && id !== 'global') {
                const [node, flow] = id.split(':') // eslint-disable-line no-unused-vars
                if (activeNodes.indexOf(node) === -1) {
                    delete projectStore[id]
                }
            }
        }
    }
}
