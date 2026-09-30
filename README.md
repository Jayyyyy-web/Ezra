# Ezra Cathode Works

An interactive 3D model of a high-efficiency plant that makes battery cathode for electric cars. Change how the plant is designed and run, and watch the resources it needs, the products it makes and its projected finances update live.

## What the plant does

Ezra is an integrated **NMC811 cathode** plant. Cathode is the powder in a battery cell that stores lithium, and it is the most valuable material in an EV battery.

**Lithium line.** Spodumene ore → rotary kiln (1050 °C) → acid roast → water leach → purification → lithium hydroxide crystalliser.

**Precursor line.** Nickel, manganese and cobalt sulfates → stirred reactors that grow ~10 µm Ni₀.₈Mn₀.₁Co₀.₁(OH)₂ particles → filter and dryer.

**Cathode.** Precursor and lithium hydroxide are fired together in oxygen at 750 °C, then milled, sieved and packed.

**Utilities.** Sodium sulfate recovery, water treatment and the power supply (grid, solar, wind or a hybrid).

## What you can change

| Group | Controls |
| --- | --- |
| Scale | Capacity (5–60 kt/yr), utilisation, EV pack size |
| Energy | Power source, electric vs gas kiln, heat recovery |
| Process | Lithium recovery, water recycle rate, selling sodium sulfate |
| Market | Cathode, spodumene and nickel sulfate prices |

The 3D site responds too. Reactor trains and kiln lines are added as capacity grows, the power assets change with the energy source, and the kiln chimney appears when it burns gas.

## What it reports

- Resources in: ore, metal salts, reagents, water and energy, per tonne and per year, with costs
- Products out: cathode, sodium sulfate, residue, wastewater and CO₂
- Cars supplied per year and GWh of cells
- A 15-year cash projection with build cost, profit, payback and NPV
- A comparison against a conventional plant of the same size

Click any unit in the 3D view to see its conditions and live in/out flows.

## Model notes

Material flows come from reaction stoichiometry: LiNi₀.₈Mn₀.₁Co₀.₁O₂ at 97.3 g/mol, 3% lithium excess, and SC6 ore at 6% Li₂O. Energy use, prices and build cost are typical published ranges. The model lives in `src/model/plant.js` and is meant for comparing options, not for investment decisions.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
```

Pushing to `main` deploys the site to GitHub Pages through `.github/workflows/deploy.yml`. To turn that on, open the repo's **Settings → Pages** and set the source to **GitHub Actions**.

## Code map

```
src/
  model/plant.js      mass, energy, carbon and money model
  model/units.js      process units: position, description, live flows
  scene/              three.js site (react-three-fiber)
  ui/                 controls, results tabs, cash chart, unit card
```
