import * as THREE from 'three'

// Procedural Piece textures, drawn on a canvas so the single-file build needs
// no image files. Lathe UVs run u around the piece and v up its profile, so
// anything sampled along u must tile seamlessly (integer frequencies, and
// value noise whose grid wraps).
type RGB = [number, number, number]
const rgb = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Tileable fractal value noise in [0, 1].
const fbm = (seed: number) => {
  const octaves = [4, 8, 16, 32].map((grid, o) => {
    const rand = seeded(seed + o * 101)
    const v = Float32Array.from({ length: grid * grid }, rand)
    const at = (i: number, j: number) => v[((j % grid) + grid) % grid * grid + ((i % grid) + grid) % grid]
    return (u: number, w: number) => {
      const x = u * grid, y = w * grid
      const xi = Math.floor(x), yi = Math.floor(y)
      const sx = (x - xi) ** 2 * (3 - 2 * (x - xi)), sy = (y - yi) ** 2 * (3 - 2 * (y - yi))
      const top = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx
      const bottom = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx
      return top + (bottom - top) * sy
    }
  })
  return (u: number, w: number) => octaves.reduce((sum, n, o) => sum + n(u, w) / 2 ** (o + 1), 0) / 0.9375
}

const canvasTexture = (size: number, paint: (u: number, v: number) => RGB) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Canvas rows go top-down, texture v goes bottom-up.
      const [r, g, b] = paint(x / size, 1 - y / size)
      const i = (y * size + x) * 4
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.anisotropy = 4
  return tex
}

// Enamel: deep at the foot, glowing towards the head, with a faint mottle.
export const enamelTexture = (deep: string, bright: string, seed: number) => {
  const noise = fbm(seed)
  return canvasTexture(256, (u, v) => mix(rgb(deep), rgb(bright), Math.min(1, v * 1.15) * (0.9 + 0.1 * noise(u, v))))
}

// Marble: clouded body crossed by thin veins; optional metallic flecks (lapis pyrite).
export const marbleTexture = (dark: string, light: string, vein: string, seed: number, flecks = 0) => {
  const noise = fbm(seed)
  const rand = seeded(seed + 7)
  return canvasTexture(512, (u, v) => {
    const t = noise(u, v)
    const wave = Math.sin((u * 2 + v * 3 + t * 3.2) * Math.PI * 2)
    const veins = (1 - Math.abs(wave)) ** 10
    let c = mix(rgb(dark), rgb(light), Math.min(1, t * t * 1.6))
    c = mix(c, rgb(vein), Math.min(1, veins * 0.8))
    if (flecks && rand() < flecks) c = rgb('#e6c46a')
    return c
  })
}

// Wood: growth rings running up the profile, warped by noise.
export const woodTexture = (dark: string, light: string, seed: number) => {
  const noise = fbm(seed)
  return canvasTexture(256, (u, v) => {
    const grain = 0.5 + 0.5 * Math.sin((v * 28 + noise(u, v) * 5) * Math.PI * 2)
    return mix(rgb(dark), rgb(light), grain ** 2.5 * 0.85 + noise(u, v) * 0.15)
  })
}
