# Generation Rules

Generation must produce contract-valid city data first. Rendering consumes that data later through `world/` and `rendering-handoff/`.

## Pipeline

1. Validate `CityConfig` and render config, then read `CITY_BLUEPRINT`.
2. Generate land frame: bounds, districts, blocks, waterways, parks, hazards.
3. Generate mobility: roads, street profiles, sidewalks, crossings, lanes, curb uses.
4. Generate parcels and zoning-derived envelopes.
5. Generate buildings from parcel, zoning, district, and frontage rules.
6. Generate vertical slice contracts that tag the active corridor and related frontage objects.
7. Generate active frontage facades from detailed-street building, parcel, road, sidewalk, and entrance contracts.
8. Generate public realm: trees, lighting, furniture, signs, plazas, waterfront edges.
9. Generate utilities and service access skeletons.
10. Generate simulation seeds: vehicles, pedestrians, schedules, demand, events.
11. Stamp generated objects with deterministic source metadata.
12. Validate identifiers, metadata, geometry, graph continuity, zoning, assets, LOD, slice tags, and budgets.
13. Hand validated objects to mesh builders and scene-layer adapters.

## City Intent

City intent belongs in `src/city/blueprint`, not inside individual generators. The first blueprint module is `src/city/blueprint/cityBlueprint.ts`; it owns district rules, named parks, waterways, and tree species assumptions.

## Determinism

- The same seed/config/blueprint must produce the same IDs and object positions.
- Invalid config must fail before generators run, so bad dimensions, presets, density, or district settings cannot create half-valid city data.
- Randomness should shape variation inside rule bounds; it should not bypass zoning, access, or validation.
- Generated IDs should be stable, match the object-kind registry pattern, and be derived from semantic location or parent object where possible.
- Objects with a registry-required parent must set `parentId` to an object of an allowed parent kind before indexing or validation.
- Procedural and simulated metadata must derive `sourceId` from generation step plus stable object ID, not wall-clock time or renderer names.
- Generated coordinates must be finite local x/z meter values inside the configured geospatial frame bounds and tolerance.
- Height values must remain inside the configured local ground-plane datum range.
- Procedural seed exports must be derived from seed/config/domain objects only; they must not include object indexes, scene layers, picking catalogs, renderer performance snapshots, or other transient runtime state.
- Generator property tests should cover same-seed reproducibility, object ID/count stability, and contract-valid output across representative config variants.

## District Rules

District assignment should be read from blueprint rules:

| District | Intent |
| --- | --- |
| Downtown | Tall mixed-use and office core with landmark skyline. |
| Waterfront | Medium/high mixed-use edge with hospitality, parks, and promenade detail. |
| Industrial | Production/logistics quarter with lower heights, yards, and freight access. |
| Civic | Institutional district with plazas, education, healthcare, and emergency coverage. |
| Residential | Medium-density neighborhoods with trees, local retail, and schools. |

## Land And Parcel Rules

- Blocks are generated between mobility corridors and must remain inside the city bounds.
- Parcels must sit inside blocks, carry district/block references, set `parentId` to their block, and expose frontage.
- Excluded land such as water, parks, protected corridors, and hazards must be applied before buildings.
- Parcel size, coverage, setbacks, and max height come from district/zoning rules.

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
- Street furniture, lamps, signs, and hydrants must bind to placement zones rather than arbitrary coordinates.
- Detailed-street furniture and signs are generated from active curb zones, with object centers, offsets, clearance envelopes, and asset binding IDs stored in domain data.

## Building And Facade Rules

- Buildings expose a primary frontage road, frontage side, and public entrance IDs before facade detail is generated.
- Detailed-street active frontages are `facade` objects generated for retail, hospitality, and mixed-use buildings facing the slice corridor.
- Storefront glass, signs, awnings, entrance doors, and night-window metadata are generated as facade data and rendered by handoff mesh builders.

## Simulation Seeds

- Traffic vehicles are generated as data plans with road/lane references, ordered intersection route nodes, profile-derived speed, stop-zone offsets, and incident hook IDs, then rendered by `TrafficMeshBuilder`.
- Future pedestrians, transit vehicles, service crews, and emergency agents should follow the same pattern.
- Agents must reference route graph nodes, spawn points, destinations, schedules, and pooling limits.
