// Full-stage overlay that opens up one unit: its own 3D scene plus an info panel.
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { CELLS, voltageBreakdown } from '../../model/plant.js'
import CellInterior, { cellInfo } from './CellInterior.jsx'
import TowerInterior, { towerInfo } from './TowerInterior.jsx'
import EvaporatorInterior, { evapInfo } from './EvaporatorInterior.jsx'

const VIEWS = {
  cells: { Scene: CellInterior, info: cellInfo, cam: [2.2, 4.6, 13.5], target: [0.3, 2.5, 0] },
  chlorine: { Scene: TowerInterior, info: towerInfo, cam: [8, 7, 14], target: [0, 4.2, 0] },
  caustic: { Scene: EvaporatorInterior, info: evapInfo, cam: [8, 6.5, 14], target: [0.6, 4, 0] },
}

function VoltageBar({ cell, j }) {
  const parts = voltageBreakdown(cell, j)
  const total = parts.reduce((a, p) => a + p.v, 0)
  return (
    <div className="vbar">
      <div className="vbar-head">
        <span>Cell voltage</span>
        <span className="mono">{total.toFixed(2)} V</span>
      </div>
      <div className="vbar-track">
        {parts.map((p) => (
          <span key={p.id} className={`vseg v-${p.id}`} style={{ width: `${(p.v / total) * 100}%` }} title={`${p.label}: ${p.v.toFixed(2)} V`} />
        ))}
      </div>
      <ul className="vbar-legend">
        {parts.map((p) => (
          <li key={p.id}>
            <i className={`v-${p.id}`} />
            <span>{p.label}</span>
            <span className="mono">{p.v.toFixed(2)} V</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function InsideView({ unitId, r, s, setS, running, onClose }) {
  const view = VIEWS[unitId]
  const [focus, setFocus] = useState(null)
  const [hover, setHover] = useState(null)
  if (!view) return null
  const info = view.info(r)
  const ui = { focus, hover, setFocus, setHover }
  const part = info.parts[focus ?? hover]
  const cell = CELLS[s.cell]
  const { Scene } = view

  return (
    <section className="inside" aria-label={info.title}>
      <div className="inside-canvas">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: view.cam, fov: 40, near: 0.1, far: 200 }}
          onPointerMissed={() => setFocus(null)}
          key={`${unitId}-${s.cell}`}
        >
          <color attach="background" args={['#05070b']} />
          <fog attach="fog" args={['#05070b', 24, 50]} />
          <hemisphereLight args={['#b8c8dc', '#10151a', 1.1]} />
          <directionalLight position={[5, 10, 8]} intensity={1.6} color="#e8eeff" />
          <pointLight position={[-4, 3, 5]} intensity={14} distance={14} color="#ffb070" />
          <pointLight position={[4, 5, 5]} intensity={12} distance={14} color="#8fb6ff" />
          <Grid position={[0, -0.7, 0]} args={[40, 40]} cellSize={0.5} cellColor="#141c24" sectionSize={2.5} sectionColor="#1d2a36" fadeDistance={26} />
          <Scene r={r} running={running} ui={ui} />
          <OrbitControls makeDefault target={view.target} enableDamping minDistance={4} maxDistance={24} maxPolarAngle={Math.PI / 1.9} />
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1} radius={0.55} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        </Canvas>
        <p className="inside-hint">Drag to turn, scroll to zoom. Click a labelled part to learn what it does.</p>
      </div>

      <aside className="inside-panel">
        <header>
          <div>
            <span className="eyebrow">Inside view · {info.sub}</span>
            <h2>{info.title}</h2>
          </div>
          <button type="button" className="btn-back" onClick={onClose}>
            ← Back to site
          </button>
        </header>

        <dl className="reactions">
          {info.reactions.map(([k, eq]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="mono">{eq}</dd>
            </div>
          ))}
        </dl>

        {unitId === 'cells' && (
          <>
            <VoltageBar cell={s.cell} j={s.j} />
            <div className="field">
              <div className="field-head">
                <label htmlFor="inside-j">Current density</label>
                <output htmlFor="inside-j" className="mono">
                  {s.j.toFixed(1)} <span className="unit">kA/m²</span>
                </output>
              </div>
              <input
                id="inside-j"
                type="range"
                min={cell.j[0]}
                max={cell.j[1]}
                step={0.1}
                value={s.j}
                onChange={(e) => setS({ ...s, j: Number(e.target.value) })}
                style={{ '--fill': `${((s.j - cell.j[0]) / (cell.j[1] - cell.j[0])) * 100}%` }}
              />
              <p className="hint">More current, more bubbles and more chlorine per cell, but the resistance losses grow.</p>
            </div>
          </>
        )}

        <dl className="facts">
          {info.stats.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="mono">{v}</dd>
            </div>
          ))}
        </dl>

        <div className={`part-note${part ? ' has-part' : ''}`}>
          {part ? (
            <>
              <h3>{part.label}</h3>
              <p>{part.text}</p>
            </>
          ) : (
            <p>
              {Object.keys(info.parts).length
                ? 'Pick a part in the view to see what it does.'
                : 'Nothing is running in here with the current cell technology.'}
            </p>
          )}
        </div>

        {info.legend.length > 0 && (
          <ul className="inside-legend">
            {info.legend.map(([k, c]) => (
              <li key={k}>
                <i style={{ background: c }} />
                {k}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </section>
  )
}
