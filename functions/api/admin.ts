// Dev view: every code with its summary. Protected by the ADMIN_KEY environment variable.
import type { Env } from './sync.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (!env.ADMIN_KEY) return json({ error: 'ADMIN_KEY is not set' }, 503)
  if (request.headers.get('authorization') !== `Bearer ${env.ADMIN_KEY}`) return json({ error: 'unauthorized' }, 401)
  if (request.method === 'DELETE') {
    const code = new URL(request.url).searchParams.get('code')
    if (!code) return json({ error: 'code' }, 400)
    await env.KV.delete('u:' + code)
    return json({ ok: true })
  }
  const users: { code: string; xp?: number; lessons?: number; updated?: string }[] = []
  let cursor: string | undefined
  do {
    const r = await env.KV.list({ prefix: 'u:', cursor })
    for (const k of r.keys) users.push({ code: k.name.slice(2), ...(k.metadata as object) })
    cursor = r.list_complete ? undefined : r.cursor
  } while (cursor)
  return json({ users: users.sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? '')) })
}
