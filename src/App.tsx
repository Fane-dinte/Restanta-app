import { useEffect, useMemo, useState } from 'react'
import '@fontsource-variable/nunito'
import 'katex/dist/katex.min.css'
import './style.css'
import analiza from './content/analiza.json'
import algebra from './content/algebra.json'
import c from './content/c.json'
import { LessonPlayer } from './Lesson'
import { dayKey, finishLesson, fresh, localize, prepare, settle, streak, type Course, type Lang, type Lesson, type Progress } from './logic'
import { strings, type Strings } from './strings'

const COURSES = [analiza, algebra, c] // text is {ro, en}; localize() picks one
const KEY = 'study-app'
const CONFETTI = ['#1874c4', '#8a3ffc', '#c2410c', '#f2a900', '#1a7f3c']
// icons from the "Studiu App Design" canvas
const NODE_ICON = {
  done: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  current: <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.7 6.3.9-4.55 4.43 1.07 6.27L12 17.1l-5.62 2.96 1.07-6.27L2.9 9.4l6.3-.9z" /></svg>,
  locked: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
}

function load(): Progress {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
    return raw ? { ...fresh(), ...JSON.parse(raw) } : fresh()
  } catch {
    try { if (raw) localStorage.setItem(KEY + '.bad', raw) } catch { /* storage blocked */ } // keep unreadable progress instead of overwriting it
    return fresh()
  }
}

function loadLang(): Lang {
  try { return localStorage.getItem(KEY + '.lang') === 'en' ? 'en' : 'ro' } catch { return 'ro' }
}

export function App() {
  const today = dayKey()
  const [saved, setSaved] = useState(load)
  const [lang, setLang] = useState(loadLang)
  const courses: Course[] = useMemo(() => localize(COURSES, lang), [lang])
  const t = strings(lang)
  const [tab, setTab] = useState<'learn' | 'tracker'>('learn')
  const [courseId, setCourseId] = useState('analiza')
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [done, setDone] = useState<{ xp: number; secs: number; acc: number; first: boolean } | null>(null)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* blocked: progress lives in memory only */ } }, [saved])
  // another tab (the browser copy next to the installed app) saved: take its progress instead of overwriting it later
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === KEY) setSaved(load()) }
    addEventListener('storage', sync)
    return () => removeEventListener('storage', sync)
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang
    try { localStorage.setItem(KEY + '.lang', lang) } catch { /* blocked: back to Romanian next time */ }
  }, [lang])

  const p = settle(saved, today) // on every render, so freezes apply even after days in the background
  const fire = streak(p.days, today)
  const course = courses.find(x => x.id === courseId)!
  useEffect(() => { document.documentElement.dataset.subject = course.id }, [course]) // tokens.css maps it to --accent

  if (lesson) return (
    <LessonPlayer lesson={lesson} hint={course.hint} t={t} onQuit={() => setLesson(null)} onDone={r => {
      const n = lesson.exercises.length
      setDone({ xp: r.xp, secs: r.s, acc: Math.round((100 * n) / (n + r.miss.length)), first: p.days[today] !== 'study' })
      setSaved(finishLesson(p, today, { l: lesson.id, ...r }))
      setLesson(null)
    }} />
  )

  if (done) return (
    <div className="done">
      <div className="confetti" aria-hidden>
        {Array.from({ length: 30 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.09}s`, background: CONFETTI[i % CONFETTI.length] }} />
        ))}
      </div>
      <div className="emoji" aria-hidden>{done.first ? '🔥' : '🎉'}</div>
      <h1>{t.lessonDone}</h1>
      <div className="pills">
        <div className="pill xp"><span>XP</span><b>+{done.xp}</b></div>
        <div className="pill time"><span>{t.time}</span><b>{Math.floor(done.secs / 60)}:{String(done.secs % 60).padStart(2, '0')}</b></div>
        <div className="pill acc"><span>{t.accuracy}</span><b>{done.acc}%</b></div>
      </div>
      {done.first && <p className="streak-msg">🔥 {t.streak}: <b>{fire} {t.days(fire)}</b></p>}
      <button className="chunky big" onClick={() => setDone(null)}>{t.continue}</button>
    </div>
  )

  const flat = course.units.flatMap(u => u.lessons)
  const cur = flat.findIndex(l => !p.done[l.id])
  return (
    <>
      <header className="top">
        <span className={p.days[today] === 'study' ? 'fire on' : 'fire'} aria-label={`${t.streak}: ${fire} ${t.days(fire)}`}>🔥 {fire}</span>
        <span aria-label={`${p.freezes} ${t.freezes}`}>🧊 {p.freezes}</span>
        <span aria-label={`${p.xp} XP`}>⭐ {p.xp}</span>
        <button className="lang" aria-label={t.langSwitch} onClick={() => setLang(lang === 'ro' ? 'en' : 'ro')}>
          {(['ro', 'en'] as const).map(l => l === lang ? <b key={l}>{l.toUpperCase()}</b> : <span key={l}>{l.toUpperCase()}</span>)}
        </button>
      </header>
      <main>
        {tab === 'learn' ? <>
          <div className="chips" role="group" aria-label={t.subject}>
            {courses.map(x => (
              <button key={x.id} className="chunky" data-subject={x.id} aria-pressed={x.id === courseId} onClick={() => setCourseId(x.id)}>
                {x.icon} {x.title}
              </button>
            ))}
          </div>
          {course.units.map(u => (
            <section key={u.id}>
              <div className="unit"><h2>{u.title}</h2><p>{u.desc}</p></div>
              <div className="path">
                {u.lessons.map(l => {
                  const i = flat.indexOf(l)
                  const state = p.done[l.id] ? 'done' : i === cur ? 'current' : 'locked'
                  return (
                    <button key={l.id} className={'node ' + state} disabled={state === 'locked'} onClick={() => setLesson(prepare(l))}
                      style={{ transform: `translateX(${Math.round(Math.sin(i * 1.2) * 70)}px)` }}>
                      {state === 'current' && <span className="bubble" aria-hidden>{t.start}</span>}
                      <span className="dot" aria-hidden>{NODE_ICON[state]}</span>
                      <span>{l.title}{state !== 'current' && <span className="sr">{state === 'done' ? t.doneSr : t.lockedSr}</span>}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </> : <Tracker p={p} today={today} fire={fire} t={t} />}
      </main>
      <nav className="nav">
        <button aria-current={tab === 'learn' ? 'page' : undefined} onClick={() => setTab('learn')}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 10.5L12 3.5l8.5 7" /><path d="M5.5 9v11h13V9" /><path d="M10 20v-5h4v5" /></svg>{t.learn}
        </button>
        <button aria-current={tab === 'tracker' ? 'page' : undefined} onClick={() => setTab('tracker')}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M9 15l2 2 4-4" /></svg>{t.tracker}
        </button>
      </nav>
    </>
  )
}

function Tracker({ p, today, fire, t }: { p: Progress; today: string; fire: number; t: Strings }) {
  const [month, setMonth] = useState(today.slice(0, 7))
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const shift = (n: number) => setMonth(dayKey(new Date(y, m - 1 + n, 1)).slice(0, 7))
  return <>
    <div className="stats">
      <div className="stat"><b>🔥 {fire}</b>{t.streakStat(fire)}</div>
      <div className="stat"><b>🧊 {p.freezes}</b>{t.freezes}</div>
      <div className="stat"><b>⭐ {p.xp}</b>{t.xpTotal}</div>
      <div className="stat"><b>📚 {p.log.length}</b>{t.lessons}</div>
    </div>
    <div className="cal-head">
      <button className="chunky" onClick={() => shift(-1)} aria-label={t.prevMonth}>‹</button>
      <h2>{first.toLocaleDateString(t.locale, { month: 'long', year: 'numeric' })}</h2>
      <button className="chunky" onClick={() => shift(1)} aria-label={t.nextMonth}>›</button>
    </div>
    <div className="cal">
      {t.weekdays.map((d, i) => <div key={i} className="wd">{d}</div>)}
      {/* weeks start on Monday */}
      {Array.from({ length: (first.getDay() + 6) % 7 }, (_, i) => <div key={'pad' + i} />)}
      {Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => {
        const k = `${month}-${String(i + 1).padStart(2, '0')}`
        const d = p.days[k]
        return (
          <div key={k} className={`d ${d ?? ''} ${k === today ? 'today' : ''}`}
            aria-label={d === 'study' ? `${i + 1}: ${t.studied}` : d === 'freeze' ? `${i + 1}: ${t.frozen}` : undefined}>{i + 1}</div>
        )
      })}
    </div>
    <p className="legend"><i className="study" /> {t.studied} <i className="freeze" /> {t.freezeUsed}</p>
  </>
}
