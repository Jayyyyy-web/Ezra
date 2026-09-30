import { Suspense, lazy, useMemo, useState } from 'react'
import { DEFAULTS, PRESETS, PRESET_KEYS, runModel } from './model/plant.js'
import Controls from './ui/Controls.jsx'
import Results from './ui/Results.jsx'
import UnitCard from './ui/UnitCard.jsx'
import { C } from './scene/colors.js'

const PlantScene = lazy(() => import('./scene/PlantScene.jsx'))

const matches = (s, p) => PRESET_KEYS.every((k) => s[k] === p[k])

const LEGEND = [
  ['Salt', C.salt],
  ['Brine', C.brine],
  ['Chlorine', C.chlorine],
  ['Caustic soda', C.caustic],
  ['Hydrogen', C.hydrogen],
  ['Oxygen', C.oxygen],
  ['Water', C.water],
  ['Power', C.power],
]

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const [s, setS] = useState(DEFAULTS)
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [labels, setLabels] = useState(() => typeof window === 'undefined' || window.innerWidth > 760)
  const [running, setRunning] = useState(!reduceMotion)
  const r = useMemo(() => runModel(s), [s])

  const preset = Object.keys(PRESETS).find((k) => matches(s, PRESETS[k])) ?? null
  const applyPreset = (p) => setS({ ...s, ...PRESETS[p] })

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <div>
            <h1>Ezra Chlorine Works</h1>
            <p>Salt, water and power in. Chlorine, caustic soda and hydrogen out. A chlor-alkali plant you can tune.</p>
          </div>
        </div>
        <div className="view-toggles">
          <button type="button" className={labels ? 'is-on' : ''} aria-pressed={labels} onClick={() => setLabels(!labels)}>
            Labels
          </button>
          <button type="button" className={running ? 'is-on' : ''} aria-pressed={running} onClick={() => setRunning(!running)}>
            {running ? 'Pause' : 'Run'}
          </button>
        </div>
      </header>

      <aside className="panel panel-left" aria-label="Plant settings">
        <h2 className="panel-title">Design the plant</h2>
        <Controls s={s} set={setS} preset={preset} onPreset={applyPreset} />
      </aside>

      <main className="stage">
        <Suspense fallback={<div className="loading">Loading 3D site…</div>}>
          <PlantScene
            result={r}
            selected={selected}
            hovered={hovered}
            onSelect={setSelected}
            onHover={setHovered}
            showLabels={labels}
            running={running}
          />
        </Suspense>
        {!selected && <p className="stage-hint">Drag to orbit, scroll to zoom. Click any unit to see what goes in and out.</p>}
        {selected && <UnitCard id={selected} r={r} onClose={() => setSelected(null)} />}
        <ul className="flow-legend" aria-label="Flow colours">
          {LEGEND.map(([k, c]) => (
            <li key={k}>
              <i style={{ background: c }} />
              {k}
            </li>
          ))}
        </ul>
      </main>

      <aside className="panel panel-right" aria-label="Projected outcomes">
        <h2 className="panel-title">Projected outcomes</h2>
        <Results r={r} />
        <p className="disclaimer">
          Indicative model built from electrochemistry, reaction stoichiometry and typical published energy and price ranges. Use it to compare
          options, not to make investment decisions.
        </p>
      </aside>
    </div>
  )
}
