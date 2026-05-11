# Picking Metadata

Picking metadata is the render-side bridge from Three.js raycast hits back to generated city objects.

`pickingMetadata.ts` owns the serializable metadata shape, catalog generation, `Object3D.userData` attachment helpers, and instanced-mesh lookup by `instanceId`. Scene code may attach this metadata while building meshes, but the source object identity must come from generated city contracts or runtime plans.
