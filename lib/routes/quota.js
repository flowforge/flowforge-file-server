
const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {

  app.get('/v1/quota/:teamId', async (request, reply) => {
    console.log('quota')
    reply.send({
        used: await app.driver.quota(request.params.teamId)
    })
  })

  done()
})