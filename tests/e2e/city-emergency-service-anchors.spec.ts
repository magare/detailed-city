import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('emergency service anchors are deterministic dispatch bases with coverage hooks', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const anchorSignature = firstCity.emergencyServiceAnchors.map((anchor) => [
    anchor.id,
    anchor.anchorKind,
    anchor.responseMode,
    anchor.buildingId,
    anchor.roadId,
    anchor.coverage.coveredBuildingFireSafetyProfileIds.length,
    anchor.coverage.estimatedResponseSeconds
  ]);

  expect(anchorSignature).toEqual(
    secondCity.emergencyServiceAnchors.map((anchor) => [
      anchor.id,
      anchor.anchorKind,
      anchor.responseMode,
      anchor.buildingId,
      anchor.roadId,
      anchor.coverage.coveredBuildingFireSafetyProfileIds.length,
      anchor.coverage.estimatedResponseSeconds
    ])
  );
  expect(firstCity.emergencyServiceAnchors.map((anchor) => anchor.id)).toEqual([
    'emergency-service-anchor-fire-station',
    'emergency-service-anchor-police-station',
    'emergency-service-anchor-ambulance-post',
    'emergency-service-anchor-public-shelter',
    'emergency-service-anchor-command-post',
    'emergency-service-anchor-staging-area'
  ]);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('emergency-service-anchor'))).toEqual([]);
  expect(firstCity.objectIndex.countsByKind['emergency-service-anchor']).toBe(6);
  expect(firstCity.emergencyServiceAnchors.every((anchor) => anchor.ownerDomain === 'civic')).toBe(true);
  expect(firstCity.emergencyServiceAnchors.every((anchor) => anchor.parentId === 'civic-anchor-emergency-base')).toBe(true);
  expect(firstCity.emergencyServiceAnchors.every((anchor) => anchor.dispatch.operates24h)).toBe(true);
  expect(firstCity.emergencyServiceAnchors.every((anchor) => anchor.access.navigationNodeIds.length > 0)).toBe(true);
  expect(firstCity.emergencyServiceAnchors.every((anchor) => anchor.access.fireLaneCurbZoneIds.length > 0)).toBe(true);
  expect(firstCity.emergencyServiceAnchors.every((anchor) => anchor.coverage.coveredBuildingFireSafetyProfileIds.length > 0)).toBe(true);
  expect(firstCity.emergencyServiceAnchors.find((anchor) => anchor.anchorKind === 'public-shelter')).toMatchObject({
    responseMode: 'shelter',
    staging: expect.objectContaining({ shelterCapacityPeople: 420 })
  });
  expect(firstCity.emergencyServiceAnchors.find((anchor) => anchor.anchorKind === 'command-post')).toMatchObject({
    staging: expect.objectContaining({ commandPostReady: true })
  });
  expect(diagnostics.emergencyServiceAnchors).toMatchObject({
    total: 6,
    anchorKinds: 6,
    responseModes: 6,
    unitCapacity: 22,
    vehicles: 34,
    responders: 208,
    shelterCapacityPeople: 580,
    commandReadyAnchors: 2
  });
  expect(diagnostics.objectCounts).toMatchObject({
    emergencyServiceAnchors: 6,
    emergencyServiceAnchorKinds: 6,
    emergencyServiceResponseModes: 6,
    emergencyServiceUnits: 22,
    emergencyServiceVehicles: 34,
    emergencyServiceResponders: 208,
    emergencyServiceShelterCapacity: 580,
    emergencyServiceCommandReadyAnchors: 2
  });
  const emergencyOverlay = overlays.find((overlay) => overlay.id === 'emergency-service-anchors');
  expect(emergencyOverlay?.featureCount).toBe(6);
  expect(emergencyOverlay?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'emergency-service-anchor',
        ownerDomain: 'civic',
        geometry: { type: 'point', point: expect.any(Object) },
        metadata: expect.objectContaining({
          anchorKind: 'fire-station',
          responseMode: 'fire',
          vehicles: 5
        })
      })
    ])
  );
});

test('emergency service validation catches broken dispatch and access references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseAnchor = city.emergencyServiceAnchors.find((anchor) => anchor.anchorKind === 'fire-station');
  expect(baseAnchor).toBeDefined();
  const invalidAnchor = {
    ...baseAnchor!,
    civicAnchorId: 'missing-civic-anchor',
    parentId: 'missing-civic-anchor',
    buildingId: 'missing-building',
    parcelId: 'missing-parcel',
    districtId: 'missing-district',
    roadId: 'missing-road',
    serviceAreaBoundaryId: 'missing-service-area',
    dispatch: {
      ...baseAnchor!.dispatch,
      unitCapacity: 0,
      responderCapacity: 0,
      vehiclesAvailable: 0,
      stagingBays: 0,
      operates24h: false
    },
    coverage: {
      ...baseAnchor!.coverage,
      radiusMeters: 0,
      targetDistrictIds: ['missing-district'],
      coveredRoadIds: ['missing-road'],
      coveredBuildingFireSafetyProfileIds: ['missing-profile'],
      estimatedResponseSeconds: 0,
      coverageScore: 0
    },
    access: {
      navigationNodeIds: ['missing-node'],
      navigationEdgeIds: ['missing-edge'],
      fireLaneCurbZoneIds: ['missing-curb-zone'],
      serviceAccessCorridorIds: ['missing-corridor'],
      hydrantNodeIds: ['missing-hydrant']
    },
    renderBindingId: 'missing-binding'
  };
  const invalidCity = {
    ...city,
    emergencyServiceAnchors: city.emergencyServiceAnchors.map((anchor) =>
      anchor.id === invalidAnchor.id ? invalidAnchor : anchor
    )
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `emergency-service-anchor-missing-emergency-civic-anchor-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-building-parcel-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-parcel-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-district-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-road-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-emergency-service-area-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-invalid-dispatch-capacity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-invalid-response-coverage-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-target-district-missing-district-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-covered-road-missing-road-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-fire-safety-profile-missing-profile-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-emergency-navigation-node-missing-node-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-emergency-navigation-edge-missing-edge-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-fire-lane-missing-curb-zone-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-service-access-missing-corridor-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-hydrant-missing-hydrant-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `emergency-service-anchor-missing-render-binding-${invalidAnchor.id}`, category: 'zoning' })
    ])
  );
});

test('browser diagnostics expose emergency service anchors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => Boolean(window.cityDiagnostics?.emergencyServiceAnchors));

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    anchors: window.cityDiagnostics?.emergencyServiceAnchors.total,
    vehicles: window.cityDiagnostics?.emergencyServiceAnchors.vehicles,
    covered: window.cityDiagnostics?.emergencyServiceAnchors.fireSafetyProfilesCovered,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'emergency-service-anchors')?.featureCount,
    panelText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.anchors).toBe(6);
  expect(diagnostics.vehicles).toBe(34);
  expect(diagnostics.covered).toBeGreaterThan(0);
  expect(diagnostics.overlayFeatures).toBe(6);
  expect(diagnostics.panelText).toContain('Emergency');
  expect(diagnostics.panelText).toContain('6 anchors, 34 vehicles');
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
