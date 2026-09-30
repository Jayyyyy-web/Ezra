// Number formatting for the dashboard.
export function num(v, digits) {
  if (!isFinite(v)) return '–'
  const a = Math.abs(v)
  const d = digits ?? (a >= 100 ? 0 : a >= 10 ? 1 : 2)
  return v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 })
}

export function compact(v) {
  if (!isFinite(v)) return '–'
  const a = Math.abs(v)
  if (a >= 1e9) return `${(v / 1e9).toFixed(a >= 1e10 ? 0 : 2)}B`
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`
  if (a >= 1e4) return `${(v / 1e3).toFixed(0)}k`
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}k`
  return num(v)
}

export function money(v) {
  const sign = v < 0 ? '−' : ''
  return `${sign}$${compact(Math.abs(v))}`
}

export function pct(v, digits = 0) {
  return `${(v * 100).toFixed(digits)}%`
}
