# Validation Spec

Validation is a first-class city system. It protects the project from procedural output that looks acceptable in one camera view but breaks routing, zoning, assets, simulation, or performance.

## Severity

| Severity | Meaning |
| --- | --- |
| `error` | City data is invalid and should not be accepted for a production slice. |
| `warning` | City can render, but a planning, visual, or performance assumption is violated. |
| `info` | Useful diagnostics for debug panels and tuning. |

## Required Checks

| Category | Checks |
| --- | --- |
| Config | City seed, quality preset, grid/block/road/water dimensions, building height/setback ranges, city/traffic/prop/tree density, district density/height/lot split, render colors, FOV, clipping, fog, pixel ratio, and shadow flags. |
| Identifier | Unique IDs, object-kind registry ID patterns, required/forbidden parent IDs, valid parent kinds, valid parent references, no duplicate ownership. |
| Geometry | Finite local meter coordinates, local x/z bounds, height datum bounds, positive dimensions, valid polygons, no self-intersections, no zero-area parcels. |
| Roads | Connected road graph, legal intersections, lane continuity, hierarchy/profile compatibility. |
| Road markings | Lane dashes, zebra crossings, stop bars, arrows, tactile paving, and refuge islands reference valid roads/crossings and render bindings. |
| Sidewalks | Continuous paths, crossings connect both sides, accessible curb ramps. |
| Curbs | Curb zones attach to sidewalks/roads, do not overlap, and loading stays clear of crossings. |
| Curb activations | Parklets, outdoor dining, temporary seating decks, and interim plazas attach to safe curb zones, reference approved/compliant permits, preserve emergency/transit/drainage/accessibility clearances, expose seasonal removal, and resolve render bindings. |
| Public amenities | Public toilets, drinking fountains, shade/cooling fixtures, charging points, clocks, kiosks, and repair stands attach to sidewalks, plazas, or waterfront open spaces, preserve accessible paths and capacity, resolve required utility/service access, and expose render bindings. |
| Water transport access | Ferry stops, piers, service docks, small ports, port logistics edges, and emergency helipads resolve waterfront, waterway, dock, road, navigation, freight, and emergency references, expose capacity/arrival constraints, and resolve render bindings. |
| Wind comfort | Wind corridors, sheltered areas, downdraft risk zones, bridge effects, waterfront exposure, and public-space comfort zones resolve weather presets, parents, roads/buildings/waterfront/public-space/tree/solar references, expose bounded comfort and gust metrics, and flag pedestrian warnings for windy or hazardous zones. |
| Economy anchors | Economic destinations resolve parent buildings, parcels, districts, roads, active frontages, public/service entrances, freight docks/routes, opening hours, jobs, customer demand, delivery demand, frontage needs, loading needs, and district fit before simulation consumes them. |
| Street trees | Street trees bind to sidewalks/roads/curbs and fit inside the furnishing zone. |
| Street lights | Street lights bind to sidewalks/roads/curbs and carry coverage plus utility placeholders. |
| Street furniture/signs | Furniture and signs bind to sidewalks/roads/curbs, use explicit placement zones, stay out of pedestrian clear paths, and avoid crossing clearances. |
| Green stormwater public realm | Rain gardens, bioswales, planters, pervious strips, permeable paving, curb cuts, and tree trenches bind to roads, sidewalks, stormwater utility nodes, runoff edges, tree references where needed, asset bindings, and accessible clear paths. |
| Parcels | Parcels inside blocks, respect setbacks, have frontage, do not overlap water/roads. |
| Buildings | Fit parcels, respect height/coverage, expose frontage sides and public entrances, and do not block required access. |
| Building fire safety | Fire-safety profiles attach to buildings, resolve hydrants and fire-lane curb zones, provide enough egress capacity, expose sprinkler service where required, and include refuge/emergency access rules for elevated risk. |
| Healthcare anchors | Hospitals, clinics, pharmacies, urgent care, and ambulance bays attach to the healthcare civic anchor, resolve building/parcel/district/road/service-area references, expose care capacity and patient arrivals, link transit and ambulance access, carry coverage navigation nodes/edges, and resolve render bindings. |
| Education anchors | Schools, libraries, universities, childcare, and learning campuses attach to the education civic anchor, resolve building/parcel/district/road/service-area references, expose learner capacity and daily demand, link drop-off zones, transit, bike parking, playground access, and pedestrian coverage, and resolve render bindings. |
| Emergency equipment | AEDs, emergency phones, sirens, alarms, fire alarm boxes, assembly areas, lifeguard stations, and shelter signage attach to emergency service anchors, resolve public-space, shelter, readable-sign, road, navigation, and fire-lane references, expose nearest equipment and assembly coverage, and resolve render bindings. |
| Active frontages | Retail, hospitality, and mixed-use detailed-street frontages reference valid buildings, parcels, roads, sidewalks, public entrances, and facade render bindings. |
| Zoning | Building use, height, density, frontage, and buffers match district rules. |
| Utilities | Hydrants, drains, lights, power, water, waste, and service access coverage. |
| Operations asset inventory | Renderable civic, public-realm, and utility assets have exactly one inventory record with target parentage, owner/department, lifecycle, warranty, replacement cost, condition, operational status, source metadata, inspection access, render binding, and catalog asset references. |
| Maintenance operations | Assets marked for maintenance have operations-owned child records with valid schedules, repair queues, condition updates, replacement estimates, service access references, operation routes, and temporary closure road/navigation-edge restrictions. |
| Permits and inspections | Development permits, temporary-closure permits, code checks, approvals, inspections, and compliance reviews have valid cadastre or maintenance parentage, source references, validity windows, required approvals/inspections, compliance status, related objects, and closure roads. |
| Assets | Valid catalog IDs, category, format, scale, tags, LOD variants, asset URLs, render binding object kind, semantic tag, material zone, fallback material/geometry, and asset ID references. |
| Import/export | Supported exchange format, local x/z meter frame, deterministic seed/config provenance, object count consistency, and no renderer-only transient state. |
| LOD | Terrain, networks, buildings, facades, props, agents, utilities, overlays, and assets have object-kind LOD policy coverage and supported tiers. |
| Metadata | Generated and runtime objects carry source metadata, stable source IDs, confidence, review status, and license/attribution where required. |
| Simulation | Vehicles and agents have lanes, route nodes, spawn/destination endpoints, schedules or stop behavior, and incident hooks. |
| Performance | Chunk counts, draw calls, triangles, texture memory, and active agents under budget. |

## Current Executable Checks

`validateGeneratedCity` currently verifies:

- `validateAppConfig` runs before generation and rejects invalid city/render config, including seed format, quality presets, density controls, district settings, dimensions, colors, clipping planes, fog density, pixel ratio, and shadow flags.
- Duplicate IDs across indexed city objects.
- Representative generated and runtime validation issues now include affected points, affected boundaries where polygon context is known, and suggested fixes so debug overlays can focus the issue instead of only highlighting the parent object.
- Object-kind registry coverage, stable ID patterns, required/forbidden parent IDs, and allowed parent-kind relationships.
- Source metadata coverage for generated objects, procedural/simulated generation steps, review status, confidence, and asset license/attribution warnings.
- LOD policy coverage for every registered object kind, required `lod0` through `lod4` tiers, decreasing tier distances, and object assignments that stay inside each kind policy.
- Geospatial frame metadata, local x/z meter units, origin metadata, coordinate precision/tolerance fields, local coordinate bounds, height datum range, and future import projection metadata.
- Coordinate-bearing generated objects use finite x/z meter values inside the local frame tolerance.
- Point3D and height-bearing objects stay inside the configured local ground-plane height datum tolerance.
- District boundaries, primary uses, use mix totals, height ranges, density gradients, landmark targets, transition buffers, style hints, and allowed street profiles.
- Adjacent block district transitions have reciprocal district transition buffer rules and validation focus data when they fail.
- Constraint layer objects validate boundary geometry, affected/prohibited object kinds, required and related object references, positive setback/clearance/height metrics, no-build parcel/building conflicts, road clearance requirements, and height limits when present.
- Access-control objects validate subtype/rule coverage, centerline and boundary geometry, allowed/restricted mode consistency, required service-corridor or transit-stop references for gates/checkpoints/turnstiles, object references, navigation-edge references, and back-linked navigation restrictions.
- Block geometry and district parent relationships.
- Positive road length, width, widthMeters, lane count, lane widths, sidewalk clear widths, and lane totals that fit road width.
- Lane and sidewalk parent references back to their road segment.
- Runtime traffic markings via `validateTrafficPlan`: lane-marking and traffic-vehicle registry ID patterns, LOD policy compliance, marking road/lane/crossing/intersection references, positive marking dimensions, marking asset bindings, and vehicle road/lane/route/speed/stop/incident-hook sanity.
- Asset catalog and binding rules: duplicate assets, unsupported category/format, invalid scale, missing tags/material zone, binary URL and extension mismatches, missing attribution/license, missing LOD variant assets, invalid render binding object kinds, missing semantic tags/material zones/fallbacks, missing bound asset IDs, and required renderable binding coverage.
- Operations asset inventory coverage validates one record per renderable civic/healthcare/education/emergency-service/emergency-equipment/public-realm/water-transport/utility target, target parentage and kind, owner/department/source metadata, lifecycle/warranty/replacement-cost/condition coherence, inspection-access references, render binding IDs, and catalog asset references.
- Healthcare anchor validation checks required hospital/clinic/pharmacy/urgent-care/ambulance-bay kinds, healthcare civic-anchor parentage, building/parcel/district/road/service-area references, patient/care capacity, entrance/transit/ambulance access refs, coverage navigation nodes/edges, ambulance response hooks, hospital emergency-department capacity, and render binding IDs.
- Education anchor validation checks required school/library/university/childcare/learning-campus kinds, education civic-anchor parentage, building/parcel/district/road/service-area references, learner/classroom/library/childcare/lecture capacity, entrance/drop-off/transit/bike/playground access refs, pedestrian coverage navigation nodes/edges, access-score metrics, and render binding IDs.
- Emergency service anchor validation checks required fire/police/ambulance/shelter/command/staging anchor kinds, emergency civic-anchor parentage, building/parcel/district/road/service-area references, 24h dispatch capacity, response coverage districts/roads/fire-safety profiles, emergency navigation nodes/edges, fire-lane/service-corridor/hydrant access, shelter/ambulance/command readiness, and render binding IDs.
- Emergency equipment validation checks required AED/phone/siren/alarm/fire-alarm-box/assembly-area/lifeguard/shelter-signage kinds, emergency-service parentage, public-space coverage, nearest assembly and shelter links, emergency navigation/fire-lane access, readable sign links, device/audible/capacity metrics, and render binding IDs.
- Water transport access validation checks required access kinds, parent kind compatibility, ferry/port/helipad arrival modes, waterway/dock/waterfront references, road and navigation graph refs, freight-route refs for port access, emergency anchor refs for helipads, transfer objects, positive capacity and clearance constraints, and render binding IDs.
- Wind comfort validation checks required corridor/shelter/downdraft/bridge/waterfront/public-space zone kinds, wind risk levels, parent and weather preset references, wind/comfort/shelter/risk value ranges, pedestrian warning flags, and referenced roads, buildings, waterfront open spaces, parks, plazas, trees, waterway crossings, and solar/shading samples.
- Economy anchor validation checks parent building/parcel/district/road references, economic use, land-use compatibility, job and customer demand ranges, delivery demand, opening-hour windows, active frontage/public entrance references, service/loading entrance availability, loading dock/curb/freight-route references, district-fit score, zoning compatibility, and preferred district metadata.
- Maintenance operation validation checks watched asset coverage, inventory parentage, owner/department consistency, operation route references, schedule windows, repair queue hours, condition updates, replacement costs, service access object references, temporary closure roads, and affected navigation-edge restrictions.
- Permit and inspection validation checks cadastre or maintenance parentage, parcel mirroring, validity windows, final approval metadata, required inspection metadata, compliance consistency, active temporary-closure permits for closure operations, closure road references, and related object references.
- Import/export contract seed: supported format contracts for GeoJSON, CityJSON-style domain data, OSM-inspired features, glTF asset bindings, CSV tables, and procedural seed JSON; procedural seed exports validate schema version, format, seed, local x/z geospatial frame, object count consistency, and absence of renderer-only fields.
- Intersection center coordinates, connected road references, road count, and hierarchy mix.
- Crossing parent intersection/road/sidewalk references and sidewalk graph connectivity.
- Curb zone road/sidewalk/slice references, range validity, same-sidewalk conflicts, and loading clearance around crossings.
- Curb activation validation checks curb-zone parentage, safe curb uses, matching road/sidewalk/side context, in-zone geometry, approved/compliant permit references, accessible/emergency/transit/drainage clearances, protective barriers, seating capacity, seasonal removal windows, and render binding coverage.
- Public amenity validation checks sidewalk/plaza/waterfront parentage, placement-context references, finite geometry and clearance envelopes, accessible clear paths, usable capacity and daily-user metrics, service access corridors, water/power/drainage requirements, public-toilet and charging-point utility rules, and render binding coverage.
- Park tree parents and street tree sidewalk/road/curb references, tree pit dimensions, and furnishing-zone fit.
- Street light sidewalk/road/curb references, dimensions, color temperature, and missing power circuit warnings.
- Public lighting coverage validates citywide/detailed placement context, fixture/night-safety/glare metadata, served power circuits, and critical sidewalk lighting gaps on arterial, collector, promenade, and transit-eligible routes.
- Street furniture/sign sidewalk/road/curb references, dimensions, asset bindings, furnishing-zone fit, crossing-clearance avoidance, bus-shelter-to-bus-stop compatibility, LOD4-readable sign-face metadata, and sign route/district/frontage destinations.
- Green stormwater feature validation checks road parentage, sidewalk clear path, stormwater node/runoff-edge references, tree-trench tree links, positive capacity/geometry metrics, maintenance access, and render binding coverage.
- Parcel parent block, district/block references, positive dimensions, max height, bounded coverage ratio, frontage roads, and allowed uses.
- Building references to parcels, positive footprint/height/floor count, parcel fit, coverage, height, allowed uses, primary frontage fields, and public entrance IDs.
- Building fire-safety profiles validate one profile per building, parent/parcel/road consistency, hydrant reach, fire-lane curb-zone clearance, egress and emergency entrance references, service access corridors, sprinkler water service, and refuge capacity.
- Active frontage facade slice/building/parcel/road/sidewalk references, active-use membership, public entrance IDs, storefront metadata, slice tags, and facade asset bindings.
- Tree parent park references.

## Expansion Order

1. Geometry and identifier validation for all Phase 2 contracts.
2. Road/sidewalk/crossing/curb graph checks.
3. Parcel and building zoning checks.
4. Asset binding and LOD checks.
5. Utility coverage and service access checks.
6. Simulation spawn/destination/route checks.
7. Chunk and performance budget checks.

## Debug Output

Validation issues should be visible in a debug overlay with:

- Issue severity and category.
- Object ID and owner domain.
- World position or affected boundary.
- Suggested fix where the rule can infer one.
