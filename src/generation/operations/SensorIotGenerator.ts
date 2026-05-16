import type {
  AssetInventoryRecordContract,
  CityId,
  Point2D,
  SensorContract,
  SensorKind,
  SensorMountKind,
  SensorOperationalStatus,
  SensorPrivacyContract,
  SensorTelemetryMetric,
  SensorTelemetryStreamContract
} from '../../city/data-contracts/cityContracts';
import type {
  ActiveFrontage,
  BuildingPlan,
  IndustrialFacility,
  MaintenanceOperation,
  ParkPatch,
  PlazaZone,
  PublicAmenity,
  RoadSegment,
  StreetLight,
  UrbanHeatZone,
  UtilityNode,
  WaterfrontOpenSpace
} from '../../types/city';

export interface SensorIotGeneratorInput {
  readonly assetInventoryRecords: readonly AssetInventoryRecordContract[];
  readonly activeFrontages: readonly ActiveFrontage[];
  readonly buildings: readonly BuildingPlan[];
  readonly industrialFacilities: readonly IndustrialFacility[];
  readonly maintenanceOperations: readonly MaintenanceOperation[];
  readonly parks: readonly ParkPatch[];
  readonly plazaZones: readonly PlazaZone[];
  readonly publicAmenities: readonly PublicAmenity[];
  readonly roads: readonly RoadSegment[];
  readonly streetLights: readonly StreetLight[];
  readonly urbanHeatZones: readonly UrbanHeatZone[];
  readonly utilityNodes: readonly UtilityNode[];
  readonly waterfrontOpenSpaces: readonly WaterfrontOpenSpace[];
}

interface SensorSeed {
  readonly sensorKind: SensorKind;
  readonly mountKind: SensorMountKind;
  readonly mountedObjectId: CityId;
  readonly parentId: CityId;
  readonly position: Point2D;
  readonly roadIds: readonly CityId[];
  readonly buildingIds: readonly CityId[];
  readonly publicSpaceIds: readonly CityId[];
  readonly environmentalZoneIds: readonly CityId[];
  readonly assetInventoryRecordId?: CityId;
  readonly utilityNodeId?: CityId;
  readonly coverageRadiusMeters: number;
  readonly status: SensorOperationalStatus;
  readonly metrics: readonly SensorTelemetryMetric[];
}

const CAMERA_LIMIT = 10;
const PEDESTRIAN_COUNTER_LIMIT = 8;
const TRAFFIC_COUNTER_LIMIT = 6;
const UTILITY_METER_LIMIT = 8;
const WEATHER_STATION_LIMIT = 3;
const AIR_SENSOR_LIMIT = 6;
const OWNER_ENTITY_ID = 'city-operations-sensor-network';
const RESPONSIBLE_DEPARTMENT_ID = 'department:operations-sensors-iot';

export class SensorIotGenerator {
  create(input: SensorIotGeneratorInput): SensorContract[] {
    const assetRecordByObjectId = new Map(input.assetInventoryRecords.map((record) => [record.assetObjectId, record]));
    const maintenanceIdsByAssetRecordId = collectMaintenanceIdsByAssetRecordId(input.maintenanceOperations);
    const telecomNodes = input.utilityNodes
      .filter((node) => node.utilityType === 'telecom' && node.telecom)
      .sort(compareById);
    const seeds = [
      ...createCameraSeeds(input, assetRecordByObjectId),
      ...createPedestrianCounterSeeds(input),
      ...createTrafficCounterSeeds(input),
      ...createUtilityMeterSeeds(input, assetRecordByObjectId),
      ...createWeatherStationSeeds(input),
      ...createAirQualitySensorSeeds(input)
    ].sort((first, second) => first.sensorKind.localeCompare(second.sensorKind) || first.parentId.localeCompare(second.parentId));

    return seeds.map((seed, index) => {
      const telecomNode = telecomNodes[index % Math.max(1, telecomNodes.length)];
      const assetRecord = seed.assetInventoryRecordId ? input.assetInventoryRecords.find((record) => record.id === seed.assetInventoryRecordId) : undefined;
      const maintenanceOperationIds = assetRecord ? maintenanceIdsByAssetRecordId.get(assetRecord.id) ?? [] : [];

      return createSensor(seed, input, index, telecomNode, maintenanceOperationIds);
    });
  }
}

function createCameraSeeds(
  input: SensorIotGeneratorInput,
  assetRecordByObjectId: ReadonlyMap<CityId, AssetInventoryRecordContract>
): SensorSeed[] {
  return input.streetLights
    .filter((light) => light.coverage.criticalPedestrianPath || light.nightSafety.emergencyRouteSupport)
    .sort((first, second) =>
      Number(second.nightSafety.emergencyRouteSupport) - Number(first.nightSafety.emergencyRouteSupport) ||
      second.coverage.radiusMeters - first.coverage.radiusMeters ||
      first.id.localeCompare(second.id)
    )
    .slice(0, CAMERA_LIMIT)
    .map((light, index) => ({
      sensorKind: 'camera',
      mountKind: 'street-light',
      mountedObjectId: light.id,
      parentId: light.id,
      position: light.position,
      roadIds: [light.roadId],
      buildingIds: [],
      publicSpaceIds: [],
      environmentalZoneIds: [],
      assetInventoryRecordId: assetRecordByObjectId.get(light.id)?.id,
      coverageRadiusMeters: 55 + (index % 3) * 5,
      status: index % 7 === 0 ? 'degraded' : 'online',
      metrics: ['video-analytics']
    }));
}

function createPedestrianCounterSeeds(input: SensorIotGeneratorInput): SensorSeed[] {
  return input.activeFrontages
    .filter((frontage) => frontage.storefront.displayWindowCount > 0)
    .sort((first, second) => second.widthMeters - first.widthMeters || first.id.localeCompare(second.id))
    .slice(0, PEDESTRIAN_COUNTER_LIMIT)
    .map((frontage, index) => ({
      sensorKind: 'pedestrian-counter',
      mountKind: 'building-mounted',
      mountedObjectId: frontage.buildingId,
      parentId: frontage.buildingId,
      position: frontage.position,
      roadIds: [frontage.roadId],
      buildingIds: [frontage.buildingId],
      publicSpaceIds: [],
      environmentalZoneIds: [],
      coverageRadiusMeters: 28 + (index % 2) * 4,
      status: 'online',
      metrics: ['people-count']
    }));
}

function createTrafficCounterSeeds(input: SensorIotGeneratorInput): SensorSeed[] {
  return input.roads
    .filter((road) => road.hierarchy !== 'local')
    .sort((first, second) => second.designSpeedKph - first.designSpeedKph || first.id.localeCompare(second.id))
    .slice(0, TRAFFIC_COUNTER_LIMIT)
    .map((road, index) => ({
      sensorKind: 'traffic-counter',
      mountKind: 'roadside-pole',
      mountedObjectId: road.id,
      parentId: road.id,
      position: road.center,
      roadIds: [road.id],
      buildingIds: [],
      publicSpaceIds: [],
      environmentalZoneIds: [],
      coverageRadiusMeters: 70 + (index % 2) * 10,
      status: 'online',
      metrics: ['vehicle-count']
    }));
}

function createUtilityMeterSeeds(
  input: SensorIotGeneratorInput,
  assetRecordByObjectId: ReadonlyMap<CityId, AssetInventoryRecordContract>
): SensorSeed[] {
  const firstNodeByUtilityType = new Map<string, UtilityNode>();
  for (const node of [...input.utilityNodes].sort(compareById)) {
    if (!firstNodeByUtilityType.has(node.utilityType)) {
      firstNodeByUtilityType.set(node.utilityType, node);
    }
  }

  return [...firstNodeByUtilityType.values()]
    .slice(0, UTILITY_METER_LIMIT)
    .map((node, index) => ({
      sensorKind: 'utility-meter',
      mountKind: 'utility-cabinet',
      mountedObjectId: node.id,
      parentId: node.id,
      position: node.center,
      roadIds: [],
      buildingIds: [],
      publicSpaceIds: [],
      environmentalZoneIds: [],
      assetInventoryRecordId: assetRecordByObjectId.get(node.id)?.id,
      utilityNodeId: node.id,
      coverageRadiusMeters: 34 + (index % 3) * 4,
      status: node.outage.criticality === 'high' ? 'online' : 'degraded',
      metrics: ['utility-load']
    }));
}

function createWeatherStationSeeds(input: SensorIotGeneratorInput): SensorSeed[] {
  return input.publicAmenities
    .filter((amenity) => amenity.comfort.coolingProvided || amenity.comfort.shadeProvided || amenity.utilityRequirements.power)
    .sort((first, second) => first.id.localeCompare(second.id))
    .slice(0, WEATHER_STATION_LIMIT)
    .map((amenity, index) => {
      const roadId = amenity.roadId ?? findNearestRoadId(input.roads, amenity.position);

      return {
        sensorKind: 'weather-station',
        mountKind: 'roadside-pole',
        mountedObjectId: roadId,
        parentId: roadId,
        position: amenity.position,
        roadIds: [roadId],
        buildingIds: [],
        publicSpaceIds: uniqueIds([amenity.plazaZoneId, amenity.waterfrontOpenSpaceId].filter(Boolean) as CityId[]),
        environmentalZoneIds: findNearbyUrbanHeatZoneIds(input.urbanHeatZones, amenity.position, 130),
        coverageRadiusMeters: 120 + index * 20,
        status: 'online',
        metrics: ['temperature', 'humidity', 'rainfall']
      };
    });
}

function createAirQualitySensorSeeds(input: SensorIotGeneratorInput): SensorSeed[] {
  return [...input.industrialFacilities]
    .sort((first, second) => second.logistics.dailyTruckTrips - first.logistics.dailyTruckTrips || first.id.localeCompare(second.id))
    .slice(0, AIR_SENSOR_LIMIT)
    .map((facility, index) => ({
      sensorKind: 'air-quality-sensor',
      mountKind: 'roadside-pole',
      mountedObjectId: facility.roadId,
      parentId: facility.roadId,
      position: offsetPoint(facility.yard.center, index % 2 === 0 ? 4 : -4, index % 3 === 0 ? 3 : -3),
      roadIds: [facility.roadId],
      buildingIds: [facility.buildingId],
      publicSpaceIds: [],
      environmentalZoneIds: [facility.id, ...findNearbyUrbanHeatZoneIds(input.urbanHeatZones, facility.center, 150)].slice(0, 4),
      coverageRadiusMeters: 95 + (index % 2) * 15,
      status: index === AIR_SENSOR_LIMIT - 1 ? 'degraded' : 'online',
      metrics: ['air-pm25', 'air-no2']
    }));
}

function createSensor(
  seed: SensorSeed,
  input: SensorIotGeneratorInput,
  index: number,
  telecomNode: UtilityNode | undefined,
  maintenanceOperationIds: readonly CityId[]
): SensorContract {
  const id = createSensorId(seed.sensorKind, seed.parentId, index);
  const coverage = createCoverage(seed, input);
  const privacy = createPrivacy(seed.sensorKind);

  return {
    id,
    kind: 'sensor',
    ownerDomain: 'operations',
    parentId: seed.parentId,
    lod: 'lod3',
    tags: {
      sensorKind: seed.sensorKind,
      privacyRisk: privacy.privacyRisk,
      visibility: privacy.visibility
    },
    sensorKind: seed.sensorKind,
    mountKind: seed.mountKind,
    position: seed.position,
    mountedObjectId: seed.mountedObjectId,
    assetInventoryRecordId: seed.assetInventoryRecordId,
    telecomNodeId: telecomNode?.id ?? 'missing-telecom-node',
    telecomNetworkZoneId: telecomNode?.telecom?.networkZoneId ?? 'missing-telecom-network-zone',
    utilityNodeId: seed.utilityNodeId,
    coverage,
    telemetryStreams: seed.metrics.map((metric, metricIndex) => createTelemetryStream(id, metric, seed.sensorKind, metricIndex)),
    operations: {
      ownerEntityId: OWNER_ENTITY_ID,
      responsibleDepartmentId: RESPONSIBLE_DEPARTMENT_ID,
      status: seed.status,
      batteryBackupHours: getBatteryBackupHours(seed.sensorKind),
      lastCalibrationDay: 35 + (index % 60),
      nextCalibrationDay: 210 + (index % 90),
      maintenanceOperationIds
    },
    privacy,
    environmentFeed: {
      feedsAirQuality: seed.sensorKind === 'air-quality-sensor',
      feedsWeather: seed.sensorKind === 'weather-station',
      feedsOperations: true,
      confidence: roundRatio(coverage.coveredObjectIds.length / Math.max(1, coverage.coveredObjectIds.length + 2))
    }
  };
}

function createCoverage(seed: SensorSeed, input: SensorIotGeneratorInput): SensorContract['coverage'] {
  const nearbyRoadIds = findNearbyRoadIds(input.roads, seed.position, seed.coverageRadiusMeters);
  const nearbyBuildingIds = findNearbyBuildingIds(input.buildings, seed.position, seed.coverageRadiusMeters);
  const nearbyPublicSpaceIds = findNearbyPublicSpaceIds(input, seed.position, seed.coverageRadiusMeters);
  const roadIds = uniqueIds([...seed.roadIds, ...nearbyRoadIds]).slice(0, 12);
  const buildingIds = uniqueIds([...seed.buildingIds, ...nearbyBuildingIds]).slice(0, 24);
  const publicSpaceIds = uniqueIds([...seed.publicSpaceIds, ...nearbyPublicSpaceIds]).slice(0, 12);
  const environmentalZoneIds = uniqueIds(seed.environmentalZoneIds).slice(0, 8);

  return {
    center: seed.position,
    radiusMeters: seed.coverageRadiusMeters,
    coveredObjectIds: uniqueIds([seed.mountedObjectId, ...roadIds, ...buildingIds, ...publicSpaceIds, ...environmentalZoneIds]),
    roadIds,
    buildingIds,
    publicSpaceIds,
    environmentalZoneIds
  };
}

function createTelemetryStream(
  sensorId: CityId,
  metric: SensorTelemetryMetric,
  sensorKind: SensorKind,
  metricIndex: number
): SensorTelemetryStreamContract {
  return {
    streamId: `telemetry-stream-${sensorId}-${metric}`,
    metric,
    unit: getMetricUnit(metric),
    cadenceSeconds: getMetricCadenceSeconds(metric),
    retentionDays: sensorKind === 'camera' ? 7 : sensorKind === 'utility-meter' ? 90 : 30,
    destinationTopic: `telemetry-topic:${sensorKind}:${metricIndex}`,
    sampleQuality: {
      confidence: sensorKind === 'camera' ? 0.82 : sensorKind === 'weather-station' ? 0.91 : 0.87,
      missingDataPct: sensorKind === 'utility-meter' ? 0.02 : 0.01
    }
  };
}

function createPrivacy(sensorKind: SensorKind): SensorPrivacyContract {
  if (sensorKind === 'camera') {
    return {
      capturesPersonalData: true,
      aggregation: 'anonymized',
      visibility: 'safety-restricted',
      retentionDays: 7,
      redactionRequired: true,
      privacyRisk: 'high'
    };
  }
  if (sensorKind === 'pedestrian-counter' || sensorKind === 'traffic-counter') {
    return {
      capturesPersonalData: false,
      aggregation: 'count-only',
      visibility: 'public-aggregate',
      retentionDays: 30,
      redactionRequired: false,
      privacyRisk: 'medium'
    };
  }
  return {
    capturesPersonalData: false,
    aggregation: 'count-only',
    visibility: sensorKind === 'utility-meter' ? 'operations-restricted' : 'public-aggregate',
    retentionDays: sensorKind === 'utility-meter' ? 90 : 30,
    redactionRequired: false,
    privacyRisk: sensorKind === 'utility-meter' ? 'medium' : 'low'
  };
}

function collectMaintenanceIdsByAssetRecordId(
  maintenanceOperations: readonly MaintenanceOperation[]
): ReadonlyMap<CityId, readonly CityId[]> {
  const result = new Map<CityId, CityId[]>();
  for (const operation of maintenanceOperations) {
    result.set(operation.assetInventoryRecordId, [...(result.get(operation.assetInventoryRecordId) ?? []), operation.id]);
  }
  return result;
}

function findNearbyRoadIds(roads: readonly RoadSegment[], point: Point2D, radiusMeters: number): CityId[] {
  return roads
    .filter((road) => distance(point, road.center) <= radiusMeters)
    .sort((first, second) => distance(point, first.center) - distance(point, second.center) || first.id.localeCompare(second.id))
    .map((road) => road.id);
}

function findNearbyBuildingIds(buildings: readonly BuildingPlan[], point: Point2D, radiusMeters: number): CityId[] {
  return buildings
    .filter((building) => distance(point, building.center) <= radiusMeters)
    .sort((first, second) => distance(point, first.center) - distance(point, second.center) || first.id.localeCompare(second.id))
    .map((building) => building.id);
}

function findNearbyPublicSpaceIds(input: SensorIotGeneratorInput, point: Point2D, radiusMeters: number): CityId[] {
  return [
    ...input.parks.filter((park) => distance(point, park.center) <= radiusMeters).map((park) => park.id),
    ...input.plazaZones.filter((plaza) => distance(point, plaza.center) <= radiusMeters).map((plaza) => plaza.id),
    ...input.waterfrontOpenSpaces.filter((openSpace) => distance(point, openSpace.center) <= radiusMeters).map((openSpace) => openSpace.id)
  ].sort();
}

function findNearbyUrbanHeatZoneIds(
  zones: readonly UrbanHeatZone[],
  point: Point2D,
  radiusMeters: number
): CityId[] {
  return zones
    .filter((zone) => distance(point, zone.center) <= radiusMeters)
    .sort((first, second) => distance(point, first.center) - distance(point, second.center) || first.id.localeCompare(second.id))
    .map((zone) => zone.id)
    .slice(0, 4);
}

function findNearestRoadId(roads: readonly RoadSegment[], point: Point2D): CityId {
  return [...roads].sort((first, second) => distance(point, first.center) - distance(point, second.center))[0]?.id ?? 'missing-road';
}

function createSensorId(kind: SensorKind, parentId: CityId, index: number): CityId {
  return `sensor-${kind}-${parentId.replace(/[^a-zA-Z0-9-]+/g, '-')}-${index}`;
}

function getMetricUnit(metric: SensorTelemetryMetric): string {
  switch (metric) {
    case 'air-no2':
    case 'air-pm25':
      return 'ug/m3';
    case 'humidity':
      return 'percent';
    case 'people-count':
    case 'vehicle-count':
    case 'video-analytics':
      return 'count';
    case 'rainfall':
      return 'mm';
    case 'temperature':
      return 'celsius';
    case 'utility-load':
      return 'normalized-load';
  }
}

function getMetricCadenceSeconds(metric: SensorTelemetryMetric): number {
  switch (metric) {
    case 'video-analytics':
      return 5;
    case 'people-count':
    case 'vehicle-count':
      return 30;
    case 'air-no2':
    case 'air-pm25':
    case 'humidity':
    case 'rainfall':
    case 'temperature':
      return 60;
    case 'utility-load':
      return 300;
  }
}

function getBatteryBackupHours(kind: SensorKind): number {
  switch (kind) {
    case 'camera':
      return 8;
    case 'utility-meter':
      return 12;
    case 'weather-station':
      return 10;
    default:
      return 6;
  }
}

function offsetPoint(point: Point2D, x: number, z: number): Point2D {
  return { x: point.x + x, z: point.z + z };
}

function distance(first: Point2D, second: Point2D): number {
  return Math.hypot(first.x - second.x, first.z - second.z);
}

function compareById(first: { readonly id: CityId }, second: { readonly id: CityId }): number {
  return first.id.localeCompare(second.id);
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids.filter(Boolean))];
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}
