import { useEffect, useState } from 'react'
import { Board3D, type View } from './ui/Board3D'
import { ConceptBadge, Icon, Logo } from './ui/bits'
import { Home } from './ui/Home'
import { GameOverModal, NewGameModal, RulesModal, randomSeed } from './ui/Modals'
import { PlayerBar } from './ui/PlayerBar'
import { SidePanel } from './ui/SidePanel'
import { useGame, type GameSetup, type Settings } from './ui/useGame'

type Overlay = 'new' | 'rules' | null

export default function App() {
  const [screen, setScreen] = useState<'home' | 'play'>('home')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const game = useGame({ mode: 'random', seed: randomSeed() })

  const start = (s: GameSetup) => {
    game.restart(s)
    setOverlay(null)
    setScreen('play')
  }

  return (
    <>
      {screen === 'home'
        ? <Home onQuickPlay={() => start({ mode: 'random', seed: randomSeed() })} onPlay={() => setOverlay('new')} onRules={() => setOverlay('rules')} />
        : <PlayScreen game={game} onHome={() => setScreen('home')} onNewGame={() => setOverlay('new')} onRules={() => setOverlay('rules')} onStart={start} />}
      {overlay === 'new' && <NewGameModal current={game.setup.mode} onStart={start} onClose={() => setOverlay(null)} />}
      {overlay === 'rules' && <RulesModal onClose={() => setOverlay(null)} />}
    </>
  )
}

function PlayScreen({ game, onHome, onNewGame, onRules, onStart }: {
  game: ReturnType<typeof useGame>; onHome: () => void; onNewGame: () => void; onRules: () => void; onStart: (s: GameSetup) => void
}) {
  const { state } = game
  const [settings, setSettings] = useState<Settings>(() => ({ showHeights: true, showCoords: window.innerWidth >= 1024, autoFlip: false }))
  const [view, setView] = useState<View>('red')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    if (settings.autoFlip && view !== 'top') setView(state.turn)
  }, [state.turn, settings.autoFlip]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!state.result) setReviewing(false) }, [state.result])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'Escape') game.select(null)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); game.undo() }
      else if (e.key === 'f') setView(v => (v === 'blue' ? 'red' : 'blue'))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [game])

  // The near side is whoever the camera sits behind; Red when looking from above.
  const near = view === 'blue' ? 'blue' : 'red'
  const far = near === 'red' ? 'blue' : 'red'

  return (
    <div className="min-h-full lg:h-full flex">
      <nav className="hidden lg:flex flex-col items-center gap-1 w-[104px] bg-rail py-4 shrink-0">
        <button onClick={onHome} className="mb-4 px-2" aria-label="Home"><Logo className="text-[21px]" /></button>
        <RailButton icon="plus" label="New game" onClick={onNewGame} />
        <RailButton icon="book" label="Rules" onClick={onRules} />
        <RailButton icon="home" label="Home" onClick={onHome} />
        <div className="mt-auto px-2 text-center"><ConceptBadge /></div>
      </nav>

      <main className="flex-1 min-w-0 flex flex-col lg:flex-row lg:gap-4 lg:p-4">
        <header className="lg:hidden flex items-center gap-2 px-3 py-2 bg-rail">
          <button onClick={onHome} aria-label="Home"><Logo className="text-2xl" /></button>
          <ConceptBadge />
          <div className="ml-auto flex gap-1">
            <IconButton icon="book" label="Rules" onClick={onRules} />
            <IconButton icon="plus" label="New game" onClick={onNewGame} />
          </div>
        </header>

        <section className="flex-1 min-h-0 min-w-0 flex flex-col gap-1 p-1.5 lg:p-0">
          <PlayerBar state={state} side={far} />
          <div className="relative flex-1 min-h-[240px] rounded-lg overflow-hidden bg-[#262420]">
            <Board3D
              state={state}
              selected={game.selected}
              moves={game.moves}
              hovered={game.hovered}
              view={view}
              showHeights={settings.showHeights}
              showCoords={settings.showCoords}
              onPieceClick={p => game.select(p.id)}
              onMove={game.play}
              onHover={game.setHovered}
              onEmptyClick={() => game.select(null)}
            />
            {game.notice && (
              <div role="status" className="lg:hidden absolute top-2 inset-x-2 rounded-md bg-surface/95 border border-danger/50 text-sm px-3 py-2 shadow-xl">
                {game.notice}
              </div>
            )}
            {state.result && reviewing && (
              <button className="btn btn-primary absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2" onClick={() => setReviewing(false)}>
                Show result
              </button>
            )}
          </div>
          <PlayerBar state={state} side={near} />
        </section>

        <aside className="h-[38dvh] min-h-[300px] lg:min-h-0 lg:h-auto lg:w-[360px] shrink-0 border-t border-line lg:border-0">
          <SidePanel game={game} view={view} setView={setView} settings={settings} setSettings={setSettings} onNewGame={onNewGame} />
        </aside>
      </main>

      {state.result && !reviewing && (
        <GameOverModal state={state} onClose={() => setReviewing(true)} onNewGame={onNewGame}
          onRematch={() => onStart({ ...game.setup })} />
      )}
    </div>
  )
}

function RailButton({ icon, label, onClick }: { icon: 'plus' | 'book' | 'home'; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-[88px] flex flex-col items-center gap-1 py-2.5 rounded-lg text-muted hover:text-fg hover:bg-surface-2 font-display font-bold text-xs">
      <Icon name={icon} size={22} />{label}
    </button>
  )
}

function IconButton({ icon, label, onClick }: { icon: 'plus' | 'book'; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="p-2 rounded-md text-muted hover:text-fg hover:bg-surface-2">
      <Icon name={icon} size={20} />
    </button>
  )
}
