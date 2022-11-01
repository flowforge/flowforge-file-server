const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {
    const Driver = require('./drivers/' + app.config.driver.type)

    try {
        app.decorate('driver', new Driver(app))
    } catch (err) {
        console.log(err)
    }
    done()
})
