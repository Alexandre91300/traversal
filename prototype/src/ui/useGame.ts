import { useCallback, useMemo, useState } from 'react'
import { apply, isLegal, movesFor, newGame, other, type GameState, type Move, type Side } from '../game/rules'
import { generateTerrain, type TerrainModeId } from '../game/terrain'

export interface GameSetup {
  mode: TerrainModeId
  seed: number
}

export interface Settings {
  showHeights: boolean
  showCoords: boolean
  autoFlip: boolean
}

export function useGame(initial: GameSetup) {
  const [setup, setSetup] = useState(initial)
  const [history, setHistory] = useState<GameState[]>(() => [newGame(generateTerrain(initial.mode, initial.seed))])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hovered, setHovered] = useState<Move | null>(null)
  const [resigned, setResigned] = useState<Side | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const base = history[history.length - 1]
  const state: GameState = resigned && !base.result
    ? { ...base, result: { kind: 'win', winner: other(resigned), reason: 'resign' } }
    : base

  const selected = state.pieces.find(p => p.id === selectedId) ?? null
  const moves = useMemo(() => (selected && !state.result ? movesFor(state, selected) : []), [state, selected])

  const clearTransient = () => { setSelectedId(null); setHovered(null) }

  const select = useCallback((id: string | null) => {
    setHovered(null)
    setNotice(null)
    if (!id) return setSelectedId(null)
    const p = state.pieces.find(q => q.id === id)
    if (!p || state.result) return
    if (p.side !== state.turn) {
      setNotice(`It's ${state.turn === 'red' ? 'Red' : 'Blue'}'s turn. Select one of your own pieces.`)
      return
    }
    setSelectedId(prev => (prev === id ? null : id))
  }, [state])

  const play = useCallback((m: Move) => {
    if (!isLegal(m)) {
      const c = m.capture!
      setNotice(`Attack not possible: ${c.attack} attack is lower than ${c.defense} defense.`)
      return
    }
    setHistory(h => [...h, apply(h[h.length - 1], m)])
    setNotice(null)
    clearTransient()
  }, [])

  const undo = useCallback(() => {
    setResigned(null)
    setHistory(h => (h.length > 1 ? h.slice(0, -1) : h))
    setNotice(null)
    clearTransient()
  }, [])

  const restart = useCallback((next: GameSetup) => {
    setSetup(next)
    setHistory([newGame(generateTerrain(next.mode, next.seed))])
    setResigned(null)
    setNotice(null)
    clearTransient()
  }, [])

  const resign = useCallback(() => { setResigned(base.turn); clearTransient() }, [base.turn])

  return {
    setup, state, selected, moves, hovered, setHovered, notice, setNotice,
    select, play, undo, restart, resign, canUndo: history.length > 1,
  }
}

export type Game = ReturnType<typeof useGame>
