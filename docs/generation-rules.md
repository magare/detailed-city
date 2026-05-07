# Generation Rules

Generation must produce contract-valid city data first. Rendering consumes that data later through `world/` and `rendering-handoff/`.

## Pipeline

1. Read `CityConfig` and `CITY_BLUEPRINT`.
2. Generate land frame: bounds, districts, blocks, waterways, parks, hazards.
3. Generate mobility: roads, street profiles, sidewalks, crossings, lanes, curb uses.
4. Generate parcels and zoning-derived envelopes.
5. Generate buildings from parcel, zoning, district, and frontage rules.
6. Generate public realm: trees, lighting, furniture, signs, plazas, waterfront edges.
7. Generate utilities and service access skeletons.
8. Generate simulation seeds: vehicles, pedestrians, schedules, demand, events.
9. Validate identifiers, geometry, graph continuity, zoning, assets, LOD, and budgets.
10. Hand validated objects to mesh builders and scene-layer adapters.

## City Intent

City intent belongs in `src/city/blueprint`, not inside individual generators. The first blueprint module is `src/city/blueprint/cityBlueprint.ts`; it owns district rules, named parks, waterways, and tree species assumptions.

## Determinism

- The same seed/config/blueprint must produce the same IDs and object positions.
- Randomness should shape variation inside rule bounds; it should not bypass zoning, access, or validation.
- Generated IDs should be stable and derived from semantic location or parent object where possible.

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
- Parcels must sit inside blocks, carry district/block references, and expose frontage.
- Excluded land such as water, parks, protected corridors, and hazards must be applied before buildings.
- Parcel size, coverage, setbacks, and max height come from district/zoning rules.

## Mobility Rules

- Road hierarchy determines street profile, width, lane count, sidewalk width, tree zone, speed, and transit eligibility.
- Intersections should become first-class objects before route simulation expands.
- Sidewalk and crossing graphs should be generated alongside roads, not inferred from mesh positions.
- Curb uses should be explicit: parking, loading, ride-hail, bus stop, emergency, or no-stopping.

## Public Realm Rules

- Parks and plazas are public-realm objects with boundaries and program zones.
- Trees are generated as `tree-planting` objects with parent park/street references before rendering.
- Street furniture, lamps, signs, and hydrants must bind to placement zones rather than arbitrary coordinates.

## Simulation Seeds

- Traffic vehicles are currently generated as data plans, then rendered by `TrafficMeshBuilder`.
- Future pedestrians, transit vehicles, service crews, and emergency agents should follow the same pattern.
- Agents must reference route graph nodes, spawn points, destinations, schedules, and pooling limits.
