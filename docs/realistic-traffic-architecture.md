# Realistic Traffic Architecture

This note defines the system boundaries for realistic vehicle and transit simulation in the detailed city. See the [Realistic Vehicle And Transit Kanban](realistic-traffic-kanban.md) for the implementation roadmap.

## GLM 5.1 Role Statement

**GLM 5.1 is a development-time coding assistant, not a runtime traffic controller.** It executes Kanban cards, writes tests, refactors systems, and reviews outputs. Runtime vehicle and transit behavior must not call GLM, Claude, Codex, or any language model.

## Owner Modules

### Contracts and Domain

**Owner:** `src/city/data-contracts/`

- `cityContracts.ts` defines traffic vehicle, transit route/stop, navigation graph, and simulation state contracts
- `cityObjectRegistry.ts` registers `traffic-vehicle`, `lane-marking`, `transit-stop`, `transit-route` kinds
- `validation/validateTrafficPlan.ts` validates lane markings and vehicles for identity, parent references, dimensions, routes, speeds, stop zones, and source metadata
- `import-export/` defines exchange contracts for traffic scenarios

### Generation

**Owner:** `src/generation/`

- `traffic/TrafficLaneGenerator.ts` creates deterministic lane markings and traffic vehicles from road/intersection/crossing data
- `mobility/TransitGenerator.ts` creates bus stops and route records from bus shelters and transit-eligible roads
- `mobility/NavigationGraphGenerator.ts` creates mode-specific navigation graphs for vehicle, pedestrian, bike, transit, service, emergency, and freight routing

### Simulation Runtime

**Owner:** Currently `src/world/city/City.ts`; future targets include `src/simulation/traffic/*`, `src/world/simulation/traffic/*`, or other board-approved locations

- The local updateTrafficVehicle helper in City.ts currently owns per-frame vehicle movement and stop-zone behavior
- Future cards extract this into a dedicated traffic simulation system with acceleration, braking, following distance, queues, signals, lane changes, and spawn/despawn
- Simulation state must be separate from domain contracts to support pausing, resuming, and replay

### Rendering Handoff

**Owner:** `src/city/rendering-handoff/`

- `mesh-builders/TrafficMeshBuilder.ts` converts traffic domain plans into lane marking instances and vehicle meshes
- `mesh-builders/TransitMeshBuilder.ts` renders transit stops and routes
- `picking/pickingMetadata.ts` attaches picking metadata for vehicle selection
- Rendering must consume domain data, not invent planning meaning

### Assets and Materials

**Owner:** `src/rendering/` and `src/city/rendering-handoff/asset-binding/`

- `materials/MaterialLibrary.ts` defines vehicle body materials
- `asset-binding/defaultAssetCatalog.ts` provides procedural traffic-car asset and `binding:vehicle:traffic-car` fallback
- Imported vehicle assets require resolved policy (see `RTV-D02` in Kanban)

### Validation, Diagnostics, and Tests

**Owner:** `src/city/data-contracts/validation/`, `src/app/cityDiagnostics.ts`, and `tests/`

- `validation/validateTrafficPlan.ts` validates lane markings and traffic vehicles
- Transit stop/route validation belongs to generated city validation
- `src/app/cityDiagnostics.ts` and rendering-handoff diagnostic files provide runtime diagnostics
- `tests/e2e/city-traffic-routing.spec.ts` tests traffic routing
- `tests/e2e/city-transit-network.spec.ts` tests transit networks
- `tests/e2e/city-navigation-graphs.spec.ts` tests navigation graphs
- `tests/e2e/city-smoke.spec.ts` provides smoke test coverage

### Replay and Scenario State

**Owner:** Current scenario inputs are generated domain data; future replay state should live in a board-approved runtime simulation module, outside renderer-only scene state. Supports `KAN-609`.

- Simulation state must be serializable for deterministic replay
- Scenario time controls (pause, step, speed, reset) connect to traffic update loops

### Performance and Instancing

**Owner:** `src/city/rendering-handoff/` (supports `KAN-645` instancing and pooling)

- Instancing and pooling for repeated vehicle meshes
- Budget-aware update policy with active radius and LOD simulation tiers

## Main-Board Linkage

This vehicle sub-board supports:
- `KAN-602` - Traffic flow simulation
- `KAN-604` - Transit operations simulation
- `KAN-609` - Scenario manager and replay
- `KAN-610` - Micromobility and parking-search behavior
- `KAN-645` - Instancing and pooling

## Determinism Requirement

Generated traffic and transit output must remain deterministic for the same seed/config. Simulation tests should produce identical positions and speeds across runs without cloud dependencies.

## Blocked Decisions

The following policy decisions must be resolved before dependent implementation begins (this note is not blocked):
- `RTV-D01` - GLM 5.1 execution workflow
- `RTV-D02` - Vehicle asset source policy
- `RTV-D03` - Traffic fidelity target
- `RTV-D04` - External simulation/library policy
- `RTV-D05` - Fleet visual style policy
