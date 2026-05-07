# Validation Spec

Validation is a first-class city system. It protects the project from procedural output that looks acceptable in one camera view but breaks routing, zoning, assets, simulation, or performance.

## Severity

| Severity | Meaning |
| --- | --- |
| `error` | City data is invalid and should not be accepted for a production slice. |
| `warning` | City can render, but a planning, visual, or performance assumption is violated. |
| `info` | Useful diagnostics for debug panels and tuning. |

## Required Checks

| Category | Checks |
| --- | --- |
| Identifier | Unique IDs, valid parent references, stable ID pattern, no duplicate ownership. |
| Geometry | Positive dimensions, valid polygons, no self-intersections, no zero-area parcels. |
| Roads | Connected road graph, legal intersections, lane continuity, hierarchy/profile compatibility. |
| Sidewalks | Continuous paths, crossings connect both sides, accessible curb ramps. |
| Parcels | Parcels inside blocks, respect setbacks, have frontage, do not overlap water/roads. |
| Buildings | Fit parcels, respect height/coverage, do not block required access. |
| Zoning | Building use, height, density, frontage, and buffers match district rules. |
| Utilities | Hydrants, drains, lights, power, water, waste, and service access coverage. |
| Assets | Valid asset binding or fallback for every renderable semantic object. |
| LOD | Terrain, networks, buildings, props, agents, and overlays have LOD behavior. |
| Simulation | Agents have spawn points, destinations, schedules, and route graphs. |
| Performance | Chunk counts, draw calls, triangles, texture memory, and active agents under budget. |

## Current Executable Checks

`validateGeneratedCity` currently verifies:

- Duplicate IDs across districts, blocks, roads, lanes, sidewalks, parcels, buildings, parks, waterways, and trees.
- District boundaries, primary uses, and allowed street profiles.
- Block geometry and district parent relationships.
- Positive road length, width, widthMeters, lane count, lane widths, sidewalk clear widths, and lane totals that fit road width.
- Lane and sidewalk parent references back to their road segment.
- Parcel district/block references, positive dimensions, max height, bounded coverage ratio, frontage roads, and allowed uses.
- Building references to parcels, positive footprint/height/floor count, parcel fit, coverage, height, and allowed uses.
- Tree parent park references.

## Expansion Order

1. Geometry and identifier validation for all Phase 2 contracts.
2. Road/sidewalk/crossing graph checks.
3. Parcel and building zoning checks.
4. Asset binding and LOD checks.
5. Utility coverage and service access checks.
6. Simulation spawn/destination/route checks.
7. Chunk and performance budget checks.

## Debug Output

Validation issues should be visible in a debug overlay with:

- Issue severity and category.
- Object ID and owner domain.
- World position or affected boundary.
- Suggested fix where the rule can infer one.
