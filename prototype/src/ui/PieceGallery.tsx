import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { PieceType } from '../game/rules'
import { PIECE_OPTIONS } from './pieceOptions'
import { Logo } from './bits'

// Dev-only comparison screen for the Piece-redesign issue, reached via the
// #pieces URL hash (see App.tsx). Not part of the normal game flow: it is a
// throwaway rig to judge the mock-ups turning in 3D, side by side.
const TYPES: PieceType[] = ['explorer', 'vanguard', 'sentinel']

export function PieceGallery() {
  return (
    <div className="min-h-full bg-bg text-fg overflow-auto">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-line">
        <Logo className="text-2xl" />
        <span className="font-display font-bold text-muted">Options de modèles de Pièces</span>
        <a href="#" className="ml-auto btn btn-quiet px-3 py-1.5 text-sm">← Retour au jeu</a>
      </header>
      <p className="px-6 pt-4 text-sm text-muted max-w-2xl">
        Glisser pour tourner la caméra de chaque vignette. Rouge devant, Bleu derrière ; de gauche à droite : Explorer, Vanguard, Sentinel.
        Voir <code className="text-xs">.scratch/piece-design/issues/01-redesign-piece-models.md</code>.
      </p>
      <div className="p-6 grid gap-8">
        {PIECE_OPTIONS.map(opt => (
          <section key={opt.id} className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <h2 className="font-display font-bold">{opt.label}</h2>
              <p className="text-xs text-muted">{opt.blurb}</p>
            </div>
            <div className="h-[280px] bg-[#262420]">
              <Canvas shadows dpr={[1, 2]} camera={{ fov: 30, position: [0, 1.6, 3.3] }}>
                <OptionScene Model={opt.Model} />
              </Canvas>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function OptionScene({ Model }: { Model: (p: { type: PieceType; side: 'red' | 'blue'; selected?: boolean }) => React.JSX.Element }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const idle = useRef(0)
  useFrame((_, dt) => {
    idle.current += dt
    // Auto-rotates until the owner grabs it, so an untouched tile still shows every side.
    if (controls.current) controls.current.autoRotate = idle.current > 1.5
  })
  return (
    <>
      <color attach="background" args={['#262420']} />
      <hemisphereLight args={['#fff4dc', '#3d4a2c', 0.9]} />
      <directionalLight position={[4, 7, 4]} intensity={1.6} color="#fff1d6" castShadow />
      <directionalLight position={[-5, 4, -3]} intensity={0.3} color="#cfe0ff" />
      {/* Built entirely from Lightformers at runtime, no HDRI file: gives the glossy options real reflections. */}
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.5} color="#fff6e0" position={[0, 4, 2]} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffb070" position={[-4, 1.5, -2]} scale={[3, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#8fb8ff" position={[4, 1.5, -2]} scale={[3, 3, 1]} />
      </Environment>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position-y={-0.001}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#3a352c" roughness={1} />
      </mesh>
      <OrbitControls ref={controls} target={[0, 0.5, 0]} autoRotateSpeed={2.2}
        enablePan={false} minDistance={2.5} maxDistance={8} maxPolarAngle={1.3}
        onStart={() => { idle.current = 0 }} onEnd={() => { idle.current = 0 }} />
      {TYPES.map((type, i) => {
        const x = (i - 1) * 1.1
        return (
          <group key={type}>
            <group position={[x, 0, 0.45]}><Model type={type} side="red" /></group>
            <group position={[x, 0, -0.45]}><Model type={type} side="blue" /></group>
          </group>
        )
      })}
    </>
  )
}
