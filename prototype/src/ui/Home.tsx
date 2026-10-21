import { useMemo } from 'react'
import { newGame } from '../game/rules'
import { generateTerrain } from '../game/terrain'
import { Board3D } from './Board3D'
import { setLang, useLang, useT } from '../i18n'
import { ConceptBadge, Icon, Logo } from './bits'

export function Home({ onPlay, onQuickPlay, onComputer, onLearn, onOnline }: {
  onPlay: () => void; onQuickPlay: () => void; onComputer: () => void; onLearn: () => void; onOnline: () => void
}) {
  const t = useT()
  const lang = useLang()
  const showcase = useMemo(() => newGame(generateTerrain('highlands', 7)), [])
  return (
    <div className="min-h-full flex flex-col lg:flex-row">
      <div className="relative h-[42dvh] lg:h-auto lg:flex-1 order-1 lg:order-2">
        <Board3D state={showcase} view="red" showcase />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent lg:hidden pointer-events-none" />
      </div>
      <div className="order-2 lg:order-1 lg:w-[440px] flex flex-col justify-center gap-6 px-6 py-8 lg:px-12">
        <div className="space-y-3">
          <div className="flex items-center justify-between max-w-sm">
            <ConceptBadge />
            <div className="flex rounded-md border border-line overflow-hidden text-xs font-display font-bold" role="group" aria-label={t('language')}>
              {(['en', 'fr'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                  className={`px-2 py-1 ${lang === l ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'}`}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <Logo className="block text-6xl lg:text-7xl" />
          <p className="text-lg text-muted max-w-sm">{t('home.tagline')}</p>
        </div>
        <div className="space-y-2.5 max-w-sm">
          <button className="w-full rounded-lg bg-accent/15 border border-accent/40 hover:bg-accent/25 px-4 py-3 flex items-center gap-3 text-left" onClick={onLearn}>
            <span className="text-accent-hi"><Icon name="learn" size={28} /></span>
            <span className="flex-1">
              <span className="block font-display font-bold">{t('home.learnTitle')}</span>
              <span className="block text-xs text-muted">{t('home.learnBlurb')}</span>
            </span>
          </button>
          <button className="btn btn-primary w-full py-4 text-lg flex items-center justify-center gap-2" onClick={onComputer}>
            <Icon name="cpu" size={20} /> {t('home.computer')}
          </button>
          <button className="btn btn-quiet w-full py-3 flex items-center justify-center gap-2" onClick={onOnline}>
            <Icon name="globe" /> {t('playOnline')}
          </button>
          <button className="btn btn-quiet w-full py-3 flex items-center justify-center gap-2" onClick={onQuickPlay}>
            <Icon name="users" /> {t('home.friend')}
          </button>
          <button className="btn btn-quiet w-full py-3 flex items-center justify-center gap-2" onClick={onPlay}>
            <Icon name="plus" /> {t('home.custom')}
          </button>
        </div>
        <p className="text-xs text-muted max-w-sm">
          {t('home.disclaimer')}
        </p>
      </div>
    </div>
  )
}
