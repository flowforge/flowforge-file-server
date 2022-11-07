module.exports = function (app, theDriver, teamId, projectId) {
    return {
        get rootPath () {
            return theDriver.rootPath
        },

        resolvePath: theDriver.resolvePath,

        async ensureDir (dirName) {
            return await theDriver.ensureDir(teamId, projectId, dirName)
        },

        async save (path, data) {
            return await theDriver.save(teamId, projectId, path, data)
        },

        async append (path, data) {
            return await theDriver.append(teamId, projectId, path, data)
        },

        async read (path) {
            return await theDriver.read(teamId, projectId, path)
        },

        async delete (path) {
            return await theDriver.delete(teamId, projectId, path)
        },

        async quota () {
            return await theDriver.quota(teamId)
        }
    }
}
