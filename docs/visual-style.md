# Visual Style

The target is a detailed contemporary river/coastal city: realistic enough for planning semantics to matter, but stylized enough to stay performant in Three.js.

## Identity

- Dense downtown core with glass, stone, concrete, and warm night windows.
- Mixed-use waterfront with public promenade, parks, hospitality, retail, and water-reflective materials.
- Civic district with plazas, institutional buildings, clear axes, and calmer materials.
- Residential neighborhoods with mid-rise massing, trees, local retail, and softer lighting.
- Industrial/logistics edge with lower buildings, service yards, freight access, and muted materials.

## Material Language

| System | Direction |
| --- | --- |
| Roads | Dark asphalt, visible lane paint, concrete curbs, crosswalk/tactile paving at LOD3+. |
| Buildings | Neutral glass/concrete/brick/plaster mix; district-specific material weights. |
| Waterfront | Water normals, promenades, railings, seating, kiosks, planted edges. |
| Public realm | Clear distinction between lawns, hardscape, tree pits, furniture, signs, lighting. |
| Utilities | Subtle but visible cabinets, hydrants, drains, manholes, poles, transformers. |
| Effects | Rain/fog/night effects should support city readability, not hide detail. |

## Lighting

- Day mode: readable planning geometry, soft shadows, clear district silhouettes.
- Dusk/night: warm windows, streetlights, signs, transit stops, emergency lighting.
- Public lighting: warm, shielded, contemporary fixtures; brighter on transit, arterial, and promenade routes, softer on local streets, with decorative fixtures used sparingly for identity.
- Signage and wayfinding: readable detail appears only at close LOD, with street-name blades, restrained regulatory plates, blue/green wayfinding panels, and storefront directories acting as identity markers rather than oversized labels.
- Weather modes: rain, fog, and monsoon states should change surfaces, visibility, and agent behavior.

## Density And Detail

- Downtown: highest height variation and facade density.
- Main streets: active storefront windows, signs, awnings, crosswalks, street trees, benches, bins, lamps, and warm night-window detail.
- Local streets: calmer prop density, parked cars, residential entrances.
- Waterfront: strong human-scale detail, seating, lights, railings, open-space activity.
- Industrial: freight/loading detail, fewer decorative props, service infrastructure.

## Asset Selection Rules

- Asset choices must follow domain tags, district, LOD, and street profile.
- Avoid mixing unrelated architectural eras without an explicit district rule.
- Use fallback primitives only as deliberate LOD or missing-asset fallbacks.
- Materials should be varied across systems; avoid a one-color city.
