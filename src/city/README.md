# City Domain

This directory is the real-city planning layer. It is intentionally separate from `src/world`, `src/generation`, and `src/rendering`.

The rule is simple: city concepts live here first, then generators and renderers consume them. A sidewalk, fire station, utility vault, curb lane, facade, flood zone, or street tree should have a domain home before it becomes a Three.js mesh.

## Structure

```text
city/
  blueprint/          Master plan, districts, phasing, constraints, resilience, metrics.
  land/               Boundaries, parcels, blocks, zoning, terrain, water, hazards, cadastre.
  mobility/           Streets, lanes, intersections, sidewalks, transit, cycling, routing, freight.
  utilities/          Power, water, wastewater, stormwater, telecom, waste, district energy.
  buildings/          Typologies, footprints, shell, facades, roofs, entrances, interiors, MEP, safety.
  public-realm/       Parks, plazas, trees, lighting, furniture, signs, public art, playgrounds.
  civic/              Government, education, healthcare, emergency, culture, religious, community uses.
  economy/            Retail, offices, industry, warehouses, hospitality, markets, tourism.
  environment/        Weather, sun, wind, air, noise, heat, ecology, flood risk.
  operations/         Maintenance, sensors, permits, events, emergency response, inventory.
  simulation/         Agents, traffic, pedestrians, transit, utilities, emergencies, day-night behavior.
  data-contracts/     Identifiers, geospatial references, LOD, import/export, validation, metadata.
  rendering-handoff/  Asset binding, LOD policy, material zones, mesh builders, scene layers.
```

## Build Order

1. Define city intent in `blueprint`.
2. Establish physical ground truth in `land`.
3. Add networks: `mobility` and `utilities`.
4. Add occupied and public places: `buildings`, `public-realm`, `civic`, `economy`.
5. Add risk and performance layers in `environment`.
6. Add maintenance and live behavior through `operations` and `simulation`.
7. Convert domain data to Three.js objects in `rendering-handoff`.

## Planning Rules

- Every object needs a stable ID, a location, an owner domain, and a level-of-detail strategy.
- The same object should not be invented twice. For example, a street light belongs to `public-realm/lighting`; its power feed belongs to `utilities/power-grid`; its inspection status belongs to `operations/maintenance`.
- Runtime behavior belongs in `simulation`; physical infrastructure belongs in its owning domain.
- Three.js-specific geometry, material, and instancing decisions belong in `rendering-handoff` or `src/rendering`, not in the planning folders.
- Shared object, geometry, LOD, validation, asset-binding, street-profile, and performance-budget contracts live in `data-contracts/cityContracts.ts`.
- Blueprint intent belongs in `blueprint` before generators consume it.
