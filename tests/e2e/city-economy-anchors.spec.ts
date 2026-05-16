import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { countProceduralSeedDomainObjects, createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { EconomyAnchor } from '../../src/types/city';

test('economy anchors are deterministic, indexed, exported, and inspectable', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });

  expect(
    firstCity.economyAnchors.map((anchor) => [
      anchor.id,
      anchor.economicUse,
      anchor.buildingId,
      anchor.jobs.estimatedJobs,
      anchor.customerDemand.dailyCustomers,
      anchor.deliveryDemand.dailyDeliveries,
      anchor.scheduleProfileId,
      anchor.districtFit.score
    ])
  ).toEqual(
    secondCity.economyAnchors.map((anchor) => [
      anchor.id,
      anchor.economicUse,
      anchor.buildingId,
      anchor.jobs.estimatedJobs,
      anchor.customerDemand.dailyCustomers,
      anchor.deliveryDemand.dailyDeliveries,
      anchor.scheduleProfileId,
      anchor.districtFit.score
    ])
  );
  expect(firstCity.economyAnchors).toHaveLength(514);
  expect(firstCity.objectIndex.countsByKind['economy-anchor']).toBe(514);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'simulation')).toEqual([]);
  expect(diagnostics.economyAnchors).toMatchObject({
    total: 514,
    useKinds: 3,
    byUse: {
      'mixed-use': 364,
      'civic-service': 76,
      industrial: 74
    },
    estimatedJobs: 2820,
    peakOnsiteWorkers: 1852,
    dailyCustomers: 12670,
    dailyDeliveries: 1100,
    activeFrontagePreferred: 364,
    loadingRequired: 514,
    freightRouteRequired: 377,
    compatibleDistrictFit: 514,
    averageDistrictFitScore: 0.94
  });
  expect(diagnostics.objectCounts).toMatchObject({
    economyAnchors: 514,
    economyUseKinds: 3,
    economyEstimatedJobs: 2820,
    economyDailyCustomers: 12670,
    economyDailyDeliveries: 1100,
    economyLoadingRequired: 514
  });
  expect(overlays.find((overlay) => overlay.id === 'economy-anchors')?.featureCount).toBe(514);
  expect(runtimeIndex.countsByKind['economy-anchor']).toBe(514);
  expect(exportArtifact.domainSectionCounts.economyAnchors).toBe(514);
  expect(exportArtifact.city.economyAnchors).toHaveLength(514);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);

  const sample = firstCity.objectIndex.objectsById['economy-anchor-building-0-0-0-0'];
  expect(sample).toMatchObject({
    kind: 'economy-anchor',
    ownerDomain: 'economy',
    parentId: 'building-0-0-0-0',
    economicUse: 'mixed-use',
    deliveryDemand: {
      freightRouteRequired: true
    },
    loadingNeeds: {
      loadingDockIds: ['freight-loading-dock-building-0-0-0-0'],
      freightRouteIds: ['freight-route-road-v-0-retail-delivery']
    },
    districtFit: {
      compatible: true
    }
  });
});

test('economy anchor validation catches broken demand, schedule, frontage, and loading references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const anchor = city.economyAnchors.find((candidate) => candidate.loadingNeeds.loadingDockIds.length > 0);

  expect(anchor).toBeDefined();

  const invalidAnchor = {
    ...anchor!,
    economicUse: 'invalid-use',
    buildingId: 'missing-building',
    parcelId: 'missing-parcel',
    districtId: 'missing-district',
    roadId: 'missing-road',
    primaryLandUse: 'retail',
    jobs: {
      ...anchor!.jobs,
      estimatedJobs: 0,
      peakOnsiteWorkers: 3,
      shiftProfile: 'invalid-shift',
      workerArrivalPeakHour: 26
    },
    customerDemand: {
      ...anchor!.customerDemand,
      dailyCustomers: -1,
      peakHourCustomers: 4,
      dwellTimeMinutes: 0
    },
    deliveryDemand: {
      ...anchor!.deliveryDemand,
      dailyDeliveries: 4,
      weeklyFreightTrips: 2,
      loadingBaysRequired: 2,
      preferredVehicleClasses: [],
      freightRouteRequired: true
    },
    openingHours: [{ dayType: 'weekday', openHour: 8, closeHour: 8 }],
    activeFrontageIds: ['missing-frontage'],
    frontageNeeds: {
      ...anchor!.frontageNeeds,
      publicFrontageRequired: true,
      minimumFrontageMeters: -1,
      publicEntranceIds: ['missing-entrance']
    },
    loadingNeeds: {
      ...anchor!.loadingNeeds,
      loadingRequired: true,
      loadingDockIds: ['missing-dock'],
      freightRouteIds: ['missing-route'],
      serviceEntranceIds: [],
      curbZoneIds: ['missing-curb'],
      bayDemand: 0
    },
    districtFit: {
      score: 1.4,
      compatible: false,
      allowedByZoning: true,
      preferredDistrictIds: [],
      notes: []
    }
  } as unknown as EconomyAnchor;
  const invalidCity = {
    ...city,
    economyAnchors: city.economyAnchors.map((candidate) => (candidate.id === invalidAnchor.id ? invalidAnchor : candidate))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const issueIds = validation.issues.map((issue) => issue.id);

  expect(validation.passed).toBe(false);
  expect(issueIds).toEqual(
    expect.arrayContaining([
      `economy-anchor-invalid-use-${invalidAnchor.id}`,
      `economy-anchor-missing-building-${invalidAnchor.id}`,
      `economy-anchor-missing-parcel-${invalidAnchor.id}`,
      `economy-anchor-missing-district-${invalidAnchor.id}`,
      `economy-anchor-missing-road-${invalidAnchor.id}`,
      `economy-anchor-invalid-jobs-${invalidAnchor.id}`,
      `economy-anchor-invalid-customer-demand-${invalidAnchor.id}`,
      `economy-anchor-invalid-delivery-demand-${invalidAnchor.id}`,
      `economy-anchor-invalid-opening-hours-${invalidAnchor.id}`,
      `economy-anchor-invalid-frontage-needs-${invalidAnchor.id}`,
      `economy-anchor-missing-active-frontage-${invalidAnchor.id}`,
      `economy-anchor-missing-public-entrance-${invalidAnchor.id}`,
      `economy-anchor-invalid-loading-needs-${invalidAnchor.id}`,
      `economy-anchor-missing-loading-dock-${invalidAnchor.id}`,
      `economy-anchor-missing-freight-route-${invalidAnchor.id}`,
      `economy-anchor-missing-loading-curb-${invalidAnchor.id}`,
      `economy-anchor-invalid-district-fit-${invalidAnchor.id}`
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
