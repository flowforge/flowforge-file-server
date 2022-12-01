const util = require('@node-red/util').util

const store = {}

module.exports = {
    init: function (options) {},
    set: function (projectId, scope, input) {
        input.forEach(element => {
            const key = projectId +
                '.' + scope +
                '.' + element.key
            util.setObjectProperty(store, key, element.value)
        })
    },
    get: function (projectId, scope, keys) {
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
    keys: function (projectId, scope) {
        const key = projectId +
            '.' + scope
        const root = util.getObjectProperty(scope, key)
        return Object.keys(root)
    },
    delete: function (projectId, scope) {
        delete store[projectId][scope]
    }
}
