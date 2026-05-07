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
- Bind assets through semantic city data and rendering-handoff rules; do not scatter raw asset paths in scene builders.

See `docs/asset-catalog.md` for the detailed catalog specification.
