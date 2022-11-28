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
     * @name /v1/context/:projectId/:scope/:key
     * @static
     * @memberof forge.fileserver.context
     */
    app.post('/:projectId/:scope/:key', {

    }, async (request, reply) => {
        const body = request.body
        const key = request.params.projectId +
            '.' + request.params.scope +
            '.' + request.params.key
        util.setObjectProperty(store, key, body)
        reply.code(200).send({})
    })

    /**
     * Get key
     *
     * @name /v1/context/:projectId/:scope/:key
     * @static
     * @memberof forge.fileserver.context
     */
    app.get('/:projectId/:scope/:key', {

    }, async (request, reply) => {
        const key = request.params.projectId +
            '.' + request.params.scope +
            '.' + request.params.key
        try {
            const value = util.getObjectProperty(store, key)
            reply.send(value)
        } catch (err) {
            if (err.type === 'TypeError') {
                reply.code(404).send()
            }
        }
    })

    /**
     * Get keys
     *
     * @name /v1/context/:projectId/:scope
     * @static
     * @memberof forge.fileserver.context
     */
    app.get('/:projectId/:scope', {

    }, async (request, reply) => {
        const key = request.params.projectId +
            '.' + request.params.scope
        const root = util.getObjectProperty(store,key)
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
