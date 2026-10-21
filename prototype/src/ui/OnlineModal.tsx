import { useState } from 'react'
import { TERRAIN_MODES, type TerrainModeId } from '../game/terrain'
import { Icon, Modal } from './bits'
import { randomSeed } from './Modals'
import { newCode, useLobby } from './online'
import type { GameSetup } from './useGame'

export function OnlineModal({ onStart, onClose }: { onStart: (s: GameSetup) => void; onClose: () => void }) {
  const { status, games, nameOf, seatOf } = useLobby()
  const [mode, setMode] = useState<TerrainModeId>('random')
  const modeName = (id: TerrainModeId) => TERRAIN_MODES.find(m => m.id === id)?.name ?? 'Random'

  return (
    <Modal label="Play online" onClose={onClose}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <div>
          <h2 className="font-extrabold text-lg">Play online</h2>
          <p className="text-xs text-muted">Against someone you share this page with</p>
        </div>
        <button className="p-2 rounded hover:bg-surface-2" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
      </div>

      {status === 'connecting' && <p className="p-5 text-sm text-muted">Connecting…</p>}

      {status === 'unavailable' && (
        <div className="p-5 space-y-2 text-sm">
          <p className="font-bold">Online play isn't available here.</p>
          <p className="text-muted">It runs on the page published on claude.ai, for people signed in who can open it. Open the shared link there, or invite your opponent from the page's Share menu.</p>
        </div>
      )}

      {status === 'ready' && (
        <div className="p-4 space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-bold">Start a game</h3>
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Terrain</span>
                <select value={mode} onChange={e => setMode(e.target.value as TerrainModeId)}
                  className="w-full h-full rounded-lg bg-surface-2 border border-line px-3 py-2.5 text-sm">
                  {TERRAIN_MODES.map(m => <option key={m.id} value={m.id}>{m.name} · {m.blurb}</option>)}
                </select>
              </label>
              <button className="btn btn-primary px-5 py-2.5"
                onClick={() => onStart({ mode, seed: randomSeed(), online: { code: newCode(), side: 'red' } })}>
                Create
              </button>
            </div>
            <p className="text-xs text-muted">You play Red and move first. Your opponent opens this same page and picks your game below.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold">Games on this page</h3>
            {games.length === 0 && <p className="text-sm text-muted rounded-lg bg-surface-2/50 px-3 py-3">No games yet. Create one, then send this page's link.</p>}
            <ul className="space-y-1.5">
              {games.map(g => {
                const seat = seatOf(g)
                const open = !g.blue
                return (
                  <li key={g.code} className="flex items-center gap-3 rounded-lg bg-surface-2/60 px-3 py-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: open ? 'var(--color-accent)' : 'var(--color-muted)' }} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      {/* Names come from the platform's profile lookup, never from presence. */}
                      <div className="font-display font-bold text-sm truncate">
                        {open ? `${nameOf(g.red)} is waiting` : `${nameOf(g.red)} vs ${nameOf(g.blue)}`}
                      </div>
                      <div className="text-xs text-muted">{modeName(g.mode)} terrain</div>
                    </div>
                    {seat ? (
                      <button className="btn btn-primary px-4 py-2 text-sm" onClick={() => onStart({ mode: g.mode, seed: g.seed, online: { code: g.code, side: seat } })}>Resume</button>
                    ) : open ? (
                      <button className="btn btn-primary px-4 py-2 text-sm" onClick={() => onStart({ mode: g.mode, seed: g.seed, online: { code: g.code, side: 'blue' } })}>Join</button>
                    ) : (
                      <span className="text-xs text-muted font-display font-bold">In progress</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  )
}
