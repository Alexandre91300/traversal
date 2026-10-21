import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { CameraControls, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { PIECE_STATS, FILES, forward, type GameState, type Move, type Piece, type Pos } from '../game/rules'
import { SIZE, type Heights } from '../game/terrain'

export const HEIGHT_UNIT = 0.32
const BASE_Y = -0.7
const LIGHT = '#e6e3c6'
const DARK = '#6f9a4e'
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
  onPieceClick?: (p: Piece) => void
  onMove?: (m: Move) => void
  onHover?: (m: Move | null) => void
  onEmptyClick?: () => void
}

// Fills its nearest positioned ancestor, so flex parents need no definite height.
export function Board3D(props: BoardProps) {
  return (
    <div className="absolute inset-0">
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

function Scene({ state, selected, moves = [], hovered, view, viewNonce = 0, showHeights, showCoords, showcase, onPieceClick, onMove, onHover }: BoardProps) {
  const controls = useRef<CameraControls>(null)
  const { heights } = state
  const maxH = Math.max(1, ...heights.flat())
  const center = (maxH * HEIGHT_UNIT) / 2
  const aspect = useThree(s => s.size.width / s.size.height)

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
      <hemisphereLight args={['#fff7e8', '#3a3328', 0.9]} />
      <directionalLight
        position={[6, 14, 8]}
        intensity={1.6}
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

      <Terrain heights={heights} maxH={maxH} showHeights={!!showHeights} onSquare={p => {
        const m = moveTo(p)
        if (m) onMove?.(m)
      }} onHoverSquare={p => onHover?.(p ? moveTo(p) ?? null : null)} />

      {state.lastMove && <SquareTint heights={heights} p={state.lastMove.from} color="#f5d547" opacity={0.42} />}
      {state.lastMove?.to && <SquareTint heights={heights} p={state.lastMove.to} color="#f5d547" opacity={0.55} />}
      {selected && <SquareTint heights={heights} p={selected} color="#9be15d" opacity={0.6} />}

      {hovered && selected && <PathLine heights={heights} from={selected} move={hovered} />}

      {targets.map(m => (
        <Target key={`${m.kind}-${m.to.x}-${m.to.y}`} heights={heights} move={m} piece={selected!}
          active={hovered === m} onMove={onMove} onHover={onHover} />
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

      {showCoords && <Coords heights={heights} view={view} />}
      <GoalEdges />
    </>
  )
}

function shade(hex: string, t: number) {
  const c = new THREE.Color(hex)
  c.offsetHSL(0, 0, -0.16 + 0.26 * t)
  return c
}

function Terrain({ heights, maxH, showHeights, onSquare, onHoverSquare }: {
  heights: Heights; maxH: number; showHeights: boolean
  onSquare: (p: Pos) => void; onHoverSquare: (p: Pos | null) => void
}) {
  const squares = useMemo(() => {
    const out: { p: Pos; h: number; top: THREE.Material; side: THREE.Material }[] = []
    for (let x = 0; x < SIZE; x++)
      for (let y = 0; y < SIZE; y++) {
        const h = heights[x][y]
        const baseHex = (x + y) % 2 === 0 ? DARK : LIGHT
        const col = shade(baseHex, h / maxH)
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 128
        const g = canvas.getContext('2d')!
        g.fillStyle = `#${col.getHexString()}`
        g.fillRect(0, 0, 128, 128)
        if (showHeights) {
          g.fillStyle = (x + y) % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(40,52,30,0.6)'
          g.font = '800 30px Montserrat, system-ui, sans-serif'
          g.textAlign = 'right'
          g.textBaseline = 'top'
          g.fillText(String(h), 118, 8)
        }
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 4
        const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 })
        const side = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.62), roughness: 0.9 })
        out.push({ p: { x, y }, h, top, side })
      }
    return out
  }, [heights, maxH, showHeights])

  return (
    <group>
      {squares.map(({ p, h, top, side }) => {
        const [wx, wz] = world(p.x, p.y)
        const height = h * HEIGHT_UNIT - BASE_Y
        return (
          <mesh key={`${p.x}-${p.y}`} position={[wx, BASE_Y + height / 2, wz]} castShadow receiveShadow
            material={[side, side, top, side, side, side]}
            onClick={e => { e.stopPropagation(); onSquare(p) }}
            onPointerOver={e => { e.stopPropagation(); onHoverSquare(p) }}
            onPointerOut={() => onHoverSquare(null)}>
            <boxGeometry args={[0.985, height, 0.985]} />
          </mesh>
        )
      })}
      <mesh position={[0, BASE_Y - 0.15, 0]} receiveShadow>
        <boxGeometry args={[SIZE + 0.6, 0.3, SIZE + 0.6]} />
        <meshStandardMaterial color="#1b1a17" roughness={1} />
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

const geoms = {
  explorer: new THREE.ConeGeometry(0.31, 0.78, 5),
  sentinel: new THREE.CylinderGeometry(0.34, 0.34, 0.62, 3),
  vanguard: (() => {
    const s = new THREE.Shape()
    s.moveTo(-0.3, 0); s.lineTo(0.3, 0); s.lineTo(0, 0.6); s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.56, bevelEnabled: false })
    g.translate(0, -0.3, -0.28)
    g.rotateY(Math.PI / 4)
    return g
  })(),
}
const pieceLift = { explorer: 0.39, sentinel: 0.31, vanguard: 0.3 }

function PieceMesh({ piece, heights, selected, onClick, onOver }: {
  piece: Piece; heights: Heights; selected: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void; onOver: () => void
}) {
  const ref = useRef<THREE.Group>(null)
  const [wx, wz] = world(piece.x, piece.y)
  const target = new THREE.Vector3(wx, topY(heights, piece) + pieceLift[piece.type], wz)
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
  const color = PIECE_COLORS[piece.side]
  return (
    <group ref={ref} position={init.current}>
      <mesh geometry={geoms[piece.type]} castShadow onClick={onClick}
        onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; onOver() }}
        onPointerOut={() => { document.body.style.cursor = '' }}>
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.15}
          emissive={selected ? color : '#000'} emissiveIntensity={selected ? 0.35 : 0} />
      </mesh>
    </group>
  )
}

function Target({ heights, move, piece, active, onMove, onHover }: {
  heights: Heights; move: Move; piece: Piece; active: boolean
  onMove?: (m: Move) => void; onHover?: (m: Move | null) => void
}) {
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
  const label = finish ? `Finish +${PIECE_STATS[piece.type].strength}`
    : cap ? `${cap.allowed ? '⚔' : '✕'} ${cap.attack}–${cap.defense}`
    : special ? (move.kind === 'leap' ? 'Leap' : 'Diagonal')
    : String(move.cost)
  const badgeStyle = finish ? { background: '#81b64c', color: '#fff' }
    : cap ? { background: cap.allowed ? '#e2563f' : '#5a5650', color: '#fff' }
    : special ? { background: '#e8b83e', color: '#2b2310' }
    : { background: 'rgba(24,23,20,0.88)', color: '#f2eee6' }

  if (finish) {
    const z = wz - forward(piece.side) * 0.95
    return (
      <group position={[wx, y + 0.25, z]}>
        <mesh rotation-x={piece.side === 'red' ? -Math.PI / 2 : Math.PI / 2} {...handlers}>
          <coneGeometry args={[0.28, 0.5, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 0.6 : 0.25} />
        </mesh>
        <Html center wrapperClass="html3d" zIndexRange={[20, 0]}><div className="badge3d" style={badgeStyle}>{label}</div></Html>
      </group>
    )
  }
  return (
    <group position={[wx, y + 0.012, wz]}>
      <mesh rotation-x={-Math.PI / 2} renderOrder={2} {...handlers}>
        {cap || special
          ? <ringGeometry args={[cap ? 0.36 : 0.2, cap ? 0.47 : 0.3, 32]} />
          : <circleGeometry args={[active ? 0.2 : 0.16, 32]} />}
        <meshBasicMaterial color={color} transparent opacity={active ? 0.95 : 0.8} depthWrite={false} />
      </mesh>
      {/* Generous invisible hit area so small markers are easy to tap. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} {...handlers}>
        <planeGeometry args={[0.95, 0.95]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html center position={[0, 0.05, 0]} wrapperClass="html3d" zIndexRange={[20, 0]}>
        <div className="badge3d" style={{ ...badgeStyle, outline: active ? '2px solid #fff' : undefined }}>{label}</div>
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
