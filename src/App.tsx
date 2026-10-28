import { useEffect, useMemo, useState } from 'react'
import '@fontsource-variable/nunito'
import 'katex/dist/katex.min.css'
import './style.css'
import analiza from './content/analiza.json'
import algebra from './content/algebra.json'
import c from './content/c.json'
import { LessonPlayer } from './Lesson'
import { Icon, type IconName } from './icons'
import { dayKey, finishLesson, fresh, localize, prepare, settle, streak, type Course, type Lang, type Lesson, type Progress } from './logic'
import { strings, type Strings } from './strings'

const COURSES = [analiza, algebra, c] // text is {ro, en}; localize() picks one
const KEY = 'study-app'
const CONFETTI = ['#1874c4', '#8a3ffc', '#c2410c', '#f2a900', '#1a7f3c']

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
  const [sheet, setSheet] = useState(false)
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
      <div className="badge" aria-hidden><Icon name={done.first ? 'fire' : 'star'} size={72} /></div>
      <h1>{t.lessonDone}</h1>
      <div className="pills">
        <div className="pill xp"><span>XP</span><b>+{done.xp}</b></div>
        <div className="pill time"><span>{t.time}</span><b>{Math.floor(done.secs / 60)}:{String(done.secs % 60).padStart(2, '0')}</b></div>
        <div className="pill acc"><span>{t.accuracy}</span><b>{done.acc}%</b></div>
      </div>
      {done.first && <p className="streak-msg"><Icon name="fire" size={22} /> {t.streak}: <b>{fire} {t.days(fire)}</b></p>}
      <button className="chunky big" onClick={() => setDone(null)}>{t.continue}</button>
    </div>
  )

  const flat = course.units.flatMap(u => u.lessons)
  const cur = flat.findIndex(l => !p.done[l.id])
  return (
    <>
      <header className="top">
        <div className="brand">
          <h1>Restanță</h1>
          <button className="lang" aria-label={t.langSwitch} onClick={() => setLang(lang === 'ro' ? 'en' : 'ro')}>
            {(['ro', 'en'] as const).map(l => <span key={l} className={l === lang ? 'on' : undefined}>{l.toUpperCase()}</span>)}
          </button>
        </div>
        {tab === 'learn' && <>
          <button className="subj" aria-haspopup="dialog" aria-label={`${t.subject}: ${course.title}`} onClick={() => setSheet(true)}>
            <span className="mark"><Icon name={course.id as IconName} size={28} /></span>
            <span className="who"><b>{course.title}</b><small>{course.units[0].title}</small></span>
            <Icon name="down" size={22} />
          </button>
          <div className="tiles">
            <div className={'tile fire' + (p.days[today] === 'study' ? ' on' : '')} aria-label={`${t.streak}: ${fire} ${t.days(fire)}`}>
              <i><Icon name="fire" size={20} /></i><b>{fire}</b><span>{t.streakStat(fire)}</span>
            </div>
            <div className="tile freeze" aria-label={`${p.freezes} ${t.freezes}`}><i><Icon name="freeze" size={20} /></i><b>{p.freezes}</b><span>{t.freezes}</span></div>
            <div className="tile xp" aria-label={`${p.xp} XP`}><i><Icon name="bolt" size={20} /></i><b>{p.xp}</b><span>XP</span></div>
          </div>
        </>}
      </header>
      {sheet && (
        <div className="scrim" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-label={t.subject} onClick={e => e.stopPropagation()}>
            {courses.map(x => (
              <button key={x.id} className="opt chunky" data-subject={x.id} aria-pressed={x.id === courseId} onClick={() => { setCourseId(x.id); setSheet(false) }}>
                <span className="mark"><Icon name={x.id as IconName} size={28} /></span><b>{x.title}</b>
              </button>
            ))}
          </div>
        </div>
      )}
      <main>
        {tab === 'learn' ? <>
          {course.units.map(u => (
            <section key={u.id}>
              <div className="unit"><h2>{u.title}</h2><p>{u.desc}</p></div>
              <div className="path">
                {u.lessons.map(l => {
                  const i = flat.indexOf(l)
                  const state = p.done[l.id] ? 'done' : i === cur ? 'current' : 'locked'
                  return (
                    <button key={l.id} className={'key chunky ' + state} disabled={state === 'locked'} onClick={() => setLesson(prepare(l))}>
                      <span className="ico" aria-hidden><Icon name={state === 'done' ? 'check' : state === 'current' ? 'play' : 'lock'} size={28} /></span>
                      <span className="txt">
                        <b>{l.title}{state !== 'current' && <span className="sr">{state === 'done' ? t.doneSr : t.lockedSr}</span>}</b>
                        {state === 'current' && <small>{t.exercises(l.pick ?? l.exercises.length)}</small>}
                        {state === 'done' && <small>{t.done}</small>}
                      </span>
                      {state === 'current' && <span className="go" aria-hidden>{t.start}</span>}
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
          <Icon name="home" size={26} />{t.learn}
        </button>
        <button aria-current={tab === 'tracker' ? 'page' : undefined} onClick={() => setTab('tracker')}>
          <Icon name="cal" size={26} />{t.tracker}
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
      <div className="stat"><i className="f"><Icon name="fire" size={20} /></i><b>{fire}</b>{t.streakStat(fire)}</div>
      <div className="stat"><i className="z"><Icon name="freeze" size={20} /></i><b>{p.freezes}</b>{t.freezes}</div>
      <div className="stat"><i className="x"><Icon name="bolt" size={20} /></i><b>{p.xp}</b>{t.xpTotal}</div>
      <div className="stat"><i className="l"><Icon name="book" size={20} /></i><b>{p.log.length}</b>{t.lessons}</div>
    </div>
    <div className="cal-head">
      <button className="chunky" onClick={() => shift(-1)} aria-label={t.prevMonth}><Icon name="left" size={22} /></button>
      <h2>{first.toLocaleDateString(t.locale, { month: 'long', year: 'numeric' })}</h2>
      <button className="chunky" onClick={() => shift(1)} aria-label={t.nextMonth}><Icon name="right" size={22} /></button>
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
