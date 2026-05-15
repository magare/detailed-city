# Data Contracts

This project treats city data as the source of truth and Three.js meshes as a rendering result. The executable contract seed lives in `src/city/data-contracts/cityContracts.ts`, and stable object-kind registry rules live in `src/city/data-contracts/cityObjectRegistry.ts`.

## Contract Goals

- Every city object has a stable `id`, `kind`, `ownerDomain`, `lod`, and optional `parentId`.
- Coordinates use meters in the local `x/z` ground plane, with `y` as local height above the configured datum.
- Domain objects expose enough semantic data for validation, rendering handoff, picking, debugging, import/export, and simulation.
- Render-specific data is represented as asset bindings or material zones, not embedded directly in domain objects.

## Config Contracts

`src/config/configSchema.ts` validates the active city and render config before generation. It checks the seed, quality preset, grid/block/road/water dimensions, city/traffic/prop/tree density controls, building height/setback ranges, per-district density/height/lot-split settings, render colors, camera clipping, fog, pixel ratio, shadows, and quality preset consistency.

The active config diagnostics expose schema version, validation status, available quality presets, city density settings, district settings, and render quality fields so debug tooling can list the config that produced the current city.

## Common Object Fields

| Field | Rule |
| --- | --- |
| `id` | Stable across identical seed/config runs and matched against the registry pattern for the object kind. IDs should not encode transient render state. |
| `kind` | One of the known city object kinds, such as `parcel`, `road-segment`, `tree-planting`, or `building`. |
| `ownerDomain` | The planning domain responsible for truth: `land`, `mobility`, `public-realm`, `simulation`, etc. |
| `parentId` | Required or forbidden according to the object-kind registry. Parent kind must match the allowed registry rule. |
| `lod` | Default level of detail needed to render or simulate the object. |
| `metadata` | Source type, stable source ID, confidence, author/license, attribution, review status, generation step, and source schema version. |
| `tags` | Small semantic flags useful for filtering and asset binding. |

## Validation Issue Focus

`ValidationIssue` may carry `affectedPoint`, `affectedBoundary`, and `suggestedFix` when a validator can infer where the issue should be inspected and what remediation is likely. Debug overlays prefer this issue-level focus data over broad object geometry, while still falling back to object geometry when a precise point or boundary is unavailable.

## Object Index

Generated city data carries a typed object index built from domain objects, road children, render asset definitions, and runtime diagnostic objects such as lane markings and vehicles. The index stores deterministic object order, ID lookup, duplicate IDs, parent-to-child relationships, and counts by object kind so validators, debug tools, picking, and rendering adapters can resolve IDs without scraping Three.js scene names.

## Object Registry

`cityObjectRegistry.ts` defines the current registry for every `CityObjectKind`. Each entry records:

- Stable ID patterns for the kind.
- Whether `parentId` is forbidden, optional, or required.
- Allowed parent object kinds when a parent is present.
- Query helpers for resolving objects and children by kind from a `CityObjectIndex`.

The validator now enforces registry ID patterns and parent-kind rules for generated city objects and runtime traffic objects. Parcels participate in parent-child lookup through `parentId: blockId`, while buildings remain parented to parcels and road children remain parented to roads.

## Source Metadata

`SourceMetadata` covers `procedural`, `authored`, `imported`, and `simulated` objects. Generated city objects are stamped at the generation boundary with deterministic source IDs derived from their generation step and object ID. Runtime lane markings use procedural metadata, while traffic vehicles use simulated metadata. Asset definitions also carry top-level license/attribution fields plus source metadata so future binary or third-party assets can be reviewed without renderer-only assumptions.

## Import And Export Contracts

`src/city/data-contracts/import-export` defines the exchange contract seed. The supported shapes are local-meter GeoJSON feature collections, CityJSON-style domain objects, OSM-inspired node/way/relation features, glTF/GLB asset binding manifests, CSV tables, and procedural seed JSON.

The first executable export is `procedural-seed-json`. It carries the active seed/config, geospatial frame, bounds, LOD policy, performance budget, generated domain sections, asset catalog, render bindings, stable object IDs/counts, validation result, and deterministic provenance. Operations asset inventory records, maintenance operations, permit/inspection records, and public-realm curb activations are exported as domain data so ownership, lifecycle, condition, source, replacement-cost audits, repair queues, temporary closures, approvals, inspections, compliance status, seasonal curb use, barriers, seating, and clearances do not require renderer-only state. The export intentionally excludes renderer-only and runtime inspection fields such as `objectIndex`, scene layers, overlays, picking catalogs, runtime performance, quality flags, and traffic validation snapshots.

Address points expose formatted addresses, ward/neighborhood/district membership, named-place links, and OSM-style `addr:*` import tags. Named places and gazetteer entries are exported with the procedural seed so address search, reverse lookup, and future imported address tags resolve against the same stable contracts.

Access-control objects expose barriers, gates, fences, guardrails, bollard lines, turnstiles, walls, and checkpoints as land-owned procedural data. The procedural seed exports their geometry, access rules, restricted/allowed modes, public/private/emergency flags, service-corridor or transit-stop references, and navigation-edge back references so routing, validation, overlays, picking, and rendering consume the same source contract.

Diagnostics expose import/export readiness as a summary: supported format count, procedural export object count, asset/binding counts, JSON serializability, validation status, and any renderer-only fields detected in the generated artifact.

## Vertical Slice Contracts

The first detailed street slice is a generated `vertical-slice` object. It records the deterministic corridor road, sidewalks, intersections, crossings, sidewalk graph elements, frontage parcels/buildings, and a visual QA camera target so later detailed-street cards can filter by `detailedStreetSliceId` instead of rediscovering the corridor.

## Geometry Rules

- `Point2D` uses `{ x, z }` in meters.
- `Point3D` uses `{ x, y, z }` in meters.
- `GeospatialFrame` declares local axis mapping, origin metadata, coordinate precision, local x/z bounds, height datum, and future import-projection metadata.
- Current generated coordinates must stay inside the local frame bounds of `-700..700m` on x/z, with `0.01m` horizontal tolerance.
- Heights must stay inside the local ground-plane datum range of `-5..180m`, with `0.01m` vertical tolerance.
- Future imported data must be projected into local x/z meters before it can become generated city data.
- Polygons are simple rings in clockwise or counterclockwise order; validation must reject self-intersections and zero-area polygons.
- Road centerlines are polylines and widths are explicit, so lanes, sidewalks, curbs, and render ribbons can be derived consistently.
- Heights are meters above the local ground datum unless a future terrain/elevation contract overrides them.

## Required Domain Contracts

| Object | Minimum data |
| --- | --- |
| District | Boundary, density band, primary uses, use mix, height range, density gradient, landmark targets, transition buffers, style hints, allowed street profiles. |
| Constraint | Constraint kind, priority, boundary, affected/prohibited object kinds, required/related object IDs, and optional setback, clearance, or height limits. |
| Block | Boundary, district reference, permeability, alley/internal access flags. |
| Parcel | Boundary, district/block references, frontage road IDs, allowed uses, max height, coverage ratio. |
| Soil/geology zone | Boundary, district/topography/hazard references, foundation suitability, bearing capacity, settlement risk, tunnel difficulty, drainage assumptions, groundwater, contamination hints, and ground-risk metadata. |
| Road segment | Centerline, hierarchy, street profile, width, lane and sidewalk references. |
| Lane marking | Road/crossing/intersection references, marking subtype, center, orientation, size, surface material, and render binding. |
| Intersection | Center point, connected road IDs, hierarchy mix, and signal/control expectation. |
| Crossing | Parent intersection, crossed road ID, connected sidewalk IDs, dimensions, and signal state. |
| Curb zone | Parent sidewalk, road reference, curb use, side, start/end meters, crossing clearance, and slice tag. |
| Curb activation | Parent curb zone, road/sidewalk references, activation kind, permit/inspection reference, seasonal window, removable deadline, clearances, protection barriers, seating capacity, boundary, LOD tier, and asset binding. |
| Sidewalk graph | Nodes at sidewalk/intersection points and edges for sidewalk travel or crossings. |
| Vertical slice | Slice kind, corridor road, related object IDs, QA camera target, and slice tags on referenced objects. |
| Building | Parcel reference, footprint, uses, height, floor count, facade grammar, roof grammar, primary frontage side/road, and public entrance IDs. |
| Active frontage facade | Detailed-street slice/building/parcel/road/sidewalk references, frontage side, active uses, storefront window/sign/awning/night-window metadata, public entrance IDs, and facade asset bindings. |
| Address point | Building/parcel/road references, street name, building number, unit range, postal code, formatted address, ward/neighborhood/district membership, named-place links, entrance IDs, and import tags. |
| Named place / gazetteer entry | Source object reference, normalized display/search text, address/place links, reverse lookup radius, and import/export metadata for addresses, streets, neighborhoods, wards, parks, and civic anchors. |
| Access control | Control subtype, rule kind, centerline/boundary geometry, dimensions, allowed/restricted modes, public/private/emergency flags, related hazards/constraints/service corridors, and affected navigation edges. |
| Public realm object | Parent space/street reference, placement zone, asset binding, LOD tier, maintenance owner. |
| Street tree | Parent sidewalk, road/slice/curb references, tree pit dimensions, canopy size, and furnishing-zone offset. |
| Street light | Placement context, parent sidewalk, road/slice/curb references where applicable, position, along-road placement, fixture type, purpose, height, coverage radius, night-safety illuminance, glare control, decorative lighting, and power circuit reference. |
| Street furniture/sign | Parent sidewalk, road/slice/curb references, furniture subtype, furnishing-zone placement, clearance envelope, asset binding, and sign-face metadata where applicable, including readable LOD, panel kind, route, district, frontage, and destination bindings. |
| Green stormwater feature | Parent road, sidewalk clear-path reference, stormwater utility nodes/runoff edges, optional tree-trench links, feature kind, treatment/storage capacity, runoff capture, maintenance owner, surface, boundary, and asset binding. |
| Utility object | Network, capacity/coverage, access point, service area, outage domain, and typed service metadata such as power, water, wastewater, stormwater, telecom, gas, or district energy. |
| Asset inventory record | Operations-owned target object reference, owner, responsible department, render binding/asset lookup, lifecycle stage, warranty, replacement cost, condition score/rating, status, criticality, source, and inspection access references. |
| Maintenance operation | Operations-owned asset-inventory child with operation kind, status, priority, schedule window, repair queue metadata, condition update, replacement estimate, operation route, service access targets, and temporary closure road/navigation-edge restrictions when applicable. |
| Permit/inspection record | Operations-owned cadastre or maintenance child with record kind, status, applicant, responsible department, parcel/cadastre or maintenance source, related objects, closure roads/restrictions, submission and validity window, approval metadata, inspection metadata, and compliance status. |
| Traffic vehicle | Parent road, lane ID, ordered route node IDs, spawn/destination nodes, profile speed, route offset, stop-zone behavior, and incident hook IDs. |
| Agent/simulation object | Spawn point, destination class, route graph, schedule, pooling behavior. |

## LOD Rules

`lod0` through `lod4` are defined in `DEFAULT_CITY_LOD_POLICY`:

- `lod0`: terrain and district masses only.
- `lod1`: roads, blocks, building masses, parks, waterways.
- `lod2`: sidewalks, crossings, roof equipment, street trees, large props.
- `lod3`: facade modules, signs, lamps, benches, curbs, storefronts.
- `lod4`: entrances, interiors, readable signs, fixtures, inspectable metadata.

The LOD policy also maps every registered `CityObjectKind` to allowed tiers and a default tier. This keeps terrain, roads, buildings, facades, public-realm props, traffic agents, utilities, operations, overlays, and assets covered before render-specific distance switching is added.

## Validation Gates

The first executable city validator is `src/city/data-contracts/validation/validateGeneratedCity.ts`. It currently checks duplicate IDs, object-kind registry ID patterns, required/forbidden parent rules, parent-kind compatibility, source metadata completeness, LOD tier policy coverage, asset catalog and render binding integrity, geospatial frame metadata, finite local x/z coordinates, local coordinate bounds/tolerances, height datum bounds, district character rules and transition buffers, constraint boundaries/references/conflicts/setbacks/clearances, hazard-zone boundaries/references/mitigation/prohibited-object conflicts, access-control geometry/rule/mode/reference integrity, operations asset inventory coverage for renderable civic/public-realm/utility assets, maintenance operation coverage for watched assets, schedules, repair queues, condition updates, replacement estimates, service access, temporary closure route references, permit/inspection source references, approval state, inspection state, compliance consistency, and closure permits, curb activation permits, parent curb zones, safe curb uses, seasonal windows, barriers, clearances, and bindings, district/block relationships, utility service networks including power, water, wastewater, stormwater, telecom, gas, and district energy, road lane/sidewalk structure, curb and crossing relationships, public-realm furnishing-zone placement, public lighting coverage/night-safety/glare integrity, green stormwater road/sidewalk/utility/runoff/tree references, parcel frontage and zoning fields, building parcel fit/coverage/use/height/public entrances, active frontage facade references and storefront metadata, and tree parent references. Runtime traffic and marking output is checked by `src/city/data-contracts/validation/validateTrafficPlan.ts`, including lane-marking and traffic-vehicle registry IDs plus road/lane/route/speed/stop/source metadata and LOD policy compliance. Validators should expand before each new city slice lands.

Required gate categories:

| Category | Examples |
| --- | --- |
| Identifier | Unique IDs, valid parent references, no duplicate object ownership. |
| Config | Seed, city/render quality preset, density controls, district settings, dimensions, render colors, clipping, fog, pixel ratio, and shadow flags. |
| Geometry | Positive dimensions, valid polygons, no parcel/road overlap, no self-intersections. |
| Graph | Road continuity, sidewalk continuity, crossing links, route graph completeness. |
| Zoning | Height, use, coverage, frontage, setback, and hazard compliance. |
| Asset | Every semantic object has a valid catalog entry, asset binding, material zone, semantic tag, fallback, and asset reference. |
| Import/export | Exchange artifacts declare a supported format, use local x/z meters, preserve deterministic counts, and exclude renderer-only transient state. |
| LOD | Every object kind has allowed/default tiers and every object uses a tier supported by that policy. |
| Metadata | Source type, source ID, confidence, generation step, review status, license, and attribution where required. |
| Performance | Chunk object counts and agent counts stay under budget. |
