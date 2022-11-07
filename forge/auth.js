
const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {
    async function checkAuth (request, reply) {
        if (request.headers?.authorization) {
            const parts = request.headers.authorization.split(' ')
            if (parts.length === 2) {
                const scheme = parts[0]
                const token = parts[1]
                if (scheme !== 'Bearer') {
                    reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                }
                const accessToken = await app.db.controllers.AccessToken.getOrExpire(token)
                if (accessToken) {
                    if (accessToken.ownerType === 'project') {
                        const project = await app.db.models.Project.byId(accessToken.ownerId)
                        if (request.params.projectId) {
                            if (request.params.projectId !== accessToken.ownerId) {
                                reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                                return
                            }
                        }
                        if (project.Team.hashid !== request.params.teamId) {
                            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                        }
                    } else if (accessToken.ownerType === 'device') {
                        // Do we let devices access this?
                        // I'm going to say no, they will use local storage
                        reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                    }
                } else {
                    reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                }
            } else {
                reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
            }
        } else {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        }
    }
    app.decorate('checkAuth', checkAuth)
    done()
})
