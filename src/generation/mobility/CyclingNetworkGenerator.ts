import { DEFAULT_STREET_PROFILES } from '../../city/data-contracts/cityContracts';
import type { BikeFacilityKind, CityId, CurbSide, Point2D } from '../../city/data-contracts/cityContracts';
import type {
  BikeConflictZone,
  BikeGraphEdge,
  BikeGraphNode,
  BikeParking,
  BikeSegment,
  BikeSignal,
  CrossingPlan,
  CurbZone,
  IntersectionPlan,
  RoadSegment,
  StreetFurniture,
  TransitStop
} from '../../types/city';

export interface CyclingNetworkGeneratorInput {
  readonly roads: readonly RoadSegment[];
  readonly intersections: readonly IntersectionPlan[];
  readonly crossings: readonly CrossingPlan[];
  readonly curbZones: readonly CurbZone[];
  readonly streetFurniture: readonly StreetFurniture[];
  readonly transitStops: readonly TransitStop[];
}

export interface CyclingNetworkPlan {
  readonly bikeSegments: BikeSegment[];
  readonly bikeGraphNodes: BikeGraphNode[];
  readonly bikeGraphEdges: BikeGraphEdge[];
  readonly bikeParking: BikeParking[];
  readonly bikeSignals: BikeSignal[];
  readonly bikeConflictZones: BikeConflictZone[];
}

export class CyclingNetworkGenerator {
  create(input: CyclingNetworkGeneratorInput): CyclingNetworkPlan {
    const intersectionsByRoad = groupIntersectionsByRoad(input.intersections);
    const crossingsByRoad = groupCrossingsByRoad(input.crossings);
    const curbZonesByRoad = groupCurbZonesByRoad(input.curbZones);
    const transitStopsByRoad = groupTransitStopsByRoad(input.transitStops);
    const bikeSegments = input.roads.flatMap((road) => createBikeSegments(road));
    const conflictZones = bikeSegments.flatMap((segment) =>
      createConflictZones(segment, intersectionsByRoad.get(segment.roadId) ?? [], crossingsByRoad.get(segment.roadId) ?? [], curbZonesByRoad.get(segment.roadId) ?? [], transitStopsByRoad.get(segment.roadId) ?? [])
    );
    const conflictsBySegment = groupConflictsBySegment(conflictZones);
    const bikeParking = createBikeParking(bikeSegments, input.streetFurniture, input.transitStops);
    const parkingBySegment = groupParkingBySegment(bikeParking);
    const bikeSegmentsWithRefs = bikeSegments.map((segment) => ({
      ...segment,
      bikeParkingIds: parkingBySegment.get(segment.id) ?? [],
      conflictZoneIds: conflictsBySegment.get(segment.id) ?? []
    }));
    const graphNodes = bikeSegmentsWithRefs.flatMap((segment) => createGraphNodes(segment, intersectionsByRoad.get(segment.roadId) ?? [], bikeParking));
    const graphEdges = bikeSegmentsWithRefs.map((segment) => createGraphEdge(segment, graphNodes));
    const bikeSignals = bikeSegmentsWithRefs.flatMap((segment) =>
      createBikeSignals(segment, intersectionsByRoad.get(segment.roadId) ?? [], conflictsBySegment.get(segment.id) ?? [])
    );

    return {
      bikeSegments: bikeSegmentsWithRefs,
      bikeGraphNodes: graphNodes,
      bikeGraphEdges: graphEdges,
      bikeParking,
      bikeSignals,
      bikeConflictZones: conflictZones
    };
  }
}

function createBikeSegments(road: RoadSegment): BikeSegment[] {
  const profile = DEFAULT_STREET_PROFILES.find((candidate) => candidate.id === road.streetProfileId);
  const facilityKind = getBikeFacilityKind(profile?.bikeLane ?? 'none', road.hierarchy);

  if (!facilityKind) {
    return [];
  }

  return (['left', 'right'] as const).map((side) => ({
    id: `bike-segment-${road.id}-${side}`,
    kind: 'bike-segment',
    ownerDomain: 'mobility',
    parentId: road.id,
    lod: facilityKind === 'shared-street' ? 'lod2' : 'lod3',
    roadId: road.id,
    side,
    facilityKind,
    startMeters: 0,
    endMeters: road.length,
    lengthMeters: road.length,
    widthMeters: getBikeFacilityWidth(facilityKind),
    centerline: offsetBikeCenterline(road, side, getBikeFacilityOffset(facilityKind)),
    protected: facilityKind === 'protected-lane' || facilityKind === 'cycle-track',
    connectsToTransit: road.transitEligible,
    bikeParkingIds: [],
    conflictZoneIds: [],
    tags: {
      facilityKind,
      roadId: road.id,
      side,
      protected: facilityKind === 'protected-lane' || facilityKind === 'cycle-track'
    }
  }));
}

function createConflictZones(
  segment: BikeSegment,
  intersections: readonly IntersectionPlan[],
  crossings: readonly CrossingPlan[],
  curbZones: readonly CurbZone[],
  transitStops: readonly TransitStop[]
): BikeConflictZone[] {
  const turningConflicts = intersections.slice(0, 6).map((intersection, index) =>
    createConflictZone(segment, `intersection-${index}`, intersection.center, 'turning-conflict', segment.protected ? 'medium' : 'high', segment.protected ? 'buffer' : 'signal', {
      intersectionId: intersection.id
    })
  );
  const transitConflicts = transitStops
    .filter((stop) => stop.side === segment.side)
    .slice(0, 2)
    .map((stop, index) =>
      createConflictZone(segment, `transit-${index}`, stop.center, 'transit-stop-conflict', 'medium', 'signal', {})
    );
  const doorConflicts = curbZones
    .filter((zone) => zone.side === segment.side && zone.curbUse === 'parking' && segment.facilityKind === 'painted-lane')
    .slice(0, 3)
    .map((zone, index) =>
      createConflictZone(segment, `door-${index}`, zone.center, 'door-zone', 'medium', 'paint', {
        curbZoneId: zone.id
      })
    );
  const drivewayConflicts = crossings
    .filter((crossing) => crossing.crossingLocation === 'midblock')
    .slice(0, 1)
    .map((crossing, index) =>
      createConflictZone(segment, `crossing-${index}`, crossing.center, 'driveway-crossing', 'low', 'raised-crossing', {
        crossingId: crossing.id
      })
    );

  return [...turningConflicts, ...transitConflicts, ...doorConflicts, ...drivewayConflicts];
}

function createConflictZone(
  segment: BikeSegment,
  suffix: string,
  position: Point2D,
  conflictKind: BikeConflictZone['conflictKind'],
  severity: BikeConflictZone['severity'],
  mitigation: BikeConflictZone['mitigation'],
  refs: Pick<BikeConflictZone, 'intersectionId' | 'curbZoneId' | 'crossingId'>
): BikeConflictZone {
  return {
    id: `bike-conflict-zone-${segment.roadId}-${segment.side}-${suffix}`,
    kind: 'bike-conflict-zone',
    ownerDomain: 'mobility',
    parentId: segment.id,
    lod: 'lod2',
    roadId: segment.roadId,
    segmentId: segment.id,
    position,
    conflictKind,
    severity,
    mitigation,
    ...refs,
    tags: {
      conflictKind,
      mitigation,
      segmentId: segment.id
    }
  };
}

function createBikeParking(
  bikeSegments: readonly BikeSegment[],
  streetFurniture: readonly StreetFurniture[],
  transitStops: readonly TransitStop[]
): BikeParking[] {
  const segmentsByRoadSide = new Map(bikeSegments.map((segment) => [`${segment.roadId}:${segment.side}`, segment]));
  const transitStopByRoadSide = new Map(transitStops.map((stop) => [`${stop.roadId}:${stop.side}`, stop]));

  return streetFurniture
    .filter((furniture) => furniture.furnitureType === 'bike-rack')
    .flatMap((furniture, index) => {
      const segment = segmentsByRoadSide.get(`${furniture.roadId}:${furniture.side}`);

      if (!segment) {
        return [];
      }

      const transitStop = transitStopByRoadSide.get(`${furniture.roadId}:${furniture.side}`);

      return [
        {
          id: `bike-parking-${furniture.id}`,
          kind: 'bike-parking',
          ownerDomain: 'mobility',
          parentId: furniture.id,
          lod: 'lod3',
          roadId: furniture.roadId,
          sidewalkId: furniture.sidewalkId,
          streetFurnitureId: furniture.id,
          segmentId: segment.id,
          position: furniture.position,
          capacity: index % 5 === 0 ? 12 : 6,
          parkingKind: index % 5 === 0 ? 'corral' : 'rack',
          connectsToTransitStopId: transitStop?.id,
          tags: {
            segmentId: segment.id,
            parkingKind: index % 5 === 0 ? 'corral' : 'rack'
          }
        } satisfies BikeParking
      ];
    });
}

function createGraphNodes(
  segment: BikeSegment,
  intersections: readonly IntersectionPlan[],
  bikeParking: readonly BikeParking[]
): BikeGraphNode[] {
  const parkingNodes = bikeParking
    .filter((parking) => parking.segmentId === segment.id)
    .slice(0, 2)
    .map((parking, index) => createGraphNode(segment, `parking-${index}`, parking.position, 'parking', parking.id));
  const endpointNodes = [
    createGraphNode(segment, 'start', segment.centerline[0], 'segment-start'),
    createGraphNode(segment, 'end', segment.centerline[1], 'segment-end')
  ];
  const intersectionNodes = intersections.slice(0, 4).map((intersection, index) =>
    createGraphNode(segment, `intersection-${index}`, intersection.center, 'intersection', intersection.id)
  );

  return [...endpointNodes, ...intersectionNodes, ...parkingNodes];
}

function createGraphNode(
  segment: BikeSegment,
  suffix: string,
  position: Point2D,
  nodeRole: BikeGraphNode['nodeRole'],
  linkedId?: CityId
): BikeGraphNode {
  return {
    id: `bike-graph-node-${segment.roadId}-${segment.side}-${suffix}`,
    kind: 'bike-graph-node',
    ownerDomain: 'mobility',
    parentId: segment.id,
    lod: 'lod2',
    roadId: segment.roadId,
    segmentId: segment.id,
    intersectionId: nodeRole === 'intersection' ? linkedId : undefined,
    position,
    nodeRole,
    accessibleToTransit: segment.connectsToTransit,
    tags: {
      segmentId: segment.id,
      nodeRole
    }
  };
}

function createGraphEdge(segment: BikeSegment, nodes: readonly BikeGraphNode[]): BikeGraphEdge {
  const segmentNodes = nodes.filter((node) => node.segmentId === segment.id);
  const fromNode = segmentNodes.find((node) => node.nodeRole === 'segment-start') ?? segmentNodes[0];
  const toNode = segmentNodes.find((node) => node.nodeRole === 'segment-end') ?? segmentNodes[segmentNodes.length - 1];

  return {
    id: `bike-graph-edge-${segment.roadId}-${segment.side}`,
    kind: 'bike-graph-edge',
    ownerDomain: 'mobility',
    parentId: segment.id,
    lod: 'lod2',
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    segmentId: segment.id,
    roadId: segment.roadId,
    lengthMeters: segment.lengthMeters,
    facilityKind: segment.facilityKind,
    protected: segment.protected,
    conflictZoneIds: segment.conflictZoneIds,
    tags: {
      segmentId: segment.id,
      facilityKind: segment.facilityKind
    }
  };
}

function createBikeSignals(
  segment: BikeSegment,
  intersections: readonly IntersectionPlan[],
  conflictZoneIds: readonly CityId[]
): BikeSignal[] {
  if (!segment.protected) {
    return [];
  }

  return intersections
    .filter((intersection) => intersection.controlType === 'traffic-signal')
    .slice(0, 3)
    .map((intersection, index) => ({
      id: `bike-signal-${intersection.id}-${segment.roadId}-${segment.side}`,
      kind: 'bike-signal',
      ownerDomain: 'mobility',
      parentId: intersection.id,
      lod: 'lod3',
      intersectionId: intersection.id,
      roadId: segment.roadId,
      segmentId: segment.id,
      position: intersection.center,
      signalKind: index % 2 === 0 ? 'protected-phase' : 'leading-bike-interval',
      protectedPhaseSeconds: index % 2 === 0 ? 18 : 8,
      conflictZoneIds: conflictZoneIds.slice(0, 3),
      tags: {
        segmentId: segment.id,
        signalKind: index % 2 === 0 ? 'protected-phase' : 'leading-bike-interval'
      }
    }));
}

function getBikeFacilityKind(bikeLane: string, hierarchy: RoadSegment['hierarchy']): BikeFacilityKind | undefined {
  if (bikeLane === 'protected') {
    return 'protected-lane';
  }

  if (bikeLane === 'painted') {
    return 'painted-lane';
  }

  if (bikeLane === 'cycle-track') {
    return 'cycle-track';
  }

  return hierarchy === 'local' ? 'shared-street' : undefined;
}

function getBikeFacilityWidth(facilityKind: BikeFacilityKind): number {
  switch (facilityKind) {
    case 'cycle-track':
      return 3.2;
    case 'protected-lane':
      return 2.4;
    case 'painted-lane':
      return 1.8;
    case 'shared-street':
      return 1.5;
  }
}

function getBikeFacilityOffset(facilityKind: BikeFacilityKind): number {
  switch (facilityKind) {
    case 'cycle-track':
      return 9.4;
    case 'protected-lane':
      return 8.3;
    case 'painted-lane':
      return 6.6;
    case 'shared-street':
      return 4.2;
  }
}

function offsetBikeCenterline(road: RoadSegment, side: CurbSide, offsetMeters: number): readonly [Point2D, Point2D] {
  const sign = side === 'left' ? -1 : 1;
  const offset = road.orientation === 'vertical' ? { x: sign * offsetMeters, z: 0 } : { x: 0, z: sign * offsetMeters };

  return [
    { x: road.centerline[0].x + offset.x, z: road.centerline[0].z + offset.z },
    { x: road.centerline[1].x + offset.x, z: road.centerline[1].z + offset.z }
  ];
}

function groupIntersectionsByRoad(intersections: readonly IntersectionPlan[]): Map<CityId, readonly IntersectionPlan[]> {
  const groups = new Map<CityId, IntersectionPlan[]>();
  for (const intersection of intersections) {
    for (const roadId of intersection.connectedRoadIds) {
      groups.set(roadId, [...(groups.get(roadId) ?? []), intersection]);
    }
  }
  return groups;
}

function groupCrossingsByRoad(crossings: readonly CrossingPlan[]): Map<CityId, readonly CrossingPlan[]> {
  const groups = new Map<CityId, CrossingPlan[]>();
  for (const crossing of crossings) {
    groups.set(crossing.roadId, [...(groups.get(crossing.roadId) ?? []), crossing]);
  }
  return groups;
}

function groupCurbZonesByRoad(curbZones: readonly CurbZone[]): Map<CityId, readonly CurbZone[]> {
  const groups = new Map<CityId, CurbZone[]>();
  for (const zone of curbZones) {
    groups.set(zone.roadId, [...(groups.get(zone.roadId) ?? []), zone]);
  }
  return groups;
}

function groupTransitStopsByRoad(transitStops: readonly TransitStop[]): Map<CityId, readonly TransitStop[]> {
  const groups = new Map<CityId, TransitStop[]>();
  for (const stop of transitStops) {
    groups.set(stop.roadId, [...(groups.get(stop.roadId) ?? []), stop]);
  }
  return groups;
}

function groupConflictsBySegment(conflicts: readonly BikeConflictZone[]): Map<CityId, readonly CityId[]> {
  const groups = new Map<CityId, CityId[]>();
  for (const conflict of conflicts) {
    groups.set(conflict.segmentId, [...(groups.get(conflict.segmentId) ?? []), conflict.id]);
  }
  return groups;
}

function groupParkingBySegment(parking: readonly BikeParking[]): Map<CityId, readonly CityId[]> {
  const groups = new Map<CityId, CityId[]>();
  for (const bikeParking of parking) {
    groups.set(bikeParking.segmentId, [...(groups.get(bikeParking.segmentId) ?? []), bikeParking.id]);
  }
  return groups;
}
