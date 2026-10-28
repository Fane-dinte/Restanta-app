import { useState } from 'react'

type User = { code: string; xp?: number; lessons?: number; updated?: string }
const KEY = 'study-app.admin'

// Developer view at #dev: every sync code with its progress. The admin key is the ADMIN_KEY set on Cloudflare.
export function Dev() {
  const [key, setKey] = useState(() => { try { return sessionStorage.getItem(KEY) ?? '' } catch { return '' } })
  const [users, setUsers] = useState<User[] | null>(null)
  const [err, setErr] = useState('')

  async function call(method = 'GET', q = '') {
    const r = await fetch('/api/admin' + q, { method, headers: { authorization: `Bearer ${key}` } })
    if (!r.ok) throw new Error(r.status === 401 ? 'Wrong key' : r.status === 503 ? 'ADMIN_KEY is not set on the server' : `Error ${r.status}`)
    return r.json()
  }
  async function load() {
    setErr('')
    try {
      setUsers((await call()).users)
      try { sessionStorage.setItem(KEY, key) } catch { /* blocked: ask again next time */ }
    } catch (e) { setUsers(null); setErr((e as Error).message) }
  }
  async function del(code: string) {
    if (!confirm(`Delete "${code}" and its progress?`)) return
    try { await call('DELETE', `?code=${encodeURIComponent(code)}`); await load() } catch (e) { setErr((e as Error).message) }
  }

  return (
    <main className="dev">
      <h1>Dev</h1>
      <form onSubmit={e => { e.preventDefault(); void load() }}>
        <input className="answer" type="password" placeholder="Admin key" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" />
        <button className="chunky big" type="submit" disabled={!key}>Load codes</button>
      </form>
      {err && <p className="err" role="alert">{err}</p>}
      {users && (
        <table>
          <thead><tr><th>Code</th><th>XP</th><th>Lessons</th><th>Last sync</th><th /></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.code}>
                <td><b>{u.code}</b></td><td>{u.xp ?? '-'}</td><td>{u.lessons ?? '-'}</td>
                <td>{u.updated ? new Date(u.updated).toLocaleString('ro-RO') : '-'}</td>
                <td><button className="del" onClick={() => del(u.code)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {users && <p className="hint">{users.length} codes</p>}
      <p className="hint"><a href="#">Back to the app</a></p>
    </main>
  )
}
