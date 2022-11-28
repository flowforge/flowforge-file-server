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
    /**
     * Create/Update key
     *
     * @name /v1/context/:projectId/:key
     * @static
     * @memberof forge.fileserver.context
     */
    app.post('/:projectId/:key', {

    }, async (request, reply) => {

    })

    /**
     * Get key
     *
     * @name /v1/context/:projectId/:key
     * @static
     * @memberof forge.fileserver.context
     */
    app.get('/:projectId/:key', {

    }, async (request, reply) => {

    })

    /**
     * Delete key
     *
     * @name /v1/context/:projectId/:key
     * @static
     * @memberof forge.fileserver.context
     */
    app.delete('/:projectId/:key', {

    }, async (request, reply) => {

    })

    done()
}
