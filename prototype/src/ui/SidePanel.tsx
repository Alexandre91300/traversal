import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MOVE_LIMIT, PIECE_STATS, type Combat, type GameState, type Move, type Piece } from '../game/rules'
import { setLang, useLang, useT, type Lang } from '../i18n'
import { Icon, PieceIcon } from './bits'
import type { Game, Settings } from './useGame'
import type { View } from './Board3D'

interface Props {
  game: Game
  view: View
  setView: (v: View) => void
  settings: Settings
  setSettings: (s: Settings) => void
  onNewGame: () => void
}

export function SidePanel({ game, view, setView, settings, setSettings, onNewGame }: Props) {
  // The panel describes the position on screen, which may be an earlier one.
  const { shown: state, selected, hovered, notice } = game
  const t = useT()
  const [tab, setTab] = useState<'play' | 'moves'>('play')
  const preview = hovered && selected ? hovered : null

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface lg:rounded-xl lg:border border-line">
      <div className="flex border-b border-line" role="tablist">
        <TabButton active={tab === 'play'} onClick={() => setTab('play')} icon="play">{t('tab.play')}</TabButton>
        <TabButton active={tab === 'moves'} onClick={() => setTab('moves')} icon="list">{t('tab.moves')} <span className="text-muted num">{game.plies}</span></TabButton>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
        {tab === 'play' ? (
          <>
            <Status state={state} notice={notice} />
            {preview?.capture ? <CombatCard combat={preview.capture} attacker={selected!} state={state} />
              : preview ? <MoveCard move={preview} piece={selected!} />
              : selected ? <PieceCard piece={selected} looking={!game.canPlay} />
              : state.result ? null : <Hints waiting={game.waiting} />}
            <Legend />
          </>
        ) : <MoveList state={game.state} ply={game.ply} onPick={game.goTo} />}
      </div>

      <ReviewBar game={game} />

      <div className="border-t border-line p-2 grid grid-cols-5 gap-1.5">
        <ToolButton icon="undo" label={t('tool.undo')} onClick={game.undo} disabled={!game.canUndo} />
        <ToolButton icon="flip" label={t('tool.flip')} onClick={() => setView(view === 'blue' ? 'red' : 'blue')} />
        <ToolButton icon="top" label={t(view === 'top' ? 'tool.3d' : 'tool.top')} onClick={() => setView(view === 'top' ? state.turn : 'top')} active={view === 'top'} />
        <ToolButton icon="flag" label={t('tool.resign')} onClick={game.resign} disabled={!!game.state.result} />
        <SettingsButton settings={settings} setSettings={setSettings} />
      </div>
      <div className="p-2 pt-0">
        <button className="btn btn-primary w-full py-2.5 flex items-center justify-center gap-2" onClick={onNewGame}>
          <Icon name="plus" /> {t('newGame')}
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
  const t = useT()
  const lang = useLang()
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  const rows: [keyof Settings, string][] = [
    ['showHeights', t('set.heights')],
    ['showCoords', t('set.coords')],
    ['autoFlip', t('set.autoFlip')],
  ]
  return (
    <div className="relative" ref={ref}>
      <ToolButton icon="gear" label={t('tool.settings')} onClick={() => setOpen(o => !o)} active={open} />
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg bg-surface-2 border border-line shadow-2xl p-2 z-30">
          {rows.map(([k, label]) => (
            <label key={k} className="flex items-center justify-between gap-3 px-2 py-2 rounded hover:bg-line cursor-pointer text-sm">
              {label}
              <input type="checkbox" className="accent-[var(--color-accent)] w-4 h-4" checked={settings[k]}
                onChange={e => setSettings({ ...settings, [k]: e.target.checked })} />
            </label>
          ))}
          <label className="flex items-center justify-between gap-3 px-2 py-2 text-sm">
            {t('language')}
            <select value={lang} onChange={e => setLang(e.target.value as Lang)} className="rounded bg-surface border border-line px-2 py-1">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </div>
      )}
    </div>
  )
}

function Status({ state, notice }: { state: GameState; notice: string | null }) {
  const t = useT()
  const left = MOVE_LIMIT - state.moves.length
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">
          {state.result ? t('status.over') : <span style={{ color: state.turn === 'red' ? 'var(--color-red)' : 'var(--color-blue)' }}>{t('banner.toMove', { side: t(`side.${state.turn}`) })}</span>}
        </h2>
        <span className="text-xs text-muted num" title={t('status.movesLeftTitle')}>{t('status.movesLeft', { n: left })}</span>
      </div>
      <div className="text-xs text-muted">
        {t('status.finished', { n: state.finished.length })}
      </div>
      {notice && <div role="status" className="rounded-md bg-danger/15 border border-danger/40 text-sm px-3 py-2">{notice}</div>}
    </div>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-surface-2/70 border border-line p-3 space-y-2">{children}</div>
}

// Strength shows as Attack and Armor: two names for the same value (see i18n.ts).
function PieceCard({ piece, looking }: { piece: Piece; looking: boolean }) {
  const t = useT()
  const s = PIECE_STATS[piece.type]
  return (
    <Card>
      <div className="flex items-center gap-2">
        <PieceIcon type={piece.type} side={piece.side} size={26} />
        <div>
          <div className="font-display font-bold">{t(`piece.${piece.type}`)}</div>
          <div className="text-xs text-muted">{t(`shape.${piece.type}`)}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('stat.movement')} value={s.movement} />
        <Stat label={t('stat.attack')} value={s.strength} />
        <Stat label={t('stat.armor')} value={s.strength} />
      </div>
      <p className="text-sm text-muted">{t(`ability.${piece.type}`)}</p>
      <p className="text-xs text-muted">
        {looking ? `${t('card.looking')} ` : ''}{t('card.hover')}
      </p>
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
  const t = useT()
  const s = PIECE_STATS[piece.type]
  const text = move.kind === 'finish' ? t('move.finish', { n: s.strength })
    : move.kind === 'leap' ? t('move.leap')
    : move.kind === 'diagonal' ? t('move.diagonal')
    : move.path.length > 1 ? t('move.walkN', { n: move.path.length }) : t('move.walk1')
  return (
    <Card>
      <div className="font-display font-bold">{t(`kind.${move.kind}`)}</div>
      <p className="text-sm text-muted">{text}</p>
      <MovementBar used={move.kind === 'step' || move.kind === 'finish' ? move.cost : s.movement} total={s.movement} />
    </Card>
  )
}

function MovementBar({ used, total }: { used: number; total: number }) {
  const t = useT()
  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1"><span>{t('move.used')}</span><span className="num">{used}/{total}</span></div>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => <div key={i} className={`h-2 flex-1 rounded-full ${i < used ? 'bg-accent' : 'bg-surface'}`} />)}
      </div>
    </div>
  )
}

// The fight broken into its terms, so the outcome is never a surprise.
export function CombatCard({ combat: c, attacker, state }: { combat: Combat; attacker: Piece; state: GameState }) {
  const t = useT()
  const target = state.pieces.find(p => p.id === c.targetId)!
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n))
  const atk: [string, number][] = [
    [t('combat.pieceAttack', { piece: t(`piece.${attacker.type}`) }), c.base],
    ...(c.height ? [[t(c.height > 0 ? 'combat.downhill' : 'combat.uphill'), c.height] as [string, number]] : []),
    ...(c.allies ? [[t('combat.allies'), c.allies] as [string, number]] : []),
    ...(c.vanguardCharge ? [[t('combat.charge'), c.vanguardCharge] as [string, number]] : []),
  ]
  const def: [string, number][] = [
    [t('combat.pieceArmor', { piece: t(`piece.${target.type}`) }), c.defenderBase],
    ...(c.reinforcements ? [[t('combat.reinforcements'), c.reinforcements] as [string, number]] : []),
  ]
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="font-display font-bold">{t('combat.attack')}</div>
        <span className={`text-xs font-display font-bold px-2 py-0.5 rounded-full ${c.allowed ? 'bg-red text-white' : 'bg-line text-muted'}`}>
          {t(c.allowed ? 'combat.capture' : 'combat.impossible')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Breakdown title={t('combat.attack')} total={c.attack} rows={atk} sign={sign} icon={<PieceIcon type={attacker.type} side={attacker.side} size={16} />} />
        <Breakdown title={t('combat.defense')} total={c.defense} rows={def} sign={sign} icon={<PieceIcon type={target.type} side={target.side} size={16} />} />
      </div>
      <p className="text-xs text-muted">{t('combat.rule')}</p>
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
  const t = useT()
  return (
    <Card>
      <div className="font-display font-bold">{t(waiting ? 'hints.theirs' : 'hints.yours')}</div>
      <ul className="text-sm text-muted space-y-1.5 list-disc pl-4">
        <li>{t('hints.1')}</li>
        <li>{t('hints.2')}</li>
        <li>{t('hints.3')}</li>
      </ul>
    </Card>
  )
}

function Legend() {
  const t = useT()
  const items: [ReactNode, string][] = [
    [<span className="w-2.5 h-2.5 rounded-full bg-[#1f2a17] ring-1 ring-white/30" />, t('legend.move')],
    [<span className="w-3 h-3 rounded-full border-2 border-gold" />, t('legend.special')],
    [<span className="w-3.5 h-3.5 rounded-full border-2 border-red" />, t('legend.attack')],
    [<span className="w-3 h-3 rotate-45 bg-accent" />, t('legend.finish')],
    [<span className="w-4 h-1 rounded-full bg-red" />, t('legend.redEdge')],
    [<span className="w-4 h-1 rounded-full bg-blue" />, t('legend.blueEdge')],
  ]
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted">
        {items.map(([sw, label]) => <div key={label} className="flex items-center gap-2"><span className="w-4 grid place-items-center">{sw}</span>{label}</div>)}
      </div>
      <p className="hidden lg:block text-xs text-muted">{t('legend.camera')}</p>
    </div>
  )
}

// Every Move is a button: click one to see the position right after it.
function MoveList({ state, ply, onPick }: { state: GameState; ply: number; onPick: (i: number) => void }) {
  const current = useRef<HTMLButtonElement>(null)
  const t = useT()
  useEffect(() => current.current?.scrollIntoView({ block: 'nearest' }), [ply])
  if (!state.moves.length) return <p className="text-sm text-muted p-2">{t('moves.none')}</p>
  const rows: { n: number; red?: [string, number]; blue?: [string, number] }[] = []
  state.moves.forEach((m, i) => {
    const n = Math.floor(i / 2)
    rows[n] ??= { n: n + 1 }
    rows[n][m.side] = [m.notation, i + 1]
  })
  const cell = (c?: [string, number]) => c && (
    <button ref={c[1] === ply ? current : undefined} onClick={() => onPick(c[1])}
      className={`text-left font-bold rounded px-1.5 -mx-1.5 ${c[1] === ply ? 'bg-accent text-white' : 'hover:bg-line'}`}>
      {c[0]}
    </button>
  )
  return (
    <div className="text-sm">
      <ol className="font-display">
        {rows.map((r, i) => (
          <li key={r.n} className={`grid grid-cols-[2.5rem_1fr_1fr] px-2 py-1 rounded ${i % 2 ? '' : 'bg-surface-2/50'}`}>
            <span className="text-muted num">{r.n}.</span>
            <span>{cell(r.red)}</span>
            <span>{cell(r.blue)}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted mt-3 px-2">{t('moves.key')}</p>
    </div>
  )
}

// chess.com-style stepping through the game, live or after it ends.
function ReviewBar({ game }: { game: Game }) {
  const { ply, plies, reviewing } = game
  const t = useT()
  const btn = (icon: 'first' | 'prev' | 'next' | 'last', label: string, to: number, disabled: boolean) => (
    <button onClick={() => game.goTo(to)} disabled={disabled} aria-label={label} title={label}
      className="btn btn-quiet flex-1 grid place-items-center py-1.5 disabled:opacity-35 disabled:pointer-events-none">
      <Icon name={icon} size={16} />
    </button>
  )
  return (
    <div className="border-t border-line px-2 pt-2 space-y-1.5">
      <div className="flex items-center justify-between text-xs px-1">
        <span className={reviewing ? 'text-gold font-display font-bold' : 'text-muted'}>
          {reviewing ? (ply ? t('banner.reviewing', { n: ply, total: plies }) : t('banner.reviewStart')) : plies ? t('review.move', { n: plies }) : t('review.start')}
        </span>
        {reviewing
          ? <button className="text-accent-hi font-display font-bold hover:underline" onClick={() => game.goTo(null)}>{t('review.liveArrow')}</button>
          : <span className="text-muted">{t('review.hint')}</span>}
      </div>
      <div className="flex gap-1.5">
        {btn('first', t('review.first'), 0, ply === 0)}
        {btn('prev', t('review.prev'), ply - 1, ply === 0)}
        {btn('next', t('review.next'), ply + 1, ply === plies)}
        {btn('last', t('review.last'), plies, ply === plies)}
      </div>
    </div>
  )
}
