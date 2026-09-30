import { ENERGY_SOURCES } from '../model/plant.js'

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

export default function Controls({ s, set, onPreset, preset }) {
  const upd = (k) => (v) => set({ ...s, [k]: v })
  return (
    <div className="controls">
      <div className="presets" role="group" aria-label="Plant design">
        <button type="button" className={preset === 'efficient' ? 'is-on' : ''} onClick={() => onPreset('efficient')}>
          Most efficient
        </button>
        <button type="button" className={preset === 'conventional' ? 'is-on' : ''} onClick={() => onPreset('conventional')}>
          Conventional
        </button>
      </div>

      <section className="group">
        <h3>Scale</h3>
        <Slider id="capacity" label="Nameplate capacity" value={s.capacity} min={5000} max={60000} step={2500} unit="t/yr" onChange={upd('capacity')} hint="Cathode the plant is built to make. Reactor trains and kiln lines grow with it." />
        <Slider id="utilization" label="Utilisation" value={s.utilization} min={50} max={95} step={1} unit="%" onChange={upd('utilization')} />
        <Slider id="packKwh" label="EV battery size" value={s.packKwh} min={40} max={110} step={5} unit="kWh" onChange={upd('packKwh')} />
      </section>

      <section className="group">
        <h3>Energy</h3>
        <div className="field">
          <span className="field-label" id="energy-label">Power source</span>
          <div className="seg" role="radiogroup" aria-labelledby="energy-label">
            {Object.entries(ENERGY_SOURCES).map(([k, v]) => (
              <button key={k} type="button" role="radio" aria-checked={s.energy === k} className={s.energy === k ? 'is-on' : ''} onClick={() => upd('energy')(k)}>
                {v.label}
              </button>
            ))}
          </div>
          <p className="hint">
            ${ENERGY_SOURCES[s.energy].price}/MWh · {ENERGY_SOURCES[s.energy].co2} t CO₂/MWh
          </p>
        </div>
        <Toggle id="electricKiln" label="Electric kiln" checked={s.electricKiln} onChange={upd('electricKiln')} hint="Replaces the gas burner on the ore kiln." />
        <Toggle id="heatRecovery" label="Heat recovery" checked={s.heatRecovery} onChange={upd('heatRecovery')} hint="Vapour recompression and kiln off-gas reuse. About 20% less energy on hot steps." />
      </section>

      <section className="group">
        <h3>Process</h3>
        <Slider id="liRecovery" label="Lithium recovery" value={s.liRecovery} min={78} max={93} step={1} unit="%" onChange={upd('liRecovery')} hint="Share of lithium in the ore that ends up in cathode." />
        <Slider id="waterRecycle" label="Water recycled" value={s.waterRecycle} min={40} max={95} step={1} unit="%" onChange={upd('waterRecycle')} />
        <Toggle id="sulfateRecovery" label="Sell sodium sulfate" checked={s.sulfateRecovery} onChange={upd('sulfateRecovery')} hint="Crystallise the main by-product and sell it instead of treating it as brine." />
      </section>

      <section className="group">
        <h3>Market</h3>
        <Slider id="camPrice" label="Cathode price" value={s.camPrice} min={12} max={40} step={0.5} unit="$/kg" onChange={upd('camPrice')} fmt={(v) => v.toFixed(1)} />
        <Slider id="spodumenePrice" label="Spodumene price" value={s.spodumenePrice} min={500} max={4000} step={50} unit="$/t" onChange={upd('spodumenePrice')} />
        <Slider id="nickelPrice" label="Nickel sulfate price" value={s.nickelPrice} min={2500} max={6000} step={50} unit="$/t" onChange={upd('nickelPrice')} />
      </section>
    </div>
  )
}
