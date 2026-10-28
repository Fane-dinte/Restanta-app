// Sound effects (WebAudio, no files) and the on/off switch for them.
const KEY = 'study-app.sound'
let on = true
try { on = localStorage.getItem(KEY) !== 'off' } catch { /* blocked: sound stays on */ }
let ctx: AudioContext | undefined

export const soundOn = () => on
export function setSound(v: boolean) {
  on = v
  try { localStorage.setItem(KEY, v ? 'on' : 'off') } catch { /* blocked: back to on next time */ }
}

function tone(f: number, at: number, dur: number, type: OscillatorType = 'triangle', vol = 0.16) {
  if (!on) return
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
    const t = ctx.currentTime + at
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = type
    o.frequency.value = f
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + dur)
  } catch { /* no audio available */ }
}

export const sfx = {
  // each answer in a row goes up a whole step, so a streak is audible
  right: (combo: number) => { const f = 523.25 * 2 ** ((Math.min(combo, 8) - 1) / 6); tone(f, 0, 0.14); tone(f * 1.5, 0.09, 0.2) },
  wrong: () => { tone(170, 0, 0.22, 'sawtooth', 0.1); tone(125, 0.12, 0.3, 'sawtooth', 0.1) },
  done: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.3)),
}
