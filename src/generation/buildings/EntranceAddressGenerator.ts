import type {
  AddressPoint,
  ActiveFrontage,
  BuildingEntrance,
  BuildingPlan,
  FreightLoadingDock,
  Parcel,
  RoadSegment,
  ServiceAccessCorridor
} from '../../types/city';
import type { BuildingEntranceKind, BuildingFrontageSide, CityId, CurbSide, Point2D } from '../../city/data-contracts/cityContracts';

export interface EntranceAddressInput {
  readonly buildings: readonly BuildingPlan[];
  readonly parcels: readonly Parcel[];
  readonly roads: readonly RoadSegment[];
  readonly activeFrontages: readonly ActiveFrontage[];
  readonly serviceAccessCorridors: readonly ServiceAccessCorridor[];
  readonly freightLoadingDocks: readonly FreightLoadingDock[];
}

export interface EntranceAddressOutput {
  readonly buildings: BuildingPlan[];
  readonly activeFrontages: ActiveFrontage[];
  readonly buildingEntrances: BuildingEntrance[];
  readonly addressPoints: AddressPoint[];
}

export class EntranceAddressGenerator {
  create(input: EntranceAddressInput): EntranceAddressOutput {
    const roadsById = new Map(input.roads.map((road) => [road.id, road]));
    const parcelsById = new Map(input.parcels.map((parcel) => [parcel.id, parcel]));
    const activeFrontagesByBuildingId = groupBy(input.activeFrontages, (frontage) => frontage.buildingId);
    const serviceAccessIdsByBuildingId = collectServiceAccessIdsByBuilding(input.serviceAccessCorridors);
    const loadingDockByBuildingId = new Map(input.freightLoadingDocks.map((dock) => [dock.buildingId, dock]));
    const buildingEntrances: BuildingEntrance[] = [];
    const addressPoints: AddressPoint[] = [];
    const buildingAccessById = new Map<CityId, {
      entranceIds: CityId[];
      publicEntranceIds: CityId[];
      serviceEntranceIds: CityId[];
      loadingEntranceIds: CityId[];
      addressPointIds: CityId[];
    }>();

    input.buildings.forEach((building, index) => {
      const road = roadsById.get(building.primaryFrontageRoadId);
      const parcel = parcelsById.get(building.parcelId);

      if (!road || !parcel) {
        return;
      }

      const activeFrontages = activeFrontagesByBuildingId.get(building.id) ?? [];
      const serviceAccessCorridorIds = serviceAccessIdsByBuildingId.get(building.id) ?? [];
      const loadingDock = loadingDockByBuildingId.get(building.id);
      const addressPoint = createAddressPoint(building, road, activeFrontages, index);
      const publicDoor = createEntrance({
        building,
        road,
        entranceKind: 'public-door',
        id: building.publicEntranceIds[0] ?? `${building.id}-entrance-primary`,
        addressPointId: addressPoint.id,
        activeFrontageIds: activeFrontages.map((frontage) => frontage.id),
        serviceAccessCorridorIds: [],
        offsetMeters: 0.9,
        widthMeters: building.typology.entranceStrategy === 'storefront' ? 2.4 : 2,
        accessLevel: 'public',
        accessible: true,
        stepFree: true
      });
      const lobby = createEntrance({
        building,
        road,
        entranceKind: 'lobby',
        id: `${building.id}-entrance-lobby`,
        addressPointId: addressPoint.id,
        activeFrontageIds: activeFrontages.map((frontage) => frontage.id),
        serviceAccessCorridorIds: [],
        offsetMeters: -0.8,
        widthMeters: 3,
        accessLevel: building.uses.includes('residential') && building.uses.length === 1 ? 'resident' : 'public',
        accessible: true,
        stepFree: true,
        lobby: {
          areaSqM: roundMeters(Math.max(12, Math.min(90, building.size.x * building.size.z * 0.08))),
          weatherProtected: true,
          publicHoursProfile: `hours:${building.typology.kind}:lobby`
        }
      });
      const ramp = createEntrance({
        building,
        road,
        entranceKind: 'ramp',
        id: `${building.id}-entrance-ramp`,
        addressPointId: addressPoint.id,
        activeFrontageIds: activeFrontages.map((frontage) => frontage.id),
        serviceAccessCorridorIds: [],
        offsetMeters: 2.6,
        widthMeters: 1.8,
        accessLevel: 'public',
        accessible: true,
        stepFree: true,
        ramp: {
          slopePercent: 5,
          widthMeters: 1.8,
          landingLengthMeters: 1.5
        }
      });
      const serviceEntry = createEntrance({
        building,
        road,
        entranceKind: 'service-entry',
        id: `${building.id}-entrance-service`,
        addressPointId: addressPoint.id,
        activeFrontageIds: [],
        serviceAccessCorridorIds,
        offsetMeters: 1.2,
        sideOverride: getOppositeSide(building.primaryFrontageSide),
        widthMeters: 1.4,
        accessLevel: 'service',
        accessible: true,
        stepFree: true
      });
      const entrances = [publicDoor, lobby, ramp, serviceEntry];
      const loadingEntranceIds: CityId[] = [];

      if (building.typology.serviceAccess === 'curb-loading' || building.typology.serviceAccess === 'yard-loading') {
        const loadingDoor = createEntrance({
          building,
          road,
          entranceKind: 'loading-door',
          id: `${building.id}-entrance-loading`,
          addressPointId: addressPoint.id,
          activeFrontageIds: [],
          serviceAccessCorridorIds,
          offsetMeters: 2.4,
          sideOverride: getOppositeSide(building.primaryFrontageSide),
          widthMeters: building.typology.serviceAccess === 'yard-loading' ? 4.2 : 2.8,
          accessLevel: 'service',
          accessible: true,
          stepFree: true,
          loading: {
            loadingDockId: loadingDock?.id,
            loadingBays: loadingDock?.loadingBays ?? (building.typology.serviceAccess === 'yard-loading' ? 2 : 1),
            clearHeightMeters: building.typology.serviceAccess === 'yard-loading' ? 4.5 : 3.4
          }
        });
        entrances.push(loadingDoor);
        loadingEntranceIds.push(loadingDoor.id);
      }

      buildingEntrances.push(...entrances);
      addressPoints.push({
        ...addressPoint,
        entranceIds: entrances.map((entrance) => entrance.id)
      });
      buildingAccessById.set(building.id, {
        entranceIds: entrances.map((entrance) => entrance.id),
        publicEntranceIds: [publicDoor.id, lobby.id, ramp.id],
        serviceEntranceIds: [serviceEntry.id],
        loadingEntranceIds,
        addressPointIds: [addressPoint.id]
      });
    });

    return {
      buildings: input.buildings.map((building) => {
        const access = buildingAccessById.get(building.id);
        return access
          ? {
              ...building,
              entranceIds: access.entranceIds,
              publicEntranceIds: access.publicEntranceIds,
              serviceEntranceIds: access.serviceEntranceIds,
              loadingEntranceIds: access.loadingEntranceIds,
              addressPointIds: access.addressPointIds
            }
          : building;
      }),
      activeFrontages: input.activeFrontages.map((frontage) => {
        const access = buildingAccessById.get(frontage.buildingId);
        return access ? { ...frontage, publicEntranceIds: access.publicEntranceIds } : frontage;
      }),
      buildingEntrances,
      addressPoints
    };
  }
}

function createAddressPoint(
  building: BuildingPlan,
  road: RoadSegment,
  activeFrontages: readonly ActiveFrontage[],
  buildingIndex: number
): Omit<AddressPoint, 'entranceIds'> {
  return {
    id: `${building.id}-address-primary`,
    kind: 'address-point',
    ownerDomain: 'buildings',
    parentId: building.id,
    lod: 'lod2',
    buildingId: building.id,
    parcelId: building.parcelId,
    roadId: road.id,
    position: getFacadePosition(building, building.primaryFrontageSide, 3.2),
    streetName: road.corridorName,
    buildingNumber: String(100 + buildingIndex * 2),
    unitRange: building.floorCount > 1 ? `1-${building.floorCount}` : undefined,
    postalCode: `DC-${String((buildingIndex % 90) + 10).padStart(2, '0')}${String(Math.floor(buildingIndex / 90) + 1).padStart(2, '0')}`,
    activeFrontageIds: activeFrontages.map((frontage) => frontage.id),
    primary: true
  };
}

function createEntrance(input: {
  readonly building: BuildingPlan;
  readonly road: RoadSegment;
  readonly entranceKind: BuildingEntranceKind;
  readonly id: CityId;
  readonly addressPointId: CityId;
  readonly activeFrontageIds: readonly CityId[];
  readonly serviceAccessCorridorIds: readonly CityId[];
  readonly offsetMeters: number;
  readonly sideOverride?: BuildingFrontageSide;
  readonly widthMeters: number;
  readonly accessLevel: BuildingEntrance['accessLevel'];
  readonly accessible: boolean;
  readonly stepFree: boolean;
  readonly lobby?: BuildingEntrance['lobby'];
  readonly ramp?: BuildingEntrance['ramp'];
  readonly loading?: BuildingEntrance['loading'];
}): BuildingEntrance {
  const side = input.sideOverride ?? input.building.primaryFrontageSide;
  const position = getFacadePosition(input.building, side, input.offsetMeters);
  const roadSide = getRoadSide(input.road, position);

  return {
    id: input.id,
    kind: 'building-entrance',
    ownerDomain: 'buildings',
    parentId: input.building.id,
    lod: 'lod4',
    entranceKind: input.entranceKind,
    accessLevel: input.accessLevel,
    buildingId: input.building.id,
    parcelId: input.building.parcelId,
    roadId: input.road.id,
    sidewalkId: getSidewalkId(input.road, roadSide),
    activeFrontageIds: input.activeFrontageIds,
    serviceAccessCorridorIds: input.serviceAccessCorridorIds,
    addressPointId: input.addressPointId,
    position,
    frontageSide: side,
    facingDirectionRadians: getFacingDirectionRadians(side),
    widthMeters: input.widthMeters,
    accessible: input.accessible,
    stepFree: input.stepFree,
    door: {
      automatic: input.entranceKind === 'public-door' || input.entranceKind === 'lobby',
      clearWidthMeters: input.entranceKind === 'loading-door' ? Math.max(2.4, input.widthMeters - 0.2) : Math.min(input.widthMeters, 1.8),
      swing: input.entranceKind === 'loading-door' ? 'sliding' : 'outward'
    },
    lobby: input.lobby,
    ramp: input.ramp,
    loading: input.loading
  };
}

function collectServiceAccessIdsByBuilding(corridors: readonly ServiceAccessCorridor[]): Map<CityId, CityId[]> {
  const idsByBuildingId = new Map<CityId, CityId[]>();
  for (const corridor of corridors) {
    for (const buildingId of corridor.buildingIds) {
      idsByBuildingId.set(buildingId, [...(idsByBuildingId.get(buildingId) ?? []), corridor.id]);
    }
  }
  return new Map([...idsByBuildingId].map(([buildingId, ids]) => [buildingId, [...ids].sort()]));
}

function groupBy<T>(items: readonly T[], getKey: (item: T) => CityId): Map<CityId, T[]> {
  const groups = new Map<CityId, T[]>();
  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

function getFacadePosition(building: BuildingPlan, side: BuildingFrontageSide, offsetMeters: number): Point2D {
  switch (side) {
    case 'north':
      return { x: roundMeters(building.center.x), z: roundMeters(building.center.z - building.size.z / 2 - offsetMeters) };
    case 'south':
      return { x: roundMeters(building.center.x), z: roundMeters(building.center.z + building.size.z / 2 + offsetMeters) };
    case 'east':
      return { x: roundMeters(building.center.x + building.size.x / 2 + offsetMeters), z: roundMeters(building.center.z) };
    case 'west':
      return { x: roundMeters(building.center.x - building.size.x / 2 - offsetMeters), z: roundMeters(building.center.z) };
  }
}

function getOppositeSide(side: BuildingFrontageSide): BuildingFrontageSide {
  switch (side) {
    case 'north':
      return 'south';
    case 'south':
      return 'north';
    case 'east':
      return 'west';
    case 'west':
      return 'east';
  }
}

function getRoadSide(road: RoadSegment, position: Point2D): CurbSide {
  if (road.orientation === 'vertical') {
    return position.x < road.center.x ? 'left' : 'right';
  }
  return position.z < road.center.z ? 'left' : 'right';
}

function getSidewalkId(road: RoadSegment, roadSide: CurbSide): CityId {
  return road.sidewalks.find((sidewalk) => sidewalk.id.endsWith(`-${roadSide}`))?.id ?? `${road.id}-sidewalk-${roadSide}`;
}

function getFacingDirectionRadians(side: BuildingFrontageSide): number {
  switch (side) {
    case 'north':
      return Math.PI;
    case 'south':
      return 0;
    case 'east':
      return Math.PI / 2;
    case 'west':
      return -Math.PI / 2;
  }
}

function roundMeters(value: number): number {
  return Number(value.toFixed(2));
}
