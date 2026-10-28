import { Icon } from './icons'
import { ITEMS, DEFAULTS, FRAME_GOLD, buy, canBuy, coins, equip, equipped, owned, type Item } from './store'
import type { Progress, Lang } from './logic'
import type { Strings } from './strings'

type Props = { p: Progress; lang: Lang; t: Strings; update: (next: Progress) => void }

export function Shop({ p, lang, t, update }: Props) {
  const free = (kind: Item['kind']) => ({ id: DEFAULTS[kind], name: kind === 'palette' ? t.byTopic : t.gold, color: kind === 'frame' ? FRAME_GOLD : '' })
  const row = (kind: Item['kind']) => [
    { ...free(kind), price: 0 },
    ...ITEMS.filter(i => i.kind === kind).map(i => ({ id: i.id, name: i.name[lang], color: i.color, price: i.price })),
  ]
  return <>
    <div className="wallet">
      <Icon name="coin" size={28} />
      <div><b>{coins(p)}</b><small>{t.coins}</small></div>
    </div>
    <p className="note">{t.coinsHelp}</p>
    {(['palette', 'frame'] as const).map(kind => (
      <section key={kind}>
        <h2 className="shop-h">{kind === 'palette' ? t.palettes : t.frames}</h2>
        <div className="items">
          {row(kind).map(i => {
            const have = i.price === 0 || owned(p).includes(i.id)
            const on = equipped(p, kind) === i.id
            return (
              <div key={i.id} className={'item' + (on ? ' on' : '')}>
                <span className={'swatch ' + kind} style={i.color ? { background: i.color, borderColor: i.color } : undefined} aria-hidden>
                  {!i.color && <Icon name="home" size={22} />}
                </span>
                <b>{i.name}</b>
                {have
                  ? <button className="chunky" disabled={on} onClick={() => update(equip(p, kind, i.id))}>{on ? t.inUse : t.use}</button>
                  : <button className="chunky buy" disabled={!canBuy(p, i.id)} onClick={() => update(buy(p, i.id))}
                      aria-label={canBuy(p, i.id) ? undefined : t.notEnough}><Icon name="coin" size={16} />{i.price}</button>}
              </div>
            )
          })}
        </div>
      </section>
    ))}
  </>
}
