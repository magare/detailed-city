# Realistic Vehicle And Transit Kanban

This board turns the realistic cars, buses, trucks, and related road-agent work into implementable cards. It is scoped to the existing domain-first Three.js city architecture: city data owns meaning, generation creates deterministic plans, rendering handoff converts plans to meshes/assets, and runtime systems update simulated state.

Use this board alongside `docs/city-kanban.md`. The related city-wide cards are `KAN-602` for traffic flow simulation, `KAN-604` for transit operations simulation, `KAN-609` for scenario replay, `KAN-610` for micromobility and parking-search behavior, and `KAN-645` for instancing and pooling.

## Goal

Make city vehicles look and behave realistically without putting a language model inside the render loop.

GLM 5.1 is treated as a long-horizon coding agent and implementation assistant. It can execute cards, write tests, refactor systems, generate manifests, and review outputs. Runtime vehicle behavior must remain deterministic, testable, replayable, and fast.

## Scope

- Moving cars, buses, trucks, vans, taxis, service vehicles, emergency vehicles, and parked vehicles.
- Vehicle contracts, route state, physical dimensions, motion parameters, asset bindings, validation, diagnostics, and tests.
- Traffic flow behavior: acceleration, braking, following distance, queues, stop controls, signals, lane selection, lane changes, turning, spawn/despawn, density, incidents, closures, weather/time modifiers, and replay.
- Bus behavior: transit route following, bus lanes, stops, dwell time, headways, passenger demand, delays, and interaction with general traffic.
- Visual realism: better procedural fallbacks first, then licensed GLB/glTF fleet assets with LOD, materials, lights, wheels, brake lights, indicators, and bus/truck variants.

## Explicit Non-Goals

- Do not call GLM 5.1 every frame or for per-agent runtime decisions.
- Do not add nondeterministic cloud calls to simulation tests.
- Do not import third-party vehicle assets before asset source, license, attribution, scale, and LOD policy are decided.
- Do not rewrite the whole city generator to support vehicles; add slices that preserve the existing city pipeline.

## Board Rules

| Lane | Meaning |
| --- | --- |
| Done | Already present in the repository baseline or completed from this board. |
| Ready | Can be started with local context and no product decision. |
| Next | Sequenced after Ready cards; dependencies are clear. |
| Backlog | Required for full realism, but not on the immediate path. |
| Blocked | Needs a decision, asset source, provider choice, or technical policy before implementation. |

| Field | Rule |
| --- | --- |
| Priority | P0 is foundational, P1 creates visible realistic traffic, P2 adds advanced fidelity, P3 is polish or scale. |
| Size | XS touches 1 file, S touches 1-2 files, M touches 3-5 files, L touches 5-8 files. Split anything larger. |
| Dependencies | A card cannot move to Done until listed dependencies are Done or explicitly waived in this board. |
| Acceptance | The minimum testable outcome. Visible/runtime cards need browser verification. |

## Definition Of Done

- Domain contracts define vehicle meaning before meshes render it.
- Generated output is deterministic for the same seed/config.
- Vehicle objects have stable IDs, parent road/lane/route references, owner domain, LOD tier, metadata, and asset/fallback binding where applicable.
- Simulation state can be paused, resumed, and replayed from seed plus scenario state.
- Validation catches off-lane vehicles, invalid routes, impossible sizes, overspeeding, bad stop zones, missing assets, and broken bus-stop relationships.
- Rendering handoff consumes vehicle domain data and does not invent planning data in `src/world`.
- Diagnostics expose counts, route state, speed, behavior state, asset binding, and validation issues.
- `npm run build` passes.
- Targeted e2e tests pass for visible changes, with desktop and mobile nonblank canvas checks.

## Done

| ID | Card | Current Evidence |
| --- | --- | --- |
| RTV-000 | Baseline domain-first traffic plan | `src/generation/traffic/TrafficLaneGenerator.ts` generates lane markings and basic traffic vehicles as data; `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts` renders them; `src/world/city/City.ts` updates simple straight-road movement. |
| RTV-001 | Baseline transit stops and routes | `src/generation/mobility/TransitGenerator.ts` creates bus stops and route records from bus shelters and transit-eligible roads. |
| RTV-002 | Baseline navigation graph | `src/generation/mobility/NavigationGraphGenerator.ts` creates mode-specific graph data used by mobility and operations systems. |
| RTV-003 | Baseline asset catalog and fallback binding | `src/city/rendering-handoff/asset-binding/defaultAssetCatalog.ts` includes a procedural traffic-car asset and `binding:vehicle:traffic-car`. |
| RTV-004 | Baseline traffic validation | `src/city/data-contracts/validation/validateTrafficPlan.ts` validates traffic vehicles, route bounds, lane references, speed limits, stop behavior, and source metadata. |
| RTV-102 | Realistic traffic architecture note | `docs/realistic-traffic-architecture.md` links this Kanban to owner modules for contracts, generation, runtime simulation, rendering handoff, assets, validation, diagnostics, replay, and performance; verification: `npm run build`, `npm run test:e2e`, `npm run test:e2e:smoke`, `node scripts/run-e2e.mjs mobile tests/e2e/city-smoke.spec.ts`, `git diff --check`. |
| RTV-103 | Implementation context bundle | `docs/realistic-traffic-implementation-context.md` adds the required pre-read checklist for traffic generation, mesh builder, `City.ts` update loop, contracts, validation, transit, navigation graph, assets, materials, diagnostics, and e2e tests; verification: `npm run build`, `npm run test:e2e`, `npm run test:e2e:smoke`, `node scripts/run-e2e.mjs mobile tests/e2e/city-smoke.spec.ts`, `git diff --check`. |
| RTV-201 | Vehicle type taxonomy | `src/city/data-contracts/cityContracts.ts` defines nine vehicle classes with modes, dimensions, capacity hints, visual variant tags, fallback binding IDs, and behavior profiles; `src/generation/traffic/TrafficLaneGenerator.ts` emits deterministic classed vehicles; `src/city/data-contracts/validation/validateTrafficPlan.ts` validates finite taxonomy/profile data; `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts` consumes vehicle height; verification: `npm run build`, focused traffic routing/calming e2e, `npm run test:e2e`, desktop/mobile browser checks, `git diff --check`. |
| RTV-202 | Vehicle dynamics contract | `src/city/data-contracts/cityContracts.ts` adds finite per-vehicle dynamics; `src/generation/traffic/TrafficLaneGenerator.ts` emits deterministic preferred speed, acceleration, braking, following, reaction, turn-speed, and stop-tolerance values while preserving existing m/s speed semantics; `src/city/data-contracts/validation/validateTrafficPlan.ts` rejects missing, non-finite, negative, impossible, speed-limit, braking, turn-speed, and deterministic mismatch dynamics; `tests/e2e/city-traffic-routing.spec.ts` and `tests/e2e/city-traffic-calming.spec.ts` cover valid and invalid dynamics; verification: `npm run build`, focused traffic routing/calming e2e, `npm run test:e2e`, desktop/mobile browser checks, `git diff --check`. |
| RTV-203 | Vehicle runtime state contract | `src/city/data-contracts/trafficRuntimeState.ts` separates mutable route offset, current and target speed, behavior state, stop timer, lane-change state, signal state, and replay seed from generated vehicle plan data; `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts` initializes runtime state from vehicle contracts; `src/world/city/City.ts` mutates runtime state instead of static plan fields; `tests/e2e/city-traffic-routing.spec.ts` covers deterministic initialization, JSON serialization, replay seed stability, and plan immutability; verification: `npm run build`, focused traffic routing e2e, `npm run test:e2e`, desktop/mobile browser checks, `git diff --check`. |
| RTV-401 | Traffic simulation system shell | `src/systems/traffic/TrafficSimulationSystem.ts` now owns the existing deterministic per-vehicle update loop, stop-zone handling, stop-timer behavior, route-offset wrap-around, and mesh position application; `src/world/city/City.ts` delegates `update()` to the traffic simulation object; `tests/e2e/city-traffic-simulation.spec.ts` covers direct movement, wrap, stop, timer resume, and x-axis behavior while existing traffic routing browser tests verify live movement; verification: `npm run build`, focused simulation and traffic routing e2e, `npm run test:e2e`, `npm run test:e2e:browser`, desktop/mobile browser checks, `git diff --check`. |
| RTV-402 | Acceleration and braking | `src/systems/traffic/TrafficSimulationSystem.ts` now accelerates and brakes deterministic runtime vehicle speed toward speed-limit-capped targets and stop-safe speed caps, snaps before stop overshoot, preserves stop timers and route wrap-around, and keeps generated plans immutable; `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts` passes per-vehicle dynamics, stop tolerance, and speed limit into simulation handles; `tests/e2e/city-traffic-simulation.spec.ts` covers cruise, acceleration, speed-limit clamping, braking before stops, stop tolerance, stop-timer resume with acceleration, and wrap-around; verification: `npm run build`, focused simulation and traffic routing e2e, `npm run test:e2e`, `npm run test:e2e:browser`, desktop/mobile browser checks, runtime AI scan, `git diff --check`. |

## Blocked Decisions

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-D01 | P0 | S | GLM 5.1 execution workflow | Decide how GLM 5.1 will be used as an implementation agent: provider, API key handling, context bundle, allowed tools, retry policy, and fallback model. Runtime vehicle simulation must not depend on this provider. | A short runbook documents how to dispatch a GLM 5.1 coding session for one card, what context to include, how to verify results, and how to fall back when the provider is unavailable. | None |
| RTV-D02 | P0 | S | Vehicle asset source policy | Choose whether realistic vehicle assets are procedural, hand-authored, generated, third-party open assets, or a mix. Define license and attribution requirements before importing binary models. | `docs/assets.md` or an ADR names approved asset sources, licenses, attribution fields, meter-scale rules, LOD requirements, and review steps. | None |
| RTV-D03 | P0 | S | Traffic fidelity target | Decide the first acceptable realism level: simple deterministic kinematics, car-following model, lane-changing model, or full microscopic traffic simulator integration. | The selected target is written as a measurable MVP with expected vehicle counts, frame budget, behaviors, and non-goals. | None |
| RTV-D04 | P1 | M | External simulation/library policy | Decide whether to remain custom deterministic TypeScript or bring in a traffic/pathing library. | ADR records the choice, bundle/performance impact, determinism guarantees, and test strategy. | RTV-D03 |
| RTV-D05 | P1 | S | Fleet visual style policy | Decide how realistic vehicle colors, cleanliness, damage, signage, emergency markings, bus liveries, and regional variety should look in this city. | Visual rules are added to `docs/visual-style.md` and asset tags can select variants by vehicle class, district, weather, and LOD. | RTV-D02 |

## Ready

### GLM 5.1 And Work Scaffolding

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-101 | P0 | S | GLM 5.1 card execution prompt | Create a reusable prompt template for asking GLM 5.1 to implement one Kanban card at a time in this repo. Include boundaries: domain-first, deterministic simulation, tests, no runtime AI calls, no raw asset paths, and no unrelated refactors. | A prompt document exists and can be used with any `RTV-*` card. It tells the model which files to inspect, expected output, verification commands, and failure reporting format. | RTV-D01 |

### Vehicle Domain Contracts

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-204 | P1 | M | Bus vehicle contract | Add bus-specific fields: transit route ID, stop sequence, next stop ID, dwell time, door side, schedule offset, headway group, passenger load estimate, and bus-lane permission. | A bus can be represented as a traffic/transit agent without overloading generic car fields. Validator rejects a bus with missing route/stop references. | RTV-201, RTV-001 |
| RTV-205 | P1 | M | Service, freight, and emergency vehicle profiles | Add class-specific profile data for delivery vans, heavy trucks, maintenance vehicles, ambulances, fire apparatus, and police vehicles. | Vehicle generation can choose profiles from freight, maintenance, and emergency domain data without breaking ordinary car traffic. | RTV-201 |

### First Visual Upgrade

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-301 | P1 | M | Procedural realistic car fallback | Replace plain boxes with a procedural multi-part car fallback: body, cabin, windshield, wheels, headlights, taillights, and shadow-friendly proportions. | Existing traffic vehicles render as recognizable cars at current scale. No binary assets required. Picking metadata still resolves vehicle IDs. | RTV-201 |
| RTV-302 | P1 | M | Procedural bus fallback | Add a procedural bus mesh with body, windows, wheels, route sign panel, doors, headlights, taillights, and correct footprint. | Generated bus agents can render as buses before GLB assets are imported. | RTV-204 |
| RTV-303 | P1 | S | Vehicle material zones | Add or reuse material zones for vehicle paint, glass, tire rubber, headlights, taillights, brake lights, indicators, bus glass, and emergency light accents. | Asset catalog and material validation recognize all vehicle material zones used by procedural fallbacks. | RTV-301, RTV-302 |

### Simulation Foundation

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-403 | P1 | M | Following distance and simple queues | Add same-lane leading-vehicle detection and safe following distance. Vehicles should slow or queue instead of overlapping. | Two vehicles on the same lane maintain spacing under normal speeds and at stop zones. Validator or test fixtures catch overlap regressions. | RTV-402 |
| RTV-404 | P1 | M | Spawn and density policy | Replace the hardcoded small vehicle cap with a deterministic spawn plan driven by traffic density, road hierarchy, lane count, district, time profile, and performance budget. | Vehicle counts scale with config and stay under budget. Dense roads look busier than local streets. | RTV-201, RTV-401 |

### Validation, Diagnostics, And Tests

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-501 | P0 | M | Vehicle contract validation | Expand `validateTrafficPlan` to validate vehicle class, dynamics, asset binding, route state, and class-specific required fields. | Invalid dimensions, missing class, missing binding, impossible acceleration/braking, and bad bus route refs produce validation issues with suggested fixes. | RTV-201, RTV-202, RTV-204 |
| RTV-502 | P0 | M | Deterministic simulation tests | Add focused tests for simulation ticks, acceleration, braking, following distance, stop timers, wrap-around, and seeded initial state. | Tests can run without a browser and produce the same positions/speeds across runs. | RTV-401, RTV-402 |
| RTV-503 | P1 | M | Vehicle diagnostics panel data | Extend diagnostics with vehicle counts by class, average speed, stopped vehicles, queue length, bus count, invalid assets, and performance budget status. | Debug data exposes enough state to inspect realism without reading scene internals. | RTV-501 |
| RTV-504 | P1 | M | Browser visual smoke tests | Add e2e checks that cars and buses render as non-box realistic fallbacks, move over time, remain on lanes, and keep validation clean on desktop and mobile. | Tests check nonblank canvas, vehicle counts, no console errors, passing validation, and stable screenshot-pixel thresholds. | RTV-301, RTV-302, RTV-402 |

## Next

### Navigation And Routing

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-601 | P1 | M | Graph-backed vehicle routes | Generate traffic vehicle routes from navigation graph nodes and edges instead of one road segment only. | Vehicles can traverse multiple connected roads using valid vehicle-mode graph edges. Route endpoints and lane refs validate. | RTV-002, RTV-401 |
| RTV-602 | P1 | M | Intersection turn geometry | Add deterministic turn paths through intersections using short curve segments, turn speed limits, and lane-to-lane mapping. | Vehicles visibly turn at intersections without snapping, cutting sidewalks, or leaving road bounds. | RTV-601 |
| RTV-603 | P1 | M | Stop controls and signal phases | Connect traffic vehicles to intersection control data and crossing/signal phases. | Vehicles stop for red/stop/yield behavior and proceed on permitted phases. Stop behavior is no longer only crossing-offset based. | RTV-602 |
| RTV-604 | P1 | M | Route cache and replay seed | Cache generated routes and initial vehicle seeds so scenario replay can recreate the same fleet and positions. | A recorded seed produces the same route assignments, vehicle classes, and initial offsets across runs. | RTV-601 |
| RTV-605 | P2 | M | Rerouting around closures | Route vehicles around temporary closures, maintenance operations, incidents, and event restrictions using navigation graph state. | Closing a road removes it from new routes and can reroute active vehicles at safe decision points. | RTV-604, KAN-562 |

### Lane Behavior

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-701 | P1 | M | Lane choice policy | Choose lanes from direction, allowed modes, bus-only restrictions, turn movements, vehicle class, route intent, and congestion. | Cars avoid bus-only lanes, buses prefer bus lanes, trucks avoid restricted lanes, and vehicles prepare for upcoming turns. | RTV-601 |
| RTV-702 | P1 | M | Lane-change behavior | Add deterministic lane-change intent, gap acceptance, lateral interpolation, cooldown, and aborted-change handling. | Vehicles change lanes smoothly only when a safe gap exists and never overlap lane boundaries incoherently. | RTV-701, RTV-403 |
| RTV-703 | P2 | M | Merge and turn-pocket queues | Add merge behavior near lane drops, turn pockets, bus bulbs, curb extensions, and blocked lanes. | Queues form in realistic places and through traffic can continue when lane geometry allows. | RTV-702, KAN-372 |
| RTV-704 | P2 | M | Weather and time modifiers | Apply rain, fog, night, and seasonal multipliers to speed, following distance, braking, visibility lights, and spawn demand. | Rain/fog/night visibly and behaviorally affect traffic without hiding city readability. | RTV-402, KAN-607 |

### Bus And Transit Operations

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-801 | P1 | M | Bus agent generation | Generate moving bus agents from `TransitRoute` and `TransitStop` records, not from random car traffic. | Each eligible transit route can spawn buses with route ID, stop sequence, lane permissions, and bus visual binding. | RTV-204, RTV-601 |
| RTV-802 | P1 | M | Bus stop dwell behavior | Add next-stop targeting, pull-in/pull-out, dwell timer, door-side metadata, passenger load estimate, and resume behavior. | Buses stop at valid transit stops for deterministic dwell time and then rejoin traffic. Cars queue behind or pass based on lane rules. | RTV-801, RTV-403 |
| RTV-803 | P1 | M | Headways and timetable seed | Add deterministic headway scheduling based on route headway, service span, scenario time, and vehicle capacity. | Route bus counts and departures match headway policy. Diagnostics expose expected vs active buses. | RTV-802 |
| RTV-804 | P2 | M | Bus priority behavior | Add bus-lane preference, queue jump behavior, bus bulb handling, and optional signal priority. | Buses receive priority only where street profile and intersection policy allow it. | RTV-803, RTV-603 |
| RTV-805 | P2 | M | Transit reliability metrics | Track on-time status, average dwell, delay causes, missed headways, bunching, and passenger wait estimate. | Diagnostics and overlays expose reliability per route and stop. | RTV-803 |

### Asset Pipeline

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-901 | P1 | M | Vehicle GLB catalog entries | Add asset definitions and render bindings for car, taxi, van, bus, truck, service, and emergency GLB assets with LOD variants and procedural fallbacks. | Asset validation enforces URL, format, scale, tags, attribution, license, LOD variants, and fallback binding. | RTV-D02, RTV-D05, RTV-201 |
| RTV-902 | P1 | M | GLB loader and cache | Add a rendering-handoff loader/cache for GLB vehicle models using Vite public asset paths and safe fallback on load failure. | Vehicle rendering can load a model once, clone unique articulated meshes, instance repeated low-LOD meshes, and fall back visibly when loading fails. | RTV-901 |
| RTV-903 | P1 | M | Vehicle orientation, pivots, and scale audit | Normalize imported vehicle model pivots, forward axis, meter scale, wheelbase, height, and lane footprint. | Imported models align to lanes, face direction correctly, and match procedural footprint dimensions. | RTV-902 |
| RTV-904 | P2 | M | Vehicle lights and animated parts | Add brake lights, headlights, indicators, emergency strobes, wheel rotation, and optional bus door animation as state-driven mesh updates. | Visual state follows simulation state and has no effect on domain truth. | RTV-903, RTV-402, RTV-802 |
| RTV-905 | P2 | M | Parked vehicle assets | Add parked-car generation from curb management, plus visual variants and clearance validation. | Parking zones can display parked vehicles without blocking bus stops, fire lanes, crossings, or loading zones. | RTV-901, KAN-368 |

## Backlog

### Advanced Traffic Realism

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-1001 | P2 | M | Car-following model upgrade | Upgrade simple following distance to a named deterministic model such as IDM-like behavior or a documented project-specific equivalent. | Vehicles accelerate and decelerate smoothly in congestion, with stable queues and no oscillation under test fixtures. | RTV-403, RTV-D03 |
| RTV-1002 | P2 | M | Parking search behavior | Add destination parking search, curb pickup/drop-off, illegal parking risk, and cruising around blocks. | Vehicles can search nearby curb zones and create realistic curb conflicts. | RTV-905, KAN-610 |
| RTV-1003 | P2 | M | Freight loading behavior | Generate delivery trips from economy/freight anchors and route trucks to loading zones with service-window constraints. | Delivery vehicles use freight routes and loading docks without behaving like ordinary cars. | RTV-205, KAN-369 |
| RTV-1004 | P2 | M | Emergency response vehicle behavior | Route emergency vehicles from emergency service anchors, use siren/light state, controlled priority, and closure avoidance. | Emergency vehicles can be dispatched to incidents and influence nearby traffic safely. | RTV-205, KAN-565 |
| RTV-1005 | P2 | M | Maintenance and service vehicle behavior | Generate street sweeping, waste pickup, repair crews, and utility service trips from operations schedules. | Service vehicles follow scheduled routes and create temporary slowdowns or curb conflicts. | RTV-205, KAN-566 |
| RTV-1006 | P3 | M | Driver imperfection model | Add bounded variation in reaction time, preferred speed, aggressiveness, lane-change willingness, and yielding behavior. | Variation improves realism while remaining deterministic and validator-safe. | RTV-1001 |
| RTV-1007 | P3 | M | Road-user conflict model | Add explicit conflict checks between vehicles, buses, pedestrians, bikes, crossings, curb activations, and work zones. | Diagnostics can report where near-conflicts occur without producing visual collisions. | RTV-702, KAN-603 |

### Scale, Performance, And Authoring

| ID | Priority | Size | Card | Details | Acceptance | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| RTV-1101 | P1 | M | Vehicle instancing and pooling | Convert repeated procedural and low-LOD vehicle meshes to instancing or pooled objects where useful. | Draw calls and object counts stay under performance budget at target vehicle density. | RTV-301, RTV-302, RTV-404 |
| RTV-1102 | P1 | M | Simulation budget governor | Add a budget-aware update policy: active radius, LOD simulation tiers, sleep/wake state, and max agents per class. | Distant traffic remains plausible without full per-frame simulation, and diagnostics report active vs sleeping vehicles. | RTV-401, RTV-404 |
| RTV-1103 | P2 | M | Scenario time controls | Connect traffic and buses to scenario manager time: pause, step, speed multiplier, reset, and replay. | Manual and automated tests can advance deterministic traffic by fixed ticks. | RTV-604, KAN-609 |
| RTV-1104 | P2 | M | Traffic authoring/debug controls | Add debug toggles for vehicle class visibility, route overlays, speed coloring, queue coloring, and selected-agent state. | Engineers can inspect why a vehicle stopped, changed lanes, rerouted, or missed a bus stop. | RTV-503 |
| RTV-1105 | P2 | M | Import/export for traffic scenarios | Export traffic seed, route assignments, asset bindings, simulation clock, and replay snapshots while excluding renderer-only state. | Exported traffic scenario imports into a stable replay view. | RTV-604, KAN-652 |

## File Targets

| Workstream | Likely Files |
| --- | --- |
| GLM 5.1 scaffolding | `docs/realistic-traffic-kanban.md`, `docs/codex-kanban-implementation-prompt.md`, new docs under `docs/` for GLM runbook/prompt templates. |
| Vehicle contracts | `src/city/data-contracts/cityContracts.ts`, `src/types/city.ts`, `src/city/data-contracts/cityObjectRegistry.ts`, `src/city/data-contracts/validation/validateTrafficPlan.ts`, `src/city/data-contracts/generatedCityObjectIndex.ts`. |
| Vehicle generation | `src/generation/traffic/TrafficLaneGenerator.ts`, possible new `src/generation/traffic/VehicleFleetGenerator.ts`, `src/generation/mobility/TransitGenerator.ts`, `src/generation/mobility/NavigationGraphGenerator.ts`, `src/generation/CityGenerator.ts`. |
| Simulation runtime | New `src/simulation/traffic/*` or `src/world/simulation/traffic/*`, `src/world/city/City.ts`, `src/core/RenderLoop.ts` if fixed-step integration is needed. |
| Rendering handoff | `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts`, `src/city/rendering-handoff/mesh-builders/TransitMeshBuilder.ts`, possible new `VehicleMeshBuilder.ts`, `src/rendering/materials/MaterialLibrary.ts`. |
| Asset catalog | `src/city/rendering-handoff/asset-binding/defaultAssetCatalog.ts`, `docs/assets.md`, `docs/asset-catalog.md`, `public/assets/models/vehicles/**`, `public/assets/textures/vehicles/**`. |
| Diagnostics and overlays | `src/app/cityDiagnostics.ts`, `src/app/DebugPanel.ts`, `src/city/rendering-handoff/overlays/overlayData.ts`, `src/city/rendering-handoff/picking/pickingMetadata.ts`. |
| Tests | `tests/e2e/*.spec.ts`, possible unit tests under `src/**/__tests__` or a new test harness if the project adds one, `playwright.config.ts`. |

## Verification Matrix

| Card Range | Required Verification |
| --- | --- |
| RTV-101 to RTV-103 | Markdown review; no build required unless prompts reference generated files. |
| RTV-201 to RTV-205 | `npm run build`; focused validator tests; `npm run test:e2e:fast` if runtime city output changes. |
| RTV-301 to RTV-303 | `npm run build`; browser desktop and mobile checks; visual smoke screenshots; no console errors. |
| RTV-401 to RTV-404 | `npm run build`; deterministic simulation tests; `npm run test:e2e:fast`; inspect vehicle motion over time. |
| RTV-501 to RTV-504 | `npm run build`; validator tests; diagnostics checks; browser e2e. |
| RTV-601 to RTV-704 | `npm run build`; graph/route tests; replay determinism tests; browser checks for turning, stopping, queueing, and lane changes. |
| RTV-801 to RTV-805 | `npm run build`; transit validation; bus stop/dwell tests; browser checks for buses stopping and rejoining traffic. |
| RTV-901 to RTV-905 | `npm run build`; asset validation; loader fallback tests; browser asset rendering checks; license/attribution review. |
| RTV-1001 to RTV-1105 | `npm run build`; targeted simulation tests; e2e/full tests when visible or performance-impacting; performance diagnostics under target vehicle density. |

## Suggested Implementation Order

1. Resolve `RTV-D01`, `RTV-D02`, and `RTV-D03`.
2. Complete scaffolding: `RTV-101`, `RTV-102`, `RTV-103`.
3. Complete contracts: `RTV-201`, `RTV-202`, `RTV-203`, `RTV-501`.
4. Build realistic procedural visuals: `RTV-301`, `RTV-302`, `RTV-303`, `RTV-504`.
5. Extract and improve simulation: `RTV-401`, `RTV-402`, `RTV-403`, `RTV-404`, `RTV-502`, `RTV-503`.
6. Add graph routes and intersections: `RTV-601`, `RTV-602`, `RTV-603`, `RTV-604`.
7. Add lane behavior: `RTV-701`, `RTV-702`, then `RTV-703`.
8. Add bus operations: `RTV-801`, `RTV-802`, `RTV-803`, then `RTV-804`, `RTV-805`.
9. Add GLB assets after policy is done: `RTV-901`, `RTV-902`, `RTV-903`, `RTV-904`, `RTV-905`.
10. Scale and polish: `RTV-1101`, `RTV-1102`, `RTV-1103`, `RTV-1104`, `RTV-1105`, then advanced realism cards.

## Coverage Checklist

| Requirement From Discussion | Covered By |
| --- | --- |
| Use GLM 5.1 effectively | `RTV-D01`, `RTV-101`, `RTV-102`, `RTV-103`. |
| Keep AI out of runtime behavior | Goal, non-goals, `RTV-D01`, `RTV-102`. |
| Build scaffolding first | `RTV-101` to `RTV-103`, `RTV-201` to `RTV-205`, `RTV-401`. |
| Realistic cars | `RTV-201`, `RTV-202`, `RTV-301`, `RTV-901`, `RTV-1001`. |
| Realistic buses | `RTV-204`, `RTV-302`, `RTV-801` to `RTV-805`. |
| Trucks, service, emergency, and related vehicles | `RTV-205`, `RTV-1003`, `RTV-1004`, `RTV-1005`. |
| Realistic visual assets | `RTV-301` to `RTV-303`, `RTV-901` to `RTV-905`. |
| Asset licensing and attribution | `RTV-D02`, `RTV-901`, verification matrix. |
| Traffic simulation layer | `RTV-401` to `RTV-404`, `RTV-1001`. |
| Acceleration and braking | `RTV-202`, `RTV-402`, `RTV-1001`. |
| Following distance and queues | `RTV-403`, `RTV-703`, `RTV-1001`. |
| Stop controls and signals | `RTV-603`, `RTV-804`. |
| Lane choice and lane changes | `RTV-701`, `RTV-702`, `RTV-703`. |
| Graph routing and pathing | `RTV-601` to `RTV-605`. |
| Bus stops, dwell time, and headways | `RTV-801` to `RTV-805`. |
| Weather and day-night behavior | `RTV-704`. |
| Deterministic replay | `RTV-604`, `RTV-1103`, `RTV-1105`. |
| Validation and diagnostics | `RTV-501` to `RTV-504`, `RTV-1104`. |
| Performance and scalability | `RTV-1101`, `RTV-1102`, verification matrix. |
