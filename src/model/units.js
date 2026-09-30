// Process units of the chlorine plant: where they sit in the 3D site and
// what they do. flows(r) returns the live numbers shown when a unit is selected.
import { ENERGY_SOURCES, H2_USES } from './plant.js'

const t = (v) => ({ v, u: 't/yr' })
const pick = (r, id) => r.inputs.find((i) => i.id === id)?.perYear ?? 0
const out = (r, id) => r.outputs.find((o) => o.id === id)?.perYear ?? 0
const mwh = (kwhPerT, r) => ({ v: (kwhPerT * r.production) / 1000, u: 'MWh/yr' })

export const UNITS = [
  {
    id: 'salt',
    name: 'Salt dome',
    lane: 'Brine',
    pos: [-31, 0, -7],
    what: 'Covered store for vacuum salt. Salt is dissolved into returning brine to bring it back up to saturation, about 300 g/L.',
    conditions: 'Brine resaturated to 305 g/L NaCl',
    flows: (r) => ({
      in: [['Salt', t(pick(r, 'salt'))], ['Returning brine', { v: r.production * 6.5, u: 'm³/yr' }]],
      out: [['Saturated brine', { v: r.production * 7, u: 'm³/yr' }]],
    }),
  },
  {
    id: 'brine',
    name: 'Brine purification',
    lane: 'Brine',
    pos: [-19, 0, -7],
    what: 'Soda ash and caustic settle out calcium and magnesium in the clarifier. Ion-exchange columns then polish the brine to parts per billion, because traces of hardness ruin membranes.',
    conditions: 'Ca + Mg below 20 ppb',
    flows: (r) => ({
      in: [['Soda ash', t(pick(r, 'soda'))], ['Hydrochloric acid', t(pick(r, 'hcl'))]],
      out: [['Ultra-pure brine', { v: r.production * 7, u: 'm³/yr' }], ['Brine purge', { v: out(r, 'purge'), u: 'm³/yr' }]],
    }),
  },
  {
    id: 'rectifier',
    name: 'Rectifiers',
    lane: 'Power',
    pos: [-13, 0, 13],
    what: 'Transformers and thyristor rectifiers turn grid AC into the huge direct current the cells need. About 3% is lost here as heat.',
    conditions: (s, r) => `${Math.round(r.currentKA).toLocaleString('en-US')} kA DC in total`,
    flows: (r) => ({
      in: [['AC electricity', mwh(r.acKWh, r)]],
      out: [['DC to cells', mwh(r.dcKWh, r)]],
    }),
  },
  {
    id: 'cells',
    name: 'Cell room',
    lane: 'Electrolysis',
    pos: [2, 0, 0],
    what: (s, r) =>
      `${r.cell.note} Chlorine forms at the anode, caustic soda at the cathode${r.cell.h2 ? ', with hydrogen bubbling off it' : ''}.`,
    conditions: (s, r) =>
      `${r.cell.label} · ${s.j} kA/m² · ${r.voltage.toFixed(2)} V per cell · ${Math.round(r.areaM2).toLocaleString('en-US')} m² of cell area in ${r.stacks.toLocaleString('en-US')} ${r.cell.perStack > 1 ? 'electrolysers' : 'cells'}`,
    flows: (r) => ({
      in: [
        ['DC electricity', mwh(r.dcKWh, r)],
        ['Salt consumed', t(pick(r, 'salt'))],
        ...(r.o2kg ? [['Oxygen', t((r.o2kg / 1000) * r.production)]] : []),
      ],
      out: [
        ['Chlorine gas', t(r.production)],
        [`Caustic (${Math.round(r.cell.conc * 100)}%)`, t(r.naoh * r.production)],
        ...(r.h2kg ? [['Hydrogen', t((r.h2kg / 1000) * r.production)]] : []),
      ],
    }),
  },
  {
    id: 'dechlor',
    name: 'Dechlorination',
    lane: 'Brine',
    pos: [-20, 0, 5],
    what: 'Depleted brine leaving the cells still holds dissolved chlorine. A vacuum stripper and a little sodium sulfite remove it before the brine goes back to the salt dome.',
    conditions: 'Vacuum stripping, then sulfite polish',
    flows: (r) => ({
      in: [['Depleted brine', { v: r.production * 6.5, u: 'm³/yr' }], ['Sodium sulfite', t(pick(r, 'sulfite'))]],
      out: [['Brine back to salt dome', { v: r.production * 6.5, u: 'm³/yr' }]],
    }),
  },
  {
    id: 'chlorine',
    name: 'Chlorine drying',
    lane: 'Chlorine',
    pos: [18, 0, -10],
    what: 'Wet chlorine gas is cooled to condense most of the water, then scrubbed with strong sulfuric acid in packed towers. Dry chlorine is far less corrosive to steel.',
    conditions: '15 °C cooling, 98% H₂SO₄ towers',
    flows: (r) => ({
      in: [['Wet chlorine', t(r.production)], ['Sulfuric acid', t(pick(r, 'acid'))]],
      out: [['Dry chlorine', t(r.production)], ['Spent acid', t(out(r, 'spent'))]],
    }),
  },
  {
    id: 'liquefy',
    name: 'Liquefaction & storage',
    lane: 'Chlorine',
    pos: [30, 0, -10],
    what: 'Compressors and refrigeration turn chlorine into a liquid, which is stored in pressurised tanks and shipped by rail. Leftover tail gas is absorbed in caustic to make bleach.',
    conditions: '−30 °C liquefaction, about 7 bar storage',
    flows: (r) => ({
      in: [['Dry chlorine', t(r.production)], ['Electricity', mwh(r.aux.chlorine, r)]],
      out: [['Liquid chlorine', t(r.production)], ['Bleach from tail gas', t(out(r, 'hypo'))]],
    }),
  },
  {
    id: 'caustic',
    name: 'Caustic evaporator',
    lane: 'Caustic soda',
    pos: [18, 0, 10],
    what: (s, r) =>
      r.waterEvap === 0
        ? 'Mercury cells already make 50% caustic, so the evaporator stands idle and the product only needs cooling.'
        : `Boils off water to lift caustic from ${Math.round(r.cell.conc * 100)}% to the 50% that customers buy. ${s.mvr ? 'Mechanical vapour recompression reuses the vapour, so no steam is needed.' : 'A triple-effect evaporator runs on steam.'}`,
    conditions: (s, r) => (r.waterEvap === 0 ? 'Not needed' : s.mvr ? 'MVR evaporator' : 'Triple-effect, steam-driven'),
    flows: (r) => ({
      in: [
        [`Caustic (${Math.round(r.cell.conc * 100)}%)`, t(r.naoh * r.production)],
        ...(r.steamT ? [['Steam', t(r.steamT * r.production)]] : []),
        ...(r.settings.mvr && r.waterEvap ? [['Electricity (MVR)', mwh(r.aux.caustic, r)]] : []),
      ],
      out: [['50% caustic soda', t(r.naoh * 2 * r.production)], ['Water boiled off', t(r.waterEvap * r.production)]],
    }),
  },
  {
    id: 'gas',
    name: (s, r) => (r.cell.h2 ? 'Hydrogen' : 'Oxygen plant'),
    lane: (s, r) => (r.cell.h2 ? 'Hydrogen' : 'Oxygen'),
    pos: [30, 0, 10],
    what: (s, r) =>
      r.cell.h2
        ? `${H2_USES[s.h2Use].note} Every tonne of chlorine comes with about 28 kg of hydrogen.`
        : 'An air separation unit makes the oxygen the depolarised cathodes consume. It costs some power but saves far more at the cells.',
    conditions: (s, r) => (r.cell.h2 ? H2_USES[s.h2Use].label : 'Cryogenic air separation, 93% O₂'),
    flows: (r) =>
      r.cell.h2
        ? {
            in: [['Hydrogen', t((r.h2kg / 1000) * r.production)]],
            out: [
              r.h2Use === 'fuelcell'
                ? ['Electricity returned', mwh(r.fuelCellKWh, r)]
                : r.h2Use === 'boiler'
                  ? ['Steam heat', { v: (r.h2kg * 33.3 * 0.9 * r.production) / 1000, u: 'MWh/yr' }]
                  : r.h2Use === 'sell'
                    ? ['Hydrogen sold', t((r.h2kg / 1000) * r.production)]
                    : ['Vented to air', t((r.h2kg / 1000) * r.production)],
            ],
          }
        : {
            in: [['Air', t((r.o2kg / 1000) * r.production * 4.3)], ['Electricity', mwh(r.aux.oxygen, r)]],
            out: [['Oxygen to cells', t((r.o2kg / 1000) * r.production)]],
          },
  },
  {
    id: 'water',
    name: 'Water treatment',
    lane: 'Utilities',
    pos: [-4, 0, 21],
    what: 'Makes demineralised water for the cells and the caustic, and cooling-tower make-up.',
    conditions: 'Reverse osmosis + ion exchange',
    flows: (r) => ({
      in: [['Fresh water', { v: pick(r, 'water'), u: 'm³/yr' }]],
      out: [['Demin + cooling water', { v: pick(r, 'water'), u: 'm³/yr' }]],
    }),
  },
  {
    id: 'power',
    name: 'Power supply',
    lane: 'Utilities',
    pos: [-28, 0, 20],
    what: 'Electricity is about three-quarters of what a chlorine plant spends to run. The source sets both the power price and the carbon footprint.',
    conditions: (s) => ENERGY_SOURCES[s.energy].note,
    flows: (r) => ({
      in: [],
      out: [
        ['Electricity (net)', mwh(r.netKWh, r)],
        ['CO₂ from power', t(r.co2Parts.power * r.production)],
      ],
    }),
  },
]

export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]))

// resolve fields that can be plain values or functions of (settings, result)
export const field = (v, r) => (typeof v === 'function' ? v(r.settings, r) : v)
