// Process units: where they sit in the 3D site and what they do.
// flows(r) returns the live numbers shown when a unit is selected.
import { ENERGY_SOURCES } from './plant.js'

const t = (v) => ({ v, u: 't/yr' })
const pick = (r, id) => r.inputs.find((i) => i.id === id)?.perYear ?? 0
const out = (r, id) => r.outputs.find((o) => o.id === id)?.perYear ?? 0

export const UNITS = [
  {
    id: 'ore',
    name: 'Ore yard',
    lane: 'Lithium line',
    pos: [-27, 0, -8],
    what: 'Spodumene concentrate (6% Li₂O) arrives by rail and is blended so the kiln sees a steady feed grade.',
    conditions: 'Covered storage, 30 days of buffer',
    flows: (r) => ({ in: [['Spodumene ore', t(pick(r, 'spodumene'))]], out: [['Blended ore to kiln', t(pick(r, 'spodumene'))]] }),
  },
  {
    id: 'kiln',
    name: 'Rotary kiln',
    lane: 'Lithium line',
    pos: [-17, 0, -8],
    what: 'Heats ore to about 1050 °C so its crystal structure opens up (α → β spodumene). Then it is roasted with sulfuric acid at 250 °C to turn the lithium into soluble lithium sulfate.',
    conditions: (s) => (s.electricKiln ? 'Electrically heated, 1050 °C' : 'Gas-fired, 1050 °C'),
    flows: (r) => ({
      in: [
        ['Ore', t(pick(r, 'spodumene'))],
        ['Sulfuric acid', t(pick(r, 'acid'))],
        r.settings.electricKiln
          ? ['Electricity', { v: r.elec.kiln * r.production, u: 'MWh/yr' }]
          : ['Natural gas', { v: r.kilnGasGJ * r.production, u: 'GJ/yr' }],
      ],
      out: [['Roasted calcine', t(pick(r, 'spodumene') + pick(r, 'acid'))]],
    }),
  },
  {
    id: 'leach',
    name: 'Water leach',
    lane: 'Lithium line',
    pos: [-6, 0, -8],
    what: 'Hot water dissolves the lithium sulfate out of the calcine. Limestone neutralises the leftover acid, and the solid residue is filtered off.',
    conditions: '90 °C, pH 6–7',
    flows: (r) => ({
      in: [['Calcine', t(pick(r, 'spodumene'))], ['Limestone', t(pick(r, 'limestone'))]],
      out: [['Leach residue + gypsum', t(out(r, 'tailings'))], ['Lithium sulfate solution', t(r.intermediates.li2o * 3.68)]],
    }),
  },
  {
    id: 'purify',
    name: 'Purification',
    lane: 'Lithium line',
    pos: [1.5, 0, -8],
    what: 'Ion-exchange columns strip calcium, magnesium and trace metals. Caustic soda then converts lithium sulfate into lithium hydroxide, and sodium sulfate crystallises out.',
    conditions: 'Ion exchange, 0 °C sulfate crystallisation',
    flows: (r) => ({
      in: [['Caustic soda', t(r.perT.lioh * r.production * 0.972)]],
      out: [['Sodium sulfate', t(r.intermediates.li2o * 4.75)]],
    }),
  },
  {
    id: 'crystallizer',
    name: 'LiOH crystalliser',
    lane: 'Lithium line',
    pos: [8.5, 0, -8],
    what: 'Evaporates the solution until battery-grade lithium hydroxide monohydrate crystallises. With heat recovery on, mechanical vapour recompression reuses the steam.',
    conditions: (s) => (s.heatRecovery ? 'MVR evaporation, 99.5% LiOH' : 'Steam-driven evaporation, 99.5% LiOH'),
    flows: (r) => ({
      in: [['Electricity', { v: r.elec.crystallizer * r.production, u: 'MWh/yr' }]],
      out: [['Lithium hydroxide', t(r.intermediates.lioh)]],
    }),
  },
  {
    id: 'salts',
    name: 'Metal salt tanks',
    lane: 'Precursor line',
    pos: [-12, 0, 8],
    what: 'Nickel, manganese and cobalt sulfates are dissolved and mixed at an 8 : 1 : 1 metal ratio.',
    conditions: '2 mol/L mixed sulfate solution',
    flows: (r) => ({
      in: [
        ['Nickel sulfate', t(pick(r, 'nickel'))],
        ['Manganese sulfate', t(pick(r, 'manganese'))],
        ['Cobalt sulfate', t(pick(r, 'cobalt'))],
      ],
      out: [['Mixed metal solution', t(pick(r, 'nickel') + pick(r, 'manganese') + pick(r, 'cobalt'))]],
    }),
  },
  {
    id: 'pcam',
    name: 'Precursor reactors',
    lane: 'Precursor line',
    pos: [-2, 0, 8],
    what: 'Stirred reactors co-precipitate spherical Ni₀.₈Mn₀.₁Co₀.₁(OH)₂ particles about 10 µm across. Ammonia controls how the particles grow. One reactor train is added for every 10,000 t/yr of capacity.',
    conditions: '55 °C, pH 11.5, nitrogen blanket',
    flows: (r) => ({
      in: [
        ['Mixed metal solution', t(pick(r, 'nickel') + pick(r, 'manganese') + pick(r, 'cobalt'))],
        ['Caustic soda', t(pick(r, 'naoh') - r.perT.lioh * r.production * 0.972)],
        ['Ammonia make-up', t(pick(r, 'ammonia'))],
      ],
      out: [['Precursor slurry', t(r.intermediates.pcam)]],
    }),
  },
  {
    id: 'filter',
    name: 'Filter & dryer',
    lane: 'Precursor line',
    pos: [7, 0, 8],
    what: 'Washes sodium sulfate out of the precursor, then dries it. The wash water goes to the sulfate recovery unit.',
    conditions: 'Filter press, 110 °C dryer',
    flows: (r) => ({
      in: [['Precursor slurry', t(r.intermediates.pcam)]],
      out: [['Dry precursor', t(r.intermediates.pcam)], ['Sulfate-bearing wash water', { v: r.production * 30, u: 'm³/yr' }]],
    }),
  },
  {
    id: 'cam',
    name: 'Cathode kiln',
    lane: 'Cathode',
    pos: [18, 0, 0],
    what: 'Precursor and lithium hydroxide are blended and fired twice in pure oxygen in a roller-hearth kiln. This forms the layered LiNi₀.₈Mn₀.₁Co₀.₁O₂ crystal.',
    conditions: '750 °C, pure O₂, about 12 h residence',
    flows: (r) => ({
      in: [
        ['Dry precursor', t(r.intermediates.pcam)],
        ['Lithium hydroxide', t(r.intermediates.lioh)],
        ['Oxygen', t(pick(r, 'oxygen'))],
        ['Electricity', { v: r.elec.cam * r.production, u: 'MWh/yr' }],
      ],
      out: [['Fired cathode', t(r.production)]],
    }),
  },
  {
    id: 'finish',
    name: 'Finishing & packing',
    lane: 'Cathode',
    pos: [29, 0, 0],
    what: 'Milling, sieving and magnetic removal of stray metal. Then a dry-room pack-out into sealed bags for cell makers.',
    conditions: 'Dew point below −40 °C',
    flows: (r) => ({
      in: [['Fired cathode', t(r.production)]],
      out: [
        ['NMC811 cathode', t(r.production)],
        ['Battery capacity', { v: r.gwh, u: 'GWh/yr' }],
        ['EVs supplied', { v: r.evs, u: 'cars/yr' }],
      ],
    }),
  },
  {
    id: 'sulfate',
    name: 'Sulfate recovery',
    lane: 'Utilities',
    pos: [2, 0, 19],
    what: 'Evaporates the sodium sulfate from process water and sells it to detergent, glass and paper makers. When this is off, the brine has to be treated and discharged.',
    conditions: (s) => (s.sulfateRecovery ? 'Running: crystals sold' : 'Off: brine sent to treatment'),
    flows: (r) => ({
      in: [['Sulfate brine', t(out(r, 'na2so4'))]],
      out: [[r.settings.sulfateRecovery ? 'Sodium sulfate sold' : 'Brine to treatment', t(out(r, 'na2so4'))]],
    }),
  },
  {
    id: 'water',
    name: 'Water treatment',
    lane: 'Utilities',
    pos: [-10, 0, 19],
    what: 'Cleans process water so most of it can go back into the plant. The recycle rate sets how much fresh water the site needs.',
    conditions: (s) => `${s.waterRecycle}% of process water reused`,
    flows: (r) => ({
      in: [['Fresh water', { v: pick(r, 'water'), u: 'm³/yr' }]],
      out: [['Treated discharge', { v: out(r, 'wastewater'), u: 'm³/yr' }]],
    }),
  },
  {
    id: 'power',
    name: 'Power supply',
    lane: 'Utilities',
    pos: [-26, 0, 17],
    what: 'All electricity for the site. The source sets both the power price and the carbon footprint.',
    conditions: (s) => ENERGY_SOURCES[s.energy].note,
    flows: (r) => ({
      in: [],
      out: [
        ['Electricity', { v: r.elecTotal * r.production, u: 'MWh/yr' }],
        ['CO₂ from power', t(r.co2Parts.power * r.production)],
      ],
    }),
  },
]

export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]))
