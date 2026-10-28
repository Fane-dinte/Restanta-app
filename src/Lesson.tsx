import { useMemo, useState } from 'react'
import katex from 'katex'
import { answerTex, isCorrect, shuffle, split, type Lesson, type Result } from './logic'
import type { Strings } from './strings'
import { Icon } from './icons'
import { sfx } from './fx'

const CONFETTI = ['#1874c4', '#8a3ffc', '#c2410c', '#f2a900', '#1a7f3c']
export function Confetti({ fixed }: { fixed?: boolean }) {
  return (
    <div className={'confetti' + (fixed ? ' fx' : '')} aria-hidden>
      {Array.from({ length: 30 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.09}s`, background: CONFETTI[i % CONFETTI.length] }} />)}
    </div>
  )
}

export function Rich({ text }: { text: string }) {
  return <>{split(text).map((p, i) =>
    p.k === 'text' ? <span key={i}>{p.v}</span>
    : p.k === 'block' ? <pre key={i}><code>{p.v}</code></pre>
    : p.k === 'code' ? <code key={i}>{p.v}</code>
    : <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(p.v, { throwOnError: false, displayMode: p.k === 'display' }) }} />)}</>
}

type Props = { lesson: Lesson; hint?: string; t: Strings; onDone: (r: Omit<Result, 'l'>) => void; onQuit: () => void }

export function LessonPlayer({ lesson, hint, t, onDone, onQuit }: Props) {
  const [card, setCard] = useState(0) // theory card on screen; past the last one means exercises
  const [queue, setQueue] = useState(lesson.exercises)
  const [step, setStep] = useState(0)
  const [given, setGiven] = useState<string | number | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  const [miss, setMiss] = useState<string[]>([])
  const [turn, setTurn] = useState(0)
  const [combo, setCombo] = useState(0) // correct answers in a row
  const [best, setBest] = useState(0)
  const [start] = useState(Date.now)
  const ex = queue[0]
  const q = ex.type === 'steps' ? ex.steps[step] : ex
  // reshuffled every turn, so the right answer isn't always in the same place
  const order = useMemo(() => q.type === 'mc' ? shuffle(q.choices.map((_, i) => i)) : [], [turn])
  const total = lesson.exercises.length
  const answered = ok !== null
  const empty = given === null || given === ''
  const why = q.explain ?? ex.explain
  const reading = card < lesson.theory.length
  const go = (n: number) => { setCard(n); scrollTo(0, 0) }

  function check() {
    if (empty) return
    const right = isCorrect(q, given)
    setOk(right)
    const run = right ? combo + 1 : 0
    setCombo(run)
    setBest(Math.max(best, run))
    if (right) sfx.right(run); else sfx.wrong()
    navigator.vibrate?.(right ? (run >= 3 ? [20, 30, 20, 30, 40] : 20) : [60, 40, 60])
  }
  function next() {
    if (ok && ex.type === 'steps' && step < ex.steps.length - 1) setStep(step + 1)
    else if (ok && queue.length === 1) { sfx.done(); return onDone({ xp: (miss.length ? 10 : 15) + (best >= 3 ? best * 2 : 0), best, s: Math.round((Date.now() - start) / 1000), miss }) }
    else {
      if (!ok) setMiss([...miss, ex.skill ?? lesson.id])
      setQueue(ok ? queue.slice(1) : [...queue.slice(1), ex]) // a wrong exercise comes back at the end
      setStep(0)
    }
    setGiven(null)
    setOk(null)
    setTurn(turn + 1)
  }

  const bar = (
    <div className="bar">
      <button aria-label={t.quit} onClick={() => confirm(t.quitConfirm) && onQuit()}><Icon name="close" size={26} /></button>
      <div className="progress" role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={total} aria-valuenow={total - queue.length}>
        <div style={{ width: `${((total - queue.length) / total) * 100}%` }} />
      </div>
      {combo >= 2 && <span className="combo" aria-label={t.combo(combo)}><Icon name="fire" size={18} />x{combo}</span>}
      {!reading && lesson.theory.length > 0 && <button aria-label={t.reread} onClick={() => go(0)}><Icon name="book" size={24} /></button>}
    </div>
  )

  if (reading) {
    const [title, ...body] = lesson.theory[card].split('\n')
    return (
      <div className="lesson">
        {bar}
        <div className="kind">{t.theory(card + 1, lesson.theory.length)}</div>
        <article className="theory" key={card}>
          <h2><Rich text={title} /></h2>
          <Rich text={body.join('\n')} />
        </article>
        <div className="footer">
          <div className="row">
            {card > 0 && <button className="chunky back" aria-label={t.back} onClick={() => go(card - 1)}>‹</button>}
            <button className="chunky big" onClick={() => go(card + 1)}>{card === lesson.theory.length - 1 ? t.toExercises : t.next}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="lesson">
      {bar}
      {ex.type === 'steps' && (
        <div className="steps">
          <div className="prompt"><Rich text={ex.prompt} /></div>
          {ex.steps.slice(0, step).map((s, i) => <div key={i} className="step-done"><Icon name="check" size={18} /> <Rich text={s.prompt} /></div>)}
        </div>
      )}
      <div className="kind">{ex.type === 'steps' ? t.step(step + 1, ex.steps.length) : q.type === 'mc' ? t.pickOne : t.typeIt}</div>
      <div className="prompt"><Rich text={q.prompt} /></div>
      {q.type === 'mc' ? (
        <div className="choices">
          {order.map((i, n) => (
            <button key={i} className={'chunky choice' + (answered && i === q.answer ? ' right' : answered && i === given ? ' wrong' : '')}
              aria-pressed={given === i} disabled={answered} onClick={() => setGiven(i)}>
              <span className="key" aria-hidden>{'ABCD'[n]}</span><span><Rich text={q.choices[i]} /></span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <input key={turn} className={'answer' + (answered ? (ok ? ' good' : ' bad') : '')} autoFocus value={given ?? ''} disabled={answered}
            aria-label={t.yourAnswer} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done"
            onChange={e => setGiven(e.target.value)}
            // preventDefault: otherwise the same Enter press also clicks "Continue" and skips the feedback
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); check() } }} />
          {hint && q.check !== 'text' && <div className="hint">{hint}</div>}
        </>
      )}
      {ok && [3, 5, 8, 10].includes(combo) && <Confetti fixed key={turn} />}
      <div className={'footer' + (answered ? (ok ? ' ok' : ' bad') : '')}>
        <div>
          <div aria-live="polite">
            {answered && <h3>{ok ? t.praise[(turn * 7) % t.praise.length] : t.oops[turn % t.oops.length]}</h3>}
            {answered && (
              <div className="explain">
                {!ok && <>
                  <div className="label">{t.correctAnswer}</div>
                  <div className="correct">
                    {q.type === 'mc' ? <Rich text={q.choices[q.answer]} /> : q.check === 'text' ? <code>{q.answer}</code> : <Rich text={`$${answerTex(q.answer)}$`} />}
                  </div>
                </>}
                {why && <div className="why"><Rich text={why} /></div>}
              </div>
            )}
          </div>
          <button className="chunky big" disabled={!answered && empty} onClick={answered ? next : check}>
            {answered ? t.continue : t.check}
          </button>
        </div>
      </div>
    </div>
  )
}
