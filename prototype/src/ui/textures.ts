// Procedural board textures, drawn on canvases at load: no image files, so
// the single-file build stays self-contained.
//
// Square tops: grass on a light/dark checker that turns to rock as the
// ground rises, with the Height drawn in a corner. Column sides: layered
// earth, tiled per world unit so tall columns aren't stretched.

import * as THREE from 'three'
import { mulberry32 } from '../game/terrain'

const TOP_PX = 256
const DETAIL_VARIANTS = 4

type Rgb = [number, number, number]
const hex = (h: string): Rgb => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as Rgb
const mix = (a: Rgb, b: Rgb, t: number): Rgb => a.map((v, i) => v + (b[i] - v) * t) as Rgb
const css = ([r, g, b]: Rgb, k = 1) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`

// Checker tones stay far enough apart to read as squares from any angle.
const GRASS = { dark: hex('#4c7a33'), light: hex('#8dba55') }
const ROCK = { dark: hex('#736d60'), light: hex('#b2ac98') }

// Greyscale grass detail: speckle plus short blades, as overlay strokes.
let details: HTMLCanvasElement[] | null = null
function grassDetails() {
  if (details) return details
  details = Array.from({ length: DETAIL_VARIANTS }, (_, v) => {
    const c = document.createElement('canvas')
    c.width = c.height = TOP_PX
    const g = c.getContext('2d')!
    const rnd = mulberry32(1000 + v)
    for (let i = 0; i < 900; i++) {
      const x = rnd() * TOP_PX, y = rnd() * TOP_PX
      const light = rnd() > 0.5
      g.fillStyle = light ? `rgba(255,255,230,${0.08 + rnd() * 0.12})` : `rgba(0,20,0,${0.1 + rnd() * 0.14})`
      g.fillRect(x, y, 2 + rnd() * 3, 2 + rnd() * 3)
    }
    g.lineCap = 'round'
    for (let i = 0; i < 700; i++) {
      const x = rnd() * TOP_PX, y = rnd() * TOP_PX
      const len = 4 + rnd() * 9, a = -Math.PI / 2 + (rnd() - 0.5) * 1.1
      g.strokeStyle = rnd() > 0.45 ? `rgba(225,245,170,${0.2 + rnd() * 0.22})` : `rgba(10,40,5,${0.2 + rnd() * 0.25})`
      g.lineWidth = 1 + rnd() * 1.4
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
      g.stroke()
    }
    return c
  })
  return details
}

// Rock: blotches and a few cracks, for high ground.
function drawRock(g: CanvasRenderingContext2D, rnd: () => number, amount: number) {
  for (let i = 0; i < 60; i++) {
    g.fillStyle = `rgba(${rnd() > 0.5 ? '255,250,235' : '30,28,22'},${(0.05 + rnd() * 0.08) * amount})`
    g.beginPath()
    g.ellipse(rnd() * TOP_PX, rnd() * TOP_PX, 6 + rnd() * 22, 4 + rnd() * 14, rnd() * Math.PI, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = `rgba(20,18,14,${0.35 * amount})`
  g.lineWidth = 1.5
  for (let i = 0; i < 5; i++) {
    let x = rnd() * TOP_PX, y = rnd() * TOP_PX
    g.beginPath()
    g.moveTo(x, y)
    for (let k = 0; k < 4; k++) g.lineTo((x += (rnd() - 0.5) * 50), (y += (rnd() - 0.5) * 50))
    g.stroke()
  }
}

// How rocky a Square is: grass up to Height 4, bare rock from 8.
export const rockiness = (h: number) => Math.min(1, Math.max(0, (h - 4) / 4))

export function topColor(x: number, y: number, h: number): Rgb {
  const dark = (x + y) % 2 === 0
  const r = rockiness(h)
  const base = mix(dark ? GRASS.dark : GRASS.light, dark ? ROCK.dark : ROCK.light, r)
  // A little lighter and drier the higher it sits.
  return mix(base, hex('#e8dfb0'), Math.min(0.12, h * 0.015))
}

export function topTexture(x: number, y: number, h: number, showHeight: boolean) {
  const c = document.createElement('canvas')
  c.width = c.height = TOP_PX
  const g = c.getContext('2d')!
  const col = topColor(x, y, h)
  // Soft vignette so each Square reads as its own tile.
  const grad = g.createRadialGradient(TOP_PX / 2, TOP_PX / 2, TOP_PX * 0.2, TOP_PX / 2, TOP_PX / 2, TOP_PX * 0.75)
  grad.addColorStop(0, css(col, 1.04))
  grad.addColorStop(1, css(col, 0.86))
  g.fillStyle = grad
  g.fillRect(0, 0, TOP_PX, TOP_PX)

  const r = rockiness(h)
  const rnd = mulberry32(x * 131 + y * 7 + 1)
  // Rotate and pick a detail variant per Square so the grass never visibly repeats.
  g.save()
  g.globalAlpha = 1 - r * 0.85
  g.translate(TOP_PX / 2, TOP_PX / 2)
  g.rotate(((x * 3 + y) % 4) * (Math.PI / 2))
  g.drawImage(grassDetails()[(x * 5 + y * 3) % DETAIL_VARIANTS], -TOP_PX / 2, -TOP_PX / 2)
  g.restore()
  if (r > 0) drawRock(g, rnd, r)

  if (showHeight) {
    const dark = (x + y) % 2 === 0
    g.font = '800 54px Montserrat, system-ui, sans-serif'
    g.textAlign = 'right'
    g.textBaseline = 'top'
    g.fillStyle = 'rgba(0,0,0,0.35)'
    g.fillText(String(h), 238, 18)
    g.fillStyle = dark && r < 0.5 ? 'rgba(255,255,240,0.9)' : 'rgba(255,255,245,0.95)'
    g.fillText(String(h), 236, 15)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// One tileable strip of layered earth; each column clones it with its own repeat.
let side: HTMLCanvasElement | null = null
function sideCanvas() {
  if (side) return side
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const g = c.getContext('2d')!
  const rnd = mulberry32(77)
  const bands = ['#6b4f36', '#5d4430', '#735740', '#54402e']
  for (let i = 0; i < 8; i++) {
    g.fillStyle = bands[i % bands.length]
    g.fillRect(0, i * 16, 128, 16)
  }
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(${rnd() > 0.5 ? '255,235,200' : '20,12,6'},${0.06 + rnd() * 0.12})`
    g.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 3, 1 + rnd() * 2)
  }
  // Pebbles.
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(150,140,125,${0.35 + rnd() * 0.3})`
    g.beginPath()
    g.ellipse(rnd() * 128, rnd() * 128, 2 + rnd() * 4, 1.5 + rnd() * 2.5, 0, 0, Math.PI * 2)
    g.fill()
  }
  side = c
  return c
}

export function sideTexture(height: number) {
  const tex = new THREE.CanvasTexture(sideCanvas())
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, Math.max(0.25, height))
  return tex
}
