import { describe, expect, it } from 'vitest'
import { LESSONS, lessonState, playLesson } from './lessons'
import { isLegal, movesFor, type GameState } from './rules'

const redMoves = (s: GameState) => s.pieces.filter(p => p.side === 'red').flatMap(p => movesFor(s, p)).filter(isLegal)

// Depth-first over the moves a Lesson accepts, as the Tutorial plays them.
function solvable(i: number, s: GameState, depth: number): boolean {
  if (depth === 0) return false
  return redMoves(s).some(m => {
    const next = playLesson(s, m)
    const v = LESSONS[i].check(next, m)
    return v === 'done' || (v === 'ok' && solvable(i, next, depth - 1))
  })
}

describe('tutorial lessons', () => {
  it.each(LESSONS.map((l, i) => [l.title.en, i] as const))('%s can be completed', (_, i) => {
    expect(solvable(i, lessonState(LESSONS[i]), 2)).toBe(true)
  })

  it('hands the turn back to Red and never ends the game', () => {
    const l = LESSONS.find(l => l.title.en === 'Winning')!
    const s = lessonState(l)
    const finish = redMoves(s).find(m => m.kind === 'finish' && m.pieceId.startsWith('red-sentinel'))!
    const next = playLesson(s, finish)
    expect(next.turn).toBe('red')
    expect(next.result).toBeUndefined()
    expect(l.check(next, finish)).toBe('done')
  })

  it('needs the ally: the Vanguard alone cannot take the Sentinel', () => {
    const s = lessonState(LESSONS[3])
    const attack = movesFor(s, s.pieces[0]).find(m => m.capture)!
    expect(attack.capture!.allowed).toBe(false)
  })

  it('the ridge can only be crossed by leaping', () => {
    const s = lessonState(LESSONS[4])
    const toGoal = movesFor(s, s.pieces[0]).filter(m => m.to.x === 4 && m.to.y === 5)
    expect(toGoal.map(m => m.kind)).toEqual(['leap'])
  })
})
