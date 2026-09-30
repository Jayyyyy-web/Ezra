import { money } from './format.js'

// Annual cash (bars) and cumulative cash (line) over build + 15 operating years.
export default function CashChart({ projection, paybackYear }) {
  const W = 360
  const H = 200
  const pad = { l: 46, r: 10, t: 12, b: 26 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const vals = projection.flatMap((p) => [p.cash, p.cumulative, 0])
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  const span = hi - lo || 1
  lo -= span * 0.05
  hi += span * 0.05

  const n = projection.length
  const bw = iw / n
  const x = (i) => pad.l + i * bw + bw / 2
  const y = (v) => pad.t + ((hi - v) / (hi - lo)) * ih

  // round ticks
  const step = niceStep((hi - lo) / 4)
  const ticks = []
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v)

  const line = projection.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cumulative).toFixed(1)}`).join(' ')
  const pbIndex = paybackYear != null ? projection.findIndex((p) => p.year === paybackYear) : -1

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Annual and cumulative cash flow by year">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis-zero' : 'gridline'} />
            <text x={pad.l - 6} y={y(v) + 3} className="tick" textAnchor="end">
              {money(v)}
            </text>
          </g>
        ))}
        {projection.map((p, i) => (
          <rect
            key={p.year}
            x={x(i) - bw * 0.32}
            width={bw * 0.64}
            y={Math.min(y(p.cash), y(0))}
            height={Math.max(1, Math.abs(y(p.cash) - y(0)))}
            className={p.cash >= 0 ? 'bar-pos' : 'bar-neg'}
            rx="1.5"
          >
            <title>{`Year ${p.year}: ${money(p.cash)} in year, ${money(p.cumulative)} cumulative`}</title>
          </rect>
        ))}
        <path d={line} className="cum-line" fill="none" />
        {pbIndex >= 0 && (
          <g>
            <circle cx={x(pbIndex)} cy={y(projection[pbIndex].cumulative)} r="4" className="pb-dot" />
            <text x={x(pbIndex)} y={y(projection[pbIndex].cumulative) - 9} textAnchor="middle" className="pb-label">
              Payback
            </text>
          </g>
        )}
        {projection.map((p, i) =>
          p.year % 3 === 0 || p.year === -2 ? (
            <text key={p.year} x={x(i)} y={H - 8} textAnchor="middle" className="tick">
              {p.year <= 0 ? (p.year === 0 ? 'Start' : `Build`) : `Y${p.year}`}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="legend">
        <span><i className="sw sw-bar" /> Cash in the year</span>
        <span><i className="sw sw-line" /> Cumulative</span>
      </figcaption>
    </figure>
  )
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const m = raw / p
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p
}
