import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32, SIZE, type Heights } from '../game/terrain'
import { HEIGHT_UNIT, world } from './Board3D'
import { rockiness, topColor } from './textures'

// Grass blades swaying in the wind on top of the grassy squares, thinning out
// on rocky high ground. One InstancedMesh for the whole board; the wind is a
// vertex-shader offset, so it costs nothing per frame on the CPU.

const time = { value: 0 }
let bladeGeometry: THREE.BufferGeometry | null = null
let bladeMaterial: THREE.MeshStandardMaterial | null = null

// A tapered blade, 1 unit tall: three quads narrowing to a tip, double-sided
// by duplicating the triangles reversed. Vertex colour darkens towards the root.
function blade() {
  if (bladeGeometry) return bladeGeometry
  const heights = [0, 0.35, 0.7, 1]
  const halfWidths = [0.5, 0.38, 0.22]
  const position: number[] = [], color: number[] = [], normal: number[] = [], index: number[] = []
  for (let k = 0; k < 3; k++) {
    position.push(-halfWidths[k], heights[k], 0, halfWidths[k], heights[k], 0)
    const shade = 0.5 + 0.6 * heights[k]
    color.push(shade, shade, shade, shade, shade, shade)
  }
  position.push(0, 1, 0)
  color.push(1.12, 1.12, 1.12)
  for (let i = 0; i < 7; i++) normal.push(0, 1, 0.25)
  for (let k = 0; k < 2; k++) {
    const a = k * 2
    index.push(a, a + 1, a + 3, a, a + 3, a + 2)
  }
  index.push(4, 5, 6)
  const front = index.length
  for (let i = 0; i < front; i += 3) index.push(index[i], index[i + 2], index[i + 1])
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(position), 3))
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(color), 3))
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normal), 3))
  g.setIndex(index)
  bladeGeometry = g
  return g
}

// Standard material with the wind injected: slow gusts rolling across the
// board, a faster flutter per blade, bending more towards the tip.
function windMaterial() {
  if (bladeMaterial) return bladeMaterial
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })
  m.onBeforeCompile = shader => {
    shader.uniforms.uGT = time
    shader.vertexShader = 'uniform float uGT;\n' + shader.vertexShader.replace('#include <project_vertex>', `vec4 mvPosition=vec4(transformed,1.0);
#ifdef USE_INSTANCING
mvPosition=instanceMatrix*mvPosition;
vec3 gB=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
#else
vec3 gB=vec3(0.);
#endif
mvPosition=modelMatrix*mvPosition;
float gK=position.y*position.y;
float gGust=.55+.45*sin(uGT*.9-gB.x*.45-gB.z*.25);
float gW=gGust*(.75+.25*sin(uGT*2.3+gB.x*2.1+gB.z*1.7))+.18*sin(uGT*5.3+gB.x*7.+gB.z*5.);
vec2 gD=vec2(.08,.035)*gW*gK;
mvPosition.xz+=gD;mvPosition.y-=dot(gD,gD)*3.;
mvPosition=viewMatrix*mvPosition;
gl_Position=projectionMatrix*mvPosition;`)
  }
  m.customProgramCacheKey = () => 'grass-wind'
  bladeMaterial = m
  return m
}

export function Grass({ heights }: { heights: Heights }) {
  const mesh = useMemo(() => {
    const perSquare: [number, number, number][] = []
    let total = 0
    for (let x = 0; x < SIZE; x++)
      for (let y = 0; y < SIZE; y++) {
        const n = Math.round(110 * Math.pow(1 - rockiness(heights[x][y]), 1.6))
        perSquare.push([x, y, n])
        total += n
      }
    const m = new THREE.InstancedMesh(blade(), windMaterial(), Math.max(1, total))
    m.count = total
    m.frustumCulled = false
    m.receiveShadow = true
    // Blades must never steal clicks from the squares and Pieces.
    m.raycast = () => {}
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    let i = 0
    for (const [x, y, n] of perSquare) {
      const h = heights[x][y]
      const [wx, wz] = world(x, y)
      const surface = h * HEIGHT_UNIT - 0.004
      const rnd = mulberry32(x * 977 + y * 131 + 7)
      const base = topColor(x, y, h)
      for (let k = 0; k < n; k++) {
        const tall = 0.1 + rnd() * 0.12
        o.position.set(wx + (rnd() - 0.5) * 0.88, surface, wz + (rnd() - 0.5) * 0.88)
        o.rotation.set((rnd() - 0.5) * 0.5, rnd() * Math.PI, (rnd() - 0.5) * 0.5)
        o.scale.set(0.08 + rnd() * 0.05, tall, 1)
        o.updateMatrix()
        m.setMatrixAt(i, o.matrix)
        const tint = 0.82 + rnd() * 0.38
        c.setRGB(base[0] / 255 * tint, base[1] / 255 * tint * 1.04, base[2] / 255 * tint * 0.92).convertSRGBToLinear()
        m.setColorAt(i, c)
        i++
      }
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    return m
  }, [heights])
  useEffect(() => () => { mesh.dispose() }, [mesh])
  useFrame(({ clock }) => { time.value = clock.elapsedTime })
  return <primitive object={mesh} />
}
