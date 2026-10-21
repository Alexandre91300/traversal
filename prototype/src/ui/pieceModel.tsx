import * as THREE from 'three'
import { useThree, type ThreeElements } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Piece } from '../game/rules'
import { marbleTexture, woodTexture } from './pieceTextures'

// The 3D Pieces: turned Staunton-style figures that share one base, stem and
// collar and are told apart by their heads, as chess pieces are:
//   Explorer  a tall slender spire: the scout that goes furthest
//   Vanguard  a flat spearhead: the charge
//   Sentinel  a crenellated rook: slow, strongest
// Strength (1/2/3) is the number of metal bands around the stem.
// Every model stands on y = 0; Blue's is turned round to face its own forward.
type PieceModelProps = { type: Piece['type']; side: Piece['side']; selected?: boolean; transparent?: boolean }
type Geoms = Record<Piece['type'], THREE.BufferGeometry>
type MatProps = ThreeElements['meshPhysicalMaterial']

const lathe = (pts: number[][], segs = 48) =>
  new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), segs)

// mergeGeometries requires every input to agree on indexed vs. non-indexed, so normalise first.
const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map(g => (g.index ? g.toNonIndexed() : g)))

// Low-segment lathes (4 sides) should look cut, not smoothed: non-indexed normals are per face.
const faceted = (g: THREE.BufferGeometry) => {
  const f = g.toNonIndexed()
  f.computeVertexNormals()
  return f
}

const ring = (radius: number, tube: number, y: number) => {
  const g = new THREE.TorusGeometry(radius, tube, 12, 48)
  g.rotateX(Math.PI / 2)
  g.translate(0, y, 0)
  return g
}

const HEAD_Y = 0.47
const stauntonBase = lathe([
  [0, 0], [0.27, 0], [0.285, 0.015], [0.28, 0.04], [0.25, 0.06], [0.22, 0.075],
  [0.2, 0.1], [0.16, 0.125], [0.13, 0.14],
])
const stauntonStem = lathe([
  [0.13, 0.14], [0.11, 0.2], [0.097, 0.3], [0.09, 0.4], [0.1, 0.42],
  [0.16, 0.44], [0.17, 0.455], [0.16, 0.47], [0.1, 0.48], [0, 0.48],
])
const stemRadiusAt = (y: number) => 0.13 - (y - 0.14) * 0.15
const strengthRings = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const y = 0.28 + (i - (n - 1) / 2) * 0.06
    return ring(stemRadiusAt(y) + 0.004, 0.017, y)
  })

const heads: Geoms = {
  explorer: (() => {
    const g = lathe([
      [0, 0], [0.085, 0], [0.105, 0.05], [0.1, 0.1], [0.075, 0.2], [0.048, 0.32], [0.022, 0.44], [0, 0.5],
    ])
    g.translate(0, HEAD_Y, 0)
    return g
  })(),
  // Flat four-sided blade on a short neck: reads as a blade from every side, never as a block.
  vanguard: (() => {
    const neck = lathe([[0, 0], [0.08, 0], [0.08, 0.018], [0.038, 0.032], [0.032, 0.09], [0, 0.09]])
    neck.translate(0, HEAD_Y, 0)
    const blade = faceted(lathe([[0, 0], [0.05, 0.01], [0.19, 0.13], [0, 0.4]], 4))
    blade.rotateY(Math.PI / 4)
    blade.scale(1, 1, 0.42)
    blade.translate(0, HEAD_Y + 0.08, 0)
    return merge([neck, blade])
  })(),
  // Flared drum with a hollow top and six merlons.
  sentinel: (() => {
    const drum = lathe([
      [0, 0], [0.13, 0], [0.15, 0.12], [0.195, 0.17], [0.195, 0.27], [0.14, 0.27], [0.14, 0.21], [0, 0.21],
    ])
    drum.translate(0, HEAD_Y, 0)
    const merlons = Array.from({ length: 6 }, (_, i) => {
      const a = (i * Math.PI) / 3
      const m = new THREE.BoxGeometry(0.075, 0.07, 0.05)
      m.rotateY(a)
      m.translate(Math.sin(a) * 0.168, HEAD_Y + 0.27 + 0.035, Math.cos(a) * 0.168)
      return m
    })
    return merge([drum, ...merlons])
  })(),
}

const bodyGeoms: Geoms = {
  explorer: merge([stauntonStem, heads.explorer]),
  vanguard: merge([stauntonStem, heads.vanguard]),
  sentinel: merge([stauntonStem, heads.sentinel]),
}
const trimGeoms: Geoms = {
  explorer: merge([ring(0.168, 0.02, 0.455), ...strengthRings(1)]),
  vanguard: merge([ring(0.168, 0.02, 0.455), ...strengthRings(2)]),
  sentinel: merge([ring(0.168, 0.02, 0.455), ...strengthRings(3)]),
}

// Polished stone and metal need something to reflect. The board has no
// environment (it would wash out the terrain), so the Pieces get their own
// neutral studio reflection, built once per renderer.
const envMaps = new WeakMap<THREE.WebGLRenderer, THREE.Texture>()
function usePieceEnv() {
  const gl = useThree(s => s.gl)
  let env = envMaps.get(gl)
  if (!env) {
    const pmrem = new THREE.PMREMGenerator(gl)
    env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()
    envMaps.set(gl, env)
  }
  return env
}

export interface Finish {
  base: MatProps
  body: Record<Piece['side'], MatProps>
  trim: MatProps
  // Glow colour when the Piece is selected, since a textured body has a white `color`.
  glow: Record<Piece['side'], string>
  // Faint permanent inner light, for finishes that would go dull against a dark board.
  idleGlow?: number
}

// Board squares are 1 unit wide; the figures are modelled a little small.
const SCALE = 1.15

export const stauntonFinish = (finish: Finish) =>
  function StauntonPieceModel({ type, side, selected = false, transparent = false }: PieceModelProps) {
    const envMap = usePieceEnv()
    // Stone and wood only catch a soft sheen; the metal trim gets the full reflection.
    const shared = { envMap, envMapIntensity: 0.3, transparent, opacity: transparent ? 0.5 : 1 }
    return (
      <group rotation-y={side === 'blue' ? Math.PI : 0} scale={SCALE}>
        <mesh geometry={stauntonBase} castShadow>
          <meshPhysicalMaterial {...finish.base} {...shared} />
        </mesh>
        <mesh geometry={bodyGeoms[type]} castShadow>
          <meshPhysicalMaterial {...finish.body[side]} {...shared}
            emissive={selected || finish.idleGlow ? finish.glow[side] : '#000'}
            emissiveIntensity={selected ? 0.45 : finish.idleGlow ?? 0} />
        </mesh>
        <mesh geometry={trimGeoms[type]} castShadow>
          <meshPhysicalMaterial {...finish.trim} {...shared} envMapIntensity={1} />
        </mesh>
      </group>
    )
  }

// Pierre & bronze: red jasper / lapis lazuli (with pyrite flecks) polished
// stone, antique bronze trim, a turned walnut base.
const PIECE_HEX = { red: '#b8262c', blue: '#2a52b8' }
export const PieceModel = stauntonFinish({
  base: { map: woodTexture('#1e120a', '#5a3820', 21), roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 },
  body: {
    red: { map: marbleTexture('#5a0e12', PIECE_HEX.red, '#f0d2b0', 31), roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.08 },
    blue: { map: marbleTexture('#0c1c52', PIECE_HEX.blue, '#9fb6e8', 32, 0.004), roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.08 },
  },
  trim: { color: '#a8743e', roughness: 0.42, metalness: 0.9 },
  glow: PIECE_HEX,
})
