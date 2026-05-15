import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('water transport access is deterministic and links ferry, port, helipad, and routing hooks', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const accessSignature = firstCity.waterTransportAccess.map((access) => [
    access.id,
    access.accessKind,
    access.arrivalMode,
    access.waterwayId,
    access.dockId,
    access.freightRouteId,
    access.emergencyServiceAnchorId,
    access.routing.navigationNodeIds.join(',')
  ]);

  expect(accessSignature).toEqual(
    secondCity.waterTransportAccess.map((access) => [
      access.id,
      access.accessKind,
      access.arrivalMode,
      access.waterwayId,
      access.dockId,
      access.freightRouteId,
      access.emergencyServiceAnchorId,
      access.routing.navigationNodeIds.join(',')
    ])
  );
  expect(firstCity.waterTransportAccess.map((access) => access.id)).toEqual([
    'water-transport-access-ferry-stop',
    'water-transport-access-ferry-pier',
    'water-transport-access-service-dock',
    'water-transport-access-small-port',
    'water-transport-access-port-logistics-edge',
    'water-transport-access-emergency-helipad'
  ]);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('water-transport-access'))).toEqual([]);
  expect(firstCity.objectIndex.countsByKind['water-transport-access']).toBe(6);
  expect(firstCity.waterTransportAccess.every((access) => access.ownerDomain === 'mobility')).toBe(true);
  expect(firstCity.waterTransportAccess.every((access) => access.renderBindingId === 'binding:water-transport:access')).toBe(true);
  expect(firstCity.waterTransportAccess.every((access) => access.routing.navigationNodeIds.length > 0)).toBe(true);
  expect(firstCity.waterTransportAccess.every((access) => access.routing.navigationEdgeIds.length > 0)).toBe(true);
  expect(firstCity.waterTransportAccess.every((access) => access.routing.connectedRoadIds.length > 0)).toBe(true);
  expect(firstCity.waterTransportAccess.filter((access) => access.accessKind !== 'emergency-helipad').every((access) => access.dockId)).toBe(true);
  expect(firstCity.waterTransportAccess.find((access) => access.accessKind === 'emergency-helipad')).toMatchObject({
    arrivalMode: 'helicopter',
    constraints: expect.objectContaining({ emergencyPriority: true, requiredClearanceMeters: 24 })
  });
  expect(firstCity.waterTransportAccess.find((access) => access.accessKind === 'port-logistics-edge')).toMatchObject({
    arrivalMode: 'freight-barge',
    capacity: expect.objectContaining({ cargoTonnesPerDay: 160 })
  });
  expect(diagnostics.waterTransportAccess).toMatchObject({
    total: 6,
    accessKinds: 6,
    arrivalModes: 5,
    ferryAccessPoints: 2,
    portLogisticsAccessPoints: 2,
    emergencyHelipads: 1,
    berths: 13,
    passengersPerHour: 616,
    cargoTonnesPerDay: 332,
    emergencySlotsPerHour: 14,
    emergencyPriorityAccess: 3,
    nightOperationsAccess: 5
  });
  expect(diagnostics.objectCounts).toMatchObject({
    waterTransportAccess: 6,
    ferryAccessPoints: 2,
    portLogisticsAccessPoints: 2,
    emergencyHelipads: 1,
    waterTransportBerths: 13,
    waterTransportPassengersPerHour: 616,
    waterTransportCargoTonnesPerDay: 332,
    waterTransportEmergencySlotsPerHour: 14
  });
  expect(diagnostics.importExport.proceduralSeedExport.domainSectionCounts.waterTransportAccess).toBe(6);
  const waterTransportOverlay = overlays.find((overlay) => overlay.id === 'water-transport-access');
  expect(waterTransportOverlay?.featureCount).toBe(6);
  expect(waterTransportOverlay?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'water-transport-access',
        ownerDomain: 'mobility',
        geometry: { type: 'polygon', points: expect.any(Array) },
        metadata: expect.objectContaining({
          accessKind: 'emergency-helipad',
          arrivalMode: 'helicopter',
          emergencyPriority: true
        })
      })
    ])
  );
});

test('water transport validation catches broken arrival, transfer, and routing references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseAccess = city.waterTransportAccess.find((access) => access.accessKind === 'ferry-stop');
  expect(baseAccess).toBeDefined();
  const invalidAccess = {
    ...baseAccess!,
    waterwayId: 'missing-waterway',
    dockId: 'missing-dock',
    waterfrontEdgeId: 'missing-waterfront-edge',
    waterfrontOpenSpaceId: 'missing-waterfront-open-space',
    roadId: 'missing-road',
    capacity: {
      ...baseAccess!.capacity,
      berths: 0,
      passengersPerHour: -1
    },
    constraints: {
      ...baseAccess!.constraints,
      maxVesselLengthMeters: 0,
      minChannelWidthMeters: 0,
      requiredClearanceMeters: 0,
      maxApproachGradePercent: 0
    },
    routing: {
      navigationNodeIds: ['missing-node'],
      navigationEdgeIds: ['missing-edge'],
      connectedRoadIds: ['missing-road'],
      connectedWaterwayComponentIds: ['missing-component'],
      transferObjectIds: ['missing-transfer']
    },
    renderBindingId: 'missing-binding'
  };
  const invalidCity = {
    ...city,
    waterTransportAccess: city.waterTransportAccess.map((access) =>
      access.id === invalidAccess.id ? invalidAccess : access
    )
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `water-transport-access-invalid-capacity-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-invalid-arrival-constraints-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-waterway-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-invalid-vessel-constraints-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-dock-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-waterfront-edge-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-waterfront-open-space-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-road-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-navigation-node-missing-node-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-navigation-edge-missing-edge-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-connected-road-missing-road-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-transfer-object-missing-transfer-${invalidAccess.id}`, category: 'graph' }),
      expect.objectContaining({ id: `water-transport-access-missing-render-binding-${invalidAccess.id}`, category: 'graph' })
    ])
  );
});

test('browser diagnostics expose water transport access and rendered markers', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => Boolean(window.cityDiagnostics?.waterTransportAccess));

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    access: window.cityDiagnostics?.waterTransportAccess.total,
    ferry: window.cityDiagnostics?.waterTransportAccess.ferryAccessPoints,
    helipads: window.cityDiagnostics?.waterTransportAccess.emergencyHelipads,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'water-transport-access')?.featureCount,
    pickable: window.cityDiagnostics?.picking.countsByKind['water-transport-access'],
    panelText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? '',
    sceneHasWaterTransport: Boolean(
      (
        window.cityApp as unknown as { city?: { group: { getObjectByName(name: string): unknown } } } | undefined
      )?.city?.group.getObjectByName('WaterTransportAccess')
    )
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.access).toBe(6);
  expect(diagnostics.ferry).toBe(2);
  expect(diagnostics.helipads).toBe(1);
  expect(diagnostics.overlayFeatures).toBe(6);
  expect(diagnostics.pickable).toBe(6);
  expect(diagnostics.panelText).toContain('Water Transport');
  expect(diagnostics.panelText).toContain('6 access, 2 ferry, 1 helipad');
  expect(diagnostics.sceneHasWaterTransport).toBe(true);
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
