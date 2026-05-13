import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('civic anchor base contracts are deterministic and attach to civic buildings', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const anchorSignature = firstCity.civicAnchors.map((anchor) => [
    anchor.id,
    anchor.serviceType,
    anchor.buildingId,
    anchor.serviceAreaBoundaryId,
    anchor.catchment.radiusMeters,
    anchor.schedule.scheduleProfileId
  ]);

  expect(anchorSignature).toEqual(
    secondCity.civicAnchors.map((anchor) => [
      anchor.id,
      anchor.serviceType,
      anchor.buildingId,
      anchor.serviceAreaBoundaryId,
      anchor.catchment.radiusMeters,
      anchor.schedule.scheduleProfileId
    ])
  );
  expect(firstCity.civicAnchors.map((anchor) => anchor.id)).toEqual([
    'civic-anchor-government-base',
    'civic-anchor-education-base',
    'civic-anchor-healthcare-base',
    'civic-anchor-emergency-base',
    'civic-anchor-culture-base',
    'civic-anchor-community-base'
  ]);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('civic-anchor'))).toEqual([]);
  expect(firstCity.objectIndex.countsByKind['civic-anchor']).toBe(6);
  expect(firstCity.civicAnchors.every((anchor) => anchor.ownerDomain === 'civic')).toBe(true);
  expect(firstCity.civicAnchors.every((anchor) => anchor.renderBindingId === 'binding:civic:anchor')).toBe(true);
  expect(firstCity.civicAnchors.every((anchor) => anchor.publicEntranceIds.length > 0)).toBe(true);
  expect(firstCity.civicAnchors.every((anchor) => anchor.serviceEntranceIds.length > 0)).toBe(true);
  expect(firstCity.civicAnchors.every((anchor) => anchor.capacity.dailyVisitors > 0)).toBe(true);
  expect(firstCity.civicAnchors.every((anchor) => anchor.catchment.targetDistrictIds.length > 0)).toBe(true);
  expect(firstCity.civicAnchors.find((anchor) => anchor.serviceType === 'emergency')).toMatchObject({
    arrivalModes: expect.arrayContaining(['emergency']),
    schedule: expect.objectContaining({
      emergencyAccess: true,
      openHour: 0,
      closeHour: 24
    })
  });
  expect(diagnostics.civicAnchors).toMatchObject({
    total: 6,
    serviceTypes: 6,
    dailyVisitors: 3160,
    staff: 558,
    emergencyAccessAnchors: 3,
    byServiceType: {
      community: 1,
      culture: 1,
      education: 1,
      emergency: 1,
      government: 1,
      healthcare: 1
    }
  });
  expect(diagnostics.objectCounts).toMatchObject({
    civicAnchors: 6,
    civicAnchorServiceTypes: 6,
    civicAnchorDailyVisitors: 3160,
    civicAnchorStaff: 558,
    civicAnchorEmergencyAccess: 3
  });
  const civicOverlay = overlays.find((overlay) => overlay.id === 'civic-anchors');
  expect(civicOverlay?.featureCount).toBe(6);
  expect(civicOverlay?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectKind: 'civic-anchor',
        ownerDomain: 'civic',
        geometry: { type: 'point', point: expect.any(Object) },
        metadata: expect.objectContaining({
          serviceType: 'government',
          dailyVisitors: 840
        })
      })
    ])
  );
});

test('civic anchor validation catches broken service references and schedules', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseAnchor = city.civicAnchors.find((anchor) => anchor.serviceType === 'healthcare');
  expect(baseAnchor).toBeDefined();
  const invalidAnchor = {
    ...baseAnchor!,
    serviceAreaBoundaryId: 'missing-service-area',
    administrativeBoundaryIds: ['missing-boundary'],
    catchment: {
      ...baseAnchor!.catchment,
      radiusMeters: 0,
      targetDistrictIds: ['missing-district']
    },
    capacity: {
      ...baseAnchor!.capacity,
      dailyVisitors: 0
    },
    arrivalModes: ['pedestrian'] as const,
    publicEntranceIds: [],
    serviceEntranceIds: [],
    schedule: {
      ...baseAnchor!.schedule,
      scheduleProfileId: '',
      openHour: 20,
      closeHour: 8,
      emergencyAccess: false
    },
    renderBindingId: 'missing-binding'
  };
  const invalidCity = {
    ...city,
    civicAnchors: city.civicAnchors.map((anchor) => (anchor.id === invalidAnchor.id ? invalidAnchor : anchor))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `civic-anchor-missing-service-area-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `civic-anchor-missing-boundary-missing-boundary-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `civic-anchor-missing-target-district-missing-district-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `civic-anchor-invalid-catchment-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `civic-anchor-invalid-capacity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `civic-anchor-invalid-public-entrances-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `civic-anchor-missing-service-entrances-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `civic-anchor-invalid-schedule-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `civic-anchor-missing-emergency-access-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `civic-anchor-missing-render-binding-${invalidAnchor.id}`, category: 'zoning' })
    ])
  );
});

test('browser diagnostics expose civic anchors and debug panel metric', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    civicAnchors: window.cityDiagnostics?.civicAnchors,
    objectCounts: window.cityDiagnostics?.objectCounts,
    civicOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'civic-anchors'),
    pickingKindCount: window.cityDiagnostics?.picking.countsByKind['civic-anchor'],
    debugText: document.body.textContent
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.civicAnchors).toMatchObject({
    total: 6,
    serviceTypes: 6,
    emergencyAccessAnchors: 3
  });
  expect(diagnostics.objectCounts).toMatchObject({
    civicAnchors: 6,
    civicAnchorDailyVisitors: 3160,
    civicAnchorStaff: 558
  });
  expect(diagnostics.civicOverlay).toMatchObject({
    id: 'civic-anchors',
    featureCount: 6
  });
  expect(diagnostics.pickingKindCount).toBe(6);
  expect(diagnostics.debugText).toContain('Civic');
  expect(diagnostics.debugText).toContain('6 anchors, 6 services, 3 emergency');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    intersections: city.intersections,
    crossings: city.crossings,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
