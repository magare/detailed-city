# Data Contracts

This project treats city data as the source of truth and Three.js meshes as a rendering result. The executable contract seed lives in `src/city/data-contracts/cityContracts.ts`.

## Contract Goals

- Every city object has a stable `id`, `kind`, `ownerDomain`, `lod`, and optional `parentId`.
- Coordinates use meters in the local `x/z` ground plane, with `y` as height.
- Domain objects expose enough semantic data for validation, rendering handoff, picking, debugging, import/export, and simulation.
- Render-specific data is represented as asset bindings or material zones, not embedded directly in domain objects.

## Common Object Fields

| Field | Rule |
| --- | --- |
| `id` | Stable across identical seed/config runs. IDs should not encode transient render state. |
| `kind` | One of the known city object kinds, such as `parcel`, `road-segment`, `tree-planting`, or `building`. |
| `ownerDomain` | The planning domain responsible for truth: `land`, `mobility`, `public-realm`, `simulation`, etc. |
| `parentId` | Required when the object cannot stand alone, such as a tree inside a park or a lane inside a road. |
| `lod` | Default level of detail needed to render or simulate the object. |
| `metadata` | Source, confidence, author/license, and update timing for imported or authored data. |
| `tags` | Small semantic flags useful for filtering and asset binding. |

## Geometry Rules

- `Point2D` uses `{ x, z }` in meters.
- `Point3D` uses `{ x, y, z }` in meters.
- Polygons are simple rings in clockwise or counterclockwise order; validation must reject self-intersections and zero-area polygons.
- Road centerlines are polylines and widths are explicit, so lanes, sidewalks, curbs, and render ribbons can be derived consistently.
- Heights are meters above the local ground datum unless a future terrain/elevation contract overrides them.

## Required Domain Contracts

| Object | Minimum data |
| --- | --- |
| District | Boundary, density band, primary uses, height range, allowed street profiles. |
| Block | Boundary, district reference, permeability, alley/internal access flags. |
| Parcel | Boundary, district/block references, frontage road IDs, allowed uses, max height, coverage ratio. |
| Road segment | Centerline, hierarchy, street profile, width, lane and sidewalk references. |
| Building | Parcel reference, footprint, uses, height, floor count, facade grammar, roof grammar, entrances. |
| Public realm object | Parent space/street reference, placement zone, asset binding, LOD tier, maintenance owner. |
| Utility object | Network, capacity/coverage, access point, service area, outage domain. |
| Agent/simulation object | Spawn point, destination class, route graph, schedule, pooling behavior. |

## LOD Rules

`lod0` through `lod4` are defined in `DEFAULT_CITY_LOD_POLICY`:

- `lod0`: terrain and district masses only.
- `lod1`: roads, blocks, building masses, parks, waterways.
- `lod2`: sidewalks, crossings, roof equipment, street trees, large props.
- `lod3`: facade modules, signs, lamps, benches, curbs, storefronts.
- `lod4`: entrances, interiors, readable signs, fixtures, inspectable metadata.

## Validation Gates

The first executable validator is `src/city/data-contracts/validation/validateGeneratedCity.ts`. It currently checks duplicate IDs, district/block relationships, road lane/sidewalk structure, parcel frontage and zoning fields, building parcel fit/coverage/use/height, and tree parent references. It should expand before each new city slice lands.

Required gate categories:

| Category | Examples |
| --- | --- |
| Identifier | Unique IDs, valid parent references, no duplicate object ownership. |
| Geometry | Positive dimensions, valid polygons, no parcel/road overlap, no self-intersections. |
| Graph | Road continuity, sidewalk continuity, crossing links, route graph completeness. |
| Zoning | Height, use, coverage, frontage, setback, and hazard compliance. |
| Asset | Every semantic object has a render binding or fallback. |
| LOD | Every major object has an LOD rule and distance behavior. |
| Performance | Chunk object counts and agent counts stay under budget. |
