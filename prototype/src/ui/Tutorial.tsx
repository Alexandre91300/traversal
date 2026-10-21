import { useEffect, useMemo, useState } from 'react'
import type { Level } from '../game/ai'
import { LESSONS, lessonState, playLesson } from '../game/lessons'
import { isLegal, movesFor, type GameState, type Move } from '../game/rules'
import { useT, useText } from '../i18n'
import { Board3D } from './Board3D'
import { ConceptBadge, Icon, Logo } from './bits'
import { CombatCard, MoveCard } from './SidePanel'

// Guided Lessons on a real board: the player learns each rule by playing it.
export function Tutorial({ onExit, onPlay }: { onExit: () => void; onPlay: (computer?: Level) => void }) {
  const [index, setIndex] = useState(0)
  const lesson = LESSONS[index]
  const t = useT()
  const tx = useText()
  const [state, setState] = useState<GameState>(() => lessonState(lesson))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hovered, setHovered] = useState<Move | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const last = index === LESSONS.length - 1

  const load = (i: number) => {
    setIndex(i)
    setState(lessonState(LESSONS[i]))
    setSelectedId(null)
    setHovered(null)
    setNotice(null)
    setDone(false)
  }

  const selected = state.pieces.find(p => p.id === selectedId) ?? null
  const moves = useMemo(() => (selected && !done ? movesFor(state, selected) : []), [state, selected, done])

  const select = (id: string | null) => {
    setHovered(null)
    setNotice(null)
    if (!id || done) return setSelectedId(null)
    setSelectedId(prev => (prev === id ? null : id))
  }

  const play = (m: Move) => {
    if (selected?.side !== 'red') return setNotice(t('tut.looking'))
    if (!isLegal(m)) {
      const c = m.capture!
      return setNotice(t('notice.attack', { a: c.attack, d: c.defense }))
    }
    const next = playLesson(state, m)
    const verdict = lesson.check(next, m)
    if (verdict !== 'done' && verdict !== 'ok') return setNotice(tx(verdict))
    setState(next)
    setSelectedId(null)
    setHovered(null)
    setNotice(null)
    if (verdict === 'done') setDone(true)
  }

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
      else if (e.key === 'Enter' && done && !last) load(index + 1)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })

  const preview = hovered && selected ? hovered : null

  return (
    <div className="min-h-full lg:h-full flex flex-col">
      <header className="flex items-center gap-3 px-4 py-2.5 bg-rail">
        <button onClick={onExit} aria-label={t('home')}><Logo className="text-2xl" /></button>
        <ConceptBadge />
        <span className="hidden sm:block font-display font-bold text-sm text-muted">{t('tut.learn')}</span>
        <button onClick={onExit} className="ml-auto text-sm text-muted hover:text-fg font-display font-bold flex items-center gap-1.5">
          <Icon name="x" size={16} /> {t('tut.exit')}
        </button>
      </header>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row lg:gap-4 lg:p-4">
        <section className="relative h-[52dvh] lg:h-auto lg:flex-1 min-w-0 lg:rounded-lg overflow-hidden bg-[#262420]">
          <Board3D
            state={state}
            selected={selected}
            moves={moves}
            hovered={hovered}
            view="red"
            viewNonce={index}
            showHeights={lesson.heights.some(col => col.some(Boolean))}
            highlight={done ? [] : lesson.highlight}
            ghost={selected?.side !== 'red'}
            onPieceClick={p => select(p.id)}
            onMove={play}
            onHover={setHovered}
            onEmptyClick={() => select(null)}
          />
        </section>

        <aside className="lg:w-[380px] shrink-0 flex flex-col bg-surface lg:rounded-xl lg:border border-line">
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between text-xs text-muted font-display font-bold mb-2">
              <span>{t('tut.lesson', { n: index + 1, total: LESSONS.length })}</span>
              <span className="num">{Math.round(((index + (done ? 1 : 0)) / LESSONS.length) * 100)}%</span>
            </div>
            <div className="flex gap-1" aria-hidden="true">
              {LESSONS.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${i < index || (i === index && done) ? 'bg-accent' : i === index ? 'bg-accent/40' : 'bg-surface-2'}`} />
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
            <h2 className="text-xl font-extrabold">{tx(lesson.title)}</h2>
            <p className="text-muted leading-relaxed">{tx(lesson.body)}</p>

            {done ? (
              <div className="rounded-lg bg-accent/15 border border-accent/50 p-3 flex gap-3" role="status">
                <span className="grid place-items-center w-7 h-7 rounded-full bg-accent text-white shrink-0"><Icon name="check" size={16} /></span>
                <p className="text-sm">{tx(lesson.success)}</p>
              </div>
            ) : (
              <div className="rounded-lg bg-gold/10 border border-gold/40 px-3 py-2.5 text-sm font-display font-bold text-gold flex items-center gap-2">
                <span aria-hidden="true">→</span>{tx(lesson.goal)}
              </div>
            )}

            {notice && <div role="status" className="rounded-md bg-danger/15 border border-danger/40 text-sm px-3 py-2">{notice}</div>}
            {!done && preview?.capture && <CombatCard combat={preview.capture} attacker={selected!} state={state} />}
            {!done && preview && !preview.capture && <MoveCard move={preview} piece={selected!} />}
          </div>

          <div className="border-t border-line p-3 space-y-2">
            {done && last ? (
              <>
                <button className="btn btn-primary w-full py-3 text-base flex items-center justify-center gap-2" onClick={() => onPlay('normal')}>
                  <Icon name="cpu" /> {t('home.computer')}
                </button>
                <button className="btn btn-quiet w-full py-2.5 flex items-center justify-center gap-2" onClick={() => onPlay()}>
                  <Icon name="users" /> {t('home.friend')}
                </button>
              </>
            ) : done ? (
              <button className="btn btn-primary w-full py-3 text-base" onClick={() => load(index + 1)}>{t('tut.next')}</button>
            ) : null}
            <div className="flex gap-2">
              <button className="btn btn-quiet flex-1 py-2 text-sm disabled:opacity-40" disabled={index === 0} onClick={() => load(index - 1)}>{t('tut.back')}</button>
              <button className="btn btn-quiet flex-1 py-2 text-sm flex items-center justify-center gap-1.5" onClick={() => load(index)}>
                <Icon name="reset" size={15} /> {t('tut.reset')}
              </button>
              {!done && !last && <button className="btn btn-quiet flex-1 py-2 text-sm" onClick={() => load(index + 1)}>{t('tut.skip')}</button>}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
