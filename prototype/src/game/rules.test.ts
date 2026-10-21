import { describe, expect, it } from 'vitest'
import { apply, combat, movesFor, newGame, type GameState, type Piece } from './rules'
import { generateTerrain, isLegalTerrain, SIZE, TERRAIN_MODES } from './terrain'

const flat = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
const piece = (side: Piece['side'], type: Piece['type'], x: number, y: number): Piece => ({ id: `${side}-${type}-${x}${y}`, side, type, x, y })
const state = (pieces: Piece[], heights = flat()): GameState => ({ ...newGame(heights), pieces })

describe('terrain', () => {
  it.each(TERRAIN_MODES.map(m => m.id))('%s is legal and point-symmetric', mode => {
    for (const seed of [1, 2, 3]) {
      const h = generateTerrain(mode, seed)
      expect(isLegalTerrain(h)).toBe(true)
      for (let x = 0; x < SIZE; x++) for (let y = 0; y < SIZE; y++) expect(h[x][y]).toBe(h[SIZE - 1 - x][SIZE - 1 - y])
    }
  })
})

describe('movement', () => {
  it('costs height difference + 1 up or down', () => {
    const h = flat()
    h[4][1] = 2
    const s = state([piece('red', 'sentinel', 4, 0)], h)
    const m = movesFor(s, s.pieces[0]).find(m => m.kind === 'step' && m.to.x === 4 && m.to.y === 1)!
    expect(m.cost).toBe(3)
  })

  it('cannot pass through pieces', () => {
    const s = state([piece('red', 'sentinel', 0, 0), piece('red', 'sentinel', 0, 1), piece('red', 'sentinel', 1, 0)])
    expect(movesFor(s, s.pieces[0]).filter(m => m.kind === 'step')).toHaveLength(0)
  })
})

describe('combat', () => {
  it('matches the rules page hill example: 2 + 1 height vs 2 + 1 reinforcement', () => {
    const h = flat()
    h[4][4] = 1
    const att = piece('red', 'vanguard', 4, 4)
    const def = piece('blue', 'vanguard', 4, 5)
    const s = state([att, def, piece('blue', 'sentinel', 5, 5)], h)
    const c = combat(s, att, def, 1)
    expect([c.attack, c.defense, c.allowed]).toEqual([3, 3, true])
  })

  it('matches the allied assault example: explorer + ally vanguard vs sentinel', () => {
    const att = piece('red', 'explorer', 4, 4)
    const def = piece('blue', 'sentinel', 4, 5)
    const s = state([att, def, piece('red', 'vanguard', 5, 5)])
    expect(combat(s, att, def, 1)).toMatchObject({ attack: 3, defense: 3, allowed: true })
  })

  it('gives the vanguard +1 only when the shortest path costs exactly 4', () => {
    const att = piece('red', 'vanguard', 0, 0)
    const def = piece('blue', 'explorer', 0, 4)
    const s = state([att, def])
    const m = movesFor(s, att).find(m => m.capture)!
    expect(m.capture!.vanguardCharge).toBe(1)
  })
})

describe('finishing', () => {
  it('needs 1 Movement left on the goal rank and scores Strength', () => {
    const s0 = state([piece('red', 'vanguard', 3, 9), piece('blue', 'explorer', 9, 9)])
    const fin = movesFor(s0, s0.pieces[0]).find(m => m.kind === 'finish' && m.to.x === 3)!
    const s1 = apply(s0, fin)
    expect(s1.score.red).toBe(2)
    expect(s1.pieces).toHaveLength(1)
  })

  it('a sentinel finishing first wins instantly', () => {
    const s0 = state([piece('red', 'sentinel', 3, 9), piece('blue', 'explorer', 9, 9)])
    const s1 = apply(s0, movesFor(s0, s0.pieces[0]).find(m => m.kind === 'finish')!)
    expect(s1.result).toEqual({ kind: 'win', winner: 'red', reason: 'sentinel' })
  })
})
