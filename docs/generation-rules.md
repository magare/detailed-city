# Generation Rules

Generation must produce contract-valid city data first. Rendering consumes that data later through `world/` and `rendering-handoff/`.

## Pipeline

1. Validate `CityConfig` and render config, then read `CITY_BLUEPRINT`.
2. Generate the city frame needed by constraints: bounds, roads, street profiles, sidewalks, crossings, waterways, and parks.
3. Generate blueprint constraints for setbacks, protected corridors, easements, clearances, no-build zones, hazards, view corridors, waterfront buffers, and emergency access corridors.
4. Generate blocks, parcels, zoning-derived envelopes, and buildings from district and frontage rules.
5. Apply prohibitive constraint filters to remove invalid parcels/buildings before downstream slices consume them.
6. Keep generated parks, waterways, roads, parcels, buildings, and constraints in the object index for validation and diagnostics.
7. Generate vertical slice contracts that tag the active corridor and related frontage objects.
8. Generate active frontage facades from detailed-street building, parcel, road, sidewalk, and entrance contracts.
9. Generate public realm: trees, lighting, furniture, signs, green stormwater features, plazas, waterfront edges.
10. Generate utilities and service access skeletons.
11. Generate simulation seeds: vehicles, pedestrians, schedules, demand, events.
12. Stamp generated objects with deterministic source metadata.
13. Validate identifiers, metadata, geometry, graph continuity, zoning, constraints, assets, LOD, slice tags, and budgets.
14. Hand validated objects to mesh builders and scene-layer adapters.

## City Intent

City intent belongs in `src/city/blueprint`, not inside individual generators. The first blueprint module is `src/city/blueprint/cityBlueprint.ts`; it owns district rules, constraint rules, use mix, density gradients, transition buffers, style hints, named parks, waterways, and tree species assumptions.

## Determinism

- The same seed/config/blueprint must produce the same IDs and object positions.
- Invalid config must fail before generators run, so bad dimensions, presets, density, or district settings cannot create half-valid city data.
- Randomness should shape variation inside rule bounds; it should not bypass zoning, access, or validation.
- Generated IDs should be stable, match the object-kind registry pattern, and be derived from semantic location or parent object where possible.
- Constraint IDs, required object IDs, and related object IDs must be stable for the same seed/config and must resolve before validation passes.
- Objects with a registry-required parent must set `parentId` to an object of an allowed parent kind before indexing or validation.
- Procedural and simulated metadata must derive `sourceId` from generation step plus stable object ID, not wall-clock time or renderer names.
- Generated coordinates must be finite local x/z meter values inside the configured geospatial frame bounds and tolerance.
- Height values must remain inside the configured local ground-plane datum range.
- Procedural seed exports must be derived from seed/config/domain objects only; they must not include object indexes, scene layers, picking catalogs, renderer performance snapshots, or other transient runtime state.
- Generator property tests should cover same-seed reproducibility, object ID/count stability, and contract-valid output across representative config variants.

## District Rules

District assignment, height ranges, use mix, density gradients, transition buffers, style hints, and allowed street profiles should be read from blueprint rules:

| District | Intent |
| --- | --- |
| Downtown | Tall mixed-use and office core with landmark skyline. |
| Waterfront | Medium/high mixed-use edge with hospitality, parks, and promenade detail. |
| Industrial | Production/logistics quarter with lower heights, yards, and freight access. |
| Civic | Institutional district with plazas, education, healthcare, and emergency coverage. |
| Residential | Medium-density neighborhoods with trees, local retail, and schools. |

Generated districts must copy their blueprint character rules into the district contract. Blocks, parcels, and buildings then consume those rules for district ownership, allowed uses, and height envelopes instead of duplicating district-specific planning logic inside generators.

## Land And Parcel Rules

- Blocks are generated between mobility corridors and must remain inside the city bounds.
- Parcels must sit inside blocks, carry district/block references, set `parentId` to their block, and expose frontage.
- Excluded land such as water, parks, protected corridors, and hazards must be applied before buildings.
- Parcel size, coverage, setbacks, and max height come from district/zoning rules.
- Soil/geology zones are generated from district, topography, hazard, and waterway context, then referenced by parcels and buildings for foundation, drainage, tunnel, and contamination queries.

## Mobility Rules

- Road hierarchy determines street profile, width, lane count, sidewalk width, tree zone, speed, and transit eligibility.
- Intersections should become first-class objects before route simulation expands.
- Sidewalk and crossing graphs should be generated alongside roads, not inferred from mesh positions.
- Crossings should attach to parent intersections and road sidewalks, with sidewalk graph edges proving pedestrian connectivity.
- Curb uses should be explicit: parking, loading, ride-hail, bus stop, emergency, or no-stopping.
- The detailed street slice must be selected from generated mobility data and referenced by stable object IDs, not renderer names.
- Lane markings are runtime mobility objects. Baseline lane dashes are citywide; detailed zebra crossings, stop bars, turn arrows, tactile paving, and refuge islands are generated from active detailed-street road/crossing contracts.

## Public Realm Rules

- Parks and plazas are public-realm objects with boundaries and program zones.
- Trees are generated as `tree-planting` objects with parent park/street references before rendering.
- Street furniture, lamps, signs, hydrants, and green stormwater features must bind to placement zones and generated utility/road references rather than arbitrary coordinates.
- Detailed-street and citywide furniture/signs are generated from active curb zones or road-profile furnishing zones, with object centers, offsets, clearance envelopes, asset binding IDs, readable LOD, and route/district/frontage sign bindings stored in domain data.

## Building And Facade Rules

- Buildings expose a primary frontage road, frontage side, and public entrance IDs before facade detail is generated.
- Detailed-street active frontages are `facade` objects generated for retail, hospitality, and mixed-use buildings facing the slice corridor.
- Storefront glass, signs, awnings, entrance doors, and night-window metadata are generated as facade data and rendered by handoff mesh builders.

## Simulation Seeds

- Traffic vehicles are generated as data plans with road/lane references, ordered intersection route nodes, profile-derived speed, stop-zone offsets, and incident hook IDs, then rendered by `TrafficMeshBuilder`.
- Future pedestrians, transit vehicles, service crews, and emergency agents should follow the same pattern.
- Agents must reference route graph nodes, spawn points, destinations, schedules, and pooling limits.
