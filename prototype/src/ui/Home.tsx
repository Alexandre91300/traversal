import { useMemo } from 'react'
import { newGame } from '../game/rules'
import { generateTerrain } from '../game/terrain'
import { Board3D } from './Board3D'
import { ConceptBadge, Icon, Logo } from './bits'

export function Home({ onPlay, onQuickPlay, onRules }: { onPlay: () => void; onQuickPlay: () => void; onRules: () => void }) {
  const showcase = useMemo(() => newGame(generateTerrain('highlands', 7)), [])
  return (
    <div className="min-h-full flex flex-col lg:flex-row">
      <div className="relative h-[46dvh] lg:h-auto lg:flex-1 order-1 lg:order-2">
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
          <button className="btn btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" onClick={onQuickPlay}>
            <Icon name="play" size={20} /> Play local game
          </button>
          <button className="btn btn-quiet w-full py-3 flex items-center justify-center gap-2" onClick={onPlay}>
            <Icon name="plus" /> Choose terrain…
          </button>
          <button className="btn btn-quiet w-full py-3 flex items-center justify-center gap-2" onClick={onRules}>
            <Icon name="book" /> How to play
          </button>
        </div>
        <p className="text-xs text-muted max-w-sm">
          A design proposal for traversalgame.com, not affiliated with or endorsed by its creator. Two players share this device.
        </p>
      </div>
    </div>
  )
}
