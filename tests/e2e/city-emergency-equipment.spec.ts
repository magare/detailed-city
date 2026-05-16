import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { createCityPickingMetadataCatalog } from '../../src/city/rendering-handoff/picking/pickingMetadata';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import { MaterialLibrary } from '../../src/rendering/materials/MaterialLibrary';
import { City } from '../../src/world/city/City';

test('emergency equipment is deterministic and covers public spaces with assembly and shelter hooks', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const picking = createCityPickingMetadataCatalog(firstCity, traffic, diagnostics.objectIndex);
  const publicSpaceIds = new Set([
    ...firstCity.parks.map((park) => park.id),
    ...firstCity.plazaZones.map((zone) => zone.id),
    ...firstCity.waterfrontOpenSpaces.map((space) => space.id)
  ]);
  const coveredPublicSpaceIds = new Set(firstCity.emergencyEquipment.flatMap((equipment) => equipment.coverage.coveredPublicSpaceIds));
  const assemblyCoveredPublicSpaceIds = new Set(
    firstCity.emergencyEquipment
      .filter((equipment) => equipment.equipmentKind === 'assembly-area')
      .flatMap((equipment) => equipment.coverage.coveredPublicSpaceIds)
  );

  expect(firstCity.emergencyEquipment.map(getEmergencyEquipmentSignature)).toEqual(
    secondCity.emergencyEquipment.map(getEmergencyEquipmentSignature)
  );
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('emergency-equipment'))).toEqual([]);
  expect(firstCity.objectIndex.countsByKind['emergency-equipment']).toBe(14);
  expect(firstCity.emergencyEquipment.every((equipment) => equipment.ownerDomain === 'civic')).toBe(true);
  expect(firstCity.emergencyEquipment.every((equipment) => equipment.parentId === equipment.emergencyServiceAnchorId)).toBe(true);
  expect([...publicSpaceIds].every((id) => coveredPublicSpaceIds.has(id))).toBe(true);
  expect([...publicSpaceIds].every((id) => assemblyCoveredPublicSpaceIds.has(id))).toBe(true);
  expect(firstCity.emergencyEquipment.some((equipment) => equipment.equipmentKind === 'lifeguard-station' && equipment.waterfrontOpenSpaceId)).toBe(true);
  expect(firstCity.emergencyEquipment.some((equipment) => equipment.equipmentKind === 'shelter-signage' && equipment.signObjectId)).toBe(true);
  expect(firstCity.emergencyEquipment.every((equipment) => equipment.coverage.nearestShelterAnchorId === 'emergency-service-anchor-public-shelter')).toBe(true);
  expect(firstCity.emergencyEquipment.every((equipment) => equipment.coverage.nearestAssemblyPointId.startsWith('emergency-equipment-assembly-area'))).toBe(true);
  expect(firstCity.assetInventoryRecords.filter((record) => record.assetObjectKind === 'emergency-equipment')).toHaveLength(14);
  expect(diagnostics.emergencyEquipment).toMatchObject({
    total: 14,
    equipmentKinds: 8,
    aeds: 2,
    emergencyPhones: 2,
    sirens: 2,
    alarms: 1,
    fireAlarmBoxes: 2,
    assemblyAreas: 3,
    lifeguardStations: 1,
    shelterSignage: 1,
    deviceCount: 15,
    assemblyCapacityPeople: 720,
    audibleDevices: 3,
    coveredPublicSpaces: 17,
    assemblyCoveredPublicSpaces: 17,
    signageLinkedEquipment: 14
  });
  expect(diagnostics.objectCounts).toMatchObject({
    emergencyEquipment: 14,
    emergencyEquipmentKinds: 8,
    emergencyAeds: 2,
    emergencyPhones: 2,
    emergencySirens: 2,
    emergencyAssemblyAreas: 3,
    emergencyAssemblyCapacity: 720,
    emergencyCoveredPublicSpaces: 17,
    emergencyAssemblyCoveredPublicSpaces: 17,
    emergencyShelterSigns: 1
  });
  expect(overlays.find((overlay) => overlay.id === 'emergency-equipment')?.featureCount).toBe(14);
  expect(picking.countsByKind['emergency-equipment']).toBe(14);
});

test('emergency equipment validation catches broken coverage, access, signage, and binding data', () => {
  const city = new CityGenerator(cityConfig).generate();
  const equipment = city.emergencyEquipment.find((candidate) => candidate.equipmentKind === 'lifeguard-station') ?? city.emergencyEquipment[0];

  expect(equipment).toBeDefined();

  const invalidEquipment = {
    ...equipment,
    parentId: 'missing-emergency-anchor',
    emergencyServiceAnchorId: 'missing-emergency-anchor',
    roadId: 'missing-road',
    waterfrontOpenSpaceId: undefined,
    shelterAnchorId: undefined,
    signObjectId: 'missing-sign',
    coverage: {
      ...equipment.coverage,
      radiusMeters: 0,
      coveredPublicSpaceIds: ['missing-public-space'],
      nearestShelterAnchorId: 'missing-shelter',
      nearestAssemblyPointId: 'missing-assembly',
      coverageScore: 0
    },
    capacity: {
      ...equipment.capacity,
      deviceCount: 0,
      assemblyCapacityPeople: 0,
      audibleRadiusMeters: 0
    },
    access: {
      navigationNodeIds: ['missing-node'],
      navigationEdgeIds: ['missing-edge'],
      fireLaneCurbZoneIds: ['missing-curb-zone'],
      signageObjectIds: ['missing-sign'],
      visibleFromPublicSpaceIds: ['missing-public-space']
    },
    renderBindingId: 'missing-binding'
  };
  const invalidCity = {
    ...city,
    emergencyEquipment: city.emergencyEquipment.map((candidate) =>
      candidate.id === invalidEquipment.id ? invalidEquipment : candidate
    )
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `emergency-equipment-missing-emergency-service-anchor-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-road-missing-road-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-invalid-coverage-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-nearest-shelter-missing-shelter-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-nearest-assembly-missing-assembly-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-public-space-missing-public-space-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-navigation-node-missing-node-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-navigation-edge-missing-edge-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-fire-lane-missing-curb-zone-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-signage-missing-sign-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-sign-object-missing-sign-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-waterfront-lifeguard-context-${invalidEquipment.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-equipment-missing-render-binding-${invalidEquipment.id}`, category: 'zoning' })
    ])
  );
});

test('emergency equipment meshes are render-ready and pickable', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const materials = new MaterialLibrary();
  const cityScene = new City(city, traffic, materials);

  try {
    expect(cityScene.group.getObjectByName('EmergencyEquipment')).toBeTruthy();
    expect(cityScene.group.getObjectByName('EmergencyEquipmentDeviceInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('EmergencyEquipmentSirenHeadInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('EmergencyEquipmentAssemblyPadInstances')).toBeTruthy();
    expect(cityScene.group.getObjectByName('EmergencyEquipmentShelterSignInstances')).toBeTruthy();
  } finally {
    cityScene.dispose();
    materials.dispose();
  }
});

test('browser diagnostics expose emergency equipment and public-space coverage', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => Boolean(window.cityDiagnostics?.emergencyEquipment));

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    equipment: window.cityDiagnostics?.emergencyEquipment.total,
    assemblyAreas: window.cityDiagnostics?.emergencyEquipment.assemblyAreas,
    coveredPublicSpaces: window.cityDiagnostics?.emergencyEquipment.coveredPublicSpaces,
    assemblyCoveredPublicSpaces: window.cityDiagnostics?.emergencyEquipment.assemblyCoveredPublicSpaces,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'emergency-equipment')?.featureCount,
    sceneHasEmergencyEquipment: Boolean(
      (
        window.cityApp as unknown as { city?: { group: { getObjectByName(name: string): unknown } } }
      )?.city?.group.getObjectByName('EmergencyEquipment')
    ),
    panelText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.equipment).toBe(14);
  expect(diagnostics.assemblyAreas).toBe(3);
  expect(diagnostics.coveredPublicSpaces).toBe(17);
  expect(diagnostics.assemblyCoveredPublicSpaces).toBe(17);
  expect(diagnostics.overlayFeatures).toBe(14);
  expect(diagnostics.sceneHasEmergencyEquipment).toBe(true);
  expect(diagnostics.panelText).toContain('Equipment');
  expect(diagnostics.panelText).toContain('14 emergency, 3 assembly, 17 spaces');
  expect(errors).toEqual([]);
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    intersections: city.intersections,
    crossings: city.crossings,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}

function getEmergencyEquipmentSignature(equipment: ReturnType<CityGenerator['generate']>['emergencyEquipment'][number]): readonly unknown[] {
  return [
    equipment.id,
    equipment.equipmentKind,
    equipment.emergencyServiceAnchorId,
    equipment.roadId,
    equipment.parkId,
    equipment.plazaZoneId,
    equipment.waterfrontOpenSpaceId,
    equipment.signObjectId,
    equipment.coverage.coveredPublicSpaceIds.join(','),
    equipment.coverage.nearestShelterAnchorId,
    equipment.coverage.nearestAssemblyPointId,
    equipment.capacity.deviceCount,
    equipment.capacity.assemblyCapacityPeople,
    equipment.capacity.audibleRadiusMeters
  ];
}
