const path = require('path')
const PACKAGE_ROOT = '../../'
const FileStorageRequire = file => require(path.join(PACKAGE_ROOT, file))
const http = require('http')

// setup authentication endpoint
function authServer (config = {}) {
    const host = config.host || 'localhost'
    const port = config.port || 3002
    const authConfig = config.authConfig || [
        { token: 'test-token', projectId: 'test-project' }
    ]
    const requestListener = function (req, res) {
        try {
            let authToken
            const urlParts = req.url.split('/')
            const projectId = urlParts.pop()
            const route = urlParts.join('/')
            switch (route) {
            case '/account/check/project':
                authToken = authConfig.find(auth => auth.projectId === projectId)
                if (req.headers.authorization === ('Bearer ' + authToken.token)) {
                    res.writeHead(200)
                    res.end('{}')
                    return
                }
                throw new Error('Unknown request')
            default:
                res.writeHead(404)
                res.end(JSON.stringify({ error: 'Resource not found' }))
            }
        } catch (error) {
            res.writeHead(401)
            res.end(JSON.stringify({ error: 'unauthorised' }))
        }
    }

    const authServer = http.createServer(requestListener)
    authServer.listen(port, host, () => {
        // listening for requests on port 3002
    })
    return authServer
}

async function setupApp (config = {}) {
    process.env.FF_FS_TEST_CONFIG = `
FLOWFORGE_HOME: ${config.home || process.cwd()}
FLOWFORGE_PROJECT_ID: ${config.projectId || 'test-project'}
FLOWFORGE_TEAM_ID: ${config.teamId || 'test-team'}
host: ${config.host || '0.0.0.0'}
port: ${config.port || 3001}
base_url: 'http://localhost:3002'
driver:
    type: memory
    options:
        root: /var/root
`

    const app = await FileStorageRequire('index.js')
    return app
}

module.exports = {
    require: FileStorageRequire,
    resolve: file => path.resolve(path.join(__dirname, PACKAGE_ROOT, file)),
    setupApp,
    authServer
}
