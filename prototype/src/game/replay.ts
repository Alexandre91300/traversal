// A game as data: the starting position plus a list of compact Move refs.
// Refs are what travels between players online, so decoding re-checks every
// Move against the rules: anything illegal or malformed ends the replay.

import { apply, isLegal, movesFor, type GameState, type Move, type MoveKind } from './rules'

// Four characters: piece index in the starting position (hex), kind, file, rank.
export type MoveRef = string

const KIND_CODE: Record<MoveKind, string> = { step: 's', diagonal: 'd', leap: 'l', finish: 'f' }
const CODE_KIND = Object.fromEntries(Object.entries(KIND_CODE).map(([k, c]) => [c, k])) as Record<string, MoveKind>
const REF = /^[0-9a-f][sdlf]\d\d$/

export function encodeMove(start: GameState, m: Move): MoveRef {
  const i = start.pieces.findIndex(p => p.id === m.pieceId)
  return i.toString(16) + KIND_CODE[m.kind] + m.to.x + m.to.y
}

export function decodeMove(start: GameState, s: GameState, ref: MoveRef): Move | null {
  if (typeof ref !== 'string' || !REF.test(ref)) return null
  const id = start.pieces[parseInt(ref[0], 16)]?.id
  const piece = s.pieces.find(p => p.id === id)
  if (!piece || piece.side !== s.turn) return null
  const kind = CODE_KIND[ref[1]], x = +ref[2], y = +ref[3]
  return movesFor(s, piece).find(m => m.kind === kind && m.to.x === x && m.to.y === y && isLegal(m)) ?? null
}

// Every position from the start through the last valid ref.
export function replay(start: GameState, refs: readonly MoveRef[]): GameState[] {
  const out = [start]
  for (const ref of refs) {
    const s = out[out.length - 1]
    const m = s.result ? null : decodeMove(start, s, ref)
    if (!m) break
    out.push(apply(s, m))
  }
  return out
}
