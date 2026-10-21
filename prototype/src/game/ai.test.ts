import { describe, expect, it } from 'vitest'
import { chooseMove } from './ai'
import { apply, isLegal, newGame, type GameState, type Piece } from './rules'
import { generateTerrain, SIZE } from './terrain'

const flat = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
const piece = (side: Piece['side'], type: Piece['type'], x: number, y: number): Piece => ({ id: `${side}-${type}-${x}${y}`, side, type, x, y })
const state = (pieces: Piece[], turn: Piece['side'] = 'blue'): GameState => ({ ...newGame(flat()), pieces, turn })

describe('computer opponent', () => {
  it('takes an instant Sentinel win', () => {
    const s = state([piece('blue', 'sentinel', 4, 1), piece('blue', 'explorer', 0, 8), piece('red', 'explorer', 9, 9)])
    const m = chooseMove(s)!
    expect(m.kind).toBe('finish')
    expect(apply(s, m).result).toMatchObject({ kind: 'win', winner: 'blue', reason: 'sentinel' })
  })

  it('captures a free piece', () => {
    const s = state([piece('blue', 'vanguard', 4, 5), piece('red', 'explorer', 4, 4), piece('red', 'sentinel', 0, 0)])
    expect(chooseMove(s)!.capture?.targetId).toBe('red-explorer-44')
  })

  it('moves a threatened piece out of reach', () => {
    // Red Sentinel on d4 can take the lone Blue Explorer on d6 next turn.
    const s = state([piece('blue', 'explorer', 3, 5), piece('red', 'sentinel', 3, 3), piece('red', 'explorer', 9, 0)])
    const after = apply(s, chooseMove(s, { random: () => 0 })!)
    const reply = chooseMove(after, { random: () => 0 })!
    expect(reply.capture).toBeUndefined()
  })

  it('only ever plays legal moves over a full game', () => {
    let s = newGame(generateTerrain('highlands', 3))
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 40 && !s.result; i++) {
      const m = chooseMove(s, { random })!
      expect(isLegal(m)).toBe(true)
      expect(m.pieceId.startsWith(s.turn)).toBe(true)
      s = apply(s, m)
    }
    expect(s.moves.length).toBeGreaterThan(0)
  }, 30_000)
})
