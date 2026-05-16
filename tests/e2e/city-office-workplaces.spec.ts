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
import type { OfficeWorkplace } from '../../src/types/city';

test('office workplaces are deterministic, indexed, exported, and inspectable', () => {
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
    firstCity.officeWorkplaces.map((workplace) => [
      workplace.id,
      workplace.workplaceKind,
      workplace.buildingId,
      workplace.officeFloorAreaSqm,
      workplace.officeFloorCount,
      workplace.daytimePopulation.workers,
      workplace.commuteDemand.dailyCommuters,
      workplace.commuteDemand.morningPeakArrivals,
      workplace.daytimePopulation.densityPer1000Sqm
    ])
  ).toEqual(
    secondCity.officeWorkplaces.map((workplace) => [
      workplace.id,
      workplace.workplaceKind,
      workplace.buildingId,
      workplace.officeFloorAreaSqm,
      workplace.officeFloorCount,
      workplace.daytimePopulation.workers,
      workplace.commuteDemand.dailyCommuters,
      workplace.commuteDemand.morningPeakArrivals,
      workplace.daytimePopulation.densityPer1000Sqm
    ])
  );
  expect(firstCity.officeWorkplaces).toHaveLength(299);
  expect(firstCity.objectIndex.countsByKind['office-workplace']).toBe(299);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'simulation')).toEqual([]);
  expect(diagnostics.officeWorkplaces).toMatchObject({
    total: 299,
    workplaceKinds: 4,
    byKind: {
      'institutional-workplace': 76,
      'industrial-administration': 20,
      coworking: 127,
      'office-tower': 76
    },
    downtownWorkplaces: 203,
    officeTowers: 76,
    coworkingSpaces: 127,
    institutionalWorkplaces: 76,
    industrialAdministration: 20,
    officeFloorAreaSqm: 43103,
    officeFloors: 1790,
    workers: 1871,
    peakOnsitePopulation: 2493,
    dailyCommuters: 2170,
    morningPeakArrivals: 1263,
    eveningPeakDepartures: 1256,
    transitTrips: 793,
    vehicleTrips: 515,
    lobbyEntrances: 598,
    publicReceptionLobbies: 279,
    skylineMarkers: 76,
    averageDaytimeDensityPer1000Sqm: 58.86
  });
  expect(diagnostics.objectCounts).toMatchObject({
    officeWorkplaces: 299,
    officeWorkplaceKinds: 4,
    officeWorkers: 1871,
    officePeakPopulation: 2493,
    officeDailyCommuters: 2170,
    officeMorningPeakArrivals: 1263,
    officeTransitTrips: 793,
    officeVehicleTrips: 515,
    officeLobbyEntrances: 598
  });
  expect(overlays.find((overlay) => overlay.id === 'office-workplaces')?.featureCount).toBe(299);
  expect(runtimeIndex.countsByKind['office-workplace']).toBe(299);
  expect(exportArtifact.domainSectionCounts.officeWorkplaces).toBe(299);
  expect(exportArtifact.city.officeWorkplaces).toHaveLength(299);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);

  const tower = firstCity.officeWorkplaces.find(
    (workplace) => workplace.workplaceKind === 'office-tower' && workplace.towerProfile.skylineMarker
  );

  expect(tower).toBeDefined();
  expect(tower).toMatchObject({
    kind: 'office-workplace',
    ownerDomain: 'economy',
    workplaceKind: 'office-tower',
    districtId: 'district-downtown',
    commuteDemand: {
      peakArrivalHour: 8,
      peakDepartureHour: 18
    },
    towerProfile: {
      skylineMarker: true
    }
  });
  expect(tower?.id).toMatch(/^office-workplace-building-/);
  expect(tower?.parentId).toBe(tower?.economyAnchorId);
  expect(tower?.commuteDemand.transitStopIds.length).toBeGreaterThan(0);
  expect(tower?.commuteDemand.bikeParkingIds.length).toBeGreaterThan(0);
  expect(
    (tower?.commuteDemand.transitTrips ?? 0) +
      (tower?.commuteDemand.walkTrips ?? 0) +
      (tower?.commuteDemand.bikeTrips ?? 0) +
      (tower?.commuteDemand.vehicleTrips ?? 0)
  ).toBe(tower?.commuteDemand.dailyCommuters);
  expect(firstCity.officeWorkplaces.filter((workplace) => workplace.districtId === 'district-downtown')).toHaveLength(203);
});

test('office workplace validation catches broken workplace, lobby, capacity, and commute references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const workplace = city.officeWorkplaces.find(
    (candidate) => candidate.commuteDemand.transitStopIds.length > 0 && candidate.commuteDemand.bikeParkingIds.length > 0
  );

  expect(workplace).toBeDefined();

  const invalidWorkplace = {
    ...workplace!,
    workplaceKind: 'invalid-kind',
    economyAnchorId: 'missing-economy-anchor',
    buildingId: 'missing-building',
    parcelId: 'missing-parcel',
    districtId: 'missing-district',
    roadId: 'missing-road',
    officeFloorAreaSqm: 0,
    officeFloorCount: 0,
    towerProfile: {
      ...workplace!.towerProfile,
      heightMeters: 0
    },
    lobby: {
      ...workplace!.lobby,
      accessKind: 'invalid-access',
      entranceIds: ['missing-lobby-entrance'],
      addressPointIds: ['missing-address-point'],
      areaSqm: 0,
      frontageMeters: -1,
      queueCapacityPersons: 0
    },
    tenancy: {
      ...workplace!.tenancy,
      organizationCount: 0,
      flexibleDeskShare: 1.4
    },
    commuteDemand: {
      ...workplace!.commuteDemand,
      dailyCommuters: 10,
      morningPeakArrivals: 11,
      eveningPeakDepartures: 12,
      peakArrivalHour: 26,
      transitTrips: 3,
      walkTrips: 3,
      bikeTrips: 3,
      vehicleTrips: 3,
      serviceTrips: -1,
      primaryRoadId: 'different-road',
      transitStopIds: ['missing-transit-stop'],
      bikeParkingIds: ['missing-bike-parking']
    },
    daytimePopulation: {
      ...workplace!.daytimePopulation,
      workers: 0,
      visitors: -1,
      serviceStaff: 0,
      peakOnsitePopulation: 0,
      densityPer1000Sqm: 0
    }
  } as unknown as OfficeWorkplace;
  const invalidCity = {
    ...city,
    officeWorkplaces: city.officeWorkplaces.map((candidate) =>
      candidate.id === invalidWorkplace.id ? invalidWorkplace : candidate
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
      `office-workplace-invalid-kind-${invalidWorkplace.id}`,
      `office-workplace-missing-economy-anchor-${invalidWorkplace.id}`,
      `office-workplace-missing-building-${invalidWorkplace.id}`,
      `office-workplace-missing-parcel-${invalidWorkplace.id}`,
      `office-workplace-missing-district-${invalidWorkplace.id}`,
      `office-workplace-missing-road-${invalidWorkplace.id}`,
      `office-workplace-invalid-lobby-${invalidWorkplace.id}`,
      `office-workplace-missing-lobby-entrance-${invalidWorkplace.id}`,
      `office-workplace-missing-address-point-${invalidWorkplace.id}`,
      `office-workplace-invalid-capacity-${invalidWorkplace.id}`,
      `office-workplace-invalid-commute-demand-${invalidWorkplace.id}`,
      `office-workplace-missing-transit-stop-${invalidWorkplace.id}`,
      `office-workplace-missing-bike-parking-${invalidWorkplace.id}`
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
