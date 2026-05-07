# Debug Tools

Debug tooling should start early because procedural city systems are hard to inspect from rendered geometry alone.

## Early Controls

| Control | Purpose |
| --- | --- |
| Seed | Reproduce or regenerate cities. |
| Grid/block size | Tune city scale and density. |
| District overlay | Verify blueprint rules and district transitions. |
| LOD mode | Force low/medium/high/detail views. |
| Traffic density | Test agent and performance load. |
| Prop/tree density | Tune detail and performance tradeoffs. |
| Validation overlay | Show errors, warnings, and affected object IDs. |
| Performance overlay | Show frame time, draw calls, triangles, agents, chunk counts. |

## Object Picking

Clicking or hovering a city object should eventually show:

- ID, kind, owner domain, parent ID.
- District, block, parcel, building references.
- LOD tier and asset binding.
- Validation issues.
- Source metadata and confidence.
- Simulation state if applicable.

## Overlays

| Overlay | Contents |
| --- | --- |
| Land | Boundaries, blocks, parcels, zoning, hazards, water. |
| Mobility | Road hierarchy, lanes, sidewalks, crossings, route graphs. |
| Utilities | Power, water, wastewater, stormwater, telecom, service access. |
| Public realm | Trees, lighting, furniture, signs, parks, plazas. |
| Environment | Sun/shadow, wind, heat, noise, air, flood. |
| Operations | Maintenance, sensors, closures, events, emergency response. |
| Simulation | Agents, routes, congestion, crowds, schedules, incidents. |

## Acceptance Criteria

- Debug UI must inspect city data, not scrape Three.js mesh names.
- Validation overlay must link issues back to object IDs.
- Performance overlay should be available before Phase 6 scaling work.
- Authoring controls should mutate config/blueprint inputs, then regenerate deterministically.
