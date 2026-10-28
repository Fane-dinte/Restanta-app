import { useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource-variable/nunito'
import 'katex/dist/katex.min.css'
import './style.css'
import analiza from './content/analiza.json'
import algebra from './content/algebra.json'
import c from './content/c.json'
import { Confetti, LessonPlayer } from './Lesson'
import { setSound, soundOn } from './fx'
import { Dev } from './Dev'
import { Shop } from './Shop'
import { Profile } from './Profile'
import { colorOf, equipped } from './store'
import { CH_REWARD, CH_SIZE, finishChallenge, isChallenge, pickChallenge } from './challenge'
import { MIN_CODE, cleanCode, getCode, isAnon, push, setAnon, setCode as saveCode } from './sync'
import { Icon, type IconName } from './icons'
import { GOAL, dailyXp, dayKey, finishLesson, fresh, level, levelStart, localize, prepare, settle, streak, type Course, type Lang, type Lesson, type Progress } from './logic'
import { strings, type Strings } from './strings'

const COURSES = [analiza, algebra, c] // text is {ro, en}; localize() picks one
const KEY = 'study-app'
const TABS = ['learn', 'tracker', 'shop', 'profile'] as const // also the swipe order
type Tab = typeof TABS[number]

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
  const [code, setCode] = useState(getCode) // sync code, null = anonymous
  const [pop, setPop] = useState(() => !getCode() && !isAnon())
  const [codeIn, setCodeIn] = useState('')
  const [mode, setMode] = useState<'new' | 'join'>('new') // create a code or sign in with an existing one
  const [codeErr, setCodeErr] = useState('')
  const [tick, setTick] = useState(0)
  const synced = useRef('') // last progress the server agreed on, so syncing doesn't loop
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    const back = () => { if (document.visibilityState === 'visible') { synced.current = ''; setTick(n => n + 1) } } // pick up what another device saved
    addEventListener('hashchange', on)
    document.addEventListener('visibilitychange', back)
    return () => { removeEventListener('hashchange', on); document.removeEventListener('visibilitychange', back) }
  }, [])
  useEffect(() => {
    if (!code) return
    const json = JSON.stringify(saved)
    if (json === synced.current) return
    const id = setTimeout(() => {
      push(code, saved).then(m => {
        synced.current = JSON.stringify(m)
        if (synced.current !== json) setSaved(m)
      }).catch(() => { /* offline: tries again on the next change or when the app comes back */ })
    }, 800)
    return () => clearTimeout(id)
  }, [saved, code, tick])
  async function join() {
    const c = cleanCode(codeIn)
    if (c.length < MIN_CODE) return setCodeErr(t.codeShort)
    setCodeErr('')
    try {
      const m = await push(c, saved, mode)
      synced.current = JSON.stringify(m)
      saveCode(c); setCode(c); setSaved(m); setPop(false); setCodeIn('')
    } catch (e) {
      const s = (e as Error).message
      setCodeErr(s === '409' ? t.codeTaken : s === '404' ? t.codeMissing : t.codeOffline)
    }
  }
  const skip = () => { setAnon(); setPop(false) }
  const leave = () => { saveCode(null); setCode(null); setAnon(); synced.current = ''; setPop(false) }
  const [lang, setLang] = useState(loadLang)
  const courses: Course[] = useMemo(() => localize(COURSES, lang), [lang])
  const t = strings(lang)
  const [tab, setTab] = useState<Tab>('learn')
  const touch = useRef<[number, number] | null>(null)
  const swipe = (e: React.TouchEvent) => {
    const [x, y] = touch.current ?? [0, 0]
    const dx = e.changedTouches[0].clientX - x, dy = e.changedTouches[0].clientY - y
    touch.current = null
    if (Math.abs(dx) < 70 || Math.abs(dy) > 50) return
    const i = TABS.indexOf(tab) + (dx < 0 ? 1 : -1)
    if (i >= 0 && i < TABS.length) { setTab(TABS[i]); scrollTo(0, 0) }
  }
  const [courseId, setCourseId] = useState('analiza')
  const [sheet, setSheet] = useState(false)
  const [sound, setSoundState] = useState(soundOn)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [done, setDone] = useState<{ xp: number; secs: number; acc: number; first: boolean; best: number; up: boolean; goal: boolean; ch: boolean } | null>(null)
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
  // shop: the equipped palette overrides the subject accent, the frame colors the border of perfect lessons
  useEffect(() => {
    const root = document.documentElement
    const pal = colorOf(equipped(saved, 'palette')), fr = colorOf(equipped(saved, 'frame'))
    if (pal) root.style.setProperty('--accent', pal); else root.style.removeProperty('--accent')
    if (fr) root.style.setProperty('--frame', fr); else root.style.removeProperty('--frame')
    root.toggleAttribute('data-palette', !!pal)
  }, [saved.equip])

  if (hash === '#dev') return <Dev />

  if (lesson) return (
    <LessonPlayer lesson={lesson} hint={course.hint} t={t} onQuit={() => setLesson(null)} onDone={r => {
      const n = lesson.exercises.length
      const before = dailyXp(p, today)
      const ch = isChallenge(lesson)
      const xp = ch ? r.xp + CH_REWARD : r.xp
      setDone({ xp, secs: r.s, acc: Math.round((100 * n) / (n + r.miss.length)), first: p.days[today] !== 'study', best: r.best ?? 0,
        up: level(p.xp + xp) > level(p.xp), goal: before < GOAL && before + xp >= GOAL, ch })
      setSaved(ch ? finishChallenge(p, today, r) : finishLesson(p, today, { l: lesson.id, ...r }))
      setLesson(null)
    }} />
  )

  if (done) return (
    <div className="finish">
      <Confetti />
      <div className="badge" aria-hidden><Icon name={done.first ? 'fire' : 'star'} size={72} /></div>
      <h1>{t.lessonDone}</h1>
      {done.up && <p className="perk">{t.levelUp} {t.level(level(p.xp))}, {t.levels[Math.min(level(p.xp), t.levels.length) - 1]}</p>}
      {done.goal && <p className="perk">{t.goalHit}</p>}
      {done.ch && <p className="perk">{t.chalPerk}</p>}
      <div className="pills">
        <div className="pill xp"><span>XP</span><b>+{done.xp}</b></div>
        <div className="pill time"><span>{t.time}</span><b>{Math.floor(done.secs / 60)}:{String(done.secs % 60).padStart(2, '0')}</b></div>
        <div className="pill acc"><span>{t.accuracy}</span><b>{done.acc}%</b></div>
      </div>
      {done.best >= 3 && <p className="streak-msg"><Icon name="bolt" size={22} /> {t.bonus}: <b>{t.combo(done.best)} (+{done.best * 2} XP)</b></p>}
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
          <div className="tools">
          <button className="snd" aria-label={t.profile} onClick={() => setTab('profile')}><Icon name="user" size={22} /></button>
          <button className="snd" aria-label={sound ? t.sound : t.muted} onClick={() => { setSound(!sound); setSoundState(!sound) }}><Icon name={sound ? 'sound' : 'mute'} size={22} /></button>
          <button className="lang" aria-label={t.langSwitch} onClick={() => setLang(lang === 'ro' ? 'en' : 'ro')}>
            {(['ro', 'en'] as const).map(l => <span key={l} className={l === lang ? 'on' : undefined}>{l.toUpperCase()}</span>)}
          </button>
          </div>
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
      {pop && (
        <div className="scrim center" onClick={skip}>
          <form className="pop" role="dialog" aria-label={t.codeTitle} onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); void (code ? leave() : join()) }}>
            <button type="button" className="x" aria-label={t.codeSkip} onClick={code ? () => setPop(false) : skip}><Icon name="close" size={22} /></button>
            <h2>{code ? t.codeIs(code) : t.codeTitle}</h2>
            {code ? <p>{t.codeSynced}</p> : <>
              <div className="seg" role="group" aria-label={t.codeTitle}>
                {(['new', 'join'] as const).map(m => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setCodeErr('') }}>{m === 'new' ? t.codeModeNew : t.codeModeJoin}</button>
                ))}
              </div>
              <p>{mode === 'new' ? t.codeHelpNew : t.codeHelpJoin}</p>
              <input className="answer" value={codeIn} onChange={e => setCodeIn(e.target.value)} placeholder={t.codePlaceholder} aria-label={t.codePlaceholder} autoFocus
                maxLength={40} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
              {codeErr && <p className="err" role="alert">{codeErr}</p>}
            </>}
            <button className="chunky big" type="submit">{code ? t.codeOut : mode === 'new' ? t.codeSave : t.codeEnter}</button>
          </form>
        </div>
      )}
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
      <main onTouchStart={e => { touch.current = [e.touches[0].clientX, e.touches[0].clientY] }} onTouchEnd={swipe}>
        {tab === 'learn' ? <>
          <Goal p={p} today={today} t={t} />
          <Challenge p={p} today={today} t={t} start={() => { const l = pickChallenge(courses, p, today, t.chalTitle); if (l) setLesson(l) }} />
          {course.units.map(u => (
            <section key={u.id}>
              <div className="unit"><h2>{u.title}</h2><p>{u.desc}</p></div>
              <div className="path">
                {u.lessons.map(l => {
                  const i = flat.indexOf(l)
                  const state = p.done[l.id] ? 'done' : i === cur ? 'current' : 'locked'
                  const perfect = state === 'done' && p.log.some(e => e.l === l.id && e.miss.length === 0) // black border: finished with no mistakes
                  return (
                    <button key={l.id} className={'lk chunky ' + state + (perfect ? ' perfect' : '')} disabled={state === 'locked'} onClick={() => setLesson(prepare(l, l === flat[0]))}>
                      <span className="ico" aria-hidden><Icon name={perfect ? 'star' : state === 'done' ? 'check' : state === 'current' ? 'play' : 'lock'} size={28} /></span>
                      <span className="txt">
                        <b>{l.title}{state !== 'current' && <span className="sr">{state === 'done' ? t.doneSr : t.lockedSr}</span>}</b>
                        {state === 'current' && <small>{t.exercises(l.pick ?? l.exercises.length)}</small>}
                        {state === 'done' && <small>{perfect ? t.perfect : t.done}</small>}
                      </span>
                      {state === 'current' && <span className="go" aria-hidden>{t.start}</span>}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </> : tab === 'tracker' ? <Tracker p={p} today={today} fire={fire} t={t} />
          : tab === 'shop' ? <Shop p={p} lang={lang} t={t} update={setSaved} />
          : <Profile p={p} courses={courses} lang={lang} t={t} code={code} openCode={() => setPop(true)} />}
      </main>
      <nav className="nav">
        {([['learn', 'home', t.learn], ['tracker', 'cal', t.tracker], ['shop', 'shop', t.shop], ['profile', 'user', t.profile]] as const).map(([id, icon, label]) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); scrollTo(0, 0) }}>
            <Icon name={icon} size={26} />{label}
          </button>
        ))}
      </nav>
    </>
  )
}

function Goal({ p, today, t }: { p: Progress; today: string; t: Strings }) {
  const lv = level(p.xp), lo = levelStart(lv), span = levelStart(lv + 1) - lo
  const day = dailyXp(p, today)
  return (
    <div className="prog">
      <div className="row"><b>{t.level(lv)}, {t.levels[Math.min(lv, t.levels.length) - 1]}</b><span>{p.xp - lo}/{span} XP</span></div>
      <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={span} aria-valuenow={p.xp - lo}><i style={{ width: `${((p.xp - lo) / span) * 100}%` }} /></div>
      <div className="row"><b>{t.goal}</b><span>{day >= GOAL && <Icon name="check" size={16} />} {Math.min(day, GOAL)}/{GOAL} XP</span></div>
      <div className="meter gold" role="progressbar" aria-valuemin={0} aria-valuemax={GOAL} aria-valuenow={Math.min(day, GOAL)}><i style={{ width: `${(Math.min(day, GOAL) / GOAL) * 100}%` }} /></div>
    </div>
  )
}

function Challenge({ p, today, t, start }: { p: Progress; today: string; t: Strings; start: () => void }) {
  const finished = !!p.ch?.[today]
  const ready = Object.keys(p.done).length > 0 // needs a finished lesson to take mistakes from
  return (
    <div className={'chal' + (finished ? ' fin' : '')}>
      <span className="ico" aria-hidden><Icon name={finished ? 'check' : 'bolt'} size={26} /></span>
      <div className="txt"><b>{t.chalTitle}</b><small>{finished ? t.chalDone : ready ? t.chalDesc(CH_SIZE, CH_REWARD) : t.chalNone}</small></div>
      {!finished && ready && <button className="chunky go2" onClick={start}>{t.start}</button>}
    </div>
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
