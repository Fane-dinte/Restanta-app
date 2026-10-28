import type { Progress } from './logic'

// Combines progress from two devices without losing either: days and lessons are unioned,
// counters take the larger value. shortcut: xp and freezes are approximate after a merge, fine for a study app.
export function merge(a: Progress, b: Progress): Progress {
  const days = { ...a.days }
  for (const [d, v] of Object.entries(b.days)) if (days[d] !== 'study') days[d] = v // a study day beats a freeze day
  const done = { ...a.done }
  for (const [l, n] of Object.entries(b.done)) done[l] = Math.max(done[l] ?? 0, n)
  const seen = new Set<string>()
  const log = [...a.log, ...b.log].filter(e => { const k = `${e.d}|${e.l}|${e.s}|${e.xp}`; return !seen.has(k) && seen.add(k) })
    .sort((x, y) => x.d.localeCompare(y.d))
  return {
    days, done, log, xp: Math.max(a.xp, b.xp), freezes: Math.min(a.freezes, b.freezes),
    owned: [...new Set([...(a.owned ?? []), ...(b.owned ?? [])])],
    equip: { ...a.equip, ...b.equip }, // the device that syncs last decides what is equipped
    ch: { ...a.ch, ...b.ch },
  }
}
