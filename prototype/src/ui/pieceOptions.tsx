import type { Piece } from '../game/rules'
import { PieceModel, stauntonFinish, type Finish } from './pieceModel'
import { enamelTexture } from './pieceTextures'

// Alternative finishes for the Piece-redesign issue (.scratch/piece-design/issues/01-redesign-piece-models.md),
// kept next to the one in play so the owner can compare them turning in 3D.
// All share pieceModel.tsx's Staunton silhouettes; only materials and palette change.
type PieceModelProps = { type: Piece['type']; side: Piece['side']; selected?: boolean; transparent?: boolean }

// 3: the two-tone direction the owner first picked, flat colours.
const ReferencePieceModel = stauntonFinish({
  base: { color: '#2a2420', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  body: {
    red: { color: '#d9432f', roughness: 0.3, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.15 },
    blue: { color: '#3a7cdc', roughness: 0.3, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.15 },
  },
  trim: { color: '#d4a648', roughness: 0.28, metalness: 0.85 },
  glow: { red: '#d9432f', blue: '#3a7cdc' },
})

// 3A. Émail & or: crimson / cobalt enamel shaded from a deep foot to a bright
// head, under a hard glaze; polished gold; black piano-lacquer base.
const EnamelPieceModel = stauntonFinish({
  base: { color: '#141216', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 },
  body: {
    red: { map: enamelTexture('#5e0812', '#e0303a', 11), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04 },
    blue: { map: enamelTexture('#0a1a4a', '#3a78e8', 12), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04 },
  },
  trim: { color: '#f0c25a', roughness: 0.16, metalness: 1 },
  glow: { red: '#e0303a', blue: '#3a78e8' },
})

// 3C. Rubis & saphir: tinted gem glass you can see light through, bright
// silver trim, a black onyx base.
const gem = (color: string, deep: string): Finish['trim'] => ({
  color, roughness: 0.04, metalness: 0, transmission: 0.6, thickness: 0.3, ior: 1.75,
  attenuationColor: deep, attenuationDistance: 0.9, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02,
})
const GemPieceModel = stauntonFinish({
  base: { color: '#0b0b0d', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 },
  body: { red: gem('#ff5464', '#c0182c'), blue: gem('#6a9cff', '#1a4ad0') },
  trim: { color: '#e4e8ee', roughness: 0.14, metalness: 1 },
  glow: { red: '#ff3a4a', blue: '#4a86ff' },
  idleGlow: 0.12,
})

export interface PieceOption {
  id: string
  label: string
  blurb: string
  Model: (props: PieceModelProps) => React.JSX.Element
}

export const PIECE_OPTIONS: PieceOption[] = [
  { id: 'stone', label: '3B — Pierre & bronze (en jeu)', blurb: 'Le modèle branché sur le plateau : jaspe rouge veiné / lapis-lazuli moucheté de pyrite, bronze patiné, socle en noyer tourné.', Model: PieceModel },
  { id: 'bicolor', label: '3 — Staunton bicolore', blurb: 'Socle ébène, corps en couleur unie, collerette et anneaux de Force en laiton.', Model: ReferencePieceModel },
  { id: 'enamel', label: '3A — Émail & or', blurb: 'Émail cramoisi / cobalt dégradé du pied (profond) à la tête (lumineux) sous un glacis dur, or poli, socle en laque noire piano.', Model: EnamelPieceModel },
  { id: 'gem', label: '3C — Rubis & saphir', blurb: 'Verre teinté façon gemme, traversé par la lumière, argent poli, socle en onyx noir.', Model: GemPieceModel },
]
