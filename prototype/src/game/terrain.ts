// Terrain generation. Every Terrain is point-symmetric (180° rotation) so
// neither Player gets an advantage, and orthogonal neighbours never differ
// by more than 2 Heights.

export const SIZE = 10
export const MAX_STEP = 2

export type Heights = number[][] // heights[x][y], x = file a..j, y = rank 1..10

export type TerrainModeId =
  | 'random' | 'mountains' | 'valleys' | 'highlands' | 'woodlands' | 'desert'
  | 'dunes' | 'jungle' | 'prairies' | 'canyons' | 'rivers' | 'ridges'
  | 'petrified' | 'everest' | 'mariana' | 'inferno'

export interface TerrainMode {
  id: TerrainModeId
  name: string
  blurb: string
}

export const TERRAIN_MODES: TerrainMode[] = [
  { id: 'random', name: 'Random', blurb: 'Balanced variety' },
  { id: 'mountains', name: 'Mountains', blurb: 'Dramatic central peaks' },
  { id: 'valleys', name: 'Valleys', blurb: 'Deep basins with ridges' },
  { id: 'highlands', name: 'Highlands', blurb: 'Peaks and basins combined' },
  { id: 'woodlands', name: 'Woodlands', blurb: 'Mostly flat, gentle hills' },
  { id: 'desert', name: 'Desert', blurb: 'Flat expanses, rare spikes' },
  { id: 'dunes', name: 'Dunes', blurb: 'Rolling diagonal waves' },
  { id: 'jungle', name: 'Jungle', blurb: 'Dense, bumpy ground' },
  { id: 'prairies', name: 'Prairies', blurb: 'Almost perfectly flat' },
  { id: 'canyons', name: 'Canyons', blurb: 'A deep gorge to cross' },
  { id: 'rivers', name: 'Rivers', blurb: 'Winding low channels' },
  { id: 'ridges', name: 'Ridges', blurb: 'Parallel lanes of high ground' },
  { id: 'petrified', name: 'Petrified Forest', blurb: 'Scattered stone pillars' },
  { id: 'everest', name: 'Mount Everest', blurb: 'One giant summit' },
  { id: 'mariana', name: 'Mariana Trench', blurb: 'One abyssal pit' },
  { id: 'inferno', name: 'Inferno', blurb: 'Pure chaos' },
]

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Smooth value noise on a coarse lattice, bilinearly interpolated.
function valueNoise(rand: () => number, cells: number) {
  const g: number[][] = []
  for (let i = 0; i <= cells + 1; i++) {
    g.push([])
    for (let j = 0; j <= cells + 1; j++) g[i].push(rand() * 2 - 1)
  }
  return (x: number, y: number) => {
    const fx = (x / (SIZE - 1)) * cells
    const fy = (y / (SIZE - 1)) * cells
    const i = Math.floor(fx), j = Math.floor(fy)
    const tx = fx - i, ty = fy - j
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty)
    const a = g[i][j] + (g[i + 1][j] - g[i][j]) * sx
    const b = g[i][j + 1] + (g[i + 1][j + 1] - g[i][j + 1]) * sx
    return a + (b - a) * sy
  }
}

const C = (SIZE - 1) / 2
const dist = (x: number, y: number) => Math.hypot(x - C, y - C)

function targetFn(mode: TerrainModeId, rand: () => number): (x: number, y: number) => number {
  const n1 = valueNoise(rand, 2)
  const n2 = valueNoise(rand, 4)
  const n3 = valueNoise(rand, 8)
  switch (mode) {
    case 'random': return (x, y) => n1(x, y) * 5 + n2(x, y) * 3
    case 'mountains': {
      const ox = rand() * 2 - 1, oy = rand() * 2 - 1
      return (x, y) => 11 * Math.exp(-(((x - C - ox) ** 2 + (y - C - oy) ** 2) / 9)) + n2(x, y) * 2
    }
    case 'valleys': return (x, y) => -Math.abs(n1(x, y)) * 10 + Math.abs(n2(x, y)) * 3
    case 'highlands': return (x, y) => n1(x, y) * 9 + n3(x, y) * 1.5
    case 'woodlands': return (x, y) => n1(x, y) * 2 + n2(x, y) * 1.2
    case 'desert': return (x, y) => (n3(x, y) > 0.82 ? 5 : 0) + n1(x, y) * 0.6
    case 'dunes': {
      const phase = rand() * Math.PI
      return (x, y) => Math.sin((x + y) * 0.9 + phase) * 2.5 + n2(x, y)
    }
    case 'jungle': return (x, y) => n3(x, y) * 3 + n2(x, y) * 2
    case 'prairies': return (x, y) => n1(x, y) * 0.9
    case 'canyons': return (x, y) => (Math.abs(y - C) < 1.2 ? -8 : 0) + n2(x, y) * 1.5
    case 'rivers': {
      const amp = 1.5 + rand() * 1.5
      return (x, y) => (Math.abs(y - C - Math.sin(x * 0.8) * amp) < 1 ? -4 : 0) + n2(x, y) * 1.5
    }
    case 'ridges': return (x, y) => ((Math.round(x) % 3 === 1) ? 5 : 0) + n2(x, y)
    case 'petrified': return (x, y) => (n3(x, y) > 0.55 ? 6 : 0) + n1(x, y) * 0.5
    case 'everest': return (x, y) => 2 * (5 - Math.max(Math.abs(x - C), Math.abs(y - C)))
    case 'mariana': return (x, y) => -2 * (5 - Math.max(Math.abs(x - C), Math.abs(y - C)))
    case 'inferno': return (x, y) => n3(x, y) * 12 + n1(x, y) * 6 + (dist(x, y) < 2 ? 4 : 0)
  }
}

// Clamp any target into a valid Terrain: average the lower and upper
// MAX_STEP-Lipschitz envelopes (Manhattan metric), which keeps every
// orthogonal step within MAX_STEP and preserves symmetry.
export function legalize(t: number[][]): Heights {
  const cells: [number, number][] = []
  for (let x = 0; x < SIZE; x++) for (let y = 0; y < SIZE; y++) cells.push([x, y])
  const out: Heights = Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
  for (const [x, y] of cells) {
    let lo = Infinity, hi = -Infinity
    for (const [i, j] of cells) {
      const d = MAX_STEP * (Math.abs(x - i) + Math.abs(y - j))
      lo = Math.min(lo, t[i][j] + d)
      hi = Math.max(hi, t[i][j] - d)
    }
    out[x][y] = Math.floor((lo + hi) / 2)
  }
  const min = Math.min(...out.flat())
  return out.map(col => col.map(h => h - min))
}

export function generateTerrain(mode: TerrainModeId, seed: number): Heights {
  const f = targetFn(mode, mulberry32(seed))
  const t: number[][] = []
  for (let x = 0; x < SIZE; x++) {
    t.push([])
    for (let y = 0; y < SIZE; y++) {
      const v = (f(x, y) + f(SIZE - 1 - x, SIZE - 1 - y)) / 2
      t[x].push(Math.round(v))
    }
  }
  return legalize(t)
}

export function isLegalTerrain(h: Heights): boolean {
  for (let x = 0; x < SIZE; x++)
    for (let y = 0; y < SIZE; y++) {
      if (x + 1 < SIZE && Math.abs(h[x][y] - h[x + 1][y]) > MAX_STEP) return false
      if (y + 1 < SIZE && Math.abs(h[x][y] - h[x][y + 1]) > MAX_STEP) return false
    }
  return true
}
