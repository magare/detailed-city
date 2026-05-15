import type {
  CityId,
  Point2D,
  WaterTransportAccessKind,
  WaterTransportArrivalMode
} from '../../city/data-contracts/cityContracts';
import type {
  EmergencyServiceAnchor,
  FreightRoute,
  NavigationGraphEdge,
  NavigationGraphNode,
  RoadSegment,
  WaterTransportAccess,
  Waterway,
  WaterfrontEdge,
  WaterfrontOpenSpace
} from '../../types/city';
import { rectanglePolygon } from '../../utils/geometry';

export interface WaterTransportAccessGeneratorInput {
  readonly waterways: readonly Waterway[];
  readonly waterfrontEdges: readonly WaterfrontEdge[];
  readonly waterfrontOpenSpaces: readonly WaterfrontOpenSpace[];
  readonly freightRoutes: readonly FreightRoute[];
  readonly navigationGraphNodes: readonly NavigationGraphNode[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
  readonly emergencyServiceAnchors: readonly EmergencyServiceAnchor[];
  readonly roads: readonly RoadSegment[];
}

interface AccessTemplate {
  readonly accessKind: WaterTransportAccessKind;
  readonly arrivalMode: WaterTransportArrivalMode;
  readonly name: string;
  readonly source: 'ferry-dock' | 'service-dock' | 'small-port' | 'port-logistics' | 'helipad';
  readonly size: { readonly x: number; readonly z: number };
  readonly capacity: WaterTransportAccess['capacity'];
  readonly constraints: WaterTransportAccess['constraints'];
  readonly routeModes: readonly NavigationGraphNode['mode'][];
}

const WATER_TRANSPORT_ACCESS_TEMPLATES = [
  {
    accessKind: 'ferry-stop',
    arrivalMode: 'ferry',
    name: 'River Ferry Stop',
    source: 'ferry-dock',
    size: { x: 8, z: 5 },
    capacity: { berths: 2, passengersPerHour: 220, cargoTonnesPerDay: 0, emergencySlotsPerHour: 1 },
    constraints: {
      maxVesselLengthMeters: 32,
      minChannelWidthMeters: 18,
      requiredClearanceMeters: 4.8,
      maxApproachGradePercent: 4,
      weatherLimited: true,
      hazmatAllowed: false,
      nightOperations: false,
      emergencyPriority: false
    },
    routeModes: ['pedestrian', 'transit']
  },
  {
    accessKind: 'ferry-pier',
    arrivalMode: 'water-taxi',
    name: 'Passenger Ferry Pier',
    source: 'ferry-dock',
    size: { x: 18, z: 5 },
    capacity: { berths: 3, passengersPerHour: 320, cargoTonnesPerDay: 4, emergencySlotsPerHour: 2 },
    constraints: {
      maxVesselLengthMeters: 36,
      minChannelWidthMeters: 22,
      requiredClearanceMeters: 5.2,
      maxApproachGradePercent: 3.5,
      weatherLimited: true,
      hazmatAllowed: false,
      nightOperations: true,
      emergencyPriority: true
    },
    routeModes: ['pedestrian', 'transit', 'emergency']
  },
  {
    accessKind: 'service-dock',
    arrivalMode: 'service-vessel',
    name: 'Service Vessel Dock',
    source: 'service-dock',
    size: { x: 22, z: 6 },
    capacity: { berths: 2, passengersPerHour: 24, cargoTonnesPerDay: 45, emergencySlotsPerHour: 2 },
    constraints: {
      maxVesselLengthMeters: 42,
      minChannelWidthMeters: 24,
      requiredClearanceMeters: 5.2,
      maxApproachGradePercent: 5,
      weatherLimited: false,
      hazmatAllowed: true,
      nightOperations: true,
      emergencyPriority: true
    },
    routeModes: ['service', 'freight', 'emergency']
  },
  {
    accessKind: 'small-port',
    arrivalMode: 'freight-barge',
    name: 'Small Port Berth',
    source: 'small-port',
    size: { x: 30, z: 12 },
    capacity: { berths: 4, passengersPerHour: 40, cargoTonnesPerDay: 120, emergencySlotsPerHour: 2 },
    constraints: {
      maxVesselLengthMeters: 55,
      minChannelWidthMeters: 28,
      requiredClearanceMeters: 5.2,
      maxApproachGradePercent: 4.5,
      weatherLimited: false,
      hazmatAllowed: true,
      nightOperations: true,
      emergencyPriority: false
    },
    routeModes: ['freight', 'service']
  },
  {
    accessKind: 'port-logistics-edge',
    arrivalMode: 'freight-barge',
    name: 'Port Logistics Transfer Edge',
    source: 'port-logistics',
    size: { x: 34, z: 7 },
    capacity: { berths: 1, passengersPerHour: 0, cargoTonnesPerDay: 160, emergencySlotsPerHour: 1 },
    constraints: {
      maxVesselLengthMeters: 50,
      minChannelWidthMeters: 28,
      requiredClearanceMeters: 5.2,
      maxApproachGradePercent: 6,
      weatherLimited: false,
      hazmatAllowed: false,
      nightOperations: true,
      emergencyPriority: false
    },
    routeModes: ['freight', 'service']
  },
  {
    accessKind: 'emergency-helipad',
    arrivalMode: 'helicopter',
    name: 'Emergency Waterfront Helipad',
    source: 'helipad',
    size: { x: 18, z: 18 },
    capacity: { berths: 1, passengersPerHour: 12, cargoTonnesPerDay: 3, emergencySlotsPerHour: 6 },
    constraints: {
      requiredClearanceMeters: 24,
      maxApproachGradePercent: 2,
      weatherLimited: true,
      hazmatAllowed: false,
      nightOperations: true,
      emergencyPriority: true
    },
    routeModes: ['emergency']
  }
] as const satisfies readonly AccessTemplate[];

export class WaterTransportAccessGenerator {
  create(input: WaterTransportAccessGeneratorInput): WaterTransportAccess[] {
    const waterway = input.waterways[0];
    const ferryDock = waterway?.docks.find((dock) => dock.use === 'ferry');
    const serviceDock = waterway?.docks.find((dock) => dock.use === 'service') ?? ferryDock;
    const freightRoute = [...input.freightRoutes].sort((first, second) => first.id.localeCompare(second.id))[0];
    const helipadAnchor =
      input.emergencyServiceAnchors.find((anchor) => anchor.anchorKind === 'command-post') ??
      input.emergencyServiceAnchors.find((anchor) => anchor.anchorKind === 'staging-area');

    if (!waterway || !ferryDock || !serviceDock || !freightRoute || !helipadAnchor) {
      return [];
    }

    return WATER_TRANSPORT_ACCESS_TEMPLATES.map((template, index) =>
      this.createAccess({
        template,
        index,
        waterway,
        ferryDock,
        serviceDock,
        freightRoute,
        helipadAnchor,
        input
      })
    );
  }

  private createAccess(input: {
    readonly template: AccessTemplate;
    readonly index: number;
    readonly waterway: Waterway;
    readonly ferryDock: Waterway['docks'][number];
    readonly serviceDock: Waterway['docks'][number];
    readonly freightRoute: FreightRoute;
    readonly helipadAnchor: EmergencyServiceAnchor;
    readonly input: WaterTransportAccessGeneratorInput;
  }): WaterTransportAccess {
    const dock = input.template.source === 'ferry-dock' ? input.ferryDock : input.serviceDock;
    const waterfrontEdge = findWaterfrontEdge(input.input.waterfrontEdges, dock.id);
    const waterfrontOpenSpace = findWaterfrontOpenSpace(input.input.waterfrontOpenSpaces, waterfrontEdge?.id);
    const roadId = getRoadId(input.template.source, dock, input.freightRoute, input.helipadAnchor);
    const center = getAccessCenter(input.template, dock.center, input.helipadAnchor.center, input.index);
    const routing = createRoutingRefs({
      template: input.template,
      center,
      roadId,
      dock,
      waterway: input.waterway,
      waterfrontEdge,
      waterfrontOpenSpace,
      freightRoute: input.freightRoute,
      helipadAnchor: input.helipadAnchor,
      navigationGraphNodes: input.input.navigationGraphNodes,
      navigationGraphEdges: input.input.navigationGraphEdges
    });

    return {
      id: `water-transport-access-${input.template.accessKind}`,
      kind: 'water-transport-access',
      ownerDomain: 'mobility',
      parentId: getParentId(input.template, waterfrontOpenSpace, waterfrontEdge, input.freightRoute, input.helipadAnchor),
      name: input.template.name,
      lod: input.template.accessKind === 'emergency-helipad' ? 'lod4' : 'lod3',
      tags: {
        accessKind: input.template.accessKind,
        arrivalMode: input.template.arrivalMode,
        waterTransport: true
      },
      accessKind: input.template.accessKind,
      arrivalMode: input.template.arrivalMode,
      ...(input.template.accessKind === 'emergency-helipad' ? {} : { waterwayId: input.waterway.id }),
      ...(waterfrontEdge ? { waterfrontEdgeId: waterfrontEdge.id } : {}),
      ...(waterfrontOpenSpace ? { waterfrontOpenSpaceId: waterfrontOpenSpace.id } : {}),
      ...(input.template.accessKind === 'emergency-helipad' ? {} : { dockId: dock.id }),
      ...(input.template.accessKind === 'emergency-helipad' ? { emergencyServiceAnchorId: input.helipadAnchor.id } : {}),
      ...(input.template.source === 'port-logistics' || input.template.source === 'small-port'
        ? { freightRouteId: input.freightRoute.id }
        : {}),
      ...(roadId ? { roadId } : {}),
      center,
      boundary: rectanglePolygon(center, input.template.size),
      capacity: input.template.capacity,
      constraints: input.template.constraints,
      routing,
      scheduleProfileId: `schedule:water-transport:${input.template.accessKind}`,
      renderBindingId: 'binding:water-transport:access'
    };
  }
}

function findWaterfrontEdge(
  waterfrontEdges: readonly WaterfrontEdge[],
  dockId: CityId
): WaterfrontEdge | undefined {
  return waterfrontEdges.find((edge) => edge.dockId === dockId) ?? waterfrontEdges.find((edge) => edge.waterfrontKind === 'pier');
}

function findWaterfrontOpenSpace(
  openSpaces: readonly WaterfrontOpenSpace[],
  waterfrontEdgeId: CityId | undefined
): WaterfrontOpenSpace | undefined {
  return openSpaces.find((space) => space.waterfrontEdgeId === waterfrontEdgeId && space.openSpaceKind === 'pier-landing')
    ?? openSpaces.find((space) => space.waterfrontEdgeId === waterfrontEdgeId)
    ?? openSpaces.find((space) => space.openSpaceKind === 'water-access');
}

function getParentId(
  template: AccessTemplate,
  waterfrontOpenSpace: WaterfrontOpenSpace | undefined,
  waterfrontEdge: WaterfrontEdge | undefined,
  freightRoute: FreightRoute,
  helipadAnchor: EmergencyServiceAnchor
): CityId {
  if (template.accessKind === 'ferry-stop' && waterfrontOpenSpace) {
    return waterfrontOpenSpace.id;
  }
  if (template.accessKind === 'port-logistics-edge') {
    return freightRoute.id;
  }
  if (template.accessKind === 'emergency-helipad') {
    return helipadAnchor.id;
  }
  return waterfrontEdge?.id ?? freightRoute.id;
}

function getRoadId(
  source: AccessTemplate['source'],
  dock: Waterway['docks'][number],
  freightRoute: FreightRoute,
  helipadAnchor: EmergencyServiceAnchor
): CityId | undefined {
  if (source === 'helipad') {
    return helipadAnchor.roadId;
  }
  if (source === 'port-logistics') {
    return freightRoute.roadIds[0] ?? dock.accessRoadId;
  }
  return dock.accessRoadId ?? freightRoute.roadIds[0];
}

function getAccessCenter(
  template: AccessTemplate,
  dockCenter: Point2D,
  helipadCenter: Point2D,
  index: number
): Point2D {
  if (template.accessKind === 'emergency-helipad') {
    return {
      x: roundMeters(helipadCenter.x + 18),
      z: roundMeters(helipadCenter.z + 18)
    };
  }

  const waterOffset = template.accessKind === 'port-logistics-edge' ? -10 : template.accessKind === 'small-port' ? 8 : 0;
  return {
    x: roundMeters(dockCenter.x + (index % 2 === 0 ? -4 : 4)),
    z: roundMeters(dockCenter.z + waterOffset)
  };
}

function createRoutingRefs(input: {
  readonly template: AccessTemplate;
  readonly center: Point2D;
  readonly roadId: CityId | undefined;
  readonly dock: Waterway['docks'][number];
  readonly waterway: Waterway;
  readonly waterfrontEdge: WaterfrontEdge | undefined;
  readonly waterfrontOpenSpace: WaterfrontOpenSpace | undefined;
  readonly freightRoute: FreightRoute;
  readonly helipadAnchor: EmergencyServiceAnchor;
  readonly navigationGraphNodes: readonly NavigationGraphNode[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
}): WaterTransportAccess['routing'] {
  const navigationNodeIds = input.template.routeModes.flatMap((mode) =>
    input.navigationGraphNodes
      .filter((node) => node.mode === mode)
      .map((node) => ({ node, distance: distance2D(input.center, node.position) }))
      .sort((first, second) => first.distance - second.distance || first.node.id.localeCompare(second.node.id))
      .slice(0, 2)
      .map(({ node }) => node.id)
  );
  const navigationEdgeIds = input.template.routeModes.flatMap((mode) =>
    selectNavigationEdges(input.navigationGraphEdges, mode, input.roadId)
      .slice(0, 2)
      .map((edge) => edge.id)
  );
  const connectedRoadIds = uniqueIds([
    ...(input.roadId ? [input.roadId] : []),
    ...(input.waterfrontEdge?.connectedRoadIds ?? []),
    ...input.freightRoute.roadIds.slice(0, input.template.source === 'port-logistics' ? 3 : 1)
  ]);
  const connectedWaterwayComponentIds = uniqueIds([
    input.waterway.id,
    input.dock.id,
    input.dock.edgeSegmentId,
    input.waterway.channels.find((channel) => channel.navigable)?.id ?? input.waterway.channels[0]?.id,
    ...(input.waterfrontEdge?.connectedWaterwayComponentIds ?? [])
  ]);
  const transferObjectIds = uniqueIds([
    ...(input.waterfrontOpenSpace ? [input.waterfrontOpenSpace.id] : []),
    ...(input.waterfrontEdge ? [input.waterfrontEdge.id] : []),
    input.freightRoute.id,
    ...(input.template.accessKind === 'emergency-helipad' ? [input.helipadAnchor.id] : [])
  ]);

  return {
    navigationNodeIds: uniqueIds(navigationNodeIds).slice(0, 5),
    navigationEdgeIds: uniqueIds(navigationEdgeIds).slice(0, 5),
    connectedRoadIds,
    connectedWaterwayComponentIds,
    transferObjectIds
  };
}

function selectNavigationEdges(
  edges: readonly NavigationGraphEdge[],
  mode: NavigationGraphEdge['mode'],
  roadId: CityId | undefined
): readonly NavigationGraphEdge[] {
  const modeEdges = edges.filter((edge) => edge.mode === mode);
  const roadEdges = roadId ? modeEdges.filter((edge) => edge.roadIds.includes(roadId)) : [];
  return roadEdges.length > 0 ? roadEdges : modeEdges;
}

function distance2D(start: Point2D, end: Point2D): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function uniqueIds(ids: readonly (CityId | undefined)[]): CityId[] {
  return [...new Set(ids.filter((id): id is CityId => Boolean(id)))].sort();
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
