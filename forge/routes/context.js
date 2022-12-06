/**
 * Persistent Context API
 *
 * @namespace context
 * @memberof forge.fileserver
 */

/** @typedef {import('fastify')} Fastify */
/** @typedef {import('fastify').FastifyReply} FastifyReply */
/** @typedef {import('fastify').FastifyRequest} FastifyRequest */

const util = require('@node-red/util').util
// const VALID_SCOPES = ['context', 'flow', 'global']
const store = {}

module.exports = async function (app, opts, done) {
    app.addHook('preHandler', async (request, reply) => {
        if (!request.params.projectId) {
            reply.code(404).send({ code: 'invalid_project', error: 'Project ID Missing' })
        } else if (!request.params.scope && request.routeConfig?.name !== 'clean') {
            reply.code(404).send({ code: 'invalid_scope', error: 'Scope missing' })
        }
    })

    /**
     * Create/Update key
     *
     * @name /v1/context/:projectId/:scope
     * @static
     * @memberof forge.fileserver.context
     */
    app.post('/:projectId/:scope', {
        schema: {
            body: {
                type: 'array',
                items: {
                    type: 'object'
                }
            }
        }
    }, async (request, reply) => {
        const body = request.body
        body.forEach(element => {
            const key = request.params.projectId +
            '.' + request.params.scope +
            '.' + element.key
            util.setObjectProperty(store, key, element.value)
        })
        reply.code(200).send({})
    })

    /**
     * Clean
     * @name /v1/context/:projectId/clean
     * @static
     * @memberof forge.fileserver.context
     */
    app.post('/:projectId/clean', {
        config: {
            name: 'clean'
        },
        schema: {
            body: {
                type: 'array',
                items: {
                    type: 'string'
                }
            }
        }
    }, async (request, reply) => {
        const activeNodes = request.body || []
        activeNodes.forEach(element => {
            const [scope, flowId] = element.split(':')
            const key = request.params.projectId +
            '.' + scope + (flowId ? '.' + flowId : '')
            let exists = false
            try {
                exists = util.getObjectProperty(store, key) !== undefined
            } catch (err) {
                // no error
            }
            if (!exists) {
                util.setObjectProperty(store, key, undefined)
            }
        })
        reply.code(200).send({})
    })

    /**
     * Get key
     *
     * @name /v1/context/:projectId/:scope?
     * @static
     * @memberof forge.fileserver.context
     */
    app.get('/:projectId/:scope', {
        schema: {
            query: {
                type: 'object',
                properties: {
                    key: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                },
                required: ['key']
            }
        }
    }, async (request, reply) => {
        const keys = request.query.key
        const values = []
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index]
            try {
                const fullKey = request.params.projectId +
                    '.' + request.params.scope +
                    '.' + key
                const value = util.getObjectProperty(store, fullKey)
                values[index] = { key, value }
            } catch (err) {
                values[index] = { key, value: null }
            }
        }
        reply.send(values)
    })

    /**
     * Get keys
     *
     * @name /v1/context/:projectId/:scope
     * @static
     * @memberof forge.fileserver.context
     */
    app.get('/:projectId/:scope/keys', {

    }, async (request, reply) => {
        const key = request.params.projectId +
            '.' + request.params.scope
        let root = {}
        try {
            root = util.getObjectProperty(store, key)
        } catch (err) {
            // no error
        }
        reply.send(Object.keys(root))
    })

    /**
     * Delete scope
     *
     * @name /v1/context/:projectId/:scope
     * @static
     * @memberof forge.fileserver.context
     */
    app.delete('/:projectId/:scope', {

    }, async (request, reply) => {
        delete store[request.params.projectId][request.params.store]
        reply.send()
    })

    done()
}
