import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import katex from 'katex'
import { addDays, level, levelStart, answerTex, finishLesson, fresh, instantiate, isCorrect, localize, prepare, settle, split, streak } from './logic.ts'
import type { Course, Day, Exercise, Question } from './logic.ts'

const q = (check: 'number' | 'expr' | 'text', answer: string): Question => ({ type: 'input', prompt: '', check, answer })

test('typed answers', () => {
  const right: [string, string][] = [
    ['-13-i', '-13 - i'], ['(1-i)/2', '1/2-1/2i'], ['(1-i)/2', '0,5-0,5i'], ['e^(1/3)', 'e^(1/3)'], ['e^(-1)', '1/e'],
    ['ln(2)', 'ln2'], ['ln(2)', 'ln 2'], ['ln(2)', 'log(2)'], ['ln(3)', 'ln(3)'], ['Infinity', '∞'], ['1/3', '0.3333333333'], ['i', 'i'],
  ]
  for (const [answer, typed] of right) assert.ok(isCorrect(q('number', answer), typed), `${typed} = ${answer}`)
  const wrong: [string, string][] = [['3', '4'], ['ln(2)', 'ln(3)'], ['2', '2+'], ['2', ' '], ['Infinity', '5'], ['1/3', '0.33'], ['5', 'x']]
  for (const [answer, typed] of wrong) assert.ok(!isCorrect(q('number', answer), typed), `${typed} != ${answer}`)
  assert.ok(isCorrect(q('expr', 'n+1'), '1+n'))
  assert.ok(isCorrect(q('expr', '2*x+2'), '2(x+1)'))
  assert.ok(!isCorrect(q('expr', 'n+1'), 'n'))
  assert.ok(isCorrect(q('text', 'n = 12'), '  n  =  12 '))
  assert.ok(!isCorrect(q('text', 'n = 12'), 'n=12'))
  assert.match(answerTex('ln(2)'), /\\ln/) // shown as ln, not log, after a mistake
  assert.ok(isCorrect({ type: 'mc', prompt: '', choices: ['a', 'b'], answer: 1 }, 1))
  assert.ok(!isCorrect({ type: 'mc', prompt: '', choices: ['a', 'b'], answer: 1 }, 0))
})

test('streak and freezes', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01')
  assert.equal(addDays('2026-03-30', -2), '2026-03-28') // across the DST change
  const days: Record<string, Day> = { '2026-10-20': 'study', '2026-10-21': 'freeze', '2026-10-22': 'study' }
  assert.equal(streak(days, '2026-10-22'), 2) // the freeze day keeps the streak but doesn't count
  assert.equal(streak(days, '2026-10-23'), 2) // not studied yet today: still alive
  assert.equal(streak(days, '2026-10-24'), 0)

  const p = { ...fresh(), days: { '2026-10-20': 'study' } as Record<string, Day> }
  const s = settle(p, '2026-10-23') // missed the 21st and 22nd: both freezes used
  assert.equal(s.freezes, 0)
  assert.equal(streak(s.days, '2026-10-23'), 1)
  assert.equal(settle(p, '2026-10-24'), p) // 3 missed days, only 2 freezes: keep them, the streak breaks
  assert.equal(settle(p, '2026-10-21'), p)
  assert.equal(settle(fresh(), '2026-10-21').freezes, 2)

  const f = finishLesson(s, '2026-10-23', { l: 'x', xp: 15, s: 60, miss: [] })
  assert.equal(streak(f.days, '2026-10-23'), 2)
  assert.equal(f.xp, 15)
  assert.equal(f.done.x, 1)
})

test('templates, pools and languages', () => {
  const sum: Exercise = { type: 'input', check: 'number', prompt: '[[a]]+[[b]]', answer: '[[a+b]]', vars: { a: [1, 9], b: [1, 9] }, where: 'a != b' }
  const mc: Exercise = { type: 'mc', prompt: '', choices: ['[[a]]', '[[b]]'], answer: 0, vars: { a: [1, 2], b: [1, 2] } }
  for (let k = 0; k < 50; k++) {
    const x = instantiate(sum) as Question & { type: 'input' }
    const [a, b] = x.prompt.split('+').map(Number)
    assert.ok(a !== b && a >= 1 && b <= 9, x.prompt)
    assert.equal(x.answer, String(a + b))
    const y = instantiate(mc) as Question & { type: 'mc' }
    assert.notEqual(y.choices[0], y.choices[1]) // equal choices get re-rolled
  }
  assert.equal((instantiate({ ...sum, answer: '[[fraction(4,2)]]' }) as Question & { type: 'input' }).answer, '2')
  const pool = { id: 'l', title: '', theory: [], pick: 3, exercises: [1, 2, 3, 4, 5].map(n => q('number', String(n))) }
  assert.equal(prepare(pool).exercises.length, 3)
  assert.equal(prepare({ ...pool, pick: undefined }).exercises.length, 5)
  assert.deepEqual(localize({ a: { ro: 'x', en: 'y' }, b: ['z', { ro: 1, en: 2 }] }, 'en'), { a: 'y', b: ['z', 2] })
})

test('content is valid', () => {
  const ids = new Set<string>()
  const text = (s: unknown, where: string) => {
    assert.equal(typeof s, 'string', `${where}: text missing in one language`)
    assert.ok(!(s as string).includes('[['), `${where}: [[ ]] without vars`)
    // a single \ in the JSON turns \frac, \bmod, \right, \to into control chars
    assert.ok(!/[\t\r\b\f]/.test(s as string), `${where}: control char, use \\\\ in the JSON`)
    for (const p of split(s as string)) {
      if (p.k === 'text') assert.ok(!p.v.includes('$'), `${where}: unbalanced $ near "${p.v.slice(0, 30)}"`)
      if (p.k === 'math' || p.k === 'display') assert.doesNotThrow(() => katex.renderToString(p.v, { throwOnError: true }), `${where}: $${p.v}$`)
    }
  }
  const question = (x: Question, where: string) => {
    text(x.prompt, where)
    text(x.explain, `${where} explain`) // every answer gets an explanation, right or wrong
    if (x.type === 'mc') {
      assert.ok(Number.isInteger(x.answer) && x.choices[x.answer] !== undefined, `${where}: mc answer index`)
      x.choices.forEach(c => text(c, where))
      assert.equal(new Set(x.choices).size, x.choices.length, `${where}: equal choices`)
    } else {
      assert.ok(['number', 'expr', 'text'].includes(x.check), `${where}: check`)
      assert.ok(isCorrect(x, x.answer), `${where}: answer "${x.answer}" does not parse`)
      if (x.check !== 'text') text(`$${answerTex(x.answer)}$`, `${where} (shown answer)`)
    }
  }
  for (const file of readdirSync(new URL('./content', import.meta.url))) {
    const raw = JSON.parse(readFileSync(new URL(`./content/${file}`, import.meta.url), 'utf8'))
    for (const lang of ['ro', 'en'] as const) {
      const course: Course = localize(raw, lang)
      text(course.title, file)
      if (course.hint !== undefined) text(course.hint, `${file} hint`)
      for (const u of course.units) {
        text(u.title, u.id)
        text(u.desc, u.id)
        for (const l of u.lessons) {
          if (lang === 'ro') assert.ok(!ids.has(l.id), `duplicate lesson id ${l.id}`)
          ids.add(l.id)
          text(l.title, l.id)
          assert.ok(l.theory.length > 0, `${l.id}: no theory`)
          l.theory.forEach((c, i) => text(c, `${l.id} theory ${i + 1} (${lang})`))
          assert.ok(l.exercises.length >= (l.pick ?? 1), `${l.id}: pool smaller than pick`)
          l.exercises.forEach((e, i) => {
            for (let k = 0; k < (e.vars ? 40 : 1); k++) {
              const where = `${l.id} #${i + 1} (${lang})`
              assert.ok(e.skill, `${where}: skill`)
              const x = instantiate(e)
              if (x.type !== 'steps') { question(x, where); continue }
              text(x.prompt, where)
              assert.ok(x.steps.length >= 2, `${where}: steps`)
              x.steps.forEach((s, j) => question(s, `${where}.${j + 1}`))
            }
          })
        }
      }
    }
  }
})

test('levels start at 100, 300, 600 XP', () => {
  assert.deepEqual([0, 99, 100, 299, 300, 600].map(level), [1, 1, 2, 2, 3, 4])
  assert.equal(levelStart(2), 100)
})

test('the first lesson of each course can be played with pick-an-answer only', () => {
  for (const f of ['analiza', 'algebra', 'c']) {
    const l = JSON.parse(readFileSync(`src/content/${f}.json`, 'utf8')).units[0].lessons[0]
    const first = { ...l, title: l.title.ro, exercises: l.exercises }
    assert.ok(prepare(first, true).exercises.every(e => e.type === 'mc'))
  }
})
