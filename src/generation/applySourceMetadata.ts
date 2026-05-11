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
    constraints: city.constraints.map((constraint) => withProceduralMetadata(constraint, 'blueprint-constraints')),
    resilienceGoals: city.resilienceGoals.map((goal) => withProceduralMetadata(goal, 'blueprint-resilience-goals')),
    blocks: city.blocks.map((block) => withProceduralMetadata(block, 'building-blocks')),
    verticalSlices: city.verticalSlices.map((slice) => withProceduralMetadata(slice, 'detailed-street-slices')),
    roads: city.roads.map(withRoadMetadata),
    intersections: city.intersections.map((intersection) =>
      withProceduralMetadata(intersection, 'mobility-intersections')
    ),
    crossings: city.crossings.map((crossing) => withProceduralMetadata(crossing, 'mobility-crossings')),
    curbZones: city.curbZones.map((curbZone) => withProceduralMetadata(curbZone, 'mobility-curb-zones')),
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
    activeFrontages: city.activeFrontages.map((frontage) =>
      withProceduralMetadata(frontage, 'building-active-frontages')
    ),
    parks: city.parks.map((park) => withProceduralMetadata(park, 'terrain-parks')),
    waterways: city.waterways.map((waterway) => withProceduralMetadata(waterway, 'terrain-waterways')),
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
