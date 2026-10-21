import { other, type GameState, type Side } from '../game/rules'
import { Icon, PieceIcon, SIDE_HEX, SIDE_LABEL } from './bits'

// chess.com-style strip above/below the board: who, score, material taken.
export function PlayerBar({ state, side, name, computer, thinking }: { state: GameState; side: Side; name: string; computer?: boolean; thinking?: boolean }) {
  const toMove = !state.result && state.turn === side
  const won = state.result?.kind === 'win' && state.result.winner === side
  const taken = state.captured.filter(p => p.side === other(side))
  const finished = state.finished.filter(p => p.side === side)
  const remaining = state.pieces.filter(p => p.side === side).length

  return (
    <div className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${toMove ? 'bg-surface-2' : 'bg-transparent'}`}>
      <div className="relative grid place-items-center w-9 h-9 rounded-md shrink-0" style={{ background: SIDE_HEX[side] }}>
        {computer
          ? <span className="text-white"><Icon name="cpu" size={20} /></span>
          : <span className="font-display font-extrabold text-white text-sm">{side === 'red' ? '1' : '2'}</span>}
        {toMove && <span className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full bg-accent ring-2 ring-bg" aria-hidden="true" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold truncate">{name}</span>
          <span className="text-muted text-xs">{SIDE_LABEL[side]}</span>
          {toMove && (thinking
            ? <span className="text-accent-hi text-xs font-display font-bold thinking">thinking</span>
            : <span className="text-accent-hi text-xs font-display font-bold">to move</span>)}
          {won && <span className="text-gold text-xs font-display font-bold">winner</span>}
        </div>
        <div className="flex items-center gap-2 h-5 text-xs text-muted">
          {finished.length > 0 && (
            <span className="flex items-center gap-0.5" title="Finished">
              {finished.map(p => <PieceIcon key={p.id} type={p.type} side={p.side} size={13} />)}
              <span className="ml-0.5">↑</span>
            </span>
          )}
          {taken.length > 0 && (
            <span className="flex items-center gap-0.5" title="Captured">
              {taken.map(p => <PieceIcon key={p.id} type={p.type} side={p.side} size={13} />)}
            </span>
          )}
          {finished.length === 0 && taken.length === 0 && <span>{remaining} pieces on board</span>}
        </div>
      </div>
      <div className="text-right shrink-0" title="Score: Strength of Finished pieces">
        {/* Keyed on the score so it pops each time it changes. */}
        <div key={state.score[side]} className={`font-display font-extrabold text-2xl leading-none num ${state.score[side] ? 'score-pop' : ''}`}>{state.score[side]}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted">pts</div>
      </div>
    </div>
  )
}
