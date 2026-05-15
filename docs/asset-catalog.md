# Asset Catalog

The asset catalog makes visual detail enforceable. Binary files live under `public/assets`; typed metadata and binding rules live under `src/assets` or `src/city/rendering-handoff`.

## Asset Definition

The TypeScript seed is `AssetDefinition` in `src/city/data-contracts/cityContracts.ts`.

| Field | Rule |
| --- | --- |
| `id` | Stable semantic asset ID, such as `asset:street-light:modern-single`. |
| `category` | Building, road, street prop, nature, vehicle, transit, utility, effect, texture, or icon. |
| `url` | Public Vite path under `public/assets` for binary assets; omitted for procedural primitive fallbacks. |
| `format` | `glb`, `gltf`, `png`, `jpg`, `webp`, `ktx2`, `hdr`, `exr`, or `procedural`. |
| `scaleMeters` | Real-world reference scale. |
| `lodVariants` | Optional high/medium/low/impostor asset IDs. |
| `tags` | Semantic filters such as `district=waterfront` or `weather=rain`; executable assets should include `materialZone`, and procedural fallbacks should set `fallback=true`. |
| `attribution` | Required for third-party assets. |
| `license` | Required for third-party assets. |
| `metadata` | Required source metadata with source type, source ID, confidence, review status, license, and generation/import provenance. |

## Categories

| Category | Examples |
| --- | --- |
| Roads | Asphalt, curbs, medians, crosswalks, tactile paving, lane markings. |
| Buildings | Facade atlases, storefronts, balconies, rooftop units, doors, window modules. |
| Street props | Lamps, benches, bins, bollards, bus shelters, bike racks, signs, hydrants. |
| Nature | Tree species, shrubs, grass patches, planters, seasonal variants. |
| Vehicles | Cars, buses, trucks, bikes, emergency vehicles, service vehicles. |
| Transit | Platforms, shelters, ticket machines, route signs, station canopies. |
| Utilities | Cabinets, poles, transformers, manholes, drains, meters, vault covers. |
| Civic/economic | Kiosks, market stalls, monuments, outdoor dining, construction barriers. |
| Effects | Rain, puddles, fog cards, steam, water normals, emissive sign maps. |

## Binding Rules

Asset selection should be driven by domain semantics:

- `id` gives each binding a stable diagnostic and validation target.
- `objectKind` selects the broad binding family.
- `semanticTag` narrows selection, such as `street-profile=main-street`.
- `materialZone` maps surfaces to atlases: asphalt, concrete, glass, brick, metal, water, sign, foliage.
- `fallbackMaterial` and `fallbackGeometry` must exist for every major object kind.
- Green stormwater render bindings use the procedural `green-stormwater` asset and registered material zones so rain gardens, bioswales, pervious strips, permeable paving, curb cuts, and tree trenches remain visible without external assets.
- Curb activation render bindings use a procedural street-prop platform asset, registered public-realm material zones, and railing/wood fallback materials so parklets, outdoor dining, temporary seating decks, interim plazas, and protection barriers are visible before external furniture kits land.
- Public amenity render bindings use procedural street-prop fallbacks for public toilets, drinking fountains, shade structures, misting/cooling points, charging points, clocks, information kiosks, and repair stands so comfort fixtures remain visible and inspectable before external amenity kits land.
- Healthcare anchor render bindings use a procedural civic-building marker, registered healthcare material zone, and building fallback material so hospital, clinic, pharmacy, urgent-care, and ambulance-bay anchors remain inspectable before dedicated healthcare facility assets land.
- Emergency service anchor render bindings use a procedural civic-building marker, registered emergency-service material zone, and building fallback material so fire, police, ambulance, shelter, command, and staging anchors remain inspectable before dedicated emergency facility assets land.
- Water transport access render bindings use a procedural transit marker asset, registered transit material zone, and explicit platform/marker fallbacks so ferry stops, docks, port edges, and helipads remain visible before dedicated marine or aviation assets land.
- Utility asset inventory bindings use procedural utility-node and utility-edge fallbacks so inventory records can resolve render assets before dedicated utility models exist.
- Procedural fallback assets are valid catalog entries when no binary asset exists yet.

The validator checks catalog IDs, category, format, meter scale, tags, binary URL presence and extension, top-level attribution/license, LOD variant references, registered object-kind binding targets, semantic tags, material zones, asset IDs, fallback material, and fallback geometry. Missing required fallback coverage is reported as a warning; malformed asset definitions or invalid binding object kinds are errors.

The executable seed currently includes procedural street-prop fallbacks for street lights, benches, bins, bike racks, bollards, bus shelters, kiosks, regulatory signs, street-name signs, wayfinding signs, plaza zones, waterfront edges, waterfront open spaces, curb activation platforms, public amenity fixtures, and water transport access markers. Road-marking fallbacks cover lane dashes, zebra crossings, stop bars, turn arrows, tactile paving, and refuge islands. Facade fallbacks cover storefront windows, awnings, signs, entrance doors, and night windows. Civic-building fallbacks cover civic, government, community, culture, healthcare, and emergency-service anchors. Utility inventory fallbacks cover utility nodes and utility edges that are inspectable as operations assets. These fallback assets carry internal procedural license, attribution, and source metadata. Those bindings let validators and diagnostics prove that generated public-realm, mobility, active-frontage, civic, and utility inventory objects have a render path before binary assets exist.

## Naming

Use this pattern:

```text
asset:<category>:<subtype>:<variant>
```

Examples:

- `asset:nature:tree:rain-tree-lod2`
- `asset:street-prop:lamp:warm-single`
- `asset:building:facade:retail-brick-atlas`
- `asset:road:crosswalk:zebra-standard`

## Acceptance Criteria

- No raw asset paths inside scene code.
- Every third-party asset has attribution and license metadata.
- Every asset has a meter scale and at least one semantic tag.
- LOD variants reference existing asset IDs.
- Every render binding targets a registered city object kind and declares semantic tag, material zone, fallback material, and fallback geometry.
- Large repeated surfaces use atlases before one-off textures.
- Missing assets render with explicit fallback materials, not invisible objects.
