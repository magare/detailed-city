import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('culture anchors are deterministic and link plaza/tourism relationships', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const anchorSignature = firstCity.cultureAnchors.map((anchor) => [
    anchor.id,
    anchor.anchorKind,
    anchor.civicAnchorId,
    anchor.buildingId,
    anchor.plazaZoneIds.join(','),
    anchor.culturalFootfallDaily,
    anchor.eventCapacityPeople,
    anchor.tourismAttractionScore
  ]);

  expect(anchorSignature).toEqual(
    secondCity.cultureAnchors.map((anchor) => [
      anchor.id,
      anchor.anchorKind,
      anchor.civicAnchorId,
      anchor.buildingId,
      anchor.plazaZoneIds.join(','),
      anchor.culturalFootfallDaily,
      anchor.eventCapacityPeople,
      anchor.tourismAttractionScore
    ])
  );
  expect(firstCity.cultureAnchors.map((anchor) => anchor.id)).toEqual([
    'culture-anchor-museum',
    'culture-anchor-theater',
    'culture-anchor-gallery',
    'culture-anchor-venue',
    'culture-anchor-heritage-site',
    'culture-anchor-event-space'
  ]);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('culture-anchor'))).toEqual([]);
  expect(firstCity.objectIndex.countsByKind['civic-anchor']).toBe(6);
  expect(firstCity.objectIndex.countsByKind['culture-anchor']).toBe(6);
  expect(firstCity.cultureAnchors.every((anchor) => anchor.ownerDomain === 'civic')).toBe(true);
  expect(firstCity.cultureAnchors.every((anchor) => anchor.civicAnchorId === 'civic-anchor-culture-base')).toBe(true);
  expect(firstCity.cultureAnchors.every((anchor) => anchor.plazaZoneIds.length > 0)).toBe(true);
  expect(firstCity.cultureAnchors.every((anchor) => anchor.renderBindingId === 'binding:civic:culture-anchor')).toBe(true);
  expect(firstCity.cultureAnchors.find((anchor) => anchor.anchorKind === 'theater')).toMatchObject({
    eventCapacityPeople: 320,
    eveningActivity: true
  });
  expect(firstCity.cultureAnchors.find((anchor) => anchor.anchorKind === 'event-space')).toMatchObject({
    eventCapacityPeople: 420,
    eveningActivity: true
  });
  expect(diagnostics.cultureAnchors).toMatchObject({
    total: 6,
    anchorKinds: 6,
    culturalFootfallDaily: 1680,
    staffCapacity: 181,
    eventCapacityPeople: 1260,
    tourismAttractionScore: 505,
    eveningActivityAnchors: 4,
    heritageAnchors: 2,
    plazaLinkedAnchors: 6
  });
  expect(diagnostics.objectCounts).toMatchObject({
    cultureAnchors: 6,
    cultureAnchorKinds: 6,
    cultureFootfallDaily: 1680,
    cultureEventCapacity: 1260,
    cultureTourismScore: 505,
    cultureEveningAnchors: 4,
    cultureHeritageAnchors: 2
  });
  const cultureOverlay = overlays.find((overlay) => overlay.id === 'culture-anchors');
  expect(cultureOverlay?.featureCount).toBe(6);
  expect(cultureOverlay?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectId: 'culture-anchor-museum',
        objectKind: 'culture-anchor',
        ownerDomain: 'civic',
        metadata: expect.objectContaining({
          anchorKind: 'museum',
          tourismAttractionScore: 92,
          culturalFootfallDaily: 360
        })
      })
    ])
  );
});

test('culture anchor validation catches broken civic, plaza, event, and render references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseAnchor = city.cultureAnchors.find((anchor) => anchor.anchorKind === 'theater');
  expect(baseAnchor).toBeDefined();
  const invalidAnchor = {
    ...baseAnchor!,
    civicAnchorId: 'missing-civic-anchor',
    buildingId: 'missing-building',
    districtId: 'missing-district',
    plazaZoneIds: ['missing-plaza-zone'],
    culturalProgram: '',
    culturalFootfallDaily: 0,
    staffCapacity: 0,
    eventCapacityPeople: 0,
    tourismAttractionScore: 0,
    eveningActivity: false,
    scheduleProfileId: '',
    renderBindingId: 'missing-binding'
  };
  const invalidCity = {
    ...city,
    cultureAnchors: city.cultureAnchors.map((anchor) => (anchor.id === invalidAnchor.id ? invalidAnchor : anchor))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `culture-anchor-missing-civic-anchor-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `culture-anchor-building-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `culture-anchor-district-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `culture-anchor-missing-plaza-zone-missing-plaza-zone-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `culture-anchor-invalid-capacity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `culture-anchor-missing-evening-activity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `culture-anchor-missing-render-binding-${invalidAnchor.id}`, category: 'zoning' })
    ])
  );
});

test('browser diagnostics expose culture anchors and debug panel metric', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    cultureAnchors: window.cityDiagnostics?.cultureAnchors,
    objectCounts: window.cityDiagnostics?.objectCounts,
    cultureOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'culture-anchors'),
    pickingKindCount: window.cityDiagnostics?.picking.countsByKind['culture-anchor'],
    debugText: document.body.textContent
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.cultureAnchors).toMatchObject({
    total: 6,
    anchorKinds: 6,
    culturalFootfallDaily: 1680,
    eventCapacityPeople: 1260,
    eveningActivityAnchors: 4,
    heritageAnchors: 2
  });
  expect(diagnostics.objectCounts).toMatchObject({
    cultureAnchors: 6,
    cultureFootfallDaily: 1680,
    cultureEventCapacity: 1260,
    cultureEveningAnchors: 4
  });
  expect(diagnostics.cultureOverlay).toMatchObject({
    id: 'culture-anchors',
    featureCount: 6
  });
  expect(diagnostics.pickingKindCount).toBe(6);
  expect(diagnostics.debugText).toContain('Culture');
  expect(diagnostics.debugText).toContain('6 anchors, 1680 footfall, 4 evening');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    intersections: city.intersections,
    crossings: city.crossings,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
