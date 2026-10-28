import { Icon } from './icons'
import { ACHIEVEMENTS } from './achievements'
import { level, localize, type Course, type Lang, type Progress } from './logic'
import type { Strings } from './strings'

type Props = { p: Progress; courses: Course[]; lang: Lang; t: Strings; code: string | null; openCode: () => void }

export function Profile({ p, courses, lang, t, code, openCode }: Props) {
  const list = ACHIEVEMENTS.map(a => ({ ...a, title: localize(a.title, lang) as string, desc: localize(a.desc, lang) as string, got: a.test(p, courses) }))
  const lv = level(p.xp)
  return <>
    <div className="who-card">
      <span className="avatar" aria-hidden><Icon name="user" size={30} /></span>
      <div>
        <b>{code ? `${t.profileCode}: ${code}` : t.profile}</b>
        <small>{t.level(lv)}, {t.levels[Math.min(lv, t.levels.length) - 1]}</small>
      </div>
    </div>
    {!code && <p className="note">{t.profileAnon}</p>}
    <button className="chunky wide" onClick={openCode}>{t.codeButton}</button>
    <h2 className="shop-h">{t.achievements} <span className="count">{t.achCount(list.filter(a => a.got).length, list.length)}</span></h2>
    <ul className="ach">
      {list.map(a => (
        <li key={a.id} className={a.got ? 'got' : undefined}>
          <span className="ico" aria-hidden><Icon name={a.icon} size={24} /></span>
          <span><b>{a.title}{!a.got && <span className="sr">{t.achLocked}</span>}</b><small>{a.desc}</small></span>
        </li>
      ))}
    </ul>
  </>
}
