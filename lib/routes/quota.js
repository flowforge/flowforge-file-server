
module.exports = async function (app, opts, done) {
    app.get('/:teamId', async (request, reply) => {
        reply.send({
            used: await request.vfs.quota(request.params.teamId)
        })
    })

    done()
}
