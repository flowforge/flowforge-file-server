const { Sequelize, DataTypes } = require('sequelize')
const util = require('@node-red/util').util
const path = require('path')
const { Client } = require('pg')

let sequelize

module.exports = {
    init: async function (opts) {
        const dbOptions = {
            dialect: opts.type || 'sqlite',
            logging: !!opts.logging
        }

        if (dbOptions.dialect === 'sqlite') {
            let filename = opts.storage || 'context.db'
            if (filename !== ':memory:') {
                if (!path.isAbsolute(filename)) {
                    filename = path.join(__dirname, '../../var', filename)
                }
                dbOptions.storage = filename
            }
        } else if (dbOptions.dialect === 'postgres') {
            dbOptions.host = opts.host || 'postgres'
            dbOptions.port = opts.port || 5432
            dbOptions.username = opts.username
            dbOptions.password = opts.password
            dbOptions.database = opts.database || 'ff-context'

            const pgOptions = {
                user: dbOptions.username,
                password: dbOptions.password,
                host: dbOptions.host,
                port: dbOptions.port,
                database: 'postgres'
            }

            console.log(pgOptions)
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
            }
        }

        sequelize = new Sequelize(dbOptions)

        const Context = sequelize.define('Context', {
            project: { type: DataTypes.STRING, allowNull: false, unique: 'context-project-scope-unique' },
            scope: { type: DataTypes.STRING, allowNull: false, unique: 'context-project-scope-unique' },
            values: { type: DataTypes.JSON, allowNull: false }
        })
        sequelize.sync()
        this.Context = Context
    },
    set: async function (projectId, scope, input) {
        let existing = await this.Context.findOne({
            where: {
                project: projectId,
                scope
            }
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
        await existing.save()
    },
    get: async function (projectId, scope, keys) {
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
