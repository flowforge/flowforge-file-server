
const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {
    async function checkAuth (request, reply) {

    }
    app.decorate('checkAuth', checkAuth)
    done()
})
