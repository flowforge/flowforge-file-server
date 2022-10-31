const fastify = require('fastify')
const auth = require('./auth')
const config = require('./config')
const driver = require('./driver')
const routes = require('./routes')
const helmet = require('helmet')

module.exports = async (options = {}) => {

    let loggerLevel = 'info'
    if (options.config?.logging?.level) {
        loggerLevel = options.config.logging.level
    }

    const server = fastify({
        maxParamLength: 500,
        trustProxy: true,
        logger: {
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss.l'Z'",
                    ignore: 'pid,hostname',
                    singleLine: true
                }
            },
            level: loggerLevel
        }
    })

    server.addHook('onError', async (request, reply, error) => {
        // Useful for debugging when a route goes wrong
        // console.log(error.stack)
    })

    try {
        // Config
        await server.register(config, options)
        if (server.config.logging?.level) {
            server.log.level = server.config.logging.level
        }

        // Authentication Handler
        await server.register(auth, {})

        // HTTP Server setup
        // await server.register(helmet, {
        //     global: true,
        //     hidePoweredBy: true,
        //     hsts: false,
        //     frameguard: {
        //         action: 'deny'
        //     }
        // })

        // Driver
        await server.register(driver, {})

        // Routes
        await server.register(routes, { logLevel: server.config.logging.http })

        server.ready()

        return server
    } catch (err) {
        server.log.error(`Failed to start: ${err.toString()}`)
        throw err
    }
}