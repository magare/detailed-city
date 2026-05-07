# Asset Catalog

The asset catalog makes visual detail enforceable. Binary files live under `public/assets`; typed metadata and binding rules live under `src/assets` or `src/city/rendering-handoff`.

## Asset Definition

The TypeScript seed is `AssetDefinition` in `src/city/data-contracts/cityContracts.ts`.

| Field | Rule |
| --- | --- |
| `id` | Stable semantic asset ID, such as `asset:street-light:modern-single`. |
| `category` | Building, road, street prop, nature, vehicle, transit, utility, effect, texture, or icon. |
| `url` | Public Vite path under `public/assets`. |
| `format` | `glb`, `gltf`, `png`, `jpg`, `webp`, `ktx2`, `hdr`, or `exr`. |
| `scaleMeters` | Real-world reference scale. |
| `lodVariants` | Optional high/medium/low/impostor asset IDs. |
| `tags` | Semantic filters such as `district=waterfront` or `weather=rain`. |
| `attribution` | Required for third-party assets. |
| `license` | Required for third-party assets. |

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

- `objectKind` selects the broad binding family.
- `semanticTag` narrows selection, such as `street-profile=main-street`.
- `materialZone` maps surfaces to atlases: asphalt, concrete, glass, brick, metal, water, sign, foliage.
- `fallbackMaterial` and `fallbackGeometry` must exist for every major object kind.

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
- Large repeated surfaces use atlases before one-off textures.
- Missing assets render with explicit fallback materials, not invisible objects.
