import { useMemo } from 'react'
import { newGame } from '../game/rules'
import { generateTerrain } from '../game/terrain'
import { Board3D } from './Board3D'
import { ConceptBadge, Icon, Logo } from './bits'

export function Home({ onPlay, onQuickPlay, onComputer, onLearn }: {
  onPlay: () => void; onQuickPlay: () => void; onComputer: () => void; onLearn: () => void
}) {
  const showcase = useMemo(() => newGame(generateTerrain('highlands', 7)), [])
  return (
    <div className="min-h-full flex flex-col lg:flex-row">
      <div className="relative h-[42dvh] lg:h-auto lg:flex-1 order-1 lg:order-2">
        <Board3D state={showcase} view="red" showcase />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent lg:hidden pointer-events-none" />
      </div>
      <div className="order-2 lg:order-1 lg:w-[440px] flex flex-col justify-center gap-6 px-6 py-8 lg:px-12">
        <div className="space-y-3">
          <ConceptBadge />
          <Logo className="block text-6xl lg:text-7xl" />
          <p className="text-lg text-muted max-w-sm">
            Race your pieces across a shifting landscape. Every climb costs Movement; every height is an edge in a fight.
          </p>
        </div>
        <div className="space-y-2.5 max-w-sm">
          <button className="w-full rounded-lg bg-accent/15 border border-accent/40 hover:bg-accent/25 px-4 py-3 flex items-center gap-3 text-left" onClick={onLearn}>
            <span className="text-accent-hi"><Icon name="learn" size={28} /></span>
            <span className="flex-1">
              <span className="block font-display font-bold">New here? Learn to play</span>
              <span className="block text-xs text-muted">Seven quick lessons on a real board, about two minutes.</span>
            </span>
          </button>
          <button className="btn btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" onClick={onComputer}>
            <Icon name="cpu" size={20} /> Play the computer
          </button>
          <button className="btn btn-quiet w-full py-3 flex items-center justify-center gap-2" onClick={onQuickPlay}>
            <Icon name="users" /> Play a friend on this device
          </button>
          <button className="btn btn-quiet w-full py-3 flex items-center justify-center gap-2" onClick={onPlay}>
            <Icon name="plus" /> Custom game…
          </button>
        </div>
        <p className="text-xs text-muted max-w-sm">
          A design proposal for traversalgame.com, not affiliated with or endorsed by its creator.
        </p>
      </div>
    </div>
  )
}
