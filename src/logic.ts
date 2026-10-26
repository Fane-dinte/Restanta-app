import { all, create } from 'mathjs'

type Base = { prompt: string; explain?: string; skill?: string }
export type Question = Base &
  ({ type: 'mc'; choices: string[]; answer: number } | { type: 'input'; answer: string; check: 'number' | 'expr' | 'text'; tol?: number })
// vars: random integers in [lo, hi] for [[expr]] placeholders; where: a mathjs condition they must meet
export type Exercise = (Question | (Base & { type: 'steps'; steps: Question[] })) & { vars?: Record<string, [number, number]>; where?: string }
// theory: cards shown before the exercises, first line is the title. pick: exercises drawn from the pool per run.
export type Lesson = { id: string; title: string; theory: string[]; pick?: number; exercises: Exercise[] }
export type Lang = 'ro' | 'en'
export type Course = { id: string; title: string; icon: string; color: string; hint?: string; units: { id: string; title: string; desc: string; lessons: Lesson[] }[] }

export type Day = 'study' | 'freeze'
export type Result = { l: string; xp: number; s: number; miss: string[] }
export type Progress = { days: Record<string, Day>; done: Record<string, number>; xp: number; freezes: number; log: (Result & { d: string })[] }

// shortcut: everyone starts with 2 freezes and can't earn more, until the v0.2 shop
export const fresh = (): Progress => ({ days: {}, done: {}, xp: 0, freezes: 2, log: [] })

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function addDays(key: string, n: number) {
  const [y, m, d] = key.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + n))
}

// Freezes cover the days missed since the last active day, but only if they cover all of them:
// a partial cover would burn them on a streak that breaks anyway.
export function settle(p: Progress, today: string): Progress {
  const last = Object.keys(p.days).sort().at(-1)
  if (!last) return p
  const missed: string[] = []
  for (let d = addDays(last, 1); d < today; d = addDays(d, 1)) missed.push(d)
  if (!missed.length || missed.length > p.freezes) return p
  return { ...p, freezes: p.freezes - missed.length, days: { ...p.days, ...Object.fromEntries(missed.map(d => [d, 'freeze'] as const)) } }
}

// Like Duolingo: a freeze day keeps the streak alive but doesn't add to it.
export function streak(days: Record<string, Day>, today: string) {
  let n = 0
  for (let d = days[today] ? today : addDays(today, -1); days[d]; d = addDays(d, -1)) if (days[d] === 'study') n++
  return n
}

export const finishLesson = (p: Progress, today: string, r: Result): Progress => ({
  ...p,
  xp: p.xp + r.xp,
  done: { ...p.done, [r.l]: (p.done[r.l] ?? 0) + 1 },
  days: { ...p.days, [today]: 'study' },
  log: [...p.log, { d: today, ...r }], // kept now so the v0.2 charts and weak-topic report start with real history
})

const math = create(all)

// What students type -> what mathjs understands.
function tidy(s: string) {
  s = s.trim().replace(/(\d),(\d)/g, '$1.$2').replace(/[·×]/g, '*').replace(/:/g, '/').replace(/−/g, '-')
    .replace(/∞|\binf(inity)?\b/gi, 'Infinity').replace(/π/g, 'pi').replace(/√/g, 'sqrt')
  for (const [f, g] of [['ln', 'log'], ['lg', 'log10']]) // ln2, ln x, ln(2) -> log(2)
    s = s.replace(new RegExp(`(?<![a-z])${f}\\s*([0-9.]+|[a-z])(?![a-z(])`, 'g'), `${g}($1)`).replace(new RegExp(`(?<![a-z])${f}(?![a-z])`, 'g'), g)
  return s
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

function same(a: any, b: any, tol = 1e-6) {
  if (math.equal(a, b) === true) return true
  const d = Number(math.abs(math.subtract(a, b)))
  return Number.isFinite(d) && d <= tol * Math.max(1, Number(math.abs(b)))
}

function vars(s: string) {
  const names: string[] = []
  math.parse(s).traverse(n => { if (math.isSymbolNode(n) && !(n.name in math)) names.push(n.name) })
  return names
}

export function isCorrect(q: Question, given: string | number | null): boolean {
  if (q.type === 'mc') return given === q.answer
  if (typeof given !== 'string' || !given.trim()) return false
  if (q.check === 'text') return norm(given) === norm(q.answer)
  try {
    const [a, b] = [tidy(given), tidy(q.answer)]
    if (q.check === 'number') return same(math.evaluate(a), math.evaluate(b), q.tol)
    const names = [...new Set([...vars(a), ...vars(b)])]
    // equivalent forms like 2(x+1) and 2x+2 agree everywhere, so compare them at a few random points
    return [1, 2, 3, 4, 5].every(() => {
      const scope = Object.fromEntries(names.map(n => [n, 0.3 + Math.random() * 2.4]))
      return same(math.evaluate(a, { ...scope }), math.evaluate(b, scope), q.tol)
    })
  } catch {
    return false
  }
}

// The expected answer as LaTeX, shown after a mistake: e^(1/3) -> e^{\frac{1}{3}}
export const answerTex = (s: string) => math.parse(tidy(s)).toTex()

// Content text is either one string for both languages or {"ro": ..., "en": ...}.
export const localize = (x: any, lang: Lang): any =>
  Array.isArray(x) ? x.map(y => localize(y, lang))
  : x && typeof x === 'object' ? ('ro' in x && 'en' in x ? x[lang] : Object.fromEntries(Object.entries(x).map(([k, v]) => [k, localize(v, lang)])))
  : x

const fill = (x: any, scope: Record<string, number>): any =>
  typeof x === 'string' ? x.replace(/\[\[(.+?)\]\]/g, (_, e) => math.format(math.evaluate(e, { ...scope }), { precision: 12 }).replace(/^(-?\d+)\/1$/, '$1')) // fraction(4,2) prints 2/1
  : Array.isArray(x) ? x.map(y => fill(y, scope))
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fill(v, scope)]))
  : x

// New numbers every time, so answers can't just be memorized.
export function instantiate(ex: Exercise): Exercise {
  if (!ex.vars) return ex
  for (let tries = 1; ; tries++) {
    const scope = Object.fromEntries(Object.entries(ex.vars).map(([k, [lo, hi]]) => [k, lo + Math.floor(Math.random() * (hi - lo + 1))]))
    // check where before filling: a rejected roll may not even evaluate, e.g. combinations(n,k) with k > n
    if (tries < 500 && ex.where && !math.evaluate(ex.where, { ...scope })) continue
    const out: Exercise = fill(ex, scope)
    const dupes = (out.type === 'steps' ? out.steps : [out]).some(q => q.type === 'mc' && new Set(q.choices).size < q.choices.length)
    if (tries >= 500 || !dupes) return out
  }
}

export const shuffle = <T,>(a: T[]) => a.map(x => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map(p => p[1])

export const prepare = (l: Lesson): Lesson => ({ ...l, exercises: shuffle(l.exercises).slice(0, l.pick).map(instantiate) })

// Lesson text: plain text with $math$, $$display math$$, `code` and ```code blocks```.
const RICH = /(```[\s\S]*?```|\$\$[\s\S]+?\$\$|\$[^$\n]+\$|`[^`\n]+`)/
export type Part = { k: 'text' | 'block' | 'display' | 'math' | 'code'; v: string }
export const split = (s: string) =>
  s.split(RICH).map((v, i): Part =>
    i % 2 === 0 ? { k: 'text', v }
    : v.startsWith('```') ? { k: 'block', v: v.slice(3, -3).replace(/^\w*\n/, '').replace(/\n$/, '') }
    : v.startsWith('$$') ? { k: 'display', v: v.slice(2, -2) }
    : v.startsWith('$') ? { k: 'math', v: v.slice(1, -1) }
    : { k: 'code', v: v.slice(1, -1) }).filter(p => p.v)
