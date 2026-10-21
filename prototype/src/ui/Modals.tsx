import { useMemo, useState, type ReactNode } from 'react'
import { LEVELS, type Level } from '../game/ai'
import { useT } from '../i18n'
import { PIECE_STATS, type GameResult, type GameState, type PieceType, type Side } from '../game/rules'
import { TERRAIN_MODES, generateTerrain, type TerrainModeId } from '../game/terrain'
import { Icon, Modal, PieceIcon, SIDE_HEX, TerrainPreview } from './bits'
import type { GameSetup } from './useGame'

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

const OPPONENTS: (Level | undefined)[] = [undefined, ...(Object.keys(LEVELS) as Level[])]

export function NewGameModal({ current, onStart, onClose }: { current: GameSetup; onStart: (s: GameSetup) => void; onClose: () => void }) {
  const t = useT()
  const [mode, setMode] = useState<TerrainModeId>(current.mode)
  const [computer, setComputer] = useState<Level | undefined>(current.computer)
  const [seed, setSeed] = useState(randomSeed)
  // One preview per mode from the same seed; rerolling refreshes them all.
  const previews = useMemo(() => Object.fromEntries(TERRAIN_MODES.map(m => [m.id, generateTerrain(m.id, seed)])), [seed])

  return (
    <Modal label={t('newGame')} onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <div>
          <h2 className="font-extrabold text-lg">{t('newGame')}</h2>
          <p className="text-xs text-muted">{t(computer ? 'ng.youRed' : 'ng.local')}</p>
        </div>
        <button className="p-2 rounded hover:bg-surface-2" onClick={onClose} aria-label={t('close')}><Icon name="x" /></button>
      </div>
      <div className="p-4 pb-0">
        <h3 className="text-sm font-bold mb-2">{t('ng.opponent')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {OPPONENTS.map(o => (
            <button key={o ?? 'friend'} onClick={() => setComputer(o)} aria-pressed={computer === o}
              className={`rounded-lg px-3 py-2 text-left border-2 flex items-center gap-2 transition-colors ${computer === o ? 'border-accent bg-surface-2' : 'border-transparent bg-surface-2/40 hover:bg-surface-2'}`}>
              <span className="text-muted"><Icon name={o ? 'cpu' : 'users'} size={18} /></span>
              <span className="min-w-0">
                <span className="block font-display font-bold text-xs">{o ? t(`level.${o}`) : t('ng.friend')}</span>
                <span className="block text-[11px] text-muted leading-tight">{o ? t(`levelBlurb.${o}`) : t('ng.friendBlurb')}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold">{t('ng.terrain')}</h3>
          <button className="text-xs text-muted hover:text-fg font-display font-bold" onClick={() => setSeed(randomSeed())}>{t('ng.reroll')}</button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {TERRAIN_MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={mode === m.id}
              className={`rounded-lg p-2 text-left border-2 transition-colors ${mode === m.id ? 'border-accent bg-surface-2' : 'border-transparent hover:bg-surface-2'}`}>
              <TerrainPreview heights={previews[m.id]} />
              <div className="font-display font-bold text-xs mt-1.5 truncate">{t(`terrain.${m.id}`)}</div>
              <div className="text-[11px] text-muted leading-tight line-clamp-2">{t(`terrainBlurb.${m.id}`)}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 flex gap-2 px-4 py-3 bg-surface border-t border-line">
        <button className="btn btn-quiet px-4 py-3" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary flex-1 py-3 text-base" onClick={() => onStart({ mode, seed, computer })}>{t('ng.start')}</button>
      </div>
    </Modal>
  )
}

// `mySide`: the side this device plays, against the computer or online.
export function GameOverModal({ state, names, mySide, onRematch, onNewGame, onClose }: {
  state: GameState; names: Record<Side, string>; mySide: Side | null
  onRematch?: () => void; onNewGame: () => void; onClose: () => void
}) {
  const t = useT()
  const r = state.result!
  const title = r.kind === 'draw' ? t('over.draw')
    : r.winner === mySide ? t('over.youWin')
    : t('over.wins', { name: names[r.winner] })
  const reason = mySide && r.reason === 'resign'
    ? t(r.winner === mySide ? 'reason.theyResigned' : 'reason.youResigned')
    : t(`reason.${r.reason}` as `reason.${GameResult['reason']}`)
  return (
    <Modal label={t('over.title')} onClose={onClose}>
      <div className="p-6 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-muted font-display font-bold mb-2">{t('over.title')}</div>
        <h2 className="text-3xl font-extrabold" style={r.kind === 'win' ? { color: SIDE_HEX[r.winner] } : undefined}>{title}</h2>
        <p className="text-muted mt-1">{reason}</p>
        <div className="flex items-center justify-center gap-6 my-6">
          {(['red', 'blue'] as const).map(side => (
            <div key={side} className="text-center">
              <div className="w-14 h-14 rounded-xl grid place-items-center mx-auto mb-1" style={{ background: SIDE_HEX[side] }}>
                <span className="font-display font-extrabold text-2xl text-white num">{state.score[side]}</span>
              </div>
              <div className="text-xs text-muted">{names[side]}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button className="btn btn-quiet flex-1 py-3" onClick={onClose}>{t('over.review')}</button>
          {onRematch && <button className="btn btn-quiet flex-1 py-3" onClick={onRematch}>{t('over.rematch')}</button>}
          <button className="btn btn-primary flex-1 py-3" onClick={onNewGame}>{t('newGame')}</button>
        </div>
      </div>
    </Modal>
  )
}

const TYPES: PieceType[] = ['explorer', 'vanguard', 'sentinel']

export function RulesModal({ onClose, onLearn }: { onClose: () => void; onLearn: () => void }) {
  const t = useT()
  return (
    <Modal label={t('rules.title')} onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <h2 className="font-extrabold text-lg">{t('rules.title')}</h2>
        <button className="p-2 rounded hover:bg-surface-2" onClick={onClose} aria-label={t('close')}><Icon name="x" /></button>
      </div>
      <div className="p-5 space-y-5 text-sm">
        <button className="w-full rounded-lg bg-accent/15 border border-accent/40 hover:bg-accent/25 px-4 py-3 flex items-center gap-3 text-left" onClick={onLearn}>
          <span className="text-accent-hi"><Icon name="learn" size={26} /></span>
          <span className="flex-1">
            <span className="block font-display font-bold">{t('rules.learnTitle')}</span>
            <span className="block text-xs text-muted">{t('home.learnBlurb')}</span>
          </span>
          <span className="font-display font-bold text-accent-hi">{t('rules.start')}</span>
        </button>
        <Section n={1} title={t('rules.1t')}>{t('rules.1')}</Section>
        <Section n={2} title={t('rules.2t')}>{t('rules.2')}</Section>
        <Section n={3} title={t('rules.3t')}>{t('rules.3')}</Section>
        <Section n={4} title={t('rules.4t')}>{t('rules.4')}</Section>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(type => {
            const s = PIECE_STATS[type]
            return (
              <div key={type} className="rounded-lg bg-surface-2 p-3 text-center">
                <div className="flex justify-center mb-1"><PieceIcon type={type} side="red" size={28} /></div>
                <div className="font-display font-bold">{t(`piece.${type}`)}</div>
                <div className="text-xs text-muted num">{t('rules.stats', { m: s.movement, a: s.strength })}</div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid place-items-center w-7 h-7 rounded-full bg-accent text-white font-display font-extrabold shrink-0">{n}</span>
      <div>
        <h3 className="font-bold mb-0.5">{title}</h3>
        <p className="text-muted">{children}</p>
      </div>
    </div>
  )
}
