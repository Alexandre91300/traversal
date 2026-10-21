import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MOVE_LIMIT, PIECE_STATS, type Combat, type GameState, type Move, type Piece } from '../game/rules'
import { Icon, PieceIcon, SIDE_LABEL } from './bits'
import type { Game, Settings } from './useGame'
import type { View } from './Board3D'

const ABILITY = {
  explorer: 'May instead step 1 diagonally or leap 2 straight, ignoring Height (uses the whole turn).',
  vanguard: '+1 attack when its shortest path to the target uses all 4 Movement.',
  sentinel: 'If it is the first piece of either side to Finish, its player wins instantly.',
}

interface Props {
  game: Game
  view: View
  setView: (v: View) => void
  settings: Settings
  setSettings: (s: Settings) => void
  onNewGame: () => void
}

export function SidePanel({ game, view, setView, settings, setSettings, onNewGame }: Props) {
  const { state, selected, hovered, notice } = game
  const [tab, setTab] = useState<'play' | 'moves'>('play')
  const preview = hovered && selected ? hovered : null

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface lg:rounded-xl lg:border border-line">
      <div className="flex border-b border-line" role="tablist">
        <TabButton active={tab === 'play'} onClick={() => setTab('play')} icon="play">Play</TabButton>
        <TabButton active={tab === 'moves'} onClick={() => setTab('moves')} icon="list">Moves <span className="text-muted num">{state.moves.length}</span></TabButton>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
        {tab === 'play' ? (
          <>
            <Status state={state} notice={notice} />
            {preview?.capture ? <CombatCard combat={preview.capture} attacker={selected!} state={state} />
              : preview ? <MoveCard move={preview} piece={selected!} />
              : selected ? <PieceCard piece={selected} />
              : state.result ? null : <Hints waiting={game.waiting} />}
            <Legend />
          </>
        ) : <MoveList state={state} />}
      </div>

      <div className="border-t border-line p-2 grid grid-cols-5 gap-1.5">
        <ToolButton icon="undo" label="Undo" onClick={game.undo} disabled={!game.canUndo} />
        <ToolButton icon="flip" label="Flip" onClick={() => setView(view === 'blue' ? 'red' : 'blue')} />
        <ToolButton icon="top" label={view === 'top' ? '3D' : 'Top'} onClick={() => setView(view === 'top' ? state.turn : 'top')} active={view === 'top'} />
        <ToolButton icon="flag" label="Resign" onClick={game.resign} disabled={!!state.result} />
        <SettingsButton settings={settings} setSettings={setSettings} />
      </div>
      <div className="p-2 pt-0">
        <button className="btn btn-primary w-full py-2.5 flex items-center justify-center gap-2" onClick={onNewGame}>
          <Icon name="plus" /> New game
        </button>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: 'play' | 'list'; children: ReactNode }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-display font-bold text-sm border-b-2 -mb-px ${active ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
      <Icon name={icon} size={15} /> {children}
    </button>
  )
}

function ToolButton({ icon, label, onClick, disabled, active }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      className={`btn btn-quiet flex flex-col items-center gap-0.5 py-1.5 text-[11px] disabled:opacity-40 disabled:pointer-events-none ${active ? 'ring-1 ring-accent' : ''}`}>
      <Icon name={icon} size={17} />
      {label}
    </button>
  )
}

function SettingsButton({ settings, setSettings }: { settings: Settings; setSettings: (s: Settings) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  const rows: [keyof Settings, string][] = [
    ['showHeights', 'Show Heights on squares'],
    ['showCoords', 'Show coordinates'],
    ['autoFlip', 'Turn board to the player to move'],
  ]
  return (
    <div className="relative" ref={ref}>
      <ToolButton icon="gear" label="Settings" onClick={() => setOpen(o => !o)} active={open} />
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg bg-surface-2 border border-line shadow-2xl p-2 z-30">
          {rows.map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-3 px-2 py-2 rounded hover:bg-line cursor-pointer text-sm">
              {label}
              <input type="checkbox" className="accent-[var(--color-accent)] w-4 h-4" checked={settings[k]}
                onChange={e => setSettings({ ...settings, [k]: e.target.checked })} />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function Status({ state, notice }: { state: GameState; notice: string | null }) {
  const left = MOVE_LIMIT - state.moves.length
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">
          {state.result ? 'Game over' : <><span style={{ color: state.turn === 'red' ? 'var(--color-red)' : 'var(--color-blue)' }}>{SIDE_LABEL[state.turn]}</span> to move</>}
        </h2>
        <span className="text-xs text-muted num" title="Moves left before the move limit">{left} moves left</span>
      </div>
      <div className="text-xs text-muted">
        Finished: <span className="text-fg num">{state.finished.length}/2</span> · the game ends when two pieces have Finished.
      </div>
      {notice && <div role="status" className="rounded-md bg-danger/15 border border-danger/40 text-sm px-3 py-2">{notice}</div>}
    </div>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-surface-2/70 border border-line p-3 space-y-2">{children}</div>
}

function PieceCard({ piece }: { piece: Piece }) {
  const s = PIECE_STATS[piece.type]
  return (
    <Card>
      <div className="flex items-center gap-2">
        <PieceIcon type={piece.type} side={piece.side} size={26} />
        <div>
          <div className="font-display font-bold">{s.name}</div>
          <div className="text-xs text-muted">{s.shape}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Movement" value={s.movement} />
        <Stat label="Strength" value={s.strength} />
      </div>
      <p className="text-sm text-muted">{ABILITY[piece.type]}</p>
      <p className="text-xs text-muted">Hover a marker to preview the path, cost or fight.</p>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-surface px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display font-extrabold text-lg num leading-tight">{value}</div>
    </div>
  )
}

export function MoveCard({ move, piece }: { move: Move; piece: Piece }) {
  const s = PIECE_STATS[piece.type]
  const text = move.kind === 'finish' ? `Step off the board and score +${s.strength}.`
    : move.kind === 'leap' ? 'Leap 2 squares straight, ignoring Height. Uses the whole turn.'
    : move.kind === 'diagonal' ? 'Step 1 diagonally, ignoring Height. Uses the whole turn.'
    : `Walks ${move.path.length} square${move.path.length > 1 ? 's' : ''}.`
  return (
    <Card>
      <div className="font-display font-bold capitalize">{move.kind === 'step' ? 'Move' : move.kind}</div>
      <p className="text-sm text-muted">{text}</p>
      <MovementBar used={move.kind === 'step' || move.kind === 'finish' ? move.cost : s.movement} total={s.movement} />
    </Card>
  )
}

function MovementBar({ used, total }: { used: number; total: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1"><span>Movement used</span><span className="num">{used}/{total}</span></div>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => <div key={i} className={`h-2 flex-1 rounded-full ${i < used ? 'bg-accent' : 'bg-surface'}`} />)}
      </div>
    </div>
  )
}

// The fight broken into its terms, so the outcome is never a surprise.
export function CombatCard({ combat: c, attacker, state }: { combat: Combat; attacker: Piece; state: GameState }) {
  const target = state.pieces.find(p => p.id === c.targetId)!
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n))
  const atk: [string, number][] = [
    [`${PIECE_STATS[attacker.type].name} Strength`, c.base],
    ...(c.height ? [[c.height > 0 ? 'Attacking downhill' : 'Attacking uphill', c.height] as [string, number]] : []),
    ...(c.allies ? [['Allies next to target', c.allies] as [string, number]] : []),
    ...(c.vanguardCharge ? [['Vanguard charge', c.vanguardCharge] as [string, number]] : []),
  ]
  const def: [string, number][] = [
    [`${PIECE_STATS[target.type].name} Strength`, c.defenderBase],
    ...(c.reinforcements ? [['Reinforcements', c.reinforcements] as [string, number]] : []),
  ]
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="font-display font-bold">Attack</div>
        <span className={`text-xs font-display font-bold px-2 py-0.5 rounded-full ${c.allowed ? 'bg-red text-white' : 'bg-line text-muted'}`}>
          {c.allowed ? 'Capture' : 'Not possible'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Breakdown title="Attack" total={c.attack} rows={atk} sign={sign} icon={<PieceIcon type={attacker.type} side={attacker.side} size={16} />} />
        <Breakdown title="Defense" total={c.defense} rows={def} sign={sign} icon={<PieceIcon type={target.type} side={target.side} size={16} />} />
      </div>
      <p className="text-xs text-muted">An Attack succeeds when attack ≥ defense. It captures the piece and ends the turn.</p>
    </Card>
  )
}

function Breakdown({ title, total, rows, sign, icon }: { title: string; total: number; rows: [string, number][]; sign: (n: number) => string; icon: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-xs uppercase tracking-wider text-muted">{title}</span></div>
      <div className="font-display font-extrabold text-3xl num leading-none mb-1.5">{total}</div>
      <ul className="space-y-0.5 text-xs">
        {rows.map(([label, n], i) => (
          <li key={label} className="flex justify-between gap-2"><span className="text-muted">{label}</span><span className="num">{i === 0 ? n : sign(n)}</span></li>
        ))}
      </ul>
    </div>
  )
}

function Hints({ waiting }: { waiting: boolean }) {
  return (
    <Card>
      <div className="font-display font-bold">{waiting ? "Your opponent's turn" : 'Your turn'}</div>
      <ul className="text-sm text-muted space-y-1.5 list-disc pl-4">
        <li>Select one of your pieces to see where it can go.</li>
        <li>Each step costs 1, or Height difference + 1 when climbing or descending.</li>
        <li>Reach your last row with Movement to spare, then step off to Finish and score its Strength.</li>
      </ul>
    </Card>
  )
}

function Legend() {
  const items: [ReactNode, string][] = [
    [<span className="w-2.5 h-2.5 rounded-full bg-[#1f2a17] ring-1 ring-white/30" />, 'Move (cost)'],
    [<span className="w-3 h-3 rounded-full border-2 border-gold" />, 'Explorer special'],
    [<span className="w-3.5 h-3.5 rounded-full border-2 border-red" />, 'Attack'],
    [<span className="w-3 h-3 rotate-45 bg-accent" />, 'Finish'],
    [<span className="w-4 h-1 rounded-full bg-red" />, 'Red finishes off this edge'],
    [<span className="w-4 h-1 rounded-full bg-blue" />, 'Blue finishes off this edge'],
  ]
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted">
      {items.map(([sw, label]) => <div key={label} className="flex items-center gap-2"><span className="w-4 grid place-items-center">{sw}</span>{label}</div>)}
    </div>
  )
}

function MoveList({ state }: { state: GameState }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [state.moves.length])
  if (!state.moves.length) return <p className="text-sm text-muted p-2">No moves yet. Red plays first.</p>
  const rows: { n: number; red?: string; blue?: string }[] = []
  state.moves.forEach((m, i) => {
    const n = Math.floor(i / 2)
    rows[n] ??= { n: n + 1 }
    rows[n][m.side] = m.notation
  })
  return (
    <div className="text-sm">
      <ol className="font-display">
        {rows.map((r, i) => (
          <li key={r.n} className={`grid grid-cols-[2.5rem_1fr_1fr] px-2 py-1 rounded ${i % 2 ? '' : 'bg-surface-2/50'}`}>
            <span className="text-muted num">{r.n}.</span>
            <span className="font-bold">{r.red}</span>
            <span className="font-bold">{r.blue}</span>
          </li>
        ))}
      </ol>
      <div ref={end} />
      <p className="text-xs text-muted mt-3 px-2">E/V/S = Explorer/Vanguard/Sentinel · x = capture · ↑ = Finish</p>
    </div>
  )
}
