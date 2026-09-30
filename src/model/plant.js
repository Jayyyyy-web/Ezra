// Ezra chlorine plant model.
//
// Chlor-alkali electrolysis splits salt water into chlorine, caustic soda and
// (in most cell types) hydrogen:
//
//   2 NaCl + 2 H2O            -> Cl2 + 2 NaOH + H2      (membrane, diaphragm, mercury)
//   2 NaCl +   H2O + 1/2 O2   -> Cl2 + 2 NaOH           (oxygen-depolarised cathode)
//
// Almost all of the cost and carbon is electricity, and electricity per tonne is
// set by cell voltage: energy = charge x voltage / current efficiency. Voltage
// rises with current density, so running cells harder saves on cell area (build
// cost) but burns more power. That trade-off is the heart of this model.
//
// Numbers are indicative engineering estimates from stoichiometry and typical
// published ranges. Good for comparing options, not for investment decisions.

// ---------- chemistry ----------
const MW = { Cl2: 70.906, NaCl: 58.443, NaOH: 39.997, H2: 2.016, H2O: 18.015, O2: 31.998 }
const MOL = 1e6 / MW.Cl2 // mol Cl2 per tonne
export const KAH_PER_T = (2 * MOL * 96485) / 3600 / 1000 // kAh of charge per t Cl2 (~756)

const NAOH = (2 * MOL * MW.NaOH) / 1e6 // t NaOH (100%) per t Cl2, ~1.128
const H2 = (MOL * MW.H2) / 1e6 // t H2 per t Cl2, ~0.0284
const O2 = (0.5 * MOL * MW.O2) / 1e6 // t O2 per t Cl2 for ODC, ~0.226
const SALT_STOICH = (2 * MOL * MW.NaCl) / 1e6 // ~1.648
const H2_LHV = 33.3 // kWh per kg

// ---------- cell technologies ----------
export const CELLS = {
  odc: {
    label: 'Membrane + oxygen cathode',
    short: 'ODC membrane',
    v0: 1.55, // V at zero current, roughly
    k: 0.11, // V per kA/m²
    ce: 0.97,
    conc: 0.32, // NaOH strength leaving the cell
    j: [2, 6, 4], // min, max, default current density kA/m²
    costM2: 26000, // $ per m² of cell area, incl. rectifier share
    elementM2: 2.7,
    perStack: 160,
    h2: false,
    note: 'Air-fed cathode reduces oxygen instead of making hydrogen. About 30% less power than a standard membrane cell.',
  },
  membrane: {
    label: 'Membrane',
    short: 'Membrane',
    v0: 2.3,
    k: 0.105,
    ce: 0.965,
    conc: 0.32,
    j: [3, 8, 6],
    costM2: 18000,
    elementM2: 2.7,
    perStack: 160,
    h2: true,
    note: 'The modern standard. A cation membrane keeps chlorine and caustic apart.',
  },
  diaphragm: {
    label: 'Diaphragm',
    short: 'Diaphragm',
    v0: 2.75,
    k: 0.28,
    ce: 0.95,
    conc: 0.11,
    j: [1.5, 3, 2.4],
    costM2: 9000,
    elementM2: 45,
    perStack: 1,
    h2: true,
    saltyCaustic: true,
    note: 'Older porous diaphragm. Weak, salty caustic needs a lot of steam to concentrate.',
  },
  mercury: {
    label: 'Mercury',
    short: 'Mercury',
    v0: 3.05,
    k: 0.095,
    ce: 0.965,
    conc: 0.5,
    j: [6, 14, 10],
    costM2: 12000,
    elementM2: 30,
    perStack: 1,
    h2: true,
    mercury: true,
    note: 'Legacy flowing-mercury cathode. Banned in the EU since 2017 and being phased out worldwide under the Minamata Convention.',
  },
}

export const ENERGY_SOURCES = {
  grid: { label: 'Grid average', co2: 0.474, price: 95, note: 'Mixed grid supply, about 0.47 t CO₂ per MWh.' },
  hybrid: { label: 'Solar + wind + storage', co2: 0.12, price: 72, note: '80% on-site renewables, 20% grid top-up.' },
  solar: { label: 'Solar PPA', co2: 0.04, price: 58, note: 'Contracted solar with battery firming.' },
  wind: { label: 'Offshore wind PPA', co2: 0.012, price: 64, note: 'Contracted offshore wind with firming.' },
}

export const H2_USES = {
  fuelcell: { label: 'Fuel cell', note: 'Turns hydrogen back into about 55% of its energy as electricity.' },
  boiler: { label: 'Steam boiler', note: 'Burns hydrogen to make steam for the caustic evaporator.' },
  sell: { label: 'Sell', note: 'Compressed and sold to refineries, fuel stations or ammonia plants.' },
  vent: { label: 'Vent', note: 'Released to air. Wasteful, but still common at small sites.' },
}

const GAS = { co2PerGJ: 0.056, pricePerGJ: 10 }
const STEAM_MWH_PER_T = 0.75 // thermal energy in 1 t of process steam
const TRIPLE_EFFECT = 0.38 // t steam per t water evaporated
const MVR_KWH = 28 // kWh electricity per t water evaporated

const PRICES = {
  soda: 300, // $/t Na2CO3
  hcl: 150,
  acid: 110,
  sulfite: 600,
  water: 1.2,
}

export const DEFAULTS = {
  capacity: 250000, // t Cl2 per year, nameplate
  utilization: 92,
  cell: 'odc',
  j: 4,
  energy: 'hybrid',
  h2Use: 'fuelcell',
  mvr: true,
  cl2Price: 250, // $/t
  naohPrice: 450, // $/t, 100% basis
  h2Price: 3.0, // $/kg
  saltPrice: 45, // $/t
}

export const PRESETS = {
  efficient: { cell: 'odc', j: 4, energy: 'hybrid', h2Use: 'fuelcell', mvr: true },
  conventional: { cell: 'membrane', j: 6, energy: 'grid', h2Use: 'boiler', mvr: false },
  legacy: { cell: 'mercury', j: 10, energy: 'grid', h2Use: 'boiler', mvr: false },
}
export const PRESET_KEYS = Object.keys(PRESETS.efficient)

export function cellVoltage(cell, j) {
  const c = CELLS[cell]
  return c.v0 + c.k * j
}

// ---------- the model ----------
export function runModel(s) {
  const c = CELLS[s.cell]
  const src = ENERGY_SOURCES[s.energy]
  const production = (s.capacity * s.utilization) / 100 // t Cl2 / yr
  const hasH2 = c.h2
  const h2Use = hasH2 ? s.h2Use : null

  // electrolysis
  const voltage = cellVoltage(s.cell, s.j)
  const dc = (KAH_PER_T * voltage) / c.ce // kWh DC per t
  const ac = dc / 0.97 // rectifier + transformer losses
  const minKWh = (KAH_PER_T * (c.h2 ? 2.19 : 1.23)) // thermodynamic floor for this reaction
  const currentKA = ((s.capacity / 8760) * KAH_PER_T) / c.ce
  const areaM2 = currentKA / s.j
  const elements = Math.ceil(areaM2 / c.elementM2)
  const stacks = Math.ceil(elements / c.perStack)

  // caustic evaporation to 50%
  const waterEvap = c.conc >= 0.5 ? 0 : NAOH * (1 / c.conc - 1 / 0.5)
  const steamT = s.mvr ? 0 : waterEvap * TRIPLE_EFFECT * (c.saltyCaustic ? 1.15 : 1)
  const mvrKWh = s.mvr ? waterEvap * MVR_KWH : 0
  const steamMWh = steamT * STEAM_MWH_PER_T

  // hydrogen
  const h2kg = hasH2 ? H2 * 1000 : 0
  let fuelCellKWh = 0
  let h2SteamMWh = 0
  let h2Sold = 0
  let h2CompressKWh = 0
  if (h2Use === 'fuelcell') fuelCellKWh = h2kg * H2_LHV * 0.55
  if (h2Use === 'boiler') h2SteamMWh = (h2kg * H2_LHV * 0.9) / 1000
  if (h2Use === 'sell') {
    h2Sold = h2kg
    h2CompressKWh = h2kg * 2.5
  }
  const gasSteamMWh = Math.max(0, steamMWh - h2SteamMWh)
  const gasGJ = (gasSteamMWh * 3.6) / 0.9

  // oxygen for ODC
  const o2kg = s.cell === 'odc' ? O2 * 1000 * 1.1 : 0
  const asuKWh = o2kg * 0.33

  // auxiliaries (kWh/t)
  const aux = {
    brine: 25,
    chlorine: 125, // cooling, drying, compression, liquefaction
    caustic: 10 + mvrKWh,
    hydrogen: h2CompressKWh + (hasH2 ? 8 : 0),
    oxygen: asuKWh,
    utilities: 40,
  }
  const auxTotal = Object.values(aux).reduce((a, b) => a + b, 0)
  const grossKWh = ac + auxTotal
  const netKWh = grossKWh - fuelCellKWh
  const netMWh = netKWh / 1000

  // materials (per t Cl2)
  const salt = SALT_STOICH * 1.03 + (c.saltyCaustic ? 0.02 : 0)
  const waterStoich = (s.cell === 'odc' ? MOL : 2 * MOL) * MW.H2O / 1e6
  const freshWater = waterStoich + NAOH + 0.35 + netMWh * 0.8 // product water + purge + cooling make-up
  const soda = 0.006
  const hcl = 0.025
  const acid = 0.012
  const sulfite = 0.002

  // carbon
  const co2Power = netMWh * src.co2
  const co2Gas = gasGJ * GAS.co2PerGJ
  const co2 = co2Power + co2Gas
  const mercuryG = c.mercury ? 0.6 : 0

  const y = (v) => v * production
  const inputs = [
    { id: 'salt', label: 'Salt (NaCl)', unit: 't', perT: salt, price: s.saltPrice, group: 'Raw materials' },
    { id: 'water', label: 'Fresh water', unit: 'm³', perT: freshWater, price: PRICES.water, group: 'Raw materials' },
    { id: 'soda', label: 'Soda ash (brine treatment)', unit: 't', perT: soda, price: PRICES.soda, group: 'Reagents' },
    { id: 'hcl', label: 'Hydrochloric acid', unit: 't', perT: hcl, price: PRICES.hcl, group: 'Reagents' },
    { id: 'acid', label: 'Sulfuric acid (Cl₂ drying)', unit: 't', perT: acid, price: PRICES.acid, group: 'Reagents' },
    { id: 'sulfite', label: 'Sodium sulfite', unit: 't', perT: sulfite, price: PRICES.sulfite, group: 'Reagents' },
    { id: 'power', label: 'Electricity (net)', unit: 'MWh', perT: netMWh, price: src.price, group: 'Energy' },
  ]
  if (o2kg > 0) inputs.push({ id: 'o2', label: 'Oxygen (made on site)', unit: 't', perT: o2kg / 1000, price: 0, group: 'Raw materials', note: 'Power already counted' })
  if (gasGJ > 0) inputs.push({ id: 'gas', label: 'Natural gas (steam)', unit: 'GJ', perT: gasGJ, price: GAS.pricePerGJ, group: 'Energy' })
  inputs.forEach((i) => {
    i.perYear = y(i.perT)
    i.costYear = i.perYear * i.price
  })

  const naohValue = s.naohPrice * (c.saltyCaustic ? 0.9 : 1)
  const outputs = [
    { id: 'cl2', label: 'Liquid chlorine', unit: 't', perT: 1, kind: 'product', price: s.cl2Price },
    { id: 'naoh', label: 'Caustic soda (as 100% NaOH)', unit: 't', perT: NAOH, kind: 'product', price: naohValue, note: `Shipped as ${compactNum(NAOH * 2)} t of 50% solution` },
  ]
  if (hasH2) {
    const h2Label = { fuelcell: 'Hydrogen → fuel cell power', boiler: 'Hydrogen → steam', sell: 'Hydrogen (sold)', vent: 'Hydrogen (vented)' }[h2Use]
    outputs.push({ id: 'h2', label: h2Label, unit: 't', perT: H2, kind: h2Use === 'sell' ? 'product' : h2Use === 'vent' ? 'waste' : 'byproduct', price: h2Use === 'sell' ? s.h2Price * 1000 : 0 })
  }
  outputs.push(
    { id: 'hypo', label: 'Bleach from tail gas', unit: 't', perT: 0.02, kind: 'byproduct', price: 0 },
    { id: 'spent', label: 'Spent sulfuric acid', unit: 't', perT: acid * 1.4, kind: 'waste', price: 0 },
    { id: 'purge', label: 'Brine purge', unit: 'm³', perT: 0.12, kind: 'waste', price: 0 },
    { id: 'co2', label: 'CO₂ emitted (scope 1+2)', unit: 't', perT: co2, kind: 'waste', price: 0 },
  )
  if (mercuryG > 0) outputs.push({ id: 'hg', label: 'Mercury released', unit: 'kg', perT: mercuryG / 1000, kind: 'waste', price: 0 })
  outputs.forEach((o) => (o.perYear = y(o.perT)))

  // ---------- economics ----------
  const scale = Math.pow(s.capacity / 250000, 0.7)
  const fcKW = (fuelCellKWh * production) / 8760 / (s.utilization / 100)
  const capexParts = {
    cells: areaM2 * c.costM2,
    plant: 380e6 * scale * (c.mercury ? 1.1 : 1),
    evaporator: waterEvap > 0 ? (s.mvr ? 28e6 : 18e6) * scale * (c.saltyCaustic ? 1.8 : 1) : 0,
    hydrogen: h2Use === 'fuelcell' ? fcKW * 1600 : h2Use === 'sell' ? 18e6 * scale : h2Use === 'boiler' ? 6e6 * scale : 0,
    oxygen: s.cell === 'odc' ? ((o2kg * s.capacity) / 8760) * 5000 / 1000 : 0,
  }
  const capex = Object.values(capexParts).reduce((a, b) => a + b, 0)

  const revenueParts = {
    cl2: production * s.cl2Price,
    naoh: y(NAOH) * naohValue,
    h2: y(h2Sold / 1000) * s.h2Price * 1000,
  }
  const revenue = revenueParts.cl2 + revenueParts.naoh + revenueParts.h2
  const variable = inputs.reduce((a, i) => a + i.costYear, 0)
  const membranes = s.cell === 'odc' || s.cell === 'membrane' ? (areaM2 * (s.cell === 'odc' ? 2200 : 1500)) / 4 : areaM2 * 150
  const staff = Math.round(140 + (s.capacity / 1000) * 0.5)
  const fixed = capex * 0.025 + staff * 48000 + membranes
  const ebitda = revenue - variable - fixed
  const margin = revenue > 0 ? ebitda / revenue : 0

  const projection = []
  let cumulative = 0
  let npv = 0
  let paybackYear = null
  for (let t = -2; t <= 15; t++) {
    let cash
    let ramp = 0
    if (t < 0) cash = -capex * (t === -2 ? 0.4 : 0.6)
    else if (t === 0) cash = 0
    else {
      ramp = t === 1 ? 0.6 : t === 2 ? 0.9 : 1
      cash = (revenue - variable) * ramp - fixed
    }
    cumulative += cash
    npv += cash / Math.pow(1.08, t + 2)
    if (paybackYear === null && t > 0 && cumulative >= 0) paybackYear = t
    projection.push({ year: t, cash, cumulative, ramp })
  }

  return {
    settings: s,
    cell: c,
    production,
    inputs,
    outputs,
    voltage,
    dcKWh: dc,
    acKWh: ac,
    aux,
    auxTotal,
    fuelCellKWh,
    netKWh,
    minKWh,
    efficiency: minKWh / netKWh,
    currentKA,
    areaM2,
    elements,
    stacks,
    waterEvap,
    steamT,
    h2kg,
    h2Use,
    o2kg,
    gasGJ,
    co2,
    co2Parts: { power: co2Power, gas: co2Gas },
    freshWater,
    mercuryG,
    naoh: NAOH,
    pvc: production / 0.567, // PVC is 56.7% chlorine by mass
    staff,
    econ: { capex, capexParts, revenue, revenueParts, variable, fixed, membranes, ebitda, margin, npv, paybackYear, projection },
    perT: { salt, netMWh, co2, freshWater, gasGJ },
  }
}

function compactNum(v) {
  return v.toFixed(2)
}
