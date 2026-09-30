import { useState } from 'react'
import { CONVENTIONAL, energyGJ, runModel } from '../model/plant.js'
import CashChart from './CashChart.jsx'
import { compact, money, num, pct } from './format.js'

const TABS = [
  ['in', 'Inputs'],
  ['out', 'Outputs'],
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
            <th className="num">Per t cathode</th>
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
                  <td className="num mono">{money(i.costYear)}</td>
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
              <th className="num">Per t cathode</th>
              <th className="num">Per year</th>
            </tr>
          </thead>
          <tbody>
            {r.outputs.map((o) => (
              <tr key={o.id}>
                <td>
                  <span className={`chip chip-${o.kind}`}>{o.kind === 'byproduct' ? 'by-product' : o.kind}</span> {o.label}
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
        {compact(r.production)} t of cathode makes about {num(r.gwh, 1)} GWh of battery cells. That covers roughly{' '}
        {compact(r.evs)} cars with a {r.settings.packKwh} kWh pack each year.
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
        Two build years, then a ramp-up at 40% and 75% before full output. Profit is before tax and depreciation. Staff
        about {num(r.staff)}.
      </p>
    </div>
  )
}

function Compare({ r }) {
  const c = runModel({ ...CONVENTIONAL, capacity: r.settings.capacity, utilization: r.settings.utilization, camPrice: r.settings.camPrice, spodumenePrice: r.settings.spodumenePrice, nickelPrice: r.settings.nickelPrice, packKwh: r.settings.packKwh })
  const cost = (x) => (x.econ.variable + x.econ.fixed) / x.production
  const rows = [
    ['Energy', energyGJ(r), energyGJ(c), 'GJ/t'],
    ['CO₂', r.co2, c.co2, 't/t'],
    ['Fresh water', r.freshWater, c.freshWater, 'm³/t'],
    ['Ore needed', r.perT.spodumene, c.perT.spodumene, 't/t'],
    ['Operating cost', cost(r), cost(c), '$/t'],
  ]
  return (
    <div className="stack">
      <p className="note">This plant against a conventional one of the same size: gas kiln, grid power, no heat recovery, 60% water reuse, 82% lithium recovery.</p>
      <ul className="compare">
        {rows.map(([label, a, b, u]) => {
          const d = (a - b) / b
          const max = Math.max(a, b)
          return (
            <li key={label}>
              <div className="cmp-head">
                <span>{label}</span>
                <span className={`mono delta ${d <= 0 ? 'good' : 'bad'}`}>
                  {d <= 0 ? '−' : '+'}
                  {Math.abs(d * 100).toFixed(0)}%
                </span>
              </div>
              <div className="cmp-bars">
                <div className="cmp-row">
                  <span className="cmp-name">This plant</span>
                  <span className="bar"><span className="fill this" style={{ width: `${(a / max) * 100}%` }} /></span>
                  <span className="mono cmp-val">{u === '$/t' ? money(a) : num(a)} <span className="unit">{u === '$/t' ? '/t' : u}</span></span>
                </div>
                <div className="cmp-row">
                  <span className="cmp-name">Conventional</span>
                  <span className="bar"><span className="fill conv" style={{ width: `${(b / max) * 100}%` }} /></span>
                  <span className="mono cmp-val">{u === '$/t' ? money(b) : num(b)} <span className="unit">{u === '$/t' ? '/t' : u}</span></span>
                </div>
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
  return (
    <div className="results">
      <div className="kpis">
        <Kpi label="Cathode / yr" value={compact(r.production)} unit=" t" sub={`${num(r.gwh, 1)} GWh of cells`} />
        <Kpi label="EVs supplied / yr" value={compact(r.evs)} sub={`${r.settings.packKwh} kWh packs`} tone="accent" />
        <Kpi label="CO₂ per t" value={num(r.co2, 2)} unit=" t" sub={`${compact(r.co2 * r.production)} t / yr`} tone={r.co2 < 1.2 ? 'good' : r.co2 < 2.5 ? 'warn' : 'bad'} />
        <Kpi label="Payback" value={r.econ.paybackYear ? `Yr ${r.econ.paybackYear}` : '> 15 yrs'} sub={`${money(r.econ.ebitda)} profit / yr`} tone={r.econ.ebitda > 0 ? undefined : 'bad'} />
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
        {tab === 'money' && <Money r={r} />}
        {tab === 'compare' && <Compare r={r} />}
      </div>
    </div>
  )
}
