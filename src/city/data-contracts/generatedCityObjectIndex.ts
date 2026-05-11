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
  | 'intersections'
  | 'parcels'
  | 'parks'
  | 'resilienceGoals'
  | 'roads'
  | 'sidewalkGraph'
  | 'streetFurniture'
  | 'streetLights'
  | 'trees'
  | 'verticalSlices'
  | 'waterways'
>;

export function listGeneratedCityObjects(city: GeneratedCityObjectSource): GeneratedCityObject[] {
  return [
    ...city.administrativeBoundaries,
    ...city.districts,
    ...city.cityMetrics,
    ...city.constraints,
    ...city.resilienceGoals,
    ...city.verticalSlices,
    ...city.blocks,
    ...city.roads,
    ...listRoadChildren(city.roads),
    ...city.intersections,
    ...city.crossings,
    ...city.curbZones,
    ...city.streetLights,
    ...city.streetFurniture,
    ...city.sidewalkGraph.nodes,
    ...city.sidewalkGraph.edges,
    ...city.parcels,
    ...city.buildings,
    ...city.activeFrontages,
    ...city.parks,
    ...city.waterways,
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
