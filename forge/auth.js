
const fp = require('fastify-plugin')
const got = require('got')

const authCache = {}
const ttl = 90 * 1000

module.exports = fp(async function (app, opts, done) {
    const client = got.extend({
        prefixUrl: `${app.config.base_url}/token`,
        headers: {
            'user-agent': 'FlowForge Storage Server'
        },
        timeout: {
            request: 500
        }
    })

    async function checkToken(token) {
        try {
            await client.get('test', {
                headers: {
                    authorization: `Bearer ${token}`
                }
            })
            // console.log('token good')
            return true
        } catch (err) {
            // console.log('token bad')
            return false
        }
    }

    async function checkAuth (request, reply) {
        if (request.headers?.authorization) {
            const parts = request.headers.authorization.split(' ')
            if (parts.length === 2) {
                const scheme = parts[0]
                const token = parts[1]
                if (scheme !== 'Bearer') {
                    reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                }
                if (authCache[token]) {
                    // console.log('in cache')
                    const cacheEntry = authCache[token]
                    if ((Date.now() - cacheEntry.ttl) >= ttl) {
                        // console.log('expired')
                        if (!await checkToken(token)) {
                            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                            delete authCache[token]
                        } else {
                            // console.log('updated')
                            authCache[token] = {
                                ttl: Date.now()
                            }
                        }
                    } else {
                        // console.log('in ttl')
                    }
                } else {
                    // console.log('not in cache')
                    if (!await checkToken(token)) {
                        reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                    } else {
                        authCache[token] = {
                            ttl: Date.now()
                        }
                    }
                }
            }
        }
    }
    app.decorate('checkAuth', checkAuth)
    done()
})
