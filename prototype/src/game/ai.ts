// Computer opponent: a shallow alpha-beta search over the rules engine.
// Pure and synchronous; the UI runs it in a worker (ai.worker.ts) because
// Hard takes around a second.

import { apply, goalRank, isLegal, movesFor, other, PIECE_STATS, type GameState, type Move, type Side } from './rules'

const WIN = 1_000_000

export type Level = 'easy' | 'normal' | 'hard'

// Depth is plies searched; root moves scoring within `margin` of the best
// count as equally good and one is picked at random, so games vary and Easy
// makes human-looking slips.
export const LEVELS: Record<Level, { depth: number; margin: number; name: string; blurb: string }> = {
  easy: { depth: 1, margin: 60, name: 'Easy', blurb: 'Grabs what it sees' },
  normal: { depth: 2, margin: 6, name: 'Normal', blurb: 'Sees your reply' },
  hard: { depth: 3, margin: 2, name: 'Hard', blurb: 'Plans a move ahead' },
}

export function legalMoves(s: GameState): Move[] {
  const out: Move[] = []
  for (const p of s.pieces) if (p.side === s.turn) for (const m of movesFor(s, p)) if (isLegal(m)) out.push(m)
  // Captures and Finishes first: they decide most positions, so alpha-beta cuts sooner.
  const weight = (m: Move) => (m.kind === 'finish' ? 10 : 0) + (m.capture ? 5 + m.capture.defenderBase : 0)
  return out.sort((a, b) => weight(b) - weight(a))
}

// Static score of a position for `side`: points banked, plus Pieces alive
// and how far each has travelled, stronger Pieces' progress counting more.
export function evaluate(s: GameState, side: Side): number {
  if (s.result) {
    if (s.result.kind === 'draw') return 0
    return s.result.winner === side ? WIN : -WIN
  }
  let v = 0
  for (const sd of [side, other(side)]) {
    let t = s.score[sd] * 120
    for (const p of s.pieces) {
      if (p.side !== sd) continue
      const str = PIECE_STATS[p.type].strength
      const travelled = 9 - Math.abs(goalRank(sd) - p.y)
      t += str * 40 + travelled * (3 + str * 2)
    }
    v += sd === side ? t : -t
  }
  return v
}

function negamax(s: GameState, depth: number, alpha: number, beta: number): number {
  if (s.result || depth === 0) {
    const v = evaluate(s, s.turn)
    // Prefer quicker wins and slower losses.
    return Math.abs(v) >= WIN ? v + Math.sign(v) * depth : v
  }
  const moves = legalMoves(s)
  if (!moves.length) return evaluate(s, s.turn)
  let best = -Infinity
  for (const m of moves) {
    const v = -negamax(apply(s, m), depth - 1, -beta, -alpha)
    if (v > best) best = v
    if (v > alpha) alpha = v
    if (alpha >= beta) break
  }
  return best
}

export function chooseMove(s: GameState, { depth = 2, margin = 6, random = Math.random } = {}): Move | null {
  const moves = legalMoves(s)
  if (!moves.length) return null
  let best = -Infinity
  const scored: { m: Move; v: number }[] = []
  for (const m of moves) {
    const v = -negamax(apply(s, m), depth - 1, -Infinity, -(best - margin))
    scored.push({ m, v })
    if (v > best) best = v
  }
  const good = scored.filter(x => x.v >= best - margin)
  return good[Math.floor(random() * good.length)].m
}
