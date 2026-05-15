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
| Config | City seed, quality preset, grid/block/road/water dimensions, building height/setback ranges, city/traffic/prop/tree density, district density/height/lot split, render colors, FOV, clipping, fog, pixel ratio, and shadow flags. |
| Identifier | Unique IDs, object-kind registry ID patterns, required/forbidden parent IDs, valid parent kinds, valid parent references, no duplicate ownership. |
| Geometry | Finite local meter coordinates, local x/z bounds, height datum bounds, positive dimensions, valid polygons, no self-intersections, no zero-area parcels. |
| Roads | Connected road graph, legal intersections, lane continuity, hierarchy/profile compatibility. |
| Road markings | Lane dashes, zebra crossings, stop bars, arrows, tactile paving, and refuge islands reference valid roads/crossings and render bindings. |
| Sidewalks | Continuous paths, crossings connect both sides, accessible curb ramps. |
| Curbs | Curb zones attach to sidewalks/roads, do not overlap, and loading stays clear of crossings. |
| Street trees | Street trees bind to sidewalks/roads/curbs and fit inside the furnishing zone. |
| Street lights | Street lights bind to sidewalks/roads/curbs and carry coverage plus utility placeholders. |
| Street furniture/signs | Furniture and signs bind to sidewalks/roads/curbs, use explicit placement zones, stay out of pedestrian clear paths, and avoid crossing clearances. |
| Parcels | Parcels inside blocks, respect setbacks, have frontage, do not overlap water/roads. |
| Buildings | Fit parcels, respect height/coverage, expose frontage sides and public entrances, and do not block required access. |
| Active frontages | Retail, hospitality, and mixed-use detailed-street frontages reference valid buildings, parcels, roads, sidewalks, public entrances, and facade render bindings. |
| Zoning | Building use, height, density, frontage, and buffers match district rules. |
| Utilities | Hydrants, drains, lights, power, water, waste, and service access coverage. |
| Assets | Valid catalog IDs, category, format, scale, tags, LOD variants, asset URLs, render binding object kind, semantic tag, material zone, fallback material/geometry, and asset ID references. |
| Import/export | Supported exchange format, local x/z meter frame, deterministic seed/config provenance, object count consistency, and no renderer-only transient state. |
| LOD | Terrain, networks, buildings, facades, props, agents, utilities, overlays, and assets have object-kind LOD policy coverage and supported tiers. |
| Metadata | Generated and runtime objects carry source metadata, stable source IDs, confidence, review status, and license/attribution where required. |
| Simulation | Vehicles and agents have lanes, route nodes, spawn/destination endpoints, schedules or stop behavior, and incident hooks. |
| Performance | Chunk counts, draw calls, triangles, texture memory, and active agents under budget. |

## Current Executable Checks

`validateGeneratedCity` currently verifies:

- `validateAppConfig` runs before generation and rejects invalid city/render config, including seed format, quality presets, density controls, district settings, dimensions, colors, clipping planes, fog density, pixel ratio, and shadow flags.
- Duplicate IDs across indexed city objects.
- Representative generated and runtime validation issues now include affected points, affected boundaries where polygon context is known, and suggested fixes so debug overlays can focus the issue instead of only highlighting the parent object.
- Object-kind registry coverage, stable ID patterns, required/forbidden parent IDs, and allowed parent-kind relationships.
- Source metadata coverage for generated objects, procedural/simulated generation steps, review status, confidence, and asset license/attribution warnings.
- LOD policy coverage for every registered object kind, required `lod0` through `lod4` tiers, decreasing tier distances, and object assignments that stay inside each kind policy.
- Geospatial frame metadata, local x/z meter units, origin metadata, coordinate precision/tolerance fields, local coordinate bounds, height datum range, and future import projection metadata.
- Coordinate-bearing generated objects use finite x/z meter values inside the local frame tolerance.
- Point3D and height-bearing objects stay inside the configured local ground-plane height datum tolerance.
- District boundaries, primary uses, use mix totals, height ranges, density gradients, landmark targets, transition buffers, style hints, and allowed street profiles.
- Adjacent block district transitions have reciprocal district transition buffer rules and validation focus data when they fail.
- Constraint layer objects validate boundary geometry, affected/prohibited object kinds, required and related object references, positive setback/clearance/height metrics, no-build parcel/building conflicts, road clearance requirements, and height limits when present.
- Access-control objects validate subtype/rule coverage, centerline and boundary geometry, allowed/restricted mode consistency, required service-corridor or transit-stop references for gates/checkpoints/turnstiles, object references, navigation-edge references, and back-linked navigation restrictions.
- Block geometry and district parent relationships.
- Positive road length, width, widthMeters, lane count, lane widths, sidewalk clear widths, and lane totals that fit road width.
- Lane and sidewalk parent references back to their road segment.
- Runtime traffic markings via `validateTrafficPlan`: lane-marking and traffic-vehicle registry ID patterns, LOD policy compliance, marking road/lane/crossing/intersection references, positive marking dimensions, marking asset bindings, and vehicle road/lane/route/speed/stop/incident-hook sanity.
- Asset catalog and binding rules: duplicate assets, unsupported category/format, invalid scale, missing tags/material zone, binary URL and extension mismatches, missing attribution/license, missing LOD variant assets, invalid render binding object kinds, missing semantic tags/material zones/fallbacks, missing bound asset IDs, and required renderable binding coverage.
- Import/export contract seed: supported format contracts for GeoJSON, CityJSON-style domain data, OSM-inspired features, glTF asset bindings, CSV tables, and procedural seed JSON; procedural seed exports validate schema version, format, seed, local x/z geospatial frame, object count consistency, and absence of renderer-only fields.
- Intersection center coordinates, connected road references, road count, and hierarchy mix.
- Crossing parent intersection/road/sidewalk references and sidewalk graph connectivity.
- Curb zone road/sidewalk/slice references, range validity, same-sidewalk conflicts, and loading clearance around crossings.
- Park tree parents and street tree sidewalk/road/curb references, tree pit dimensions, and furnishing-zone fit.
- Street light sidewalk/road/curb references, dimensions, color temperature, and missing power circuit warnings.
- Street furniture/sign sidewalk/road/curb references, dimensions, asset bindings, furnishing-zone fit, crossing-clearance avoidance, bus-shelter-to-bus-stop compatibility, and sign-face metadata.
- Parcel parent block, district/block references, positive dimensions, max height, bounded coverage ratio, frontage roads, and allowed uses.
- Building references to parcels, positive footprint/height/floor count, parcel fit, coverage, height, allowed uses, primary frontage fields, and public entrance IDs.
- Active frontage facade slice/building/parcel/road/sidewalk references, active-use membership, public entrance IDs, storefront metadata, slice tags, and facade asset bindings.
- Tree parent park references.

## Expansion Order

1. Geometry and identifier validation for all Phase 2 contracts.
2. Road/sidewalk/crossing/curb graph checks.
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
