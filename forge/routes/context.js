/**
 * Persistent Context API
 *
 * @namespace context
 * @memberof forge.fileserver
 */

/** @typedef {import('fastify')} Fastify */
/** @typedef {import('fastify').FastifyReply} FastifyReply */
/** @typedef {import('fastify').FastifyRequest} FastifyRequest */

module.exports = async function (app, opts, done) {
    const driver = require(`../context-driver/${app.config.context.type}`)

    await driver.init(app.config.context.options)

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
                    type: 'object',
                    properties: {
                        key: { type: 'string' },
                        value: {}
                    }
                }
            }
        }
    }, async (request, reply) => {
        const body = request.body
        const projectId = request.params.projectId
        const scope = request.params.scope
        await driver.set(projectId, scope, body)
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
        const projectId = request.params.projectId
        const scope = request.params.scope
        reply.send(await driver.get(projectId, scope, keys))
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
        const projectId = request.params.projectId
        const scope = request.params.scope
        reply.send(await driver.keys(projectId, scope))
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
        // delete store[request.params.projectId][request.params.store]
        const projectId = request.params.projectId
        const scope = request.params.scope
        await driver.delete(projectId, scope)
        reply.send()
    })

    /**
     * Clean up
     *
     * @name /v1/context/:projectId
     * @static
     * @memberof forge.fileserver.context
     */
    app.post('/:projectId', {

    }, async (request, reply) => {
        await driver.clean(request.body)
        reply.send()
    })

    done()
}
