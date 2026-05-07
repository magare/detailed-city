# Vertical Slices

The roadmap is broad, so development should use complete city slices that prove contracts, generation, rendering, validation, assets, and runtime behavior together.

## Slice 1: Basic Procedural District

Scope:

- Roads, blocks, parcels, simple buildings, parks, waterways.
- Stable IDs, geospatial frame, LOD policy, validation result.
- Object ownership metadata.
- Smoke test for visible WebGL output.

Success criteria:

| Test | Expected result |
| --- | --- |
| Road graph exists | Vehicles can be placed from road data without renderer-owned planning. |
| Parcels fit blocks | No parcel overlaps excluded park/water zones. |
| Buildings fit parcels | Building massing uses parcel size and zoning max height. |
| Scene renders | Desktop and mobile smoke tests show nonblank canvas. |
| IDs inspectable | Debug/picking can report district, block, parcel, object kind. |

## Slice 2: Detailed Street

Scope:

- One street profile expanded with sidewalks, crossings, curb zones, streetlights, trees, signs, benches, bins, parked cars, moving vehicles, storefronts.

Success criteria:

| Test | Expected result |
| --- | --- |
| Pedestrians can cross | Crosswalks connect sidewalk graph nodes. |
| Vehicles obey street profile | Speed, lanes, and stopping behavior follow profile rules. |
| Props bind to semantics | Lamps, benches, signs, and trees appear in correct zones. |
| LOD works | Far props reduce detail or disappear. |
| Night mode works | Streetlights, windows, and signs illuminate correctly. |

## Slice 3: Civic Center Or Waterfront

Scope:

- Plaza or promenade, park, civic/hospitality building, transit stop, water edge, public art, lighting, crowd/event state.

Success criteria:

| Test | Expected result |
| --- | --- |
| Public realm is usable | Paths, seating, shade, crossings, and plaza edges connect. |
| Events modify scene | Temporary stalls, barriers, closures, and crowds appear from operations data. |
| Environment affects scene | Sun, shadow, rain/fog, and heat overlays alter comfort/rendering. |
| Debug panel works | Active simulation, validation, object metadata, and asset bindings are visible. |

## Slice 4: Service And Emergency Layer

Scope:

- Fire station, hydrants, roads, blocked route, emergency vehicle, building fire marker, response-time overlay.

Success criteria:

| Test | Expected result |
| --- | --- |
| Emergency route exists | Response path uses mobility graph and avoids closures. |
| Coverage is visible | Hydrant and station service areas are inspectable. |
| Operations state changes | Incident adds temporary overlays and agent goals. |
| Validation catches gaps | Missing hydrant/service coverage appears as warnings or errors. |
