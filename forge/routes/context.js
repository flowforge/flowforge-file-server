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

    await driver.init(app)

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
        try {
            await driver.set(projectId, request.params.scope, body)
            reply.code(200).send({})
        } catch (error) {
            let statusCode = error.statusCode || 400
            if (error.code === 'over_quota') {
                statusCode = 413
            }
            reply.code(statusCode).send({ error: error.message, code: error.code, limit: error.limit })
        }
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
        try {
            reply.send(await driver.get(projectId, request.params.scope, keys))
        } catch (error) {
            reply.code(400).send(error)
        }
    })

    /**
     * Get keys
     *
     * @name /v1/context/:projectId/:scope/keys
     * @static
     * @memberof forge.fileserver.context
     */
    app.get('/:projectId/:scope/keys', {

    }, async (request, reply) => {
        const projectId = request.params.projectId
        try {
            reply.send(await driver.keys(projectId, request.params.scope))
        } catch (error) {
            reply.code(400).send(error)
        }
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
        await driver.delete(projectId, request.params.scope)
        reply.send()
    })

    /**
     * Clean up
     *
     * @name /v1/context/:projectId
     * @static
     * @memberof forge.fileserver.context
     */
    app.post('/:projectId/clean', {

    }, async (request, reply) => {
        await driver.clean(request.params.projectId, request.body)
        reply.send()
    })

    done()
}
