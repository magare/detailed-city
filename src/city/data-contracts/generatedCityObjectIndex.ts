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
  | 'bikeConflictZones'
  | 'bikeGraphEdges'
  | 'bikeGraphNodes'
  | 'bikeParking'
  | 'bikeSegments'
  | 'bikeSignals'
  | 'blocks'
  | 'buildings'
  | 'cadastreRecords'
  | 'civicAnchors'
  | 'communityAnchors'
  | 'cultureAnchors'
  | 'governmentAnchors'
  | 'cityMetrics'
  | 'developmentPhases'
  | 'constraints'
  | 'crossings'
  | 'curbZones'
  | 'districts'
  | 'freightLoadingDocks'
  | 'freightRoutes'
  | 'hazardZones'
  | 'intersections'
  | 'navigationGraphEdges'
  | 'navigationGraphNodes'
  | 'navigationRoutes'
  | 'parcels'
  | 'parks'
  | 'parkFeatures'
  | 'plazaZones'
  | 'resilienceGoals'
  | 'roads'
  | 'sidewalkGraph'
  | 'serviceAlleys'
  | 'serviceAccessCorridors'
  | 'soilGeologyZones'
  | 'solarShadingSamples'
  | 'streetFurniture'
  | 'streetLights'
  | 'trafficCalmingDevices'
  | 'transitRoutes'
  | 'transitStops'
  | 'topographyZones'
  | 'trees'
  | 'urbanHeatZones'
  | 'utilityEdges'
  | 'utilityNodes'
  | 'verticalSlices'
  | 'waterfrontEdges'
  | 'waterfrontOpenSpaces'
  | 'waterways'
  | 'weatherPresets'
  | 'zoningDistricts'
>;

export function listGeneratedCityObjects(city: GeneratedCityObjectSource): GeneratedCityObject[] {
  return [
    ...city.administrativeBoundaries,
    ...city.districts,
    ...city.zoningDistricts,
    ...city.cityMetrics,
    ...city.developmentPhases,
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
    ...city.transitStops,
    ...city.transitRoutes,
    ...city.bikeSegments,
    ...city.bikeGraphNodes,
    ...city.bikeGraphEdges,
    ...city.bikeParking,
    ...city.bikeSignals,
    ...city.bikeConflictZones,
    ...city.navigationGraphNodes,
    ...city.navigationGraphEdges,
    ...city.navigationRoutes,
    ...city.freightLoadingDocks,
    ...city.freightRoutes,
    ...city.serviceAlleys,
    ...city.serviceAccessCorridors,
    ...city.weatherPresets,
    ...city.solarShadingSamples,
    ...city.urbanHeatZones,
    ...city.utilityNodes,
    ...city.utilityEdges,
    ...city.streetLights,
    ...city.streetFurniture,
    ...city.sidewalkGraph.nodes,
    ...city.sidewalkGraph.edges,
    ...city.parcels,
    ...city.cadastreRecords,
    ...city.buildings,
    ...city.civicAnchors,
    ...city.communityAnchors,
    ...city.cultureAnchors,
    ...city.governmentAnchors,
    ...city.activeFrontages,
    ...city.parks,
    ...city.parkFeatures,
    ...city.plazaZones,
    ...city.waterways,
    ...city.waterfrontEdges,
    ...city.waterfrontOpenSpaces,
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
