# Study app: spec

Duolingo-style app for my first-year university subjects. Romanian + English, switched with a toggle.
Live at restanta.pages.dev (Cloudflare Pages, I deploy `dist/` myself).
Decided 2026-10-26. Change this file when a decision changes.

## Decisions

| Area | Choice |
|---|---|
| Audience | Just me |
| Stack | React + Vite + TypeScript web app, wrapped with Capacitor for Android |
| Language | Romanian + English, toggle in the app. Every text in the content is `{ro, en}`. |
| Subjects v1 | Analiză, Algebră (start at year-1 level, earlier units skippable), Programare în C (from absolute zero). Fizică after v1. |
| Core loop | Streak + freezes. A streak day = at least 1 lesson finished (local date). No hearts, no daily-goal ring, no league tiers. |
| Extras | Daily quests + chests, gems + shop, achievements, mascot + sounds + haptics |
| Tracker | Streak calendar, XP + minutes per subject per week, weak-topic report, exam countdown |
| Reminders | Smart, max 2/day: one at my usual study time, one "streak at risk" at 21:00 if no lesson yet |
| Exercises | Multiple choice, type the answer, step-by-step solve. C also gets "write and run" from v0.2. |

## Rules (all numbers in one config file, tune freely)

- Lesson = theory cards first (4-5, rereadable), then `pick` (10) exercises drawn at random from a bigger pool. Many exercises are templates with new numbers every time, so answers can't be memorized.
- After every answer, right or wrong, the explanation shows. A wrong answer is re-asked at the end. Lesson ends when everything is answered right.
- XP: 10 per lesson, +5 for no mistakes. Minutes = lesson duration.
- Gems: +10 per lesson, chests 10-30, achievements 20-100.
- Shop: streak freeze 200 gems (hold max 2, used automatically per missed day), streak repair 400 gems within 24 h of losing it.
- Daily quests: 3 a day from a pool (finish N lessons, N correct in a row, a perfect lesson, two subjects in a day...). Each opens a chest.
- Math: units before the course start can be skipped with a test-out. C starts at "what is a program".
- Weak topics: every exercise has a `skill` tag. Error rate per skill over the last 20 attempts. "Exersează" builds a lesson from the 3 weakest skills.
- Exam countdown: exam date + the units it covers -> review lessons from those units, days left on the home screen.

## Content

- Source PDFs: `E:\CLAUDE\notite\` (add more there, subject in the file name).
- Exercises are original, written from the PDFs' topics, never copied text or figures.
- One JSON file per subject in `src/content/`: units -> lessons -> theory + exercises. Math as KaTeX `$...$` (display `$$...$$`), code in fenced blocks.
- `src/logic.test.ts` checks every file in both languages before it ships: shape, theory present, pool >= `pick`, a `skill` and an `explain` on everything, math renders, answers parse, each template rolled 40 times.

```json
{"id":"al-1-1","title":{"ro":"Ce este un corp","en":"What is a field"},"pick":10,
 "theory":[{"ro":"Titlu\ntext...","en":"Title\ntext..."}],
 "exercises":[ ... ]}

{"type":"mc","skill":"corp","prompt":{"ro":"...","en":"..."},"choices":["$\\mathbb{Z}$",{"ro":"nu există","en":"there isn't one"}],"answer":0,"explain":{"ro":"...","en":"..."}}
{"type":"input","check":"number","skill":"zp","vars":{"n":[4,12],"a":[2,11]},"where":"a < n","prompt":{"ro":"... $\\hat{[[a]]}$ ...","en":"..."},"answer":"[[mod(a*a,n)]]","explain":{"ro":"...","en":"..."}}
{"type":"steps","skill":"...","prompt":"...","steps":[{"type":"mc", "...": "..."}]}
{"type":"run","skill":"...","prompt":"...","starter":"#include <stdio.h>\n...","stdin":"3 4","expect":"7\n","explain":"..."}
```

- Theory card: first line is the title, the rest is the body (`\n`, `•` bullets).
- Any text can be `{ro, en}`; pure math or code that reads the same in both stays a plain string.
- `vars`: random integers in `[lo, hi]`. Every `[[expr]]` in any string (steps and explains too) is evaluated with mathjs. `where` rejects a roll; MC choices that come out equal are re-rolled.
- `check` is `expr` (both sides evaluated at random points with mathjs, so `2(x+1)` = `2x+2`), `number` (with `tol`) or `text`.
- `run` passes when the program's output equals `expect` (trailing whitespace ignored).

## Architecture

- No router library: 4 tabs (Învață, Tracker, Magazin, Profil) switched by state.
- Dependencies: react, katex, mathjs. Later @capacitor/* (local-notifications, haptics, preferences) and picoc built to WebAssembly for the C Run button. Nothing else without a reason.

## Milestones

1. v0.1 browser: path screen, lesson player (3 types), streak + freezes, XP, streak calendar, 1 unit per subject. Progress in localStorage. Done 2026-10-26, running on the phone over Tailscale. Then theory cards, RO/EN and templates, live at restanta.pages.dev.
2. v0.2: gems, shop, quests, chests, achievements, mascot, sounds, rest of the tracker.
   Plus a Run button for C: picoc (small C interpreter) as WebAssembly, offline in the app, an input box for `scanf`, and a symbol bar (`{ } ; ( ) * & [ ] "`) above the keyboard. Prototype it first: check bundle size and that pointers, arrays and structs work.
3. v0.3 Android: Capacitor, local notifications, haptics, icon. Play Console internal testing track (just me).
4. v1.0: full content for the 3 subjects.
5. After v1: Fizică.

## Not in v1 (on purpose)

Hearts, daily XP goal ring, leagues with tiers, friends and accounts, arrange-the-pieces exercises, AI-generated questions, iOS.
