import type {
  CityId,
  FreightDeliveryWindowContract,
  FreightLoadingDockKind,
  FreightRouteKind,
  FreightTruckRestrictionContract,
  FreightVehicleClass,
  Point2D
} from '../../city/data-contracts/cityContracts';
import type { BuildingPlan, CurbZone, FreightLoadingDock, FreightRoute, Parcel, RoadSegment, ServiceAlley } from '../../types/city';

export interface FreightLogisticsGeneratorInput {
  readonly roads: readonly RoadSegment[];
  readonly parcels: readonly Parcel[];
  readonly buildings: readonly BuildingPlan[];
  readonly curbZones: readonly CurbZone[];
}

export interface FreightLogisticsPlan {
  readonly loadingDocks: FreightLoadingDock[];
  readonly routes: FreightRoute[];
  readonly serviceAlleys: ServiceAlley[];
}

interface DockCandidate {
  readonly building: BuildingPlan;
  readonly parcel: Parcel;
  readonly road: RoadSegment;
  readonly curbZone: CurbZone;
  readonly routeKind: FreightRouteKind;
  readonly dockKind: FreightLoadingDockKind;
  readonly vehicleClasses: readonly FreightVehicleClass[];
}

export class FreightLogisticsGenerator {
  create(input: FreightLogisticsGeneratorInput): FreightLogisticsPlan {
    const roadsById = new Map(input.roads.map((road) => [road.id, road]));
    const parcelsById = new Map(input.parcels.map((parcel) => [parcel.id, parcel]));
    const loadingCurbZonesByRoad = groupByRoad(
      input.curbZones.filter((zone) => zone.curbUse === 'loading' && zone.management.loadingDockAccess)
    );
    const candidates = input.buildings
      .map((building) => this.createCandidate(building, parcelsById, roadsById, loadingCurbZonesByRoad))
      .filter((candidate): candidate is DockCandidate => Boolean(candidate));
    const candidatesByRoad = groupCandidatesByRoad(candidates);
    const serviceAlleys = this.createServiceAlleys(candidatesByRoad);
    const serviceAlleyIdsByRoad = new Map(serviceAlleys.map((alley) => [alley.roadId, alley.id]));
    const routes = this.createRoutes(candidatesByRoad, input.roads);
    const routeIdsByRoad = new Map(routes.map((route) => [route.roadIds[0], route.id]));
    const loadingDocks = candidates.map((candidate) =>
      this.createLoadingDock(candidate, routeIdsByRoad.get(candidate.road.id), serviceAlleyIdsByRoad.get(candidate.road.id))
    );
    const loadingDockIdsByRoad = groupIdsByRoad(loadingDocks);

    return {
      loadingDocks: loadingDocks.map((dock) => ({
        ...dock,
        linkedRouteIds: dock.linkedRouteIds.filter((routeId) => routes.some((route) => route.id === routeId))
      })),
      routes: routes.map((route) => ({
        ...route,
        loadingDockIds: loadingDockIdsByRoad.get(route.roadIds[0]) ?? []
      })),
      serviceAlleys: serviceAlleys.map((alley) => ({
        ...alley,
        loadingDockIds: loadingDockIdsByRoad.get(alley.roadId) ?? []
      }))
    };
  }

  private createCandidate(
    building: BuildingPlan,
    parcelsById: ReadonlyMap<CityId, Parcel>,
    roadsById: ReadonlyMap<CityId, RoadSegment>,
    loadingCurbZonesByRoad: ReadonlyMap<CityId, readonly CurbZone[]>
  ): DockCandidate | undefined {
    const parcel = parcelsById.get(building.parcelId);
    const routeKind = getRouteKind(building);

    if (!parcel || !routeKind) {
      return undefined;
    }

    for (const roadId of parcel.frontageRoadIds) {
      const road = roadsById.get(roadId);
      const curbZone = loadingCurbZonesByRoad.get(roadId)?.[0];

      if (road && curbZone && road.lanes.some((lane) => lane.allowedModes.includes('freight'))) {
        return {
          building,
          parcel,
          road,
          curbZone,
          routeKind,
          dockKind: getDockKind(building),
          vehicleClasses: getVehicleClasses(building)
        };
      }
    }

    return undefined;
  }

  private createLoadingDock(candidate: DockCandidate, routeId: CityId | undefined, serviceAlleyId: CityId | undefined): FreightLoadingDock {
    const deliveryWindow = getDeliveryWindow(candidate.routeKind);

    return {
      id: `freight-loading-dock-${candidate.building.id}`,
      kind: 'freight-loading-dock',
      ownerDomain: 'mobility',
      parentId: candidate.building.id,
      lod: 'lod3',
      buildingId: candidate.building.id,
      parcelId: candidate.parcel.id,
      districtId: candidate.parcel.districtId,
      roadId: candidate.road.id,
      curbZoneId: candidate.curbZone.id,
      serviceAlleyId,
      position: candidate.curbZone.center,
      dockKind: candidate.dockKind,
      loadingBays: candidate.routeKind === 'warehouse-link' ? 3 : candidate.routeKind === 'industrial-haul' ? 2 : 1,
      dockHeightMeters: candidate.dockKind === 'curbside' ? 0.2 : 1.2,
      deliveryWindow,
      allowedVehicleClasses: candidate.vehicleClasses,
      linkedRouteIds: routeId ? [routeId] : [],
      warehouseLink: candidate.routeKind === 'warehouse-link',
      lastMileRadiusMeters: candidate.routeKind === 'retail-delivery' ? 180 : 320,
      tags: {
        freightRouteKind: candidate.routeKind,
        deliveryWindow: deliveryWindow.windowKind,
        curbZoneId: candidate.curbZone.id
      }
    };
  }

  private createRoutes(candidatesByRoad: ReadonlyMap<CityId, readonly DockCandidate[]>, roads: readonly RoadSegment[]): FreightRoute[] {
    const restrictedRoadIds = roads
      .filter((road) => !road.lanes.some((lane) => lane.allowedModes.includes('freight')))
      .map((road) => road.id);

    return [...candidatesByRoad.entries()].map(([roadId, candidates]) => {
      const road = candidates[0].road;
      const routeKind = getDominantRouteKind(candidates);
      const deliveryWindow = getDeliveryWindow(routeKind);
      const allowedVehicleClasses = getRouteVehicleClasses(candidates);

      return {
        id: `freight-route-${roadId}-${routeKind}`,
        kind: 'freight-route',
        ownerDomain: 'mobility',
        lod: 'lod2',
        routeKind,
        roadIds: [roadId],
        laneIds: road.lanes.filter((lane) => lane.allowedModes.includes('freight')).map((lane) => lane.id),
        loadingDockIds: [],
        curbZoneIds: candidates.map((candidate) => candidate.curbZone.id),
        warehouseBuildingIds: candidates
          .filter((candidate) => candidate.routeKind === 'warehouse-link')
          .map((candidate) => candidate.building.id),
        polyline: road.centerline,
        deliveryWindow,
        allowedVehicleClasses,
        truckRestriction: createTruckRestriction(routeKind, restrictedRoadIds),
        lastMileStopCount: candidates.length,
        tags: {
          routeKind,
          deliveryWindow: deliveryWindow.windowKind,
          stops: candidates.length
        }
      };
    });
  }

  private createServiceAlleys(candidatesByRoad: ReadonlyMap<CityId, readonly DockCandidate[]>): ServiceAlley[] {
    return [...candidatesByRoad.entries()]
      .filter(([, candidates]) => candidates.some((candidate) => candidate.dockKind !== 'curbside'))
      .map(([roadId, candidates], index) => {
        const road = candidates[0].road;
        const deliveryWindow = getDeliveryWindow(getDominantRouteKind(candidates));

        return {
          id: `service-alley-${roadId}-${index}`,
          kind: 'service-alley',
          ownerDomain: 'mobility',
          parentId: roadId,
          lod: 'lod2',
          roadId,
          buildingIds: candidates.map((candidate) => candidate.building.id),
          parcelIds: candidates.map((candidate) => candidate.parcel.id),
          loadingDockIds: [],
          centerline: offsetPolyline(road.centerline, road.orientation === 'vertical' ? { x: 7, z: 0 } : { x: 0, z: 7 }),
          widthMeters: 5.5,
          accessControlled: true,
          deliveryWindow,
          allowedVehicleClasses: getRouteVehicleClasses(candidates),
          tags: {
            deliveryWindow: deliveryWindow.windowKind,
            serviceBuildings: candidates.length
          }
        };
      });
  }
}

function groupByRoad(curbZones: readonly CurbZone[]): Map<CityId, readonly CurbZone[]> {
  const groups = new Map<CityId, CurbZone[]>();

  for (const curbZone of curbZones) {
    groups.set(curbZone.roadId, [...(groups.get(curbZone.roadId) ?? []), curbZone]);
  }

  return new Map([...groups.entries()].map(([roadId, zones]) => [roadId, zones.sort((a, b) => a.startMeters - b.startMeters)]));
}

function groupCandidatesByRoad(candidates: readonly DockCandidate[]): Map<CityId, readonly DockCandidate[]> {
  const groups = new Map<CityId, DockCandidate[]>();

  for (const candidate of candidates) {
    groups.set(candidate.road.id, [...(groups.get(candidate.road.id) ?? []), candidate]);
  }

  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function groupIdsByRoad(loadingDocks: readonly FreightLoadingDock[]): Map<CityId, readonly CityId[]> {
  const groups = new Map<CityId, CityId[]>();

  for (const dock of loadingDocks) {
    groups.set(dock.roadId, [...(groups.get(dock.roadId) ?? []), dock.id]);
  }

  return groups;
}

function getRouteKind(building: BuildingPlan): FreightRouteKind | undefined {
  if (isWarehouseFreightBuilding(building)) {
    return 'warehouse-link';
  }

  if (building.uses.includes('industrial')) {
    return 'industrial-haul';
  }

  if (building.uses.some((use) => use === 'retail' || use === 'mixed-use' || use === 'hospitality')) {
    return 'retail-delivery';
  }

  return undefined;
}

function getDockKind(building: BuildingPlan): FreightLoadingDockKind {
  if (isWarehouseFreightBuilding(building)) {
    return 'yard';
  }

  if (building.uses.includes('industrial')) {
    return 'service-bay';
  }

  return 'curbside';
}

function getVehicleClasses(building: BuildingPlan): readonly FreightVehicleClass[] {
  if (isWarehouseFreightBuilding(building)) {
    return ['cargo-van', 'box-truck', 'semi-truck'];
  }

  if (building.uses.includes('industrial')) {
    return ['cargo-van', 'box-truck'];
  }

  return ['cargo-van'];
}

function isWarehouseFreightBuilding(building: BuildingPlan): boolean {
  return building.typology.kind === 'warehouse' || (building.typology.kind === 'industrial' && building.id.endsWith('-0'));
}

function getDominantRouteKind(candidates: readonly DockCandidate[]): FreightRouteKind {
  if (candidates.some((candidate) => candidate.routeKind === 'warehouse-link')) {
    return 'warehouse-link';
  }

  if (candidates.some((candidate) => candidate.routeKind === 'industrial-haul')) {
    return 'industrial-haul';
  }

  return 'retail-delivery';
}

function getRouteVehicleClasses(candidates: readonly DockCandidate[]): readonly FreightVehicleClass[] {
  const classes = new Set<FreightVehicleClass>();

  for (const candidate of candidates) {
    for (const vehicleClass of candidate.vehicleClasses) {
      classes.add(vehicleClass);
    }
  }

  return ['cargo-van', 'box-truck', 'semi-truck'].filter((vehicleClass) => classes.has(vehicleClass as FreightVehicleClass)) as FreightVehicleClass[];
}

function getDeliveryWindow(routeKind: FreightRouteKind): FreightDeliveryWindowContract {
  if (routeKind === 'warehouse-link') {
    return { windowKind: 'overnight', startHour: 22, endHour: 5, days: ['weekday', 'saturday'] };
  }

  if (routeKind === 'industrial-haul') {
    return { windowKind: 'off-peak', startHour: 10, endHour: 16, days: ['weekday'] };
  }

  return { windowKind: 'morning', startHour: 6, endHour: 11, days: ['weekday', 'saturday'] };
}

function createTruckRestriction(routeKind: FreightRouteKind, restrictedRoadIds: readonly CityId[]): FreightTruckRestrictionContract {
  if (routeKind === 'warehouse-link') {
    return { maxLengthMeters: 16.5, maxWeightTonnes: 36, hazmatAllowed: false, restrictedRoadIds };
  }

  if (routeKind === 'industrial-haul') {
    return { maxLengthMeters: 12, maxWeightTonnes: 24, hazmatAllowed: false, restrictedRoadIds };
  }

  return { maxLengthMeters: 7.5, maxWeightTonnes: 7, hazmatAllowed: false, restrictedRoadIds };
}

function offsetPolyline(points: readonly [Point2D, Point2D], offset: Point2D): readonly [Point2D, Point2D] {
  return [
    { x: points[0].x + offset.x, z: points[0].z + offset.z },
    { x: points[1].x + offset.x, z: points[1].z + offset.z }
  ];
}
