
const fs = require('fs')
const fp = require('fastify-plugin')
const path = require('path')
const YAML = require('yaml')

module.exports = fp(async function (app, opts, next) {
    const testMode = !!process.env.FF_FS_TEST_CONFIG
    if (!opts.config && testMode) {
        opts.config = YAML.parse(process.env.FF_FS_TEST_CONFIG)
    }
    if (opts.config) {
        // A custom config has been passed in. This means we're running
        // programmatically rather than manually. At this stage, that
        // means its our test framework.
        process.env.NODE_ENV = 'development'
        process.env.FLOWFORGE_HOME = opts.config.FLOWFORGE_HOME || process.cwd()
    } else if (!process.env.FLOWFORGE_HOME) {
        if (process.env.NODE_ENV === 'development') {
            app.log.info('Development mode')
            process.env.FLOWFORGE_HOME = path.resolve(__dirname, '..')
        } else {
            if (fs.existsSync('/opt/flowforge-file-storage')) {
                process.env.FLOWFORGE_HOME = '/opt/flowforge-file-storage'
            } else {
                process.env.FLOWFORGE_HOME = process.cwd()
            }
        }
    }

    let ffVersion
    if (process.env.npm_package_version) {
        ffVersion = process.env.npm_package_version
        // npm start
    } else {
        // everything else
        const { version } = require(path.join(module.parent.path, '..', 'package.json'))
        ffVersion = version
    }
    try {
        fs.statSync(path.join(__dirname, '..', '..', '.git'))
        ffVersion += '-git'
    } catch (err) {
        // No git directory
    }

    app.log.info(`FlowForge File Storage v${ffVersion}`)
    app.log.info(`FlowForge File Storage running with NodeJS ${process.version}`)
    app.log.info(`FlowForge File Storage Data Directory: ${process.env.FLOWFORGE_HOME}`)

    try {
        let config = {}
        if (opts.config === undefined) {
            let configFile = path.join(process.env.FLOWFORGE_HOME, '/etc/flowforge.yml')
            app.log.info(`Config File: ${configFile}`)
            if (fs.existsSync(path.join(process.env.FLOWFORGE_HOME, '/etc/flowforge.local.yml'))) {
                configFile = path.join(process.env.FLOWFORGE_HOME, '/etc/flowforge.local.yml')
            }
            const configFileContent = process.env.FF_FS_TEST_CONFIG || fs.readFileSync(configFile, 'utf-8')
            config = YAML.parse(configFileContent)
        } else {
            config = { ...opts.config }
        }

        config.version = ffVersion
        config.home = process.env.FLOWFORGE_HOME
        config.port = process.env.PORT || config.port || 3001
        config.host = config.host || 'localhost'

        if (!config.driver) {
            config.driver = { type: 'memory' } // should default to localfs
        }

        if (!config.logging) {
            config.logging = {
                level: 'info',
                http: 'warn'
            }
        } else {
            if (!config.logging.http) {
                config.logging.http = 'warn'
            }
        }
        Object.freeze(config)
        app.decorate('config', config)
    } catch (err) {
        app.log.err(`Failed to read config file ${configFile}: ${err}`)
    }

    next()
})
