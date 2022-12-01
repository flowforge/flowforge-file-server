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

const store = {}

module.exports = async function (app, opts, done) {
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
     * Get key
     *
     * @name /v1/context/:projectId/:scope?
     * @static
     * @memberof forge.fileserver.context
     */
    app.get('/:projectId/:scope/', {
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
        const keys = request.query.keys
        const values = []
        keys.forEach(key => {
            const fullkey = request.params.projectId +
            '.' + request.params.scope +
            '.' + key
            try {
                const value = util.getObjectProperty(store, fullkey)
                const ret = {
                    key,
                    value
                }
                values.push(ret)
            } catch (err) {
                if (err.type === 'TypeError') {
                    // reply.code(404).send()
                    values[key] = undefined
                }
                // return false
            }
        })
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
        const root = util.getObjectProperty(store, key)
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
