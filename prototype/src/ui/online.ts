// Online play over the claude.ai artifact runtime's `room` capability.
//
// Everything travels as PRESENCE, never events: presence is open to every
// viewer the page is shared with (outside guests included), whereas events
// and the db need Contributor rights. Each player keeps their whole Move
// record in presence; the other side adopts it when it extends theirs, and
// replay() re-checks every Move, so a bad record is simply ignored.
//
// - Lobby (the artifact's main room): each player advertises `game`, so
//   anyone opening the link sees open games and can join or resume one.
// - Game room `g-<code>`: `side`, `moves`, `resigned`, and from Red the
//   `blue` seat claim that settles who got in first.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MoveRef } from '../game/replay'
import { other, type Side } from '../game/rules'
import type { TerrainModeId } from '../game/terrain'
import type { Game } from './useGame'

// The slice of the runtime contract this page uses (see the artifact
// capability type definitions, contract 0.2.88).
type Json = unknown
interface Peer {
  peer: string
  by: string | null
  isMe: boolean
  sameTab: boolean
  kind: 'viewer' | 'agent'
  presence: Readonly<Record<string, Json>>
}
interface PeersChange { peers: readonly Peer[] }
type OnError = (e: { code: string; message: string }) => void
interface RoomLike {
  presence(patch: Record<string, Json | null>): Promise<void>
  peers(): readonly Peer[]
  onPeers(handler: (c: PeersChange) => void, onError?: OnError): () => void
}
interface Room extends RoomLike {
  join(name: string): Promise<RoomLike & { leave(): Promise<void> }>
}
interface Profile { id: string; name: string; avatarUrl: string }
interface User {
  id(): Promise<string | null>
  profiles(ids: readonly string[]): Promise<Record<string, Profile>>
}
declare global {
  interface Window { claude?: { use(name: string): Promise<unknown> } }
}

const use = <T,>(name: string): Promise<T | null> =>
  window.claude?.use ? window.claude.use(name).then(v => (v ?? null) as T | null, () => null) : Promise.resolve(null)

let runtime: Promise<{ room: Room; user: User | null } | null> | null = null
function connect() {
  runtime ??= Promise.all([use<Room>('room'), use<User>('user')]).then(([room, user]) => (room ? { room, user } : null))
  return runtime
}

// Who a seat belongs to: this open page, and the account when the platform
// vouches for it, so a player who reloads can take their seat back.
export interface Claim { peer: string; by: string | null }
const holds = (claim: Claim | null | undefined, p: Peer, peers: readonly Peer[]) =>
  !!claim && (claim.peer === p.peer || (!!claim.by && claim.by === p.by && !peers.some(q => q.peer === claim.peer)))

export interface LobbyGame {
  code: string
  mode: TerrainModeId
  seed: number
  red: Claim | null
  blue: Claim | null
}

const isClaim = (v: unknown): v is Claim =>
  !!v && typeof v === 'object' && typeof (v as Claim).peer === 'string' && ((v as Claim).by === null || typeof (v as Claim).by === 'string')

// Presence is other people's input: keep only well-formed fields.
function readGame(v: unknown): LobbyGame | null {
  if (!v || typeof v !== 'object') return null
  const g = v as Record<string, unknown>
  if (typeof g.code !== 'string' || !/^[a-z0-9]{6}$/.test(g.code) || typeof g.mode !== 'string' || typeof g.seed !== 'number') return null
  return {
    code: g.code, mode: g.mode as TerrainModeId, seed: g.seed,
    red: isClaim(g.red) ? g.red : null, blue: isClaim(g.blue) ? g.blue : null,
  }
}

const readMoves = (v: unknown): MoveRef[] => (typeof v === 'string' && v.length <= 800 ? v.match(/.{4}/g) ?? [] : [])

export const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')

export type Status = 'connecting' | 'ready' | 'unavailable'

// This page's own claim, once the room has told it its peer label.
function useMe(room: Room | null, user: User | null) {
  const [me, setMe] = useState<Claim | null>(null)
  useEffect(() => {
    if (!room) return
    let by: string | null = null
    let alive = true
    const update = () => {
      const self = room.peers().find(p => p.sameTab)
      if (self && alive) setMe(m => (m?.peer === self.peer && m.by === by ? m : { peer: self.peer, by }))
    }
    user?.id().then(id => { by = id; update() })
    const off = room.onPeers(update)
    update()
    return () => { alive = false; off() }
  }, [room, user])
  return me
}

// `enabled: false` stays offline: local games never touch the runtime.
export function useRuntime(enabled = true) {
  const [rt, setRt] = useState<{ room: Room; user: User | null } | null>(null)
  const [status, setStatus] = useState<Status>('connecting')
  useEffect(() => {
    if (!enabled) return
    let alive = true
    connect().then(r => {
      if (!alive) return
      setRt(r)
      setStatus(r ? 'ready' : 'unavailable')
    })
    return () => { alive = false }
  }, [enabled])
  const me = useMe(rt?.room ?? null, rt?.user ?? null)
  return { status, room: rt?.room ?? null, user: rt?.user ?? null, me }
}

// Open and in-progress games, merged from every player's advertisement.
export function useLobby() {
  const { status, room, user, me } = useRuntime()
  const [games, setGames] = useState<LobbyGame[]>([])
  const [present, setPresent] = useState<ReadonlySet<string>>(new Set())
  const [names, setNames] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!room) return
    return room.onPeers(({ peers }) => {
      const byCode = new Map<string, LobbyGame>()
      for (const p of peers) {
        const g = p.sameTab ? null : readGame(p.presence.game)
        if (!g) continue
        const prev = byCode.get(g.code)
        byCode.set(g.code, prev ? { ...prev, red: prev.red ?? g.red, blue: prev.blue ?? g.blue } : g)
      }
      setGames([...byCode.values()])
      setPresent(new Set(peers.map(p => p.peer)))
    })
  }, [room])
  useEffect(() => {
    const ids = [...new Set(games.flatMap(g => [g.red?.by, g.blue?.by]).filter((id): id is string => !!id))]
    if (!user || !ids.length) return
    user.profiles(ids).then(ps => setNames(Object.fromEntries(ids.map(id => [id, ps[id]?.name || '']))))
  }, [user, games])
  const nameOf = (c: Claim | null) => (c?.by && names[c.by]) || 'Someone'
  // A seat this viewer's account held on a page that has since gone away
  // (a reload); while that page is still open, it is someone else's seat.
  const vacated = (c: Claim | null) => !!me?.by && c?.by === me.by && !present.has(c.peer)
  const seatOf = (g: LobbyGame): Side | null => (vacated(g.red) ? 'red' : vacated(g.blue) ? 'blue' : null)
  return { status, games, me, nameOf, seatOf }
}

export interface OnlineStatus {
  opponentHere: boolean
  opponentName: string
  lockedOut: boolean // someone else took the Blue seat first
}

// Keeps one online game in step with the opponent while it is on screen.
export function useOnlineSync(game: Game): OnlineStatus | null {
  const online = game.setup.online
  const { room, user, me } = useRuntime(!!online)
  const [named, setNamed] = useState<(RoomLike & { leave(): Promise<void> }) | null>(null)
  const [opponent, setOpponent] = useState<Peer | null>(null)
  const [lockedOut, setLockedOut] = useState(false)
  const [opponentName, setOpponentName] = useState('')
  const blueSeat = useRef<Claim | null>(null)
  const { adopt, setResigned } = game

  useEffect(() => {
    if (!room || !online) return
    let alive = true
    let joined: (RoomLike & { leave(): Promise<void> }) | null = null
    room.join(`g-${online.code}`).then(r => {
      if (!alive) return void r.leave()
      joined = r
      setNamed(r)
    }, () => {})
    return () => {
      alive = false
      joined?.leave()
      setNamed(null)
      setOpponent(null)
      setLockedOut(false)
      blueSeat.current = null
      room.presence({ game: null }).catch(() => {})
    }
  }, [room, online?.code, online?.side]) // eslint-disable-line react-hooks/exhaustive-deps

  // Hear the opponent.
  useEffect(() => {
    if (!named || !online) return
    const mine = online.side
    return named.onPeers(({ peers }) => {
      const theirs = peers.filter(p => !p.sameTab && p.kind === 'viewer' && p.presence.side === other(mine))
      let opp: Peer | null = null
      if (mine === 'red') {
        // First Blue to arrive gets the seat; a returning account may retake it.
        opp = theirs.find(p => holds(blueSeat.current, p, peers)) ?? null
        if (!opp && theirs.length) {
          opp = theirs[0]
          blueSeat.current = { peer: opp.peer, by: opp.by }
        }
      } else {
        opp = theirs[0] ?? null
        const seat = opp && isClaim(opp.presence.blue) ? opp.presence.blue : null
        const self = peers.find(p => p.sameTab)
        setLockedOut(!!seat && !!self && !holds(seat, self, peers))
      }
      setOpponent(opp)
      if (opp) {
        adopt(readMoves(opp.presence.moves))
        if (opp.presence.resigned === true) setResigned(other(mine))
      }
    })
  }, [named, online, adopt, setResigned])

  // Tell the opponent (and the lobby) where this side stands.
  const record = game.log.join('')
  const iResigned = game.resigned === online?.side
  useEffect(() => {
    if (!named || !online || lockedOut) return
    named.presence({
      side: online.side,
      moves: record,
      resigned: iResigned,
      blue: online.side === 'red' ? blueSeat.current : null,
    }).catch(() => {})
  }, [named, online, record, iResigned, lockedOut, opponent])

  useEffect(() => {
    if (!room || !online || !me || lockedOut) return
    // Red keeps advertising a Blue who stepped away, so the game doesn't look open.
    const theirs = opponent ? { peer: opponent.peer, by: opponent.by } : online.side === 'red' ? blueSeat.current : null
    const { mode, seed } = game.setup
    room.presence({
      game: game.state.result ? null : {
        code: online.code, mode, seed,
        red: online.side === 'red' ? me : theirs,
        blue: online.side === 'blue' ? me : theirs,
      },
    }).catch(() => {})
  }, [room, online, me, opponent, lockedOut, game.setup, !!game.state.result]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !opponent?.by) return setOpponentName('')
    user.profiles([opponent.by]).then(ps => setOpponentName(ps[opponent.by!]?.name || ''))
  }, [user, opponent?.by]) // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => (online ? { opponentHere: !!opponent, opponentName, lockedOut } : null), [online, opponent, opponentName, lockedOut])
}
