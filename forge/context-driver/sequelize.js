const { Sequelize, DataTypes } = require('sequelize')
const util = require('@node-red/util').util
const path = require('path')
const { Client } = require('pg')

let sequelize

module.exports = {
    init: async function (app) {
        const dbOptions = {
            dialect: app.config.context.options.type || 'sqlite',
            logging: !!app.config.context.options.logging
        }

        if (dbOptions.dialect === 'sqlite') {
            let filename = app.config.context.options.storage || 'context.db'
            if (filename !== ':memory:') {
                if (!path.isAbsolute(filename)) {
                    filename = path.join(app.config.home, 'var', filename)
                }
                dbOptions.storage = filename
                dbOptions.retry = {
                    match: [
                        /SQLITE_BUSY/
                    ],
                    name: 'query',
                    max: 10
                }
                dbOptions.pool = {
                    maxactive: 1,
                    max: 5,
                    min: 0,
                    idle: 2000
                }
            }
        } else if (dbOptions.dialect === 'postgres') {
            dbOptions.host = app.config.context.options.host || 'postgres'
            dbOptions.port = app.config.context.options.port || 5432
            dbOptions.username = app.config.context.options.username
            dbOptions.password = app.config.context.options.password
            dbOptions.database = app.config.context.options.database || 'ff-context'

            // This needs to go
            const pgOptions = {
                user: dbOptions.username,
                password: dbOptions.password,
                host: dbOptions.host,
                port: dbOptions.port,
                database: 'postgres'
            }

            const client = new Client(pgOptions)

            try {
                await client.connect()
                const exists = await client.query(`SELECT 1 from pg_database WHERE datname = '${dbOptions.database}'`)
                if (exists.rowCount === 0) {
                    await client.query(`CREATE DATABASE "${dbOptions.database}"`)
                    await client.end()
                }
            } catch (err) {
                console.log('err:', err)
                app.log.error(`FlowForge File Server Failed to create context the database ${dbOptions.database} on ${dbOptions.host}`)
            }
        }

        sequelize = new Sequelize(dbOptions)

        app.log.info(`FlowForge File Server Sequelize Context connected to ${dbOptions.dialect} on ${dbOptions.host || dbOptions.storage}`)

        const Context = sequelize.define('Context', {
            project: { type: DataTypes.STRING, allowNull: false, unique: 'context-project-scope-unique' },
            scope: { type: DataTypes.STRING, allowNull: false, unique: 'context-project-scope-unique' },
            values: { type: DataTypes.JSON, allowNull: false }
        })
        sequelize.sync()
        this.Context = Context
    },
    set: async function (projectId, scope, input) {
        await sequelize.transaction({
            type: Sequelize.Transaction.TYPES.IMMEDIATE
        },
        async (t) => {
            let existing = await this.Context.findOne({
                where: {
                    project: projectId,
                    scope
                },
                lock: t.LOCK.UPDATE,
                transaction: t
            })
            if (!existing) {
                console.log('new scope')
                existing = new this.Context({
                    project: projectId,
                    scope,
                    values: {}
                })
            }
            for (const i in input) {
                const path = input[i].key
                const value = input[i].value
                util.setMessageProperty(existing.values, path, value)
            }
            existing.changed('values', true)
            await existing.save({ transaction: t })
        })
    },
    get: async function (projectId, scope, keys) {
        console.log(scope)
        const row = await this.Context.findOne({
            attributes: ['values'],
            where: {
                project: projectId,
                scope
            }
        })
        const values = []
        if (row) {
            const data = row.values
            keys.forEach(key => {
                const value = util.getObjectProperty(data, key)
                values.push({
                    key,
                    value
                })
            })
        }
        return values
    },
    keys: async function (projectId, scope) {
        if (scope !== 'global') {
            if (scope.indexOf(':') !== -1) {
                const parts = scope.split(':')
                scope = `${parts[1]}.nodes.${parts[0]}`
            } else {
                scope = `${scope}.flow`
            }
        }
        const row = await this.Context.findOne({
            attributes: ['values'],
            where: {
                project: projectId,
                scope
            }
        })
        if (row) {
            return Object.keys(row.values)
        } else {
            return []
        }
    },
    delete: async function (projectId, scope) {
        const existing = await this.Context.findOne({
            where: {
                project: projectId,
                scope
            }
        })
        if (existing) {
            await existing.destroy()
        }
    },
    clean: async function (projectId, ids) {
        const scopesResults = await this.Context.findAll({
            where: {
                project: projectId
            }
        })
        const scopes = scopesResults.map(s => s.scope)
        if (scopes.includes('global')) {
            scopes.splice(scopes.indexOf('global'), 1)
        }
        if (scopes.length === 0) {
            return
        }
        const keepFlows = []
        const keepNodes = []
        for (const i in ids) {
            const id = ids[i]
            for (const s in scopes) {
                const scope = scopes[s]
                if (scope.startsWith(`${id}.flow`)) {
                    keepFlows.push(scope)
                } else if (scope.endsWith(`nodes.${id}`)) {
                    keepNodes.push(scope)
                }
            }
        }
        for (const s in scopes) {
            const scope = scopes[s]
            if (keepFlows.includes(scope) || keepNodes.includes(scope)) {
                continue
            } else {
                const r = await this.Context.findOne({
                    where: {
                        project: projectId,
                        scope
                    }
                })
                await r.destroy()
            }
        }
    },
    quota: async function (projectId) {
        const scopesResults = await this.Context.findAll({
            where: {
                project: projectId
            }
        })
        let size = 0
        scopesResults.forEach(scope => {
            const strValues = JSON.stringify(scope.values)
            size += strValues.length
        })
        return size
    }
}
