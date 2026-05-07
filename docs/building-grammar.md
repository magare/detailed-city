# Building Grammar

Building generation must be driven by parcel, zoning, district, frontage, and visual style rules. A building should be a semantic object before it becomes an instanced box, facade mesh, or glTF asset.

## Required Inputs

- Parcel boundary, frontage roads, block ID, district ID.
- Allowed uses and max height from zoning/district rules.
- Street profile and frontage priority.
- Setback, max coverage ratio, buildable envelope, hazard constraints.
- Visual style family and facade/roof asset availability.

## Footprint Rules

| Component | Rule |
| --- | --- |
| Coverage | Building footprint must fit inside parcel and respect `maxCoverageRatio`. |
| Setback | Street, side, rear, waterfront, and hazard setbacks are explicit constraints. |
| Frontage | Main entrance faces the highest-priority frontage road unless civic/open-space rules override. |
| Courtyards | Larger residential/mixed-use blocks may carve courts for light and open space. |
| Podiums | Downtown and mixed-use parcels can use podiums below towers. |

## Height And Massing

- Height is capped by district/zoning max height.
- Downtown can produce tower/podium forms and landmark peaks.
- Waterfront should step down near water and preserve selected view corridors.
- Industrial buildings stay lower, wider, and service-yard oriented.
- Civic buildings can be lower but visually distinct, with plazas and axial entrances.

## Facade Rules

| Detail | Rule |
| --- | --- |
| Floor grid | Floor height and bay spacing define window rhythm. |
| Ground floor | Retail/hospitality/civic frontages receive taller transparent base modules. |
| Windows | Window density depends on use, district, and LOD tier. |
| Balconies | Residential and hospitality facades may add balconies at LOD3+. |
| Signs/awnings | Retail and hospitality frontages can bind sign and awning assets. |
| Materials | Facade material zones must map to atlas slots. |

## Roof Rules

- Mechanical roofs are more common for industrial, office, and tall buildings.
- Green roofs appear on civic, residential, and waterfront buildings where slope allows.
- Antennas and masts are limited to taller buildings.
- Solar panels should reference solar/shading potential once that layer exists.
- Rooftop equipment must not exceed height constraints unless exempted by code rules.

## Entrances And Accessibility

- Every public building needs at least one accessible entrance.
- Residential buildings need lobby/service distinction.
- Industrial and warehouse buildings need loading access.
- Civic and emergency buildings need clear public and service/emergency approaches.
- Entrances become object IDs so picking/debugging can show route and accessibility data.

## Interiors And Night Lighting

- LOD4 buildings can expose lobby/interior shells.
- Window emissive patterns should be driven by building use and time of day.
- Office, residential, hospitality, and civic buildings use different occupancy schedules.
