const redis = require('redis')

let client
module.exports = {
    init: async function (options) {
        client = redis.createClient({
            url: 'redis://localhost:6379'
        })
        await client.connect()
    },
    set: async function (projectId, scope, input) {
        if (!await client.json.objlen(projectId, '$')) {
            await client.json.set(projectId, '$', {})
            await client.json.set(projectId, '$.' + scope, {})
        }
        for (const element of input) {
            const key = '$.' + scope + '.' + element.key
            await client.json.set(projectId, key, element.value)
        }
    },
    get: async function (projectId, scope, keys) {},
    keys: async function (projectId, scope) {
        const keys = await client.json.objkeys(projectId, '$.' + scope)
        return keys
    },
    delete: async function (projectId, scope) {
        await client.json.clear(projectId, '$.' + scope)
    }
}
