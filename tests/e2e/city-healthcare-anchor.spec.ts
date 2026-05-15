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

test('healthcare anchors are deterministic care locations with coverage and ambulance hooks', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const picking = createCityPickingMetadataCatalog(firstCity, traffic, diagnostics.objectIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, { seed: cityConfig.seed, config: cityConfig });
  const anchorSignature = firstCity.healthcareAnchors.map((anchor) => [
    anchor.id,
    anchor.anchorKind,
    anchor.civicAnchorId,
    anchor.buildingId,
    anchor.roadId,
    anchor.arrivals.dailyPatients,
    anchor.coverage.coveredNavigationNodeIds.length,
    anchor.coverage.estimatedAmbulanceResponseSeconds
  ]);

  expect(anchorSignature).toEqual(
    secondCity.healthcareAnchors.map((anchor) => [
      anchor.id,
      anchor.anchorKind,
      anchor.civicAnchorId,
      anchor.buildingId,
      anchor.roadId,
      anchor.arrivals.dailyPatients,
      anchor.coverage.coveredNavigationNodeIds.length,
      anchor.coverage.estimatedAmbulanceResponseSeconds
    ])
  );
  expect(firstCity.healthcareAnchors.map((anchor) => anchor.id)).toEqual([
    'healthcare-anchor-hospital',
    'healthcare-anchor-clinic',
    'healthcare-anchor-pharmacy',
    'healthcare-anchor-urgent-care',
    'healthcare-anchor-ambulance-bay'
  ]);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('healthcare-anchor'))).toEqual([]);
  expect(firstCity.objectIndex.countsByKind['healthcare-anchor']).toBe(5);
  expect(firstCity.healthcareAnchors.every((anchor) => anchor.ownerDomain === 'civic')).toBe(true);
  expect(firstCity.healthcareAnchors.every((anchor) => anchor.parentId === 'civic-anchor-healthcare-base')).toBe(true);
  expect(firstCity.healthcareAnchors.every((anchor) => anchor.renderBindingId === 'binding:civic:healthcare-anchor')).toBe(true);
  expect(firstCity.healthcareAnchors.every((anchor) => anchor.coverage.coveredNavigationNodeIds.length > 0)).toBe(true);
  expect(firstCity.healthcareAnchors.every((anchor) => anchor.coverage.coveredNavigationEdgeIds.length > 0)).toBe(true);
  expect(firstCity.healthcareAnchors.filter((anchor) => anchor.acceptsAmbulance)).toHaveLength(3);
  expect(firstCity.healthcareAnchors.filter((anchor) => anchor.acceptsAmbulance).every((anchor) => anchor.arrivals.ambulanceNavigationEdgeIds.length > 0)).toBe(true);
  expect(firstCity.healthcareAnchors.find((anchor) => anchor.anchorKind === 'hospital')).toMatchObject({
    capacity: expect.objectContaining({ bedCapacity: 96, ambulanceBays: 4 }),
    emergencyDepartment: true
  });
  expect(firstCity.healthcareAnchors.find((anchor) => anchor.anchorKind === 'pharmacy')).toMatchObject({
    capacity: expect.objectContaining({ pharmacyCounters: 5 }),
    acceptsAmbulance: false
  });
  expect(diagnostics.healthcareAnchors).toMatchObject({
    total: 5,
    anchorKinds: 5,
    dailyPatients: 2180,
    bedCapacity: 96,
    examRooms: 59,
    pharmacyCounters: 14,
    urgentCareBays: 20,
    ambulanceBays: 11,
    staffCapacity: 372,
    ambulanceAcceptingAnchors: 3,
    emergencyDepartmentAnchors: 1,
    transitLinkedAnchors: 5
  });
  expect(diagnostics.objectCounts).toMatchObject({
    healthcareAnchors: 5,
    healthcareAnchorKinds: 5,
    healthcareDailyPatients: 2180,
    healthcareBeds: 96,
    healthcareAmbulanceBays: 11,
    healthcareEmergencyDepartments: 1
  });
  const healthcareOverlay = overlays.find((overlay) => overlay.id === 'healthcare-anchors');
  expect(healthcareOverlay?.featureCount).toBe(5);
  expect(healthcareOverlay?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectId: 'healthcare-anchor-hospital',
        objectKind: 'healthcare-anchor',
        ownerDomain: 'civic',
        metadata: expect.objectContaining({
          anchorKind: 'hospital',
          dailyPatients: 920,
          bedCapacity: 96,
          emergencyDepartment: true
        })
      })
    ])
  );
  expect(picking.countsByKind['healthcare-anchor']).toBe(5);
  expect(picking.metadataByObjectId['healthcare-anchor-hospital'].references).toMatchObject({
    buildingId: firstCity.healthcareAnchors[0].buildingId,
    civicAnchorId: 'civic-anchor-healthcare-base'
  });
  expect(firstCity.assetInventoryRecords.filter((record) => record.assetObjectKind === 'healthcare-anchor')).toHaveLength(5);
  expect(exportArtifact.domainSectionCounts.healthcareAnchors).toBe(5);
  expect(exportArtifact.city.healthcareAnchors).toHaveLength(5);
});

test('healthcare validation catches broken care capacity and route hooks', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseAnchor = city.healthcareAnchors.find((anchor) => anchor.anchorKind === 'hospital');
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
      bedCapacity: 0,
      examRooms: -1,
      ambulanceBays: 0,
      staffCapacity: 0
    },
    arrivals: {
      ...baseAnchor!.arrivals,
      dailyPatients: 0,
      appointmentShare: 2,
      emergencyArrivalShare: -1,
      publicEntranceIds: ['missing-public-entrance'],
      serviceEntranceIds: ['missing-service-entrance'],
      transitStopIds: ['missing-transit-stop'],
      ambulanceAccessRoadIds: ['missing-road'],
      ambulanceNavigationNodeIds: ['missing-node'],
      ambulanceNavigationEdgeIds: ['missing-edge']
    },
    coverage: {
      ...baseAnchor!.coverage,
      radiusMeters: 0,
      targetDistrictIds: ['missing-district'],
      coveredNavigationNodeIds: ['missing-node'],
      coveredNavigationEdgeIds: ['missing-edge'],
      estimatedAmbulanceResponseSeconds: 0,
      coverageScore: 0
    },
    emergencyDepartment: false,
    scheduleProfileId: '',
    renderBindingId: 'missing-binding'
  };
  const invalidCity = {
    ...city,
    healthcareAnchors: city.healthcareAnchors.map((anchor) => (anchor.id === invalidAnchor.id ? invalidAnchor : anchor))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `healthcare-anchor-missing-healthcare-civic-anchor-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-building-parcel-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-parcel-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-district-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-road-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-healthcare-service-area-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-invalid-capacity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-invalid-healthcare-coverage-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-target-district-missing-district-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-navigation-node-missing-node-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-navigation-edge-missing-edge-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-public-entrance-missing-public-entrance-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-service-entrance-missing-service-entrance-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-transit-stop-missing-transit-stop-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-ambulance-road-missing-road-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-ambulance-access-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-ambulance-navigation-node-missing-node-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-ambulance-navigation-edge-missing-edge-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-hospital-care-capacity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `healthcare-anchor-missing-render-binding-${invalidAnchor.id}`, category: 'zoning' })
    ])
  );
});

test('browser diagnostics expose healthcare anchors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => Boolean(window.cityDiagnostics?.healthcareAnchors));

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    anchors: window.cityDiagnostics?.healthcareAnchors.total,
    patients: window.cityDiagnostics?.healthcareAnchors.dailyPatients,
    ambulanceBays: window.cityDiagnostics?.healthcareAnchors.ambulanceBays,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'healthcare-anchors')?.featureCount,
    panelText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.anchors).toBe(5);
  expect(diagnostics.patients).toBe(2180);
  expect(diagnostics.ambulanceBays).toBe(11);
  expect(diagnostics.overlayFeatures).toBe(5);
  expect(diagnostics.panelText).toContain('Healthcare');
  expect(diagnostics.panelText).toContain('5 anchors, 2180 patients');
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
