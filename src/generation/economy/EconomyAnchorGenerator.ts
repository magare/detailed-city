import type {
  CityId,
  EconomyAnchorUse,
  EconomyOpeningWindowContract,
  EconomyShiftProfile,
  FreightVehicleClass,
  LandUse
} from '../../city/data-contracts/cityContracts';
import type { ActiveFrontage, BuildingPlan, EconomyAnchor, FreightLoadingDock, FreightRoute, Parcel, RoadSegment } from '../../types/city';

export interface EconomyAnchorGeneratorInput {
  readonly buildings: readonly BuildingPlan[];
  readonly parcels: readonly Parcel[];
  readonly roads: readonly RoadSegment[];
  readonly activeFrontages: readonly ActiveFrontage[];
  readonly freightLoadingDocks: readonly FreightLoadingDock[];
  readonly freightRoutes: readonly FreightRoute[];
}

interface EconomyUseRule {
  readonly economicUse: EconomyAnchorUse;
  readonly primaryLandUse: LandUse;
  readonly jobSqmPerWorker: number;
  readonly customerMultiplier: number;
  readonly dwellTimeMinutes: number;
  readonly deliveryIntensityPer1000Sqm: number;
  readonly minimumDailyDeliveries: number;
  readonly minimumLoadingBays: number;
  readonly publicAccessRequired: boolean;
  readonly activeFrontagePreferred: boolean;
  readonly freightRouteRequired: boolean;
  readonly shiftProfile: EconomyShiftProfile;
  readonly workerArrivalPeakHour: number;
  readonly workerDeparturePeakHour: number;
  readonly visitorArrivalPeakHour: number;
  readonly preferredVehicleClasses: readonly FreightVehicleClass[];
  readonly preferredDistrictIds: readonly CityId[];
  readonly openingHours: readonly EconomyOpeningWindowContract[];
}

const WEEKDAY_ONLY_HOURS = [
  { dayType: 'weekday', openHour: 8, closeHour: 18 },
  { dayType: 'saturday', openHour: 10, closeHour: 14 },
  { dayType: 'sunday', openHour: 10, closeHour: 14 }
] as const satisfies readonly EconomyOpeningWindowContract[];

const RETAIL_HOURS = [
  { dayType: 'weekday', openHour: 9, closeHour: 21 },
  { dayType: 'saturday', openHour: 10, closeHour: 22 },
  { dayType: 'sunday', openHour: 11, closeHour: 18 }
] as const satisfies readonly EconomyOpeningWindowContract[];

const HOSPITALITY_HOURS = [
  { dayType: 'weekday', openHour: 7, closeHour: 23 },
  { dayType: 'saturday', openHour: 8, closeHour: 24 },
  { dayType: 'sunday', openHour: 8, closeHour: 22 }
] as const satisfies readonly EconomyOpeningWindowContract[];

const INDUSTRIAL_HOURS = [
  { dayType: 'weekday', openHour: 6, closeHour: 18 },
  { dayType: 'saturday', openHour: 7, closeHour: 15 },
  { dayType: 'sunday', openHour: 8, closeHour: 12 }
] as const satisfies readonly EconomyOpeningWindowContract[];

const ROUND_THE_CLOCK_HOURS = [
  { dayType: 'weekday', openHour: 0, closeHour: 24 },
  { dayType: 'saturday', openHour: 0, closeHour: 24 },
  { dayType: 'sunday', openHour: 0, closeHour: 24 }
] as const satisfies readonly EconomyOpeningWindowContract[];

const ECONOMY_USE_RULES: Record<EconomyAnchorUse, EconomyUseRule> = {
  retail: {
    economicUse: 'retail',
    primaryLandUse: 'retail',
    jobSqmPerWorker: 42,
    customerMultiplier: 6.2,
    dwellTimeMinutes: 34,
    deliveryIntensityPer1000Sqm: 1.4,
    minimumDailyDeliveries: 2,
    minimumLoadingBays: 1,
    publicAccessRequired: true,
    activeFrontagePreferred: true,
    freightRouteRequired: true,
    shiftProfile: 'split',
    workerArrivalPeakHour: 9,
    workerDeparturePeakHour: 21,
    visitorArrivalPeakHour: 17,
    preferredVehicleClasses: ['cargo-van', 'box-truck'],
    preferredDistrictIds: ['district-downtown', 'district-waterfront', 'district-residential'],
    openingHours: RETAIL_HOURS
  },
  office: {
    economicUse: 'office',
    primaryLandUse: 'office',
    jobSqmPerWorker: 18,
    customerMultiplier: 0.28,
    dwellTimeMinutes: 58,
    deliveryIntensityPer1000Sqm: 0.18,
    minimumDailyDeliveries: 1,
    minimumLoadingBays: 1,
    publicAccessRequired: true,
    activeFrontagePreferred: false,
    freightRouteRequired: false,
    shiftProfile: 'day',
    workerArrivalPeakHour: 8,
    workerDeparturePeakHour: 18,
    visitorArrivalPeakHour: 11,
    preferredVehicleClasses: ['cargo-van'],
    preferredDistrictIds: ['district-downtown', 'district-waterfront'],
    openingHours: WEEKDAY_ONLY_HOURS
  },
  industrial: {
    economicUse: 'industrial',
    primaryLandUse: 'industrial',
    jobSqmPerWorker: 55,
    customerMultiplier: 0.08,
    dwellTimeMinutes: 25,
    deliveryIntensityPer1000Sqm: 2.1,
    minimumDailyDeliveries: 4,
    minimumLoadingBays: 2,
    publicAccessRequired: false,
    activeFrontagePreferred: false,
    freightRouteRequired: true,
    shiftProfile: 'split',
    workerArrivalPeakHour: 6,
    workerDeparturePeakHour: 18,
    visitorArrivalPeakHour: 10,
    preferredVehicleClasses: ['box-truck', 'semi-truck'],
    preferredDistrictIds: ['district-industrial'],
    openingHours: INDUSTRIAL_HOURS
  },
  warehouse: {
    economicUse: 'warehouse',
    primaryLandUse: 'industrial',
    jobSqmPerWorker: 90,
    customerMultiplier: 0.04,
    dwellTimeMinutes: 20,
    deliveryIntensityPer1000Sqm: 3.2,
    minimumDailyDeliveries: 7,
    minimumLoadingBays: 3,
    publicAccessRequired: false,
    activeFrontagePreferred: false,
    freightRouteRequired: true,
    shiftProfile: 'round-the-clock',
    workerArrivalPeakHour: 6,
    workerDeparturePeakHour: 22,
    visitorArrivalPeakHour: 10,
    preferredVehicleClasses: ['box-truck', 'semi-truck'],
    preferredDistrictIds: ['district-industrial'],
    openingHours: ROUND_THE_CLOCK_HOURS
  },
  hospitality: {
    economicUse: 'hospitality',
    primaryLandUse: 'hospitality',
    jobSqmPerWorker: 48,
    customerMultiplier: 7.4,
    dwellTimeMinutes: 72,
    deliveryIntensityPer1000Sqm: 1.2,
    minimumDailyDeliveries: 3,
    minimumLoadingBays: 1,
    publicAccessRequired: true,
    activeFrontagePreferred: true,
    freightRouteRequired: true,
    shiftProfile: 'evening',
    workerArrivalPeakHour: 11,
    workerDeparturePeakHour: 23,
    visitorArrivalPeakHour: 19,
    preferredVehicleClasses: ['cargo-van', 'box-truck'],
    preferredDistrictIds: ['district-waterfront', 'district-downtown'],
    openingHours: HOSPITALITY_HOURS
  },
  'civic-service': {
    economicUse: 'civic-service',
    primaryLandUse: 'civic',
    jobSqmPerWorker: 35,
    customerMultiplier: 2.6,
    dwellTimeMinutes: 48,
    deliveryIntensityPer1000Sqm: 0.45,
    minimumDailyDeliveries: 1,
    minimumLoadingBays: 1,
    publicAccessRequired: true,
    activeFrontagePreferred: false,
    freightRouteRequired: false,
    shiftProfile: 'day',
    workerArrivalPeakHour: 8,
    workerDeparturePeakHour: 17,
    visitorArrivalPeakHour: 10,
    preferredVehicleClasses: ['cargo-van'],
    preferredDistrictIds: ['district-civic', 'district-downtown'],
    openingHours: WEEKDAY_ONLY_HOURS
  },
  'mixed-use': {
    economicUse: 'mixed-use',
    primaryLandUse: 'mixed-use',
    jobSqmPerWorker: 32,
    customerMultiplier: 4.8,
    dwellTimeMinutes: 46,
    deliveryIntensityPer1000Sqm: 1.1,
    minimumDailyDeliveries: 2,
    minimumLoadingBays: 1,
    publicAccessRequired: true,
    activeFrontagePreferred: true,
    freightRouteRequired: true,
    shiftProfile: 'split',
    workerArrivalPeakHour: 9,
    workerDeparturePeakHour: 20,
    visitorArrivalPeakHour: 17,
    preferredVehicleClasses: ['cargo-van', 'box-truck'],
    preferredDistrictIds: ['district-downtown', 'district-waterfront', 'district-residential'],
    openingHours: RETAIL_HOURS
  },
  'utility-service': {
    economicUse: 'utility-service',
    primaryLandUse: 'utility',
    jobSqmPerWorker: 80,
    customerMultiplier: 0.03,
    dwellTimeMinutes: 20,
    deliveryIntensityPer1000Sqm: 0.75,
    minimumDailyDeliveries: 1,
    minimumLoadingBays: 1,
    publicAccessRequired: false,
    activeFrontagePreferred: false,
    freightRouteRequired: false,
    shiftProfile: 'round-the-clock',
    workerArrivalPeakHour: 7,
    workerDeparturePeakHour: 19,
    visitorArrivalPeakHour: 10,
    preferredVehicleClasses: ['cargo-van', 'box-truck'],
    preferredDistrictIds: ['district-industrial', 'district-civic'],
    openingHours: ROUND_THE_CLOCK_HOURS
  }
};

export class EconomyAnchorGenerator {
  create(input: EconomyAnchorGeneratorInput): EconomyAnchor[] {
    const parcelsById = new Map(input.parcels.map((parcel) => [parcel.id, parcel]));
    const roadsById = new Map(input.roads.map((road) => [road.id, road]));
    const freightRoutesById = new Map(input.freightRoutes.map((route) => [route.id, route]));
    const docksByBuildingId = groupBy(input.freightLoadingDocks, (dock) => dock.buildingId);
    const frontagesByBuildingId = groupBy(input.activeFrontages, (frontage) => frontage.buildingId);
    const anchors: EconomyAnchor[] = [];

    for (const building of input.buildings) {
      const economicUse = getEconomicUse(building);
      const parcel = parcelsById.get(building.parcelId);
      const road = roadsById.get(building.primaryFrontageRoadId);

      if (!economicUse || !parcel || !road) {
        continue;
      }

      const rule = ECONOMY_USE_RULES[economicUse];
      const activeFrontages = frontagesByBuildingId.get(building.id) ?? [];
      const loadingDocks = docksByBuildingId.get(building.id) ?? [];
      const freightRouteIds = uniqueSorted(loadingDocks.flatMap((dock) => dock.linkedRouteIds).filter((routeId) => freightRoutesById.has(routeId)));
      const floorAreaSqm = getBuildingFloorAreaSqm(building);
      const estimatedJobs = Math.max(1, Math.round(floorAreaSqm / rule.jobSqmPerWorker));
      const dailyCustomers = Math.max(rule.publicAccessRequired ? 4 : 0, Math.round(estimatedJobs * rule.customerMultiplier));
      const dailyDeliveries = Math.max(
        rule.minimumDailyDeliveries,
        Math.round((floorAreaSqm / 1000) * rule.deliveryIntensityPer1000Sqm + loadingDocks.length)
      );
      const loadingBays = loadingDocks.reduce((sum, dock) => sum + dock.loadingBays, 0);
      const bayDemand = Math.max(rule.minimumLoadingBays, Math.ceil(dailyDeliveries / 5), loadingBays);
      const districtFit = createDistrictFit(rule, parcel, building, activeFrontages.length, loadingDocks.length);
      const frontageMeters = getPrimaryFrontageMeters(building);

      anchors.push({
        id: `economy-anchor-${building.id}`,
        kind: 'economy-anchor',
        ownerDomain: 'economy',
        parentId: building.id,
        lod: 'lod1',
        buildingId: building.id,
        parcelId: parcel.id,
        districtId: parcel.districtId,
        roadId: road.id,
        center: building.center,
        economicUse: rule.economicUse,
        primaryLandUse: rule.primaryLandUse,
        scheduleProfileId: building.typology.scheduleProfileId,
        activeFrontageIds: activeFrontages.map((frontage) => frontage.id).sort(),
        addressPointIds: [...(building.addressPointIds ?? [])].sort(),
        jobs: {
          estimatedJobs,
          peakOnsiteWorkers: Math.max(1, Math.round(estimatedJobs * getPeakWorkerRatio(rule.shiftProfile))),
          shiftProfile: rule.shiftProfile,
          workerArrivalPeakHour: rule.workerArrivalPeakHour,
          workerDeparturePeakHour: rule.workerDeparturePeakHour
        },
        customerDemand: {
          dailyCustomers,
          peakHourCustomers: Math.max(rule.publicAccessRequired ? 2 : 0, Math.round(dailyCustomers * 0.18)),
          visitorArrivalPeakHour: rule.visitorArrivalPeakHour,
          dwellTimeMinutes: rule.dwellTimeMinutes,
          publicAccessRequired: rule.publicAccessRequired
        },
        deliveryDemand: {
          dailyDeliveries,
          weeklyFreightTrips: Math.max(dailyDeliveries * 5, loadingDocks.length * 8),
          loadingBaysRequired: bayDemand,
          preferredVehicleClasses: getPreferredVehicleClasses(rule, loadingDocks),
          freightRouteRequired: rule.freightRouteRequired && freightRouteIds.length > 0
        },
        openingHours: rule.openingHours,
        frontageNeeds: {
          publicFrontageRequired: rule.publicAccessRequired,
          activeFrontagePreferred: rule.activeFrontagePreferred,
          minimumFrontageMeters: roundMeters(rule.publicAccessRequired ? Math.min(frontageMeters, Math.max(4, frontageMeters * 0.32)) : 0),
          displayWindowMeters: roundMeters(activeFrontages.length > 0 ? Math.min(frontageMeters * 0.7, activeFrontages.length * 14) : 0),
          publicEntranceIds: [...building.publicEntranceIds].sort()
        },
        loadingNeeds: {
          loadingRequired: dailyDeliveries > 0 || building.typology.serviceAccess !== 'internal-service',
          loadingDockIds: loadingDocks.map((dock) => dock.id).sort(),
          freightRouteIds,
          serviceEntranceIds: [...(building.serviceEntranceIds ?? []), ...(building.loadingEntranceIds ?? [])].sort(),
          curbZoneIds: uniqueSorted(loadingDocks.map((dock) => dock.curbZoneId)),
          bayDemand
        },
        districtFit,
        tags: {
          economicUse: rule.economicUse,
          scheduleProfileId: building.typology.scheduleProfileId,
          districtFitScore: districtFit.score,
          dailyCustomers,
          dailyDeliveries
        }
      });
    }

    return anchors.sort((first, second) => first.id.localeCompare(second.id));
  }
}

function getEconomicUse(building: BuildingPlan): EconomyAnchorUse | undefined {
  switch (building.typology.kind) {
    case 'retail':
      return 'retail';
    case 'office':
      return 'office';
    case 'industrial':
      return 'industrial';
    case 'warehouse':
      return 'warehouse';
    case 'hospitality':
      return 'hospitality';
    case 'mixed-use':
      return 'mixed-use';
    case 'civic':
      return 'civic-service';
    case 'utility':
      return 'utility-service';
    case 'residential':
    case 'special-use':
      return undefined;
  }
}

function getBuildingFloorAreaSqm(building: BuildingPlan): number {
  const shellArea = building.structureShell.floorPlates.reduce((sum, floorPlate) => sum + floorPlate.areaSqM, 0);
  return Math.max(building.footprintGrammar.footprintAreaSqM, shellArea);
}

function getPeakWorkerRatio(shiftProfile: EconomyShiftProfile): number {
  switch (shiftProfile) {
    case 'day':
      return 0.86;
    case 'evening':
      return 0.72;
    case 'round-the-clock':
      return 0.44;
    case 'split':
      return 0.64;
  }
}

function getPrimaryFrontageMeters(building: BuildingPlan): number {
  const side = building.facadeGrammar.sides.find((candidate) => candidate.side === building.primaryFrontageSide);
  return roundMeters(side?.widthMeters ?? Math.max(building.size.x, building.size.z));
}

function getPreferredVehicleClasses(
  rule: EconomyUseRule,
  loadingDocks: readonly FreightLoadingDock[]
): readonly FreightVehicleClass[] {
  const dockVehicleClasses = loadingDocks.flatMap((dock) => dock.allowedVehicleClasses);
  return uniqueSorted(dockVehicleClasses.length > 0 ? dockVehicleClasses : rule.preferredVehicleClasses);
}

function createDistrictFit(
  rule: EconomyUseRule,
  parcel: Parcel,
  building: BuildingPlan,
  activeFrontages: number,
  loadingDocks: number
): EconomyAnchor['districtFit'] {
  const allowedByZoning = parcel.allowedUses.includes(rule.primaryLandUse) || building.uses.includes(rule.primaryLandUse);
  const preferredDistrict = rule.preferredDistrictIds.includes(parcel.districtId);
  const publicRealmFit = rule.activeFrontagePreferred ? activeFrontages > 0 : true;
  const loadingFit = rule.freightRouteRequired ? loadingDocks > 0 : true;
  const score = clamp01(
    0.28 +
      (allowedByZoning ? 0.34 : 0) +
      (preferredDistrict ? 0.2 : 0.06) +
      (publicRealmFit ? 0.08 : 0) +
      (loadingFit ? 0.1 : 0)
  );
  const notes = [
    allowedByZoning ? 'zoning-use-allowed' : 'zoning-use-mismatch',
    preferredDistrict ? 'preferred-district' : 'secondary-district',
    publicRealmFit ? 'frontage-fit' : 'frontage-upgrade-needed',
    loadingFit ? 'loading-fit' : 'loading-upgrade-needed'
  ];

  return {
    score: roundUnit(score),
    compatible: allowedByZoning && score >= 0.5,
    allowedByZoning,
    preferredDistrictIds: rule.preferredDistrictIds,
    notes
  };
}

function groupBy<T>(values: readonly T[], getKey: (value: T) => CityId): Map<CityId, readonly T[]> {
  const groups = new Map<CityId, T[]>();

  for (const value of values) {
    const key = getKey(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  return groups;
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort();
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roundUnit(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMeters(value: number): number {
  return Math.round(value * 10) / 10;
}
