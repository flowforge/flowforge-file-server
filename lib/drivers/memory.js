
const { join } = require('path')

const canary = "ROOT_DIR_CANARY"
const storage = {}

function resolvePath(teamId, projectId, path) {
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
        storage[resolvePath(teamId, projectId, path)] = data
    },

    async append(teamId, projectId, path, data) {
        if (storage[resolvePath(teamId, projectId, path)]) {
            storage[resolvePath(teamId, projectId, path)] += data
        } else {
            storage[resolvePath(teamId, projectId, path)] = data
        }
    },

    async read (teamId, projectId, path) {
        return storage[resolvePath(teamId, projectId, path)]
    },

    async delete (teamId, projectId, path) {
        console.log(resolvePath(teamId, projectId, path))
        delete storage[resolvePath(teamId, projectId, path)]
    },

    async quota (teamId) {
        let used = 0
        Object.keys(storage).forEach( key => {
            console.log(key)
            if (key.startsWith(teamId)) {
                console.log(storage[key].length)
                used += storage[key].length
            }
        })
        return used
    }

}