import type { Progress } from './logic'

// The sync code is the user's only "account": no email, just a code they choose.
const CODE = 'study-app.code'
const ANON = 'study-app.anon' // dismissed the code pop-up with the X

export const MIN_CODE = 3
export const cleanCode = (c: string) => c.trim().toLowerCase()

export function getCode(): string | null {
  try { return localStorage.getItem(CODE) } catch { return null }
}
export function setCode(c: string | null) {
  try { c ? localStorage.setItem(CODE, c) : localStorage.removeItem(CODE) } catch { /* blocked: the code lasts until the tab closes */ }
}
export function isAnon(): boolean {
  try { return localStorage.getItem(ANON) === '1' } catch { return false }
}
export function setAnon() {
  try { localStorage.setItem(ANON, '1') } catch { /* blocked: the pop-up shows again next visit */ }
}

// Sends the local progress and gets back the merge with what the server (other devices) has.
// mode 'new' fails with 409 if the code is taken, 'join' with 404 if it doesn't exist yet; no mode = background sync.
export async function push(code: string, progress: Progress, mode?: 'new' | 'join'): Promise<Progress> {
  const r = await fetch('/api/sync', { method: 'PUT', body: JSON.stringify({ code, progress, mode }) })
  if (!r.ok) throw new Error(String(r.status))
  return (await r.json()).progress
}
