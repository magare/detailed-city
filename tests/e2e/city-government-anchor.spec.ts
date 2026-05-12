import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('government anchors are deterministic and link civic plaza relationships', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const anchorSignature = firstCity.governmentAnchors.map((anchor) => [
    anchor.id,
    anchor.anchorKind,
    anchor.civicAnchorId,
    anchor.buildingId,
    anchor.plazaZoneIds.join(','),
    anchor.serviceCounterCount,
    anchor.dailyVisitors,
    anchor.staffCapacity
  ]);

  expect(anchorSignature).toEqual(
    secondCity.governmentAnchors.map((anchor) => [
      anchor.id,
      anchor.anchorKind,
      anchor.civicAnchorId,
      anchor.buildingId,
      anchor.plazaZoneIds.join(','),
      anchor.serviceCounterCount,
      anchor.dailyVisitors,
      anchor.staffCapacity
    ])
  );
  expect(firstCity.governmentAnchors.map((anchor) => anchor.id)).toEqual([
    'government-anchor-city-hall',
    'government-anchor-administrative-offices',
    'government-anchor-courts',
    'government-anchor-service-counters',
    'government-anchor-civic-plaza-interface'
  ]);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('government-anchor'))).toEqual([]);
  expect(firstCity.objectIndex.countsByKind['government-anchor']).toBe(5);
  expect(firstCity.governmentAnchors.every((anchor) => anchor.ownerDomain === 'civic')).toBe(true);
  expect(firstCity.governmentAnchors.every((anchor) => anchor.civicAnchorId === 'civic-anchor-government-base')).toBe(true);
  expect(firstCity.governmentAnchors.every((anchor) => anchor.plazaZoneIds.length > 0)).toBe(true);
  expect(firstCity.governmentAnchors.every((anchor) => anchor.renderBindingId === 'binding:civic:government-anchor')).toBe(true);
  expect(firstCity.governmentAnchors.find((anchor) => anchor.anchorKind === 'city-hall')).toMatchObject({
    publicAdministrationRole: 'city-hall',
    serviceCounterCount: 8,
    securityScreening: true,
    ceremonialCapacityPeople: 180
  });
  expect(diagnostics.governmentAnchors).toMatchObject({
    total: 5,
    anchorKinds: 5,
    serviceCounters: 29,
    dailyVisitors: 1400,
    staffCapacity: 430,
    queueCapacityPeople: 364,
    ceremonialCapacityPeople: 435,
    plazaLinkedAnchors: 5,
    securityScreenedAnchors: 3,
    publicAccessAnchors: 5
  });
  expect(diagnostics.objectCounts).toMatchObject({
    governmentAnchors: 5,
    governmentAnchorKinds: 5,
    governmentServiceCounters: 29,
    governmentDailyVisitors: 1400,
    governmentStaffCapacity: 430,
    governmentPlazaLinks: 5
  });
  const governmentOverlay = overlays.find((overlay) => overlay.id === 'government-anchors');
  expect(governmentOverlay?.featureCount).toBe(5);
  expect(governmentOverlay?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectId: 'government-anchor-city-hall',
        objectKind: 'government-anchor',
        ownerDomain: 'civic',
        metadata: expect.objectContaining({
          anchorKind: 'city-hall',
          serviceCounters: 8,
          dailyVisitors: 360
        })
      })
    ])
  );
});

test('government anchor validation catches broken plaza and civic references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseAnchor = city.governmentAnchors.find((anchor) => anchor.anchorKind === 'city-hall');
  expect(baseAnchor).toBeDefined();
  const invalidAnchor = {
    ...baseAnchor!,
    civicAnchorId: 'missing-civic-anchor',
    buildingId: 'missing-building',
    districtId: 'missing-district',
    plazaZoneIds: ['missing-plaza-zone'],
    publicAdministrationRole: '',
    serviceCounterCount: -1,
    dailyVisitors: 0,
    staffCapacity: 0,
    queueCapacityPeople: -1,
    ceremonialCapacityPeople: -1,
    securityScreening: false,
    publicAccess: false,
    scheduleProfileId: '',
    renderBindingId: 'missing-binding'
  };
  const invalidCity = {
    ...city,
    governmentAnchors: city.governmentAnchors.map((anchor) => (anchor.id === invalidAnchor.id ? invalidAnchor : anchor))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `government-anchor-missing-civic-anchor-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `government-anchor-building-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `government-anchor-district-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `government-anchor-missing-plaza-zone-missing-plaza-zone-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `government-anchor-invalid-capacity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `government-anchor-missing-public-access-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `government-anchor-missing-security-screening-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `government-anchor-missing-render-binding-${invalidAnchor.id}`, category: 'zoning' })
    ])
  );
});

test('browser diagnostics expose government anchors and debug panel metric', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    governmentAnchors: window.cityDiagnostics?.governmentAnchors,
    objectCounts: window.cityDiagnostics?.objectCounts,
    governmentOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'government-anchors'),
    pickingKindCount: window.cityDiagnostics?.picking.countsByKind['government-anchor'],
    debugText: document.body.textContent
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.governmentAnchors).toMatchObject({
    total: 5,
    anchorKinds: 5,
    serviceCounters: 29,
    plazaLinkedAnchors: 5
  });
  expect(diagnostics.objectCounts).toMatchObject({
    governmentAnchors: 5,
    governmentServiceCounters: 29,
    governmentDailyVisitors: 1400,
    governmentStaffCapacity: 430
  });
  expect(diagnostics.governmentOverlay).toMatchObject({
    id: 'government-anchors',
    featureCount: 5
  });
  expect(diagnostics.pickingKindCount).toBe(5);
  expect(diagnostics.debugText).toContain('Government');
  expect(diagnostics.debugText).toContain('5 anchors, 29 counters, 5 plaza links');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    intersections: city.intersections,
    crossings: city.crossings,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
