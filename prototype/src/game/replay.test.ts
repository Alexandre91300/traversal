import { describe, expect, it } from 'vitest'
import { chooseMove } from './ai'
import { decodeMove, encodeMove, replay } from './replay'
import { apply, newGame, type GameState } from './rules'
import { generateTerrain } from './terrain'

describe('move refs', () => {
  const start = newGame(generateTerrain('highlands', 5))

  it('replays a whole game to the same position', () => {
    let s: GameState = start
    let seed = 7
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const refs: string[] = []
    for (let i = 0; i < 30 && !s.result; i++) {
      const m = chooseMove(s, { depth: 1, random })!
      refs.push(encodeMove(start, m))
      s = apply(s, m)
    }
    expect(refs.every(r => r.length === 4)).toBe(true)
    const states = replay(start, refs)
    expect(states).toHaveLength(refs.length + 1)
    expect(states[states.length - 1].pieces).toEqual(s.pieces)
    expect(states[states.length - 1].moves).toEqual(s.moves)
  })

  it('stops at the first illegal or malformed ref', () => {
    const first = encodeMove(start, chooseMove(start, { depth: 1, random: () => 0 })!)
    // Red moving twice in a row, a Blue piece on Red's turn, junk.
    expect(replay(start, [first, first])).toHaveLength(2)
    expect(decodeMove(start, start, '6s28')).toBeNull()
    expect(decodeMove(start, start, '<b>')).toBeNull()
    expect(decodeMove(start, start, '0s99')).toBeNull()
  })
})
