import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { CameraControls, Html, Line } from '@react-three/drei'
import CameraControlsImpl from 'camera-controls'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PIECE_STATS, FILES, forward, type GameState, type Move, type Piece, type Pos } from '../game/rules'
import { SIZE, type Heights } from '../game/terrain'
import { useT } from '../i18n'
import { sideTexture, topColor, topTexture } from './textures'

export const HEIGHT_UNIT = 0.32
const BASE_Y = -0.7
const PIECE_COLORS = { red: '#d9432f', blue: '#3a7cdc' }

export type View = 'red' | 'blue' | 'top'

const world = (x: number, y: number): [number, number] => [x - (SIZE - 1) / 2, (SIZE - 1) / 2 - y]
const topY = (h: Heights, p: Pos) => h[p.x][p.y] * HEIGHT_UNIT

interface BoardProps {
  state: GameState
  selected?: Piece | null
  moves?: Move[]
  hovered?: Move | null
  view: View
  viewNonce?: number
  showHeights?: boolean
  showCoords?: boolean
  showcase?: boolean
  highlight?: Pos[] // pulsing Squares, e.g. a tutorial goal
  ghost?: boolean // the selected Piece can't move now: its targets are shown for information only
  onPieceClick?: (p: Piece) => void
  onMove?: (m: Move) => void
  onHover?: (m: Move | null) => void
  onEmptyClick?: () => void
}

// Fills its nearest positioned ancestor, so flex parents need no definite height.
export function Board3D(props: BoardProps) {
  return (
    // Right-drag turns the board, so no browser menu on the canvas.
    <div className="absolute inset-0" onContextMenu={e => e.preventDefault()}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 38, position: [0, 11, 12.5] }}
        onPointerMissed={() => props.onEmptyClick?.()}
        style={{ touchAction: 'none' }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  )
}

function Scene({ state, selected, moves = [], hovered, view, viewNonce = 0, showHeights, showCoords, showcase, highlight = [], ghost = false, onPieceClick, onMove, onHover }: BoardProps) {
  const controls = useRef<CameraControls>(null)
  const { heights } = state
  const maxH = Math.max(1, ...heights.flat())
  const center = (maxH * HEIGHT_UNIT) / 2
  const aspect = useThree(s => s.size.width / s.size.height)
  const [exits, exitDone] = useExits(state)

  useEffect(() => {
    const c = controls.current
    if (!c) return
    // Narrower viewports: pull back so all 10 files fit; portrait also looks more steeply down.
    const portrait = aspect < 1
    const d = (13.5 + maxH * 0.25) * Math.min(1.9, Math.max(1, (portrait ? 1.15 : 1.4) / aspect))
    if (view === 'top') c.setLookAt(0, d + 6, 0.01, 0, center, 0, true)
    else {
      const z = view === 'red' ? 1 : -1
      const [up, back] = portrait ? [0.88, 0.48] : [0.72, 0.78]
      c.setLookAt(0, center + d * up, z * d * back, 0, center, z * 0.6, true)
    }
  }, [view, viewNonce, maxH, center, aspect])

  // Left click only ever plays; turning the board is a right-drag (touch: one finger).
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const { ACTION } = CameraControlsImpl
    c.mouseButtons.left = ACTION.NONE
    c.mouseButtons.right = ACTION.ROTATE
    c.mouseButtons.middle = ACTION.DOLLY
    c.mouseButtons.wheel = ACTION.DOLLY
  }, [])

  useFrame((_, dt) => {
    if (showcase && controls.current) controls.current.azimuthAngle += dt * 0.12
  })

  // One target per square; plain steps win over Explorer specials to the same square.
  const targets = useMemo(() => {
    const bySquare = new Map<string, Move>()
    for (const m of moves) {
      const k = `${m.kind === 'finish' ? 'F' : ''}${m.to.x},${m.to.y}`
      const prev = bySquare.get(k)
      if (!prev || (prev.kind !== 'step' && m.kind === 'step')) bySquare.set(k, m)
    }
    return [...bySquare.values()]
  }, [moves])

  const moveTo = (p: Pos) => targets.find(m => m.kind !== 'finish' && m.to.x === p.x && m.to.y === p.y)

  return (
    <>
      <color attach="background" args={['#262420']} />
      <fog attach="fog" args={['#262420', 30, 60]} />
      <hemisphereLight args={['#fff4dc', '#3d4a2c', 0.85]} />
      {/* Cool fill from the far side so shaded faces keep some shape. */}
      <directionalLight position={[-8, 6, -6]} intensity={0.35} color="#cfe0ff" />
      <directionalLight
        position={[6, 14, 8]}
        intensity={1.8}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <CameraControls
        ref={controls}
        makeDefault
        minPolarAngle={0}
        maxPolarAngle={1.05}
        minDistance={7}
        maxDistance={30}
        truckSpeed={0}
        smoothTime={0.35}
      />

      <Terrain heights={heights} showHeights={!!showHeights} onSquare={p => {
        const m = moveTo(p)
        if (m) onMove?.(m)
      }} onHoverSquare={p => onHover?.(p ? moveTo(p) ?? null : null)} />

      {state.lastMove && <SquareTint heights={heights} p={state.lastMove.from} color="#f5d547" opacity={0.42} />}
      {state.lastMove?.to && <SquareTint heights={heights} p={state.lastMove.to} color="#f5d547" opacity={0.55} />}
      {selected && <SquareTint heights={heights} p={selected} color="#9be15d" opacity={0.6} />}
      {highlight.map(p => <Pulse key={`${p.x},${p.y}`} heights={heights} p={p} />)}

      {hovered && selected && <PathLine heights={heights} from={selected} move={hovered} />}

      {targets.map(m => (
        <Target key={`${m.kind}-${m.to.x}-${m.to.y}`} heights={heights} move={m} piece={selected!}
          active={hovered === m} ghost={ghost} onMove={onMove} onHover={onHover} />
      ))}

      {state.pieces.map(p => (
        <PieceMesh key={p.id} piece={p} heights={heights} selected={selected?.id === p.id}
          onClick={e => {
            e.stopPropagation()
            const m = moveTo(p)
            if (m) onMove?.(m)
            else onPieceClick?.(p)
          }}
          onOver={() => onHover?.(moveTo(p) ?? null)} />
      ))}

      {exits.map(e => <ExitFx key={e.key} exit={e} heights={heights} onDone={() => exitDone(e.key)} />)}

      {showCoords && <Coords heights={heights} view={view} />}
      <GoalEdges />
    </>
  )
}

// Each column is earth with a grass (or rock) cap a little wider than it,
// so Squares read as turf blocks rather than flat-coloured boxes.
const CAP = 0.07

function Terrain({ heights, showHeights, onSquare, onHoverSquare }: {
  heights: Heights; showHeights: boolean
  onSquare: (p: Pos) => void; onHoverSquare: (p: Pos | null) => void
}) {
  const squares = useMemo(() => {
    const out: { p: Pos; h: number; top: THREE.Material; capSide: THREE.Material; earth: THREE.Material }[] = []
    for (let x = 0; x < SIZE; x++)
      for (let y = 0; y < SIZE; y++) {
        const h = heights[x][y]
        const body = h * HEIGHT_UNIT - BASE_Y - CAP
        const top = new THREE.MeshStandardMaterial({ map: topTexture(x, y, h, showHeights), roughness: 0.95 })
        const capSide = new THREE.MeshStandardMaterial({ color: new THREE.Color(...topColor(x, y, h).map(v => v / 255) as [number, number, number]).multiplyScalar(0.72).convertSRGBToLinear(), roughness: 0.95 })
        const earth = new THREE.MeshStandardMaterial({ map: sideTexture(body), roughness: 1 })
        out.push({ p: { x, y }, h, top, capSide, earth })
      }
    return out
  }, [heights, showHeights])

  return (
    <group>
      {squares.map(({ p, h, top, capSide, earth }) => {
        const [wx, wz] = world(p.x, p.y)
        const surface = h * HEIGHT_UNIT
        const body = surface - BASE_Y - CAP
        return (
          <group key={`${p.x}-${p.y}`}
            onClick={e => { e.stopPropagation(); onSquare(p) }}
            onPointerOver={e => { e.stopPropagation(); onHoverSquare(p) }}
            onPointerOut={() => onHoverSquare(null)}>
            <mesh position={[wx, BASE_Y + body / 2, wz]} castShadow receiveShadow material={earth}>
              <boxGeometry args={[0.95, body, 0.95]} />
            </mesh>
            <mesh position={[wx, surface - CAP / 2, wz]} castShadow receiveShadow
              material={[capSide, capSide, top, capSide, capSide, capSide]}>
              <boxGeometry args={[0.99, CAP, 0.99]} />
            </mesh>
          </group>
        )
      })}
      {/* Stone plinth with a lighter lip. */}
      <mesh position={[0, BASE_Y - 0.16, 0]} receiveShadow>
        <boxGeometry args={[SIZE + 0.7, 0.32, SIZE + 0.7]} />
        <meshStandardMaterial color="#38332b" roughness={0.9} />
      </mesh>
      <mesh position={[0, BASE_Y - 0.015, 0]} receiveShadow>
        <boxGeometry args={[SIZE + 0.5, 0.03, SIZE + 0.5]} />
        <meshStandardMaterial color="#4a443a" roughness={0.85} />
      </mesh>
    </group>
  )
}

function SquareTint({ heights, p, color, opacity }: { heights: Heights; p: Pos; color: string; opacity: number }) {
  const [wx, wz] = world(p.x, p.y)
  return (
    <mesh position={[wx, topY(heights, p) + 0.006, wz]} rotation-x={-Math.PI / 2} renderOrder={1}>
      <planeGeometry args={[0.985, 0.985]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function Pulse({ heights, p }: { heights: Heights; p: Pos }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.28 + 0.24 * Math.sin(clock.elapsedTime * 4)
  })
  const [wx, wz] = world(p.x, p.y)
  return (
    <mesh position={[wx, topY(heights, p) + 0.008, wz]} rotation-x={-Math.PI / 2} renderOrder={1}>
      <planeGeometry args={[0.985, 0.985]} />
      <meshBasicMaterial ref={mat} color="#f5d547" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  )
}

// Piece silhouettes, readable at a glance like chess pieces: each says what
// the Piece does, Strength shows as white pips (1, 2, 3), and the base keeps
// the original design's rule that its number of sides is the Movement.
//   Explorer  needle: tall and thin, fast and fragile (5-sided)
//   Vanguard  wedge aimed at the enemy: the charge (square base)
//   Sentinel  crenellated tower: slow, strongest, wins by Finishing first (3-sided)
// Every model stands on y = 0 and faces Red's forward (-z); Blue's is turned round.
const geoms = {
  explorer: (() => {
    const g = new THREE.CylinderGeometry(0.035, 0.2, 0.9, 5)
    g.translate(0, 0.45, 0)
    return g
  })(),
  vanguard: (() => {
    // Side profile in (z, y): high at the back, low at the front.
    const s = new THREE.Shape()
    s.moveTo(-0.34, 0); s.lineTo(0.3, 0); s.lineTo(0.3, 0.7); s.lineTo(-0.34, 0.04); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.56, bevelEnabled: false })
    g.rotateY(-Math.PI / 2)
    g.translate(0.28, 0, 0)
    return g
  })(),
  sentinel: (() => {
    const body = new THREE.CylinderGeometry(0.4, 0.44, 0.5, 3)
    body.translate(0, 0.25, 0)
    const parts = [0, 1, 2].map(i => {
      const a = (i * 2 * Math.PI) / 3
      const m = new THREE.BoxGeometry(0.17, 0.15, 0.17)
      m.rotateY(a)
      m.translate(Math.sin(a) * 0.27, 0.575, Math.cos(a) * 0.27)
      return m
    })
    return mergeGeometries([body, ...parts])
  })(),
}
const pipGeom = new THREE.SphereGeometry(0.068, 16, 12)
const PIPS: Record<Piece['type'], [number, number, number][]> = {
  explorer: [[0, 0.93, 0]],
  // On the slope, nudged out along its normal so they sit proud of it.
  vanguard: [[-0.14, 0.4, 0.03], [0.14, 0.4, 0.03]],
  sentinel: [0, 1, 2].map(i => {
    const a = (i * 2 * Math.PI) / 3 + Math.PI / 3
    return [Math.sin(a) * 0.13, 0.5, Math.cos(a) * 0.13] as [number, number, number]
  }),
}

function PieceModel({ type, side, selected = false, transparent = false }: {
  type: Piece['type']; side: Piece['side']; selected?: boolean; transparent?: boolean
}) {
  const color = PIECE_COLORS[side]
  return (
    <group rotation-y={side === 'blue' ? Math.PI : 0}>
      <mesh geometry={geoms[type]} castShadow>
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.15} transparent={transparent}
          emissive={selected ? color : '#000'} emissiveIntensity={selected ? 0.35 : 0} />
      </mesh>
      {PIPS[type].map((p, i) => (
        <mesh key={i} geometry={pipGeom} position={p}>
          <meshStandardMaterial color="#ffffff" roughness={0.3} emissive="#ffffff" emissiveIntensity={0.25} transparent={transparent} />
        </mesh>
      ))}
    </group>
  )
}

function PieceMesh({ piece, heights, selected, onClick, onOver }: {
  piece: Piece; heights: Heights; selected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void; onOver: () => void
}) {
  const ref = useRef<THREE.Group>(null)
  const [wx, wz] = world(piece.x, piece.y)
  const target = new THREE.Vector3(wx, topY(heights, piece) + 0.005, wz)
  const init = useRef(target.clone())
  // Ground position eased toward the target; the hop is added on top each
  // frame rather than accumulated, so it settles at any frame rate.
  const ground = useRef(target.clone())
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const k = 1 - Math.exp(-dt * 12)
    const dist = ground.current.distanceTo(target)
    ground.current.lerp(target, k)
    // A small hop while travelling reads as a move, not a teleport.
    g.position.copy(ground.current)
    g.position.y += Math.min(dist, 1.2) * 0.35
    const s = selected ? 1.12 : 1
    g.scale.lerp(new THREE.Vector3(s, s, s), k)
  })
  return (
    <group ref={ref} position={init.current} onClick={onClick}
      onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; onOver() }}
      onPointerOut={() => { document.body.style.cursor = '' }}>
      <PieceModel type={piece.type} side={piece.side} selected={selected} />
    </group>
  )
}

function Target({ heights, move, piece, active, ghost, onMove, onHover }: {
  heights: Heights; move: Move; piece: Piece; active: boolean; ghost: boolean
  onMove?: (m: Move) => void; onHover?: (m: Move | null) => void
}) {
  const t = useT()
  const [wx, wz] = world(move.to.x, move.to.y)
  const y = topY(heights, move.to)
  const cap = move.capture
  const finish = move.kind === 'finish'
  const special = move.kind === 'diagonal' || move.kind === 'leap'
  const color = finish ? '#81b64c' : cap ? (cap.allowed ? '#ff6b4a' : '#8a857c') : special ? '#e8b83e' : '#1f2a17'
  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onMove?.(move) },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; onHover?.(move) },
    onPointerOut: () => { document.body.style.cursor = ''; onHover?.(null) },
  }
  const label = finish ? t('board.finish', { n: PIECE_STATS[piece.type].strength })
    : cap ? `${cap.allowed ? '⚔' : '✕'} ${cap.attack}–${cap.defense}`
    : special ? t(`kind.${move.kind as 'leap' | 'diagonal'}`)
    : String(move.cost)
  const badgeStyle = finish ? { background: '#81b64c', color: '#fff' }
    : cap ? { background: cap.allowed ? '#e2563f' : '#5a5650', color: '#fff' }
    : special ? { background: '#e8b83e', color: '#2b2310' }
    : { background: 'rgba(24,23,20,0.88)', color: '#f2eee6' }
  const dim = ghost ? 0.5 : 1

  if (finish) {
    const z = wz - forward(piece.side) * 0.95
    return (
      <group position={[wx, y + 0.25, z]}>
        <mesh rotation-x={piece.side === 'red' ? -Math.PI / 2 : Math.PI / 2} {...handlers}>
          <coneGeometry args={[0.28, 0.5, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 0.6 : 0.25} transparent opacity={dim} />
        </mesh>
        <Html center wrapperClass="html3d" zIndexRange={[20, 0]}><div className="badge3d" style={{ ...badgeStyle, opacity: dim }}>{label}</div></Html>
      </group>
    )
  }
  return (
    <group position={[wx, y + 0.012, wz]}>
      <mesh rotation-x={-Math.PI / 2} renderOrder={2} {...handlers}>
        {cap || special
          ? <ringGeometry args={[cap ? 0.36 : 0.2, cap ? 0.47 : 0.3, 32]} />
          : <circleGeometry args={[active ? 0.2 : 0.16, 32]} />}
        <meshBasicMaterial color={color} transparent opacity={(active ? 0.95 : 0.8) * dim} depthWrite={false} />
      </mesh>
      {/* Generous invisible hit area so small markers are easy to tap. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} {...handlers}>
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html center position={[0, 0.05, 0]} wrapperClass="html3d" zIndexRange={[20, 0]}>
        <div className="badge3d" style={{ ...badgeStyle, opacity: dim, outline: active ? '2px solid #fff' : undefined }}>{label}</div>
      </Html>
    </group>
  )
}

function PathLine({ heights, from, move }: { heights: Heights; from: Pos; move: Move }) {
  const pts = [from, ...move.path].map(p => {
    const [wx, wz] = world(p.x, p.y)
    return new THREE.Vector3(wx, topY(heights, p) + 0.12, wz)
  })
  if (move.kind === 'finish') {
    const last = pts[pts.length - 1]
    pts.push(new THREE.Vector3(last.x, last.y, last.z + (move.to.y === SIZE - 1 ? -0.9 : 0.9)))
  }
  return <Line points={pts} color="#ffffff" lineWidth={3} dashed={move.kind !== 'step'} dashSize={0.15} gapSize={0.1} transparent opacity={0.9} />
}

// Chess-style: files along the near edge, ranks along the left edge, each
// label beside its edge square at that square's Height so columns never hide it.
function Coords({ heights, view }: { heights: Heights; view: View }) {
  const flipped = view === 'blue'
  const out = 0.68
  const nearY = flipped ? SIZE - 1 : 0
  const leftX = flipped ? SIZE - 1 : 0
  const label = (key: string, text: string, pos: Pos, dx: number, dz: number) => {
    const [wx, wz] = world(pos.x, pos.y)
    return (
      <Html key={key} position={[wx + dx, topY(heights, pos) + 0.05, wz + dz]} center wrapperClass="html3d" zIndexRange={[10, 0]}>
        <span className="coord">{text}</span>
      </Html>
    )
  }
  return (
    <group>
      {Array.from({ length: SIZE }, (_, i) => [
        label(`f${i}`, FILES[i], { x: i, y: nearY }, 0, flipped ? -out : out),
        label(`r${i}`, String(i + 1), { x: leftX, y: i }, flipped ? out : -out, 0),
      ])}
    </group>
  )
}

// Coloured strip beyond each goal edge: where that side must Finish.
function GoalEdges() {
  const y = BASE_Y + 0.02
  const z = SIZE / 2 + 0.2
  return (
    <group>
      {(['red', 'blue'] as const).map(side => (
        <mesh key={side} position={[0, y, side === 'red' ? -z : z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[SIZE, 0.18]} />
          <meshBasicMaterial color={PIECE_COLORS[side]} />
        </mesh>
      ))}
    </group>
  )
}

// Pieces leaving the board (captured or Finished) linger as short effects
// instead of vanishing, so the outcome of a move reads at a glance.
interface Exit { key: string; piece: Piece; kind: 'capture' | 'finish' }

function useExits(state: GameState): [Exit[], (key: string) => void] {
  const prev = useRef(state)
  const [exits, setExits] = useState<Exit[]>([])
  useEffect(() => {
    // A new board (restart, next lesson) drops any effect still playing.
    if (state.heights !== prev.current.heights) {
      prev.current = state
      return setExits([])
    }
    const now = new Set(state.pieces.map(p => p.id))
    const gone = prev.current.pieces.filter(p => !now.has(p.id))
    prev.current = state
    const fresh: Exit[] = []
    for (const p of gone) {
      const key = `${p.id}-${state.moves.length}`
      const done = state.finished.find(f => f.id === p.id)
      if (done) fresh.push({ key, piece: done, kind: 'finish' })
      else if (state.captured.some(c => c.id === p.id)) fresh.push({ key, piece: p, kind: 'capture' })
      // Anything else left through an undo, restart or new lesson: no effect.
    }
    setExits(xs => [...xs.filter(x => !now.has(x.piece.id)), ...fresh])
  }, [state])
  return [exits, key => setExits(xs => xs.filter(x => x.key !== key))]
}

const EXIT_SECONDS = 1.2

function ExitFx({ exit, heights, onDone }: { exit: Exit; heights: Heights; onDone: () => void }) {
  const { piece, kind } = exit
  const tr = useT()
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const t = useRef(0)
  const ended = useRef(false)
  const [wx, wz] = world(piece.x, piece.y)
  const ground = topY(heights, piece)
  const y0 = ground + 0.005
  const dir = -forward(piece.side) // world z runs opposite to rank
  const accent = kind === 'finish' ? '#f5d547' : '#ff6b4a'

  useFrame((_, dt) => {
    const k = (t.current += dt)
    const g = group.current
    // Body and pips fade and flash together.
    const mats: THREE.MeshStandardMaterial[] = []
    g?.traverse(o => { if (o instanceof THREE.Mesh) mats.push(o.material as THREE.MeshStandardMaterial) })
    const setAll = (f: (m: THREE.MeshStandardMaterial) => void) => mats.forEach(f)
    if (g) {
      if (kind === 'capture') {
        // Hold while the attacker lands, flash, then spin down into the ground.
        const s = k < 0.22 ? 1 : Math.max(0.001, 1 - (k - 0.22) / 0.35)
        g.scale.setScalar(s)
        g.position.set(wx, y0 - (1 - s) * 0.3, wz)
        g.rotation.y = Math.max(0, k - 0.22) * 9
        const flash = k > 0.18 && k < 0.45
        setAll(m => { m.emissive.set('#ffffff'); m.emissiveIntensity = flash ? 1.2 : 0 })
      } else {
        // Glide past the goal edge, lifting off and fading.
        const a = Math.min(1, k / 0.8)
        const e = a * a * (3 - 2 * a)
        g.position.set(wx, y0 + e * 0.9, wz + dir * e * 1.3)
        g.scale.setScalar(1 - e * 0.35)
        const opacity = 1 - Math.min(1, Math.max(0, (k - 0.45) / 0.5))
        setAll(m => { m.opacity = opacity; m.emissive.set('#f5d547'); m.emissiveIntensity = 0.5 * e })
      }
    }
    if (ring.current && ringMat.current) {
      const r = Math.max(0, Math.min(1, (k - (kind === 'capture' ? 0.22 : 0.5)) / 0.55))
      ring.current.scale.setScalar(0.4 + r * 1.6)
      ringMat.current.opacity = r > 0 ? 0.9 * (1 - r) : 0
    }
    if (k > EXIT_SECONDS && !ended.current) {
      ended.current = true
      onDone()
    }
  })

  const ringAt: [number, number, number] = [wx, ground + 0.02, kind === 'capture' ? wz : wz + dir * 0.95]
  const label = kind === 'finish' ? `+${PIECE_STATS[piece.type].strength}` : tr('board.captured')
  return (
    <>
      <group ref={group} position={[wx, y0, wz]}>
        <PieceModel type={piece.type} side={piece.side} transparent />
      </group>
      <mesh ref={ring} position={ringAt} rotation-x={-Math.PI / 2} renderOrder={3}>
        <ringGeometry args={[0.38, 0.48, 40]} />
        <meshBasicMaterial ref={ringMat} color={accent} transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html center position={[ringAt[0], ground + 0.9, ringAt[2]]} wrapperClass="html3d" zIndexRange={[30, 0]}>
        <div className={`fx-float ${kind === 'finish' ? 'fx-finish' : 'fx-capture'}`}>{label}</div>
      </Html>
    </>
  )
}
