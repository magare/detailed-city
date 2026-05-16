import type {
  CityId,
  EconomyShiftProfile,
  FreightVehicleClass,
  IndustrialFacilityKind,
  IndustrialProcessIntensity,
  IndustrialTemperatureBand,
  IndustrialYardSurface,
  Point2D,
  Polygon2D,
  Polyline2D
} from '../../city/data-contracts/cityContracts';
import type {
  BuildingEntrance,
  BuildingPlan,
  EconomyAnchor,
  FreightLoadingDock,
  FreightRoute,
  IndustrialFacility,
  ServiceAlley
} from '../../types/city';

export interface IndustrialFacilityGeneratorInput {
  readonly economyAnchors: readonly EconomyAnchor[];
  readonly buildings: readonly BuildingPlan[];
  readonly buildingEntrances: readonly BuildingEntrance[];
  readonly freightLoadingDocks: readonly FreightLoadingDock[];
  readonly freightRoutes: readonly FreightRoute[];
  readonly serviceAlleys: readonly ServiceAlley[];
}

interface YardGeometry {
  readonly center: Point2D;
  readonly boundary: Polygon2D;
  readonly areaSqm: number;
}

const VEHICLE_CLASS_ORDER = ['cargo-van', 'box-truck', 'semi-truck'] as const satisfies readonly FreightVehicleClass[];

export class IndustrialFacilityGenerator {
  create(input: IndustrialFacilityGeneratorInput): IndustrialFacility[] {
    const buildingsById = new Map(input.buildings.map((building) => [building.id, building]));
    const entrancesByBuildingId = groupBy(input.buildingEntrances, (entrance) => entrance.buildingId);
    const loadingDocksByBuildingId = groupBy(input.freightLoadingDocks, (dock) => dock.buildingId);
    const freightRoutesById = new Map(input.freightRoutes.map((route) => [route.id, route]));
    const serviceAlleysById = new Map(input.serviceAlleys.map((alley) => [alley.id, alley]));
    const facilities: IndustrialFacility[] = [];

    for (const anchor of [...input.economyAnchors].sort((first, second) => first.id.localeCompare(second.id))) {
      if (anchor.economicUse !== 'industrial' && anchor.economicUse !== 'warehouse') {
        continue;
      }

      const building = buildingsById.get(anchor.buildingId);
      const loadingDocks = loadingDocksByBuildingId.get(anchor.buildingId) ?? [];
      const freightRoutes = anchor.loadingNeeds.freightRouteIds
        .map((routeId) => freightRoutesById.get(routeId))
        .filter((route): route is FreightRoute => Boolean(route));

      if (!building || loadingDocks.length === 0 || freightRoutes.length === 0) {
        continue;
      }

      const facilityKind = getFacilityKind(anchor, loadingDocks, freightRoutes);
      const loadingBays = Math.max(
        anchor.deliveryDemand.loadingBaysRequired,
        loadingDocks.reduce((sum, dock) => sum + dock.loadingBays, 0)
      );
      const dailyTruckTrips = Math.max(
        anchor.deliveryDemand.dailyDeliveries,
        Math.round(anchor.deliveryDemand.weeklyFreightTrips / 5),
        loadingDocks.length * 2
      );
      const yard = createYardGeometry(building, facilityKind, loadingBays);
      const circulationPath = createCirculationPath(yard.boundary);
      const allowedVehicleClasses = getAllowedVehicleClasses(anchor, loadingDocks, freightRoutes);
      const loadingEntranceIds = getLoadingEntranceIds(
        building,
        entrancesByBuildingId.get(building.id) ?? [],
        anchor.loadingNeeds.serviceEntranceIds
      );
      const serviceAlleyId = getServiceAlleyId(loadingDocks, serviceAlleysById);
      const coldChain = createColdChainProfile(anchor.id, facilityKind);

      facilities.push({
        id: `industrial-facility-${anchor.buildingId}`,
        kind: 'industrial-facility',
        ownerDomain: 'economy',
        parentId: anchor.id,
        lod: 'lod2',
        economyAnchorId: anchor.id,
        buildingId: building.id,
        parcelId: anchor.parcelId,
        districtId: anchor.districtId,
        roadId: anchor.roadId,
        center: anchor.center,
        facilityKind,
        production: {
          lightIndustry: facilityKind === 'light-industry',
          workshop: facilityKind === 'workshop',
          fabrication: facilityKind === 'fabrication',
          processIntensity: getProcessIntensity(facilityKind),
          shiftProfile: getShiftProfile(anchor, facilityKind),
          estimatedWorkers: anchor.jobs.estimatedJobs,
          dailyOutputUnits: getDailyOutputUnits(anchor, facilityKind)
        },
        yard: {
          boundary: yard.boundary,
          center: yard.center,
          areaSqm: yard.areaSqm,
          surface: getYardSurface(facilityKind),
          bufferMeters: getBufferMeters(facilityKind),
          storageSlots: Math.max(1, Math.round(loadingBays * (facilityKind === 'warehouse' ? 1.7 : 1.1))),
          outdoorWorkBays: facilityKind === 'fabrication' || facilityKind === 'workshop' ? Math.max(1, Math.ceil(loadingBays / 2)) : 0
        },
        logistics: {
          loadingDockIds: uniqueSorted(loadingDocks.map((dock) => dock.id)),
          freightRouteIds: uniqueSorted(freightRoutes.map((route) => route.id)),
          serviceAlleyId,
          loadingEntranceIds,
          loadingBays,
          dailyTruckTrips,
          allowedVehicleClasses,
          coldChain
        },
        truckCirculation: {
          entryRoadId: anchor.roadId,
          circulationPath,
          stagingBayCount: Math.max(1, Math.min(8, loadingBays + (isWarehouseFacility(facilityKind) ? 2 : 0))),
          turningRadiusMeters: allowedVehicleClasses.includes('semi-truck') ? 12.5 : 8.5,
          queueCapacityTrucks: Math.max(1, Math.ceil(dailyTruckTrips / 8))
        },
        tags: {
          facilityKind,
          economyAnchorId: anchor.id,
          loadingBays,
          dailyTruckTrips,
          coldChain: coldChain.enabled
        }
      });
    }

    return facilities.sort((first, second) => first.id.localeCompare(second.id));
  }
}

function getFacilityKind(
  anchor: EconomyAnchor,
  loadingDocks: readonly FreightLoadingDock[],
  _freightRoutes: readonly FreightRoute[]
): IndustrialFacilityKind {
  const hash = stableHash(anchor.id);
  const hasWarehouseLink =
    anchor.economicUse === 'warehouse' ||
    loadingDocks.some((dock) => dock.warehouseLink || dock.dockKind === 'yard');

  if (hasWarehouseLink) {
    return hash % 4 === 0 ? 'cold-chain' : 'warehouse';
  }

  switch (hash % 3) {
    case 0:
      return 'fabrication';
    case 1:
      return 'workshop';
    default:
      return 'light-industry';
  }
}

function createYardGeometry(
  building: BuildingPlan,
  facilityKind: IndustrialFacilityKind,
  loadingBays: number
): YardGeometry {
  const direction = getFrontageDirection(building.primaryFrontageSide);
  const frontageWidth = Math.max(4, direction.x === 0 ? building.size.x : building.size.z);
  const buildingDepth = Math.max(4, direction.x === 0 ? building.size.z : building.size.x);
  const width = clamp(frontageWidth * (isWarehouseFacility(facilityKind) ? 0.88 : 0.68), 7, isWarehouseFacility(facilityKind) ? 22 : 16);
  const depth = clamp(buildingDepth * (isWarehouseFacility(facilityKind) ? 0.58 : 0.42) + loadingBays * 0.8, 5, isWarehouseFacility(facilityKind) ? 16 : 11);
  const center = {
    x: roundMetric(building.center.x + direction.x * (building.size.x / 2 + depth / 2 + 1.4), 2),
    z: roundMetric(building.center.z + direction.z * (building.size.z / 2 + depth / 2 + 1.4), 2)
  };
  const sizeX = direction.x === 0 ? width : depth;
  const sizeZ = direction.x === 0 ? depth : width;
  const boundary = createRectangleBoundary(center, sizeX, sizeZ);

  return {
    center,
    boundary,
    areaSqm: Math.round(sizeX * sizeZ)
  };
}

function createRectangleBoundary(center: Point2D, sizeX: number, sizeZ: number): Polygon2D {
  const halfX = sizeX / 2;
  const halfZ = sizeZ / 2;

  return [
    { x: roundMetric(center.x - halfX, 2), z: roundMetric(center.z - halfZ, 2) },
    { x: roundMetric(center.x + halfX, 2), z: roundMetric(center.z - halfZ, 2) },
    { x: roundMetric(center.x + halfX, 2), z: roundMetric(center.z + halfZ, 2) },
    { x: roundMetric(center.x - halfX, 2), z: roundMetric(center.z + halfZ, 2) }
  ];
}

function createCirculationPath(boundary: Polygon2D): Polyline2D {
  const xs = boundary.map((point) => point.x);
  const zs = boundary.map((point) => point.z);
  const minX = Math.min(...xs) - 1.8;
  const maxX = Math.max(...xs) + 1.8;
  const minZ = Math.min(...zs) - 1.8;
  const maxZ = Math.max(...zs) + 1.8;

  return [
    { x: roundMetric(minX, 2), z: roundMetric(minZ, 2) },
    { x: roundMetric(maxX, 2), z: roundMetric(minZ, 2) },
    { x: roundMetric(maxX, 2), z: roundMetric(maxZ, 2) },
    { x: roundMetric(minX, 2), z: roundMetric(maxZ, 2) },
    { x: roundMetric(minX, 2), z: roundMetric(minZ, 2) }
  ];
}

function getLoadingEntranceIds(
  building: BuildingPlan,
  entrances: readonly BuildingEntrance[],
  serviceEntranceIds: readonly CityId[]
): readonly CityId[] {
  const loadingDoorIds = entrances
    .filter((entrance) => entrance.entranceKind === 'loading-door' && entrance.buildingId === building.id)
    .map((entrance) => entrance.id);
  return uniqueSorted(loadingDoorIds.length > 0 ? loadingDoorIds : [...(building.loadingEntranceIds ?? []), ...serviceEntranceIds]);
}

function getServiceAlleyId(
  loadingDocks: readonly FreightLoadingDock[],
  serviceAlleysById: ReadonlyMap<CityId, ServiceAlley>
): CityId | undefined {
  for (const dock of loadingDocks) {
    if (dock.serviceAlleyId && serviceAlleysById.has(dock.serviceAlleyId)) {
      return dock.serviceAlleyId;
    }
  }
  return undefined;
}

function getAllowedVehicleClasses(
  anchor: EconomyAnchor,
  loadingDocks: readonly FreightLoadingDock[],
  freightRoutes: readonly FreightRoute[]
): readonly FreightVehicleClass[] {
  const classes = new Set<FreightVehicleClass>(anchor.deliveryDemand.preferredVehicleClasses);

  for (const dock of loadingDocks) {
    dock.allowedVehicleClasses.forEach((vehicleClass) => classes.add(vehicleClass));
  }
  for (const route of freightRoutes) {
    route.allowedVehicleClasses.forEach((vehicleClass) => classes.add(vehicleClass));
  }

  return VEHICLE_CLASS_ORDER.filter((vehicleClass) => classes.has(vehicleClass));
}

function createColdChainProfile(
  anchorId: CityId,
  facilityKind: IndustrialFacilityKind
): IndustrialFacility['logistics']['coldChain'] {
  if (facilityKind !== 'cold-chain') {
    return {
      enabled: false,
      temperatureBand: 'ambient',
      backupPowerHours: 0
    };
  }

  const temperatureBand: IndustrialTemperatureBand = stableHash(anchorId) % 2 === 0 ? 'chilled' : 'frozen';

  return {
    enabled: true,
    temperatureBand,
    backupPowerHours: temperatureBand === 'frozen' ? 24 : 18
  };
}

function getProcessIntensity(facilityKind: IndustrialFacilityKind): IndustrialProcessIntensity {
  if (facilityKind === 'fabrication') {
    return 'high';
  }
  if (facilityKind === 'workshop' || facilityKind === 'cold-chain') {
    return 'medium';
  }
  return 'low';
}

function getShiftProfile(anchor: EconomyAnchor, facilityKind: IndustrialFacilityKind): EconomyShiftProfile {
  return isWarehouseFacility(facilityKind) ? 'round-the-clock' : anchor.jobs.shiftProfile;
}

function getDailyOutputUnits(anchor: EconomyAnchor, facilityKind: IndustrialFacilityKind): number {
  const multiplier = facilityKind === 'warehouse' ? 22 : facilityKind === 'cold-chain' ? 18 : facilityKind === 'fabrication' ? 12 : 8;
  return Math.max(1, anchor.deliveryDemand.dailyDeliveries * multiplier);
}

function getYardSurface(facilityKind: IndustrialFacilityKind): IndustrialYardSurface {
  if (facilityKind === 'warehouse' || facilityKind === 'cold-chain') {
    return 'concrete-apron';
  }
  if (facilityKind === 'fabrication') {
    return 'asphalt-yard';
  }
  return 'gravel-service-yard';
}

function getBufferMeters(facilityKind: IndustrialFacilityKind): number {
  if (facilityKind === 'fabrication') {
    return 5;
  }
  if (isWarehouseFacility(facilityKind)) {
    return 4;
  }
  return 3;
}

function getFrontageDirection(side: BuildingPlan['primaryFrontageSide']): Point2D {
  switch (side) {
    case 'east':
      return { x: 1, z: 0 };
    case 'south':
      return { x: 0, z: 1 };
    case 'west':
      return { x: -1, z: 0 };
    case 'north':
      return { x: 0, z: -1 };
  }
}

function isWarehouseFacility(facilityKind: IndustrialFacilityKind): boolean {
  return facilityKind === 'warehouse' || facilityKind === 'cold-chain';
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

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value: number, precision: number): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
