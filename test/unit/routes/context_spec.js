const should = require('should') // eslint-disable-line
const setup = require('../setup')
const util = require('util')

const fv1 = { key: 'flow-key-1', value: 'flow-1' }
const fv2 = { key: 'flow-key-2', value: { bool: true, num: 0, str: 'hello' } }
const gv1 = { key: 'global-key-1', value: 'global-1' }
const gv2 = { key: 'global-key-2', value: { bool: true, num: 0, str: 'hello' } }
const nv1 = { key: 'node-1-key-1', value: 'node-1-1' }
const nv2 = { key: 'node-1-key-2', value: { bool: true, num: 0, str: 'hello' } }

describe('Context API', function () {
    contextApiTests({
        driverType: 'memory',
        driverOptions: {},
        appPort: 4011,
        authServerPort: 4012
    })
    // contextApiTests({
    //     driverType: 'postgres',
    //     driverOptions: { /* TODO */ },
    //     appPort: 4021,
    //     authServerPort: 4022
    // })
    // contextApiTests({
    //     driverType: 'redis',
    //     driverOptions: { /* TODO */},
    //     appPort: 4021,
    //     authServerPort: 4022
    // })
})

function contextApiTests ({ driverType, driverOptions, appPort, authServerPort } = {}) {
    describe(`${driverType} driver`, function () {
        let app, authServer
        before(async function () {
            app = await setup.setupApp({
                port: appPort,
                base_url: `http://localhost:${authServerPort}`,
                contextDriver: driverType,
                contextDriverOptions: driverOptions
            })
            authServer = setup.authServer({
                port: authServerPort,
                authConfig: [
                    { token: 'test-token-1', projectId: 'test-project-1' },
                    { token: 'test-token-2', projectId: 'test-project-2' }
                ]
            })
        })

        after(async function () {
            if (authServer) {
                const closeAuthServer = util.promisify(authServer.close).bind(authServer)
                await closeAuthServer()
                authServer = null
            }
            if (app) {
                await app.close()
                app = null
            }
        })

        // #region Helper functions
        /**
         * POST /v1/context/{project}/{scope}
         * @param {string|'flow'|'global'} scope - the context scope to set the value in
         * @param {Array<{key:String,value:Any}>} body - the key/values to set
         * @param {String} project - The project to set the context in (optional, defaults to 'test-project-1')
         * @param {String} token - The token to use (optional, defaults to 'test-token-1')
        */
        async function SET (scope, body, project = 'test-project-1', token = 'test-token-1') {
            const opts = {
                method: 'POST',
                url: `/v1/context/${project}/${scope}`,
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`
                },
                body
            }
            return await app.inject(opts)
        }

        /**
         * GET /v1/context/{project}/{scope}?{key=...&key=...}
         * @param {string|'flow'|'global'} scope - the context scope to set the value in
         * @param {Array<String>} keys - the key/values to set
         * @param {String} project - The project to set the context in (optional, defaults to 'test-project-1')
         * @param {String} token - The token to use (optional, defaults to 'test-token-1')
        */
        async function GET (scope, keys, project = 'test-project-1', token = 'test-token-1') {
            const query = Array.isArray(keys) ? new URLSearchParams(keys.map(k => ['key', k])).toString() || '' : ''
            const opts = {
                method: 'GET',
                url: `/v1/context/${project}/${scope}?${query}`,
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`
                }
            }
            return await app.inject(opts)
        }

        /**
         * DELETE /v1/context/{project}/{scope}
         * @param {string|'flow'|'global'} scope - the context scope to set the value in
         * @param {String} project - The project to set the context in (optional, defaults to 'test-project-1')
         * @param {String} token - The token to use (optional, defaults to 'test-token-1')
        */
        async function DELETE (scope = 'global', project = 'test-project-1', token = 'test-token-1') {
            const opts = {
                method: 'DELETE',
                url: `/v1/context/${project}/${scope}`,
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`
                }
            }
            return await app.inject(opts)
        }

        /**
         * POST /v1/context/{project}/clean
         * @param {[String]} activeIds - An array of active ids to keep context for
         * @param {String} project - The project to set the context in (optional, defaults to 'test-project-1')
         * @param {String} token - The token to use (optional, defaults to 'test-token-1')
        */
        async function CLEAN (activeIds, project = 'test-project-1', token = 'test-token-1') {
            const opts = {
                method: 'POST',
                url: `/v1/context/${project}/clean`,
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`
                },
                body: activeIds
            }
            return await app.inject(opts)
        }

        /**
         * KEYS /v1/context/{project}/{scope}/keys
         * @param {string|'flow'|'global'} scope - the context scope to set the value in
         * @param {String} project - The project to set the context in (optional, defaults to 'test-project-1')
         * @param {String} token - The token to use (optional, defaults to 'test-token-1')
        */
        async function KEYS (scope = 'global', project = 'test-project-1', token = 'test-token-1') {
            const opts = {
                method: 'GET',
                url: `/v1/context/${project}/${scope}/keys`,
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`
                }
            }
            return await app.inject(opts)
        }
        // #endregion

        it('Should load file-server application', async function () {
            should(app).be.an.Object()
        })

        describe('Delete API', function () {
            beforeEach(async function () {
                await SET('flow', [fv1])
                await SET('flow', [fv2])
                await SET('global', [gv1])
                await SET('global', [gv2])
                await SET('node-1', [nv1])
                await SET('node-1', [nv2])
            })
            it('Should delete flow context', async function () {
                const response = await DELETE('flow')
                should(response.statusCode).eql(200)
                const keys = await KEYS('flow')
                should(keys.json()).deepEqual([], 'Keys should be empty after delete')
            })
            it('Should delete global context', async function () {
                const response = await DELETE('global')
                should(response.statusCode).eql(200)
                const keys = await KEYS('global')
                should(keys.json()).deepEqual([], 'Keys should be empty after delete')
            })
            it('Should delete node-1 context', async function () {
                const response = await DELETE('node-1')
                should(response.statusCode).eql(200)
                const keys = await KEYS('node-1')
                should(keys.json()).deepEqual([], 'Keys should be empty after delete')
            })
        })
        describe('Clean API', function () {
            beforeEach(async function () {
                await DELETE('flow')
                await DELETE('global')
                await DELETE('node-1')
                await SET('flow', [fv1])
                await SET('flow', [fv2])
                await SET('global', [gv1])
                await SET('global', [gv2])
                await SET('node-1', [nv1])
                await SET('node-1', [nv2])
                await SET('node-2', [nv1])
                await SET('node-2', [nv2])
                await SET('node-3', [nv1])
                await SET('node-3', [nv2])
            })
            it('Should clean all context', async function () {
                await CLEAN([])
                const flowKeys = await KEYS('flow')
                should(flowKeys.json()).deepEqual([], 'Flow Keys should be empty after clean')
                const globalKeys = await KEYS('global')
                should(globalKeys.json()).deepEqual([gv1.key, gv2.key], 'Global Keys should not be empty after clean')
                const node1Keys = await KEYS('node-1')
                should(node1Keys.json()).deepEqual([], 'Node-1 Keys should be empty after clean')
                const node2Keys = await KEYS('node-2')
                should(node2Keys.json()).deepEqual([], 'Node-2 Keys should be empty after clean')
                const node3Keys = await KEYS('node-3')
                should(node3Keys.json()).deepEqual([], 'Node-3 Keys should be empty after clean')
            })
            it('Should clean all except node-1 context', async function () {
                await CLEAN(['node-3'])
                const flowKeys = await KEYS('flow')
                should(flowKeys.json()).deepEqual([], 'Flow Keys should be empty after clean')
                const globalKeys = await KEYS('global')
                should(globalKeys.json()).deepEqual([gv1.key, gv2.key], 'Global Keys should not be empty after clean')
                const node1Keys = await KEYS('node-1')
                should(node1Keys.json()).deepEqual([], 'Node-1 Keys should be empty after clean')
                const node2Keys = await KEYS('node-2')
                should(node2Keys.json()).deepEqual([], 'Node-2 Keys should be empty after clean')
                const node3Keys = await KEYS('node-3')
                should(node3Keys.json()).deepEqual([nv1.key, nv2.key], 'Node-3 Keys should not be empty')
            })
            it('Should clean all except node-1, node-2, node-3 context', async function () {
                await CLEAN(['node-1', 'node-2', 'node-3'])
                const flowKeys = await KEYS('flow')
                should(flowKeys.json()).deepEqual([], 'Flow Keys should be empty after clean')
                const globalKeys = await KEYS('global')
                should(globalKeys.json()).deepEqual([gv1.key, gv2.key], 'Global Keys should not be empty after clean')
                const node1Keys = await KEYS('node-1')
                should(node1Keys.json()).deepEqual([nv1.key, nv2.key], 'Node-1 Keys should not be empty')
                const node2Keys = await KEYS('node-2')
                should(node2Keys.json()).deepEqual([nv1.key, nv2.key], 'Node-2 Keys should not be empty')
                const node3Keys = await KEYS('node-3')
                should(node3Keys.json()).deepEqual([nv1.key, nv2.key], 'Node-3 Keys should not be empty')
            })
        })
        describe('Keys API', function () {
            beforeEach(async function () {
                await DELETE('global')
                await CLEAN([])
            })
            it('Should get empty array if no keys exist in flow', async function () {
                const response = await KEYS('flow')
                should(response.statusCode).eql(200)
                should(response.json()).deepEqual([])
            })
            it('Should get empty array if no keys exist in global', async function () {
                const response = await KEYS('global')
                should(response.statusCode).eql(200)
                should(response.json()).deepEqual([])
            })
            it('Should get empty array if no keys exist in node-1', async function () {
                const response = await KEYS('node-1')
                should(response.statusCode).eql(200)
                should(response.json()).deepEqual([])
            })
            it('Should get keys for flow context', async function () {
                await SET('flow', [fv1, fv2])
                const response = await KEYS('flow')
                should(response.statusCode).eql(200)
                should(response.json()).deepEqual(['flow-key-1', 'flow-key-2'])
            })
            it('Should get keys for global context', async function () {
                await SET('global', [gv1, gv2])
                const response = await KEYS('global')
                should(response.statusCode).eql(200)
                should(response.json()).deepEqual(['global-key-1', 'global-key-2'])
            })
            it('Should get keys for node-1 context', async function () {
                await SET('node-1', [nv1, nv2])
                const response = await KEYS('node-1')
                should(response.statusCode).eql(200)
                should(response.json()).deepEqual(['node-1-key-1', 'node-1-key-2'])
            })
        })
        describe('Set API', function () {
            before(async function () {
                await DELETE('global')
                await CLEAN()
            })
            describe('Set flow context value', function () {
                it('Should set a single value', async function () {
                    const response = await SET('flow', [{ key: 'test', value: 'test' }])
                    should(response.statusCode).eql(200)
                })
                it('Should set multiple values in top level of context', async function () {
                    const response = await SET('flow', [{ key: 'test', value: 'test' }, { key: 'test2', value: 'test2' }])
                    should(response.statusCode).eql(200)
                })
                it('Should set nested property and create object that did previously not exist', async function () {
                    const response = await SET('flow', [{ key: 'nested.nested1.nested1', value: 'nested1 value' }])
                    should(response.statusCode).eql(200)
                })
                it('Should set nested property and on existing object', async function () {
                    const response = await SET('flow', [{ key: 'nested.nested1.nested2', value: 'nested2 value' }])
                    should(response.statusCode).eql(200)
                })
                it('Should fail if key is invalid', async function () {
                    const response = await SET('flow', [{ key: '.{}', value: 'test' }])
                    should(response.statusCode).eql(500)
                    should(response.body.includes('INVALID_EXPR')).be.True('Expected error to contain "INVALID_EXPR"')
                })
            })
            describe('Set global context value', function () {
                it('Should set a single value in top level of context', async function () {
                    const response = await SET('global', [{ key: 'test', value: 'test' }])
                    should(response.statusCode).eql(200)
                })
                it('Should set multiple values in top level of context', async function () {
                    const response = await SET('global', [{ key: 'test', value: 'test' }, { key: 'test2', value: 'test2' }])
                    should(response.statusCode).eql(200)
                })
                it('Should set nested property and create object that did previously not exist', async function () {
                    const response = await SET('global', [{ key: 'nested.nested1.nested1', value: 'nested1 value' }])
                    should(response.statusCode).eql(200)
                })
                it('Should set nested property and on existing object', async function () {
                    const response = await SET('global', [{ key: 'nested.nested1.nested2', value: 'nested2 value' }])
                    should(response.statusCode).eql(200)
                })
                it('Should fail if key is invalid', async function () {
                    const response = await SET('global', [{ key: '.{}', value: 'test' }])
                    should(response.statusCode).eql(500)
                    should(response.body.includes('INVALID_EXPR')).be.True('Expected error to contain "INVALID_EXPR"')
                })
            })
            describe('Set node-1 context value', function () {
                it('Should set a single value in top level of context', async function () {
                    const response = await SET('node-1', [{ key: 'test', value: 'test' }])
                    should(response.statusCode).eql(200)
                })
                it('Should set multiple values in top level of context', async function () {
                    const response = await SET('node-1', [{ key: 'test', value: 'test' }, { key: 'test2', value: 'test2' }])
                    should(response.statusCode).eql(200)
                })
                it('Should set nested property and create object that did previously not exist', async function () {
                    const response = await SET('node-1', [{ key: 'nested.nested1.nested1', value: 'nested1 value' }])
                    should(response.statusCode).eql(200)
                })
                it('Should set nested property and on existing object', async function () {
                    const response = await SET('node-1', [{ key: 'nested.nested1.nested2', value: 'nested2 value' }])
                    should(response.statusCode).eql(200)
                })
                it('Should fail if key is invalid', async function () {
                    const response = await SET('node-1', [{ key: '.{}', value: 'test' }])
                    should(response.statusCode).eql(500)
                    should(response.body.includes('INVALID_EXPR')).be.True('Expected error to contain "INVALID_EXPR"')
                })
            })
            describe('Set value to undefined to delete the item', function () {
                it('Should remove a single value in top level of context', async function () {
                    // Set some context values & ensure they are set
                    await SET('flow', [fv1, fv2])
                    const _fv1 = await GET('flow', ['flow-key-1'])
                    const _fv2 = await GET('flow', ['flow-key-2'])
                    should(_fv1.json()).deepEqual([fv1])
                    should(_fv2.json()).deepEqual([fv2])
                    // perform the delete by setting the value to undefined
                    await SET('flow', [{ key: 'flow-key-1', value: undefined }])
                    const _fv1AfterDelete = await GET('flow', ['flow-key-1'])
                    const _fv2AfterDelete = await GET('flow', ['flow-key-2'])
                    // check that the value is deleted
                    should(_fv1AfterDelete.json()).eql([{ key: fv1.key }])
                    should(_fv2AfterDelete.json()).eql([fv2])
                })
                it('Should remove a nested value', async function () {
                    // Set a nested context value & ensure it is set
                    const nnv = { key: 'nested1.nested2.nested3', value: 'nested3 value' }
                    await SET('flow', [nnv]) // set a nested context value
                    // check that the values are set
                    const _nnv = await GET('flow', ['nested1'])
                    should(_nnv.json()).deepEqual([{ key: 'nested1', value: { nested2: { nested3: 'nested3 value' } } }])
                    // perform the delete by setting the value to undefined
                    await SET('flow', [{ key: 'nested1.nested2', value: undefined }])
                    const _nnvAfterDelete = await GET('flow', ['nested1'])
                    // check that the value is deleted
                    should(_nnvAfterDelete.json()).eql([{ key: 'nested1', value: { } }])
                })
            })
        })
        describe('Get API', function () {
            before(async function () {
                await DELETE('flow')
                await DELETE('global')
                await DELETE('node-1')
                await SET('flow', [fv1])
                await SET('flow', [fv2])
                await SET('global', [gv1])
                await SET('global', [gv2])
                await SET('node-1', [nv1])
                await SET('node-1', [nv2])
            })
            describe('Get flow context value', function () {
                it('Should get a single value', async function () {
                    const response = await GET('flow', ['flow-key-1'])
                    should(response.statusCode).eql(200)
                    should(response.json()).deepEqual([fv1])
                })
                it('Should get multiple values - all known', async function () {
                    const response = await GET('flow', ['flow-key-1', 'flow-key-2'])
                    should(response.statusCode).eql(200)
                    should(response.json()).deepEqual([fv1, fv2])
                })
                it('Should get multiple values - include unknown', async function () {
                    const response = await GET('flow', ['flow-key-1', 'flow-key-2', 'flow-key-2.unknown', 'flow-key-x.unknown', 'flow-key-2.str'])
                    should(response.statusCode).eql(200)
                    const result = response.json()
                    should(result).be.an.Object()
                    should(result.find(e => e.key === 'flow-key-1')).deepEqual(fv1)
                    should(result.find(e => e.key === 'flow-key-2')).deepEqual(fv2)
                    should(result.find(e => e.key === 'flow-key-2.unknown')).containDeep({ key: 'flow-key-2.unknown' }) // no value for unknown
                    should(result.find(e => e.key === 'flow-key-2.str')).containDeep({ key: 'flow-key-2.str', value: fv2.value.str })
                })
                it('should return error for bad key', async function () {
                    const response = await GET('flow', ['x.[].x'])
                    should(response.statusCode).eql(500, 'Should have returned an error for bad key')
                })
                it('should return error if bad key included in multiple keys', async function () {
                    const response = await GET('flow', ['flow-key-1', '.1.x', 'flow-key-2.unknown', 'flow-key-1.str'])
                    should(response.statusCode).eql(500, 'Should have returned an error for bad key')
                })
            })
            describe('Get global context value', function () {
                it('Should get a single value', async function () {
                    const response = await GET('global', ['global-key-1'])
                    should(response.statusCode).eql(200)
                    should(response.json()).deepEqual([gv1])
                })
                it('Should get multiple values - all known', async function () {
                    const response = await GET('global', ['global-key-1', 'global-key-2'])
                    should(response.statusCode).eql(200)
                    should(response.json()).deepEqual([gv1, gv2])
                })
                it('Should get multiple values - include unknown', async function () {
                    const response = await GET('global', ['global-key-1', 'global-key-2', 'global-key-2.unknown', 'global-key-x.unknown', 'global-key-2.str'])
                    should(response.statusCode).eql(200)
                    const result = response.json()
                    should(result).be.an.Object()
                    should(result.find(e => e.key === 'global-key-1')).deepEqual(gv1)
                    should(result.find(e => e.key === 'global-key-2')).deepEqual(gv2)
                    should(result.find(e => e.key === 'global-key-2.unknown')).containDeep({ key: 'global-key-2.unknown' }) // no value for unknown
                    should(result.find(e => e.key === 'global-key-2.str')).containDeep({ key: 'global-key-2.str', value: gv2.value.str })
                })
                it('should return error for bad key', async function () {
                    const response = await GET('global', ['x.[].x'])
                    should(response.statusCode).eql(500, 'Should have returned an error for bad key')
                })
                it('should return error if bad key included in multiple keys', async function () {
                    const response = await GET('global', ['global-key-1', '.1.x', 'global-key-2.unknown', 'global-key-1.str'])
                    should(response.statusCode).eql(500, 'Should have returned an error for bad key')
                })
            })
            describe('Get node-1 context value', function () {
                it('Should get a single value', async function () {
                    const response = await GET('node-1', ['node-1-key-1'])
                    should(response.statusCode).eql(200)
                    should(response.json()).deepEqual([nv1])
                })
                it('Should get multiple values - all known', async function () {
                    const response = await GET('node-1', ['node-1-key-1', 'node-1-key-2'])
                    should(response.statusCode).eql(200)
                    should(response.json()).deepEqual([nv1, nv2])
                })
                it('Should get multiple values - include unknown', async function () {
                    const response = await GET('node-1', ['node-1-key-1', 'node-1-key-2', 'node-1-key-2.unknown', 'node-1-key-x.unknown', 'node-1-key-2.str'])
                    should(response.statusCode).eql(200)
                    const result = response.json()
                    should(result).be.an.Object()
                    should(result.find(e => e.key === 'node-1-key-1')).deepEqual(nv1)
                    should(result.find(e => e.key === 'node-1-key-2')).deepEqual(nv2)
                    should(result.find(e => e.key === 'node-1-key-2.unknown')).containDeep({ key: 'node-1-key-2.unknown' }) // no value for unknown
                    should(result.find(e => e.key === 'node-1-key-2.str')).containDeep({ key: 'node-1-key-2.str', value: nv2.value.str })
                })
                it('should return error for bad key', async function () {
                    const response = await GET('node-1', ['x.[].x'])
                    should(response.statusCode).eql(500, 'Should have returned an error for bad key')
                })
                it('should return error if bad key included in multiple keys', async function () {
                    const response = await GET('node-1', ['node-1-key-1', '.1.x', 'node-1-key-2.unknown', 'node-1-key-1.str'])
                    should(response.statusCode).eql(500, 'Should have returned an error for bad key')
                })
            })
        })

        describe('Bleed tests', function () {
            it('Should not be able to access to other projects context', async function () {
                // 1st set some values in test-project-1 to ensure that the token is cached
                const set1 = await SET('flow', [fv1, fv2], 'test-project-1', 'test-token-1')
                should(set1.statusCode).eql(200)
                const set2 = await SET('flow', [fv1, fv2], 'test-project-2', 'test-token-1')
                should(set2.statusCode).eql(401)
            })
        })
    })
}
