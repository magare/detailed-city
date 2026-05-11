import type {
  CrossingPlan,
  IntersectionPlan,
  RoadSegment,
  SidewalkGraph,
  SidewalkGraphEdge,
  SidewalkGraphNode
} from '../../types/city';
import {
  DEFAULT_STREET_PROFILES,
  type CrossingPriority,
  type CrosswalkType,
  type Point2D,
  type SidewalkContract
} from '../../city/data-contracts/cityContracts';

export interface PedestrianNetworkSeed {
  crossings: CrossingPlan[];
  sidewalkGraph: SidewalkGraph;
}

export class PedestrianNetworkGenerator {
  create(roads: readonly RoadSegment[], intersections: readonly IntersectionPlan[]): PedestrianNetworkSeed {
    const roadsById = new Map(roads.map((road) => [road.id, road]));
    const nodesById = new Map<string, SidewalkGraphNode>();
    const crossings: CrossingPlan[] = [];
    const crossingEdges: SidewalkGraphEdge[] = [];

    for (const intersection of intersections) {
      for (const roadId of intersection.connectedRoadIds) {
        const road = roadsById.get(roadId);

        if (!road || road.sidewalks.length < 2) {
          continue;
        }

        const [firstSidewalk, secondSidewalk] = road.sidewalks;
        const crossing = createCrossing(intersection, road, firstSidewalk, secondSidewalk);
        const firstNode = getOrCreateNode(nodesById, intersection, road, firstSidewalk);
        const secondNode = getOrCreateNode(nodesById, intersection, road, secondSidewalk);

        crossings.push(crossing);
        crossingEdges.push({
          id: `sidewalk-edge-${crossing.id}`,
          kind: 'sidewalk-graph-edge',
          ownerDomain: 'mobility',
          parentId: crossing.id,
          lod: 'lod2',
          fromNodeId: firstNode.id,
          toNodeId: secondNode.id,
          mode: 'crossing',
          crossingId: crossing.id,
          lengthMeters: crossing.lengthMeters
        });
      }
    }

    for (const crossing of createMidblockCrossings(roads)) {
      const road = roadsById.get(crossing.roadId);

      if (!road || road.sidewalks.length < 2) {
        continue;
      }

      const [firstSidewalk, secondSidewalk] = road.sidewalks;
      const firstNode = getOrCreateMidblockNode(nodesById, crossing, road, firstSidewalk);
      const secondNode = getOrCreateMidblockNode(nodesById, crossing, road, secondSidewalk);

      crossings.push(crossing);
      crossingEdges.push({
        id: `sidewalk-edge-${crossing.id}`,
        kind: 'sidewalk-graph-edge',
        ownerDomain: 'mobility',
        parentId: crossing.id,
        lod: 'lod2',
        fromNodeId: firstNode.id,
        toNodeId: secondNode.id,
        mode: 'crossing',
        crossingId: crossing.id,
        lengthMeters: crossing.lengthMeters
      });
    }

    return {
      crossings,
      sidewalkGraph: {
        nodes: [...nodesById.values()],
        edges: [...crossingEdges, ...createSidewalkEdges(roads, intersections, nodesById)]
      }
    };
  }
}

function createCrossing(
  intersection: IntersectionPlan,
  road: RoadSegment,
  firstSidewalk: SidewalkContract,
  secondSidewalk: SidewalkContract
): CrossingPlan {
  return {
    id: `crossing-${intersection.id}-${road.id}`,
    kind: 'crossing',
    ownerDomain: 'mobility',
    parentId: intersection.id,
    lod: 'lod2',
    intersectionId: intersection.id,
    roadId: road.id,
    roadOrientation: road.orientation,
    center: intersection.center,
    connectedSidewalkIds: [firstSidewalk.id, secondSidewalk.id],
    widthMeters: 4.2,
    lengthMeters: road.widthMeters,
    signalized: intersection.signalExpectation === 'signalized',
    crossingLocation: 'intersection',
    crosswalkType: getIntersectionCrosswalkType(intersection, road),
    priority: getIntersectionCrossingPriority(intersection),
    hasRefugeIsland: hasRefugeIsland(road),
    raisedCrossing: intersection.raisedJunction,
    tactileCues: true,
    curbRamps: ['left', 'right'],
    ...(intersection.signalExpectation === 'signalized' ? { signalPhase: createSignalPhase(intersection.id) } : {})
  };
}

function createMidblockCrossings(roads: readonly RoadSegment[]): CrossingPlan[] {
  const promenade = roads.find((road) => road.id === 'road-h-4');

  if (!promenade || promenade.sidewalks.length < 2) {
    return [];
  }

  const [firstSidewalk, secondSidewalk] = promenade.sidewalks;
  const offsets = [-promenade.length * 0.18, promenade.length * 0.18];

  return offsets.map((offset, index) => {
    const center = getPointAlongRoad(promenade, offset);

    return {
      id: `crossing-midblock-${promenade.id}-${index}`,
      kind: 'crossing',
      ownerDomain: 'mobility',
      parentId: promenade.id,
      lod: 'lod2',
      roadId: promenade.id,
      roadOrientation: promenade.orientation,
      center,
      connectedSidewalkIds: [firstSidewalk.id, secondSidewalk.id],
      widthMeters: 5.2,
      lengthMeters: promenade.widthMeters,
      signalized: false,
      crossingLocation: 'midblock',
      crosswalkType: 'raised-table',
      priority: 'pedestrian-priority',
      hasRefugeIsland: false,
      raisedCrossing: true,
      tactileCues: true,
      curbRamps: ['left', 'right']
    };
  });
}

function getOrCreateMidblockNode(
  nodesById: Map<string, SidewalkGraphNode>,
  crossing: CrossingPlan,
  road: RoadSegment,
  sidewalk: SidewalkContract
): SidewalkGraphNode {
  const id = getNodeId(crossing.id, sidewalk.id);
  const existingNode = nodesById.get(id);

  if (existingNode) {
    return existingNode;
  }

  const node = {
    id,
    kind: 'sidewalk-graph-node',
    ownerDomain: 'mobility',
    parentId: crossing.id,
    lod: 'lod2',
    crossingId: crossing.id,
    sidewalkId: sidewalk.id,
    position: getNodePosition(crossing.center, road, sidewalk)
  } satisfies SidewalkGraphNode;
  nodesById.set(id, node);
  return node;
}

function getOrCreateNode(
  nodesById: Map<string, SidewalkGraphNode>,
  intersection: IntersectionPlan,
  road: RoadSegment,
  sidewalk: SidewalkContract
): SidewalkGraphNode {
  const id = getNodeId(intersection.id, sidewalk.id);
  const existingNode = nodesById.get(id);

  if (existingNode) {
    return existingNode;
  }

  const node = {
    id,
    kind: 'sidewalk-graph-node',
    ownerDomain: 'mobility',
    parentId: intersection.id,
    lod: 'lod2',
    intersectionId: intersection.id,
    sidewalkId: sidewalk.id,
    position: getNodePosition(intersection.center, road, sidewalk)
  } satisfies SidewalkGraphNode;
  nodesById.set(id, node);
  return node;
}

function getIntersectionCrosswalkType(intersection: IntersectionPlan, road: RoadSegment): CrosswalkType {
  if (intersection.raisedJunction) {
    return 'raised-table';
  }

  return road.hierarchy === 'arterial' || road.hierarchy === 'transit-corridor' ? 'continental' : 'zebra';
}

function getIntersectionCrossingPriority(intersection: IntersectionPlan): CrossingPriority {
  if (intersection.signalExpectation === 'signalized') {
    return 'signal-protected';
  }

  if (intersection.controlType === 'yield') {
    return 'pedestrian-priority';
  }

  return intersection.signalExpectation === 'stop-controlled' ? 'yield-controlled' : 'uncontrolled';
}

function hasRefugeIsland(road: RoadSegment): boolean {
  const profile = DEFAULT_STREET_PROFILES.find((candidate) => candidate.id === road.streetProfileId);
  return Boolean(profile?.median);
}

function createSignalPhase(intersectionId: string): CrossingPlan['signalPhase'] {
  return {
    phaseId: `${intersectionId}-pedestrian-phase`,
    walkSeconds: 8,
    clearanceSeconds: 12,
    leadingPedestrianIntervalSeconds: 3
  };
}

function getPointAlongRoad(road: RoadSegment, offsetMeters: number): Point2D {
  if (road.orientation === 'vertical') {
    return {
      x: road.center.x,
      z: road.center.z + offsetMeters
    };
  }

  return {
    x: road.center.x + offsetMeters,
    z: road.center.z
  };
}

function createSidewalkEdges(
  roads: readonly RoadSegment[],
  intersections: readonly IntersectionPlan[],
  nodesById: ReadonlyMap<string, SidewalkGraphNode>
): SidewalkGraphEdge[] {
  const edges: SidewalkGraphEdge[] = [];

  for (const road of roads) {
    const roadIntersections = intersections
      .filter((intersection) => intersection.connectedRoadIds.includes(road.id))
      .sort((a, b) =>
        road.orientation === 'vertical' ? a.center.z - b.center.z : a.center.x - b.center.x
      );

    for (const sidewalk of road.sidewalks) {
      for (let index = 0; index < roadIntersections.length - 1; index += 1) {
        const fromIntersection = roadIntersections[index];
        const toIntersection = roadIntersections[index + 1];
        const fromNode = nodesById.get(getNodeId(fromIntersection.id, sidewalk.id));
        const toNode = nodesById.get(getNodeId(toIntersection.id, sidewalk.id));

        if (!fromNode || !toNode) {
          continue;
        }

        edges.push({
          id: `sidewalk-edge-${sidewalk.id}-${fromIntersection.id}-${toIntersection.id}`,
          kind: 'sidewalk-graph-edge',
          ownerDomain: 'mobility',
          parentId: sidewalk.id,
          lod: 'lod2',
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          mode: 'sidewalk',
          sidewalkId: sidewalk.id,
          lengthMeters: distance2D(fromNode.position, toNode.position)
        });
      }
    }
  }

  return edges;
}

function getNodeId(intersectionId: string, sidewalkId: string): string {
  return `sidewalk-node-${intersectionId}-${sidewalkId}`;
}

function getNodePosition(intersectionCenter: Point2D, road: RoadSegment, sidewalk: SidewalkContract): Point2D {
  const sideOffset = sidewalk.id.endsWith('-left') ? -1 : 1;
  const offset = road.widthMeters / 2 + sidewalk.clearWidthMeters * 0.5;

  if (road.orientation === 'vertical') {
    return {
      x: intersectionCenter.x + sideOffset * offset,
      z: intersectionCenter.z
    };
  }

  return {
    x: intersectionCenter.x,
    z: intersectionCenter.z + sideOffset * offset
  };
}

function distance2D(start: Point2D, end: Point2D): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}
