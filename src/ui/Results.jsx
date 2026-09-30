import { useState } from 'react'
import { DEFAULTS, PRESETS, runModel } from '../model/plant.js'
import CashChart from './CashChart.jsx'
import { compact, money, num, pct } from './format.js'

const TABS = [
  ['in', 'Inputs'],
  ['out', 'Outputs'],
  ['energy', 'Energy'],
  ['money', 'Projection'],
  ['compare', 'Compare'],
]

function Kpi({ label, value, unit, sub, tone }) {
  return (
    <div className={`kpi${tone ? ` tone-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value mono">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  )
}

function Inputs({ r }) {
  const groups = [...new Set(r.inputs.map((i) => i.group))]
  const total = r.inputs.reduce((a, i) => a + i.costYear, 0)
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th className="num">Per t Cl₂</th>
            <th className="num">Per year</th>
            <th className="num">Cost / yr</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g}>
            <tr className="grp">
              <th colSpan={4}>{g}</th>
            </tr>
            {r.inputs
              .filter((i) => i.group === g)
              .map((i) => (
                <tr key={i.id}>
                  <td>{i.label}</td>
                  <td className="num mono">
                    {num(i.perT)} <span className="unit">{i.unit}</span>
                  </td>
                  <td className="num mono">
                    {compact(i.perYear)} <span className="unit">{i.unit}</span>
                  </td>
                  <td className="num mono">{i.price ? money(i.costYear) : '–'}</td>
                </tr>
              ))}
          </tbody>
        ))}
        <tfoot>
          <tr>
            <th colSpan={3}>Total bought-in resources</th>
            <td className="num mono">{money(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function Outputs({ r }) {
  return (
    <div className="stack">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Stream</th>
              <th className="num">Per t Cl₂</th>
              <th className="num">Per year</th>
            </tr>
          </thead>
          <tbody>
            {r.outputs.map((o) => (
              <tr key={o.id}>
                <td>
                  <span className={`chip chip-${o.kind}`}>{o.kind === 'byproduct' ? 'used' : o.kind}</span> {o.label}
                </td>
                <td className="num mono">
                  {num(o.perT)} <span className="unit">{o.unit}</span>
                </td>
                <td className="num mono">
                  {compact(o.perYear)} <span className="unit">{o.unit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Chlorine and caustic always come together: every tonne of chlorine brings {num(r.naoh, 2)} t of caustic soda. A year's chlorine could go into about{' '}
        {compact(r.pvc)} t of PVC, the plastic in pipes and window frames, which is where a third of the world's chlorine ends up.
      </p>
    </div>
  )
}

function Energy({ r }) {
  const rows = [
    ['Cell reaction (DC)', r.dcKWh, 'cells'],
    ['Rectifier losses', r.acKWh - r.dcKWh, 'loss'],
    ['Chlorine drying + liquefaction', r.aux.chlorine, 'aux'],
    ['Brine system', r.aux.brine, 'aux'],
    ['Caustic handling', r.aux.caustic, 'aux'],
    ...(r.aux.oxygen ? [['Oxygen plant', r.aux.oxygen, 'aux']] : []),
    ...(r.aux.hydrogen ? [['Hydrogen handling', r.aux.hydrogen, 'aux']] : []),
    ['Utilities', r.aux.utilities, 'aux'],
    ...(r.fuelCellKWh ? [['Fuel cell returns', -r.fuelCellKWh, 'credit']] : []),
  ]
  const max = Math.max(...rows.map((x) => Math.abs(x[1])))
  return (
    <div className="stack">
      <div className="energy-total">
        <span className="mono">{num(r.netKWh / 1000, 2)}</span>
        <span>MWh of electricity per tonne of chlorine</span>
      </div>
      <ul className="ebars">
        {rows.map(([label, v, kind]) => (
          <li key={label}>
            <span className="eb-label">{label}</span>
            <span className="bar">
              <span className={`fill e-${kind}`} style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
            </span>
            <span className="mono eb-val">
              {v < 0 ? '−' : ''}
              {num(Math.abs(v), 0)} <span className="unit">kWh</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="note">
        The cells run at {r.voltage.toFixed(2)} V and {r.settings.j} kA/m², drawing {compact(r.currentKA)} kA across {compact(r.areaM2)} m² of cell area.
        {r.steamT > 0 && ` The evaporator also needs ${num(r.steamT, 2)} t of steam per tonne${r.gasGJ > 0 ? `, ${num(r.gasGJ, 1)} GJ of it from natural gas` : ', all raised by burning the plant’s own hydrogen'}.`}
      </p>
    </div>
  )
}

function Money({ r }) {
  const e = r.econ
  return (
    <div className="stack">
      <CashChart projection={e.projection} paybackYear={e.paybackYear} />
      <dl className="facts">
        <div><dt>Build cost</dt><dd className="mono">{money(e.capex)}</dd></div>
        <div><dt>Revenue / yr</dt><dd className="mono">{money(e.revenue)}</dd></div>
        <div><dt>Operating profit / yr</dt><dd className="mono">{money(e.ebitda)}</dd></div>
        <div><dt>Margin</dt><dd className="mono">{pct(e.margin, 1)}</dd></div>
        <div><dt>Payback</dt><dd className="mono">{e.paybackYear ? `Year ${e.paybackYear}` : 'Not in 15 yrs'}</dd></div>
        <div><dt>NPV at 8%</dt><dd className={`mono ${e.npv < 0 ? 'neg' : 'pos'}`}>{money(e.npv)}</dd></div>
      </dl>
      <p className="note">
        Cells are {pct(e.capexParts.cells / e.capex)} of the build cost. Revenue is {pct(e.revenueParts.naoh / e.revenue)} caustic soda,{' '}
        {pct(e.revenueParts.cl2 / e.revenue)} chlorine{e.revenueParts.h2 ? ` and ${pct(e.revenueParts.h2 / e.revenue)} hydrogen` : ''}. Two build years,
        then 60% and 90% output before full rate. Profit is before tax.
      </p>
    </div>
  )
}

function Compare({ r }) {
  const keep = ['capacity', 'utilization', 'cl2Price', 'naohPrice', 'h2Price', 'saltPrice']
  const base = Object.fromEntries(keep.map((k) => [k, r.settings[k]]))
  const conv = runModel({ ...DEFAULTS, ...base, ...PRESETS.conventional })
  const leg = runModel({ ...DEFAULTS, ...base, ...PRESETS.legacy })
  const cost = (x) => (x.econ.variable + x.econ.fixed) / x.production
  const rows = [
    ['Electricity', (x) => x.netKWh / 1000, 'MWh/t'],
    ['CO₂', (x) => x.co2, 't/t'],
    ['Operating cost', cost, '$/t'],
    ['Build cost', (x) => x.econ.capex, '$'],
  ]
  const plants = [
    ['This plant', r, 'this'],
    ['Conventional', conv, 'conv'],
    ['Legacy mercury', leg, 'leg'],
  ]
  const fmt = (v, u) => (u === '$' || u === '$/t' ? money(v) : num(v, 2))
  return (
    <div className="stack">
      <p className="note">
        Same size and prices. Conventional is a standard membrane plant on grid power that burns its hydrogen for steam. Legacy is a mercury-cell plant.
      </p>
      <ul className="compare">
        {rows.map(([label, fn, u]) => {
          const vals = plants.map(([, x]) => fn(x))
          const max = Math.max(...vals)
          const d = (vals[0] - vals[1]) / vals[1]
          return (
            <li key={label}>
              <div className="cmp-head">
                <span>{label}</span>
                <span className={`mono delta ${d <= 0 ? 'good' : 'bad'}`}>
                  {d <= 0 ? '−' : '+'}
                  {Math.abs(d * 100).toFixed(0)}% vs conventional
                </span>
              </div>
              <div className="cmp-bars">
                {plants.map(([name, , cls], i) => (
                  <div className="cmp-row" key={name}>
                    <span className="cmp-name">{name}</span>
                    <span className="bar">
                      <span className={`fill ${cls}`} style={{ width: `${(vals[i] / max) * 100}%` }} />
                    </span>
                    <span className="mono cmp-val">
                      {fmt(vals[i], u)} <span className="unit">{u === '$' ? '' : u === '$/t' ? '/t' : u}</span>
                    </span>
                  </div>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Results({ r }) {
  const [tab, setTab] = useState('in')
  const mwh = r.netKWh / 1000
  return (
    <div className="results">
      {r.cell.mercury && (
        <p className="alert" role="status">
          Mercury cells release about {num(r.mercuryG, 1)} g of mercury per tonne of chlorine. New mercury plants are banned in the EU and under the Minamata Convention.
        </p>
      )}
      <div className="kpis">
        <Kpi label="Chlorine / yr" value={compact(r.production)} unit=" t" sub={`+ ${compact(r.naoh * r.production)} t caustic soda`} />
        <Kpi label="Power per t Cl₂" value={num(mwh, 2)} unit=" MWh" sub={`${r.voltage.toFixed(2)} V per cell`} tone={mwh < 2.1 ? 'good' : mwh < 2.7 ? 'warn' : 'bad'} />
        <Kpi label="CO₂ per t" value={num(r.co2, 2)} unit=" t" sub={`${compact(r.co2 * r.production)} t / yr`} tone={r.co2 < 0.5 ? 'good' : r.co2 < 1.3 ? 'warn' : 'bad'} />
        <Kpi label="Payback" value={r.econ.paybackYear ? `Yr ${r.econ.paybackYear}` : '> 15 yrs'} sub={`${money(r.econ.ebitda)} profit / yr`} tone={r.econ.ebitda > 0 ? 'accent' : 'bad'} />
      </div>
      <div className="tabs" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="tab-body" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'in' && <Inputs r={r} />}
        {tab === 'out' && <Outputs r={r} />}
        {tab === 'energy' && <Energy r={r} />}
        {tab === 'money' && <Money r={r} />}
        {tab === 'compare' && <Compare r={r} />}
      </div>
    </div>
  )
}
