// Ezra plant model.
//
// An integrated plant that makes NMC811 cathode active material (CAM),
// LiNi0.8Mn0.1Co0.1O2, the powder that stores energy in most long-range EV
// batteries. It refines its own lithium hydroxide from spodumene ore, then
// co-precipitates the nickel-manganese-cobalt precursor and fires the two
// together into cathode.
//
// Numbers are indicative engineering estimates built from stoichiometry plus
// typical published ranges for energy use and prices. They are good for
// comparing options, not for an investment decision.

// ---------- chemistry (per tonne of CAM) ----------
const MW = {
  CAM: 6.94 + 0.8 * 58.69 + 0.1 * 54.94 + 0.1 * 58.93 + 32.0, // 97.27 g/mol
  PCAM: 0.8 * 58.69 + 0.1 * 54.94 + 0.1 * 58.93 + 34.01, // Ni0.8Mn0.1Co0.1(OH)2
  LiOH_H2O: 41.96,
  NiSO4_6H2O: 262.85,
  MnSO4_H2O: 169.02,
  CoSO4_7H2O: 281.1,
  NaOH: 40.0,
  Na2SO4: 142.04,
  Li2O: 29.88,
  H2SO4: 98.08,
  CaCO3: 100.09,
}

const MOL_CAM = 1e6 / MW.CAM // mol of CAM in one tonne
const LI_EXCESS = 1.03 // lithium is dosed ~3% over stoichiometry
const SPODUMENE_GRADE = 0.06 // SC6 concentrate: 6% Li2O
const ACID_EXCESS = 1.35
const CAM_KG_PER_KWH = 1.45 // NMC811 cathode per kWh of finished cell

// ---------- reference data ----------
export const ENERGY_SOURCES = {
  grid: { label: 'Grid average', co2: 0.474, price: 95, note: 'Mixed grid supply, about 0.47 t CO2 per MWh.' },
  hybrid: { label: 'Solar + wind + storage', co2: 0.12, price: 72, note: '80% on-site renewables, 20% grid top-up.' },
  solar: { label: 'Solar PPA', co2: 0.04, price: 58, note: 'Contracted solar with battery firming.' },
  wind: { label: 'Offshore wind PPA', co2: 0.012, price: 64, note: 'Contracted offshore wind with firming.' },
}
const GAS = { co2PerGJ: 0.056, pricePerGJ: 10 }

export const DEFAULTS = {
  capacity: 30000, // t CAM per year, nameplate
  utilization: 88, // % of nameplate actually produced
  energy: 'hybrid',
  electricKiln: true,
  heatRecovery: true,
  waterRecycle: 90, // %
  liRecovery: 88, // % of lithium in ore that reaches product
  sulfateRecovery: true,
  camPrice: 24, // $/kg
  spodumenePrice: 950, // $/t SC6
  nickelPrice: 3800, // $/t nickel sulfate hexahydrate
  packKwh: 75,
}

// A conventional plant for comparison: gas kiln, grid power, no heat
// integration, lower water recycling and lithium yield.
export const CONVENTIONAL = {
  ...DEFAULTS,
  energy: 'grid',
  electricKiln: false,
  heatRecovery: false,
  waterRecycle: 60,
  liRecovery: 82,
  sulfateRecovery: false,
}

const PRICES = {
  cobalt: 6500, // $/t CoSO4·7H2O
  manganese: 900,
  naoh: 450,
  acid: 110,
  limestone: 40,
  ammonia: 450,
  oxygen: 90,
  water: 1.2, // $/m3
  sulfateSale: 120, // $/t Na2SO4 (detergent, glass, paper grade)
  sulfateDisposal: 65, // $/t to treat and discharge as brine
}

// ---------- the model ----------
export function runModel(s) {
  const production = (s.capacity * s.utilization) / 100 // t CAM/yr
  const rec = s.liRecovery / 100
  const recycle = s.waterRecycle / 100
  const hr = s.heatRecovery ? 0.8 : 1 // 20% less energy on thermal steps

  // per tonne CAM
  const lioh = (MOL_CAM * LI_EXCESS * MW.LiOH_H2O) / 1e6
  const molLi = (lioh * 1e6) / MW.LiOH_H2O
  const li2o = ((molLi / 2) * MW.Li2O) / 1e6
  const spodumene = li2o / SPODUMENE_GRADE / rec
  const acid = ((molLi / 2) * MW.H2SO4 * ACID_EXCESS) / 1e6
  const limestone = ((molLi / 2) * (ACID_EXCESS - 1) * MW.CaCO3) / 1e6
  const naohLi = (molLi * MW.NaOH * 1.02) / 1e6
  const na2so4Li = ((molLi / 2) * MW.Na2SO4) / 1e6

  const nickel = (MOL_CAM * 0.8 * MW.NiSO4_6H2O) / 1e6
  const manganese = (MOL_CAM * 0.1 * MW.MnSO4_H2O) / 1e6
  const cobalt = (MOL_CAM * 0.1 * MW.CoSO4_7H2O) / 1e6
  const naohP = (MOL_CAM * 2 * MW.NaOH * 1.02) / 1e6
  const na2so4P = (MOL_CAM * MW.Na2SO4) / 1e6
  const pcam = (MOL_CAM * MW.PCAM) / 1e6
  const ammonia = 0.04
  const oxygen = 0.35

  const na2so4 = na2so4Li + na2so4P
  const tailings = spodumene * 0.93 + limestone * 1.36 // aluminosilicate residue + gypsum

  // energy per tonne CAM
  const kilnHeatGJ = spodumene * 1.7 * hr // decrepitation 1050 °C + acid roast 250 °C
  const kilnMWh = s.electricKiln ? kilnHeatGJ / 3.6 / 0.85 : 0
  const kilnGasGJ = s.electricKiln ? 0 : kilnHeatGJ / 0.7
  const elec = {
    kiln: kilnMWh,
    leach: lioh * 0.12,
    crystallizer: lioh * 0.9 * hr * (s.heatRecovery ? 1 : 1.9), // MVR vs steam-driven
    pcam: 1.3,
    cam: 2.8 * hr,
    finishing: 0.5,
    sulfate: s.sulfateRecovery ? na2so4 * 0.35 * hr : 0.05,
    utilities: 0.4,
  }
  const elecTotal = Object.values(elec).reduce((a, b) => a + b, 0)

  // water per tonne CAM
  const waterGross = 45
  const waterEvap = 2
  const freshWater = waterGross * (1 - recycle) + waterEvap
  const wastewater = waterGross * (1 - recycle) * 0.85 + (s.sulfateRecovery ? 0 : na2so4 * 4)

  // carbon per tonne CAM (scope 1 + 2)
  const src = ENERGY_SOURCES[s.energy]
  const co2Power = elecTotal * src.co2
  const co2Gas = kilnGasGJ * GAS.co2PerGJ
  const co2Process = limestone * 0.44
  const co2 = co2Power + co2Gas + co2Process

  // per-year flows
  const y = (v) => v * production
  const inputs = [
    { id: 'spodumene', label: 'Spodumene ore (SC6)', unit: 't', perT: spodumene, price: s.spodumenePrice, group: 'Ore' },
    { id: 'nickel', label: 'Nickel sulfate', unit: 't', perT: nickel, price: s.nickelPrice, group: 'Metal salts' },
    { id: 'cobalt', label: 'Cobalt sulfate', unit: 't', perT: cobalt, price: PRICES.cobalt, group: 'Metal salts' },
    { id: 'manganese', label: 'Manganese sulfate', unit: 't', perT: manganese, price: PRICES.manganese, group: 'Metal salts' },
    { id: 'naoh', label: 'Caustic soda (NaOH)', unit: 't', perT: naohLi + naohP, price: PRICES.naoh, group: 'Reagents' },
    { id: 'acid', label: 'Sulfuric acid', unit: 't', perT: acid, price: PRICES.acid, group: 'Reagents' },
    { id: 'limestone', label: 'Limestone', unit: 't', perT: limestone, price: PRICES.limestone, group: 'Reagents' },
    { id: 'ammonia', label: 'Ammonia (make-up)', unit: 't', perT: ammonia, price: PRICES.ammonia, group: 'Reagents' },
    { id: 'oxygen', label: 'Oxygen', unit: 't', perT: oxygen, price: PRICES.oxygen, group: 'Reagents' },
    { id: 'water', label: 'Fresh water', unit: 'm³', perT: freshWater, price: PRICES.water, group: 'Utilities' },
    { id: 'power', label: 'Electricity', unit: 'MWh', perT: elecTotal, price: src.price, group: 'Utilities' },
  ]
  if (kilnGasGJ > 0) {
    inputs.push({ id: 'gas', label: 'Natural gas (kiln)', unit: 'GJ', perT: kilnGasGJ, price: GAS.pricePerGJ, group: 'Utilities' })
  }
  inputs.forEach((i) => {
    i.perYear = y(i.perT)
    i.costYear = i.perYear * i.price
  })

  const outputs = [
    { id: 'cam', label: 'NMC811 cathode powder', unit: 't', perT: 1, kind: 'product' },
    {
      id: 'na2so4',
      label: s.sulfateRecovery ? 'Sodium sulfate (sold)' : 'Sodium sulfate (brine to treatment)',
      unit: 't',
      perT: na2so4,
      kind: s.sulfateRecovery ? 'byproduct' : 'waste',
    },
    { id: 'tailings', label: 'Leach residue + gypsum', unit: 't', perT: tailings, kind: 'residue', note: 'Usable as cement or construction filler.' },
    { id: 'wastewater', label: 'Treated wastewater', unit: 'm³', perT: wastewater, kind: 'waste' },
    { id: 'co2', label: 'CO₂ emitted (scope 1+2)', unit: 't', perT: co2, kind: 'waste' },
  ]
  outputs.forEach((o) => (o.perYear = y(o.perT)))

  // intermediates, for the unit panels
  const intermediates = { lioh: y(lioh), pcam: y(pcam), li2o: y(li2o) }

  // ---------- economics ----------
  const scale = Math.pow(s.capacity / 30000, 0.7)
  const capex =
    1.5e9 * scale * (1 + (s.heatRecovery ? 0.03 : 0) + (s.electricKiln ? 0.02 : 0)) +
    (s.sulfateRecovery ? 45e6 * scale : 0) +
    (s.waterRecycle > 80 ? 30e6 * scale * ((s.waterRecycle - 80) / 15) : 0)

  const revenueCam = production * s.camPrice * 1000
  const revenueSulfate = s.sulfateRecovery ? y(na2so4) * PRICES.sulfateSale : 0
  const revenue = revenueCam + revenueSulfate
  const variable = inputs.reduce((a, i) => a + i.costYear, 0) + (s.sulfateRecovery ? 0 : y(na2so4) * PRICES.sulfateDisposal)
  const staff = Math.round(260 + (s.capacity / 1000) * 11)
  const fixed = capex * 0.025 + staff * 48000
  const ebitda = revenue - variable - fixed
  const margin = revenue > 0 ? ebitda / revenue : 0

  // 15-year projection: 2 build years then a 3-year ramp
  const projection = []
  let cumulative = 0
  let npv = 0
  let paybackYear = null
  const rate = 0.08
  for (let t = -2; t <= 15; t++) {
    let cash
    let ramp = 0
    if (t < 0) cash = -capex * (t === -2 ? 0.4 : 0.6)
    else if (t === 0) cash = 0
    else {
      ramp = t === 1 ? 0.4 : t === 2 ? 0.75 : 1
      cash = (revenue - variable) * ramp - fixed
    }
    cumulative += cash
    npv += cash / Math.pow(1 + rate, t + 2)
    if (paybackYear === null && t > 0 && cumulative >= 0) paybackYear = t
    projection.push({ year: t, cash, cumulative, ramp })
  }

  const evs = (production * 1000) / (CAM_KG_PER_KWH * s.packKwh)
  const gwh = (production * 1000) / CAM_KG_PER_KWH / 1e6

  return {
    settings: s,
    production,
    inputs,
    outputs,
    intermediates,
    elec,
    elecTotal,
    kilnGasGJ,
    co2,
    co2Parts: { power: co2Power, gas: co2Gas, process: co2Process },
    freshWater,
    liYield: rec,
    evs,
    gwh,
    staff,
    econ: { capex, revenue, revenueCam, revenueSulfate, variable, fixed, ebitda, margin, npv, paybackYear, projection },
    perT: { spodumene, lioh, pcam, na2so4, co2, elecTotal, freshWater, kilnGasGJ },
  }
}

// Energy intensity in one number (GJ of primary energy-equivalent per t CAM)
export function energyGJ(r) {
  return r.elecTotal * 3.6 + r.kilnGasGJ
}
