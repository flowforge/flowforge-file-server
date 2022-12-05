const redis = require('redis')
const util = require('@node-red/util').util

let client

async function createScopeIfNeeded (projectId, scope) {
    const scopeCount = await client.json.objLen(projectId)
    if (!scopeCount) {
        const start = {}
        if (scope === 'global') {
            start[scope] = {}
        } else {
            const parts = scope.split('.')
            util.setObjectProperty(start, parts.shift(), {
                nodes: {},
                flow: {}
            })
        }
        console.log('new project', scope, start)
        try {
            await client.json.set(projectId, '$', start)
        } catch (err) {
            // console.log("ben")
        }
    } else {
        const scopes = (await client.json.objKeys(projectId, '$'))[0]
        if (!scopes.includes(scope)) {
            console.log('new scope', scopes, scope)
            const start = {}
            if (scope === 'global') {
                start[scope] = {}
            } else {
                const parts = scope.split('.')
                scope = parts.shift()
                util.setObjectProperty(start, scope, {
                    flow: {},
                    nodes: {}

                })
            }
            try {
                await client.json.set(projectId, `$.${scope}`, start)
            } catch (err) {
                // console.log('ben', err)
            }
        } else {
            console.log('scope already exists')
        }
    }
}

async function recursiveInsert (projectId, scope, path, value) {
    console.log('insert', scope, path, value)
    try {
        const count = await client.json.objLen(projectId, `$.${scope}.${path}`)
        console.log('count', `$.${scope}.${path}`, count.length)
        if (count.length) {
            const existing = (await client.json.get(projectId, { path: [`$.${scope}.${path}`] }))[0]
            console.log('before', existing)
            Object.assign(existing, value)
            console.log('after', existing)
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
            let path = input[i].key
            if (scope !== 'global') {
                if (scope.indexOf('.') !== -1) {
                    const parts = scope.split('.')
                    scope = parts.shift()
                    path = `${parts.join('.')}.${path}`
                }
            //         path = `nodes.${parts[1]}.${path}`
            //         scope = parts[0]
            //         console.log(scope, path)
            //     } else {
            //         path = `flow.${path}`
            //     }
            }
            await createScopeIfNeeded(projectId, scope)
            console.log('----', scope, path)
            await recursiveInsert(projectId, scope, path, input[i].value)
        }
    },
    get: async function (projectId, scope, keys) {
        const values = []
        const paths = []
        keys.forEach(key => {
            console.log('get', scope, key)
            paths.push(`${scope}.${key}`)
        })
        try {
            const response = await client.json.get(projectId, { path: paths })
            if (response) {
                console.log('response', response)
                if (paths.length === 1) {
                    const key = paths[0].substring(scope.length + 1)
                    values.push({
                        key,
                        value: response
                    })
                } else {
                    Object.keys(response).forEach(k => {
                        console.log(k)
                        const key = k.substring(scope.length + 1)
                        const value = response[k]
                        values.push({
                            key,
                            value
                        })
                    })
                }
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
        } catch (err) {
            console.log(err)
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
