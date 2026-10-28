import { instantiate, shuffle, type Course, type Exercise, type Lesson, type Progress } from './logic.ts'

export const CH_REWARD = 25 // bonus XP for finishing the daily challenge
export const CH_SIZE = 8

// Today's challenge: exercises on the topics you got wrong lately, topped up with exercises from lessons you finished.
// Returns null until you have finished a lesson (nothing to review yet).
export function pickChallenge(courses: Course[], p: Progress, today: string, title: string): Lesson | null {
  const finished = courses.flatMap(c => c.units.flatMap(u => u.lessons)).filter(l => p.done[l.id])
  if (!finished.length) return null
  const missed = new Set(p.log.slice(-40).flatMap(e => e.miss))
  const pool: Exercise[] = finished.flatMap(l => l.exercises)
  const weak = shuffle(pool.filter(e => e.skill && missed.has(e.skill)))
  const rest = shuffle(pool.filter(e => !weak.includes(e)))
  const exercises = [...weak, ...rest].slice(0, CH_SIZE).map(instantiate)
  return { id: 'daily-' + today, title, theory: [], exercises }
}

export const isChallenge = (l: Lesson) => l.id.startsWith('daily-')

export const finishChallenge = (p: Progress, today: string, r: { xp: number; s: number; miss: string[]; best?: number }): Progress => {
  const xp = r.xp + CH_REWARD
  return {
    ...p,
    xp: p.xp + xp,
    days: { ...p.days, [today]: 'study' },
    log: [...p.log, { d: today, l: 'daily', ...r, xp }],
    ch: { ...p.ch, [today]: 1 },
  }
}
