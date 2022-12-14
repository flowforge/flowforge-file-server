const { getObjectProperty, getItemSize } = require('./quotaTools')
const util = require('@node-red/util').util

const store = {}
let app
module.exports = {
    init: function (_app) {
        app = _app
        app.log.info('FlowForge File Server using Memory Context')
    },
    set: async function (projectId, scope, input) {
        if (!store[projectId]) {
            store[projectId] = {}
        }
        const projectStore = store[projectId]
        const quotaLimit = app.config?.context?.quota || 0
        // if quota is set, check if we are over quota or will be after this update
        if (quotaLimit > 0) {
            // Difficulties implementing this correctly
            // - The final size of data can only be determined after the data is stored.
            //   This is due to the fact that some keys may be deleted and some may be added
            //   and the size of the data is not the same as the size of the keys.
            // This implementation is not ideal, but it is a good approximation and will
            //   prevent the possibility of runaway storage usage.
            let changeSize = 0
            input.forEach(element => {
                const path = scope + '.' + element.key
                const currentItem = projectStore ? getObjectProperty(projectStore, path) : undefined
                if (currentItem === undefined && element.value !== undefined) {
                    // this is an addition
                    changeSize += getItemSize(element.value)
                } else if (currentItem !== undefined && element.value === undefined) {
                    // this is an deletion
                    changeSize -= getItemSize(currentItem)
                } else {
                    // this is an update
                    changeSize -= getItemSize(currentItem)
                    changeSize += getItemSize(element.value)
                }
            })
            const currentSize = await this.quota(projectId)
            if (changeSize < 0) {
                // if the change is negative then allow it to go through
            } else if (currentSize + changeSize > quotaLimit) {
                const err = new Error('Over Quota')
                err.code = 'over_quota'
                err.error = err.message
                err.limit = quotaLimit
                throw err
            }
        }
        input.forEach(element => {
            const path = scope + '.' + element.key
            util.setObjectProperty(projectStore, path, element.value)
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
    },
    quota: async function (projectId) {
        const projectStore = store[projectId]
        return getItemSize(projectStore)
    }
}
