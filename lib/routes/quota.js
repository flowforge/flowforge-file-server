
module.exports = async function (app, opts, done) {
    app.get('/:teamId', async (request, reply) => {
        reply.send({
            used: await app.driver.quota(request.params.teamId)
        })
    })

    done()
}
