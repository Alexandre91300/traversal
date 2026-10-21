// Traversal rules engine. Vocabulary follows GLOSSARY.md at the repo root;
// where the rules page and the live game disagree we follow the live game
// (see docs/rules-discrepancies.md).

import { SIZE, type Heights } from './terrain'

export type Side = 'red' | 'blue'
export type PieceType = 'explorer' | 'vanguard' | 'sentinel'

export const PIECE_STATS: Record<PieceType, { movement: number; strength: number; letter: string; name: string; shape: string }> = {
  explorer: { movement: 5, strength: 1, letter: 'E', name: 'Explorer', shape: 'Pentagon cone' },
  vanguard: { movement: 4, strength: 2, letter: 'V', name: 'Vanguard', shape: 'Diamond wedge' },
  sentinel: { movement: 3, strength: 3, letter: 'S', name: 'Sentinel', shape: 'Triangular prism' },
}

// Not stated on the rules page ({{count}} placeholder); unverified.
export const MOVE_LIMIT = 100
export const FINISHES_TO_END = 2

export interface Piece {
  id: string
  side: Side
  type: PieceType
  x: number
  y: number
}

export interface Pos { x: number; y: number }

export type MoveKind = 'step' | 'diagonal' | 'leap' | 'finish'

export interface Move {
  pieceId: string
  kind: MoveKind
  to: Pos // for 'finish': the last-row Square the Piece leaves from
  path: Pos[] // squares walked, excluding the start
  cost: number
  capture?: Combat
}

export interface Combat {
  targetId: string
  attack: number
  defense: number
  base: number
  height: number // +1 downhill, -1 uphill
  allies: number
  vanguardCharge: number
  reinforcements: number
  defenderBase: number
  allowed: boolean
}

export interface MoveRecord {
  side: Side
  notation: string
}

export type GameResult =
  | { kind: 'win'; winner: Side; reason: 'score' | 'sentinel' | 'moveLimit' | 'resign' }
  | { kind: 'draw'; reason: 'score' | 'moveLimit' }

export interface GameState {
  heights: Heights
  pieces: Piece[]
  turn: Side
  score: Record<Side, number>
  finished: Piece[]
  captured: Piece[]
  moves: MoveRecord[]
  lastMove?: { from: Pos; to: Pos | null }
  result?: GameResult
}

export const FILES = 'abcdefghij'
export const squareName = (p: Pos) => `${FILES[p.x]}${p.y + 1}`
export const other = (s: Side): Side => (s === 'red' ? 'blue' : 'red')
// Red starts on rank 1 and Finishes off rank 10; Blue the reverse.
export const goalRank = (s: Side) => (s === 'red' ? SIZE - 1 : 0)
export const forward = (s: Side) => (s === 'red' ? 1 : -1)

const SETUP: PieceType[] = ['sentinel', 'vanguard', 'explorer', 'explorer', 'vanguard', 'sentinel']

export function newGame(heights: Heights): GameState {
  const pieces: Piece[] = []
  for (const side of ['red', 'blue'] as Side[]) {
    const y = side === 'red' ? 0 : SIZE - 1
    SETUP.forEach((type, i) => pieces.push({ id: `${side}-${type}-${i}`, side, type, x: 2 + i, y }))
  }
  return { heights, pieces, turn: 'red', score: { red: 0, blue: 0 }, finished: [], captured: [], moves: [] }
}

export const stepCost = (h: Heights, a: Pos, b: Pos) => {
  const d = Math.abs(h[a.x][a.y] - h[b.x][b.y])
  return d === 0 ? 1 : d + 1
}

const inBounds = (p: Pos) => p.x >= 0 && p.y >= 0 && p.x < SIZE && p.y < SIZE
const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]]

export const pieceAt = (s: GameState, p: Pos) => s.pieces.find(q => q.x === p.x && q.y === p.y)

interface Reach { cost: number; prev: Pos | null }

// Cheapest paths over empty Squares (Dijkstra; the board is tiny).
function reach(s: GameState, piece: Piece): Map<string, Reach> {
  const budget = PIECE_STATS[piece.type].movement
  const key = (p: Pos) => `${p.x},${p.y}`
  const best = new Map<string, Reach>([[key(piece), { cost: 0, prev: null }]])
  const frontier: Pos[] = [{ x: piece.x, y: piece.y }]
  while (frontier.length) {
    frontier.sort((a, b) => best.get(key(a))!.cost - best.get(key(b))!.cost)
    const cur = frontier.shift()!
    const curCost = best.get(key(cur))!.cost
    for (const [dx, dy] of ORTHO) {
      const nxt = { x: cur.x + dx, y: cur.y + dy }
      if (!inBounds(nxt)) continue
      const c = curCost + stepCost(s.heights, cur, nxt)
      if (c > budget) continue
      const prior = best.get(key(nxt))
      if (prior && prior.cost <= c) continue
      best.set(key(nxt), { cost: c, prev: cur })
      // Pieces block movement: you may end on an enemy (Attack) but never pass through.
      if (!pieceAt(s, nxt)) frontier.push(nxt)
    }
  }
  return best
}

function pathTo(best: Map<string, Reach>, to: Pos): Pos[] {
  const path: Pos[] = []
  let cur: Pos | null = to
  while (cur) {
    const r: Reach = best.get(`${cur.x},${cur.y}`)!
    if (r.prev) path.unshift(cur)
    cur = r.prev
  }
  return path
}

export function combat(s: GameState, attacker: Piece, target: Piece, pathCost: number | null): Combat {
  const base = PIECE_STATS[attacker.type].strength
  const ha = s.heights[attacker.x][attacker.y]
  const ht = s.heights[target.x][target.y]
  const height = ha > ht ? 1 : ha < ht ? -1 : 0
  const adjacent = (p: Piece, q: Piece) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y) === 1
  const allies = s.pieces
    .filter(p => p.side === attacker.side && p.id !== attacker.id && adjacent(p, target))
    .reduce((n, p) => n + PIECE_STATS[p.type].strength, 0)
  const vanguardCharge = attacker.type === 'vanguard' && pathCost === 4 ? 1 : 0
  const reinforcements = s.pieces.filter(p => p.side === target.side && p.id !== target.id && adjacent(p, target)).length
  const defenderBase = PIECE_STATS[target.type].strength
  const attack = base + height + allies + vanguardCharge
  const defense = defenderBase + reinforcements
  return { targetId: target.id, attack, defense, base, height, allies, vanguardCharge, reinforcements, defenderBase, allowed: attack >= defense }
}

// All Moves for a Piece, including disallowed Attacks (flagged via capture.allowed)
// so the UI can explain why they are impossible.
export function movesFor(s: GameState, piece: Piece): Move[] {
  const out: Move[] = []
  const best = reach(s, piece)
  const movement = PIECE_STATS[piece.type].movement
  for (const [k, r] of best) {
    if (!r.prev) continue
    const [x, y] = k.split(',').map(Number)
    const occ = pieceAt(s, { x, y })
    if (occ && occ.side === piece.side) continue
    out.push({
      pieceId: piece.id, kind: 'step', to: { x, y }, path: pathTo(best, { x, y }), cost: r.cost,
      capture: occ ? combat(s, piece, occ, r.cost) : undefined,
    })
  }
  // Finish: stand on the goal rank with at least 1 Movement left, then step off.
  const goal = goalRank(piece.side)
  for (const [k, r] of best) {
    const [x, y] = k.split(',').map(Number)
    if (y !== goal || r.cost > movement - 1) continue
    if (r.prev && pieceAt(s, { x, y })) continue
    out.push({ pieceId: piece.id, kind: 'finish', to: { x, y }, path: r.prev ? pathTo(best, { x, y }) : [], cost: r.cost + 1 })
  }
  if (piece.type === 'explorer') {
    const specials: [MoveKind, number[][], number][] = [['diagonal', DIAG, 1], ['leap', ORTHO, 2]]
    for (const [kind, dirs, dist] of specials)
      for (const [dx, dy] of dirs) {
        const to = { x: piece.x + dx * dist, y: piece.y + dy * dist }
        if (!inBounds(to)) continue
        const occ = pieceAt(s, to)
        if (occ && occ.side === piece.side) continue
        out.push({ pieceId: piece.id, kind, to, path: [to], cost: movement, capture: occ ? combat(s, piece, occ, null) : undefined })
      }
  }
  return out
}

export const isLegal = (m: Move) => !m.capture || m.capture.allowed

function notation(piece: Piece, m: Move) {
  const L = PIECE_STATS[piece.type].letter
  if (m.kind === 'finish') return `${L}${squareName(m.to)}↑`
  return `${L}${m.capture ? 'x' : ''}${squareName(m.to)}`
}

export function apply(s: GameState, m: Move): GameState {
  if (s.result || !isLegal(m)) return s
  const piece = s.pieces.find(p => p.id === m.pieceId)!
  const from = { x: piece.x, y: piece.y }
  let pieces = s.pieces
  let captured = s.captured
  if (m.capture) {
    const target = pieces.find(p => p.id === m.capture!.targetId)!
    pieces = pieces.filter(p => p.id !== target.id)
    captured = [...captured, target]
  }
  let finished = s.finished
  const score = { ...s.score }
  if (m.kind === 'finish') {
    pieces = pieces.filter(p => p.id !== piece.id)
    finished = [...finished, piece]
    score[piece.side] += PIECE_STATS[piece.type].strength
  } else {
    pieces = pieces.map(p => (p.id === piece.id ? { ...p, x: m.to.x, y: m.to.y } : p))
  }
  const next: GameState = {
    ...s, pieces, captured, finished, score,
    turn: other(s.turn),
    moves: [...s.moves, { side: piece.side, notation: notation(piece, m) }],
    lastMove: { from, to: m.kind === 'finish' ? null : m.to },
  }
  next.result = judge(next)
  return next
}

function judge(s: GameState): GameResult | undefined {
  if (s.finished.length >= 1 && s.finished[0].type === 'sentinel')
    return { kind: 'win', winner: s.finished[0].side, reason: 'sentinel' }
  if (s.finished.length >= FINISHES_TO_END) return byScore(s, 'score')
  if (s.moves.length >= MOVE_LIMIT) return byScore(s, 'moveLimit')
  if (!s.pieces.some(p => p.side === s.turn && movesFor(s, p).some(isLegal))) return byScore(s, 'moveLimit')
  return undefined
}

function byScore(s: GameState, reason: 'score' | 'moveLimit'): GameResult {
  if (s.score.red !== s.score.blue) return { kind: 'win', winner: s.score.red > s.score.blue ? 'red' : 'blue', reason }
  if (reason === 'score') return { kind: 'draw', reason }
  // Move limit tie-break: closest Piece to finishing, then the stronger one.
  const closest = (side: Side) => {
    const own = s.pieces.filter(p => p.side === side)
    if (!own.length) return { rows: Infinity, strength: 0 }
    const rows = Math.min(...own.map(p => Math.abs(goalRank(side) - p.y)))
    const strength = Math.max(...own.filter(p => Math.abs(goalRank(side) - p.y) === rows).map(p => PIECE_STATS[p.type].strength))
    return { rows, strength }
  }
  const r = closest('red'), b = closest('blue')
  if (r.rows !== b.rows) return { kind: 'win', winner: r.rows < b.rows ? 'red' : 'blue', reason }
  if (r.strength !== b.strength) return { kind: 'win', winner: r.strength > b.strength ? 'red' : 'blue', reason }
  return { kind: 'draw', reason }
}
