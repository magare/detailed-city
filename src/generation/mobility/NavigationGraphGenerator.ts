import type { CityId, CityObjectKind, NavigationAgentType, NavigationMode, NavigationRouteKind, Point2D, TravelMode } from '../../city/data-contracts/cityContracts';
import type {
  BikeGraphEdge,
  BikeGraphNode,
  BikeParking,
  BikeSegment,
  FreightLoadingDock,
  FreightRoute,
  NavigationGraphEdge,
  NavigationGraphNode,
  NavigationRoute,
  RoadSegment,
  ServiceAlley,
  SidewalkGraph,
  TransitRoute,
  TransitStop,
  UtilityNode
} from '../../types/city';

export interface NavigationGraphGeneratorInput {
  readonly roads: readonly RoadSegment[];
  readonly sidewalkGraph: SidewalkGraph;
  readonly bikeSegments: readonly BikeSegment[];
  readonly bikeGraphNodes: readonly BikeGraphNode[];
  readonly bikeGraphEdges: readonly BikeGraphEdge[];
  readonly bikeParking: readonly BikeParking[];
  readonly transitStops: readonly TransitStop[];
  readonly transitRoutes: readonly TransitRoute[];
  readonly freightLoadingDocks: readonly FreightLoadingDock[];
  readonly freightRoutes: readonly FreightRoute[];
  readonly serviceAlleys: readonly ServiceAlley[];
  readonly utilityNodes: readonly UtilityNode[];
}

export interface NavigationGraphPlan {
  readonly navigationGraphNodes: NavigationGraphNode[];
  readonly navigationGraphEdges: NavigationGraphEdge[];
  readonly navigationRoutes: NavigationRoute[];
}

const MODE_AGENT_TYPES: Readonly<Record<NavigationMode, NavigationAgentType[]>> = {
  vehicle: ['driver'],
  pedestrian: ['pedestrian'],
  bike: ['cyclist'],
  transit: ['transit-rider'],
  service: ['service-crew'],
  emergency: ['emergency-responder'],
  freight: ['freight-operator']
};

export class NavigationGraphGenerator {
  create(input: NavigationGraphGeneratorInput): NavigationGraphPlan {
    const vehicle = createRoadModeGraph(input.roads, 'vehicle', 'vehicle');
    const emergency = createRoadModeGraph(input.roads, 'emergency', 'emergency');
    const service = createServiceGraph(input.serviceAlleys, input.utilityNodes);
    const pedestrian = createPedestrianGraph(input.sidewalkGraph);
    const bike = createBikeGraph(input.bikeGraphNodes, input.bikeGraphEdges, input.bikeParking);
    const transit = createTransitGraph(input.transitStops, input.transitRoutes);
    const freight = createFreightGraph(input.freightLoadingDocks, input.freightRoutes);
    const navigationGraphNodes = [...vehicle.nodes, ...emergency.nodes, ...service.nodes, ...pedestrian.nodes, ...bike.nodes, ...transit.nodes, ...freight.nodes];
    const navigationGraphEdges = [...vehicle.edges, ...emergency.edges, ...service.edges, ...pedestrian.edges, ...bike.edges, ...transit.edges, ...freight.edges];
    const navigationRoutes = createModeRoutes(navigationGraphNodes, navigationGraphEdges);

    return {
      navigationGraphNodes,
      navigationGraphEdges,
      navigationRoutes
    };
  }
}

interface ModeGraph {
  readonly nodes: NavigationGraphNode[];
  readonly edges: NavigationGraphEdge[];
}

function createRoadModeGraph(roads: readonly RoadSegment[], mode: Extract<NavigationMode, 'vehicle' | 'emergency'>, travelMode: TravelMode): ModeGraph {
  const routeableRoads = roads.filter((road) => road.lanes.some((lane) => lane.allowedModes.includes(travelMode)));
  const nodes = routeableRoads.flatMap((road) => [createRoadNode(mode, road, 'start'), createRoadNode(mode, road, 'end')]);
  const edges = routeableRoads.map((road) => {
    const laneIds = road.lanes.filter((lane) => lane.allowedModes.includes(travelMode)).map((lane) => lane.id);
    return createEdge({
      mode,
      sourceObjectId: road.id,
      sourceObjectKind: 'road-segment',
      fromNodeId: createRoadNodeId(mode, road.id, 'start'),
      toNodeId: createRoadNodeId(mode, road.id, 'end'),
      roadIds: [road.id],
      laneIds,
      lengthMeters: road.length,
      speedKph: mode === 'emergency' ? Math.max(20, road.designSpeedKph * 1.15) : road.designSpeedKph,
      bidirectional: true,
      accessible: true,
      restrictions: mode === 'emergency' ? ['emergency-priority'] : []
    });
  });
  return { nodes, edges };
}

function createServiceGraph(serviceAlleys: readonly ServiceAlley[], utilityNodes: readonly UtilityNode[]): ModeGraph {
  const alleyNodes = serviceAlleys.flatMap((alley) => [createPolylineNode('service', alley.id, 'service-alley', alley.centerline[0], 'start', { roadId: alley.roadId, serviceAlleyId: alley.id }), createPolylineNode('service', alley.id, 'service-alley', alley.centerline.at(-1) ?? alley.centerline[0], 'end', { roadId: alley.roadId, serviceAlleyId: alley.id })]);
  const utilityAccessNodes = utilityNodes.slice(0, 12).map((node) =>
    createNode({
      mode: 'service',
      sourceObjectId: node.id,
      sourceObjectKind: 'utility-node',
      position: node.center,
      accessible: true,
      serviceAccess: true,
      emergencyAccess: node.serviceArea.criticalObjectIds.length > 0
    })
  );
  const alleyEdges = serviceAlleys.map((alley) =>
    createEdge({
      mode: 'service',
      sourceObjectId: alley.id,
      sourceObjectKind: 'service-alley',
      fromNodeId: createNodeId('service', alley.id, 'start'),
      toNodeId: createNodeId('service', alley.id, 'end'),
      roadIds: [alley.roadId],
      laneIds: [],
      lengthMeters: getPolylineLength(alley.centerline),
      speedKph: 12,
      bidirectional: true,
      accessible: true,
      restrictions: alley.accessControlled ? ['access-controlled'] : []
    })
  );
  return { nodes: [...alleyNodes, ...utilityAccessNodes], edges: alleyEdges };
}

function createPedestrianGraph(sidewalkGraph: SidewalkGraph): ModeGraph {
  const nodes = sidewalkGraph.nodes.map((node) =>
    createNode({
      mode: 'pedestrian',
      sourceObjectId: node.id,
      sourceObjectKind: 'sidewalk-graph-node',
      position: node.position,
      sidewalkGraphNodeId: node.id,
      intersectionId: node.intersectionId,
      accessible: node.accessible,
      serviceAccess: false,
      emergencyAccess: false
    })
  );
  const edges = sidewalkGraph.edges.map((edge) =>
    createEdge({
      mode: 'pedestrian',
      sourceObjectId: edge.id,
      sourceObjectKind: 'sidewalk-graph-edge',
      fromNodeId: createNodeId('pedestrian', edge.fromNodeId),
      toNodeId: createNodeId('pedestrian', edge.toNodeId),
      roadIds: [],
      laneIds: [],
      lengthMeters: edge.lengthMeters,
      speedKph: 4.8,
      bidirectional: true,
      accessible: edge.accessible,
      restrictions: edge.accessible ? [] : ['not-step-free']
    })
  );
  return { nodes, edges };
}

function createBikeGraph(bikeGraphNodes: readonly BikeGraphNode[], bikeGraphEdges: readonly BikeGraphEdge[], bikeParking: readonly BikeParking[]): ModeGraph {
  const parkingBySegment = new Map<CityId, readonly BikeParking[]>();
  for (const parking of bikeParking) {
    parkingBySegment.set(parking.segmentId, [...(parkingBySegment.get(parking.segmentId) ?? []), parking]);
  }
  const nodes = bikeGraphNodes.map((node) => {
    const transferNodeIds = (parkingBySegment.get(node.segmentId) ?? []).map((parking) => createNodeId('bike', parking.id));
    return createNode({
      mode: 'bike',
      sourceObjectId: node.id,
      sourceObjectKind: 'bike-graph-node',
      position: node.position,
      roadId: node.roadId,
      bikeGraphNodeId: node.id,
      intersectionId: node.intersectionId,
      accessible: true,
      serviceAccess: false,
      emergencyAccess: false,
      transferNodeIds
    });
  });
  const parkingNodes = bikeParking.map((parking) =>
    createNode({
      mode: 'bike',
      sourceObjectId: parking.id,
      sourceObjectKind: 'bike-parking',
      position: parking.position,
      roadId: parking.roadId,
      bikeGraphNodeId: undefined,
      accessible: true,
      serviceAccess: false,
      emergencyAccess: false,
      transferNodeIds: parking.connectsToTransitStopId ? [createNodeId('transit', parking.connectsToTransitStopId)] : []
    })
  );
  const edges = bikeGraphEdges.map((edge) =>
    createEdge({
      mode: 'bike',
      sourceObjectId: edge.id,
      sourceObjectKind: 'bike-graph-edge',
      fromNodeId: createNodeId('bike', edge.fromNodeId),
      toNodeId: createNodeId('bike', edge.toNodeId),
      roadIds: [edge.roadId],
      laneIds: [],
      lengthMeters: edge.lengthMeters,
      speedKph: edge.protected ? 16 : 12,
      bidirectional: true,
      accessible: true,
      restrictions: edge.protected ? [] : ['mixed-traffic-conflict']
    })
  );
  return { nodes: [...nodes, ...parkingNodes], edges };
}

function createTransitGraph(transitStops: readonly TransitStop[], transitRoutes: readonly TransitRoute[]): ModeGraph {
  const stopsById = new Map(transitStops.map((stop) => [stop.id, stop]));
  const nodes = transitStops.map((stop) =>
    createNode({
      mode: 'transit',
      sourceObjectId: stop.id,
      sourceObjectKind: 'transit-stop',
      position: stop.center,
      roadId: stop.roadId,
      transitStopId: stop.id,
      accessible: stop.accessible,
      serviceAccess: false,
      emergencyAccess: false
    })
  );
  const edges = transitRoutes.flatMap((route) => {
    const orderedStops = route.stopIds.map((stopId) => stopsById.get(stopId)).filter((stop): stop is TransitStop => Boolean(stop));
    return orderedStops.slice(0, -1).map((stop, index) => {
      const next = orderedStops[index + 1];
      return createEdge({
        mode: 'transit',
        sourceObjectId: route.id,
        sourceObjectKind: 'transit-route',
        fromNodeId: createNodeId('transit', stop.id),
        toNodeId: createNodeId('transit', next.id),
        roadIds: route.roadIds,
        laneIds: route.laneIds,
        lengthMeters: distance(stop.center, next.center),
        speedKph: 18,
        bidirectional: true,
        accessible: stop.accessible && next.accessible,
        restrictions: [`headway-${route.headwayMinutes}-minutes`],
        idSuffix: String(index)
      });
    });
  });
  return { nodes, edges };
}

function createFreightGraph(loadingDocks: readonly FreightLoadingDock[], freightRoutes: readonly FreightRoute[]): ModeGraph {
  const docksById = new Map(loadingDocks.map((dock) => [dock.id, dock]));
  const nodes = loadingDocks.map((dock) =>
    createNode({
      mode: 'freight',
      sourceObjectId: dock.id,
      sourceObjectKind: 'freight-loading-dock',
      position: dock.position,
      roadId: dock.roadId,
      loadingDockId: dock.id,
      accessible: true,
      serviceAccess: true,
      emergencyAccess: false
    })
  );
  const edges = freightRoutes.flatMap((route) => {
    const docks = route.loadingDockIds.map((dockId) => docksById.get(dockId)).filter((dock): dock is FreightLoadingDock => Boolean(dock));
    if (docks.length < 2) {
      return [];
    }
    const first = docks[0];
    const last = docks[docks.length - 1];
    return [
      createEdge({
        mode: 'freight',
        sourceObjectId: route.id,
        sourceObjectKind: 'freight-route',
        fromNodeId: createNodeId('freight', first.id),
        toNodeId: createNodeId('freight', last.id),
        roadIds: route.roadIds,
        laneIds: route.laneIds,
        lengthMeters: getPolylineLength(route.polyline),
        speedKph: 18,
        bidirectional: true,
        accessible: true,
        restrictions: [`max-${route.truckRestriction.maxWeightTonnes}-tonnes`, `hazmat-${route.truckRestriction.hazmatAllowed ? 'allowed' : 'restricted'}`]
      })
    ];
  });
  return { nodes, edges };
}

function createModeRoutes(nodes: readonly NavigationGraphNode[], edges: readonly NavigationGraphEdge[]): NavigationRoute[] {
  return (['vehicle', 'pedestrian', 'bike', 'transit', 'service', 'emergency', 'freight'] as const).flatMap((mode, index) => {
    const modeNodes = nodes.filter((node) => node.mode === mode);
    const modeEdges = edges.filter((edge) => edge.mode === mode);
    if (modeNodes.length < 2 || modeEdges.length === 0) {
      return [];
    }
    const fromNode = modeNodes[0];
    const toNode = modeNodes[modeNodes.length - 1];
    const routeKind = getRouteKind(mode);
    return [
      {
        id: `navigation-route-${mode}-${routeKind}-${index}`,
        kind: 'navigation-route',
        ownerDomain: 'mobility',
        lod: 'lod1',
        mode,
        routeKind,
        requestClass: mode === 'vehicle' || mode === 'pedestrian' || mode === 'bike' || mode === 'transit' ? 'agent' : 'operation',
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        nodeIds: [fromNode.id, toNode.id],
        edgeIds: modeEdges.map((edge) => edge.id),
        sourceObjectIds: Array.from(new Set(modeEdges.map((edge) => edge.sourceObjectId))),
        lengthMeters: round(modeEdges.reduce((sum, edge) => sum + edge.lengthMeters, 0)),
        estimatedTravelTimeSeconds: round(modeEdges.reduce((sum, edge) => sum + edge.travelTimeSeconds, 0)),
        supportedAgentTypes: MODE_AGENT_TYPES[mode],
        tags: {
          mode,
          routeKind,
          requestClass: mode === 'vehicle' || mode === 'pedestrian' || mode === 'bike' || mode === 'transit' ? 'agent' : 'operation'
        }
      } satisfies NavigationRoute
    ];
  });
}

function createRoadNode(mode: Extract<NavigationMode, 'vehicle' | 'emergency'>, road: RoadSegment, endpoint: 'start' | 'end'): NavigationGraphNode {
  return createPolylineNode(mode, road.id, 'road-segment', endpoint === 'start' ? road.centerline[0] : road.centerline[1], endpoint, {
    roadId: road.id,
    emergencyAccess: mode === 'emergency'
  });
}

function createPolylineNode(
  mode: NavigationMode,
  sourceObjectId: CityId,
  sourceObjectKind: CityObjectKind,
  position: Point2D,
  endpoint: 'start' | 'end',
  refs: Partial<Pick<NavigationGraphNode, 'roadId' | 'serviceAlleyId' | 'emergencyAccess'>> = {}
): NavigationGraphNode {
  return createNode({
    mode,
    sourceObjectId,
    sourceObjectKind,
    position,
    accessible: true,
    serviceAccess: mode === 'service',
    emergencyAccess: refs.emergencyAccess ?? false,
    ...refs,
    idSuffix: endpoint
  });
}

function createNode(input: {
  readonly mode: NavigationMode;
  readonly sourceObjectId: CityId;
  readonly sourceObjectKind: CityObjectKind;
  readonly position: Point2D;
  readonly roadId?: CityId;
  readonly laneId?: CityId;
  readonly sidewalkGraphNodeId?: CityId;
  readonly bikeGraphNodeId?: CityId;
  readonly transitStopId?: CityId;
  readonly loadingDockId?: CityId;
  readonly serviceAlleyId?: CityId;
  readonly intersectionId?: CityId;
  readonly accessible: boolean;
  readonly emergencyAccess: boolean;
  readonly serviceAccess: boolean;
  readonly transferNodeIds?: readonly CityId[];
  readonly idSuffix?: string;
}): NavigationGraphNode {
  return {
    id: createNodeId(input.mode, input.sourceObjectId, input.idSuffix),
    kind: 'navigation-graph-node',
    ownerDomain: 'mobility',
    parentId: input.sourceObjectId,
    lod: 'lod1',
    mode: input.mode,
    position: input.position,
    sourceObjectId: input.sourceObjectId,
    sourceObjectKind: input.sourceObjectKind,
    roadId: input.roadId,
    laneId: input.laneId,
    sidewalkGraphNodeId: input.sidewalkGraphNodeId,
    bikeGraphNodeId: input.bikeGraphNodeId,
    transitStopId: input.transitStopId,
    loadingDockId: input.loadingDockId,
    serviceAlleyId: input.serviceAlleyId,
    intersectionId: input.intersectionId,
    accessible: input.accessible,
    emergencyAccess: input.emergencyAccess,
    serviceAccess: input.serviceAccess,
    transferNodeIds: input.transferNodeIds ?? [],
    tags: {
      mode: input.mode,
      sourceObjectKind: input.sourceObjectKind,
      sourceObjectId: input.sourceObjectId
    }
  };
}

function createEdge(input: {
  readonly mode: NavigationMode;
  readonly sourceObjectId: CityId;
  readonly sourceObjectKind: CityObjectKind;
  readonly fromNodeId: CityId;
  readonly toNodeId: CityId;
  readonly roadIds: readonly CityId[];
  readonly laneIds: readonly CityId[];
  readonly lengthMeters: number;
  readonly speedKph: number;
  readonly bidirectional: boolean;
  readonly accessible: boolean;
  readonly restrictions: readonly string[];
  readonly idSuffix?: string;
}): NavigationGraphEdge {
  return {
    id: `navigation-edge-${input.mode}-${sanitizeId(input.sourceObjectId)}${input.idSuffix ? `-${input.idSuffix}` : ''}`,
    kind: 'navigation-graph-edge',
    ownerDomain: 'mobility',
    parentId: input.sourceObjectId,
    lod: 'lod1',
    mode: input.mode,
    fromNodeId: input.fromNodeId,
    toNodeId: input.toNodeId,
    sourceObjectId: input.sourceObjectId,
    sourceObjectKind: input.sourceObjectKind,
    roadIds: input.roadIds,
    laneIds: input.laneIds,
    lengthMeters: round(input.lengthMeters),
    travelTimeSeconds: round((Math.max(0.001, input.lengthMeters) / Math.max(1, input.speedKph)) * 3.6),
    bidirectional: input.bidirectional,
    accessible: input.accessible,
    restrictions: input.restrictions,
    tags: {
      mode: input.mode,
      sourceObjectKind: input.sourceObjectKind
    }
  };
}

function createNodeId(mode: NavigationMode, sourceObjectId: CityId, suffix?: string): CityId {
  return `navigation-node-${mode}-${sanitizeId(sourceObjectId)}${suffix ? `-${suffix}` : ''}`;
}

function createRoadNodeId(mode: Extract<NavigationMode, 'vehicle' | 'emergency'>, roadId: CityId, endpoint: 'start' | 'end'): CityId {
  return createNodeId(mode, roadId, endpoint);
}

function getRouteKind(mode: NavigationMode): NavigationRouteKind {
  if (mode === 'service') return 'service';
  if (mode === 'emergency') return 'emergency';
  if (mode === 'freight') return 'freight';
  if (mode === 'transit') return 'transfer';
  return 'baseline';
}

function getPolylineLength(points: readonly Point2D[]): number {
  return points.slice(0, -1).reduce((sum, point, index) => sum + distance(point, points[index + 1]), 0);
}

function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sanitizeId(id: CityId): string {
  return id.replace(/[^a-z0-9-]/g, '-');
}
