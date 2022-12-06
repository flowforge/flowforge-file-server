
const pg = require('pg')
const util = require('@node-red/util').util

// CREATE TABLE "context" (
//     project varchar(128) not NULL,
//     scope   varchar(128) not NULL,
//     values  json not NULL,
//     CONSTRAINT onlyone UNIQUE(project, scope)
//   );

const SELECT = 'SELECT "values" FROM "context" WHERE "project" = $1 AND "scope" = $2'
const INSERT = 'INSERT INTO "context"("project","scope","values") VALUES($1,$2,$3) ' +
               'ON CONFLICT (project, scope) DO ' +
               'UPDATE SET values = EXCLUDED.values'
const SCOPES = 'SELECT "scope" from "context" where "project" = $1'
const DEL = 'DELETE from "context" where "project" = $1 and "scope" = $2'

let pool

module.exports = {
    init: async function (opts) {
        pool = new pg.Pool(opts)
    },
    set: async function (projectId, scope, input) {
        const existing = await pool.query(SELECT, [projectId, scope])
        console.log(existing.rows)
        let start = {}
        if (existing.rows[0]) {
            start = existing.rows[0].values
        }
        for (const i in input) {
            const path = input[i].key
            const value = input[i].value
            util.setMessageProperty(start, path, value)
        }
        console.log(start)
        await pool.query(INSERT, [projectId, scope, start])
    },
    get: async function (projectId, scope, keys) {
        const row = await pool.query(SELECT, [projectId, scope])
        const values = []
        if (row.rows[0]) {
            const data = row.rows[0].values
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
        const row = await pool.query(SELECT, [projectId, scope])
        if (row.rows[0]) {
            return Object.keys(row.rows[0].values)
        } else {
            return []
        }
    },
    delete: async function (projectId, scope) {
        await pool.query(DEL, [projectId, scope])
    },
    clean: async function (projectId, ids) {
        const scopesResults = await pool.query(SCOPES, [projectId])
        const scopes = scopesResults.rows.map(s => s.scope)
        if (scopes.includes('global')) {
            scopes.splice(scopes.indexOf('global'))
        }
        if (scopes.length === 0) {
            return
        }
        // console.log('original', scopes)
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
        // console.log('keepFlows', keepFlows)
        // console.log('keepNodes', keepNodes)
        for (const s in scopes) {
            const scope = scopes[s]
            if (keepFlows.includes(scope) || keepNodes.includes(scope)) {
                continue
            } else {
                // console.log('remove ', scope)
                await pool.query(DEL, [projectId, scope])
            }
        }
    }
}
