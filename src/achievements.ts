import { addDays, level, type Course, type Progress } from './logic.ts'
import type { IconName } from './icons.tsx'

// Achievements are worked out from your progress every time, so they follow your sync code and need no storage of their own.
export type Ach = { id: string; icon: IconName; title: { ro: string; en: string }; desc: { ro: string; en: string }; test: (p: Progress, courses: Course[]) => boolean }

const lessons = (p: Progress) => Object.keys(p.done).length
const perfect = (p: Progress) => new Set(p.log.filter(e => e.l !== 'daily' && e.miss.length === 0).map(e => e.l)).size

// longest run of consecutive days with a study day; freeze days keep the run going without counting
export function bestStreak(days: Progress['days']) {
  let best = 0, run = 0, prev = ''
  for (const d of Object.keys(days).sort()) {
    run = prev && addDays(prev, 1) === d ? run : 0
    if (days[d] === 'study') run++
    best = Math.max(best, run)
    prev = d
  }
  return best
}

const unitDone = (p: Progress, courses: Course[]) => courses.some(c => c.units.some(u => u.lessons.length > 0 && u.lessons.every(l => p.done[l.id])))
const prefixes = (p: Progress) => new Set(Object.keys(p.done).map(id => id.split('-')[0]))

export const ACHIEVEMENTS: Ach[] = [
  { id: 'first', icon: 'play', title: { ro: 'Primul pas', en: 'First step' }, desc: { ro: 'Termină prima lecție', en: 'Finish your first lesson' }, test: p => lessons(p) >= 1 },
  { id: 'l10', icon: 'book', title: { ro: 'Pe drum', en: 'On the way' }, desc: { ro: 'Termină 10 lecții', en: 'Finish 10 lessons' }, test: p => lessons(p) >= 10 },
  { id: 'l50', icon: 'book', title: { ro: 'Maratonist', en: 'Marathon runner' }, desc: { ro: 'Termină 50 de lecții', en: 'Finish 50 lessons' }, test: p => lessons(p) >= 50 },
  { id: 'p1', icon: 'star', title: { ro: 'Fără greșeli', en: 'No mistakes' }, desc: { ro: 'Termină o lecție fără nicio greșeală', en: 'Finish a lesson with no mistakes' }, test: p => perfect(p) >= 1 },
  { id: 'p10', icon: 'star', title: { ro: 'Mână sigură', en: 'Steady hand' }, desc: { ro: '10 lecții perfecte', en: '10 perfect lessons' }, test: p => perfect(p) >= 10 },
  { id: 's3', icon: 'fire', title: { ro: 'Trei la rând', en: 'Three in a row' }, desc: { ro: 'O serie de 3 zile', en: 'A 3-day streak' }, test: p => bestStreak(p.days) >= 3 },
  { id: 's7', icon: 'fire', title: { ro: 'O săptămână', en: 'A full week' }, desc: { ro: 'O serie de 7 zile', en: 'A 7-day streak' }, test: p => bestStreak(p.days) >= 7 },
  { id: 's30', icon: 'fire', title: { ro: 'O lună', en: 'A full month' }, desc: { ro: 'O serie de 30 de zile', en: 'A 30-day streak' }, test: p => bestStreak(p.days) >= 30 },
  { id: 'x500', icon: 'bolt', title: { ro: 'Colecționar', en: 'Collector' }, desc: { ro: 'Strânge 500 XP', en: 'Earn 500 XP' }, test: p => p.xp >= 500 },
  { id: 'x2000', icon: 'bolt', title: { ro: 'Rezervor plin', en: 'Full tank' }, desc: { ro: 'Strânge 2000 XP', en: 'Earn 2000 XP' }, test: p => p.xp >= 2000 },
  { id: 'lv5', icon: 'trophy', title: { ro: 'Nivel 5', en: 'Level 5' }, desc: { ro: 'Ajunge la nivelul 5', en: 'Reach level 5' }, test: p => level(p.xp) >= 5 },
  { id: 'combo', icon: 'bolt', title: { ro: 'Serie de foc', en: 'On fire' }, desc: { ro: '10 răspunsuri corecte la rând', en: '10 correct answers in a row' }, test: p => p.log.some(e => (e.best ?? 0) >= 10) },
  { id: 'c1', icon: 'check', title: { ro: 'Provocator', en: 'Challenger' }, desc: { ro: 'Termină o provocare zilnică', en: 'Finish a daily challenge' }, test: p => Object.keys(p.ch ?? {}).length >= 1 },
  { id: 'c7', icon: 'check', title: { ro: 'Obicei bun', en: 'Good habit' }, desc: { ro: 'Termină 7 provocări zilnice', en: 'Finish 7 daily challenges' }, test: p => Object.keys(p.ch ?? {}).length >= 7 },
  { id: 'unit', icon: 'trophy', title: { ro: 'Unitate încheiată', en: 'Unit complete' }, desc: { ro: 'Termină toate lecțiile unei unități', en: 'Finish every lesson of a unit' }, test: unitDone },
  { id: 'all', icon: 'home', title: { ro: 'Pe toate fronturile', en: 'On every front' }, desc: { ro: 'Termină lecții la toate cele 3 materii', en: 'Finish lessons in all 3 subjects' }, test: p => prefixes(p).size >= 3 },
  { id: 'shop', icon: 'shop', title: { ro: 'Prima achiziție', en: 'First purchase' }, desc: { ro: 'Cumpără ceva din magazin', en: 'Buy something in the shop' }, test: p => (p.owned ?? []).length >= 1 },
]
