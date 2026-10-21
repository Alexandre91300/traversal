import { useState } from 'react'
import { TERRAIN_MODES, type TerrainModeId } from '../game/terrain'
import { useT } from '../i18n'
import { Icon, Modal } from './bits'
import { randomSeed } from './Modals'
import { newCode, useLobby } from './online'
import type { GameSetup } from './useGame'

export function OnlineModal({ onStart, onClose }: { onStart: (s: GameSetup) => void; onClose: () => void }) {
  const t = useT()
  const { status, games, nameOf, seatOf } = useLobby()
  const [mode, setMode] = useState<TerrainModeId>('random')
  const name = (c: Parameters<typeof nameOf>[0]) => nameOf(c) || t('someone')

  return (
    <Modal label={t('playOnline')} onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <div>
          <h2 className="font-extrabold text-lg">{t('playOnline')}</h2>
          <p className="text-xs text-muted">{t('ol.subtitle')}</p>
        </div>
        <button className="p-2 rounded hover:bg-surface-2" onClick={onClose} aria-label={t('close')}><Icon name="x" /></button>
      </div>

      {status === 'connecting' && <p className="p-5 text-sm text-muted">{t('ol.connecting')}</p>}

      {status === 'unavailable' && (
        <div className="p-5 space-y-2 text-sm">
          <p className="font-bold">{t('ol.unavailable')}</p>
          <p className="text-muted">{t('ol.unavailableHint')}</p>
        </div>
      )}

      {status === 'ready' && (
        <div className="p-4 space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-bold">{t('ol.start')}</h3>
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">{t('ng.terrain')}</span>
                <select value={mode} onChange={e => setMode(e.target.value as TerrainModeId)}
                  className="w-full h-full rounded-lg bg-surface-2 border border-line px-3 py-2.5 text-sm">
                  {TERRAIN_MODES.map(m => <option key={m.id} value={m.id}>{t(`terrain.${m.id}`)} · {t(`terrainBlurb.${m.id}`)}</option>)}
                </select>
              </label>
              <button className="btn btn-primary px-5 py-2.5"
                onClick={() => onStart({ mode, seed: randomSeed(), online: { code: newCode(), side: 'red' } })}>
                {t('ol.create')}
              </button>
            </div>
            <p className="text-xs text-muted">{t('ol.createHint')}</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold">{t('ol.games')}</h3>
            {games.length === 0 && <p className="text-sm text-muted rounded-lg bg-surface-2/50 px-3 py-3">{t('ol.none')}</p>}
            <ul className="space-y-1.5">
              {games.map(g => {
                const seat = seatOf(g)
                const open = !g.blue
                return (
                  <li key={g.code} className="flex items-center gap-3 rounded-lg bg-surface-2/60 px-3 py-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: open ? 'var(--color-accent)' : 'var(--color-muted)' }} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      {/* Names come from the platform's profile lookup, never from presence. */}
                      <div className="font-display font-bold text-sm truncate">
                        {open ? t('ol.waiting', { name: name(g.red) }) : t('ol.vs', { a: name(g.red), b: name(g.blue) })}
                      </div>
                      <div className="text-xs text-muted">{t('ol.terrain', { terrain: t(`terrain.${g.mode}`) })}</div>
                    </div>
                    {seat ? (
                      <button className="btn btn-primary px-4 py-2 text-sm" onClick={() => onStart({ mode: g.mode, seed: g.seed, online: { code: g.code, side: seat } })}>{t('ol.resume')}</button>
                    ) : open ? (
                      <button className="btn btn-primary px-4 py-2 text-sm" onClick={() => onStart({ mode: g.mode, seed: g.seed, online: { code: g.code, side: 'blue' } })}>{t('ol.join')}</button>
                    ) : (
                      <span className="text-xs text-muted font-display font-bold">{t('ol.inProgress')}</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  )
}
