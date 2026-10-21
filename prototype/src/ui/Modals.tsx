import { useMemo, useState, type ReactNode } from 'react'
import { LEVELS, type Level } from '../game/ai'
import { PIECE_STATS, type GameResult, type GameState, type PieceType } from '../game/rules'
import { TERRAIN_MODES, generateTerrain, type TerrainModeId } from '../game/terrain'
import { Icon, Modal, PieceIcon, SIDE_HEX, playerNames, TerrainPreview } from './bits'
import { HUMAN, type GameSetup } from './useGame'

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

const OPPONENTS: { id: Level | undefined; name: string; blurb: string }[] = [
  { id: undefined, name: 'Friend', blurb: 'Pass and play' },
  ...(Object.keys(LEVELS) as Level[]).map(id => ({ id, name: LEVELS[id].name, blurb: LEVELS[id].blurb })),
]

export function NewGameModal({ current, onStart, onClose }: { current: GameSetup; onStart: (s: GameSetup) => void; onClose: () => void }) {
  const [mode, setMode] = useState<TerrainModeId>(current.mode)
  const [computer, setComputer] = useState<Level | undefined>(current.computer)
  const [seed, setSeed] = useState(randomSeed)
  // One preview per mode from the same seed; rerolling refreshes them all.
  const previews = useMemo(() => Object.fromEntries(TERRAIN_MODES.map(m => [m.id, generateTerrain(m.id, seed)])), [seed])

  return (
    <Modal label="New game" onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <div>
          <h2 className="font-extrabold text-lg">New game</h2>
          <p className="text-xs text-muted">{computer ? 'You play Red and move first' : 'Local · two players on this device'}</p>
        </div>
        <button className="p-2 rounded hover:bg-surface-2" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </div>
      <div className="p-4 pb-0">
        <h3 className="text-sm font-bold mb-2">Opponent</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {OPPONENTS.map(o => (
            <button key={o.name} onClick={() => setComputer(o.id)} aria-pressed={computer === o.id}
              className={`rounded-lg px-3 py-2 text-left border-2 flex items-center gap-2 transition-colors ${computer === o.id ? 'border-accent bg-surface-2' : 'border-transparent bg-surface-2/40 hover:bg-surface-2'}`}>
              <span className="text-muted"><Icon name={o.id ? 'cpu' : 'users'} size={18} /></span>
              <span className="min-w-0">
                <span className="block font-display font-bold text-xs">{o.name}</span>
                <span className="block text-[11px] text-muted leading-tight">{o.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold">Terrain</h3>
          <button className="text-xs text-muted hover:text-fg font-display font-bold" onClick={() => setSeed(randomSeed())}>↻ Reroll terrains</button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {TERRAIN_MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={mode === m.id}
              className={`rounded-lg p-2 text-left border-2 transition-colors ${mode === m.id ? 'border-accent bg-surface-2' : 'border-transparent hover:bg-surface-2'}`}>
              <TerrainPreview heights={previews[m.id]} />
              <div className="font-display font-bold text-xs mt-1.5 truncate">{m.name}</div>
              <div className="text-[11px] text-muted leading-tight line-clamp-2">{m.blurb}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="sticky bottom-0 flex gap-2 px-4 py-3 bg-surface border-t border-line">
        <button className="btn btn-quiet px-4 py-3" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary flex-1 py-3 text-base" onClick={() => onStart({ mode, seed, computer })}>Start game</button>
      </div>
    </Modal>
  )
}

const REASON: Record<GameResult['reason'], string> = {
  score: 'Two pieces have Finished.',
  sentinel: 'A Sentinel Finished first: instant win.',
  moveLimit: 'The move limit was reached (or a player had no legal move).',
  resign: 'The other player resigned.',
}

export function GameOverModal({ state, computer, onRematch, onNewGame, onClose }: {
  state: GameState; computer?: Level; onRematch: () => void; onNewGame: () => void; onClose: () => void
}) {
  const r = state.result!
  const names = playerNames(computer)
  const title = r.kind === 'draw' ? 'Draw'
    : computer ? (r.winner === HUMAN ? 'You win!' : 'The computer wins')
    : `${names[r.winner]} wins`
  const reason = computer && r.reason === 'resign' && r.winner !== HUMAN ? 'You resigned.' : REASON[r.reason]
  return (
    <Modal label="Game over" onClose={onClose}>
      <div className="p-6 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-muted font-display font-bold mb-2">Game over</div>
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
          <button className="btn btn-quiet flex-1 py-3" onClick={onClose}>Review board</button>
          <button className="btn btn-quiet flex-1 py-3" onClick={onRematch}>Rematch</button>
          <button className="btn btn-primary flex-1 py-3" onClick={onNewGame}>New game</button>
        </div>
      </div>
    </Modal>
  )
}

const TYPES: PieceType[] = ['explorer', 'vanguard', 'sentinel']

export function RulesModal({ onClose, onLearn }: { onClose: () => void; onLearn: () => void }) {
  return (
    <Modal label="How to play" onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <h2 className="font-extrabold text-lg">How to play</h2>
        <button className="p-2 rounded hover:bg-surface-2" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </div>
      <div className="p-5 space-y-5 text-sm">
        <button className="w-full rounded-lg bg-accent/15 border border-accent/40 hover:bg-accent/25 px-4 py-3 flex items-center gap-3 text-left" onClick={onLearn}>
          <span className="text-accent-hi"><Icon name="learn" size={26} /></span>
          <span className="flex-1">
            <span className="block font-display font-bold">Rather learn by playing?</span>
            <span className="block text-xs text-muted">Seven quick lessons on a real board, about two minutes.</span>
          </span>
          <span className="font-display font-bold text-accent-hi">Start →</span>
        </button>
        <Section n={1} title="Race across the terrain">
          Red starts on row 1 and heads for row 10; Blue the reverse. On your last row, step off the board with at least 1 Movement left to <b>Finish</b> and score the piece's Strength.
        </Section>
        <Section n={2} title="Height costs Movement">
          A flat step costs 1. Climbing or descending costs the Height difference + 1. Pieces can't walk through other pieces.
        </Section>
        <Section n={3} title="Attack by moving onto an enemy">
          Attack = Strength, +1 downhill / −1 uphill, + Strength of your pieces next to the target. Defense = Strength + 1 per friendly piece next to it. You capture when attack ≥ defense.
        </Section>
        <Section n={4} title="Winning">
          The game ends once two pieces (either side) have Finished; the higher score wins. If a Sentinel is the first piece to Finish, its player wins on the spot.
        </Section>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(t => {
            const s = PIECE_STATS[t]
            return (
              <div key={t} className="rounded-lg bg-surface-2 p-3 text-center">
                <div className="flex justify-center mb-1"><PieceIcon type={t} side="red" size={28} /></div>
                <div className="font-display font-bold">{s.name}</div>
                <div className="text-xs text-muted num">Move {s.movement} · Str {s.strength}</div>
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
