import type { Progress } from './logic'

// Cosmetic shop: palettes recolor the app, frames recolor the border of perfect lessons.
export type Item = { id: string; kind: 'palette' | 'frame'; price: number; name: { ro: string; en: string }; color: string }

export const DEFAULTS = { palette: 'subject', frame: 'gold' } // free, always owned
export const FRAME_GOLD = '#e0a800'

export const ITEMS: Item[] = [
  { id: 'apus', kind: 'palette', price: 150, name: { ro: 'Apus', en: 'Sunset' }, color: '#c92a2a' },
  { id: 'padure', kind: 'palette', price: 150, name: { ro: 'Pădure', en: 'Forest' }, color: '#2b8a3e' },
  { id: 'ocean', kind: 'palette', price: 150, name: { ro: 'Ocean', en: 'Ocean' }, color: '#0b7285' },
  { id: 'prune', kind: 'palette', price: 150, name: { ro: 'Prună', en: 'Plum' }, color: '#9c36b5' },
  { id: 'argint', kind: 'frame', price: 80, name: { ro: 'Argint', en: 'Silver' }, color: '#a7b1bd' },
  { id: 'smarald', kind: 'frame', price: 80, name: { ro: 'Smarald', en: 'Emerald' }, color: '#12b886' },
  { id: 'coral', kind: 'frame', price: 80, name: { ro: 'Coral', en: 'Coral' }, color: '#ff6b6b' },
  { id: 'safir', kind: 'frame', price: 80, name: { ro: 'Safir', en: 'Sapphire' }, color: '#5c7cfa' },
]

const byId = (id: string) => ITEMS.find(i => i.id === id)
export const owned = (p: Progress) => p.owned ?? []
// Coins are the XP you earned minus what you spent, so spending never lowers your level.
export const coins = (p: Progress) => p.xp - owned(p).reduce((a, id) => a + (byId(id)?.price ?? 0), 0)
export const canBuy = (p: Progress, id: string) => { const i = byId(id); return !!i && !owned(p).includes(id) && coins(p) >= i.price }

export function buy(p: Progress, id: string): Progress {
  return canBuy(p, id) ? { ...p, owned: [...owned(p), id] } : p
}

export function equip(p: Progress, kind: Item['kind'], id: string): Progress {
  const free = id === DEFAULTS[kind]
  const item = byId(id)
  if (!free && !(item && item.kind === kind && owned(p).includes(id))) return p
  return { ...p, equip: { ...p.equip, [kind]: id } }
}

export const equipped = (p: Progress, kind: Item['kind']) => p.equip?.[kind] ?? DEFAULTS[kind]
export const colorOf = (id: string) => byId(id)?.color
