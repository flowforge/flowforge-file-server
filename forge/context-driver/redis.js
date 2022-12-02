const redis = require('redis')
const util = require('@node-red/util').util

let client

async function recursiveInsert (projectId, scope, path, value) {
    try {
        const count = await client.json.objLen(projectId, `$.${scope}.${path}`)
        if (count.length) {
            const existing = (await client.json.get(projectId, { path: [`$.${scope}.${path}`] }))[0]
            Object.assign(existing, value)
            await client.json.set(projectId, `$.${scope}.${path}`, existing, { XX: true })
        } else {
            const response = await client.json.set(projectId, `$.${scope}.${path}`, value, { XX: true })
            if (!response) {
                const parts = path.split('.')
                const top = parts.pop()
                const shortPath = parts.join('.')
                const wrappedValue = {}
                util.setObjectProperty(wrappedValue, top, value)
                if (parts.length !== 0) {
                    await recursiveInsert(projectId, scope, shortPath, wrappedValue)
                } else {
                    await client.json.set(projectId, `$.${scope}.${top}`, value)
                }
            }
        }
    } catch (err) {
        console.log(err)
    }
}

module.exports = {
    init: async function (options) {
        client = redis.createClient({
            url: 'redis://localhost:6379'
        })
        await client.connect()
    },
    set: async function (projectId, scope, input) {
        input.forEach(element => {
            recursiveInsert(projectId, scope, element.key, element.value)
        })
    },
    get: async function (projectId, scope, keys) {
        const values = []
        const paths = []
        keys.forEach(key => {
            paths.push(`${scope}.${key}`)
        })
        const response = await client.json.get(projectId, { path: paths })
        Object.keys(response).forEach(k => {
            const parts = k.split('.')
            parts.shift()
            const key = parts.join('.')
            const value = test[k][0]
            values.push({
                key,
                value
            })
        })
        return values
    },
    keys: async function (projectId, scope) {
        const keys = await client.json.objkeys(projectId, '$.' + scope)
        return keys
    },
    delete: async function (projectId, scope) {
        await client.json.clear(projectId, '$.' + scope)
    }
}
