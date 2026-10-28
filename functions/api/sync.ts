// Cloudflare Pages Function: progress stored under a user-chosen code (no email). Needs a KV binding named KV.
import { merge } from '../../src/merge.ts'
import type { Progress } from '../../src/logic.ts'

export type KV = {
  get(k: string): Promise<string | null>
  put(k: string, v: string, o?: { metadata?: unknown }): Promise<void>
  delete(k: string): Promise<void>
  list(o: { prefix: string; cursor?: string }): Promise<{ keys: { name: string; metadata?: unknown }[]; list_complete: boolean; cursor?: string }>
}
export type Env = { KV: KV; ADMIN_KEY?: string }

export const MIN = 3
export const normalize = (c: unknown) => (typeof c === 'string' ? c.trim().toLowerCase() : '')
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

// shortcut: no rate limit, so short codes can be guessed; add one (Turnstile or a counter in KV) if this gets abused
export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (request.method !== 'PUT') return json({ error: 'method' }, 405)
  const raw = await request.text()
  if (raw.length > 500_000) return json({ error: 'too big' }, 413)
  let body: { code?: unknown; progress?: Progress }
  try { body = JSON.parse(raw) } catch { return json({ error: 'bad json' }, 400) }
  const code = normalize(body.code)
  const p = body.progress
  if (code.length < MIN || code.length > 40) return json({ error: 'code' }, 400)
  if (!p || typeof p !== 'object' || !p.days || !p.done || !Array.isArray(p.log)) return json({ error: 'progress' }, 400)
  const old = await env.KV.get('u:' + code)
  const merged = old ? merge(JSON.parse(old).progress, p) : p
  await env.KV.put('u:' + code, JSON.stringify({ progress: merged }), {
    metadata: { xp: merged.xp, lessons: merged.log.length, updated: new Date().toISOString() },
  })
  return json({ progress: merged })
}
