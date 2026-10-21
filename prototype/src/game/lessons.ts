// Tutorial Lessons: tiny scripted positions, each teaching one rule by
// having the player make the move. Red is always the learner; Blue never
// replies, so after each move the turn comes straight back.

import { apply, newGame, type GameState, type Move, type Piece, type Pos } from './rules'
import { SIZE, type Heights } from './terrain'

export type Verdict = 'done' | 'ok' | string // any other string: reject the move with this hint

export interface Lesson {
  title: string
  body: string
  goal: string
  heights: Heights
  pieces: Piece[]
  highlight: Pos[]
  check: (next: GameState, move: Move) => Verdict
  success: string
}

const flat = (): Heights => Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
const raise = (h: Heights, cells: [number, number, number][]) => {
  for (const [x, y, v] of cells) h[x][y] = v
  return h
}
const red = (type: Piece['type'], x: number, y: number): Piece => ({ id: `red-${type}-${x}${y}`, side: 'red', type, x, y })
const blue = (type: Piece['type'], x: number, y: number): Piece => ({ id: `blue-${type}-${x}${y}`, side: 'blue', type, x, y })
const at = (s: GameState, id: string, p: Pos) => s.pieces.some(q => q.id === id && q.x === p.x && q.y === p.y)
const gone = (s: GameState, id: string) => s.captured.some(q => q.id === id)

export const LESSONS: Lesson[] = [
  {
    title: 'Moving',
    body: 'Select your Explorer to see every square it can reach. The number on each marker is the Movement that move costs; a flat step costs 1, and the Explorer has 5.',
    goal: 'Move the Explorer to the glowing square.',
    heights: flat(),
    pieces: [red('explorer', 4, 1)],
    highlight: [{ x: 4, y: 5 }],
    check: (s, m) => (at(s, m.pieceId, { x: 4, y: 5 }) ? 'done' : 'Aim for the glowing square, four steps ahead.'),
    success: 'Four flat steps, 4 Movement. You can stop anywhere within your budget.',
  },
  {
    title: 'Height costs Movement',
    body: 'Climbing or descending costs the Height difference + 1. Your Sentinel is slow (3 Movement) but the strongest piece.',
    goal: 'Climb the Sentinel onto the hilltop (Height 2).',
    heights: raise(flat(), [[4, 2, 2], [3, 2, 1], [5, 2, 1], [4, 3, 1]]),
    pieces: [red('sentinel', 4, 1)],
    highlight: [{ x: 4, y: 2 }],
    check: (s, m) => (at(s, m.pieceId, { x: 4, y: 2 }) ? 'done' : 'Head for the glowing hilltop right in front of the Sentinel.'),
    success: 'Up 2 Heights cost 2 + 1 = 3: the Sentinel\'s whole turn. High ground pays off: attacking downhill adds +1.',
  },
  {
    title: 'Attacking',
    body: 'Move onto an enemy to Attack it. Before you commit, hover or tap the red ring: the panel breaks the fight down. You capture when your attack is at least their defense.',
    goal: 'Capture the blue Explorer with your Vanguard.',
    heights: flat(),
    pieces: [red('vanguard', 3, 3), blue('explorer', 3, 5)],
    highlight: [{ x: 3, y: 5 }],
    check: s => (gone(s, 'blue-explorer-35') ? 'done' : 'Move onto the blue Explorer to attack it.'),
    success: 'Strength 2 against Strength 1: captured. An Attack always ends your turn.',
  },
  {
    title: 'Allies and Reinforcements',
    body: 'Alone, your Vanguard can\'t beat the Sentinel (2 against 3). Each of your pieces next to the target adds its Strength to the attack. Defenders get +1 for each friend beside them, so isolated pieces are prey.',
    goal: 'Bring the Explorer next to the Sentinel, then capture it.',
    heights: flat(),
    pieces: [red('vanguard', 4, 3), red('explorer', 1, 5), blue('sentinel', 4, 5)],
    highlight: [{ x: 3, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 6 }],
    check: s => (gone(s, 'blue-sentinel-45') ? 'done' : 'ok'),
    success: 'Vanguard 2 + Explorer ally 1 = 3, enough to beat the Sentinel\'s 3. Teamwork wins fights.',
  },
  {
    title: 'Explorer specials',
    body: 'Explorers have two moves that ignore Height entirely: one step diagonally, or a leap of exactly two squares straight. Either one uses the whole turn. Walking over this ridge would cost 8.',
    goal: 'Leap over the ridge to the glowing square.',
    heights: raise(flat(), Array.from({ length: SIZE }, (_, x) => [x, 4, 3] as [number, number, number])),
    pieces: [red('explorer', 4, 3)],
    highlight: [{ x: 4, y: 5 }],
    check: (s, m) => (at(s, m.pieceId, { x: 4, y: 5 }) ? 'done' : 'Use the gold "Leap" marker two squares ahead.'),
    success: 'Leaps and diagonals turn walls into shortcuts. That\'s what Explorers are for.',
  },
  {
    title: 'Finishing',
    body: 'Reach your last row (row 10 for Red) with at least 1 Movement left, then step off the board to Finish. The piece leaves the game and you score its Strength.',
    goal: 'Finish your Vanguard with the green arrow past the edge.',
    heights: flat(),
    pieces: [red('vanguard', 5, 8)],
    highlight: [{ x: 5, y: 9 }],
    check: (_, m) => (m.kind === 'finish' ? 'done' : 'Select the Vanguard and use the green arrow beyond the far edge.'),
    success: 'Vanguard Finished: +2 points. Stronger pieces are worth more, but they are slower to get home.',
  },
  {
    title: 'Winning',
    body: 'The game ends once two pieces (either side) have Finished, and the higher score wins. One exception: if a Sentinel is the very first piece to Finish, its player wins on the spot.',
    goal: 'Race your Sentinel home before Blue\'s Explorer.',
    heights: flat(),
    pieces: [red('sentinel', 3, 8), red('explorer', 7, 4), blue('explorer', 2, 1), blue('vanguard', 6, 6)],
    highlight: [{ x: 3, y: 9 }],
    check: (_, m) => (m.kind === 'finish' && m.pieceId.startsWith('red-sentinel') ? 'done' : 'Finish the Sentinel this turn: it is one step from row 10.'),
    success: 'First across with a Sentinel: instant win. That\'s everything. Time for a real game.',
  },
]

export function lessonState(l: Lesson): GameState {
  return { ...newGame(l.heights), pieces: l.pieces }
}

// Blue never answers in a Lesson, and the game never ends early.
export function playLesson(s: GameState, m: Move): GameState {
  return { ...apply(s, m), turn: 'red', result: undefined }
}
