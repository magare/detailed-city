# City Roadmap

## Phase 1: Foundation

- Renderer, camera, controls, resize, and render loop.
- Seeded city generation.
- Grid roads, parcels, district zoning, parks, water, basic traffic.
- Browser smoke tests that catch blank WebGL output.
- City-planning domain tree under `src/city`.
- Early debug foundation: seed display, object picking target, validation overlay target, and performance overlay target.

## Phase 2: City Contracts

- Executable TypeScript schemas for city objects, IDs, owner domains, geometry, LOD, source metadata, asset bindings, validation results, and performance budgets.
- Stable IDs and parent-child relationships for districts, blocks, parcels, roads, buildings, assets, public-realm objects, utilities, sensors, and agents.
- Geospatial coordinate rules: local `x/z` meters, `y` height, city origin, height datum, precision, and future import projection strategy.
- LOD policy for terrain, roads, buildings, facades, interiors, props, trees, vehicles, agents, utilities, and overlays.
- Validation checks for identifiers, geometry, road/sidewalk graph continuity, parcel fit, zoning compliance, utility coverage, LOD coverage, performance budgets, and renderable asset bindings.
- Asset catalog schema with categories, scale, format, LOD variants, tags, attribution, license, and fallback binding.
- Street profile templates, building grammar, visual style direction, debug tooling spec, and vertical-slice acceptance criteria.

## Phase 3: Land And Networks

- District, block, parcel, zoning, topography, waterfront, and hazard models.
- Street hierarchy, intersections, sidewalks, crossings, curb lanes, parking, cycling, transit, freight, bridges, and tunnels.
- Utility skeletons for power, water, wastewater, stormwater, telecom, waste, and service access.
- Navigation graphs for vehicles, pedestrians, bikes, transit, service crews, and emergency response.
- Sidewalk graph, curb allocation, street profile expansion, and service coverage checks.

## Phase 4: Detailed Places

- Building typologies, footprints, facades, windows, signs, awnings, entrances, rooftop equipment, interiors, accessibility, and fire-safety markers.
- Parks, plazas, trees, lighting, benches, bins, bollards, kiosks, bus shelters, bike racks, signs, public art, playgrounds, and waterfront open space.
- Civic anchors: government, education, healthcare, emergency services, culture, religious, and community services.
- Economic anchors: retail, offices, industry, warehouses, hospitality, markets, tourism, deliveries, and service demand.
- Building grammar for parcel fit, setbacks, podium/tower rules, facade grids, entrances, roofs, active frontages, night lighting, and interior LOD.
- Prop placement rules tied to street profiles, public-realm zones, asset bindings, and maintenance ownership.

## Phase 5: Environment And Operations

- Day-night, weather, solar shadow, wind comfort, air quality, noise, heat, ecology, and flood-risk layers.
- Maintenance, permits, inspections, asset inventory, sensor overlays, event closures, service schedules, and emergency-response workflows.
- Debug panels for inspecting IDs, layers, validation errors, LOD, services, route graphs, sensors, and active simulation state.

## Phase 6: Scale And Rendering

- City chunks and lazy generation.
- Instanced meshes for repeated props.
- Frustum culling and distance LOD.
- Worker-based generation for expensive city builds.
- Texture atlases for asphalt, concrete, glass, brick, metal, water, signs, foliage, and facade panels.
- Better lighting presets for dawn, day, dusk, night, rain, fog, and emergency scenes.
- Benchmark automation, quality presets, console-error gates, and chunk-level performance reports.

## Phase 7: Simulation

- Traffic graph and vehicle routing.
- Pedestrian zones and crossings.
- Weather system: rain, puddles, wind, fog.
- Time-of-day cycle.
- Transit operations, utility loads, emergency scenarios, crowd events, economic opening hours, delivery demand, and tourism peaks.

## Phase 8: Authoring And Exchange

- Debug panels for seed, district density, road spacing, building height ranges, zoning, services, and simulation presets.
- Export/import city config, GeoJSON, CityJSON-style domain data, OSM-inspired feature inputs, and glTF asset bindings.
- Asset manifest validation.
- Screenshot and benchmark automation.
- Preset editor, city config schema, validation reports, and asset catalog authoring checks.

## Planning Specs

- `docs/data-contracts.md`
- `docs/generation-rules.md`
- `docs/asset-catalog.md`
- `docs/street-profiles.md`
- `docs/building-grammar.md`
- `docs/validation-spec.md`
- `docs/performance-budget.md`
- `docs/visual-style.md`
- `docs/debug-tools.md`
- `docs/vertical-slices.md`
