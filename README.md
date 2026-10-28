<p align="center"><img src="docs/banner.svg" alt="Restanță" width="100%"></p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="Cloudflare Pages" src="https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white">
  <img alt="MIT license" src="https://img.shields.io/badge/license-MIT-green">
</p>

<p align="center"><b><a href="https://restanta.pages.dev">restanta.pages.dev</a></b></p>

**Restanță** (Romanian for a failed exam you have to retake) is a Duolingo-style app for first-year university subjects: **Calculus**, **Algebra** and **C programming**. Short lessons, a daily streak, XP, and an explanation after every answer. Romanian and English, one tap apart.

<p align="center">
  <img src="docs/acasa.png" alt="Home screen" width="270">
  &nbsp;&nbsp;
  <img src="docs/lectie.png" alt="A theory card from a lesson" width="270">
</p>

## What it does

- **A lesson is theory, then practice.** 4–5 theory cards you can reread, then 10 exercises drawn at random from a bigger pool. A wrong answer is asked again at the end.
- **New numbers every time.** Many exercises are templates (`vars`, `where`, and `[[expr]]` evaluated with mathjs), so you can't memorize the answers.
- **Three exercise types:** multiple choice, typed answers (an expression, a number or text, checked mathematically: `2(x+1)` equals `2x+2`) and step-by-step solving. "Write and run" for C is next.
- **Streak, freezes, XP and a tracker.** A streak day means at least one finished lesson. No hearts, no leagues, no pressure.
- **Proper math** through KaTeX, **Romanian and English** on every text, installable as a PWA.
- **Progress without an account.** Pick a code (no email) and your progress syncs across devices. Without one, it stays in your browser.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # checks all the content, in both languages
npm run build      # tsc + tests + vite build, output in dist/
```

## Content

One JSON file per subject in `src/content/`: units → lessons → theory + exercises.

```json
{"id":"al-1-1","title":{"ro":"Ce este un corp","en":"What is a field"},"pick":10,
 "theory":[{"ro":"Titlu\ntext...","en":"Title\ntext..."}],
 "exercises":[
   {"type":"input","check":"number","skill":"zp","vars":{"n":[4,12],"a":[2,11]},"where":"a < n",
    "prompt":{"ro":"…","en":"…"},"answer":"[[mod(a*a,n)]]","explain":{"ro":"…","en":"…"}}
 ]}
```

`src/logic.test.ts` runs before every build: file shape, theory present, an exercise pool larger than `pick`, a `skill` and an `explain` on every exercise, math that renders, and each template rolled 40 times. Rules and decisions are in [`SPEC.md`](SPEC.md).

The exercises are original, written from the topics of the courses, with no copied text or figures.

## Deploy on Cloudflare Pages

1. Run `npm run build`, then upload the `dist/` folder (Workers & Pages → Create → Pages → Upload assets), or connect the repo with build command `npm run build` and output directory `dist`.
2. For code-based sync, create a **KV namespace** and bind it to the project with the name **`KV`** (Settings → Bindings). The functions in `functions/api/` run automatically.
3. Optionally, the `ADMIN_KEY` secret enables `/api/admin`: a list of every code with a summary (`GET`) or deleting a code (`DELETE ?code=…`), sent with `Authorization: Bearer <ADMIN_KEY>`.
4. Redeploy so the bindings take effect.

Without KV the app works the same, just without syncing between devices.

> **Heads up:** the sync code is the only "password", and short codes can be guessed (there's no attempt limit). Pick a long code, or add Turnstile / a counter in KV before opening it to many users.

## What's next

Decisions and the plan are in [`SPEC.md`](SPEC.md): gems, shop, daily quests, weak-topic report, exam countdown, a Run button for C (picoc in WebAssembly) and an Android build with Capacitor.

## License

[MIT](LICENSE) for the code. The lesson content is written by the author for learning use.
