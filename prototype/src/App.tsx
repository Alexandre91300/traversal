import { useEffect, useState } from 'react'
import { Board3D, type View } from './ui/Board3D'
import { ConceptBadge, Icon, Logo, usePlayerNames, SIDE_HEX } from './ui/bits'
import { useT } from './i18n'
import { Home } from './ui/Home'
import { GameOverModal, NewGameModal, RulesModal, randomSeed } from './ui/Modals'
import { useOnlineSync, type OnlineStatus } from './ui/online'
import { OnlineModal } from './ui/OnlineModal'
import { PlayerBar } from './ui/PlayerBar'
import { SidePanel } from './ui/SidePanel'
import { Tutorial } from './ui/Tutorial'
import { other } from './game/rules'
import { HUMAN, useGame, type GameSetup, type Settings } from './ui/useGame'

type Overlay = 'new' | 'rules' | 'online' | null

export default function App() {
  const [screen, setScreen] = useState<'home' | 'play' | 'learn'>('home')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const game = useGame({ mode: 'random', seed: randomSeed() })

  const start = (s: GameSetup) => {
    game.restart(s)
    setOverlay(null)
    setScreen('play')
  }

  const quick = (computer?: GameSetup['computer']) => start({ mode: 'random', seed: randomSeed(), computer })
  const learn = () => {
    setOverlay(null)
    setScreen('learn')
  }

  return (
    <>
      {screen === 'home'
        ? <Home onLearn={learn} onComputer={() => quick('normal')} onQuickPlay={() => quick()} onPlay={() => setOverlay('new')} onOnline={() => setOverlay('online')} />
        : screen === 'learn'
          ? <Tutorial onExit={() => setScreen('home')} onPlay={quick} />
          : <PlayScreen game={game} onHome={() => setScreen('home')} onNewGame={() => setOverlay('new')} onRules={() => setOverlay('rules')} onLearn={learn} onOnline={() => setOverlay('online')} onStart={start} />}
      {overlay === 'new' && <NewGameModal current={game.setup} onStart={start} onClose={() => setOverlay(null)} />}
      {overlay === 'rules' && <RulesModal onClose={() => setOverlay(null)} onLearn={learn} />}
      {overlay === 'online' && <OnlineModal onStart={start} onClose={() => setOverlay(null)} />}
    </>
  )
}

function PlayScreen({ game, onHome, onNewGame, onRules, onLearn, onOnline, onStart }: {
  game: ReturnType<typeof useGame>; onHome: () => void; onNewGame: () => void; onRules: () => void; onLearn: () => void
  onOnline: () => void; onStart: (s: GameSetup) => void
}) {
  const { state, mySide } = game
  const { computer, online } = game.setup
  const t = useT()
  const net = useOnlineSync(game)
  const localNames = usePlayerNames(computer)
  const names = online
    ? { [online.side]: t('you'), [other(online.side)]: net?.opponentName || t('opponent') } as typeof localNames
    : localNames
  const [settings, setSettings] = useState<Settings>(() => ({ showHeights: true, showCoords: window.innerWidth >= 1024, autoFlip: false }))
  const [view, setView] = useState<View>(mySide ?? 'red')
  const [reviewing, setReviewing] = useState(false)

  // Each new game starts from the side this device plays.
  useEffect(() => setView(mySide ?? 'red'), [game.setup]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // When this device plays one side, the board stays on that side.
    if (settings.autoFlip && view !== 'top' && !mySide) setView(state.turn)
  }, [state.turn, settings.autoFlip]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!state.result) setReviewing(false) }, [state.result])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'Escape') game.select(null)
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); game.undo() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); game.step(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); game.step(1) }
      else if (e.key === 'ArrowUp' || e.key === 'Home') { e.preventDefault(); game.goTo(0) }
      else if (e.key === 'ArrowDown' || e.key === 'End') { e.preventDefault(); game.goTo(null) }
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
        <button onClick={onHome} className="mb-4 px-2" aria-label={t('home')}><Logo className="text-[21px]" /></button>
        <RailButton icon="plus" label={t('newGame')} onClick={onNewGame} />
        <RailButton icon="book" label={t('rules')} onClick={onRules} />
        <RailButton icon="globe" label={t('online')} onClick={onOnline} />
        <RailButton icon="learn" label={t('learn')} onClick={onLearn} />
        <RailButton icon="home" label={t('home')} onClick={onHome} />
        <div className="mt-auto px-2 text-center"><ConceptBadge /></div>
      </nav>

      <main className="flex-1 min-w-0 flex flex-col lg:flex-row lg:gap-4 lg:p-4">
        <header className="lg:hidden flex items-center gap-2 px-3 py-2 bg-rail">
          <button onClick={onHome} aria-label={t('home')}><Logo className="text-2xl" /></button>
          <ConceptBadge />
          <div className="ml-auto flex gap-1">
            <IconButton icon="globe" label={t('playOnline')} onClick={onOnline} />
            <IconButton icon="book" label={t('rules')} onClick={onRules} />
            <IconButton icon="plus" label={t('newGame')} onClick={onNewGame} />
          </div>
        </header>

        <section className="flex-1 min-h-0 min-w-0 flex flex-col gap-1 p-1.5 lg:p-0">
          <PlayerBar state={game.shown} side={far} name={names[far]} computer={!!computer && far !== HUMAN} thinking={game.thinking} />
          <div className="relative flex-1 min-h-[240px] rounded-lg overflow-hidden bg-[#262420]">
            <Board3D
              state={game.shown}
              selected={game.selected}
              ghost={!game.canPlay}
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
              <div role="status" className="lg:hidden absolute top-14 inset-x-2 rounded-md bg-surface/95 border border-danger/50 text-sm px-3 py-2 shadow-xl">
                {game.notice}
              </div>
            )}
            <TurnBanner game={game} net={net} />
            {state.result && reviewing && (
              <button className="btn btn-primary absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2" onClick={() => setReviewing(false)}>
                {t('board.showResult')}
              </button>
            )}
          </div>
          <PlayerBar state={game.shown} side={near} name={names[near]} computer={!!computer && near !== HUMAN} thinking={game.thinking} />
        </section>

        <aside className="h-[38dvh] min-h-[300px] lg:min-h-0 lg:h-auto lg:w-[360px] shrink-0 border-t border-line lg:border-0">
          <SidePanel game={game} view={view} setView={setView} settings={settings} setSettings={setSettings} onNewGame={onNewGame} />
        </aside>
      </main>

      {state.result && !reviewing && (
        <GameOverModal state={state} names={names} mySide={mySide} onClose={() => setReviewing(true)}
          onNewGame={online ? onOnline : onNewGame}
          onRematch={online ? undefined : () => onStart({ ...game.setup })} />
      )}
    </div>
  )
}

function RailButton({ icon, label, onClick }: { icon: 'plus' | 'book' | 'home' | 'learn' | 'globe'; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-[88px] flex flex-col items-center gap-1 py-2.5 rounded-lg text-muted hover:text-fg hover:bg-surface-2 font-display font-bold text-xs">
      <Icon name={icon} size={22} />{label}
    </button>
  )
}

function IconButton({ icon, label, onClick }: { icon: 'plus' | 'book' | 'globe'; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="p-2 rounded-md text-muted hover:text-fg hover:bg-surface-2">
      <Icon name={icon} size={20} />
    </button>
  )
}

// Whose turn it is, said loudly above the board; also the waiting and review states.
function TurnBanner({ game, net }: { game: ReturnType<typeof useGame>; net: OnlineStatus | null }) {
  const { state, mySide } = game
  const t = useT()
  const box = 'absolute top-2 left-1/2 -translate-x-1/2 w-max max-w-[92%] rounded-full shadow-xl font-display font-bold text-sm px-4 py-2 flex items-center gap-2'
  if (net?.lockedOut) return (
    <div role="status" className={`${box} bg-surface/95 border border-line`}>{t('banner.locked')} <span className="text-muted font-normal">{t('banner.lockedHint')}</span></div>
  )
  if (net && !net.opponentHere && !state.result) return (
    <div role="status" className={`${box} bg-surface/95 border border-line flex-col !gap-0 !rounded-xl text-center`}>
      <span className="thinking">{t('banner.waiting')}</span>
      <span className="text-muted text-xs font-normal font-body">
        {t(game.log.length ? 'banner.left' : 'banner.share')}
      </span>
    </div>
  )
  if (game.reviewing) return (
    <div role="status" className={`${box} bg-gold text-[#2b2310]`}>
      {game.ply ? t('banner.reviewing', { n: game.ply, total: game.plies }) : t('banner.reviewStart')}
      <button className="rounded-full bg-[#2b2310] text-gold px-2.5 py-0.5 text-xs" onClick={() => game.goTo(null)}>{t('banner.live')}</button>
    </div>
  )
  if (state.result) return null
  const mine = !mySide || state.turn === mySide
  const label = !mySide ? t('banner.toMove', { side: t(`side.${state.turn}`) })
    : t(mine ? 'banner.yourMove' : game.thinking ? 'banner.computer' : 'banner.opponent')
  return (
    // Keyed on the turn so it pops each time the turn changes hands.
    <div key={state.turn + game.plies} role="status" aria-live="polite"
      className={`${box} turn-pop ${mine ? 'text-white turn-glow' : 'bg-surface/95 border border-line text-muted'}`}
      style={mine ? { background: mySide ? 'var(--color-accent)' : SIDE_HEX[state.turn] } : undefined}>
      <span className={`w-2.5 h-2.5 rounded-full ${mine ? 'bg-white' : ''}`} style={mine ? undefined : { background: SIDE_HEX[state.turn] }} aria-hidden="true" />
      <span className={mine ? '' : 'thinking'}>{label}</span>
    </div>
  )
}
