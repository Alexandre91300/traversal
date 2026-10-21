import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chooseMove, LEVELS, type Level } from '../game/ai'
import AiWorker from '../game/ai.worker?worker&inline'
import { encodeMove, replay, type MoveRef } from '../game/replay'
import { isLegal, movesFor, newGame, other, type GameState, type Move, type Side } from '../game/rules'
import { generateTerrain, type TerrainModeId } from '../game/terrain'

export interface GameSetup {
  mode: TerrainModeId
  seed: number
  computer?: Level // absent: two players share the device
  online?: { code: string; side: Side } // a game shared with a remote opponent
}

export interface Settings {
  showHeights: boolean
  showCoords: boolean
  autoFlip: boolean
}

// Against the computer the human always plays Red and moves first.
export const HUMAN: Side = 'red'
// Even instant replies wait this long, so the human sees their own move land first.
const MIN_THINK_MS = 650

export function useGame(initial: GameSetup) {
  const [setup, setSetup] = useState(initial)
  // A game is its starting position plus the Moves played, as refs (see replay.ts).
  const start = useMemo(() => newGame(generateTerrain(setup.mode, setup.seed)), [setup])
  const [log, setLog] = useState<MoveRef[]>([])
  const history = useMemo(() => replay(start, log), [start, log])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hovered, setHovered] = useState<Move | null>(null)
  const [resigned, setResigned] = useState<Side | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const base = history[history.length - 1]
  const state: GameState = resigned && !base.result
    ? { ...base, result: { kind: 'win', winner: other(resigned), reason: 'resign' } }
    : base
  const thinking = !!setup.computer && state.turn !== HUMAN && !state.result
  // The side this device plays, when it plays only one.
  const mySide: Side | null = setup.computer ? HUMAN : setup.online?.side ?? null
  const waiting = !!setup.online && state.turn !== mySide && !state.result

  const selected = state.pieces.find(p => p.id === selectedId) ?? null
  const moves = useMemo(() => (selected && !state.result ? movesFor(state, selected) : []), [state, selected])

  const clearTransient = () => { setSelectedId(null); setHovered(null) }

  const worker = useRef<Worker | null>(null)
  const request = useRef(0)
  useEffect(() => () => worker.current?.terminate(), [])

  useEffect(() => {
    if (!thinking) return
    const id = ++request.current
    const level = setup.computer!
    const started = performance.now()
    let timer = 0
    const answer = (move: Move | null) => {
      // Stale answers (after an undo or restart) are dropped.
      if (id !== request.current || !move) return
      timer = window.setTimeout(() => {
        if (id !== request.current) return
        setLog(l => [...l, encodeMove(start, move)])
      }, Math.max(0, MIN_THINK_MS - (performance.now() - started)))
    }
    // Where workers are blocked (e.g. a strict CSP), think on the main thread instead.
    const inline = () => {
      const { depth, margin } = LEVELS[level]
      timer = window.setTimeout(() => answer(chooseMove(base, { depth, margin })), 50)
    }
    try {
      const w = (worker.current ??= new AiWorker())
      w.onmessage = (e: MessageEvent<{ id: number; move: Move | null }>) => e.data.id === id && answer(e.data.move)
      w.onerror = () => {
        worker.current?.terminate()
        worker.current = null
        inline()
      }
      w.postMessage({ id, state: base, level })
    } catch {
      inline()
    }
    return () => { request.current++; clearTimeout(timer) }
  }, [thinking, base, start, setup.computer])

  const select = useCallback((id: string | null) => {
    setHovered(null)
    setNotice(null)
    if (!id) return setSelectedId(null)
    const p = state.pieces.find(q => q.id === id)
    if (!p || state.result) return
    if (thinking || waiting) {
      setNotice(thinking ? 'The computer is thinking…' : 'Waiting for your opponent to move…')
      return
    }
    if (p.side !== state.turn) {
      setNotice(`It's ${state.turn === 'red' ? 'Red' : 'Blue'}'s turn. Select one of your own pieces.`)
      return
    }
    setSelectedId(prev => (prev === id ? null : id))
  }, [state, thinking, waiting])

  const play = useCallback((m: Move) => {
    if (!isLegal(m)) {
      const c = m.capture!
      setNotice(`Attack not possible: ${c.attack} attack is lower than ${c.defense} defense.`)
      return
    }
    setLog(l => [...l, encodeMove(start, m)])
    setNotice(null)
    clearTransient()
  }, [start])

  const undo = useCallback(() => {
    setResigned(null)
    let n = history.length - 1
    // Online, both players hold the record: no take-backs.
    if (n < 1 || setup.online) return
    // Against the computer, step back to the human's previous turn.
    if (setup.computer) while (n > 1 && history[n - 1].turn !== HUMAN) n--
    setLog(log.slice(0, n - 1))
    setNotice(null)
    clearTransient()
  }, [history, log, setup.computer, setup.online])

  // Online: take the opponent's Moves when their record extends ours.
  const adopt = useCallback((refs: readonly MoveRef[]) => {
    setLog(l => (refs.length > l.length && l.every((r, i) => refs[i] === r) ? [...refs] : l))
  }, [])

  const restart = useCallback((next: GameSetup) => {
    setSetup(next)
    setLog([])
    setResigned(null)
    setNotice(null)
    clearTransient()
  }, [])

  const resign = useCallback(() => {
    setResigned(mySide ?? base.turn)
    clearTransient()
  }, [base.turn, mySide])

  return {
    setup, state, log, selected, moves, hovered, setHovered, notice, setNotice, thinking, waiting, mySide, resigned,
    select, play, undo, restart, resign, adopt, setResigned,
    canUndo: history.length > 1 && !setup.online,
  }
}

export type Game = ReturnType<typeof useGame>
