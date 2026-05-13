import { createProceduralSourceMetadata } from '../city/data-contracts/sourceMetadata';
import type { CityObjectBase } from '../city/data-contracts/cityContracts';
import type { GeneratedCity, RoadSegment } from '../types/city';

type GeneratedCityWithoutValidation = Omit<GeneratedCity, 'objectIndex' | 'validation'>;

export function applyGeneratedCitySourceMetadata(city: GeneratedCityWithoutValidation): GeneratedCityWithoutValidation {
  return {
    ...city,
    administrativeBoundaries: city.administrativeBoundaries.map((boundary) =>
      withProceduralMetadata(boundary, 'land-administrative-boundaries')
    ),
    districts: city.districts.map((district) => withProceduralMetadata(district, 'terrain-districts')),
    zoningDistricts: city.zoningDistricts.map((zoning) => withProceduralMetadata(zoning, 'land-zoning')),
    cityMetrics: city.cityMetrics.map((metric) => withProceduralMetadata(metric, 'blueprint-city-metrics')),
    developmentPhases: city.developmentPhases.map((phase) => withProceduralMetadata(phase, 'blueprint-phasing')),
    weatherPresets: city.weatherPresets.map((preset) => withProceduralMetadata(preset, 'environment-climate-weather')),
    solarShadingSamples: city.solarShadingSamples.map((sample) =>
      withProceduralMetadata(sample, 'environment-solar-shading')
    ),
    urbanHeatZones: city.urbanHeatZones.map((zone) => withProceduralMetadata(zone, 'environment-urban-heat')),
    constraints: city.constraints.map((constraint) => withProceduralMetadata(constraint, 'blueprint-constraints')),
    hazardZones: city.hazardZones.map((hazard) => withProceduralMetadata(hazard, 'land-hazards')),
    topographyZones: city.topographyZones.map((zone) => withProceduralMetadata(zone, 'land-topography')),
    soilGeologyZones: city.soilGeologyZones.map((zone) => withProceduralMetadata(zone, 'land-soil-geology')),
    resilienceGoals: city.resilienceGoals.map((goal) => withProceduralMetadata(goal, 'blueprint-resilience-goals')),
    blocks: city.blocks.map((block) => withProceduralMetadata(block, 'building-blocks')),
    verticalSlices: city.verticalSlices.map((slice) => withProceduralMetadata(slice, 'detailed-street-slices')),
    roads: city.roads.map(withRoadMetadata),
    intersections: city.intersections.map((intersection) =>
      withProceduralMetadata(intersection, 'mobility-intersections')
    ),
    crossings: city.crossings.map((crossing) => withProceduralMetadata(crossing, 'mobility-crossings')),
    curbZones: city.curbZones.map((curbZone) => withProceduralMetadata(curbZone, 'mobility-curb-zones')),
    trafficCalmingDevices: city.trafficCalmingDevices.map((device) =>
      withProceduralMetadata(device, 'mobility-traffic-calming')
    ),
    streetLights: city.streetLights.map((streetLight) =>
      withProceduralMetadata(streetLight, 'public-realm-street-lights')
    ),
    streetFurniture: city.streetFurniture.map((streetFurniture) =>
      withProceduralMetadata(streetFurniture, 'public-realm-street-furniture')
    ),
    sidewalkGraph: {
      nodes: city.sidewalkGraph.nodes.map((node) => withProceduralMetadata(node, 'mobility-sidewalk-graph')),
      edges: city.sidewalkGraph.edges.map((edge) => withProceduralMetadata(edge, 'mobility-sidewalk-graph'))
    },
    parcels: city.parcels.map((parcel) => withProceduralMetadata(parcel, 'building-parcels')),
    buildings: city.buildings.map((building) => withProceduralMetadata(building, 'building-massing')),
    civicAnchors: city.civicAnchors.map((anchor) => withProceduralMetadata(anchor, 'civic-anchor-base')),
    communityAnchors: city.communityAnchors.map((anchor) => withProceduralMetadata(anchor, 'civic-community-anchors')),
    cultureAnchors: city.cultureAnchors.map((anchor) => withProceduralMetadata(anchor, 'civic-culture-anchors')),
    governmentAnchors: city.governmentAnchors.map((anchor) => withProceduralMetadata(anchor, 'civic-government-anchors')),
    activeFrontages: city.activeFrontages.map((frontage) =>
      withProceduralMetadata(frontage, 'building-active-frontages')
    ),
    parks: city.parks.map((park) => withProceduralMetadata(park, 'terrain-parks')),
    parkFeatures: city.parkFeatures.map((feature) =>
      withProceduralMetadata(feature, 'public-realm-park-features')
    ),
    plazaZones: city.plazaZones.map((zone) => withProceduralMetadata(zone, 'public-realm-plaza-zones')),
    waterways: city.waterways.map((waterway) => withProceduralMetadata(waterway, 'terrain-waterways')),
    waterfrontEdges: city.waterfrontEdges.map((edge) => withProceduralMetadata(edge, 'land-waterfront')),
    waterfrontOpenSpaces: city.waterfrontOpenSpaces.map((openSpace) =>
      withProceduralMetadata(openSpace, 'public-realm-waterfront-open-space')
    ),
    trees: city.trees.map((tree) => withProceduralMetadata(tree, 'environment-tree-plantings')),
    assetCatalog: city.assetCatalog.map((asset) => withProceduralMetadata(asset, 'render-asset-catalog'))
  };
}

function withRoadMetadata(road: RoadSegment): RoadSegment {
  return {
    ...withProceduralMetadata(road, 'mobility-road-network'),
    lanes: road.lanes.map((lane) => withProceduralMetadata(lane, 'mobility-road-lanes')),
    sidewalks: road.sidewalks.map((sidewalk) => withProceduralMetadata(sidewalk, 'mobility-road-sidewalks'))
  };
}

function withProceduralMetadata<T extends CityObjectBase>(object: T, generationStep: string): T {
  return {
    ...object,
    metadata: {
      ...createProceduralSourceMetadata(`generated:${generationStep}:${object.id}`, generationStep),
      ...object.metadata
    }
  };
}
