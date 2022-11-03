/**
 * File Storage API
 *
 * @namespace files
 * @memberof forge.fileserver
 */

module.exports = async function (app, opts, done) {
    app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, function (request, payload, done) {
        done(null, payload)
    })

    /**
     * Create/Update a File
     *
     * @name /v1/files/:teamId/:projectId/*
     * @static
     * @memberof forge.fileserver.files
     */
    app.post('/:teamId/:projectId/*', {

    }, async (request, reply) => {
        const path = request.params['*']
        try {
            if (request.headers.ff_mode === 'append') {
                await request.vfs.append(path, request.body)
            } else {
                await request.vfs.save(path, request.body)
            }
            reply.code(200).send()
        } catch (err) {
            console.log(err)
            reply.code(400)
        }
    })

    // /**
    //  * Stat a file
    //  *
    //  * @name /v1/files/:teamId/:projectId/*
    //  * @static
    //  * @memberof forge.fileserver.files
    //  */
    //  app.head('/:teamId/:projectId/*', async (request, reply) => {

    //  })

    /**
     * Retrieve a file
     *
     * @name /v1/files/:teamId/:projectId/*
     * @static
     * @memberof forge.fileserver.files
     */
    app.get('/:teamId/:projectId/*', async (request, reply) => {
        const path = request.params['*']
        try {
            const file = await request.vfs.read(path)
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
     * @name /v1/files/:teamId/:projectId/*
     * @static
     * @memberof forge.fileserver.files
     */
    app.delete('/:teamId/:projectId/*', async (request, reply) => {
        const path = request.params['*']
        await request.vfs.delete(path)
        reply.code(200).send()
    })

    done()
}
