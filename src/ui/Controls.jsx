import { CELLS, ENERGY_SOURCES, H2_USES, cellVoltage } from '../model/plant.js'

function Slider({ id, label, value, min, max, step, unit, onChange, hint, fmt }) {
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="mono">
          {fmt ? fmt(value) : value.toLocaleString('en-US')}
          {unit && <span className="unit"> {unit}</span>}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${((value - min) / (max - min)) * 100}%` }}
      />
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

function Toggle({ id, label, checked, onChange, hint }) {
  return (
    <div className="field toggle-field">
      <label htmlFor={id} className="toggle">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="track" aria-hidden="true">
          <span className="knob" />
        </span>
        <span className="toggle-label">{label}</span>
      </label>
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

function Choice({ id, label, value, options, onChange, hint, cols = 2 }) {
  return (
    <div className="field">
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={`${id}-label`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {options.map(([k, text, disabled]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={value === k}
            disabled={disabled}
            className={value === k ? 'is-on' : ''}
            onClick={() => onChange(k)}
          >
            {text}
          </button>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export default function Controls({ s, set, onPreset, preset }) {
  const upd = (k) => (v) => set({ ...s, [k]: v })
  const cell = CELLS[s.cell]
  const setCell = (k) => set({ ...s, cell: k, j: CELLS[k].j[2] })

  return (
    <div className="controls">
      <div className="presets" role="group" aria-label="Plant design">
        <button type="button" className={preset === 'efficient' ? 'is-on' : ''} onClick={() => onPreset('efficient')}>
          Most efficient
        </button>
        <button type="button" className={preset === 'conventional' ? 'is-on' : ''} onClick={() => onPreset('conventional')}>
          Conventional
        </button>
        <button type="button" className={preset === 'legacy' ? 'is-on' : ''} onClick={() => onPreset('legacy')}>
          Legacy
        </button>
      </div>

      <section className="group">
        <h3>Cells</h3>
        <Choice
          id="cell"
          label="Cell technology"
          value={s.cell}
          onChange={setCell}
          options={Object.entries(CELLS).map(([k, v]) => [k, v.short])}
          hint={cell.note}
        />
        <Slider
          id="j"
          label="Current density"
          value={s.j}
          min={cell.j[0]}
          max={cell.j[1]}
          step={0.1}
          unit="kA/m²"
          fmt={(v) => v.toFixed(1)}
          onChange={upd('j')}
          hint={`${cellVoltage(s.cell, s.j).toFixed(2)} V per cell. Higher current needs fewer cells but more power per tonne.`}
        />
      </section>

      <section className="group">
        <h3>Scale</h3>
        <Slider id="capacity" label="Nameplate capacity" value={s.capacity} min={50000} max={500000} step={10000} unit="t Cl₂/yr" onChange={upd('capacity')} />
        <Slider id="utilization" label="Utilisation" value={s.utilization} min={50} max={98} step={1} unit="%" onChange={upd('utilization')} />
      </section>

      <section className="group">
        <h3>Energy</h3>
        <Choice
          id="energy"
          label="Power source"
          value={s.energy}
          onChange={upd('energy')}
          options={Object.entries(ENERGY_SOURCES).map(([k, v]) => [k, v.label])}
          hint={`$${ENERGY_SOURCES[s.energy].price}/MWh · ${ENERGY_SOURCES[s.energy].co2} t CO₂/MWh`}
        />
        <Choice
          id="h2Use"
          label="Hydrogen use"
          value={cell.h2 ? s.h2Use : null}
          onChange={upd('h2Use')}
          options={Object.entries(H2_USES).map(([k, v]) => [k, v.label, !cell.h2])}
          hint={cell.h2 ? H2_USES[s.h2Use].note : 'Oxygen-cathode cells make no hydrogen.'}
        />
        <Toggle
          id="mvr"
          label="MVR evaporator"
          checked={s.mvr}
          onChange={upd('mvr')}
          hint="Mechanical vapour recompression concentrates caustic with electricity instead of steam."
        />
      </section>

      <section className="group">
        <h3>Market</h3>
        <Slider id="cl2Price" label="Chlorine price" value={s.cl2Price} min={0} max={600} step={10} unit="$/t" onChange={upd('cl2Price')} />
        <Slider id="naohPrice" label="Caustic soda price" value={s.naohPrice} min={200} max={900} step={10} unit="$/t" onChange={upd('naohPrice')} hint="Priced as 100% NaOH." />
        <Slider id="h2Price" label="Hydrogen price" value={s.h2Price} min={1} max={8} step={0.1} unit="$/kg" fmt={(v) => v.toFixed(1)} onChange={upd('h2Price')} />
        <Slider id="saltPrice" label="Salt price" value={s.saltPrice} min={20} max={120} step={1} unit="$/t" onChange={upd('saltPrice')} />
      </section>
    </div>
  )
}
