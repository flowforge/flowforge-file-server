/**
 * File Storage API
 * 
 * @namespace files
 * @memberof forge.fileserver
 */
const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {
    app.addHook('preHandler', app.checkAuth)

    app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, function (reqest, payload, done) {
        done(null, payload)
    })

    /**
     * Create/Update a File
     * 
     * @name /files/v1/files
     * @static
     * @memberof forge.fileserver.files
     */
    app.post('/files/v1/:teamId/:projectId/*', {

    }, async (request, reply) => {
        const teamId = request.params.teamId
        const projectId = request.params.projectId
        const path = request.params['*']

        try {
            await app.driver.save(teamId, projectId, path, request.body)
            reply.code(200).send()
        } catch (err) {
            reply.code(400)
        }
    })

    /**
     * Retreive a file
     * 
     * @name /files/v1/files
     * @static
     * @memberof forge.fileserver.files
     */
    app.get('/files/v1/:teamId/:projectId/*', async (request, reply) => {
        const teamId = request.params.teamId
        const projectId = request.params.projectId
        const path = request.params['*']

        try {
            const file = await app.driver.read(teamId, projectId, path)
            if (file) {
                reply.send(file)
            } else {
                reply.code(404).send()
            }
        } catch (err) {
            console.log(err)
            reply.code(500).send()
        }
    })

    /**
     * Delete a file
     * 
     * @name /files/v1/files
     * @static
     * @memberof forge.fileserver.files
     */
    app.delete('/files/v1/:teamId/:projectId/*', async (request, reply) => {
        const teamId = request.params.teamId
        const projectId = request.params.projectId
        const path = request.params['*']
        await app.driver.delete(teamId, projectId, path)
        reply.code(200).send()
    })

    

    done()
})