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
        let scope = request.params.scope
        if (scope !== 'global') {
            if (scope.indexOf(':') !== -1) {
                const parts = scope.split(':')
                scope = `${parts[1]}.nodes.${parts[0]}`
            } else {
                scope = `${scope}.flow`
            }
        }
        if (app.config.context.quota) {
            if ((await driver.quota(projectId)) < app.config.context.quota) {
                await driver.set(projectId, scope, body)
                reply.code(200).send({})
            } else {
                reply.code(413).send({})
            }
        } else {
            await driver.set(projectId, scope, body)
            reply.code(200).send({})
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
        let scope = request.params.scope
        if (scope !== 'global') {
            if (scope.indexOf(':') !== -1) {
                const parts = scope.split(':')
                scope = `${parts[1]}.nodes.${parts[0]}`
            } else {
                scope = `${scope}.flow`
            }
        }
        reply.send(await driver.get(projectId, scope, keys))
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
        let scope = request.params.scope
        if (scope !== 'global') {
            if (scope.indexOf(':') !== -1) {
                const parts = scope.split(':')
                scope = `${parts[1]}.nodes.${parts[0]}`
            } else {
                scope = `${scope}.flow`
            }
        }
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
    app.post('/:projectId/clean', {

    }, async (request, reply) => {
        await driver.clean(request.params.projectId, request.body)
        reply.send()
    })

    done()
}
