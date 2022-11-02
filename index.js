#!/usr/bin/env node
'use strict'

const semver = require('semver')
const flowForgeFileServer = require('./lib/fileServer')

;(async function () {
    if (!semver.satisfies(process.version, '>=16.0.0')) {
        console.error(`FlowForge File Server requires at least NodeJS v16, ${process.version} found`)
        process.exit(1)
    }

    try {
        const server = await flowForgeFileServer()
        let stopping = false
        async function exitWhenStopped () {
            if (!stopping) {
                stopping = true
                server.log.info('Stopping FlowForge File Server')
                await server.close()
                server.log.info('FlowForge File Server stopped')
                process.exit(0)
            }
        }

        process.on('SIGINT', exitWhenStopped)
        process.on('SIGTERM', exitWhenStopped)
        process.on('SIGHUP', exitWhenStopped)
        process.on('SIGUSR2', exitWhenStopped) // for nodemon restart
        process.on('SIGBREAK', exitWhenStopped)
        process.on('message', function (m) { // for PM2 under window with --shutdown-with-message
            if (m === 'shutdown') { exitWhenStopped() }
        })

        // Start the server
        server.listen({ port: server.config.port, host: server.config.host }, function (err, address) {
            if (err) {
                console.error(err)
                process.exit(1)
            }
        })
    } catch (err) {
        console.error(err)
        process.exitCode = 1
    }
})()
