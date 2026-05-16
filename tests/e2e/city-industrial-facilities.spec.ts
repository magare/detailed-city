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
import type { IndustrialFacility } from '../../src/types/city';

test('industrial facilities are deterministic, indexed, exported, and inspectable', () => {
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
    firstCity.industrialFacilities.map((facility) => [
      facility.id,
      facility.facilityKind,
      facility.buildingId,
      facility.logistics.loadingDockIds.join(','),
      facility.logistics.freightRouteIds.join(','),
      facility.logistics.loadingBays,
      facility.logistics.dailyTruckTrips,
      facility.logistics.coldChain.enabled,
      facility.yard.areaSqm,
      facility.truckCirculation.stagingBayCount
    ])
  ).toEqual(
    secondCity.industrialFacilities.map((facility) => [
      facility.id,
      facility.facilityKind,
      facility.buildingId,
      facility.logistics.loadingDockIds.join(','),
      facility.logistics.freightRouteIds.join(','),
      facility.logistics.loadingBays,
      facility.logistics.dailyTruckTrips,
      facility.logistics.coldChain.enabled,
      facility.yard.areaSqm,
      facility.truckCirculation.stagingBayCount
    ])
  );

  expect(firstCity.industrialFacilities).toHaveLength(74);
  expect(firstCity.objectIndex.countsByKind['industrial-facility']).toBe(74);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'simulation')).toEqual([]);
  expect(diagnostics.industrialFacilities).toMatchObject({
    total: 74,
    facilityKinds: 5,
    byKind: {
      warehouse: 31,
      'cold-chain': 7,
      'light-industry': 10,
      fabrication: 15,
      workshop: 11
    },
    warehouseFacilities: 31,
    coldChainFacilities: 7,
    fabricationFacilities: 15,
    workshopFacilities: 11,
    lightIndustryFacilities: 10,
    estimatedWorkers: 101,
    dailyOutputUnits: 4624,
    loadingBays: 186,
    dailyTruckTrips: 296,
    yardAreaSqm: 2858,
    storageSlots: 248,
    outdoorWorkBays: 26,
    stagingBays: 262,
    queueCapacityTrucks: 74,
    serviceAlleyLinkedFacilities: 74
  });
  expect(diagnostics.objectCounts).toMatchObject({
    industrialFacilities: 74,
    industrialFacilityKinds: 5,
    industrialWarehouseFacilities: 31,
    industrialColdChainFacilities: 7,
    industrialLoadingBays: 186,
    industrialDailyTruckTrips: 296,
    industrialYardAreaSqm: 2858,
    industrialStorageSlots: 248
  });
  expect(overlays.find((overlay) => overlay.id === 'industrial-facilities')?.featureCount).toBe(74);
  expect(runtimeIndex.countsByKind['industrial-facility']).toBe(74);
  expect(exportArtifact.domainSectionCounts.industrialFacilities).toBe(74);
  expect(exportArtifact.city.industrialFacilities).toHaveLength(74);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);

  const coldChain = firstCity.industrialFacilities.find((facility) => facility.facilityKind === 'cold-chain');

  expect(coldChain).toBeDefined();
  expect(coldChain).toMatchObject({
    kind: 'industrial-facility',
    ownerDomain: 'economy',
    districtId: 'district-industrial',
    logistics: {
      coldChain: {
        enabled: true
      }
    }
  });
  expect(coldChain?.id).toMatch(/^industrial-facility-building-/);
  expect(coldChain?.parentId).toBe(coldChain?.economyAnchorId);
  expect(coldChain?.logistics.loadingDockIds.length).toBeGreaterThan(0);
  expect(coldChain?.logistics.freightRouteIds.length).toBeGreaterThan(0);
  expect(coldChain?.logistics.loadingEntranceIds.length).toBeGreaterThan(0);
  expect(coldChain?.truckCirculation.circulationPath.length).toBeGreaterThanOrEqual(4);
});

test('industrial facility validation catches broken production, yard, logistics, and truck circulation', () => {
  const city = new CityGenerator(cityConfig).generate();
  const facility = city.industrialFacilities.find(
    (candidate) => candidate.logistics.serviceAlleyId && candidate.logistics.coldChain.enabled
  );

  expect(facility).toBeDefined();

  const invalidFacility = {
    ...facility!,
    facilityKind: 'invalid-kind',
    economyAnchorId: 'missing-economy-anchor',
    buildingId: 'missing-building',
    parcelId: 'missing-parcel',
    districtId: 'missing-district',
    roadId: 'missing-road',
    production: {
      ...facility!.production,
      processIntensity: 'invalid-intensity',
      shiftProfile: 'invalid-shift',
      estimatedWorkers: 0,
      dailyOutputUnits: 0
    },
    yard: {
      ...facility!.yard,
      boundary: [],
      center: { x: Number.NaN, z: Number.NaN },
      areaSqm: 0,
      surface: 'invalid-surface',
      bufferMeters: -1,
      storageSlots: -1,
      outdoorWorkBays: -1
    },
    logistics: {
      ...facility!.logistics,
      loadingDockIds: ['missing-loading-dock'],
      freightRouteIds: ['missing-freight-route'],
      serviceAlleyId: 'missing-service-alley',
      loadingEntranceIds: ['missing-loading-entrance'],
      loadingBays: 0,
      dailyTruckTrips: 0,
      allowedVehicleClasses: [],
      coldChain: {
        enabled: true,
        temperatureBand: 'ambient',
        backupPowerHours: 0
      }
    },
    truckCirculation: {
      ...facility!.truckCirculation,
      entryRoadId: 'different-road',
      circulationPath: [],
      stagingBayCount: 0,
      turningRadiusMeters: 0,
      queueCapacityTrucks: 0
    }
  } as unknown as IndustrialFacility;
  const invalidCity = {
    ...city,
    industrialFacilities: city.industrialFacilities.map((candidate) =>
      candidate.id === invalidFacility.id ? invalidFacility : candidate
    )
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const issueIds = validation.issues.map((issue) => issue.id);

  expect(validation.passed).toBe(false);
  expect(issueIds).toEqual(
    expect.arrayContaining([
      `industrial-facility-invalid-kind-${invalidFacility.id}`,
      `industrial-facility-missing-economy-anchor-${invalidFacility.id}`,
      `industrial-facility-missing-building-${invalidFacility.id}`,
      `industrial-facility-missing-parcel-${invalidFacility.id}`,
      `industrial-facility-missing-district-${invalidFacility.id}`,
      `industrial-facility-missing-road-${invalidFacility.id}`,
      `industrial-facility-invalid-production-${invalidFacility.id}`,
      `industrial-facility-invalid-yard-${invalidFacility.id}`,
      `industrial-facility-invalid-logistics-${invalidFacility.id}`,
      `industrial-facility-missing-loading-dock-${invalidFacility.id}`,
      `industrial-facility-missing-freight-route-${invalidFacility.id}`,
      `industrial-facility-missing-service-alley-${invalidFacility.id}`,
      `industrial-facility-missing-loading-entrance-${invalidFacility.id}`,
      `industrial-facility-invalid-cold-chain-${invalidFacility.id}`,
      `industrial-facility-invalid-truck-circulation-${invalidFacility.id}`
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
