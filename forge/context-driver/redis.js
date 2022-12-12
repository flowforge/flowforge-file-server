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
        try {
            await client.json.set(projectId, '$', start)
        } catch (err) {
        }
    } else {
        const scopes = (await client.json.objKeys(projectId, '$'))[0]
        if (!scopes.includes(scope)) {
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
            }
        }
    }
}

async function recursiveInsert (projectId, scope, path, value) {
    try {
        const count = await client.json.objLen(projectId, `$.${scope}.${path}`)
        if (count.length) {
            let existing = (await client.json.get(projectId, { path: [`$.${scope}.${path}`] }))[0]
            if (typeof existing === 'object' && existing !== null) {
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
            if (existing === undefined) {
                await client.json.del(projectId, `$.${scope}.${path}`)
            } else {
                await client.json.set(projectId, `$.${scope}.${path}`, existing, { XX: true })
            }
        } else {
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
    init: async function (app) {
        const url = app.config.context.options?.url || 'redis://localhost:6379'
        client = redis.createClient({
            url
        })
        await client.connect()

        client.on('error', err => {
            console.log('redis error:', err)
            app.log.error(`FlowForge File Server Redis Error: ${err}`)
        })

        client.on('connect', () => {
            app.log.info(`FlowForge File Server Redis Context connect to ${url}`)
        })
    },
    set: async function (projectId, scope, input) {
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
            await recursiveInsert(projectId, scope, path, input[i].value)
        }
    },
    get: async function (projectId, scope, keys) {
        const values = []
        const paths = []
        keys.forEach(key => {
            paths.push(`${scope}.${key}`)
        })
        for (let index = 0; index < paths.length; index++) {
            const path = paths[index]
            const key = path.substring(scope.length + 1)
            const result = { key }
            try {
                const response = await client.json.get(projectId, { path })
                if (response !== undefined) {
                    result.value = response
                }
            } catch (err) {
                // console.log('get err', err)
            }
            values.push(result)
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

        for (const key in keys) {
            await client.json.del(projectId, `$.${keys[key]}`)
        }

        for (const flowId in flows) {
            const flow = flows[flowId]
            const nodes = (await client.json.objKeys(projectId, `$.${flow}.nodes`))[0]
            for (const nodeId in nodes) {
                const node = nodes[nodeId]
                if (!ids.includes(node)) {
                    await client.json.del(projectId, `$.${flow}.nodes.${node}`)
                } else {
                    // console.log('yes')
                }
            }
        }
    },
    quota: async function (projectId) {
        const size = await client.json.strLen(projectId)
        return size
    }
}
