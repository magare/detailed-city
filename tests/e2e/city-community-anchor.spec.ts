import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('community anchors are deterministic and expose community service hooks', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const anchorSignature = firstCity.communityAnchors.map((anchor) => [
    anchor.id,
    anchor.anchorKind,
    anchor.civicAnchorId,
    anchor.buildingId,
    anchor.plazaZoneIds.join(','),
    anchor.dailyVisitors,
    anchor.eventCapacityPeople,
    anchor.communityCoverageScore
  ]);

  expect(anchorSignature).toEqual(
    secondCity.communityAnchors.map((anchor) => [
      anchor.id,
      anchor.anchorKind,
      anchor.civicAnchorId,
      anchor.buildingId,
      anchor.plazaZoneIds.join(','),
      anchor.dailyVisitors,
      anchor.eventCapacityPeople,
      anchor.communityCoverageScore
    ])
  );
  expect(firstCity.communityAnchors.map((anchor) => anchor.id)).toEqual([
    'community-anchor-worship-place',
    'community-anchor-cemetery',
    'community-anchor-processional-space',
    'community-anchor-social-service',
    'community-anchor-recreation-center',
    'community-anchor-food-bank',
    'community-anchor-shelter',
    'community-anchor-community-hall'
  ]);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('community-anchor'))).toEqual([]);
  expect(firstCity.objectIndex.countsByKind['civic-anchor']).toBe(6);
  expect(firstCity.objectIndex.countsByKind['community-anchor']).toBe(8);
  expect(firstCity.communityAnchors.every((anchor) => anchor.ownerDomain === 'civic')).toBe(true);
  expect(firstCity.communityAnchors.every((anchor) => anchor.civicAnchorId === 'civic-anchor-community-base')).toBe(true);
  expect(firstCity.communityAnchors.every((anchor) => anchor.plazaZoneIds.length > 0)).toBe(true);
  expect(firstCity.communityAnchors.every((anchor) => anchor.renderBindingId === 'binding:civic:community-anchor')).toBe(true);
  expect(firstCity.communityAnchors.find((anchor) => anchor.anchorKind === 'food-bank')).toMatchObject({
    foodDistribution: true,
    socialServiceCapacityPeople: 220
  });
  expect(firstCity.communityAnchors.find((anchor) => anchor.anchorKind === 'shelter')).toMatchObject({
    shelterCapacityPeople: 140
  });
  expect(diagnostics.communityAnchors).toMatchObject({
    total: 8,
    anchorKinds: 8,
    dailyVisitors: 1700,
    staffCapacity: 182,
    eventCapacityPeople: 1490,
    socialServiceCapacityPeople: 670,
    shelterCapacityPeople: 140,
    communityCoverageScore: 652,
    crowdEventReadyAnchors: 5,
    foodDistributionAnchors: 1,
    cemeteryCapacityPlots: 1200,
    plazaLinkedAnchors: 8
  });
  expect(diagnostics.objectCounts).toMatchObject({
    communityAnchors: 8,
    communityAnchorKinds: 8,
    communityDailyVisitors: 1700,
    communityEventCapacity: 1490,
    communitySocialServiceCapacity: 670,
    communityShelterCapacity: 140,
    communityCoverageScore: 652,
    communityCrowdReadyAnchors: 5,
    communityFoodDistributionAnchors: 1
  });
  const communityOverlay = overlays.find((overlay) => overlay.id === 'community-anchors');
  expect(communityOverlay?.featureCount).toBe(8);
  expect(communityOverlay?.features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        objectId: 'community-anchor-food-bank',
        objectKind: 'community-anchor',
        ownerDomain: 'civic',
        metadata: expect.objectContaining({
          anchorKind: 'food-bank',
          foodDistribution: true,
          socialServiceCapacityPeople: 220
        })
      })
    ])
  );
});

test('community anchor validation catches broken civic, plaza, service, and render references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseAnchor = city.communityAnchors.find((anchor) => anchor.anchorKind === 'shelter');
  expect(baseAnchor).toBeDefined();
  const invalidAnchor = {
    ...baseAnchor!,
    civicAnchorId: 'missing-civic-anchor',
    buildingId: 'missing-building',
    districtId: 'missing-district',
    plazaZoneIds: ['missing-plaza-zone'],
    serviceProgram: '',
    dailyVisitors: 0,
    staffCapacity: 0,
    eventCapacityPeople: -1,
    socialServiceCapacityPeople: -1,
    shelterCapacityPeople: 0,
    communityCoverageScore: 0,
    scheduleProfileId: '',
    renderBindingId: 'missing-binding'
  };
  const invalidCity = {
    ...city,
    communityAnchors: city.communityAnchors.map((anchor) => (anchor.id === invalidAnchor.id ? invalidAnchor : anchor))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `community-anchor-missing-civic-anchor-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `community-anchor-building-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `community-anchor-district-mismatch-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `community-anchor-missing-plaza-zone-missing-plaza-zone-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `community-anchor-invalid-capacity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `community-anchor-missing-shelter-capacity-${invalidAnchor.id}`, category: 'zoning' }),
      expect.objectContaining({ id: `community-anchor-missing-render-binding-${invalidAnchor.id}`, category: 'zoning' })
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    intersections: city.intersections,
    crossings: city.crossings,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}
