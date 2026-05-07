# ADR-001: Make City Contracts Executable Before Adding More Detail

## Status

Accepted

## Date

2026-05-07

## Context

The project already has strong city-domain coverage and a clear module boundary: `city/` owns planning meaning, `generation/` creates procedural data, `world/` assembles Three.js scene objects, and `rendering-handoff/` converts domain data to meshes/materials/assets.

The gap is that many planning folders were descriptive READMEs only. Generators could still invent district, park, tree, and traffic details directly, and some generation code returned Three.js objects. That would make a detailed city hard to validate, debug, import/export, or scale.

## Decision

Make Phase 2 City Contracts concrete before expanding visual features.

This means:

- Add executable TypeScript contracts for object IDs, ownership, geometry, LOD, asset bindings, validation, street profiles, and performance budgets.
- Move city intent into blueprint modules instead of hardcoding it inside generators.
- Generate semantic public-realm and traffic data before rendering it.
- Keep Three.js mesh construction in world/rendering-handoff paths.
- Add planning specs for data contracts, generation, assets, streets, buildings, validation, performance, visual style, debug tools, and vertical slices.

## Alternatives Considered

### Continue with descriptive roadmap only

- Pros: Faster short-term visual iteration.
- Cons: Detail would grow without stable contracts, causing duplicated concepts and renderer-first planning.
- Rejected: The project goal is a detailed city, so uncontrolled detail creates long-term risk.

### Build rich visual features first

- Pros: More immediate visible progress.
- Cons: Roads, trees, traffic, buildings, and assets would likely need rework once IDs, LOD, validation, and asset binding arrive.
- Rejected: The roadmap already identifies contracts as Phase 2.

### Fully migrate every runtime type now

- Pros: Strongest consistency.
- Cons: Too large for this step and likely to stall the current working scene.
- Rejected for now: Start with active contract fields and validation, then migrate deeper objects slice by slice.

## Consequences

- Future visual work has a clearer target contract.
- Validators and debug panels can inspect semantic city data.
- Generators remain more testable because rendering handoff is explicit.
- Some current runtime types are transitional and should be migrated incrementally toward full district/block/parcel/road/building contracts.
