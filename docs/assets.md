# Asset Plan

## Static Asset Folders

```text
public/assets/
  models/      glTF and GLB files.
  textures/    PNG, JPEG, WebP, KTX2 texture files.
  hdr/         HDR and EXR environment maps.
  icons/       UI icons and map markers.
```

## Source Asset Modules

```text
src/assets/
  models/      Typed model registry.
  textures/    Texture registry and material mapping.
  hdr/         Environment registry.
  icons/       UI icon registry if the project adds tools later.
```

## Conventions

- Keep binary assets under `public/assets` so Vite can serve them directly.
- Keep typed metadata under `src/assets` so rendering code does not depend on string paths scattered through the scene.
- Prefer texture atlases for repeated city details such as windows, signs, sidewalks, asphalt, and facade panels.
- Add source attribution in this document when using third-party assets.
- Define every asset with category, URL, format, meter scale, tags, LOD variants, attribution, license, and fallback behavior.
- Procedural primitive fallbacks may omit a URL, but must still be represented as typed catalog entries with scale, tags, license, attribution, source metadata, and render bindings.
- Active frontage storefront fallbacks include glass, awning, sign, entrance-door, and night-window primitives until facade atlases or building models land.
- Render bindings must target registered object kinds and carry semantic tags, material zones, fallback material, fallback geometry, and existing asset IDs when bound to an asset.
- Public-realm green stormwater objects use procedural fallback geometry and the `green-stormwater` material family until external landscape assets are introduced.
- Public-realm curb activations use procedural platform/barrier fallbacks and existing plaza, park seating, bench, awning, railing, and wood material zones until external parklet and outdoor dining kits are introduced.
- Public amenities use procedural comfort-fixture fallbacks and existing street-furniture, water, park-shade, kiosk, and bike-rack material zones until external public toilet, fountain, shade, cooling, charging, kiosk, clock, and repair-stand kits are introduced.
- Healthcare anchors use procedural civic-building marker fallbacks and a registered healthcare material zone until dedicated hospital, clinic, pharmacy, urgent-care, and ambulance-bay assets are introduced.
- Education anchors use procedural civic-building marker fallbacks and a registered education-anchor material zone until dedicated school, library, university, childcare, and learning-campus assets are introduced.
- Emergency service anchors use procedural civic-building marker fallbacks and a registered emergency-service material zone until dedicated fire, police, ambulance, shelter, command, and staging assets are introduced.
- Water transport access uses procedural transit marker/platform fallbacks until dedicated ferry pier, dock, port-edge, and helipad assets are introduced.
- Operations asset inventory can bind utility nodes and utility edges to procedural utility fallback assets while richer network equipment models are pending.
- Bind assets through semantic city data and rendering-handoff rules; do not scatter raw asset paths in scene builders.
- glTF/GLB asset-binding exports use the same asset catalog and render binding contracts, so exported asset manifests remain separate from Three.js runtime objects.

See `docs/asset-catalog.md` for the detailed catalog specification.
