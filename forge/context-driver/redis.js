const redis = require('redis')

let client
module.exports = {
    init: function(options) {
        client = redis.createClient({
            url: 'redis://localhost:6380'
        })
        client.context()
    },
    set: function (projectId, scope, input) {
        const root = projectId + '-' + scope
        input.forEach(element => {
            const key = root + '.' + element.key
            client.json.set('noderedis:jsondata', key, element.value)
        })
    },
    get: function (projectId, scope, keys) {},
    keys: function (projectId, scope) {},
    delete: function (projectId, scope) {}
}
