# Performance Budget

The city should be planned with performance constraints from the beginning. The executable seed is `DEFAULT_PERFORMANCE_BUDGET` in `src/city/data-contracts/cityContracts.ts`.

The current runtime baseline is captured by `src/systems/performance/PerformanceMonitor.ts`. Static diagnostics expose active-agent budget status, and `App.getPerformanceDiagnostics()` adds frame timing plus renderer draw-call and triangle snapshots after the scene is running.

## Initial Targets

| Budget | Target |
| --- | ---: |
| First playable load | Under 8 seconds |
| Target frame rate | 60 FPS |
| Minimum frame rate | 30 FPS |
| Visible draw calls | 450 |
| Visible triangles | 1,200,000 |
| Texture memory | 512 MB |
| Dynamic agents | 300 |
| Shadow-casting lights | 1 |
| Chunk size | 180 meters |
| Load radius | 3 chunks |
| Unload radius | 4 chunks |

## Rules

- Repeated buildings, trees, lane markings, props, and vehicles should use instancing or pooling.
- Expensive generation steps should move to workers before city size or detail expands substantially.
- Texture atlases are preferred for facade, road, sign, and prop detail.
- Real-time shadows should stay limited; most night/detail lighting should use baked/emissive/fake lighting.
- Dynamic agents should degrade through pooling, impostors, or hidden simulation outside active chunks.

## Per-Chunk Planning

Each chunk should eventually report:

- Object count by kind.
- Renderable count by LOD tier.
- Draw calls and triangle estimate.
- Texture/material set.
- Dynamic agent count.
- Validation issue count.

## Quality Presets

The active quality preset is part of both city and render config and is validated before generation starts.

| Preset | Behavior |
| --- | --- |
| Low | Fewer agents, lower pixel ratio, no small props past LOD2, reduced shadows. |
| Medium | Default browser target, LOD3 near camera, limited animated agents. |
| High | Higher pixel ratio, richer props, denser traffic/pedestrians, better postprocessing. |
| Debug | Stable camera/testing settings, validation overlays, object IDs, performance counters. |

## Test Requirements

- Build must pass.
- Smoke test must catch blank WebGL output.
- Generator property tests must prove same seed/config runs produce stable IDs/counts and invalid generated fixtures fail with expected validation categories.
- Future benchmark test should measure frame time after a fixed camera path.
- Console WebGL shader errors should become a failing quality gate once current warnings are understood.
