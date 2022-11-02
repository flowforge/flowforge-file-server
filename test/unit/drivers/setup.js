const fs = require('fs')
const { join, isAbsolute, sep: pathSeparator } = require('path')
const canary = 'ROOT_DIR_CANARY'

function resolvePath (teamId, projectId, path) {
    let resolvedPath
    if (path.startsWith(pathSeparator)) {
        resolvedPath = join(canary, teamId, path)
    } else {
        resolvedPath = join(canary, teamId, projectId, path)
    }
    if (resolvedPath.startsWith(canary)) {
        const array = resolvedPath.split(pathSeparator)
        array.shift()
        resolvedPath = array.join(pathSeparator)
        return resolvedPath
    } else {
        throw Error('Invalid Path')
    }
}

module.exports = async function (config = {}, options = {}) {
    const app = {
        config: { ...config },
        options: { ...options },
        cleanUp: function (teamId, projectId) {
            if (!app.config.driver.root || !app.options.rootPath) {
                throw new Error('app.config.driver.root must be set')
            }
            app._driver.delete(teamId, projectId, 'test1.txt')
            app._driver.delete(teamId, projectId, 'test2.txt')
            app._driver.delete(teamId, projectId, 'test3.txt')
        },
        close: function () {
            app.cleanUp(app.options.teamId, app.options.projectId)
        }
    }
    let rootPath
    if (!app.config.driver.root) {
        throw new Error('app.config.driver.root must be set')
    }
    if (!isAbsolute(app.config.driver.root)) {
        rootPath = join(app.config.home, app.config.driver.root)
    } else {
        rootPath = app.config.driver.root
    }
    if (app.config.driver.type === 'localfs') {
        fs.mkdirSync(rootPath, { recursive: true })
    }
    const createDriver = require('../../../lib/drivers/' + app.config.driver.type)
    app._driver = createDriver(app)

    app.options.rootPath = rootPath
    app.options.resolvePath = resolvePath
    app.cleanUp(app.options.teamId, app.options.projectId)
    return app
}
