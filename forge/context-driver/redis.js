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
        // console.log('new project', scope, start)
        try {
            await client.json.set(projectId, '$', start)
        } catch (err) {
            // console.log("ben")
        }
    } else {
        const scopes = (await client.json.objKeys(projectId, '$'))[0]
        if (!scopes.includes(scope)) {
            // console.log('new scope', scopes, scope)
            const start = {}
            if (scope !== 'global') {
                const parts = scope.split('.')
                scope = parts.shift()
                Object.assign(start, {
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
            // console.log('scope already exists')
        }
    }
}

async function recursiveInsert (projectId, scope, path, value) {
    // console.log('insert', scope, path, value)
    try {
        const count = await client.json.objLen(projectId, `$.${scope}.${path}`)
        // console.log('count', `$.${scope}.${path}`, count.length)
        if (count.length) {
            let existing = (await client.json.get(projectId, { path: [`$.${scope}.${path}`] }))[0]
            // console.log('before', existing)
            if (typeof existing === 'object') {
                if (Array.isArray(existing)) {
                    existing = value
                } else {
                    if (typeof value === 'object') {
                        if (Array.isArray(value)) {
                            existing = value
                        } else {
                            Object.assign(existing, value)
                        }
                    } else {
                        existing = value
                    }
                }
            } else {
                existing = value
            }
            // console.log('after', existing)
            if (existing === undefined) {
                await client.json.del(projectId, `$.${scope}.${path}`)
            } else {
                await client.json.set(projectId, `$.${scope}.${path}`, existing, { XX: true })
            }
        } else {
            // console.log(path, value)
            if (value === undefined) {
                await client.json.del(projectId, `$.${scope}.${path}`)
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
        const startScope = scope
        for (const i in input) {
            scope = startScope
            let path = input[i].key
            if (scope !== 'global') {
                if (scope.indexOf('.') !== -1) {
                    const parts = scope.split('.')
                    scope = parts.shift()
                    path = `${parts.join('.')}.${path}`
                }
            }
            await createScopeIfNeeded(projectId, scope)
            // console.log('----', scope, path)
            await recursiveInsert(projectId, scope, path, input[i].value)
        }
    },
    get: async function (projectId, scope, keys) {
        const values = []
        const paths = []
        keys.forEach(key => {
            // console.log('get', scope, key)
            paths.push(`${scope}.${key}`)
        })
        try {
            const response = await client.json.get(projectId, { path: paths })
            if (response) {
                if (paths.length === 1) {
                    const key = paths[0].substring(scope.length + 1)
                    values.push({
                        key,
                        value: response
                    })
                } else {
                    Object.keys(response).forEach(k => {
                        // console.log(k)
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
        if (scope !== 'global') {
            if (scope.indexOf(':') !== -1) {
                const parts = scope.split(':')
                scope = `${parts[1]}.nodes.${parts[0]}`
            } else {
                scope = `${scope}.flow`
            }
        }
        const keys = (await client.json.objKeys(projectId, '$.' + scope))[0]
        console.log(scope, keys)
        return keys
    },
    delete: async function (projectId, scope) {
        await client.json.clear(projectId, '$.' + scope)
    },
    clean: async function (projectId, ids) {
        const keys = await client.json.objKeys(projectId)
        // remove global
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
        // console.log('live flows', flows)
        // console.log('dead flows', keys)
        // console.log('nodes', ids)

        for (const key in keys) {
            // console.log(`removing dead flow ${keys[key]}`)
            await client.json.del(projectId, `$.${keys[key]}`)
        }

        for (const flowId in flows) {
            const flow = flows[flowId]
            const nodes = (await client.json.objKeys(projectId, `$.${flow}.nodes`))[0]
            // console.log(`context for nodes on flow ${flow}`, nodes)
            for (const nodeId in nodes) {
                const node = nodes[nodeId]
                // console.log(`checking node ${node} still exists`)
                if (!ids.includes(node)) {
                    // console.log(`node ${node} on flow ${flow} not in list`)
                    await client.json.del(projectId, `$.${flow}.nodes.${node}`)
                } else {
                    // console.log('yes')
                }
            }
        }
    }
}
