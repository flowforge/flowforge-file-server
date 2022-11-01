const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {

    const driver = require('./drivers/' + app.config.driver.type)

    try {
        app.decorate('driver', new driver(app))
    } catch (err) {
        console.log(err)
    }
    done()
})