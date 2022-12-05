const redis = require('redis')
const util = require('@node-red/util').util

let client

async function createScopeIfNeeded(projectId, scope, path) {
    const scopeCount = await client.json.objLen(projectId)
    if (!scopeCount) {
        const start = {}
        start[scope] = {}
        await client.json.set(projectId, '$', start)
    } else {
        const scopes = (await client.json.objKeys(projectId, '$'))[0]
        if (!scopes.includes(scope)) {
            await client.json.set(projectId, `$.${scope}`, {})
        } else {
            // console.log('scope found')
        }
    }
}

async function recursiveInsert (projectId, scope, path, value) {
    // console.log(scope, path, value)
    try {
        const count = await client.json.objLen(projectId, `$.${scope}.${path}`)
        if (count.length) {
            const existing = (await client.json.get(projectId, { path: [`$.${scope}.${path}`] }))[0]
            // console.log('before', existing)
            Object.assign(existing, value)
            // console.log('after', existing)
            await client.json.set(projectId, `$.${scope}.${path}`, existing, { XX: true })
        } else {
            console.log(path, value)
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
        console.log('recursive insert err', err)
    }
}

module.exports = {
    init: async function (options) {
        client = redis.createClient({
            url: 'redis://localhost:6379'
        })
        await client.connect()

        client.on('error', err => {
            console.log('redis error:', err)
        })

        client.on('connect', () => {
            console.log('redis client connected')
        })
    },
    set: async function (projectId, scope, input) {
        // console.log('set scope', scope)
        for (const i in input) {
            await createScopeIfNeeded(projectId, scope, input[i].key)
            await recursiveInsert(projectId, scope, input[i].key, input[i].value)
        }
    },
    get: async function (projectId, scope, keys) {
        const values = []
        const paths = []
        keys.forEach(key => {
            paths.push(`${scope}.${key}`)
        })
        const response = await client.json.get(projectId, { path: paths })
        if (response) {
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
        } else {
            paths.forEach(k => {
                const parts = k.split('.')
                parts.shift()
                const key = parts.join('.')
                values.push({
                    key
                })
            })
        }
        return values
    },
    keys: async function (projectId, scope) {
        const keys = await client.json.objKeys(projectId, '$.' + scope)
        return keys
    },
    delete: async function (projectId, scope) {
        await client.json.clear(projectId, '$.' + scope)
    },
    clean: async function (projectId, ids) {}
}
