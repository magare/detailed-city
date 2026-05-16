import type { CityId, OfficeLobbyAccessKind, OfficeWorkplaceKind, Point2D } from '../../city/data-contracts/cityContracts';
import type {
  AddressPoint,
  BikeParking,
  BuildingEntrance,
  BuildingPlan,
  EconomyAnchor,
  OfficeWorkplace,
  TransitStop
} from '../../types/city';

export interface OfficeWorkplaceGeneratorInput {
  readonly economyAnchors: readonly EconomyAnchor[];
  readonly buildings: readonly BuildingPlan[];
  readonly buildingEntrances: readonly BuildingEntrance[];
  readonly addressPoints: readonly AddressPoint[];
  readonly transitStops: readonly TransitStop[];
  readonly bikeParking: readonly BikeParking[];
}

interface OfficeWorkplaceRule {
  readonly kind: OfficeWorkplaceKind;
  readonly accessKind: OfficeLobbyAccessKind;
  readonly officeAreaShare: number;
  readonly workerShare: number;
  readonly visitorShare: number;
  readonly organizationDivisor: number;
  readonly flexibleDeskShare: number;
  readonly securityScreening: boolean;
  readonly publicReception: boolean;
}

const OFFICE_WORKPLACE_RULES: Record<OfficeWorkplaceKind, OfficeWorkplaceRule> = {
  'office-tower': {
    kind: 'office-tower',
    accessKind: 'tenant-lobby',
    officeAreaShare: 0.72,
    workerShare: 0.82,
    visitorShare: 0.16,
    organizationDivisor: 58,
    flexibleDeskShare: 0.18,
    securityScreening: true,
    publicReception: true
  },
  coworking: {
    kind: 'coworking',
    accessKind: 'shared-coworking',
    officeAreaShare: 0.26,
    workerShare: 0.36,
    visitorShare: 0.22,
    organizationDivisor: 18,
    flexibleDeskShare: 0.74,
    securityScreening: false,
    publicReception: true
  },
  'institutional-workplace': {
    kind: 'institutional-workplace',
    accessKind: 'secure-institutional',
    officeAreaShare: 0.54,
    workerShare: 0.76,
    visitorShare: 0.12,
    organizationDivisor: 42,
    flexibleDeskShare: 0.1,
    securityScreening: true,
    publicReception: true
  },
  'industrial-administration': {
    kind: 'industrial-administration',
    accessKind: 'back-office',
    officeAreaShare: 0.18,
    workerShare: 0.24,
    visitorShare: 0.06,
    organizationDivisor: 34,
    flexibleDeskShare: 0.08,
    securityScreening: true,
    publicReception: false
  }
};

export class OfficeWorkplaceGenerator {
  create(input: OfficeWorkplaceGeneratorInput): OfficeWorkplace[] {
    const buildingsById = new Map(input.buildings.map((building) => [building.id, building]));
    const entrancesByBuildingId = groupBy(input.buildingEntrances, (entrance) => entrance.buildingId);
    const addressesByBuildingId = groupBy(input.addressPoints, (address) => address.buildingId);
    const transitStopsByRoadId = groupBy(input.transitStops, (stop) => stop.roadId);
    const bikeParkingByRoadId = groupBy(input.bikeParking, (parking) => parking.roadId);
    const workplaces: OfficeWorkplace[] = [];

    for (const anchor of input.economyAnchors) {
      const building = buildingsById.get(anchor.buildingId);

      if (!building) {
        continue;
      }

      const workplaceKind = getOfficeWorkplaceKind(anchor, building);

      if (!workplaceKind) {
        continue;
      }

      const rule = OFFICE_WORKPLACE_RULES[workplaceKind];
      const buildingEntrances = entrancesByBuildingId.get(building.id) ?? [];
      const addressPoints = addressesByBuildingId.get(building.id) ?? [];
      const lobbyEntranceIds = getLobbyEntranceIds(building, buildingEntrances);
      const addressPointIds = getAddressPointIds(building, addressPoints);
      const floorAreaSqm = getBuildingFloorAreaSqm(building);
      const officeFloorAreaSqm = Math.max(120, Math.round(floorAreaSqm * getOfficeAreaShare(rule, anchor, building)));
      const officeFloorCount = Math.max(1, Math.round(building.floorCount * getOfficeFloorShare(rule, anchor, building)));
      const workers = Math.max(6, Math.round(anchor.jobs.estimatedJobs * rule.workerShare));
      const visitors = Math.max(rule.publicReception ? 2 : 0, Math.round(anchor.customerDemand.dailyCustomers * rule.visitorShare));
      const serviceStaff = Math.max(1, Math.round(workers * (workplaceKind === 'office-tower' ? 0.055 : 0.035)));
      const dailyCommuters = workers + serviceStaff;
      const commuteShares = getCommuteModeShares(anchor.districtId);
      const transitTrips = Math.round(dailyCommuters * commuteShares.transit);
      const walkTrips = Math.round(dailyCommuters * commuteShares.walk);
      const bikeTrips = Math.round(dailyCommuters * commuteShares.bike);
      const vehicleTrips = Math.max(0, dailyCommuters - transitTrips - walkTrips - bikeTrips);
      const transitStopIds = getNearestIds(transitStopsByRoadId.get(anchor.roadId) ?? input.transitStops, anchor.center, 2);
      const bikeParkingIds = getNearestIds(bikeParkingByRoadId.get(anchor.roadId) ?? input.bikeParking, anchor.center, 3);
      const peakOnsitePopulation = Math.max(1, Math.round(workers * 0.88 + visitors * 0.32 + serviceStaff));

      workplaces.push({
        id: `office-workplace-${anchor.buildingId}`,
        kind: 'office-workplace',
        ownerDomain: 'economy',
        parentId: anchor.id,
        lod: 'lod2',
        economyAnchorId: anchor.id,
        buildingId: building.id,
        parcelId: anchor.parcelId,
        districtId: anchor.districtId,
        roadId: anchor.roadId,
        center: anchor.center,
        workplaceKind,
        officeFloorAreaSqm,
        officeFloorCount,
        scheduleProfileId: `schedule:office:${workplaceKind}`,
        towerProfile: {
          heightMeters: roundMetric(building.heightMeters, 1),
          podiumLobby: Boolean(building.footprintGrammar.podium) || building.typology.entranceStrategy === 'public-lobby',
          skylineMarker: workplaceKind === 'office-tower' && anchor.districtId === 'district-downtown' && building.heightMeters >= 42
        },
        lobby: {
          lobbyId: `office-lobby-${building.id}`,
          accessKind: rule.accessKind,
          entranceIds: lobbyEntranceIds,
          addressPointIds,
          areaSqm: getLobbyAreaSqm(buildingEntrances, officeFloorAreaSqm, workplaceKind),
          publicReception: rule.publicReception,
          securityScreening: rule.securityScreening,
          frontageMeters: getLobbyFrontageMeters(building, buildingEntrances),
          queueCapacityPersons: Math.max(4, Math.round(peakOnsitePopulation * (rule.securityScreening ? 0.12 : 0.07)))
        },
        tenancy: {
          organizationCount: Math.max(1, Math.ceil(workers / rule.organizationDivisor)),
          coworkingDeskCapacity: workplaceKind === 'coworking' ? Math.max(12, Math.round(workers * 1.18)) : 0,
          institutionalStaffCapacity: workplaceKind === 'institutional-workplace' ? workers : 0,
          flexibleDeskShare: roundUnit(rule.flexibleDeskShare)
        },
        commuteDemand: {
          dailyCommuters,
          morningPeakArrivals: Math.max(1, Math.round(workers * 0.72)),
          eveningPeakDepartures: Math.max(1, Math.round(workers * 0.68)),
          peakArrivalHour: 8,
          peakDepartureHour: workplaceKind === 'coworking' ? 19 : 18,
          transitTrips,
          walkTrips,
          bikeTrips,
          vehicleTrips,
          serviceTrips: Math.max(1, Math.round(anchor.deliveryDemand.dailyDeliveries * 0.45)),
          primaryRoadId: anchor.roadId,
          transitStopIds,
          bikeParkingIds
        },
        daytimePopulation: {
          workers,
          visitors,
          serviceStaff,
          peakOnsitePopulation,
          densityPer1000Sqm: roundMetric((peakOnsitePopulation / officeFloorAreaSqm) * 1000, 1)
        },
        tags: {
          workplaceKind,
          economyAnchorId: anchor.id,
          dailyCommuters,
          peakOnsitePopulation
        }
      });
    }

    return workplaces.sort((first, second) => first.id.localeCompare(second.id));
  }
}

function getOfficeWorkplaceKind(anchor: EconomyAnchor, building: BuildingPlan): OfficeWorkplaceKind | undefined {
  if (anchor.economicUse === 'civic-service') {
    return 'institutional-workplace';
  }
  if (building.uses.includes('office') || anchor.economicUse === 'office') {
    return building.heightMeters >= 42 || building.footprintGrammar.kind === 'tower-on-podium'
      ? 'office-tower'
      : 'coworking';
  }
  if (anchor.economicUse === 'mixed-use' && anchor.districtId === 'district-downtown' && building.floorCount >= 7) {
    return building.heightMeters >= 42 ? 'office-tower' : 'coworking';
  }
  if (anchor.economicUse === 'industrial' && building.floorCount >= 4) {
    return 'industrial-administration';
  }
  return undefined;
}

function getBuildingFloorAreaSqm(building: BuildingPlan): number {
  return Math.max(
    building.footprintGrammar.footprintAreaSqM,
    building.structureShell.floorPlates.reduce((sum, floorPlate) => sum + floorPlate.areaSqM, 0)
  );
}

function getOfficeAreaShare(rule: OfficeWorkplaceRule, anchor: EconomyAnchor, building: BuildingPlan): number {
  if (anchor.economicUse === 'office') {
    return Math.max(rule.officeAreaShare, 0.82);
  }
  if (building.uses.includes('office')) {
    return Math.max(rule.officeAreaShare, 0.44);
  }
  return rule.officeAreaShare;
}

function getOfficeFloorShare(rule: OfficeWorkplaceRule, anchor: EconomyAnchor, building: BuildingPlan): number {
  if (anchor.economicUse === 'office' || building.uses.includes('office')) {
    return Math.max(rule.officeAreaShare, 0.5);
  }
  return rule.officeAreaShare;
}

function getLobbyEntranceIds(building: BuildingPlan, entrances: readonly BuildingEntrance[]): readonly CityId[] {
  const entranceIds = entrances
    .filter((entrance) => entrance.entranceKind === 'lobby' || entrance.entranceKind === 'public-door')
    .map((entrance) => entrance.id);
  return uniqueSorted(entranceIds.length > 0 ? entranceIds : building.publicEntranceIds);
}

function getAddressPointIds(building: BuildingPlan, addresses: readonly AddressPoint[]): readonly CityId[] {
  const addressPointIds = addresses.map((address) => address.id);
  return uniqueSorted(addressPointIds.length > 0 ? addressPointIds : building.addressPointIds ?? []);
}

function getLobbyAreaSqm(
  entrances: readonly BuildingEntrance[],
  officeFloorAreaSqm: number,
  workplaceKind: OfficeWorkplaceKind
): number {
  const explicitLobbyArea = entrances.reduce((sum, entrance) => sum + (entrance.lobby?.areaSqM ?? 0), 0);
  const minimumArea = workplaceKind === 'office-tower' ? 84 : workplaceKind === 'institutional-workplace' ? 72 : 36;
  return Math.max(minimumArea, Math.round(explicitLobbyArea + officeFloorAreaSqm * 0.018));
}

function getLobbyFrontageMeters(building: BuildingPlan, entrances: readonly BuildingEntrance[]): number {
  const entranceWidth = entrances
    .filter((entrance) => entrance.entranceKind === 'lobby' || entrance.entranceKind === 'public-door')
    .reduce((sum, entrance) => sum + entrance.widthMeters, 0);
  const side = building.facadeGrammar.sides.find((candidate) => candidate.side === building.primaryFrontageSide);
  return roundMetric(Math.max(entranceWidth, Math.min(side?.widthMeters ?? 0, 18)), 1);
}

function getCommuteModeShares(districtId: CityId): {
  readonly transit: number;
  readonly walk: number;
  readonly bike: number;
} {
  if (districtId === 'district-downtown') {
    return { transit: 0.38, walk: 0.24, bike: 0.12 };
  }
  if (districtId === 'district-waterfront') {
    return { transit: 0.32, walk: 0.28, bike: 0.14 };
  }
  if (districtId === 'district-civic') {
    return { transit: 0.34, walk: 0.22, bike: 0.1 };
  }
  if (districtId === 'district-industrial') {
    return { transit: 0.18, walk: 0.08, bike: 0.06 };
  }
  return { transit: 0.26, walk: 0.18, bike: 0.1 };
}

function getNearestIds<T extends { readonly id: CityId; readonly center?: Point2D; readonly position?: Point2D }>(
  values: readonly T[],
  center: Point2D,
  limit: number
): readonly CityId[] {
  return values
    .map((value) => ({
      id: value.id,
      distance: getDistanceMeters(center, value.center ?? value.position ?? center)
    }))
    .sort((first, second) => first.distance - second.distance || first.id.localeCompare(second.id))
    .slice(0, limit)
    .map((value) => value.id)
    .sort();
}

function getDistanceMeters(first: Point2D, second: Point2D): number {
  return Math.hypot(first.x - second.x, first.z - second.z);
}

function groupBy<T>(values: readonly T[], getKey: (value: T) => CityId): Map<CityId, readonly T[]> {
  const groups = new Map<CityId, T[]>();

  for (const value of values) {
    const key = getKey(value);
    const group = groups.get(key);

    if (group) {
      group.push(value);
    } else {
      groups.set(key, [value]);
    }
  }

  return groups;
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort();
}

function roundUnit(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMetric(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
