import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { DEFAULTS, PRESETS, PRESET_KEYS, runModel } from './model/plant.js'
import Controls from './ui/Controls.jsx'
import Results from './ui/Results.jsx'
import UnitCard from './ui/UnitCard.jsx'
import { C } from './scene/colors.js'
import { INSIDE } from './scene/inside/index.js'

const PlantScene = lazy(() => import('./scene/PlantScene.jsx'))
const InsideView = lazy(() => import('./scene/inside/InsideView.jsx'))

const matches = (s, p) => PRESET_KEYS.every((k) => s[k] === p[k])

const LEGEND = [
  ['Salt', C.salt],
  ['Brine', C.brine],
  ['Chlorine', C.chlorine],
  ['Caustic', C.caustic],
  ['Hydrogen', C.hydrogen],
  ['Oxygen', C.oxygen],
  ['Water', C.water],
  ['Power', C.power],
]

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const narrow = () => typeof window !== 'undefined' && window.innerWidth <= 900

export default function App() {
  const [s, setS] = useState(DEFAULTS)
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [inside, setInside] = useState(null)
  const [labels, setLabels] = useState(() => !narrow())
  const [running, setRunning] = useState(!reduceMotion)
  const [showLeft, setShowLeft] = useState(true)
  const [showRight, setShowRight] = useState(true)
  const r = useMemo(() => runModel(s), [s])
  const [wide, setWide] = useState(() => !narrow())
  useEffect(() => {
    const onResize = () => setWide(!narrow())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const insets = wide ? { left: showLeft ? 314 : 0, right: showRight ? 386 : 0 } : null

  const preset = Object.keys(PRESETS).find((k) => matches(s, PRESETS[k])) ?? null
  const applyPreset = (p) => setS({ ...s, ...PRESETS[p] })

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (inside) setInside(null)
      else setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inside])

  const enter = (id) => {
    setSelected(id)
    setInside(id)
  }

  return (
    <div className={`app${showLeft ? ' left-open' : ''}${showRight ? ' right-open' : ''}`}>
      <main className="stage">
        <Suspense fallback={<div className="loading">Loading 3D site…</div>}>
          <PlantScene
            result={r}
            selected={selected}
            hovered={hovered}
            onSelect={setSelected}
            onHover={setHovered}
            onEnter={enter}
            showLabels={labels}
            running={running && !inside}
            insets={insets}
          />
        </Suspense>
      </main>

      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <div>
            <h1>Ezra Chlorine Works</h1>
            <p>An interactive chlor-alkali plant</p>
          </div>
        </div>
        <nav className="view-toggles" aria-label="View">
          {wide && (
            <>
              <button type="button" className={showLeft ? 'is-on' : ''} aria-pressed={showLeft} onClick={() => setShowLeft(!showLeft)}>
                Design
              </button>
              <button type="button" className={showRight ? 'is-on' : ''} aria-pressed={showRight} onClick={() => setShowRight(!showRight)}>
                Outcomes
              </button>
              <span className="sep" aria-hidden="true" />
            </>
          )}
          <button type="button" className={labels ? 'is-on' : ''} aria-pressed={labels} onClick={() => setLabels(!labels)}>
            Labels
          </button>
          <button type="button" className={running ? 'is-on' : ''} aria-pressed={running} onClick={() => setRunning(!running)}>
            {running ? 'Pause' : 'Run'}
          </button>
        </nav>
      </header>

      <ul className="flow-legend" aria-label="Flow colours">
        {LEGEND.filter(([k]) => (k === 'Hydrogen' ? r.cell.h2 : k === 'Oxygen' ? !r.cell.h2 : true)).map(([k, c]) => (
          <li key={k}>
            <i style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
            {k}
          </li>
        ))}
      </ul>

      {(showLeft || !wide) && (
        <aside className="panel panel-left" aria-label="Plant settings">
          <h2 className="panel-title">Design the plant</h2>
          <Controls s={s} set={setS} preset={preset} onPreset={applyPreset} />
        </aside>
      )}

      {(showRight || !wide) && (
        <aside className="panel panel-right" aria-label="Projected outcomes">
          <h2 className="panel-title">Projected outcomes</h2>
          <Results r={r} />
          <p className="disclaimer">
            Indicative model from electrochemistry, stoichiometry and typical published energy and price ranges. For comparing options, not
            for investment decisions.
          </p>
        </aside>
      )}

      {selected ? (
        <UnitCard id={selected} r={r} onClose={() => setSelected(null)} onInside={INSIDE[selected] ? () => setInside(selected) : null} />
      ) : (
        <p className="stage-hint">
          Click a unit for its flows. Double-click the <b>cell room</b>, <b>drying tower</b> or <b>evaporator</b> to look inside.
        </p>
      )}

      {inside && (
        <Suspense fallback={<div className="inside loading">Opening…</div>}>
          <InsideView unitId={inside} r={r} s={s} setS={setS} running={running} onClose={() => setInside(null)} />
        </Suspense>
      )}
    </div>
  )
}
