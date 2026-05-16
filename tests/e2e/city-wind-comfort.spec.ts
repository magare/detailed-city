import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { countProceduralSeedDomainObjects, createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('wind comfort zones are deterministic, indexed, and exported', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });

  expect(
    firstCity.windComfortZones.map((zone) => [
      zone.id,
      zone.zoneKind,
      zone.riskLevel,
      zone.parentObjectId,
      zone.gustWindSpeedKph,
      zone.pedestrianComfortScore,
      zone.weatherPresetId
    ])
  ).toEqual(
    secondCity.windComfortZones.map((zone) => [
      zone.id,
      zone.zoneKind,
      zone.riskLevel,
      zone.parentObjectId,
      zone.gustWindSpeedKph,
      zone.pedestrianComfortScore,
      zone.weatherPresetId
    ])
  );
  expect(firstCity.windComfortZones).toHaveLength(28);
  expect(firstCity.objectIndex.countsByKind['wind-comfort-zone']).toBe(28);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'environment')).toEqual([]);
  expect(firstCity.windComfortZones.map((zone) => zone.zoneKind)).toEqual(
    expect.arrayContaining([
      'bridge-effect',
      'downdraft-risk',
      'public-space-comfort',
      'sheltered-area',
      'waterfront-exposure',
      'wind-corridor'
    ])
  );
  expect(firstCity.objectIndex.objectsById['wind-comfort-bridge-effect-0']).toMatchObject({
    kind: 'wind-comfort-zone',
    ownerDomain: 'environment',
    zoneKind: 'bridge-effect',
    weatherPresetId: 'weather-preset-coastal-clear',
    pedestrianWarning: true
  });
  expect(diagnostics.windComfort).toMatchObject({
    total: 28,
    windCorridors: 4,
    shelteredAreas: 4,
    downdraftRiskZones: 5,
    bridgeEffectZones: 5,
    waterfrontExposureZones: 4,
    publicSpaceComfortZones: 6
  });
  expect(diagnostics.windComfort.pedestrianWarnings).toBeGreaterThan(0);
  expect(diagnostics.windComfort.maxGustWindSpeedKph).toBeGreaterThan(25);
  expect(diagnostics.objectCounts).toMatchObject({
    windComfortZones: 28,
    windComfortWarnings: diagnostics.windComfort.pedestrianWarnings,
    windComfortShelteredAreas: 4
  });
  expect(overlays.find((overlay) => overlay.id === 'wind-comfort')?.featureCount).toBe(28);
  expect(exportArtifact.domainSectionCounts.windComfortZones).toBe(28);
  expect(exportArtifact.city.windComfortZones).toHaveLength(28);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);
});

test('wind comfort validation catches invalid values, warnings, and references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const bridgeZone = city.windComfortZones.find((zone) => zone.zoneKind === 'bridge-effect');
  expect(bridgeZone).toBeTruthy();

  const invalidZone = {
    ...bridgeZone!,
    parentObjectId: 'missing-parent',
    weatherPresetId: 'missing-weather',
    boundary: [],
    prevailingWindDegrees: 400,
    baseWindSpeedKph: -1,
    gustWindSpeedKph: 170,
    pedestrianComfortScore: 1.3,
    shelterFactor: -0.2,
    accelerationFactor: 0,
    riskLevel: 'windy' as const,
    pedestrianWarning: false,
    references: {
      ...bridgeZone!.references,
      roadIds: [],
      waterwayId: 'missing-waterway',
      waterwayCrossingIds: ['missing-crossing'],
      treeIds: ['missing-tree'],
      solarShadingSampleIds: ['missing-solar']
    }
  };
  const invalidCity = {
    ...city,
    windComfortZones: city.windComfortZones.map((zone) => (zone.id === invalidZone.id ? invalidZone : zone))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const issueIds = validation.issues.map((issue) => issue.id);

  expect(validation.passed).toBe(false);
  expect(issueIds).toEqual(
    expect.arrayContaining([
      `wind-comfort-missing-parent-object-${invalidZone.id}`,
      `wind-comfort-missing-weather-preset-${invalidZone.id}`,
      `wind-comfort-invalid-values-${invalidZone.id}`,
      `wind-comfort-missing-pedestrian-warning-${invalidZone.id}`,
      `wind-comfort-missing-bridge-reference-${invalidZone.id}`,
      `wind-comfort-missing-tree-reference-${invalidZone.id}`,
      `wind-comfort-missing-solar-reference-${invalidZone.id}`,
      `wind-comfort-missing-waterway-crossing-reference-${invalidZone.id}`
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
