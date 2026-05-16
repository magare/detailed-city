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
  | 'accessControls'
  | 'assetCatalog'
  | 'assetInventoryRecords'
  | 'addressPoints'
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
  | 'buildingEntrances'
  | 'buildingFireSafetyProfiles'
  | 'cadastreRecords'
  | 'civicAnchors'
  | 'communityAnchors'
  | 'cultureAnchors'
  | 'educationAnchors'
  | 'emergencyEquipment'
  | 'governmentAnchors'
  | 'healthcareAnchors'
  | 'cityMetrics'
  | 'developmentPhases'
  | 'constraints'
  | 'crossings'
  | 'curbActivations'
  | 'curbZones'
  | 'districts'
  | 'emergencyServiceAnchors'
  | 'freightLoadingDocks'
  | 'freightRoutes'
  | 'gazetteerEntries'
  | 'greenStormwaterFeatures'
  | 'hazardZones'
  | 'intersections'
  | 'navigationGraphEdges'
  | 'navigationGraphNodes'
  | 'navigationRoutes'
  | 'maintenanceOperations'
  | 'namedPlaces'
  | 'parcels'
  | 'permitInspectionRecords'
  | 'parks'
  | 'parkFeatures'
  | 'plazaZones'
  | 'publicAmenities'
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
  | 'waterTransportAccess'
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
    ...city.curbActivations,
    ...city.publicAmenities,
    ...city.trafficCalmingDevices,
    ...city.accessControls,
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
    ...city.maintenanceOperations,
    ...city.permitInspectionRecords,
    ...city.freightLoadingDocks,
    ...city.freightRoutes,
    ...city.serviceAlleys,
    ...city.serviceAccessCorridors,
    ...city.buildingEntrances,
    ...city.buildingFireSafetyProfiles,
    ...city.addressPoints,
    ...city.namedPlaces,
    ...city.gazetteerEntries,
    ...city.greenStormwaterFeatures,
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
    ...city.assetInventoryRecords,
    ...city.buildings,
    ...city.civicAnchors,
    ...city.communityAnchors,
    ...city.cultureAnchors,
    ...city.educationAnchors,
    ...city.emergencyEquipment,
    ...city.governmentAnchors,
    ...city.healthcareAnchors,
    ...city.emergencyServiceAnchors,
    ...city.activeFrontages,
    ...city.parks,
    ...city.parkFeatures,
    ...city.plazaZones,
    ...city.waterways,
    ...city.waterfrontEdges,
    ...city.waterfrontOpenSpaces,
    ...city.waterTransportAccess,
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
