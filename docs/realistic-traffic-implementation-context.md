# Realistic Traffic Implementation Context Bundle

**Purpose:** Pre-read checklist for implementation agents working on RTV-* traffic/transit cards. Understand file ownership, follow verification patterns, and respect boundaries defined in `docs/realistic-traffic-architecture.md`.

**Hard Rules:**
- DO NOT rewrite architecture or make policy decisions
- DO NOT add runtime AI calls (GLM, Claude, Codex) to vehicle/transit behavior
- DO NOT import third-party assets until RTV-D02 resolves
- DO NOT extract simulation from `City.update()` without RTV-401 planning
- DO NOT mark parent cards (KAN-602, KAN-604, KAN-609, KAN-610, KAN-645) complete

---

## File Ownership Checklist

| Category | File | What It Owns |
|----------|------|--------------|
| **Traffic Generation** | `src/generation/traffic/TrafficLaneGenerator.ts` | Deterministic lane markings (dashes, arrows, zebra, stop bars, tactile) and traffic vehicles (MAX=7) from road/intersection/crossing data |
| **Mesh Builder** | `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts` | Converts domain plans to Three.js instanced meshes for markings and vehicle boxes with picking metadata |
| **City Update Loop** | `src/world/city/City.ts` | Per-frame vehicle movement via `updateTrafficVehicle()` helper: stop zones, look-ahead, route offset stepping, wrap logic |
| **City Contracts** | `src/city/data-contracts/cityContracts.ts` | Base `CityObjectBase`, `TrafficVehicleContract`, `TransitStopContract`, `TransitRouteContract`, navigation graph contracts, asset definitions, render bindings, LOD/source/performance types. `src/types/city.ts` exports generated plan interfaces that extend these. |
| **Traffic Validation** | `src/city/data-contracts/validation/validateTrafficPlan.ts` | Validates lane markings (identity, parent refs, geometry, assets) and vehicles (road/lane refs, routes, speeds, stop zones, dimensions) |
| **Transit Generator** | `src/generation/mobility/TransitGenerator.ts` | Bus stops from shelters with transitStopId, routes from transit-eligible roads, headway/service span, passenger demand seeds |
| **Navigation Graph** | `src/generation/mobility/NavigationGraphGenerator.ts` | Mode-specific graphs (vehicle, pedestrian, bike, transit, service, emergency, freight) with nodes, edges, restrictions |
| **Asset Catalog** | `src/city/rendering-handoff/asset-binding/defaultAssetCatalog.ts` | Asset definitions and render bindings; current `asset:vehicle:traffic-car:primitive` with `binding:vehicle:traffic-car` |
| **Material Library** | `src/rendering/materials/MaterialLibrary.ts` | Vehicle body materials (4 colors), `getMaterialForZone()` lookup, weather presets |
| **Diagnostics** | `src/app/cityDiagnostics.ts` | `window.cityDiagnostics` with traffic validation, scene layer counts, object index, picking metadata, overlays |
| **Scene Layers** | `src/city/rendering-handoff/scene-layers/sceneLayerDefinitions.ts` | Layer definitions: networks (markings), agents (vehicles); visibility and render order |
| **Object Index** | `src/city/data-contracts/generatedCityObjectIndex.ts` | `createGeneratedRuntimeObjectIndex()` combines static + runtime (traffic.markings, traffic.vehicles) into queryable index |
| **E2E Tests** | `tests/e2e/city-traffic-routing.spec.ts` | Traffic determinism, vehicle structure, validation rejection, browser movement |
| | `tests/e2e/city-transit-network.spec.ts` | Transit determinism, stop/route structure, validation |
| | `tests/e2e/city-navigation-graphs.spec.ts` | Navigation graph determinism, mode coverage, route structure, validation |
| | `tests/e2e/city-smoke.spec.ts` | WebGL render, diagnostics access, validation status, scene layers, picking |

---

## Verification Matrix

| Card Type | Required Verification |
|-----------|----------------------|
| **Docs only (RTV-101-103)** | `npm run build`, `npm run test:e2e`, `git diff --check`, markdown review |
| **Contracts/Validation** | `npm run build`, targeted validator tests, `npm run test:e2e:fast` |
| **Generation** | `npm run build`, determinism tests, `npm run test:e2e:fast` |
| **Rendering/Assets** | `npm run build`, browser desktop/mobile smoke, visual checks, no console errors |
| **Runtime/Simulation** | `npm run build`, deterministic simulation tests, `npm run test:e2e:fast`, inspect motion |
| **Diagnostics/Browser** | `npm run build`, diagnostics checks, browser e2e, picking tests |

All cards require `npm run build`, `npm run test:e2e`, and `git diff --check` before moving to Done. Full-board workflow adds desktop and mobile smoke.

---

## Browser Checks

### Access Patterns

```javascript
// Three.js scene traversal (NOT DOM querySelector)
window.cityApp.city.group.getObjectByName('traffic-vehicle-0')

// Object index lookup
window.cityDiagnostics.objectIndex.objectsById['traffic-vehicle-0']

// Diagnostic access
window.cityDiagnostics.trafficValidation
window.cityDiagnostics.objectCounts.trafficVehicles
window.cityDiagnostics.sceneLayers.find(l => l.id === 'agents')
```

### Visual Smoke

1. Load dev server at `http://127.0.0.1:5173`
2. Verify nonblank canvas in desktop and mobile viewports
3. Check console for errors
4. Inspect traffic vehicles via scene traversal
5. Verify vehicle count matches expected
6. Watch for movement if simulation is running
7. Test picking (click vehicle, check metadata)

### E2E Patterns

- Determinism: `expect(first.map(...)).toEqual(second.map(...))`
- Structure: `expect(vehicle).toMatchObject({ id, roadId, laneId, axis, direction, speed, route })`
- Validation: construct invalid objects, expect specific error IDs
- Movement: capture mesh position before/after, expect delta > threshold
- Screenshot: pixel variance check for nonblank canvas
- Visibility: `await expect(page.locator('canvas')).toBeVisible()`

---

## Blocked Decisions

- **RTV-D01**: GLM 5.1 execution workflow (blocked, NOT a dependency of this ticket)
- **RTV-D02**: Vehicle asset source policy (must resolve before importing GLB assets)
- **RTV-D03**: Traffic fidelity target (simple kinematics vs car-following vs microscopic sim)
- **RTV-D04**: External simulation/library policy
- **RTV-D05**: Fleet visual style policy

---

## Determinism + Runtime AI Rules

**Determinism:** All generated traffic/transit output must be deterministic for the same seed/config. Use seeded patterns like `(index * 37 + 11) % length` for offsets.

**Runtime AI Prohibition:** GLM 5.1, Claude, Codex, or any language model MUST NOT be called from runtime vehicle or transit behavior. Simulation remains local, deterministic, and testable. LLMs are development-time tools only.

---

## Main-Board Linkage

This context bundle supports parent cards KAN-602, KAN-604, KAN-609, KAN-610, KAN-645. Reference these for context but do not mark them complete.
