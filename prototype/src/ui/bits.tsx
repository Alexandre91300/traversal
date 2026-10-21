import { useEffect, useRef, type ReactNode } from 'react'
import type { PieceType, Side } from '../game/rules'
import { SIZE, type Heights } from '../game/terrain'

export const SIDE_LABEL: Record<Side, string> = { red: 'Red', blue: 'Blue' }
export const SIDE_PLAYER: Record<Side, string> = { red: 'Player 1', blue: 'Player 2' }
export const SIDE_HEX: Record<Side, string> = { red: '#e2563f', blue: '#4b8fe8' }

const SHAPES: Record<PieceType, number> = { explorer: 5, vanguard: 4, sentinel: 3 }

// Same silhouettes the rules page uses: base sides = Movement.
export function PieceIcon({ type, side, size = 18 }: { type: PieceType; side: Side; size?: number }) {
  const n = SHAPES[type]
  const r = 9
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2 + (n === 4 ? 0 : 0)
    return `${10 + r * Math.cos(a)},${10.6 + r * Math.sin(a)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox="0 0 20 21" aria-hidden="true" className="shrink-0">
      <polygon points={pts} fill={SIDE_HEX[side]} stroke="rgb(0 0 0 / 0.45)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

const LOW = [38, 58, 28]
const HIGH = [238, 234, 205]

// Height map: dark green lowlands to pale peaks, with a faint checker for scale.
// Without a size the preview fills its container's width.
export function TerrainPreview({ heights, size }: { heights: Heights; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d')!
    const max = Math.max(1, ...heights.flat())
    const cell = c.width / SIZE
    for (let x = 0; x < SIZE; x++)
      for (let y = 0; y < SIZE; y++) {
        const t = heights[x][y] / max
        const k = (x + y) % 2 === 0 ? 0.94 : 1
        g.fillStyle = `rgb(${LOW.map((lo, i) => Math.round((lo + (HIGH[i] - lo) * t) * k)).join(',')})`
        g.fillRect(x * cell, (SIZE - 1 - y) * cell, cell, cell)
      }
  }, [heights])
  return <canvas ref={ref} width={100} height={100} style={size ? { width: size, height: size } : { width: '100%', aspectRatio: '1' }} className="rounded-md block" />
}

const ICONS = {
  plus: 'M12 5v14M5 12h14',
  undo: 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  flip: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',
  top: 'M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM20 17v4H6.5',
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  x: 'M6 6l12 12M18 6 6 18',
  play: 'M7 4l13 8-13 8z',
}

export function Icon({ name, size = 18 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d={ICONS[name]} />
    </svg>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return <span className={`font-logo leading-none ${className}`}>Traversal</span>
}

export function ConceptBadge() {
  return (
    <span className="inline-block text-[10px] uppercase tracking-[0.12em] font-display font-bold text-muted border border-line rounded px-1.5 py-0.5">
      Unofficial UI concept
    </span>
  )
}

export function Modal({ children, onClose, label }: { children: ReactNode; onClose?: () => void; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={label}
      onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="w-full max-w-[640px] max-h-full overflow-auto rounded-xl bg-surface border border-line shadow-2xl">
        {children}
      </div>
    </div>
  )
}
