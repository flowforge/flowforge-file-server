const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {

    const driver = require('./drivers/' + app.config.driver.type)

    app.decorate('driver', driver)
    done()
})