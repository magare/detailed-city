# City Implementation Kanban Board

This board turns the current roadmap, domain tree, contracts, and codebase into implementable work. It is scoped to the existing Three.js/Vite city app and the domain-first architecture under `src/city`.

Completeness was reviewed against the repository's domain model plus external reference scopes from [OGC CityGML 3.0](https://docs.ogc.org/is/20-010/20-010.html), the [NACTO Urban Street Design Guide](https://nacto.org/publication/urban-street-design-guide/), and [OpenStreetMap Map Features](https://wiki.openstreetmap.org/wiki/Map_features). Use those references when a card needs real-world validation against 3D city, street-design, or map-feature semantics.

## Board Rules

Status lanes:

| Lane | Meaning |
| --- | --- |
| Done | Implemented or already present in the repository baseline. |
| Ready | Clear enough to start next with local context and no product decision needed. |
| Next | Sequenced soon after Ready cards; dependencies are understood. |
| Backlog | Required for the complete city, but not yet ready or not on the immediate path. |
| Blocked | Needs an explicit decision, asset source, or technical choice before implementation. |

Card fields:

| Field | Rule |
| --- | --- |
| Priority | P0 blocks the city foundation; P1 completes core visible slices; P2 expands fidelity; P3 is polish or optional scale. |
| Size | XS touches 1 file, S 1-2 files, M 3-5 files, L 5-8 files. Anything larger should be split before work starts. |
| Dependency | A card cannot move to Done until all dependency cards are Done. |
| Acceptance | The minimum testable outcome. Every implementation card must update contracts, generation or authored data, validation, rendering handoff, diagnostics, docs, or tests as appropriate. |

Definition of Done for implementation cards:

- Domain data owns the city concept before Three.js meshes render it.
- Generated or authored output is deterministic for the same seed/config.
- Stable IDs, owner domain, parent relationships, LOD tier, metadata where needed, and asset/fallback binding are present.
- Validation rejects the main invalid states introduced by the card.
- Rendering handoff or scene layers consume domain data rather than inventing planning data in `src/world`.
- Diagnostics, debug UI, e2e smoke tests, unit tests, or benchmark checks cover the behavior.
- `npm run build` passes; `npm run test:e2e` passes for visible rendering changes.

Contribution workflow, ADR expectations, branch/test rules, and review checklists live in `docs/contribution-workflow.md`.

## Done

| ID | Card | Details | Acceptance Evidence |
| --- | --- | --- | --- |
| KAN-001 | App shell and renderer lifecycle | Vite, TypeScript, Three.js scene bootstrap, renderer, camera, resize, render loop, controls, lighting, weather atmosphere. | `src/app`, `src/core`, `src/systems`, `src/main.ts`. |
| KAN-002 | Domain-first city folder tree | Planning domains exist for blueprint, land, mobility, utilities, buildings, public realm, civic, economy, environment, operations, simulation, data contracts, and rendering handoff. | `src/city/**/README.md`, `docs/city-domain-structure.md`. |
| KAN-003 | Architecture and roadmap docs | Architecture boundaries, city roadmap, vertical slices, performance budget, visual style, debug tools, asset plan, generation rules, and validation spec are documented. | `docs/*.md`. |
| KAN-004 | Shared contract seed | Common IDs, object kinds, owner domains, geometry, LOD policy, street profiles, render bindings, validation result, and performance budget types exist. | `src/city/data-contracts/cityContracts.ts`. |
| KAN-005 | Executable city blueprint seed | Five district rules, named public spaces, one south river, and tree species assumptions are centralized. | `src/city/blueprint/cityBlueprint.ts`. |
| KAN-006 | Seeded procedural generation pipeline | City generator produces bounds, roads, parks, waterways, excluded blocks, districts, blocks, parcels, buildings, trees, LOD, budget, and validation. | `src/generation/CityGenerator.ts`. |
| KAN-007 | Road, lane, and sidewalk contracts | Grid roads have hierarchy, street profile ID, lanes, sidewalks, owner domain, parent IDs, and stable IDs. | `src/generation/roads/RoadNetworkGenerator.ts`. |
| KAN-008 | Land, parcels, and buildings seed | Blocks, parcels, zoning fields, parcel frontages, building footprints, uses, heights, floors, facade IDs, roof IDs, and entrances are generated. | `src/generation/buildings/BuildingGenerator.ts`. |
| KAN-009 | Parks, waterway, and park tree seed | Named parks, south river, block exclusions, and deterministic tree plantings are generated as domain objects. | `src/generation/terrain/TerrainGenerator.ts`. |
| KAN-010 | Basic traffic plan and rendering handoff | Lane markings and moving traffic vehicles are generated as data and rendered by a mesh builder boundary. | `src/generation/traffic/TrafficLaneGenerator.ts`, `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts`. |
| KAN-011 | Basic city scene rendering | Terrain, roads, water, parks, tree instances, building instances, rooftop details, lane markings, and vehicles render in `world/city`. | `src/world/city/City.ts`, `src/rendering/materials/MaterialLibrary.ts`. |
| KAN-012 | Validation gate and diagnostics seed | Generated city validation blocks invalid app startup; diagnostics expose schema, counts, validation, performance budget, and quality config. | `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/app/cityValidationGate.ts`, `src/app/cityDiagnostics.ts`. |
| KAN-013 | Browser smoke test | Playwright checks visible canvas output, validation status, issue count, and expected object counts. | `tests/e2e/city-smoke.spec.ts`. |
| KAN-101 | Add generated city object index | Typed object indexes resolve generated city objects, road children, lane markings, and traffic vehicles for validation and diagnostics. | `src/city/data-contracts/cityObjectIndex.ts`, `src/city/data-contracts/generatedCityObjectIndex.ts`; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks resolved 2,133 indexed runtime objects with zero duplicate IDs. |
| KAN-102 | Seed asset catalog and fallback bindings | Procedural asset catalog entries and render bindings cover terrain, asphalt, water, parks, buildings, roofs, trees, lane markings, and traffic vehicles. | `src/city/rendering-handoff/asset-binding/defaultAssetCatalog.ts`; validator asset warnings; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 10 asset definitions, 10 bindings, and zero validation issues. |
| KAN-103 | Move scene construction toward scene layers | City rendering now builds terrain, networks, buildings, public realm, agents, and overlays as named rendering-handoff layer groups. | `src/city/rendering-handoff/scene-layers/sceneLayerDefinitions.ts`, `src/world/city/City.ts`; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks found six runtime layer groups with nonblank canvas output. |
| KAN-104 | Add intersection domain objects | Grid road crossings now generate stable mobility-owned intersection objects with centers, connected roads, hierarchy mix, and signal expectations. | `src/generation/roads/RoadNetworkGenerator.ts`, `src/city/data-contracts/cityContracts.ts`; validator missing-road coverage; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 169 intersections and zero validation issues. |
| KAN-105 | Add crossing objects and sidewalk graph seed | Crossings and a deterministic sidewalk graph now connect road sidewalks through generated intersections. | `src/generation/roads/PedestrianNetworkGenerator.ts`, `src/city/data-contracts/cityContracts.ts`; validator missing-sidewalk and disconnected-crossing coverage; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 338 crossings, 676 graph nodes, and 962 graph edges. |
| KAN-106 | Add district and validation debug overlay data | Data-driven overlay datasets now expose districts, parcels, roads, validation issues, and owner-domain features from domain/runtime indexes. | `src/city/rendering-handoff/overlays/overlayData.ts`, `src/app/cityDiagnostics.ts`; overlay feature tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed five overlay datasets and 4,885 overlay features. |
| KAN-107 | Add object picking metadata path | Raycast and instanced-mesh picking metadata now resolves visible scene objects back to generated city IDs, owner domains, LOD, parents, and available refs. | `src/city/rendering-handoff/picking/pickingMetadata.ts`, `src/world/city/City.ts`, `src/app/App.ts`; picking catalog/raycast tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 1,308 pickable objects and sampled building picks with parcel/block/district refs. |
| KAN-108 | Add performance diagnostics baseline | Runtime performance diagnostics now capture frame timing, renderer draw calls/triangles, active agents, and pass/warn budget checks. | `src/systems/performance/PerformanceMonitor.ts`, `src/app/App.ts`, `src/app/cityDiagnostics.ts`; performance budget tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 41-44 draw calls, about 12.5k triangles, and 7 active agents under budget. |
| KAN-201 | Detailed street vertical slice contract | The deterministic `road-v-6` grand-avenue corridor now has a generated slice contract, slice tags, frontage/filter IDs, and QA camera target. | `src/generation/slices/DetailedStreetSliceGenerator.ts`, `src/city/data-contracts/cityContracts.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`; slice validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed one slice, 4,289 indexed objects, and corridor slice tags. |
| KAN-202 | Curb allocation and parking/loading zones | The detailed street slice now generates mobility-owned curb zones for no-stopping, loading, ride-hail, bus-stop, and emergency allocations. | `src/generation/curbs/CurbZoneGenerator.ts`, `src/city/data-contracts/cityContracts.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`; curb conflict tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 50 curb zones, 4,339 indexed objects, and zero validation issues. |
| KAN-203 | Street trees along road profiles | The detailed street slice now adds deterministic street trees in sidewalk furnishing zones, with sidewalk/road/curb bindings and tree-pit metadata. | `src/generation/public-realm/StreetTreeGenerator.ts`, `src/generation/terrain/TerrainGenerator.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`; street-tree validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 24 street trees, 53 rendered tree instances, and budget status pass. |
| KAN-204 | Street lighting objects | The detailed street slice now adds deterministic street light poles, fixtures, glow markers, coverage metadata, color temperature, night-lighting state, and power circuit placeholders. | `src/generation/public-realm/StreetLightGenerator.ts`, `src/city/rendering-handoff/mesh-builders/StreetLightMeshBuilder.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`; street-light validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 12 visible street light instances, 1,344 pickable objects, and renderer budget status pass. |
| KAN-205 | Street furniture and signs | The detailed street slice now adds deterministic benches, bins, bollards, kiosks, bus shelters, bike racks, regulatory signs, street-name signs, and wayfinding signs from active curb-zone placement data. | `src/generation/public-realm/StreetFurnitureGenerator.ts`, `src/city/rendering-handoff/mesh-builders/StreetFurnitureMeshBuilder.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`; street-furniture validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 58 visible street-furniture objects, 1,402 pickable objects, and renderer budget status pass. |
| KAN-206 | Crosswalk and lane marking mesh builders | The detailed street slice now renders domain-driven lane dashes, turn arrows, zebra crossing stripes, stop bars, tactile paving, and refuge islands while keeping moving traffic stable. | `src/generation/traffic/TrafficLaneGenerator.ts`, `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts`, `src/city/data-contracts/validation/validateTrafficPlan.ts`; road-marking validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 932 lane markings, 1,658 pickable objects, and renderer budget status pass. |
| KAN-207 | Storefront and active frontage seed | The detailed street slice now generates building-owned active frontage facade contracts for retail, hospitality, and mixed-use corridor parcels, with storefront windows, signs, awnings, entrance links, and night-window metadata. | `src/generation/buildings/ActiveFrontageGenerator.ts`, `src/city/rendering-handoff/mesh-builders/ActiveFrontageMeshBuilder.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`; active-frontage validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 42 active frontages, 1,700 pickable objects, 30 asset bindings, visible storefront primitives, and renderer budget status pass. |
| KAN-208 | Route-aware traffic loop seed | Traffic vehicles now carry lane IDs, ordered intersection route nodes, profile-derived speeds, stop-zone behavior, and incident hook metadata, while the runtime advances pooled vehicles along route offsets. | `src/generation/traffic/TrafficLaneGenerator.ts`, `src/city/data-contracts/validation/validateTrafficPlan.ts`, `src/world/city/City.ts`, `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts`; traffic-routing validation and browser-motion tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 7 route-aware vehicles, 13-node corridor routes, no traffic validation issues, and stable motion on `road-v-6`. |
| KAN-209 | First debug panel shell | The app now mounts a compact read-only diagnostics panel with seed, validation, traffic density, city counts, active overlays, LOD tiers, runtime performance, collapse/expand state, keyboard access, and `?debugPanel=hidden` support. | `src/app/DebugPanel.ts`, `src/app/App.ts`, `src/app/cityDiagnostics.ts`, `src/styles.css`; debug-panel e2e tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed matching diagnostics, no console errors, nonblank canvas pixels, usable collapse/expand controls, and hidden mode preserving the canvas. |
| KAN-301 | Stable ID rules and object registry | Every city object kind now has a registry entry with stable ID patterns and parent-kind rules, parcels participate in block child lookup, and generated/runtime validators enforce registry identity. | `src/city/data-contracts/cityObjectRegistry.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/city/data-contracts/validation/validateTrafficPlan.ts`, `src/generation/buildings/BuildingGenerator.ts`; registry and traffic validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 27 registered kinds, parcel `parcel-0-0-0-0` parented to `block-0-0`, zero duplicate IDs, and passing generated/traffic validation. |
| KAN-302 | Geospatial and precision contract expansion | The geospatial frame now carries local axis mapping, origin metadata, coordinate precision/tolerances, x/z local bounds, height datum rules, and future import-projection metadata, with diagnostics and debug panel exposure. | `src/city/data-contracts/cityContracts.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/app/cityDiagnostics.ts`, `src/app/DebugPanel.ts`; geospatial validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed local-xz meter diagnostics, 0.01m precision, -700..700m bounds, -5..180m height datum, zero validation issues, and no console errors. |
| KAN-303 | Metadata and provenance baseline | Generated city objects and runtime traffic objects now receive deterministic procedural or simulated source metadata, asset fallbacks carry license/attribution, and diagnostics expose metadata coverage by source type. | `src/city/data-contracts/sourceMetadata.ts`, `src/generation/applySourceMetadata.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/city/data-contracts/validation/validateTrafficPlan.ts`, `src/app/cityDiagnostics.ts`; metadata validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 4,751/4,751 tagged runtime objects, 4,744 procedural objects, 7 simulated objects, zero metadata validation issues, and no console errors. |
| KAN-304 | LOD validator and policy wiring | The city LOD policy now defines required LOD0-LOD4 tiers plus allowed/default tier coverage for all 27 registered object kinds, and generated/runtime validators reject missing or unsupported object LOD assignments. | `src/city/data-contracts/cityContracts.ts`, `src/city/data-contracts/lodPolicy.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/city/data-contracts/validation/validateTrafficPlan.ts`, `src/app/cityDiagnostics.ts`; LOD policy validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 5 tiers, 27 object policies, 4,751/4,751 runtime objects with policy coverage, zero unsupported LOD objects, and no console errors. |
| KAN-305 | Asset binding validator | Asset catalog and render binding validation now checks category/format/scale/tags, binary URLs, LOD variant asset references, registered binding object kinds, semantic tags, material zones, asset IDs, fallback material/geometry, attribution, and license metadata. | `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/city/rendering-handoff/asset-binding/assetBindingDiagnostics.ts`, `src/app/cityDiagnostics.ts`, `src/app/DebugPanel.ts`; asset-binding validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 30 assets, 30 bindings, 30 bound asset IDs, 30 fallback bindings, zero missing assets/fallbacks, and no console errors. |
| KAN-306 | Import/export contract seed | Import/export contracts now define GeoJSON, CityJSON-style domain data, OSM-inspired feature, glTF asset-binding, CSV table, and procedural seed JSON shapes, with deterministic procedural seed export and validation that excludes renderer-only state. | `src/city/data-contracts/import-export/importExportContracts.ts`, `src/app/cityDiagnostics.ts`, `src/app/DebugPanel.ts`; import/export validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 6 exchange formats, 3,812 exported domain objects, 30 asset definitions, 30 render bindings, JSON-serializable export diagnostics, zero renderer-only export fields, and no console errors. |
| KAN-307 | Config schema and preset validation | City and render configs now carry typed quality presets and city/traffic/prop/tree density controls, validate seed, dimensions, building ranges, district settings, render colors, camera/fog/pixel/shadow fields before generation, and expose active config diagnostics in the debug panel. | `src/config/configSchema.ts`, `src/config/cityConfig.ts`, `src/config/renderConfig.ts`, `src/app/App.ts`, `src/app/cityDiagnostics.ts`, `src/app/DebugPanel.ts`; config validation tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed `city-config-schema-v1`, medium quality preset, grid 12, traffic density 0.42, five district configs, passing config validation, nonblank canvas, and no console errors. |
| KAN-308 | Validation issue positions and suggested fixes | Validation issues now support affected points, affected boundaries, and suggested fixes; representative generated/runtime validators populate focus data, and validation overlay features expose focus targets/remediation text for debug inspection. | `src/city/data-contracts/cityContracts.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/city/data-contracts/validation/validateTrafficPlan.ts`, `src/city/rendering-handoff/overlays/overlayData.ts`, `src/app/cityDiagnostics.ts`; validation issue focus tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed zero current validation issues, zero current focus issues, validation overlay readiness, nonblank canvas, and no console errors. |
| KAN-309 | Generator unit and property tests | Generator property coverage now checks same-seed/config reproducibility, stable object IDs/counts/signatures across representative config variants, core relationship/metadata invariants, and invalid generated fixtures with expected validation categories. | `tests/e2e/city-generator-properties.spec.ts`; generator property tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks kept generated city validation passing, duplicate IDs at 0, indexed objects at 4,751, nonblank canvas, and no console errors. |
| KAN-311 | Decision log and contribution workflow | Contribution workflow now defines ADR usage, card movement rules, branch/test expectations, verification expectations, and review checks for large city-system changes, with a reusable ADR template for future traceable decisions. | `docs/contribution-workflow.md`, `docs/decisions/ADR-TEMPLATE.md`, `docs/city-kanban.md`; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks kept the city validation passing, duplicate IDs at 0, indexed objects at 4,751, nonblank canvas, and no console errors. |
| KAN-312 | City object grouping and query API | Stable group/query APIs now index generated city objects by owner domain, district, corridor, vertical slice, baseline scenario, render layer, validation selection, and metadata source set. | `src/city/data-contracts/cityObjectGroups.ts`, `src/city/data-contracts/generatedCityObjectGroups.ts`, `src/app/cityDiagnostics.ts`; group query/validation/browser tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 32 object groups, 4,751 baseline scenario objects, 958 network render-layer objects, zero missing group references, nonblank canvas, and no console errors. |
| KAN-321 | Master plan model | Executable blueprint master-plan data now defines the river/coastal city form, center hierarchy, skyline intent, protected open spaces, water edge intent, and growth boundaries used by generation. | `src/city/blueprint/master-plan/masterPlan.ts`, `src/city/blueprint/cityBlueprint.ts`, `src/generation/buildings/BuildingGenerator.ts`, `src/generation/terrain/TerrainGenerator.ts`; master-plan diagnostics/tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed four centers, three protected open spaces, three growth boundaries, nonblank canvas, and no console errors. |
| KAN-322 | District character and transition rules | Blueprint district rules now define use mix, landmark targets, density gradients, transition buffers, style hints, and allowed street profiles consumed by generated districts, parcels, buildings, validation, diagnostics, and tests. | `src/city/blueprint/cityBlueprint.ts`, `src/city/data-contracts/cityContracts.ts`, `src/generation/buildings/BuildingGenerator.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/app/cityDiagnostics.ts`; district-character and baseline tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed five district rules, 17 use-mix rules, 14 transition buffers, 568 buildings, 46 active frontages, 4,759 indexed runtime objects, nonblank canvas, and no console errors. |
| KAN-324 | Constraint layer | Blueprint constraint rules now generate first-class `constraint` objects for setbacks, protected corridors, easements, clearances, no-build zones, hazard buffers, view corridors, waterfront buffers, and emergency access corridors, with land filtering, validation, diagnostics, import/export, LOD, registry, and overlay support. | `src/city/blueprint/constraints/constraintLayer.ts`, `src/generation/constraints/ConstraintGenerator.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/city/rendering-handoff/overlays/overlayData.ts`, `src/app/cityDiagnostics.ts`; constraint validation/overlay tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 11 constraints, 11 constraint overlay features, 562 buildings, 45 active frontages, 4,757 indexed runtime objects, nonblank canvas, and no console errors. |
| KAN-325 | Resilience goals | Blueprint resilience rules now generate first-class `resilience-goal` objects for redundancy, climate adaptation, evacuation routes, emergency access, continuity, shelters, and recovery priority. | `src/city/blueprint/resilience/resilienceGoals.ts`, `src/generation/resilience/ResilienceGoalGenerator.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/app/cityDiagnostics.ts`; resilience validation/overlay tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 7 resilience goals, 3 critical goals, 3 shelter candidates, 7 resilience overlay features, nonblank canvas, and no console errors. |
| KAN-326 | City metrics model | Blueprint metric targets now generate deterministic first-class `city-metric` objects for walkability, density, open-space access, service coverage, traffic, energy, emissions, and quality checks, with target/status evaluation, object references, validation, diagnostics, import/export, LOD, registry, metadata, and overlay support. | `src/city/blueprint/metrics/cityMetricTargets.ts`, `src/generation/metrics/CityMetricGenerator.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/app/cityDiagnostics.ts`; city-metrics validation/browser tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 8 city metrics, 6 passing metrics, 2 warning metrics, 8 metric overlay features, nonblank canvas, and no console errors. |
| KAN-341 | Administrative boundaries | Land-owned administrative boundaries now generate city limit, wards, neighborhoods, service areas, ownership zones, and jurisdiction overlays, with block/parcel membership. | `src/generation/land/AdministrativeBoundaryGenerator.ts`, `src/city/data-contracts/cityContracts.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/city/rendering-handoff/overlays/overlayData.ts`, `src/app/cityDiagnostics.ts`; administrative-boundary validation/browser tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 18 administrative boundaries, 4 wards, 5 neighborhoods, 18 boundary overlay features, nonblank canvas, and no console errors. |
| KAN-342 | Block model expansion | Blocks now expose buildable envelopes, side frontage classes, internal access/alley records, subdivision constraints, and permeability metrics; parcels are generated from and reference block envelopes. | `src/city/data-contracts/cityContracts.ts`, `src/generation/buildings/BuildingGenerator.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/app/cityDiagnostics.ts`; block-model validation/browser tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 130 block envelopes, 116 internal access records, 520 frontage classes, nonblank canvas, and no console errors. |
| KAN-343 | Parcel model expansion | Parcels now expose setbacks, lot splits, development rights, frontage priority, parcel constraint IDs, and fit envelopes that drive building centers and footprints. | `src/city/data-contracts/cityContracts.ts`, `src/generation/buildings/BuildingGenerator.ts`, `src/generation/constraints/applyConstraintFilters.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/app/cityDiagnostics.ts`; parcel-model validation/browser tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 583 parcel envelopes, 347 primary-frontage parcels, fit metadata, nonblank canvas, and no page errors. |
| KAN-344 | Zoning model | Zoning districts now define allowed uses, height, FAR, coverage, overlays, buffers, frontage priorities, density, and form-based rules consumed by parcel and building generation. | `src/city/data-contracts/cityContracts.ts`, `src/generation/buildings/BuildingGenerator.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/city/rendering-handoff/overlays/overlayData.ts`, `src/app/cityDiagnostics.ts`; zoning-model validation/browser tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 5 zoning districts, 2 form-based districts, 583 zoned parcels, 5 zoning overlay features, nonblank screenshots, and no page errors. |
| KAN-347 | Waterways expansion | The waterway model now exposes continuous edge segments, main/canal/drainage channels, road crossing references, culverts, docks, outfalls, and waterway overlay features while preserving the rendered river surface. | `src/city/data-contracts/cityContracts.ts`, `src/generation/terrain/TerrainGenerator.ts`, `src/city/data-contracts/validation/validateGeneratedCity.ts`, `src/city/rendering-handoff/overlays/overlayData.ts`, `src/app/cityDiagnostics.ts`; waterway validation/browser tests; `npm run build`; `npm run test:e2e`; desktop/mobile browser checks exposed 8 edge segments, 13 crossings, 8 culverts, 3 docks, 4 outfalls, 40 waterway overlay features, nonblank screenshots, and no page errors. |

## Ready

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |

## Next

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |

## Backlog

### Foundation, Contracts, And Tooling

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-310 | P1 | M | Visual regression and UI accessibility tests | Add screenshot baselines for key camera presets plus accessibility checks for debug/authoring UI controls. | Visual changes are deliberate, controls are keyboard reachable, overlays have accessible labels, and test fixtures are deterministic. | KAN-209, KAN-643 |

### Blueprint

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-323 | P2 | M | Phasing and temporary conditions | Add construction phases, future expansion areas, temporary roads/parks/closures, and unlock order. | Generator can produce a named phase; operations/simulation can know temporary assets and closures. | KAN-321 |

### Land

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-345 | P2 | M | Topography model | Add terrain elevation bands, slopes, grades, retaining conditions, buildability from landform, and road/building grade hooks. | Roads and buildings carry ground elevation; validator catches impossible grades. | KAN-302 |
| KAN-346 | P2 | M | Soil and geology hints | Add foundation suitability, tunnel difficulty, drainage assumptions, contamination hints, and ground-risk metadata. | Buildings, tunnels, stormwater, and hazards can query soil/geology constraints. | KAN-345 |
| KAN-348 | P1 | M | Waterfront land model | Add quays, promenades, piers, flood walls, ecological edges, and public water access. | Waterfront district generates usable edge objects and connects to public realm. | KAN-347 |
| KAN-349 | P1 | M | Hazard layer | Add flood plains, landslide risk, heat exposure, restricted areas, contamination, and other no-build or mitigation zones. | Land, zoning, buildings, utilities, and emergency validation can consume hazards. | KAN-324, KAN-347 |
| KAN-350 | P2 | M | Cadastre model | Add property records, rights, easements, ownership, and legal land references. | Parcels have ownership/easement metadata; operations/permits can reference cadastre. | KAN-343, KAN-303 |
| KAN-351 | P1 | M | Addressing, place names, and gazetteer | Add address points, street names, building numbers, unit ranges, named places, neighborhoods, postal fields, and reverse lookup. | Entrances and civic/economic anchors resolve to stable addresses and named places; imports can map address tags into contracts. | KAN-341, KAN-426 |
| KAN-352 | P1 | M | Barriers, gates, fences, and access control | Add walls, fences, guardrails, bollard lines, gates, restricted access, turnstiles, checkpoints, and private/public access rules. | Navigation, emergency, accessibility, and rendering all respect barriers and access permissions. | KAN-324, KAN-371 |
| KAN-353 | P2 | M | Land-use and natural feature taxonomy | Normalize natural, leisure, recreation, protected, institutional, commercial, industrial, and mixed-use categories beyond current district labels. | Zoning, OSM-inspired imports, public realm, ecology, and asset binding use a shared land-use vocabulary. | KAN-344, KAN-306 |

### Mobility

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-361 | P1 | M | Street network hierarchy expansion | Replace uniform grid assumptions with hierarchy-aware centerlines, right-of-way widths, speed policy, continuity, and named corridors. | Roads can be arterial, collector, local, alley, promenade, or transit corridor from blueprint/zoning. | KAN-104, KAN-322 |
| KAN-362 | P1 | M | Intersection behavior | Add signal control, turning constraints, conflict points, visibility, corner radii, raised junctions, and stop/yield rules. | Validator catches missing signal/crossing behavior where profile requires it. | KAN-104, KAN-361 |
| KAN-363 | P1 | M | Lane-level restrictions | Add turn pockets, bus lanes, reversible lanes, lane markings, allowed modes, freight/emergency restrictions, and lane continuity. | Lane contracts support mode-specific routing; traffic uses allowed lanes. | KAN-208, KAN-362 |
| KAN-364 | P1 | M | Sidewalk accessibility continuity | Add clear paths, frontage/furnishing zones, curb ramps, grades, tactile cues, and accessible route continuity. | Pedestrian graph can route along sidewalks and through crossings; validator catches discontinuities. | KAN-105, KAN-345 |
| KAN-365 | P1 | M | Crossing detail | Add crosswalk types, refuge islands, midblock crossings, raised crossings, tactile cues, priority, and signal phases. | Crossings connect both sides and obey road profile/hierarchy rules. | KAN-105, KAN-362 |
| KAN-366 | P2 | M | Cycling network | Add protected lanes, painted lanes, cycle tracks, bike parking, bike signals, and conflict zones. | Bike graph exists and connects to parking/transit; validator catches unsafe conflicts. | KAN-363, KAN-365 |
| KAN-367 | P1 | M | Transit stops and routes | Add stops, stations, routes, headways, dedicated lanes, shelters, transfer points, and passenger demand seeds. | Transit route graph and stop objects render on selected corridors. | KAN-363, KAN-205 |
| KAN-368 | P1 | M | Parking and curb management | Add parking, loading, ride-hail, curb restrictions, pricing, enforcement, disabled spaces, and curb allocation rules citywide. | Curb objects validate against crosswalks, fire lanes, bus stops, and loading docks. | KAN-202 |
| KAN-369 | P1 | M | Freight logistics | Add delivery routes, loading docks, service alleys, time windows, truck restrictions, last-mile movement, and warehouse links. | Industrial/retail/warehouse parcels expose loading access and freight route constraints. | KAN-368, KAN-344 |
| KAN-370 | P2 | M | Bridges and tunnels | Add spans, underpasses, tunnel portals, clearance rules, structural constraints, and network connections over water or grade separations. | Bridges/tunnels connect mobility graph and obey clearance/topography constraints. | KAN-345, KAN-347, KAN-361 |
| KAN-371 | P1 | M | Navigation graphs | Build routing graphs for vehicles, pedestrians, bikes, transit, service crews, emergency responders, and freight. | Agents and operations can request routes by mode; validator catches missing route nodes. | KAN-363, KAN-364, KAN-366, KAN-367 |
| KAN-372 | P1 | M | Traffic calming and curb extensions | Add curb extensions, bus bulbs, chicanes, pinchpoints, speed humps, speed tables, speed cushions, neighborhood gateways, and design-speed validation. | Traffic speed and crossing safety respond to calming devices; validator catches devices that block emergency or accessible routes. | KAN-362, KAN-365 |
| KAN-373 | P1 | M | Rail, metro, tram, and station network | Add rail/tram rights-of-way, platforms, station entrances, tracks, grade crossings, interchanges, and passenger transfer links. | Transit graph supports rail/tram services and station access; rendering shows stations and tracks at appropriate LOD. | KAN-367, KAN-370 |
| KAN-374 | P2 | M | Water transport, ferry, port, and helipad access | Add ferry stops, piers, docks, small port/logistics edges, emergency helipads, and water/air arrival constraints. | Waterfront and emergency scenarios can route to ferry/port/helipad nodes without breaking land mobility graphs. | KAN-347, KAN-371, KAN-485 |

### Utilities

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-391 | P1 | M | Utility base contracts | Add utility node/edge network fields for type, capacity, service area, access point, outage domain, owner, and render binding. | Utility validators can operate across all utility systems. | KAN-301 |
| KAN-392 | P1 | M | Power grid skeleton | Add substations, feeders, transformers, switchgear, meters, street-light circuits, backup supply, and outage domains. | Street lighting and buildings can reference power service; validator catches unserved critical assets. | KAN-391, KAN-204 |
| KAN-393 | P1 | M | Water supply skeleton | Add mains, valves, hydrants, pumps, tanks, pressure zones, and service connections. | Buildings and hydrants have service coverage; fire response can query hydrant reach. | KAN-391 |
| KAN-394 | P1 | M | Wastewater skeleton | Add sanitary sewers, lift stations, manholes, outfalls, service laterals, and capacity constraints. | Buildings reference wastewater service; validator catches missing connections. | KAN-391, KAN-347 |
| KAN-395 | P1 | M | Stormwater system | Add inlets, drains, bioswales, detention, pervious areas, culverts, outfalls, and runoff paths. | Flood/rain cards can route runoff; validator catches streets/low points with no drainage. | KAN-391, KAN-347, KAN-349 |
| KAN-396 | P2 | M | Telecom network | Add fiber routes, cell sites, antennas, utility cabinets, ducts, conduits, and coverage assumptions. | Buildings/sensors can reference telecom service; validator catches uncovered sensors/critical facilities. | KAN-391 |
| KAN-397 | P2 | M | Gas and district energy | Add gas, steam, chilled water, district heating/cooling, plant rooms, and thermal service areas. | Building MEP can reference thermal service; outage/service maps render. | KAN-391 |
| KAN-398 | P1 | M | Waste management network | Add collection points, bins, compactors, transfer stations, recycling, pickup routes, and timing. | Buildings/public realm have waste collection; service vehicles can route pickups. | KAN-371, KAN-391 |
| KAN-399 | P1 | M | Service access corridors | Add utility easements, vault access, maintenance paths, service yards, and restricted corridors. | Utilities and buildings expose maintenance access; validator catches inaccessible assets. | KAN-350, KAN-391 |

### Buildings

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-421 | P1 | M | Building typology model | Add residential, office, civic, industrial, mixed-use, retail, hospitality, warehouse, utility, and special-use typology rules. | Building uses map to typology-specific height, floor, entrance, facade, roof, service, and schedule defaults. | KAN-344 |
| KAN-422 | P1 | M | Footprint grammar | Add parcel fit, podiums, towers, courtyards, setbacks, buildable envelopes, ground coverage, waterfront setbacks, and hazard constraints. | Buildings no longer rely only on centered rectangles; validator checks footprint against parcel envelope. | KAN-343, KAN-421 |
| KAN-423 | P1 | M | Structure and shell grammar | Add massing, cores, floor plates, structural grids, transfer levels, floor heights, and load-bearing assumptions. | Building contracts expose floor plates/core hints for facades/interiors. | KAN-422 |
| KAN-424 | P1 | M | Facade grammar and mesh builder | Add floor grids, bay spacing, windows, balconies, storefront modules, material zones, signs, awnings, and atlas slots. | At least the detailed street buildings show facade modules; fallback LOD remains instanced. | KAN-207, KAN-423 |
| KAN-425 | P1 | M | Roof grammar | Add mechanical screens, solar panels, green roofs, antennas, terraces, rooftop access, and height exemption logic. | Roof details come from roof contracts and validation catches impossible rooftop equipment. | KAN-423 |
| KAN-426 | P1 | M | Entrance and address objects | Add public doors, lobbies, ramps, service entries, loading doors, active frontage links, and address points. | Every public building has at least one accessible entrance; loading/service buildings have service access. | KAN-207, KAN-399 |
| KAN-427 | P2 | M | Interior LOD seed | Add lobby shells, public/private zones, vertical circulation, service rooms, interior LOD4 visibility, and occupancy hooks. | Close-up buildings can expose simple lobby/interior data without affecting far LOD. | KAN-426 |
| KAN-428 | P2 | M | Building amenities | Add shared services, public amenities, rooftop amenities, plazas, retail frontages, resident facilities, and amenity ownership. | Amenities can feed simulation demand and public realm placement. | KAN-421, KAN-426 |
| KAN-429 | P1 | M | MEP interfaces | Add plant rooms, ducts, risers, meters, shafts, equipment pads, and service connections to utilities. | Buildings reference utility networks and service rooms; validator catches missing service for occupied buildings. | KAN-391, KAN-423 |
| KAN-430 | P1 | M | Fire safety rules | Add egress, fire lanes, hydrant reach, sprinkler connections, refuge areas, and emergency access rules. | Emergency response validator can check hydrant/service reach and fire lane access. | KAN-393, KAN-426 |
| KAN-431 | P1 | M | Building accessibility rules | Add step-free paths, ramps, elevators, tactile cues, accessible entrances, and route continuity. | Accessibility validator links building entrances to accessible sidewalk graph. | KAN-364, KAN-426 |
| KAN-432 | P1 | M | Construction, renovation, and demolition states | Add under-construction, planned, temporary, scaffolded, vacant, demolished, and adaptive-reuse building states. | Phasing and operations can show construction sites, temporary access, safety fences, and future buildings without corrupting current land/building data. | KAN-323, KAN-422 |
| KAN-433 | P2 | M | Vertical detail and occupiable floors | Add floor-by-floor use bands, elevator/stair cores, skybridges where applicable, mechanical floors, observation decks, and public/private access rules. | Tall buildings can feed occupancy, evacuation, night lighting, and picking by floor or public zone. | KAN-423, KAN-427 |

### Public Realm

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-451 | P1 | M | Parks expansion | Add lawns, paths, planting, sports, seating, water features, shade, and park program zones. | Existing parks contain path/program objects and connect to sidewalks. | KAN-364 |
| KAN-452 | P1 | M | Plaza model | Add hardscape, seating, active edges, shade, event zones, paving hierarchy, and gathering behavior. | Civic plaza has semantic plaza zones and event capacity. | KAN-451, KAN-207 |
| KAN-453 | P1 | M | Trees and planting citywide | Add street trees, park trees, planters, species, canopy spread, soil volume, seasonal color, and green corridor links. | Tree objects validate canopy/placement and support heat/ecology metrics. | KAN-203 |
| KAN-454 | P1 | M | Street furniture citywide | Add benches, bins, bollards, kiosks, shelters, bike racks, railings, and human-scale props. | Placement respects clear paths, crossings, transit stops, and safety visibility. | KAN-205 |
| KAN-455 | P1 | M | Public lighting citywide | Add poles, fixture types, light coverage, night safety, color temperature, glare, and decorative lighting. | Night mode uses public lighting data; validator catches dark critical pedestrian paths. | KAN-204, KAN-392 |
| KAN-456 | P1 | M | Signage and wayfinding | Add street signs, regulatory signs, directional signs, maps, storefront sign rules, and wayfinding systems. | Signs bind to routes/districts/frontages and LOD policy; readable signs only at LOD4. | KAN-205, KAN-371 |
| KAN-457 | P2 | M | Public art and heritage | Add sculptures, murals, monuments, interactive art, heritage markers, and placement rules. | Public art objects have ownership, asset bindings, and maintenance metadata. | KAN-452, KAN-303 |
| KAN-458 | P2 | M | Playgrounds and sports | Add playgrounds, courts, fields, exercise equipment, safety surfaces, age bands, and recreation zones. | Parks/civic services expose active recreation access metrics. | KAN-451 |
| KAN-459 | P1 | M | Waterfront open space | Add promenades, overlooks, piers, boardwalks, ecological edges, seating, railings, and water access. | Waterfront slice connects land/water/public realm and renders promenade detail. | KAN-348, KAN-453, KAN-454 |
| KAN-460 | P1 | M | Safety and visibility | Add sight lines, lighting overlap, refuge areas, active frontages, surveillance assumptions, and blind spot checks. | Safety overlay can flag hidden/dark/isolated areas near routes and public spaces. | KAN-455, KAN-207 |
| KAN-461 | P1 | M | Green street and stormwater public realm | Add rain gardens, bioswales, flow-through planters, pervious strips, permeable pavement, curb cuts, tree trenches, and maintenance ownership. | Stormwater objects are visible public-realm elements and route runoff without blocking sidewalks or curbs. | KAN-395, KAN-453 |
| KAN-462 | P1 | M | Parklets and interim curb activation | Add parklets, outdoor dining, temporary seating decks, interim plazas, curb activation permits, protection barriers, and seasonal removal. | Events/permits can place temporary curb uses while preserving emergency, transit, drainage, and accessible clearances. | KAN-368, KAN-563 |
| KAN-463 | P2 | M | Public amenities and comfort fixtures | Add public toilets, drinking fountains, shade structures, misting/cooling points, charging points, clocks, information kiosks, and repair stands. | Public-space comfort metrics can query amenities and validation catches inaccessible or unserved fixtures. | KAN-454, KAN-399 |

### Civic And Economy

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-481 | P1 | M | Civic anchor base contract | Add common anchor fields for service type, capacity, catchment, arrival modes, public/service entrances, schedules, and render binding. | Civic services can be placed and validated consistently. | KAN-341, KAN-421 |
| KAN-482 | P1 | M | Government anchors | Add city hall, administrative offices, courts, civic plazas, service counters, and public administration anchors. | Civic district has a government anchor and public plaza relationship. | KAN-481, KAN-452 |
| KAN-483 | P1 | M | Healthcare anchors | Add hospitals, clinics, pharmacies, urgent care, ambulance access, patient arrivals, and coverage. | Healthcare coverage metric and ambulance route hooks exist. | KAN-481, KAN-371 |
| KAN-484 | P1 | M | Education anchors | Add schools, libraries, universities, childcare, playground access, drop-off zones, and learning campuses. | Residential/civic districts have education access metrics and drop-off rules. | KAN-481, KAN-368 |
| KAN-485 | P1 | M | Emergency service anchors | Add fire stations, police, ambulance, shelters, command posts, response coverage, and staging areas. | Emergency response cards can dispatch from anchors and validate coverage. | KAN-481, KAN-430 |
| KAN-486 | P2 | M | Culture anchors | Add museums, theaters, galleries, venues, heritage sites, event spaces, and cultural footfall. | Culture anchors feed tourism/evening activity and event operations. | KAN-481 |
| KAN-487 | P2 | M | Religious and community anchors | Add worship places, cemeteries, processional space, social services, recreation centers, food banks, shelters, and community halls. | Community-service coverage metrics and event/crowd hooks exist. | KAN-481 |
| KAN-488 | P1 | M | Emergency equipment and assembly points | Add AEDs, emergency phones, sirens, alarms, fire alarm boxes, evacuation assembly areas, lifeguard stations where relevant, and public shelter signage. | Emergency overlays and validation can find nearest equipment, shelter, and assembly point from any public space. | KAN-485, KAN-456 |
| KAN-491 | P1 | M | Economy anchor base contract | Add economic use, jobs, customer demand, delivery demand, opening hours, frontage needs, loading needs, and district fit. | Simulation can read economic destinations and schedules. | KAN-421, KAN-369 |
| KAN-492 | P1 | M | Retail and storefront economy | Add storefronts, shopping streets, service retail, display fronts, customer footfall, signs, awnings, and deliveries. | Detailed street has retail demand and storefront rendering hooks. | KAN-207, KAN-491 |
| KAN-493 | P1 | M | Office economy | Add office towers, coworking, institutional workplaces, lobbies, commute demand, and daytime population. | Downtown generates office demand and peak commute hooks. | KAN-491 |
| KAN-494 | P1 | M | Industry and warehouses | Add light industry, workshops, fabrication, buffers, yard space, logistics, cold-chain, loading bays, and truck circulation. | Industrial district has freight/service behavior and visual yards/loading detail. | KAN-369, KAN-491 |
| KAN-495 | P1 | M | Hospitality and nightlife | Add hotels, restaurants, nightlife, event venues, guest arrivals, service access, evening activity, and signs. | Waterfront/downtown hospitality generates evening demand and light/sign behavior. | KAN-491 |
| KAN-496 | P2 | M | Informal markets | Add street vendors, temporary stalls, seasonal markets, pop-up retail, permits, and flexible public-space use. | Events/permits can place temporary market objects without breaking clear paths. | KAN-452, KAN-491 |
| KAN-497 | P2 | M | Tourism layer | Add visitor routes, landmarks, viewpoints, attractions, hotels, tour stops, and peak visitor behavior. | Tourism demand links civic/culture/waterfront/public realm anchors. | KAN-486, KAN-495 |

### Environment

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-521 | P1 | M | Climate and weather presets | Add rain, cloud, fog, seasonal presets, monsoon state, weather exposure, transitions, and surface wetness hooks. | Weather changes rendering and simulation state without hiding city readability. | KAN-103 |
| KAN-522 | P1 | M | Solar and shading layer | Add sun paths, building shadows, daylight, glare, solar potential, shade comfort, and roof solar suitability. | Day/night and heat cards can query shade/solar data; debug overlay shows shade. | KAN-425, KAN-521 |
| KAN-523 | P2 | M | Wind comfort layer | Add wind corridors, sheltered areas, downdraft risk, bridge effects, waterfront exposure, and comfort zones. | Tall buildings/waterfront/public spaces can flag wind comfort warnings. | KAN-422, KAN-459 |
| KAN-524 | P2 | M | Air quality layer | Add emissions sources, clean-air corridors, exposure zones, street canyon risk, and sensor overlays. | Traffic/industry/sensors feed air-quality overlay and metrics. | KAN-493, KAN-494, KAN-567 |
| KAN-525 | P2 | M | Noise layer | Add traffic, rail/transit, industrial noise, quiet zones, acoustic buffers, and nighttime disturbance. | Noise overlay influences zoning and public-space quality metrics. | KAN-367, KAN-494 |
| KAN-526 | P1 | M | Urban heat layer | Add heat islands, shade, cool roofs, tree canopy, material albedo, water cooling, and heat-risk zones. | Tree/roof/water metrics reduce heat risk; validation flags high-risk public routes. | KAN-453, KAN-522 |
| KAN-527 | P2 | M | Ecology and habitats | Add habitat patches, green corridors, biodiversity, planting structure, water edges, and ecological connectivity. | Parks/waterfront/tree planting feed habitat metrics. | KAN-451, KAN-459 |
| KAN-528 | P1 | M | Flood risk layer | Add flood depth, drainage capacity, inundation extents, safe routes, critical assets, and recovery priority. | Flood warnings affect waterfront/building/utility/emergency validation. | KAN-349, KAN-395, KAN-325 |
| KAN-529 | P2 | M | Water quality and blue-green health | Add water quality indicators, outfall impacts, algae/odor warnings, habitat edge quality, swimming/boating restrictions, and cleanup priority. | Waterways and waterfront spaces expose health status and operations can schedule remediation. | KAN-347, KAN-395, KAN-527 |
| KAN-530 | P2 | M | Climate adaptation interventions | Add cool corridors, shade priority zones, floodable parks, backup power priority, resilient shelters, and managed retreat/no-build adaptation options. | Resilience metrics can compare baseline and adapted scenarios for heat, flood, outage, and evacuation risk. | KAN-325, KAN-526, KAN-528 |

### Operations

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-561 | P1 | M | Asset inventory model | Add ownership, lifecycle, warranty, replacement cost, condition, source, status, and asset lookup. | Renderable civic/public/utility assets can be inspected with inventory metadata. | KAN-303, KAN-102 |
| KAN-562 | P1 | M | Maintenance operations | Add inspection cycles, repair queues, street works, closures, replacement timing, and asset condition updates. | Maintenance state can mark assets and create temporary closures. | KAN-561, KAN-371 |
| KAN-563 | P1 | M | Permits and inspections | Add development permits, temporary closures, code checks, approvals, inspections, and compliance status. | Temporary markets/construction/building changes require permit records. | KAN-350, KAN-562 |
| KAN-564 | P1 | M | Events and crowds operations | Add parades, markets, concerts, closures, crowd routing, temporary assets, event schedules, and cleanup. | Civic center or waterfront slice can switch into event state. | KAN-452, KAN-563 |
| KAN-565 | P1 | M | Emergency response operations | Add dispatch areas, response times, blocked routes, staging areas, evacuation, incident coordination, and responder state. | Service/emergency slice can render route and response-time overlay. | KAN-485, KAN-371, KAN-528 |
| KAN-566 | P1 | M | Service schedules | Add waste pickup, street sweeping, transit timetables, delivery windows, inspections, and recurring operations. | Operations can schedule service vehicles and temporary curb restrictions. | KAN-398, KAN-367, KAN-369 |
| KAN-567 | P1 | M | Sensors and IoT | Add cameras, counters, meters, weather stations, air sensors, telemetry streams, sensor coverage, and privacy tags. | Sensor overlay reads coverage and feeds environment/operations diagnostics. | KAN-396, KAN-561 |
| KAN-568 | P1 | M | Work zones and construction operations | Add road works, scaffolding, cranes, lane closures, detours, pedestrian diversions, construction deliveries, noise windows, and safety inspections. | Temporary construction state affects routing, rendering, permits, maintenance, and validation. | KAN-432, KAN-563, KAN-371 |
| KAN-569 | P1 | M | Data governance, privacy, and safety policy | Add privacy zones, sensor retention rules, data confidence, redaction flags, public/private visibility, and safety-critical data checks. | Debug/export/import flows can omit sensitive data and highlight low-confidence safety-critical objects. | KAN-303, KAN-567 |
| KAN-570 | P2 | M | Finance, lifecycle cost, and replacement planning | Add capital cost, operating cost, replacement year, depreciation, funding source, backlog, and maintenance prioritization. | Asset inventory and scenarios can compare cost and lifecycle impacts of infrastructure changes. | KAN-561, KAN-326 |

### Simulation

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-601 | P1 | M | Population agent seed | Add residents, workers, visitors, students, service crews, schedules, needs, origin-destination pairs, and pooling. | Agents spawn from building/economy/civic data and route by mode. | KAN-371, KAN-491 |
| KAN-602 | P1 | M | Traffic flow simulation | Add route choice, congestion, parking search, incidents, lane behavior, turning, signal delay, and travel times. | Vehicles use graph routes and respond to closures/signals. | KAN-208, KAN-371 |
| KAN-603 | P1 | M | Pedestrian flow simulation | Add walking demand, crossing behavior, crowding, route choice, queues, public-space occupancy, and accessibility preference. | Pedestrians can cross detailed street and gather in public spaces. | KAN-364, KAN-564, KAN-601 |
| KAN-604 | P1 | M | Transit operations simulation | Add transit vehicles, dwell times, headways, station crowding, transfers, delays, and service reliability. | Transit vehicles and stops operate on schedule and feed passenger demand. | KAN-367, KAN-601 |
| KAN-605 | P1 | M | Utility load simulation | Add power, water, telecom, stormwater, waste demand, peak loads, outages, and service capacity behavior. | Demand varies by building type, time, weather, and incident state. | KAN-391, KAN-601 |
| KAN-606 | P1 | M | Emergency scenarios | Add fire, flood, evacuation, outages, blocked roads, shelter demand, response simulation, and incident overlays. | Service/emergency slice can create a fire or flood incident and route responders around closures. | KAN-565, KAN-605 |
| KAN-607 | P1 | M | Weather and day-night simulation | Add sun, night, rain, fog, seasonal transitions, visibility, puddles, wet materials, and weather-driven behavior. | Time/weather changes lighting, agents, roads, windows, signs, puddles, and diagnostics. | KAN-521, KAN-522 |
| KAN-608 | P1 | M | Economy activity simulation | Add opening hours, commute peaks, shopping demand, delivery demand, tourism peaks, nightlife cycles, and event modifiers. | Economic anchors emit time-based demand and delivery schedules. | KAN-491, KAN-607 |
| KAN-609 | P1 | M | Scenario manager and replay | Add named scenarios, time controls, seed snapshots, event scripts, simulation replay, comparison baselines, and deterministic pause/resume. | Fire, flood, event, weather, and traffic scenarios can be replayed and compared in tests. | KAN-606, KAN-607 |
| KAN-610 | P2 | M | Micromobility and parking-search behavior | Add bikes, scooters, docks, shared vehicles, curb pickup/drop-off, parking search, violations, and rebalancing. | Mobility simulation can model short trips and curb conflicts without conflating them with car traffic. | KAN-366, KAN-368, KAN-601 |

### Rendering, Scaling, Authoring, And Exchange

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| KAN-641 | P1 | M | Material zone system | Map semantic surfaces to asphalt, concrete, glass, brick, metal, water, signs, foliage, facade panels, roof, utility, and overlay materials. | Mesh builders use material zones and fallbacks rather than hardcoded material choices. | KAN-102, KAN-103 |
| KAN-642 | P1 | M | Mesh builder expansion | Add mesh builders for roads, crossings, curbs, buildings, facades, roofs, public realm props, utilities, sensors, and overlays. | `world/city` delegates render construction to handoff builders/layers. | KAN-103, KAN-641 |
| KAN-643 | P1 | M | Scene layer controls | Add layer visibility and render-order control for terrain, land, mobility, utilities, buildings, public realm, agents, sensors, validation, and environment overlays. | Debug panel can toggle layers without mutating generation data. | KAN-209, KAN-642 |
| KAN-644 | P1 | M | Distance LOD and quality presets | Implement low/medium/high/debug presets, device-aware LOD, distance thresholds, hidden simulation outside active range, and debug LOD forcing. | Visual detail degrades predictably while preserving validation and route data. | KAN-304, KAN-643 |
| KAN-645 | P1 | M | Instancing and pooling audit | Ensure repeated buildings, trees, lane markings, props, vehicles, lights, sensors, and utility covers use instancing or pooling where useful. | Diagnostics show draw-call and object-count improvements under budget. | KAN-108, KAN-642 |
| KAN-646 | P1 | M | Chunking and lazy generation | Add chunk size, load/unload radii, chunk object indexes, chunk validation summaries, and camera-driven lazy load. | City can scale beyond current grid without full scene cost upfront. | KAN-301, KAN-645 |
| KAN-647 | P2 | M | Worker-based generation | Move expensive generation/validation steps to workers with deterministic seed/config input and typed output. | Main thread remains responsive during city rebuild; worker output validates before render. | KAN-646 |
| KAN-648 | P1 | M | Texture atlas pipeline | Add atlas metadata and loaders for asphalt, concrete, glass, brick, metal, water, signs, foliage, and facade panels. | Materials can bind atlas zones; asset validator enforces texture scale/license metadata. | KAN-305, KAN-641 |
| KAN-649 | P1 | M | Lighting presets | Add dawn, day, dusk, night, rain, fog, monsoon, and emergency lighting presets with window/sign/streetlight state. | Debug panel can switch presets; e2e can still detect visible city output. | KAN-455, KAN-607 |
| KAN-650 | P1 | M | Benchmark automation | Add deterministic camera path, frame-time capture, draw-call/triangle budget checks, console-error gate, and artifact output. | CI/local benchmark reports pass/fail against `DEFAULT_PERFORMANCE_BUDGET`. | KAN-108, KAN-644 |
| KAN-651 | P2 | M | Preset editor | Add controls for seed, grid/block size, density, districts, road spacing, building height ranges, zoning, services, prop/tree density, and simulation presets. | Editing a preset regenerates deterministically and updates validation/debug output. | KAN-307, KAN-209 |
| KAN-652 | P2 | M | Export current city data | Export config, generated domain data, validation report, asset bindings, and screenshots/benchmarks. | Export excludes renderer-only transient state and can be imported back into a stable view. | KAN-306, KAN-650 |
| KAN-653 | P2 | M | Import authored or external city data | Import procedural seed JSON first, then GeoJSON/OSM-inspired features, CityJSON-style objects, and glTF asset bindings. | Imported objects normalize into contracts and pass validation before render. | KAN-306, KAN-652 |
| KAN-654 | P1 | M | Visual QA camera book | Add named camera presets for downtown, detailed street, waterfront, civic center, industrial edge, emergency scene, night, rain, and mobile viewport. | Every slice has repeatable screenshots and visual review positions. | KAN-650 |
| KAN-655 | P1 | M | Deployment and packaging checks | Add production preview checks, asset path validation, cache/version rules, bundle size budgets, and static hosting smoke tests. | Built app can run from production preview with all assets, shaders, and diagnostics available. | KAN-650, KAN-652 |
| KAN-656 | P2 | M | Documentation and example gallery | Add generated screenshots, slice walkthroughs, architecture diagrams, object schema examples, scenario examples, and troubleshooting notes. | New contributors can understand current city capabilities and run one full slice without reading implementation code first. | KAN-311, KAN-654 |

## Blocked Or Needs Decision

| ID | Priority | Decision | Why It Matters | Unblocks |
| --- | --- | --- | --- | --- |
| KAN-D01 | P1 | Asset source policy | Decide whether visual assets are hand-authored primitives, generated, third-party open assets, or a mix; define license/attribution workflow. | KAN-102, KAN-305, KAN-648 |
| KAN-D02 | P1 | Target city scale | Confirm whether the near-term target is one detailed district, whole current grid, or a much larger streamed city. | KAN-646, KAN-650, KAN-651 |
| KAN-D03 | P1 | Visual fidelity target | Decide how realistic versus stylized the first polished slice should be, especially for facades, props, weather, and night lighting. | KAN-424, KAN-455, KAN-649 |
| KAN-D04 | P2 | Import priority | Decide whether GeoJSON, OSM-inspired features, CityJSON-style data, or asset-manifest import should come first. | KAN-306, KAN-653 |
| KAN-D05 | P1 | Debug UI complexity | Decide whether debug tooling stays as an in-app lightweight panel or grows into a dedicated editor/authoring interface. | KAN-209, KAN-651 |
| KAN-D06 | P1 | Transport mode boundary | Decide whether rail, tram, ferry, port, and helipad work are required in the near-term city or kept as contract-only placeholders. | KAN-373, KAN-374, KAN-604 |
| KAN-D07 | P1 | Privacy and sensor policy | Decide what sensor data may be visible, exported, replayed, or redacted in debug and scenario tooling. | KAN-567, KAN-569, KAN-652 |
| KAN-D08 | P1 | Visual regression tolerance | Decide screenshot baseline policy, allowed pixel drift, artifact retention, and review process for rendering changes. | KAN-310, KAN-654 |

## Vertical Slice Milestones

| Milestone | Cards | Completion Gate |
| --- | --- | --- |
| Slice 1: Basic procedural district hardening | Done cards plus KAN-101 to KAN-108, KAN-301 to KAN-312 | Current city still renders; every generated object is indexable, bindable, LOD-aware, queryable, tested, and validator-covered. |
| Slice 2: Detailed street | KAN-201 to KAN-209, KAN-351, KAN-352, KAN-361 to KAN-365, KAN-372, KAN-421 to KAN-426, KAN-451 to KAN-456, KAN-461 to KAN-463 | One corridor has addresses, sidewalks, crossings, curbs, calming, props, trees, lights, storefronts, traffic behavior, debug overlay, comfort fixtures, and night/detail rendering. |
| Slice 3: Civic center or waterfront | KAN-348, KAN-374, KAN-452, KAN-459, KAN-481 to KAN-488, KAN-521 to KAN-530, KAN-564 | Plaza or promenade has public realm, civic/hospitality anchors, water transport hooks, event state, weather/environment overlays, emergency equipment, and inspectable metadata. |
| Slice 4: Service and emergency layer | KAN-391 to KAN-399, KAN-430, KAN-485, KAN-488, KAN-565, KAN-606, KAN-609 | Fire/hydrant/station/blocked-route scenario works with service coverage, response-time overlay, validation warnings, and replayable incident state. |
| Slice 5: Operating city | KAN-432, KAN-561 to KAN-570, KAN-601 to KAN-610 | City has schedules, incidents, sensors, maintenance, construction/work zones, privacy policy, lifecycle cost, agents, traffic, pedestrians, transit, utilities, weather, and economy cycles. |
| Slice 6: Scaled rendered city | KAN-641 to KAN-656 | City supports scene layers, LOD, instancing, chunking, workers, texture atlases, lighting presets, benchmarks, authoring, import/export, visual QA, deployment checks, and example documentation. |

## Domain Coverage Checklist

Every existing folder in `src/city` is represented by at least one card. A few cross-cutting rows at the bottom cover quality, deployment, and construction-state concerns that do not have dedicated folders yet.

| Domain | Covered By |
| --- | --- |
| `blueprint/master-plan` | KAN-321 |
| `blueprint/districts` | KAN-322 |
| `blueprint/phasing` | KAN-323 |
| `blueprint/constraints` | KAN-324 |
| `blueprint/resilience` | KAN-325 |
| `blueprint/metrics` | KAN-326 |
| `land/administrative-boundaries` | KAN-341 |
| `land/blocks` | KAN-342 |
| `land/parcels` | KAN-343, KAN-351 |
| `land/zoning` | KAN-344, KAN-353 |
| `land/topography` | KAN-345 |
| `land/soil-geology` | KAN-346 |
| `land/waterways` | KAN-347, KAN-529 |
| `land/waterfront` | KAN-348 |
| `land/hazards` | KAN-349 |
| `land/cadastre` | KAN-350 |
| `mobility/street-network` | KAN-361, KAN-372 |
| `mobility/intersections` | KAN-104, KAN-362, KAN-372 |
| `mobility/lanes` | KAN-363 |
| `mobility/sidewalks` | KAN-105, KAN-364, KAN-352 |
| `mobility/crossings` | KAN-105, KAN-365 |
| `mobility/cycling` | KAN-366, KAN-610 |
| `mobility/transit` | KAN-367, KAN-373 |
| `mobility/parking-curbs` | KAN-202, KAN-368, KAN-462 |
| `mobility/freight-logistics` | KAN-369 |
| `mobility/bridges-tunnels` | KAN-370, KAN-373 |
| `mobility/navigation-graphs` | KAN-371, KAN-374 |
| `utilities/power-grid` | KAN-392 |
| `utilities/water-supply` | KAN-393 |
| `utilities/wastewater` | KAN-394 |
| `utilities/stormwater` | KAN-395 |
| `utilities/telecom` | KAN-396 |
| `utilities/gas-district-energy` | KAN-397 |
| `utilities/waste-management` | KAN-398 |
| `utilities/service-access` | KAN-399 |
| `buildings/typologies` | KAN-421 |
| `buildings/footprints` | KAN-422 |
| `buildings/structure-shell` | KAN-423 |
| `buildings/facades` | KAN-424 |
| `buildings/roofs` | KAN-425 |
| `buildings/entrances` | KAN-426 |
| `buildings/interiors` | KAN-427, KAN-433 |
| `buildings/amenities` | KAN-428 |
| `buildings/mechanical-electrical-plumbing` | KAN-429 |
| `buildings/fire-safety` | KAN-430 |
| `buildings/accessibility` | KAN-431 |
| `buildings/construction-state` | KAN-432 |
| `public-realm/parks` | KAN-451 |
| `public-realm/plazas` | KAN-452, KAN-462 |
| `public-realm/trees-planting` | KAN-203, KAN-453 |
| `public-realm/street-furniture` | KAN-205, KAN-454, KAN-463 |
| `public-realm/lighting` | KAN-204, KAN-455 |
| `public-realm/signage-wayfinding` | KAN-205, KAN-456 |
| `public-realm/public-art` | KAN-457 |
| `public-realm/playgrounds-sports` | KAN-458 |
| `public-realm/waterfront-open-space` | KAN-459, KAN-374 |
| `public-realm/safety-visibility` | KAN-460 |
| `public-realm/green-stormwater` | KAN-461 |
| `civic/government` | KAN-482 |
| `civic/healthcare` | KAN-483 |
| `civic/education` | KAN-484 |
| `civic/emergency-services` | KAN-485, KAN-488 |
| `civic/culture` | KAN-486 |
| `civic/religious` | KAN-487 |
| `civic/community-services` | KAN-487 |
| `economy/retail` | KAN-492 |
| `economy/offices` | KAN-493 |
| `economy/industry` | KAN-494 |
| `economy/warehouses` | KAN-494 |
| `economy/hospitality` | KAN-495 |
| `economy/informal-markets` | KAN-496 |
| `economy/tourism` | KAN-497 |
| `environment/climate-weather` | KAN-521, KAN-530 |
| `environment/solar-shading` | KAN-522 |
| `environment/wind-comfort` | KAN-523 |
| `environment/air-quality` | KAN-524 |
| `environment/noise` | KAN-525 |
| `environment/urban-heat` | KAN-526, KAN-530 |
| `environment/ecology-habitats` | KAN-527, KAN-529 |
| `environment/flood-risk` | KAN-528, KAN-530 |
| `operations/asset-inventory` | KAN-561, KAN-570 |
| `operations/maintenance` | KAN-562, KAN-568 |
| `operations/permits-inspections` | KAN-563 |
| `operations/events-crowds` | KAN-564 |
| `operations/emergency-response` | KAN-565 |
| `operations/service-schedules` | KAN-566 |
| `operations/sensors-iot` | KAN-567, KAN-569 |
| `simulation/population-agents` | KAN-601 |
| `simulation/traffic-flow` | KAN-602, KAN-610 |
| `simulation/pedestrian-flow` | KAN-603 |
| `simulation/transit-operations` | KAN-604 |
| `simulation/utility-loads` | KAN-605 |
| `simulation/emergency-scenarios` | KAN-606, KAN-609 |
| `simulation/weather-daynight` | KAN-607 |
| `simulation/economy-activity` | KAN-608 |
| `data-contracts/identifiers` | KAN-301, KAN-312 |
| `data-contracts/geospatial` | KAN-302 |
| `data-contracts/metadata` | KAN-303, KAN-569 |
| `data-contracts/level-of-detail` | KAN-304 |
| `data-contracts/validation` | KAN-305, KAN-308, KAN-309 |
| `data-contracts/import-export` | KAN-306, KAN-351, KAN-353 |
| `rendering-handoff/asset-binding` | KAN-102, KAN-305 |
| `rendering-handoff/lod-policy` | KAN-304, KAN-644 |
| `rendering-handoff/material-zones` | KAN-641 |
| `rendering-handoff/mesh-builders` | KAN-642 |
| `rendering-handoff/scene-layers` | KAN-103, KAN-643 |
| `testing/quality-gates` | KAN-309, KAN-310, KAN-650, KAN-654 |
| `deployment/documentation` | KAN-311, KAN-655, KAN-656 |

## Verification Checkpoints

Run these gates when cards move across lanes:

| Checkpoint | When | Commands Or Checks |
| --- | --- | --- |
| Contract checkpoint | After every 2-3 contract/generation cards | `npm run build`; focused validator tests when added. |
| Render checkpoint | After visible mesh, material, layer, or lighting changes | `npm run build`; `npm run test:e2e`; visual check in desktop and mobile viewport. |
| Slice checkpoint | After each vertical slice milestone | Build, e2e, validation issue count, debug overlay inspection, object picking, and screenshot comparison. |
| Performance checkpoint | Before increasing density/detail | Benchmark camera path, frame time, draw calls, triangle estimate, texture memory, active agents, chunk counts. |
| Release checkpoint | Before marking a phase complete | All acceptance criteria met, no P0/P1 validation errors, docs updated, no console WebGL errors introduced. |
