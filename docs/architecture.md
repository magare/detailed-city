# Architecture

## Decision

This project uses a modular client application around Three.js and Vite. The core renderer stays small; city meaning lives in `src/city`, generation builds from that domain model, and `src/world` turns results into scene objects.

## Boundaries

```text
city/
  Owns the real-city domain model: planning intent, land, networks, buildings, public realm, utilities, operations, simulation, data contracts, and rendering handoff.

app/
  Wires dependencies and owns lifecycle.

core/
  Owns Three.js renderer, scene, camera, render loop, resize behavior.

generation/
  Pure or mostly pure procedural generation. These modules should be testable without a live WebGL renderer.

world/
  Converts generated city data into Three.js objects and groups. It should not become the place where city planning concepts are invented.

systems/
  Runtime behavior that updates every frame or responds to user/environment changes.

rendering/
  Materials, shaders, postprocessing, and render-specific composition.

assets/
  Asset manifests and import adapters. Large binary assets stay in public/assets.
```

## Rationale

Detailed city scenes grow across several dimensions: geometry generation, rendering quality, asset management, runtime simulation, and performance. Keeping those concerns separate makes it easier to improve one layer without rewriting the others.

The starter implementation is procedural first. That keeps iteration fast while leaving space to swap in glTF buildings, texture atlases, HDRI lighting, traffic AI, utilities, civic services, public-realm detail, and LOD chunks later.

The city domain structure is modeled after real urban systems: land, mobility, utilities, buildings, public realm, civic anchors, economic activity, environment, operations, and simulation. This keeps future detail from collapsing into one renderer-centric object model.

## Current Contract Artifacts

- `src/city/data-contracts/cityContracts.ts` defines shared object identity, ownership, geometry, LOD, asset, validation, street-profile, and performance-budget types.
- `src/city/blueprint/cityBlueprint.ts` owns the first executable planning intent for districts, public spaces, waterways, and public-realm planting assumptions.
- `src/city/data-contracts/validation/validateGeneratedCity.ts` is the first validation gate for generated city data.
- `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts` keeps traffic mesh creation out of procedural generation.
- `docs/decisions/ADR-001-city-contracts-first.md` records why contracts now come before additional visual expansion.

## Future Decisions

- Chunking strategy for large city streaming.
- Asset pipeline for glTF, KTX2 textures, and texture atlases.
- Navigation graph for vehicles and pedestrians.
- Postprocessing stack and quality presets.
- Complete contract migration for utilities, public-realm object variants, operations, simulation agents, and richer render bindings beyond the current district/block/road/parcel/building seed.
- Domain-to-render adapter shape for converting planned objects into meshes, instancing batches, materials, asset variants, and scene layers beyond traffic.
