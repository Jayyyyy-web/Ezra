# Ezra Chlorine Works

An interactive 3D model of a high-efficiency chlorine plant. Change how the plant is designed and run, and watch the resources it needs, the products it makes and its projected finances update live.

## What the plant does

Chlorine is made by **chlor-alkali electrolysis**: running a large direct current through salt water.

```
2 NaCl + 2 H₂O           → Cl₂ + 2 NaOH + H₂     membrane, diaphragm and mercury cells
2 NaCl +   H₂O + ½ O₂    → Cl₂ + 2 NaOH          oxygen-depolarised cathode (ODC)
```

Every tonne of chlorine comes with about 1.13 t of caustic soda, plus 28 kg of hydrogen in most cell types.

**Brine loop.** Salt dome → brine purification (clarifier, filters, ion exchange) → cell room → dechlorination → back to the salt dome.

**Chlorine.** Cooling and drying with sulfuric acid → compression and liquefaction → pressurised storage and rail loading.

**Caustic soda.** The evaporator lifts caustic from 32% to the 50% customers buy.

**Hydrogen or oxygen.** Hydrogen goes to a fuel cell, a steam boiler, sale or a vent. ODC cells use oxygen from an on-site air separation unit instead.

**Utilities.** Rectifiers, power supply and water treatment.

## Why this design is the most efficient

Nearly all the energy goes into the cells, and energy per tonne is set by cell voltage:

```
kWh per t Cl₂ = 756 kAh × cell voltage ÷ current efficiency
```

An oxygen-depolarised cathode drops the cell voltage from about 2.9 V to about 2.0 V. That cuts electricity use by roughly 30%, from about 2.6 to 1.9 MWh per tonne of chlorine. Mechanical vapour recompression removes the need for steam, and renewable power cuts the carbon.

Current density is the main trade-off. Running the cells harder needs less cell area, so the plant is cheaper to build, but it uses more power per tonne.

## What you can change

| Group | Controls |
| --- | --- |
| Cells | Technology (ODC, membrane, diaphragm, mercury), current density |
| Scale | Capacity (50–500 kt Cl₂/yr), utilisation |
| Energy | Power source, what to do with hydrogen, MVR evaporator |
| Market | Chlorine, caustic, hydrogen and salt prices |

The 3D site responds too. The number of electrolysers grows or shrinks with capacity and current density, each cell technology has its own look, and the hydrogen area shows a fuel cell, boiler, tube trailers, vent stack or oxygen plant depending on your choices.

## What it reports

- **Inputs:** salt, water, reagents and energy, per tonne and per year, with costs
- **Outputs:** chlorine, caustic soda, hydrogen, by-products, waste and CO₂
- **Energy:** a breakdown of electricity per tonne, from the cells to the fuel-cell credit
- **Projection:** 15 years of cash flow with build cost, profit, payback and NPV
- **Compare:** this plant against a conventional membrane plant and a legacy mercury plant

Click any unit in the 3D view to see its conditions and live in/out flows.

## Model notes

Material flows come from stoichiometry. Cell voltage is modelled as V = V₀ + k·j for each technology, using typical published values. Prices, auxiliary energy and build costs are indicative ranges. The model lives in `src/model/plant.js` and is meant for comparing options, not for investment decisions.

## Run it in VS Code

1. Install [Node.js](https://nodejs.org) (version 20 or newer).
2. Clone the repo and open the folder in VS Code.
3. Run `npm install` once in the terminal (or **Terminal → Run Task → Install dependencies**).
4. Press **F5** and pick **Launch site (Chrome)** or **Launch site (Edge)**. The dev server starts and the site opens at http://localhost:5173. Saved edits reload automatically.

## Run it from a terminal

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

Pushing to `main` deploys the site to GitHub Pages through `.github/workflows/deploy.yml`. To turn that on, open the repo's **Settings → Pages** and set the source to **GitHub Actions**.

## Code map

```
src/
  model/plant.js      electrochemistry, mass, energy, carbon and money model
  model/units.js      process units: position, description, live flows
  scene/              three.js site (react-three-fiber)
  ui/                 controls, results tabs, cash chart, unit card
```
