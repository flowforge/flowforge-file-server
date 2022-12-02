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
    const driver = require('../context-driver/memory.js')

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
        // body.forEach(element => {
        //     const key = request.params.projectId +
        //     '.' + request.params.scope +
        //     '.' + element.key
        //     util.setObjectProperty(store, key, element.value)
        // })
        driver.set(projectId, scope, body)
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
        console.log(request.query)
        const keys = request.query.key
        const projectId = request.params.projectId
        const scope = request.params.scope
        // const values = []
        // keys.forEach(key => {
        //     const fullkey = request.params.projectId +
        //     '.' + request.params.scope +
        //     '.' + key
        //     try {
        //         const value = util.getObjectProperty(store, fullkey)
        //         const ret = {
        //             key,
        //             value
        //         }
        //         values.push(ret)
        //     } catch (err) {
        //         if (err.type === 'TypeError') {
        //             // reply.code(404).send()
        //             values.push({
        //                 key
        //             })
        //         }
        //         // return false
        //     }
        // })
        reply.send(driver.get(projectId, scope, keys))
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
        // const key = request.params.projectId +
        //     '.' + request.params.scope
        // const root = util.getObjectProperty(store, key)
        const projectId = request.params.projectId
        const scope = request.params.scope
        reply.send(driver.keys(projectId, scope))
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
        driver.delete(projectId, scope)
        reply.send()
    })

    done()
}
