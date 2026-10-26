import { localize, type Lang } from './logic'

// UI text in both languages; lesson text lives in the course files.
const UI = {
  locale: { ro: 'ro-RO', en: 'en-GB' },
  langSwitch: { ro: 'Limba: română. Treci pe engleză', en: 'Language: English. Switch to Romanian' },
  subject: { ro: 'Materie', en: 'Subject' },
  start: { ro: 'ÎNCEPE', en: 'START' },
  doneSr: { ro: ' (terminat)', en: ' (done)' },
  lockedSr: { ro: ' (blocat)', en: ' (locked)' },
  learn: { ro: 'Învață', en: 'Learn' },
  tracker: { ro: 'Tracker', en: 'Tracker' },
  lessonDone: { ro: 'Lecție terminată!', en: 'Lesson complete!' },
  time: { ro: 'Timp', en: 'Time' },
  accuracy: { ro: 'Precizie', en: 'Accuracy' },
  continue: { ro: 'Continuă', en: 'Continue' },
  check: { ro: 'Verifică', en: 'Check' },
  streak: { ro: 'Serie', en: 'Streak' },
  days: { ro: (n: number) => (n === 1 ? 'zi' : 'zile'), en: (n: number) => (n === 1 ? 'day' : 'days') },
  streakStat: { ro: (n: number) => `${n === 1 ? 'zi' : 'zile'} serie`, en: () => 'day streak' },
  freezes: { ro: 'înghețări', en: 'freezes' },
  xpTotal: { ro: 'XP total', en: 'total XP' },
  lessons: { ro: 'lecții', en: 'lessons' },
  prevMonth: { ro: 'Luna trecută', en: 'Previous month' },
  nextMonth: { ro: 'Luna următoare', en: 'Next month' },
  weekdays: { ro: ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'], en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] },
  studied: { ro: 'ai studiat', en: 'studied' },
  frozen: { ro: 'înghețare', en: 'freeze' },
  freezeUsed: { ro: 'înghețare folosită', en: 'freeze used' },
  quit: { ro: 'Ieși din lecție', en: 'Quit lesson' },
  quitConfirm: { ro: 'Ieși din lecție? Progresul ei se pierde.', en: 'Quit the lesson? Its progress will be lost.' },
  progress: { ro: 'Progres', en: 'Progress' },
  theory: { ro: (a: number, b: number) => `📖 Teorie ${a} din ${b}`, en: (a: number, b: number) => `📖 Theory ${a} of ${b}` },
  reread: { ro: 'Recitește teoria', en: 'Reread the theory' },
  back: { ro: 'Înapoi', en: 'Back' },
  next: { ro: 'Mai departe', en: 'Next' },
  toExercises: { ro: 'La exerciții', en: 'To the exercises' },
  step: { ro: (a: number, b: number) => `Pasul ${a} din ${b}`, en: (a: number, b: number) => `Step ${a} of ${b}` },
  pickOne: { ro: 'Alege răspunsul', en: 'Pick the answer' },
  typeIt: { ro: 'Scrie răspunsul', en: 'Type the answer' },
  yourAnswer: { ro: 'Răspunsul tău', en: 'Your answer' },
  correctAnswer: { ro: 'Răspuns corect:', en: 'Correct answer:' },
  praise: { ro: ['Corect! 🎉', 'Bravo! 💪', 'Excelent! ✨', 'Perfect! 🔥', 'Super! 🚀'], en: ['Correct! 🎉', 'Nice! 💪', 'Excellent! ✨', 'Perfect! 🔥', 'Great! 🚀'] },
  oops: { ro: ['Nu chiar 😅', 'Aproape! 🤏', 'Mai încearcă 💡'], en: ['Not quite 😅', 'Almost! 🤏', 'Keep trying 💡'] },
}

type Tr<T> = { [K in keyof T]: T[K] extends { ro: infer V } ? V : never }
export type Strings = Tr<typeof UI>
export const strings = (lang: Lang): Strings => localize(UI, lang)
