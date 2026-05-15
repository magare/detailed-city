import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { createCityPickingMetadataCatalog } from '../../src/city/rendering-handoff/picking/pickingMetadata';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('education anchors are deterministic learning locations with drop-off and access hooks', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const picking = createCityPickingMetadataCatalog(firstCity, traffic, diagnostics.objectIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, { seed: cityConfig.seed, config: cityConfig });
  const anchorSignature = firstCity.educationAnchors.map((anchor) => [
    anchor.id,
    anchor.anchorKind,
    anchor.civicAnchorId,
    anchor.buildingId,
    anchor.roadId,
    anchor.capacity.studentCapacity,
    anchor.access.dailyLearners,
    anchor.access.dropOffCurbZoneIds.join(','),
    anchor.coverage.educationAccessScore
  ]);

  expect(anchorSignature).toEqual(
    secondCity.educationAnchors.map((anchor) => [
      anchor.id,
      anchor.anchorKind,
      anchor.civicAnchorId,
      anchor.buildingId,
      anchor.roadId,
      anchor.capacity.studentCapacity,
      anchor.access.dailyLearners,
      anchor.access.dropOffCurbZoneIds.join(','),
      anchor.coverage.educationAccessScore
    ])
  );
  expect(firstCity.educationAnchors.map((anchor) => anchor.id)).toEqual([
    'education-anchor-school',
    'education-anchor-library',
    'education-anchor-university',
    'education-anchor-childcare',
    'education-anchor-learning-campus'
  ]);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('education-anchor'))).toEqual([]);
  expect(firstCity.objectIndex.countsByKind['education-anchor']).toBe(5);
  expect(firstCity.educationAnchors.every((anchor) => anchor.ownerDomain === 'civic')).toBe(true);
  expect(firstCity.educationAnchors.every((anchor) => anchor.parentId === 'civic-anchor-education-base')).toBe(true);
  expect(firstCity.educationAnchors.every((anchor) => anchor.renderBindingId === 'binding:civic:education-anchor')).toBe(true);
  expect(firstCity.educationAnchors.every((anchor) => anchor.coverage.coveredNavigationNodeIds.length > 0)).toBe(true);
  expect(firstCity.educationAnchors.every((anchor) => anchor.access.accessibleNavigationEdgeIds.length > 0)).toBe(true);
  expect(firstCity.educationAnchors.every((anchor) => anchor.access.transitStopIds.length > 0)).toBe(true);
  expect(firstCity.educationAnchors.every((anchor) => anchor.access.bikeParkingIds.length > 0)).toBe(true);
  expect(firstCity.educationAnchors.every((anchor) => anchor.access.playgroundFeatureIds.length > 0)).toBe(true);
  expect(firstCity.educationAnchors.filter((anchor) => anchor.acceptsDropOff)).toHaveLength(4);
  expect(firstCity.educationAnchors.find((anchor) => anchor.anchorKind === 'school')).toMatchObject({
    capacity: expect.objectContaining({ studentCapacity: 620, classroomCount: 24 }),
    access: expect.objectContaining({ dropOffTrips: 180 })
  });
  expect(firstCity.educationAnchors.find((anchor) => anchor.anchorKind === 'library')).toMatchObject({
    capacity: expect.objectContaining({ librarySeats: 220 }),
    acceptsDropOff: false,
    publicLearningAccess: true
  });
  expect(diagnostics.educationAnchors).toMatchObject({
    total: 5,
    anchorKinds: 5,
    studentCapacity: 2226,
    classroomCount: 88,
    librarySeats: 550,
    childcareSlots: 120,
    lectureHallSeats: 670,
    staffCapacity: 294,
    dailyLearners: 3110,
    dropOffTrips: 637,
    dropOffReadyAnchors: 4,
    publicLearningAnchors: 4,
    transitLinkedAnchors: 5,
    bikeLinkedAnchors: 5,
    playgroundLinkedAnchors: 5,
    dropOffCurbZones: 5
  });
  expect(diagnostics.objectCounts).toMatchObject({
    educationAnchors: 5,
    educationAnchorKinds: 5,
    educationStudentCapacity: 2226,
    educationDailyLearners: 3110,
    educationDropOffTrips: 637,
    educationDropOffZones: 5,
    educationPlaygroundLinks: 5,
    educationAccessScore: 81.4
  });
  const educationOverlay = overlays.find((overlay) => overlay.id === 'education-anchors');
  expect(educationOverlay?.featureCount).toBe(5);
  expect(educationOverlay?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectId: 'education-anchor-school',
        objectKind: 'education-anchor',
        ownerDomain: 'civic',
        metadata: expect.objectContaining({
          anchorKind: 'school',
          studentCapacity: 620,
          dailyLearners: 680,
          dropOffZones: 4
        })
      })
    ])
  );
  expect(picking.countsByKind['education-anchor']).toBe(5);
  expect(picking.metadataByObjectId['education-anchor-school'].references).toMatchObject({
    buildingId: firstCity.educationAnchors[0].buildingId,
    civicAnchorId: 'civic-anchor-education-base',
    roadId: firstCity.educationAnchors[0].roadId
  });
  expect(firstCity.assetInventoryRecords.filter((record) => record.assetObjectKind === 'education-anchor')).toHaveLength(5);
  expect(exportArtifact.domainSectionCounts.educationAnchors).toBe(5);
  expect(exportArtifact.city.educationAnchors).toHaveLength(5);
});

test('education validation catches broken learning capacity and access hooks', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseAnchor = city.educationAnchors.find((anchor) => anchor.anchorKind === 'school');
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
    capacity: {
      ...baseAnchor!.capacity,
      studentCapacity: 0,
      classroomCount: -1,
      staffCapacity: 0
    },
    access: {
      ...baseAnchor!.access,
      dailyLearners: 0,
      dropOffTrips: 0,
      publicEntranceIds: ['missing-public-entrance'],
      serviceEntranceIds: ['missing-service-entrance'],
      dropOffCurbZoneIds: ['missing-curb-zone'],
      transitStopIds: ['missing-transit-stop'],
      bikeParkingIds: ['missing-bike-parking'],
      playgroundFeatureIds: ['missing-playground'],
      accessibleNavigationNodeIds: ['missing-node'],
      accessibleNavigationEdgeIds: ['missing-edge']
    },
    coverage: {
      ...baseAnchor!.coverage,
      radiusMeters: 0,
      targetDistrictIds: ['missing-district'],
      coveredNavigationNodeIds: ['missing-node'],
      coveredNavigationEdgeIds: ['missing-edge'],
      educationAccessScore: 0,
      estimatedDropOffWalkMeters: 0
    },
    scheduleProfileId: '',
    renderBindingId: 'missing-binding'
  };
  const invalidCity = {
    ...city,
    educationAnchors: city.educationAnchors.map((anchor) => (anchor.id === invalidAnchor.id ? invalidAnchor : anchor))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `education-anchor-missing-education-civic-anchor-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-building-parcel-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-parcel-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-district-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-road-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-education-service-area-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-invalid-capacity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-invalid-education-coverage-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-target-district-missing-district-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-navigation-node-missing-node-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-navigation-edge-missing-edge-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-public-entrance-missing-public-entrance-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-service-entrance-missing-service-entrance-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-drop-off-zone-missing-curb-zone-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-transit-stop-missing-transit-stop-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-bike-parking-missing-bike-parking-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-playground-feature-missing-playground-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-accessible-navigation-node-missing-node-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-accessible-navigation-edge-missing-edge-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-drop-off-access-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-school-learning-access-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `education-anchor-missing-render-binding-${invalidAnchor.id}`, category: 'zoning' })
    ])
  );
});

test('browser diagnostics expose education anchors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => Boolean(window.cityDiagnostics?.educationAnchors));

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    anchors: window.cityDiagnostics?.educationAnchors.total,
    learners: window.cityDiagnostics?.educationAnchors.dailyLearners,
    dropOffZones: window.cityDiagnostics?.educationAnchors.dropOffCurbZones,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'education-anchors')?.featureCount,
    panelText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.anchors).toBe(5);
  expect(diagnostics.learners).toBe(3110);
  expect(diagnostics.dropOffZones).toBe(5);
  expect(diagnostics.overlayFeatures).toBe(5);
  expect(diagnostics.panelText).toContain('Education');
  expect(diagnostics.panelText).toContain('5 anchors, 3110 learners');
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
