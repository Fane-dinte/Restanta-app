import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buy, canBuy, coins, equip, equipped } from './store.ts'
import { ACHIEVEMENTS, bestStreak } from './achievements.ts'
import { CH_REWARD, finishChallenge, pickChallenge } from './challenge.ts'
import { merge } from './merge.ts'
import { fresh, localize, type Course } from './logic.ts'

const courses: Course[] = [localize(JSON.parse(readFileSync(new URL('./content/analiza.json', import.meta.url), 'utf8')), 'ro')]

test('shop: spending lowers coins but never xp, and equipping needs ownership', () => {
  const p = { ...fresh(), xp: 200 }
  const b = buy(p, 'apus')
  assert.equal(b.xp, 200)
  assert.equal(coins(b), 50)
  assert.equal(canBuy(b, 'apus'), false) // already owned
  assert.equal(buy(b, 'argint'), b) // 80 > 50 coins
  assert.equal(equip(p, 'palette', 'apus'), p) // not owned
  assert.equal(equipped(equip(b, 'palette', 'apus'), 'palette'), 'apus')
  assert.equal(equipped(equip(b, 'palette', 'subject'), 'palette'), 'subject') // the free default is always allowed
})

test('achievements: longest streak ignores gaps and a freeze day bridges without counting', () => {
  assert.equal(bestStreak({ '2026-10-01': 'study', '2026-10-02': 'study', '2026-10-04': 'study' }), 2)
  assert.equal(bestStreak({ '2026-10-01': 'study', '2026-10-02': 'freeze', '2026-10-03': 'study' }), 2)
  assert.ok(ACHIEVEMENTS.every(a => a.title.ro && a.title.en && a.desc.ro && a.desc.en))
  assert.equal(new Set(ACHIEVEMENTS.map(a => a.id)).size, ACHIEVEMENTS.length)
})

test('challenge: needs a finished lesson, prefers topics you missed, and pays a bonus', () => {
  const first = courses[0].units[0].lessons[0]
  assert.equal(pickChallenge(courses, fresh(), '2026-10-28', 'x'), null)
  const skill = first.exercises.find(e => e.skill)!.skill!
  const p = { ...fresh(), done: { [first.id]: 1 }, log: [{ d: '2026-10-27', l: first.id, xp: 10, s: 60, miss: [skill] }] }
  const ch = pickChallenge(courses, p, '2026-10-28', 'x')!
  assert.ok(ch.exercises.length > 0 && ch.exercises.length <= 8)
  assert.equal(ch.exercises[0].skill, skill)
  const after = finishChallenge(p, '2026-10-28', { xp: 10, s: 30, miss: [] })
  assert.equal(after.xp, 10 + CH_REWARD)
  assert.equal(after.days['2026-10-28'], 'study')
  assert.ok(after.ch?.['2026-10-28'])
})

test('merge: purchases from both devices are kept', () => {
  const m = merge({ ...fresh(), owned: ['apus'], equip: { palette: 'apus' } }, { ...fresh(), owned: ['argint'], equip: { frame: 'argint' } })
  assert.deepEqual(m.owned?.sort(), ['apus', 'argint'])
  assert.deepEqual(m.equip, { palette: 'apus', frame: 'argint' })
})
