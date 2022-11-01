const fs = require('fs')
const { join, isAbsolute, dirname } = require('path')


const canary = "ROOT_DIR_CANARY"

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

async function readDirSize(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true })
    const paths = files.map( async file => {
        const path = join(dir, file.name)
        if (file.isDirectory()) return await readDirSize(path)

        if (file.isFile()) {
            const { size } = fs.statSync(path)
            return size
        }
        return 0
    })

    return ( await Promise.all( paths ) ).flat( Infinity ).reduce( ( i, size ) => i + size, 0 )
}

module.exports = function (app) {

    let rootPath
    if (!isAbsolute(app.config.driver.root)) {
        rootPath = join(app.config.home, app.config.driver.root)
    } else {
        rootPath = app.config.driver.root
    }

    console.log(app.config.driver.root)
    console.log(rootPath)
    
    if (!fs.existsSync(rootPath)) {
        fs.mkdirSync(rootPath)
    }

    return {
        async save (teamId, projectId, path, data) {
            const fullPath = join(rootPath,resolvePath(teamId, projectId, path))
            try {
                fs.mkdirSync(dirname(fullPath), {
                    recursive: true
                })
                fs.writeFileSync(fullPath, data)
            } catch (err) {
                console.log(err)
            }
        },

        async append (teamId, projectId, path, data) {
            const fullPath = join(rootPath,resolvePath(teamId, projectId, path))
            if (fs.existsSync(fullPath)) {
                fs.appendFileSync(fullPath, data)
            } else {
                this.save(teamId, projectId, path, data)
            }
        },

        async read (teamId, projectId, path) {
            const fullPath = join(rootPath,resolvePath(teamId, projectId, path))
            return fs.readFileSync(fullPath)
        },

        async delete (teamId, projectId, path) {
            const fullPath = join(rootPath,resolvePath(teamId, projectId, path))
            fs.rmSync(fullPath)
        },

        async quota (teamId) {
            return readDirSize(join(rootPath, teamId))
        }
    }

}