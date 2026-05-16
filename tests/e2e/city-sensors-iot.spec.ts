import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { countProceduralSeedDomainObjects, createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { createCityPickingMetadataCatalog } from '../../src/city/rendering-handoff/picking/pickingMetadata';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { Sensor } from '../../src/types/city';

test('sensors and IoT streams are deterministic, indexed, exported, and inspectable', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const picking = createCityPickingMetadataCatalog(firstCity, traffic, runtimeIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });

  expect(
    firstCity.sensors.map((sensor) => [
      sensor.id,
      sensor.sensorKind,
      sensor.mountedObjectId,
      sensor.telecomNodeId,
      sensor.telemetryStreams.map((stream) => stream.metric).join(','),
      sensor.coverage.coveredObjectIds.length,
      sensor.privacy.visibility,
      sensor.environmentFeed.feedsAirQuality,
      sensor.environmentFeed.feedsWeather
    ])
  ).toEqual(
    secondCity.sensors.map((sensor) => [
      sensor.id,
      sensor.sensorKind,
      sensor.mountedObjectId,
      sensor.telecomNodeId,
      sensor.telemetryStreams.map((stream) => stream.metric).join(','),
      sensor.coverage.coveredObjectIds.length,
      sensor.privacy.visibility,
      sensor.environmentFeed.feedsAirQuality,
      sensor.environmentFeed.feedsWeather
    ])
  );

  expect(firstCity.sensors).toHaveLength(41);
  expect(firstCity.objectIndex.countsByKind.sensor).toBe(41);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'operations')).toEqual([]);
  expect(diagnostics.sensorsIot).toMatchObject({
    total: 41,
    byKind: {
      'air-quality-sensor': 6,
      camera: 10,
      'pedestrian-counter': 8,
      'traffic-counter': 6,
      'utility-meter': 8,
      'weather-station': 3
    },
    byStatus: {
      degraded: 7,
      offline: 0,
      online: 34
    },
    telemetryStreams: 53,
    telecomBackhaulNodes: 7,
    sensorsWithInventoryLink: 18,
    sensorsWithMaintenanceLink: 7,
    coverageRoads: 24,
    coverageBuildings: 257,
    coveragePublicSpaces: 11,
    environmentalZoneRefs: 15,
    privacySensitiveSensors: 10,
    redactionRequiredSensors: 10,
    publicAggregateSensors: 23,
    operationsRestrictedSensors: 8,
    airQualityFeeds: 6,
    weatherFeeds: 3,
    operationsFeeds: 41,
    averageCoverageRadiusMeters: 63.9,
    averageFeedConfidence: 0.88
  });
  expect(diagnostics.objectCounts).toMatchObject({
    sensors: 41,
    sensorKinds: 6,
    sensorTelemetryStreams: 53,
    sensorCoverageRoads: 24,
    sensorCoverageBuildings: 257,
    airQualitySensors: 6,
    weatherStationSensors: 3,
    privacySensitiveSensors: 10,
    sensorsWithTelecomBackhaul: 7
  });
  expect(overlays.find((overlay) => overlay.id === 'sensors-iot')?.featureCount).toBe(41);
  expect(runtimeIndex.countsByKind.sensor).toBe(41);
  expect(picking.countsByKind.sensor).toBe(41);
  expect(exportArtifact.domainSectionCounts.sensors).toBe(41);
  expect(exportArtifact.city.sensors).toHaveLength(41);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);

  const airSensor = firstCity.sensors.find((sensor) => sensor.sensorKind === 'air-quality-sensor');
  const camera = firstCity.sensors.find((sensor) => sensor.sensorKind === 'camera');
  const weatherStation = firstCity.sensors.find((sensor) => sensor.sensorKind === 'weather-station');

  expect(airSensor).toMatchObject({
    kind: 'sensor',
    ownerDomain: 'operations',
    environmentFeed: {
      feedsAirQuality: true,
      feedsOperations: true
    }
  });
  expect(airSensor?.coverage.environmentalZoneIds.length).toBeGreaterThan(0);
  expect(camera).toMatchObject({
    privacy: {
      capturesPersonalData: true,
      redactionRequired: true,
      visibility: 'safety-restricted'
    }
  });
  expect(weatherStation).toMatchObject({
    environmentFeed: {
      feedsWeather: true,
      feedsOperations: true
    }
  });
});

test('sensor validation catches missing references, coverage, telemetry, privacy, and feed metadata', () => {
  const city = new CityGenerator(cityConfig).generate();
  const sensor = city.sensors.find((candidate) => candidate.sensorKind === 'camera');

  expect(sensor).toBeDefined();

  const invalidSensor = {
    ...sensor!,
    sensorKind: 'invalid-kind',
    mountKind: 'invalid-mount',
    parentId: 'missing-parent',
    mountedObjectId: 'missing-mounted-object',
    position: { x: Number.NaN, z: Number.NaN },
    assetInventoryRecordId: 'missing-asset-record',
    telecomNodeId: 'missing-telecom-node',
    telecomNetworkZoneId: 'missing-zone',
    utilityNodeId: 'missing-utility-node',
    coverage: {
      center: { x: Number.NaN, z: Number.NaN },
      radiusMeters: 0,
      coveredObjectIds: ['missing-covered-object'],
      roadIds: ['missing-road'],
      buildingIds: ['missing-building'],
      publicSpaceIds: ['missing-public-space'],
      environmentalZoneIds: ['missing-environment-zone']
    },
    telemetryStreams: [
      {
        streamId: 'telemetry-stream-invalid',
        metric: 'invalid-metric',
        unit: '',
        cadenceSeconds: 0,
        retentionDays: 0,
        destinationTopic: '',
        sampleQuality: {
          confidence: 2,
          missingDataPct: -1
        }
      }
    ],
    operations: {
      ownerEntityId: '',
      responsibleDepartmentId: '',
      status: 'invalid-status',
      batteryBackupHours: -1,
      lastCalibrationDay: 20,
      nextCalibrationDay: 10,
      maintenanceOperationIds: ['missing-maintenance-operation']
    },
    privacy: {
      capturesPersonalData: true,
      aggregation: 'raw',
      visibility: 'public-aggregate',
      retentionDays: 0,
      redactionRequired: false,
      privacyRisk: 'invalid-risk'
    },
    environmentFeed: {
      feedsAirQuality: false,
      feedsWeather: false,
      feedsOperations: false,
      confidence: 2
    }
  } as unknown as Sensor;
  const invalidCity = {
    ...city,
    sensors: city.sensors.map((candidate) => (candidate.id === invalidSensor.id ? invalidSensor : candidate))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const issueIds = validation.issues.map((issue) => issue.id);

  expect(validation.passed).toBe(false);
  expect(issueIds).toEqual(
    expect.arrayContaining([
      `sensor-invalid-kind-${invalidSensor.id}`,
      `sensor-invalid-mount-${invalidSensor.id}`,
      `sensor-missing-mounted-object-${invalidSensor.id}`,
      `sensor-invalid-position-${invalidSensor.id}`,
      `sensor-missing-asset-inventory-${invalidSensor.id}`,
      `sensor-missing-telecom-node-${invalidSensor.id}`,
      `sensor-missing-utility-node-${invalidSensor.id}`,
      `sensor-invalid-coverage-${invalidSensor.id}`,
      `sensor-missing-coverage-object-missing-covered-object-${invalidSensor.id}`,
      `sensor-missing-road-missing-road-${invalidSensor.id}`,
      `sensor-missing-building-missing-building-${invalidSensor.id}`,
      `sensor-missing-public-space-missing-public-space-${invalidSensor.id}`,
      `sensor-missing-environment-zone-missing-environment-zone-${invalidSensor.id}`,
      `sensor-invalid-telemetry-telemetry-stream-invalid-${invalidSensor.id}`,
      `sensor-invalid-privacy-${invalidSensor.id}`,
      `sensor-invalid-operations-${invalidSensor.id}`,
      `sensor-missing-maintenance-operation-missing-maintenance-operation-${invalidSensor.id}`,
      `sensor-invalid-feed-${invalidSensor.id}`
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
