import { UNIT_BY_ID } from '../model/units.js'
import { compact, num } from './format.js'

function val({ v, u }) {
  return (
    <>
      {v >= 1000 ? compact(v) : num(v)} <span className="unit">{u}</span>
    </>
  )
}

export default function UnitCard({ id, r, onClose }) {
  const u = UNIT_BY_ID[id]
  if (!u) return null
  const f = u.flows(r)
  const cond = typeof u.conditions === 'function' ? u.conditions(r.settings) : u.conditions
  return (
    <aside className="unit-card" aria-label={u.name}>
      <header>
        <div>
          <span className="eyebrow">{u.lane}</span>
          <h2>{u.name}</h2>
        </div>
        <button type="button" className="close" onClick={onClose} aria-label="Close unit details">
          ×
        </button>
      </header>
      <p>{u.what}</p>
      <p className="cond mono">{cond}</p>
      <div className="flows">
        {f.in.length > 0 && (
          <div>
            <h4>In</h4>
            <ul>
              {f.in.map(([k, x]) => (
                <li key={k}>
                  <span>{k}</span>
                  <span className="mono">{val(x)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h4>Out</h4>
          <ul>
            {f.out.map(([k, x]) => (
              <li key={k}>
                <span>{k}</span>
                <span className="mono">{val(x)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
