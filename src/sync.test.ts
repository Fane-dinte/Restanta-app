import { test } from 'node:test'
import assert from 'node:assert/strict'
import { merge } from './merge.ts'
import { fresh } from './logic.ts'
import { onRequest as sync, type Env, type KV } from '../functions/api/sync.ts'
import { onRequest as admin } from '../functions/api/admin.ts'

const fakeKV = (): KV => {
  const m = new Map<string, { v: string; meta?: unknown }>()
  return {
    get: async k => m.get(k)?.v ?? null,
    put: async (k, v, o) => { m.set(k, { v, meta: o?.metadata }) },
    delete: async k => { m.delete(k) },
    list: async ({ prefix }) => ({ keys: [...m].filter(([k]) => k.startsWith(prefix)).map(([name, x]) => ({ name, metadata: x.meta })), list_complete: true }),
  }
}
const put = (env: Env, code: unknown, progress: unknown) =>
  sync({ request: new Request('http://x/api/sync', { method: 'PUT', body: JSON.stringify({ code, progress }) }), env })

test('merge keeps the work from both devices', () => {
  const a = { ...fresh(), xp: 40, days: { '2026-10-26': 'study' as const }, done: { 'an-1-1': 1 }, log: [{ d: '2026-10-26', l: 'an-1-1', xp: 40, s: 60, miss: [] }] }
  const b = { ...fresh(), xp: 25, days: { '2026-10-26': 'freeze' as const, '2026-10-27': 'study' as const }, done: { 'an-1-1': 2, 'c-1-1': 1 }, freezes: 1 }
  const m = merge(a, b)
  assert.equal(m.xp, 40)
  assert.equal(m.days['2026-10-26'], 'study')
  assert.deepEqual(m.done, { 'an-1-1': 2, 'c-1-1': 1 })
  assert.equal(m.freezes, 1)
  assert.equal(merge(m, m).log.length, 1)
})

test('sync: codes are case-insensitive, min 3 chars, and a second device gets the merged progress', async () => {
  const env: Env = { KV: fakeKV(), ADMIN_KEY: 'k' }
  assert.equal((await put(env, 'ab', fresh())).status, 400)
  assert.equal((await put(env, 'Ana', { ...fresh(), xp: 50 })).status, 200)
  const r = await (await put(env, ' ana ', { ...fresh(), xp: 10, done: { 'c-1-1': 1 } })).json() as { progress: { xp: number; done: object } }
  assert.equal(r.progress.xp, 50)
  assert.deepEqual(r.progress.done, { 'c-1-1': 1 })
  assert.equal((await put(env, 'ana', { nope: 1 })).status, 400)
})

test('admin: needs the key, lists codes, deletes one', async () => {
  const env: Env = { KV: fakeKV(), ADMIN_KEY: 'k' }
  await put(env, 'ana', { ...fresh(), xp: 7 })
  const call = (key: string, method = 'GET', q = '') => admin({ request: new Request('http://x/api/admin' + q, { method, headers: { authorization: `Bearer ${key}` } }), env })
  assert.equal((await call('wrong')).status, 401)
  const list = await (await call('k')).json() as { users: { code: string; xp: number }[] }
  assert.deepEqual(list.users.map(u => [u.code, u.xp]), [['ana', 7]])
  await call('k', 'DELETE', '?code=ana')
  assert.equal(((await (await call('k')).json()) as { users: unknown[] }).users.length, 0)
})

test('sync: a new code cannot take an existing one, and joining needs one that exists', async () => {
  const env: Env = { KV: fakeKV(), ADMIN_KEY: 'k' }
  const go = (code: string, mode?: string) => sync({ request: new Request('http://x/api/sync', { method: 'PUT', body: JSON.stringify({ code, progress: fresh(), mode }) }), env })
  assert.equal((await go('ana', 'join')).status, 404)
  assert.equal((await go('ana', 'new')).status, 200)
  assert.equal((await go('Ana', 'new')).status, 409)
  assert.equal((await go('ana', 'join')).status, 200)
  assert.equal((await go('ana')).status, 200)
})
