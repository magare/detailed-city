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
- Bind assets through semantic city data and rendering-handoff rules; do not scatter raw asset paths in scene builders.
- glTF/GLB asset-binding exports use the same asset catalog and render binding contracts, so exported asset manifests remain separate from Three.js runtime objects.

See `docs/asset-catalog.md` for the detailed catalog specification.
