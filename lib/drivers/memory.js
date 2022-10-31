
const { join } = require('path')

const canary = "ROOT_DIR_CANARY"
const storage = {}

function resolvePath(projectId, teamId, path) {
    let reolvedPath
    if (path.startsWith('/')) {
        resolvedPath = join(canary, teamId, path)
    } else {
        resolvedPath = join(canary, teamId, projectId, path)
    }
    if (resolvedPath.startsWith(canary)) {
        let array  = resolvedPath.split('/')
        array.shift()
        resolvedPath = array.join('/')
        return resolvedPath
    } else {
        throw Error('Invalid Path')
    }
}

module.exports = {
    async save (teamId, projectId, path, data) {
        console.log(storage)
        storage[resolvePath(teamId, projectId, path)] = data
        console.log(storage)
    },

    async read (teamId, projectId, path) {
        return storage[resolvePath(teamId, projectId, path)]
    },

    async delete (teamId, projectId, path) {
        console.log(storage)
        console.log(resolvePath(teamId, projectId, path))
        delete storage[resolvePath(teamId, projectId, path)]
        console.log(storage)
    }

}