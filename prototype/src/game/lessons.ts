// Tutorial Lessons: tiny scripted positions, each teaching one rule by
// having the player make the move. Red is always the learner; Blue never
// replies, so after each move the turn comes straight back.

import { apply, newGame, type GameState, type Move, type Piece, type Pos } from './rules'
import { SIZE, type Heights } from './terrain'

// Lesson text is bilingual data; the UI picks the viewer's language.
export type Text = { en: string; fr: string }
export type Verdict = 'done' | 'ok' | Text // a Text: reject the move with this hint

export interface Lesson {
  title: Text
  body: Text
  goal: Text
  heights: Heights
  pieces: Piece[]
  highlight: Pos[]
  check: (next: GameState, move: Move) => Verdict
  success: Text
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
    title: { en: 'Moving', fr: 'Se déplacer' },
    body: {
      en: 'Select your Explorer to see every square it can reach. The number on each marker is the Movement that move costs; a flat step costs 1, and the Explorer has 5.',
      fr: "Sélectionnez votre Éclaireur pour voir toutes les cases qu'il peut atteindre. Le nombre sur chaque marqueur est le Mouvement que coûte ce déplacement ; un pas à plat coûte 1, et l'Éclaireur en a 5.",
    },
    goal: { en: 'Move the Explorer to the glowing square.', fr: "Amenez l'Éclaireur sur la case qui brille." },
    heights: flat(),
    pieces: [red('explorer', 4, 1)],
    highlight: [{ x: 4, y: 5 }],
    check: (s, m) => (at(s, m.pieceId, { x: 4, y: 5 }) ? 'done'
      : { en: 'Aim for the glowing square, four steps ahead.', fr: 'Visez la case qui brille, quatre pas devant.' }),
    success: {
      en: 'Four flat steps, 4 Movement. You can stop anywhere within your budget.',
      fr: "Quatre pas à plat, 4 de Mouvement. Vous pouvez vous arrêter n'importe où dans votre budget.",
    },
  },
  {
    title: { en: 'Height costs Movement', fr: 'La Hauteur coûte du Mouvement' },
    body: {
      en: 'Climbing or descending costs the Height difference + 1. Your Sentinel is slow (3 Movement) but the toughest piece: Attack 3, Armor 3.',
      fr: 'Monter ou descendre coûte la différence de Hauteur + 1. Votre Sentinelle est lente (3 de Mouvement) mais c’est la pièce la plus solide : Attaque 3, Armure 3.',
    },
    goal: { en: 'Climb the Sentinel onto the hilltop (Height 2).', fr: 'Faites monter la Sentinelle au sommet de la colline (Hauteur 2).' },
    heights: raise(flat(), [[4, 2, 2], [3, 2, 1], [5, 2, 1], [4, 3, 1]]),
    pieces: [red('sentinel', 4, 1)],
    highlight: [{ x: 4, y: 2 }],
    check: (s, m) => (at(s, m.pieceId, { x: 4, y: 2 }) ? 'done'
      : { en: 'Head for the glowing hilltop right in front of the Sentinel.', fr: 'Visez le sommet qui brille, juste devant la Sentinelle.' }),
    success: {
      en: "Up 2 Heights cost 2 + 1 = 3: the Sentinel's whole turn. High ground pays off: attacking downhill adds +1.",
      fr: 'Monter de 2 a coûté 2 + 1 = 3 : tout le tour de la Sentinelle. La hauteur paie : attaquer en descente donne +1.',
    },
  },
  {
    title: { en: 'Attacking', fr: 'Attaquer' },
    body: {
      en: "Move onto an enemy to Attack it. Before you commit, hover or tap the red ring: the panel breaks the fight down. You capture when your attack is at least their defense (their Armor, plus any reinforcements).",
      fr: "Allez sur un ennemi pour l'attaquer. Avant de valider, survolez ou touchez l'anneau rouge : le panneau détaille le combat. Vous capturez quand votre attaque est au moins égale à sa défense (son Armure, plus ses renforts).",
    },
    goal: { en: 'Capture the blue Explorer with your Vanguard.', fr: "Capturez l'Éclaireur bleu avec votre Avant-garde." },
    heights: flat(),
    pieces: [red('vanguard', 3, 3), blue('explorer', 3, 5)],
    highlight: [{ x: 3, y: 5 }],
    check: s => (gone(s, 'blue-explorer-35') ? 'done'
      : { en: 'Move onto the blue Explorer to attack it.', fr: "Allez sur l'Éclaireur bleu pour l'attaquer." }),
    success: {
      en: 'Attack 2 against Armor 1: captured. An Attack always ends your turn.',
      fr: 'Attaque 2 contre Armure 1 : capturé. Une attaque termine toujours votre tour.',
    },
  },
  {
    title: { en: 'Allies and Reinforcements', fr: 'Alliés et renforts' },
    body: {
      en: "Alone, your Vanguard can't beat the Sentinel (Attack 2 against Armor 3). Each of your pieces next to the target adds its Attack. Defenders get +1 for each friend beside them, so isolated pieces are prey.",
      fr: "Seule, votre Avant-garde ne peut pas battre la Sentinelle (Attaque 2 contre Armure 3). Chacune de vos pièces à côté de la cible ajoute son Attaque. Les défenseurs gagnent +1 par allié à côté d'eux : les pièces isolées sont des proies.",
    },
    goal: { en: 'Bring the Explorer next to the Sentinel, then capture it.', fr: "Amenez l'Éclaireur à côté de la Sentinelle, puis capturez-la." },
    heights: flat(),
    pieces: [red('vanguard', 4, 3), red('explorer', 1, 5), blue('sentinel', 4, 5)],
    highlight: [{ x: 3, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 6 }],
    check: s => (gone(s, 'blue-sentinel-45') ? 'done' : 'ok'),
    success: {
      en: "Vanguard 2 + Explorer ally 1 = 3, enough to beat the Sentinel's Armor 3. Teamwork wins fights.",
      fr: "Avant-garde 2 + Éclaireur allié 1 = 3, assez pour battre l'Armure 3 de la Sentinelle. L'union fait la force.",
    },
  },
  {
    title: { en: 'Explorer specials', fr: "Les coups de l'Éclaireur" },
    body: {
      en: 'Explorers have two moves that ignore Height entirely: one step diagonally, or a leap of exactly two squares straight, never over another piece. Either one uses the whole turn. Walking over this ridge would cost 8.',
      fr: "L'Éclaireur a deux coups qui ignorent complètement la Hauteur : un pas en diagonale, ou un saut d'exactement deux cases en ligne droite, jamais par-dessus une autre pièce. Chacun utilise tout le tour. Franchir cette crête à pied coûterait 8.",
    },
    goal: { en: 'Leap over the ridge to the glowing square.', fr: 'Sautez par-dessus la crête jusqu’à la case qui brille.' },
    heights: raise(flat(), Array.from({ length: SIZE }, (_, x) => [x, 4, 3] as [number, number, number])),
    pieces: [red('explorer', 4, 3)],
    highlight: [{ x: 4, y: 5 }],
    check: (s, m) => (at(s, m.pieceId, { x: 4, y: 5 }) ? 'done'
      : { en: 'Use the gold "Leap" marker two squares ahead.', fr: 'Utilisez le marqueur doré « Saut », deux cases devant.' }),
    success: {
      en: "Leaps and diagonals turn walls into shortcuts. That's what Explorers are for.",
      fr: "Sauts et diagonales transforment les murs en raccourcis. C'est tout l'intérêt de l'Éclaireur.",
    },
  },
  {
    title: { en: 'Finishing', fr: "L'Arrivée" },
    body: {
      en: 'Reach your last row (row 10 for Red) with at least 1 Movement left, then step off the board to Finish. The piece leaves the game and scores 1, 2 or 3 points: Explorer, Vanguard, Sentinel.',
      fr: "Atteignez votre dernière rangée (la 10 pour les Rouges) avec au moins 1 de Mouvement restant, puis sortez du plateau : c'est l'Arrivée. La pièce quitte la partie et marque 1, 2 ou 3 points : Éclaireur, Avant-garde, Sentinelle.",
    },
    goal: { en: 'Finish your Vanguard with the green arrow past the edge.', fr: 'Faites arriver votre Avant-garde avec la flèche verte au-delà du bord.' },
    heights: flat(),
    pieces: [red('vanguard', 5, 8)],
    highlight: [{ x: 5, y: 9 }],
    check: (_, m) => (m.kind === 'finish' ? 'done'
      : { en: 'Select the Vanguard and use the green arrow beyond the far edge.', fr: "Sélectionnez l'Avant-garde et utilisez la flèche verte au-delà du bord du fond." }),
    success: {
      en: 'Vanguard Finished: +2 points. Stronger pieces are worth more, but they are slower to get home.',
      fr: 'Avant-garde arrivée : +2 points. Les pièces fortes rapportent plus, mais elles sont plus lentes à rentrer.',
    },
  },
  {
    title: { en: 'Winning', fr: 'Gagner' },
    body: {
      en: 'The game ends once two pieces (either side) have Finished, and the higher score wins. One exception: if a Sentinel is the very first piece to Finish, its player wins on the spot.',
      fr: "La partie s'arrête dès que deux pièces (tous camps confondus) ont atteint l'Arrivée, et le meilleur score gagne. Une exception : si une Sentinelle est la toute première pièce arrivée, son joueur gagne sur-le-champ.",
    },
    goal: { en: "Race your Sentinel home before Blue's Explorer.", fr: "Ramenez votre Sentinelle avant l'Éclaireur bleu." },
    heights: flat(),
    pieces: [red('sentinel', 3, 8), red('explorer', 7, 4), blue('explorer', 2, 1), blue('vanguard', 6, 6)],
    highlight: [{ x: 3, y: 9 }],
    check: (_, m) => (m.kind === 'finish' && m.pieceId.startsWith('red-sentinel') ? 'done'
      : { en: 'Finish the Sentinel this turn: it is one step from row 10.', fr: 'Faites arriver la Sentinelle ce tour-ci : elle est à un pas de la rangée 10.' }),
    success: {
      en: "First across with a Sentinel: instant win. That's everything. Time for a real game.",
      fr: "Première arrivée avec une Sentinelle : victoire immédiate. Vous savez tout. À vous de jouer pour de vrai.",
    },
  },
]

export function lessonState(l: Lesson): GameState {
  return { ...newGame(l.heights), pieces: l.pieces }
}

// Blue never answers in a Lesson, and the game never ends early.
export function playLesson(s: GameState, m: Move): GameState {
  return { ...apply(s, m), turn: 'red', result: undefined }
}
