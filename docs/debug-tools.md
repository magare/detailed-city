# Debug Tools

Debug tooling should start early because procedural city systems are hard to inspect from rendered geometry alone.

## Early Controls

| Control | Purpose |
| --- | --- |
| Seed | Reproduce or regenerate cities. |
| Grid/block size | Tune city scale and density. |
| District overlay | Verify blueprint rules and district transitions. |
| Constraint overlay | Inspect setbacks, no-build zones, clearances, waterfront buffers, and conflict focus geometry. |
| LOD mode | Force low/medium/high/detail views. |
| Traffic density | Test agent and performance load. |
| Prop/tree density | Tune detail and performance tradeoffs. |
| Validation overlay | Show errors, warnings, and affected object IDs. |
| Performance overlay | Show frame time, draw calls, triangles, agents, chunk counts. |

Runtime performance data is available through `App.getPerformanceDiagnostics()`. It reports frame timing, renderer draw calls, triangles, active agents, and pass/warn checks against the current performance budget.

## First Runtime Panel

`src/app/DebugPanel.ts` mounts a compact read-only diagnostics panel over the canvas. It reads from generated city diagnostics and `App.getPerformanceDiagnostics()`; it does not mutate renderer state or regenerate the city.

The panel currently exposes:

- Seed.
- Active config quality preset, grid size, and traffic density.
- District character rule count and transition-buffer count.
- Constraint rule count and no-build rule count.
- Validation status and issue count.
- Geospatial frame mode and coordinate precision.
- Source metadata tagged-object coverage.
- Traffic vehicle and lane-marking counts.
- Building and active-frontage counts.
- Building fire-safety profile, fire-lane, and refuge counts.
- Asset definition and render binding counts.
- Asset inventory record count, maintenance-watch count, and owner count.
- Maintenance operation count, repair queue count, and temporary closure count.
- Permit and inspection record count, development permit count, and temporary closure permit count.
- Curb activation count, parklet count, and seating capacity.
- Public amenity count, public-toilet count, and expected daily comfort users.
- Import/export format count and procedural seed export object count.
- Registered object-kind count.
- Active overlay IDs.
- LOD policy tiers and object-kind policy count.
- Runtime performance budget status, draw calls, and frame timing.

Use `?debugPanel=hidden` when a clean canvas is needed for smoke screenshots or visual inspection.

## Object Picking

The executable picking path is produced by `src/city/rendering-handoff/picking/pickingMetadata.ts` and attached to render objects while the scene is built. `App.pickCityObjectAtClientPoint(...)` raycasts through the city group and resolves regular meshes plus instanced meshes back to generated city object metadata.

Clicking or hovering a city object should eventually show:

- ID, kind, owner domain, parent ID.
- District, block, parcel, building, road, sidewalk, and slice references where the object carries them.
- LOD tier and asset binding.
- Validation issues.
- Source metadata and confidence.
- Simulation state such as vehicle lane, route nodes, speed, stop zones, and incident hooks if applicable.

## Overlays

The first executable overlay data is produced by `src/city/rendering-handoff/overlays/overlayData.ts`. These datasets are queryable diagnostics, not visible controls yet, and are derived from domain objects plus validation results. Current executable datasets include administrative boundaries, districts, zoning, waterways, waterfront, hazards, topography, soil/geology, city metrics, building access, building fire safety, emergency service anchors, addressing/gazetteer, access controls, public lighting, signage/wayfinding, green stormwater, freight logistics, water transport access, asset inventory, maintenance operations, permits/inspections, curb activations, public amenities, constraints, resilience goals, service access, thermal service and outage maps, parcels, roads, validation issues, and owner domains.

Validation issue overlay features now carry focus targets. When a validation issue provides an affected point, affected boundary, or suggested fix, the overlay feature uses that precise geometry and remediation text; otherwise it falls back to the referenced city object geometry.

| Overlay | Contents |
| --- | --- |
| Land | Boundaries, blocks, parcels, zoning, hazards, topography, soil/geology, water. |
| Mobility | Road hierarchy, lanes, sidewalks, crossings, route graphs, freight logistics, and water transport access. |
| Utilities | Power, water, wastewater, stormwater, telecom, gas, district energy, and service access. |
| Green stormwater | Feature counts, routed runoff features, tree-linked trenches, maintenance owners, storage/treatment capacity, and overlay features. |
| Public realm | Trees, lighting, furniture, signs, parks, plazas, curb activations, public amenities, comfort metrics, and utility/service access references. |
| Environment | Sun/shadow, wind, heat, noise, air, flood. |
| Operations | Asset inventory ownership, lifecycle, condition, replacement cost, maintenance, permits, inspections, compliance, sensors, closures, events, emergency response. |
| Simulation | Agents, routes, congestion, crowds, schedules, incidents. |

## Acceptance Criteria

- Debug UI must inspect city data, not scrape Three.js mesh names.
- Validation overlay must link issues back to object IDs.
- Validation overlay features should expose focus geometry and suggested remediation whenever validators provide it.
- Overlay datasets must expose stable IDs, source object IDs, owner domains, feature counts, and geometry where available.
- Performance diagnostics are visible in the runtime panel before Phase 6 scaling work.
- Import/export diagnostics should summarize exchange readiness without embedding renderer state in the exported artifact.
- Config diagnostics should list the active seed, quality preset, density settings, district settings, and render quality fields that produced the current city.
- Authoring controls should mutate config/blueprint inputs, then regenerate deterministically.
