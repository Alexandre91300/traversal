import { useEffect, useRef, type ReactNode } from 'react'
import type { Level } from '../game/ai'
import type { PieceType, Side } from '../game/rules'
import { SIZE, type Heights } from '../game/terrain'
import { useT } from '../i18n'

export const SIDE_HEX: Record<Side, string> = { red: '#e2563f', blue: '#4b8fe8' }

// Against the computer the human is always Red (see HUMAN in useGame).
export function usePlayerNames(computer?: Level): Record<Side, string> {
  const t = useT()
  return computer
    ? { red: t('you'), blue: t('computer.named', { level: t(`level.${computer}`) }) }
    : { red: t('player.1'), blue: t('player.2') }
}

// Side views of the 3D models (pieceModel.tsx): one turned base, stem and
// collar, told apart by the head (spire, spearhead, rook), with Strength as
// bronze bands round the stem.
const BASE = 'M5 19.5H15L13 17.3H11.8L11.4 11H13V10'
const BASE_BACK = 'H7V11H8.6L8.2 17.3H7Z'
const HEADS: Record<PieceType, string> = {
  explorer: 'H12L10 2L8 10',
  vanguard: 'H10.7V8.6L13.5 6.8L10 1.8L6.5 6.8L9.3 8.6V10',
  sentinel: 'H12.5L14 6.8V3H12.2V4.5H10.9V3H9.1V4.5H7.8V3H6V6.8L7.5 10',
}
const BANDS: Record<PieceType, number[]> = { explorer: [14.2], vanguard: [13.4, 15], sentinel: [12.6, 14.2, 15.8] }
// Half-width of the stem at height y, so each band sits just proud of it.
const stemHalf = (y: number) => 1.4 + ((y - 11) * 0.4) / 6.3

export function PieceIcon({ type, side, size = 18 }: { type: PieceType; side: Side; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 21" aria-hidden="true" className="shrink-0">
      <path d={BASE + HEADS[type] + BASE_BACK} fill={SIDE_HEX[side]} stroke="rgb(0 0 0 / 0.45)" strokeWidth="1.1" strokeLinejoin="round" />
      {BANDS[type].map(y => {
        const w = stemHalf(y) + 0.5
        return <rect key={y} x={10 - w} y={y - 0.45} width={w * 2} height={0.9} rx={0.4} fill="#c8904e" />
      })}
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
  learn: 'M22 9 12 4 2 9l10 5 10-5zM6 11v5c3 3 9 3 12 0v-5M22 9v6',
  cpu: 'M6 6h12v12H6zM10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  reset: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  check: 'M4 12l5 5L20 6',
  first: 'M6 5v14M18 6l-8 6 8 6z',
  prev: 'M16 6l-8 6 8 6z',
  next: 'M8 6l8 6-8 6z',
  last: 'M18 5v14M6 6l8 6-8 6z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z',
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
  const t = useT()
  return (
    <span className="inline-block text-[10px] uppercase tracking-[0.12em] font-display font-bold text-muted border border-line rounded px-1.5 py-0.5">
      {t('concept')}
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
