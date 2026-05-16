# City Domain Structure

This project now treats the city as a real planning domain before treating it as a Three.js scene. The structure follows three reference ideas:

- [OGC CityGML](https://www.ogc.org/standards/citygml/) frames a virtual 3D city model as semantic urban data that can support planning, BIM, navigation, sensors, simulation, and digital twins.
- [NACTO Urban Street Design Guide](https://nacto.org/publication/urban-street-design-guide/) separates street types, street elements, intersections, transit, stormwater, curb use, and performance controls.
- [OpenStreetMap Map Features](https://wiki.openstreetmap.org/wiki/Map_features) shows the breadth of real-world object categories a city model eventually needs: amenities, buildings, boundaries, highways, land use, rail, shops, telecom, tourism, water, and waterways.

## Principle

The city is not a pile of meshes. It is a set of overlapping systems:

- Land determines what can exist.
- Mobility and utilities connect places.
- Buildings, civic uses, public realm, and economy create destinations.
- Environment changes comfort, risk, and constraints.
- Operations maintain and monitor the city.
- Simulation gives the city behavior over time.
- Rendering handoff converts the city into visible, performant Three.js objects.

## Directory Map

```text
src/city/
  blueprint/
    master-plan/        Overall city form, center hierarchy, skyline intent, and growth boundaries.
    districts/          District identities, densities, use mix, design rules, and transitions.
    phasing/            Construction phases, temporary conditions, future expansion, and unlock order.
    constraints/        Non-negotiable constraints: setbacks, protected corridors, clearances, easements.
    resilience/         Redundancy, climate adaptation, evacuation, emergency access, continuity goals.
    metrics/            Walkability, density, open-space access, service coverage, traffic, emissions.

  land/
    administrative-boundaries/  City limits, wards, neighborhoods, ownership zones.
    parcels/                    Buildable lots, parcel IDs, frontage, setbacks, lot splits.
    blocks/                     Blocks, alleys, internal access, block permeability.
    zoning/                     Allowed uses, height controls, floor-area ratio, overlays.
    cadastre/                   Property records, rights, easements, land ownership.
    topography/                 Terrain, grade, retaining conditions, slopes.
    soil-geology/               Ground condition hints for foundations, tunnels, drainage.
    waterways/                  Rivers, canals, channels, culverts, docks, outfalls.
    waterfront/                 Quays, promenades, flood walls, habitat edges.
    hazards/                    Flood plains, landslide risk, heat risk, restricted areas.

  mobility/
    street-network/     Street hierarchy, centerlines, profiles, speed policy.
    intersections/      Junction geometry, signal control, turning constraints, visibility.
    lanes/              Vehicle lanes, bus lanes, turn pockets, reversible lanes.
    sidewalks/          Pedestrian clear paths, furnishing zones, frontage zones, curb ramps.
    crossings/          Crosswalks, refuge islands, midblock crossings, raised crossings.
    cycling/            Cycle tracks, protected lanes, bike parking, conflict points.
    transit/            Stops, stations, routes, headways, priority lanes.
    water-transport/    Ferry stops, piers, docks, small ports, port logistics edges, helipads, and arrival constraints.
    parking-curbs/      Parking, loading, curb pricing, curb restrictions, ride-hail zones.
    freight-logistics/  Delivery routes, loading docks, service alleys, time windows.
    navigation-graphs/  Routing graphs for vehicles, pedestrians, bikes, services, emergency units.
    bridges-tunnels/    Spans, underpasses, portal geometry, clearance rules.

  utilities/
    power-grid/           Substations, feeders, transformers, street-light circuits.
    water-supply/         Mains, valves, hydrants, tanks, pumps.
    wastewater/           Sanitary sewers, lift stations, manholes.
    stormwater/           Inlets, bioswales, detention, pervious areas, outfalls.
    telecom/              Fiber, cell sites, utility cabinets, antennas.
    gas-district-energy/  Gas, steam, chilled water, district heating/cooling.
    waste-management/     Collection points, routes, transfer stations, recycling.
    service-access/       Utility easements, vaults, maintenance access paths.

  buildings/
    typologies/                         Residential, office, civic, industrial, mixed-use, retail.
    footprints/                         Parcel fit, podiums, towers, courtyards, setbacks.
    structure-shell/                    Massing, cores, floor plates, structural grids.
    facades/                            Windows, balconies, storefronts, materials, signs.
    roofs/                              Mechanical screens, solar, green roofs, antennas, terraces.
    entrances/                          Doors, lobbies, service entries, ramps, loading.
    interiors/                          Floor use, public/private areas, vertical circulation.
    amenities/                          Public amenities, shared services, active frontages.
    mechanical-electrical-plumbing/     Plant rooms, ducts, meters, risers, service rooms.
    fire-safety/                        Egress, fire lanes, hydrant reach, sprinkler connections.
    accessibility/                      Step-free paths, ramps, elevators, tactile cues.

  public-realm/
    parks/                   Lawns, paths, planting, sports, seating, water features.
    plazas/                  Hardscape, shade, event areas, seating, active edges.
    trees-planting/          Species, canopy spread, planters, soil volume, seasonal color.
    street-furniture/        Benches, bins, bollards, kiosks, bus shelters, bike racks.
    lighting/                Poles, fixture types, light coverage, night safety.
    signage-wayfinding/      Street signs, directional signs, maps, regulatory signs.
    public-art/              Sculptures, murals, monuments, interactive installations.
    waterfront-open-space/   Promenades, overlooks, piers, ecological edges.
    playgrounds-sports/      Playgrounds, courts, fields, exercise equipment.
    safety-visibility/       Sight lines, active frontages, lighting overlap, refuge areas.

  civic/
    government/          City hall, administration, courts, civic plazas.
    healthcare/          Hospitals, clinics, pharmacies, urgent care coverage.
    education/           Schools, libraries, universities, childcare.
    emergency-services/  Fire, police, ambulance, shelters, command posts.
    culture/             Museums, theaters, galleries, venues, heritage sites.
    religious/           Worship places, cemeteries, gathering spaces.
    community-services/  Social services, food banks, recreation centers.

  economy/
    retail/            Storefronts, malls, corner shops, markets, service retail.
    offices/           Office towers, coworking, institutional workplaces.
    industry/          Light industry, workshops, fabrication, heavy buffers.
    warehouses/        Logistics, storage, distribution, cold-chain facilities.
    hospitality/       Hotels, restaurants, nightlife, event venues.
    informal-markets/  Street vendors, temporary stalls, seasonal markets.
    tourism/           Visitor routes, landmarks, viewpoints, attractions.

  environment/
    climate-weather/   Rain, cloud, fog, seasonal conditions, weather presets.
    solar-shading/     Sun paths, shadows, daylight, solar potential.
    wind-comfort/      Wind corridors, downdraft risk, bridge effects, waterfront exposure, sheltered areas.
    air-quality/       Emissions sources, clean-air corridors, exposure.
    noise/             Traffic noise, industrial noise, quiet zones.
    urban-heat/        Heat islands, shade, cool roofs, tree canopy.
    ecology-habitats/  Habitat patches, green corridors, biodiversity.
    flood-risk/        Flood depth, drainage capacity, evacuation impact.

  operations/
    maintenance/          Asset condition, inspection cycles, repair queues.
    permits-inspections/  Development permits, closures, code checks, approvals.
    sensors-iot/          Cameras, counters, weather stations, meters, air sensors.
    events-crowds/        Parades, markets, closures, crowd routing, temporary assets.
    emergency-response/   Dispatch areas, response times, blocked routes, staging.
    service-schedules/    Waste pickup, street sweeping, transit timetables, deliveries.
    asset-inventory/      Ownership, lifecycle, warranty, replacement cost, status.

  simulation/
    population-agents/    Residents, workers, visitors, service crews.
    traffic-flow/         Vehicle movement, congestion, parking search, incidents.
    pedestrian-flow/      Walking demand, crossing behavior, crowding.
    transit-operations/   Vehicles, dwell times, headways, station crowding.
    utility-loads/        Power, water, telecom, stormwater, waste demand.
    emergency-scenarios/  Fire, flood, evacuation, road closures, outages.
    weather-daynight/     Sun, night, rain, fog, seasonal transitions.
    economy-activity/     Opening hours, commute peaks, delivery demand, tourism peaks.

  data-contracts/
    identifiers/      Stable IDs, naming rules, parent-child relationships.
    geospatial/       Coordinates, units, projection, origin, height datum.
    level-of-detail/  LOD0 to LOD4 rules for massing, facades, interiors, assets.
    import-export/    OSM, CityJSON, GeoJSON, glTF, CSV, custom procedural formats.
    validation/       Required fields, geometry validity, graph continuity, coverage tests.
    metadata/         Source, author, confidence, license, update time, provenance.

  rendering-handoff/
    asset-binding/    Domain object to asset catalog mappings.
    lod-policy/       Distance, density, device, and importance-based detail rules.
    material-zones/   Semantic material assignments and texture atlas zones.
    mesh-builders/    Three.js geometry adapters for planned city objects.
    scene-layers/     Render layers for terrain, networks, buildings, props, overlays.
```

## How This Connects To The Current App

- `src/city` defines city meaning and ownership.
- `src/generation` should produce data that satisfies `src/city/data-contracts`.
- `src/world` should assemble visible scene objects from domain outputs.
- `src/rendering` should own materials, shaders, postprocessing, and GPU-facing detail.
- `src/systems` should own camera, controls, weather, lighting, performance, and other runtime app services.

The next implementation step should be to move the existing road, parcel, park, waterway, and traffic types toward the new domain contracts while keeping the current renderer working.

That migration has started with:

- Shared contract primitives in `src/city/data-contracts/cityContracts.ts`.
- City intent moved into `src/city/blueprint/cityBlueprint.ts`.
- Generated parks, waterways, roads, parcels, trees, and traffic plans carrying ownership and LOD metadata.
- Traffic mesh construction moved to `src/city/rendering-handoff/mesh-builders`.
- Planning specs in `docs/data-contracts.md`, `docs/generation-rules.md`, `docs/validation-spec.md`, and related documents.
