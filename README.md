# Fishing Town Time Simulation

An interactive Three.js simulation of a fishing town evolving from a 500 BC fishery cove into a 1990 port metropolis.

## Features

- Procedural 3D town, harbor, expanded terrain, shaped ocean, boats, clouds, gulls, rain, lighthouse beam, smoke, cranes, vehicles, container terminal, solar panels, and wind turbines.
- Procedural texture pack for grass, sand, water, stone, wood, roofs, metal, glass, sails, roads, and hulls.
- Historically gated eras: ancient fishery harbor, late antique port, medieval herring town, age-of-sail port, mercantile harbor, steam cannery port, diesel industrial harbor, and modern port metropolis.
- Live sliders for year, population pressure, fish stock, storminess, sea level stress, tourism economy, and fishing industry.
- Play/pause button to run the timeline automatically with faster early-century ticks and slower modern ticks.
- Dynamic metrics for fleet size, catch, and harbor build-out.

## Run locally

```sh
npm install
npm run dev
```

Build for production:

```sh
npm run build
```

The production build is written to `docs/` for GitHub Pages. The repository is
configured for Pages at `https://phyous.github.io/fishing-town-sim/`, with a
GitHub Actions workflow that rebuilds and commits `docs/` after pushes to
`main`.
