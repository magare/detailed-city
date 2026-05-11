# Detailed City

A Three.js city sandbox organized around a real city-planning domain first, then rendering. Roads, parcels, districts, buildings, traffic, lighting, weather, utilities, civic services, public realm, operations, simulation, assets, and performance systems each have a clear place to grow.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Verify

```bash
npm run build
npm run test:e2e
```

## Structure

```text
src/
  city/                Real city-planning domain: land, mobility, utilities, buildings, public realm, operations, simulation.
  app/                 Application composition.
  core/                Renderer, scene, clock, viewport, and render loop.
  world/               City-level scene objects and domain modules.
  generation/          Procedural generation for roads, terrain, buildings, traffic.
  systems/             Runtime systems: camera, controls, lighting, weather, performance.
  rendering/           Materials, shaders, and postprocessing.
  assets/              Typed asset catalogs and import helpers.
  config/              Tunable city and render configuration.
  utils/               Shared utilities such as seeded random and disposal.
  types/               Shared domain types.
public/assets/         Static files served directly by Vite.
docs/                  Architecture notes and expansion roadmap.
tests/e2e/             Browser smoke tests for WebGL rendering.
```

See `docs/city-domain-structure.md` for the full city-planning tree and ownership rules. See
`docs/city-kanban.md` for the complete implementation Kanban board.
