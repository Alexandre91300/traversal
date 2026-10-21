// Runs the search off the main thread so the board keeps animating while
// the computer thinks.
import { chooseMove, LEVELS, type Level } from './ai'
import type { GameState } from './rules'

self.onmessage = (e: MessageEvent<{ id: number; state: GameState; level: Level }>) => {
  const { depth, margin } = LEVELS[e.data.level]
  self.postMessage({ id: e.data.id, move: chooseMove(e.data.state, { depth, margin }) })
}
