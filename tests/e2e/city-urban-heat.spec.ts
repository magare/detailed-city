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

test('urban heat zones are deterministic, indexed, and exported', () => {
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
    firstCity.urbanHeatZones.map((zone) => [
      zone.id,
      zone.zoneKind,
      zone.riskLevel,
      zone.heatRiskScore,
      zone.mitigationEffectScore,
      zone.weatherPresetId
    ])
  ).toEqual(
    secondCity.urbanHeatZones.map((zone) => [
      zone.id,
      zone.zoneKind,
      zone.riskLevel,
      zone.heatRiskScore,
      zone.mitigationEffectScore,
      zone.weatherPresetId
    ])
  );
  expect(firstCity.urbanHeatZones).toHaveLength(17);
  expect(firstCity.objectIndex.countsByKind['urban-heat-zone']).toBe(17);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'environment')).toEqual([]);
  expect(firstCity.urbanHeatZones.map((zone) => zone.zoneKind)).toEqual(
    expect.arrayContaining(['heat-island', 'cool-roof', 'canopy-cooling', 'water-cooling', 'public-route-risk'])
  );
  expect(firstCity.objectIndex.objectsById['urban-heat-heat-island-0']).toMatchObject({
    kind: 'urban-heat-zone',
    ownerDomain: 'environment',
    parentObjectId: 'district-downtown',
    weatherPresetId: 'weather-preset-coastal-clear',
    riskLevel: 'high'
  });
  expect(diagnostics.urbanHeat).toMatchObject({
    total: 17,
    heatIslandZones: 5,
    coolRoofZones: 4,
    canopyCoolingZones: 3,
    waterCoolingZones: 3,
    publicRouteRiskZones: 2,
    highRiskZones: 1,
    criticalRiskZones: 0,
    maxDaytimeTemperatureDeltaCelsius: 5.3
  });
  expect(diagnostics.urbanHeat.averageMitigationEffectScore).toBeGreaterThan(0.45);
  expect(diagnostics.objectCounts).toMatchObject({
    urbanHeatZones: 17,
    urbanHeatHighRiskZones: 1,
    urbanHeatPublicRouteRiskZones: 2
  });
  expect(overlays.find((overlay) => overlay.id === 'urban-heat')?.featureCount).toBe(17);
  expect(exportArtifact.domainSectionCounts.urbanHeatZones).toBe(17);
  expect(exportArtifact.city.urbanHeatZones).toHaveLength(17);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);
});

test('urban heat validation catches invalid values and unmitigated public route risk', () => {
  const city = new CityGenerator(cityConfig).generate();
  const routeZone = city.urbanHeatZones.find((zone) => zone.zoneKind === 'public-route-risk');
  expect(routeZone).toBeTruthy();

  const invalidZone = {
    ...routeZone!,
    parentObjectId: 'missing-parent',
    weatherPresetId: 'missing-weather',
    boundary: [],
    surfaceAlbedo: 1.3,
    heatRiskScore: 0.82,
    routeExposureScore: 0.91,
    mitigationEffectScore: 0.1,
    references: {
      ...routeZone!.references,
      roadIds: [],
      treeIds: ['missing-tree'],
      solarShadingSampleIds: ['missing-solar'],
      hazardZoneIds: ['missing-hazard']
    }
  };
  const invalidCity = {
    ...city,
    urbanHeatZones: city.urbanHeatZones.map((zone) => (zone.id === invalidZone.id ? invalidZone : zone))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const issueIds = validation.issues.map((issue) => issue.id);

  expect(validation.passed).toBe(false);
  expect(issueIds).toEqual(
    expect.arrayContaining([
      `urban-heat-missing-parent-object-${invalidZone.id}`,
      `urban-heat-missing-weather-preset-${invalidZone.id}`,
      `urban-heat-invalid-values-${invalidZone.id}`,
      `urban-heat-missing-tree-reference-${invalidZone.id}`,
      `urban-heat-missing-solar-reference-${invalidZone.id}`,
      `urban-heat-missing-hazard-reference-${invalidZone.id}`,
      `urban-heat-missing-high-risk-route-${invalidZone.id}`,
      `urban-heat-unmitigated-public-route-risk-${invalidZone.id}`
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
