import type { CityObjectIndex } from './cityContracts';
import { createCityObjectIndex } from './cityObjectIndex';
import type {
  GeneratedCity,
  GeneratedCityObject,
  GeneratedRuntimeCityObject,
  RoadSegment,
  TrafficPlan
} from '../../types/city';

type GeneratedCityObjectSource = Pick<
  GeneratedCity,
  | 'assetCatalog'
  | 'activeFrontages'
  | 'administrativeBoundaries'
  | 'blocks'
  | 'buildings'
  | 'cityMetrics'
  | 'constraints'
  | 'crossings'
  | 'curbZones'
  | 'districts'
  | 'hazardZones'
  | 'intersections'
  | 'parcels'
  | 'parks'
  | 'resilienceGoals'
  | 'roads'
  | 'sidewalkGraph'
  | 'soilGeologyZones'
  | 'streetFurniture'
  | 'streetLights'
  | 'trafficCalmingDevices'
  | 'topographyZones'
  | 'trees'
  | 'verticalSlices'
  | 'waterfrontEdges'
  | 'waterways'
  | 'zoningDistricts'
>;

export function listGeneratedCityObjects(city: GeneratedCityObjectSource): GeneratedCityObject[] {
  return [
    ...city.administrativeBoundaries,
    ...city.districts,
    ...city.zoningDistricts,
    ...city.cityMetrics,
    ...city.constraints,
    ...city.hazardZones,
    ...city.topographyZones,
    ...city.soilGeologyZones,
    ...city.resilienceGoals,
    ...city.verticalSlices,
    ...city.blocks,
    ...city.roads,
    ...listRoadChildren(city.roads),
    ...city.intersections,
    ...city.crossings,
    ...city.curbZones,
    ...city.trafficCalmingDevices,
    ...city.streetLights,
    ...city.streetFurniture,
    ...city.sidewalkGraph.nodes,
    ...city.sidewalkGraph.edges,
    ...city.parcels,
    ...city.buildings,
    ...city.activeFrontages,
    ...city.parks,
    ...city.waterways,
    ...city.waterfrontEdges,
    ...city.trees,
    ...city.assetCatalog
  ];
}

export function createGeneratedCityObjectIndex(
  city: GeneratedCityObjectSource
): CityObjectIndex<GeneratedCityObject> {
  return createCityObjectIndex(listGeneratedCityObjects(city));
}

export function listGeneratedRuntimeObjects(
  city: GeneratedCityObjectSource,
  traffic: TrafficPlan
): GeneratedRuntimeCityObject[] {
  return [...listGeneratedCityObjects(city), ...traffic.markings, ...traffic.vehicles];
}

export function createGeneratedRuntimeObjectIndex(
  city: GeneratedCityObjectSource,
  traffic: TrafficPlan
): CityObjectIndex<GeneratedRuntimeCityObject> {
  return createCityObjectIndex(listGeneratedRuntimeObjects(city, traffic));
}

function listRoadChildren(roads: readonly RoadSegment[]): GeneratedCityObject[] {
  return roads.flatMap((road) => [...road.lanes, ...road.sidewalks]);
}
