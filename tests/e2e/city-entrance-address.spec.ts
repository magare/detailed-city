import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { countProceduralSeedDomainObjects, createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('entrance and address objects are deterministic, indexed, diagnosed, and exported', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });
  const loadingBuildings = firstCity.buildings.filter((building) =>
    building.typology.serviceAccess === 'curb-loading' || building.typology.serviceAccess === 'yard-loading'
  );

  expect(firstCity.buildingEntrances.map(getEntranceSignature)).toEqual(secondCity.buildingEntrances.map(getEntranceSignature));
  expect(firstCity.addressPoints.map(getAddressSignature)).toEqual(secondCity.addressPoints.map(getAddressSignature));
  expect(firstCity.addressPoints).toHaveLength(firstCity.buildings.length);
  expect(firstCity.buildingEntrances.filter((entrance) => entrance.entranceKind === 'public-door')).toHaveLength(firstCity.buildings.length);
  expect(firstCity.buildingEntrances.filter((entrance) => entrance.entranceKind === 'lobby')).toHaveLength(firstCity.buildings.length);
  expect(firstCity.buildingEntrances.filter((entrance) => entrance.entranceKind === 'ramp')).toHaveLength(firstCity.buildings.length);
  expect(firstCity.buildingEntrances.filter((entrance) => entrance.entranceKind === 'service-entry')).toHaveLength(firstCity.buildings.length);
  expect(firstCity.buildingEntrances.filter((entrance) => entrance.entranceKind === 'loading-door')).toHaveLength(loadingBuildings.length);
  expect(firstCity.buildings.every((building) => building.publicEntranceIds.some((id) => firstCity.objectIndex.objectsById[id]?.kind === 'building-entrance'))).toBe(true);
  expect(firstCity.buildings.every((building) => (building.addressPointIds ?? []).length > 0)).toBe(true);
  expect(loadingBuildings.every((building) => (building.loadingEntranceIds ?? []).length > 0)).toBe(true);
  expect(firstCity.objectIndex.countsByKind['building-entrance']).toBe(firstCity.buildingEntrances.length);
  expect(firstCity.objectIndex.countsByKind['address-point']).toBe(firstCity.addressPoints.length);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'zoning')).toEqual([]);
  expect(diagnostics.buildingAccess).toMatchObject({
    entrances: firstCity.buildingEntrances.length,
    addressPoints: firstCity.addressPoints.length,
    buildingsWithAddresses: firstCity.buildings.length,
    buildingsWithAccessiblePublicEntrances: firstCity.buildings.length,
    loadingDoors: loadingBuildings.length
  });
  expect(overlays.find((overlay) => overlay.id === 'building-access')?.featureCount).toBe(
    firstCity.buildingEntrances.length + firstCity.addressPoints.length
  );
  expect(exportArtifact.domainSectionCounts.buildingEntrances).toBe(firstCity.buildingEntrances.length);
  expect(exportArtifact.domainSectionCounts.addressPoints).toBe(firstCity.addressPoints.length);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);
});

test('entrance and address validation catches missing public, service, loading, and address access', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstEntrance, secondEntrance, ...remainingEntrances] = city.buildingEntrances;
  const [firstAddress, ...remainingAddresses] = city.addressPoints;
  const firstBuilding = city.buildings.find((building) =>
    building.typology.serviceAccess === 'curb-loading' || building.typology.serviceAccess === 'yard-loading'
  ) ?? city.buildings[0];
  const invalidEntrance = {
    ...firstEntrance,
    widthMeters: 0,
    door: { ...firstEntrance.door, clearWidthMeters: 0 },
    buildingId: 'missing-building',
    addressPointId: 'missing-address-point',
    activeFrontageIds: ['missing-active-frontage'],
    serviceAccessCorridorIds: ['missing-service-access-corridor'],
    accessible: false,
    stepFree: false
  };
  const invalidLoadingEntrance = {
    ...secondEntrance,
    entranceKind: 'loading-door' as const,
    serviceAccessCorridorIds: [],
    loading: {
      loadingBays: 0,
      clearHeightMeters: 0
    }
  };
  const invalidAddress = {
    ...firstAddress,
    streetName: '',
    buildingNumber: '',
    postalCode: '',
    entranceIds: ['missing-entrance'],
    activeFrontageIds: ['missing-active-frontage']
  };
  const invalidBuilding = {
    ...firstBuilding,
    publicEntranceIds: [],
    entranceIds: ['missing-entrance'],
    serviceEntranceIds: [],
    loadingEntranceIds: [],
    addressPointIds: []
  };
  const invalidCity = {
    ...city,
    buildingEntrances: [invalidEntrance, invalidLoadingEntrance, ...remainingEntrances],
    addressPoints: [invalidAddress, ...remainingAddresses],
    buildings: city.buildings.map((building) => (building.id === invalidBuilding.id ? invalidBuilding : building)),
    activeFrontages: city.activeFrontages.map((frontage, index) =>
      index === 0 ? { ...frontage, publicEntranceIds: ['missing-public-entrance'] } : frontage
    )
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-building-entrance-${firstEntrance.id}-invalid-door-geometry`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-building-entrance-${firstEntrance.id}-missing-building-missing-building`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-building-entrance-${firstEntrance.id}-missing-address-point-missing-address-point`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-building-entrance-${firstEntrance.id}-public-entry-not-accessible`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-building-entrance-${secondEntrance.id}-invalid-loading-door`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-address-point-${firstAddress.id}-missing-address-fields`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-address-point-${firstAddress.id}-missing-entrance-missing-entrance`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-building-${firstBuilding.id}-missing-accessible-public-entrance`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-building-${firstBuilding.id}-missing-address-point`, category: 'zoning' }),
      expect.objectContaining({ id: `invalid-building-${firstBuilding.id}-missing-service-entrance`, category: 'zoning' })
    ])
  );
});

test('entrance and address diagnostics are visible in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    entrances: window.cityDiagnostics?.buildingAccess.entrances,
    addressPoints: window.cityDiagnostics?.buildingAccess.addressPoints,
    buildingAccessOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'building-access')?.featureCount,
    panelText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.entrances).toBeGreaterThan(0);
  expect(diagnostics.addressPoints).toBeGreaterThan(0);
  expect(diagnostics.buildingAccessOverlay).toBe((diagnostics.entrances ?? 0) + (diagnostics.addressPoints ?? 0));
  expect(diagnostics.panelText).toContain('Entrances');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getEntranceSignature(entrance: ReturnType<CityGenerator['generate']>['buildingEntrances'][number]) {
  return {
    id: entrance.id,
    entranceKind: entrance.entranceKind,
    accessLevel: entrance.accessLevel,
    buildingId: entrance.buildingId,
    parcelId: entrance.parcelId,
    roadId: entrance.roadId,
    sidewalkId: entrance.sidewalkId,
    activeFrontageIds: entrance.activeFrontageIds,
    serviceAccessCorridorIds: entrance.serviceAccessCorridorIds,
    addressPointId: entrance.addressPointId,
    position: entrance.position,
    frontageSide: entrance.frontageSide,
    widthMeters: entrance.widthMeters,
    accessible: entrance.accessible,
    stepFree: entrance.stepFree,
    door: entrance.door,
    lobby: entrance.lobby,
    ramp: entrance.ramp,
    loading: entrance.loading
  };
}

function getAddressSignature(addressPoint: ReturnType<CityGenerator['generate']>['addressPoints'][number]) {
  return {
    id: addressPoint.id,
    buildingId: addressPoint.buildingId,
    parcelId: addressPoint.parcelId,
    roadId: addressPoint.roadId,
    position: addressPoint.position,
    streetName: addressPoint.streetName,
    buildingNumber: addressPoint.buildingNumber,
    unitRange: addressPoint.unitRange,
    postalCode: addressPoint.postalCode,
    entranceIds: addressPoint.entranceIds,
    activeFrontageIds: addressPoint.activeFrontageIds,
    primary: addressPoint.primary
  };
}
