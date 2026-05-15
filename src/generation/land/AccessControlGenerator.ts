import type {
  AccessControlKind,
  AccessControlRuleKind,
  CityId,
  NavigationMode,
  Point2D,
  Polygon2D,
  Polyline2D
} from '../../city/data-contracts/cityContracts';
import type {
  AccessControl,
  HazardZonePlan,
  NavigationGraphEdge,
  RoadSegment,
  ServiceAccessCorridor,
  SidewalkGraph,
  TransitStop
} from '../../types/city';
import { getPolygonBounds, rectanglePolygon } from '../../utils/geometry';

export interface AccessControlGeneratorInput {
  readonly hazardZones: readonly HazardZonePlan[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
  readonly roads: readonly RoadSegment[];
  readonly serviceAccessCorridors: readonly ServiceAccessCorridor[];
  readonly sidewalkGraph: SidewalkGraph;
  readonly transitStops: readonly TransitStop[];
}

export interface AccessControlGeneratorOutput {
  readonly accessControls: AccessControl[];
  readonly navigationGraphEdges: NavigationGraphEdge[];
}

const ALL_NAVIGATION_MODES: readonly NavigationMode[] = [
  'vehicle',
  'pedestrian',
  'bike',
  'transit',
  'service',
  'emergency',
  'freight'
];

export class AccessControlGenerator {
  create(input: AccessControlGeneratorInput): AccessControlGeneratorOutput {
    const roadsById = new Map(input.roads.map((road) => [road.id, road]));
    const controlsWithoutEdges = [
      ...createHazardControls(input.hazardZones),
      ...createDetailedStreetBollards(input.roads),
      ...createServiceAccessControls(input.serviceAccessCorridors),
      ...createTransitTurnstiles(input.transitStops)
    ];
    const controls = controlsWithoutEdges.map((control) => ({
      ...control,
      navigationGraphEdgeIds: findMatchingNavigationEdges(control, input.navigationGraphEdges)
    }));
    const controlsByEdgeId = groupControlsByNavigationEdgeId(controls);
    const navigationGraphEdges = input.navigationGraphEdges.map((edge) => {
      const edgeControls = controlsByEdgeId.get(edge.id) ?? [];

      if (edgeControls.length === 0) {
        return edge;
      }

      return {
        ...edge,
        accessible: edge.accessible && edgeControls.every((control) => edgeCanPassControl(edge.mode, control)),
        restrictions: uniqueStrings([
          ...edge.restrictions,
          ...edgeControls.flatMap((control) => [`access-control:${control.id}`, `access-rule:${control.ruleKind}`])
        ]),
        accessControlIds: edgeControls.map((control) => control.id).sort()
      };
    });

    return {
      accessControls: controls.map((control) => attachSidewalkRefs(control, roadsById, input.sidewalkGraph)),
      navigationGraphEdges
    };
  }
}

function createHazardControls(hazardZones: readonly HazardZonePlan[]): AccessControl[] {
  return hazardZones.flatMap((hazard) => {
    if (hazard.hazardKind === 'restricted-area' && hazard.severity === 'critical') {
      return [
        createAccessControl({
          id: `access-control-wall-${sanitizeSourceId(hazard.id)}`,
          controlKind: 'wall',
          ruleKind: 'emergency-only',
          name: `${hazard.name ?? hazard.id} perimeter wall`,
          parentId: hazard.id,
          ownerDomain: 'land',
          centerline: boundaryEdgeLine(hazard.boundary, 'north'),
          heightMeters: 1.8,
          widthMeters: 0.45,
          clearanceMeters: 0,
          normallyOpen: false,
          publicAccess: false,
          privateAccess: false,
          emergencyOverride: true,
          allowedModes: ['emergency'],
          restrictedModes: ['vehicle', 'pedestrian', 'bike', 'transit', 'service', 'freight'],
          authorizedRoleIds: ['role:emergency-services'],
          controlledObjectIds: [hazard.id, ...hazard.relatedWaterwayIds],
          relatedConstraintIds: hazard.relatedConstraintIds,
          hazardZoneIds: [hazard.id],
          roadIds: hazard.relatedRoadIds
        })
      ];
    }

    if (hazard.hazardKind === 'restricted-area') {
      return [
        createAccessControl({
          id: `access-control-fence-${sanitizeSourceId(hazard.id)}`,
          controlKind: 'fence',
          ruleKind: 'authorized-only',
          name: `${hazard.name ?? hazard.id} security fence`,
          parentId: hazard.id,
          ownerDomain: 'land',
          centerline: boundaryEdgeLine(hazard.boundary, 'south'),
          heightMeters: 1.45,
          widthMeters: 0.24,
          clearanceMeters: 0,
          normallyOpen: false,
          publicAccess: false,
          privateAccess: true,
          emergencyOverride: true,
          allowedModes: ['service', 'emergency'],
          restrictedModes: ['vehicle', 'pedestrian', 'bike', 'transit', 'freight'],
          authorizedRoleIds: ['role:civic-security', 'role:emergency-services'],
          controlledObjectIds: [hazard.id],
          relatedConstraintIds: hazard.relatedConstraintIds,
          hazardZoneIds: [hazard.id],
          roadIds: hazard.relatedRoadIds
        })
      ];
    }

    if (hazard.hazardKind === 'landslide-risk') {
      return [
        createAccessControl({
          id: `access-control-guardrail-${sanitizeSourceId(hazard.id)}`,
          controlKind: 'guardrail',
          ruleKind: 'public-pass-through',
          name: `${hazard.name ?? hazard.id} slope guardrail`,
          parentId: hazard.id,
          ownerDomain: 'land',
          centerline: boundaryEdgeLine(hazard.boundary, 'west'),
          heightMeters: 0.95,
          widthMeters: 0.18,
          clearanceMeters: 1.8,
          normallyOpen: true,
          publicAccess: true,
          privateAccess: false,
          emergencyOverride: true,
          allowedModes: ALL_NAVIGATION_MODES,
          restrictedModes: [],
          authorizedRoleIds: [],
          controlledObjectIds: [hazard.id],
          relatedConstraintIds: hazard.relatedConstraintIds,
          hazardZoneIds: [hazard.id],
          roadIds: hazard.relatedRoadIds
        })
      ];
    }

    return [];
  });
}

function createDetailedStreetBollards(roads: readonly RoadSegment[]): AccessControl[] {
  const detailedRoad = roads.find((road) => road.id === 'road-v-6') ?? roads[0];

  if (!detailedRoad) {
    return [];
  }

  return detailedRoad.centerline.map((point, index) =>
    createAccessControl({
      id: `access-control-bollard-line-${detailedRoad.id}-gateway-${index}`,
      controlKind: 'bollard-line',
      ruleKind: 'authorized-only',
      name: `${detailedRoad.corridorName} gateway bollard line ${index + 1}`,
      parentId: detailedRoad.id,
      ownerDomain: 'mobility',
      centerline: roadCrossLine(detailedRoad, point, detailedRoad.widthMeters * 0.72),
      heightMeters: 0.9,
      widthMeters: 0.28,
      clearanceMeters: 3.5,
      normallyOpen: false,
      publicAccess: true,
      privateAccess: false,
      emergencyOverride: true,
      allowedModes: ['pedestrian', 'bike', 'transit', 'emergency'],
      restrictedModes: ['vehicle', 'service', 'freight'],
      authorizedRoleIds: ['role:emergency-services', 'role:transit-operations'],
      controlledObjectIds: [detailedRoad.id],
      roadIds: [detailedRoad.id]
    })
  );
}

function createServiceAccessControls(corridors: readonly ServiceAccessCorridor[]): AccessControl[] {
  return corridors
    .filter((corridor) => corridor.restricted)
    .filter((corridor) => corridor.corridorKind === 'restricted-corridor')
    .slice(0, 4)
    .map((corridor, index) =>
      createAccessControl({
        id: `access-control-${index % 2 === 0 ? 'gate' : 'checkpoint'}-${sanitizeSourceId(corridor.id)}`,
        controlKind: index % 2 === 0 ? 'gate' : 'checkpoint',
        ruleKind: corridor.emergencyAccess ? 'emergency-only' : 'service-only',
        name: `${corridor.corridorKind} ${index + 1} ${index % 2 === 0 ? 'gate' : 'checkpoint'}`,
        parentId: corridor.id,
        ownerDomain: 'utilities',
        centerline: shortControlLine(corridor.center, corridor.widthMeters + 2, index % 2 === 0 ? 'horizontal' : 'vertical'),
        heightMeters: index % 2 === 0 ? 1.2 : 2.25,
        widthMeters: index % 2 === 0 ? 0.32 : 0.8,
        clearanceMeters: corridor.clearAccessMeters,
        normallyOpen: false,
        publicAccess: false,
        privateAccess: true,
        emergencyOverride: corridor.emergencyAccess,
        allowedModes: corridor.emergencyAccess ? ['service', 'emergency'] : ['service'],
        restrictedModes: corridor.emergencyAccess
          ? ['vehicle', 'pedestrian', 'bike', 'transit', 'freight']
          : ['vehicle', 'pedestrian', 'bike', 'transit', 'emergency', 'freight'],
        authorizedRoleIds: corridor.authorizedRoleIds,
        controlledObjectIds: [corridor.id, ...corridor.utilityNodeIds, ...corridor.utilityEdgeIds],
        serviceAccessCorridorIds: [corridor.id],
        roadIds: corridor.roadIds
      })
    );
}

function createTransitTurnstiles(transitStops: readonly TransitStop[]): AccessControl[] {
  return transitStops.slice(0, 3).map((stop, index) =>
    createAccessControl({
      id: `access-control-turnstile-${sanitizeSourceId(stop.id)}`,
      controlKind: 'turnstile',
      ruleKind: 'paid-access',
      name: `Transit turnstile ${index + 1}`,
      parentId: stop.id,
      ownerDomain: 'mobility',
      centerline: shortControlLine(stop.center, Math.min(3.2, stop.platformLengthMeters * 0.35), stop.side === 'left' ? 'vertical' : 'horizontal'),
      heightMeters: 1.05,
      widthMeters: 0.36,
      clearanceMeters: 0.9,
      normallyOpen: true,
      publicAccess: true,
      privateAccess: false,
      emergencyOverride: true,
      allowedModes: ['pedestrian', 'transit', 'emergency'],
      restrictedModes: ['vehicle', 'bike', 'service', 'freight'],
      authorizedRoleIds: ['role:transit-operations', 'role:emergency-services'],
      controlledObjectIds: [stop.id],
      roadIds: [stop.roadId],
      sidewalkIds: [stop.sidewalkId],
      transitStopIds: [stop.id]
    })
  );
}

function createAccessControl(input: {
  readonly id: CityId;
  readonly controlKind: AccessControlKind;
  readonly ruleKind: AccessControlRuleKind;
  readonly name: string;
  readonly parentId: CityId;
  readonly ownerDomain: AccessControl['ownerDomain'];
  readonly centerline: Polyline2D;
  readonly heightMeters: number;
  readonly widthMeters: number;
  readonly clearanceMeters: number;
  readonly normallyOpen: boolean;
  readonly publicAccess: boolean;
  readonly privateAccess: boolean;
  readonly emergencyOverride: boolean;
  readonly allowedModes: readonly NavigationMode[];
  readonly restrictedModes: readonly NavigationMode[];
  readonly authorizedRoleIds: readonly CityId[];
  readonly controlledObjectIds: readonly CityId[];
  readonly relatedConstraintIds?: readonly CityId[];
  readonly hazardZoneIds?: readonly CityId[];
  readonly serviceAccessCorridorIds?: readonly CityId[];
  readonly roadIds?: readonly CityId[];
  readonly sidewalkIds?: readonly CityId[];
  readonly crossingIds?: readonly CityId[];
  readonly buildingEntranceIds?: readonly CityId[];
  readonly parcelIds?: readonly CityId[];
  readonly transitStopIds?: readonly CityId[];
}): AccessControl {
  const centerline = input.centerline.map(roundPoint);
  const center = lineMidpoint(centerline);
  const boundary = lineEnvelope(centerline, Math.max(input.widthMeters, 0.1));

  return {
    id: input.id,
    kind: 'access-control',
    ownerDomain: input.ownerDomain,
    parentId: input.parentId,
    name: input.name,
    lod: 'lod3',
    controlKind: input.controlKind,
    ruleKind: input.ruleKind,
    center,
    centerline,
    boundary,
    heightMeters: round(input.heightMeters),
    widthMeters: round(input.widthMeters),
    clearanceMeters: round(input.clearanceMeters),
    normallyOpen: input.normallyOpen,
    publicAccess: input.publicAccess,
    privateAccess: input.privateAccess,
    emergencyOverride: input.emergencyOverride,
    allowedModes: uniqueModes(input.allowedModes),
    restrictedModes: uniqueModes(input.restrictedModes),
    authorizedRoleIds: [...input.authorizedRoleIds].sort(),
    controlledObjectIds: uniqueStrings(input.controlledObjectIds),
    relatedConstraintIds: uniqueStrings(input.relatedConstraintIds ?? []),
    hazardZoneIds: uniqueStrings(input.hazardZoneIds ?? []),
    serviceAccessCorridorIds: uniqueStrings(input.serviceAccessCorridorIds ?? []),
    roadIds: uniqueStrings(input.roadIds ?? []),
    sidewalkIds: uniqueStrings(input.sidewalkIds ?? []),
    crossingIds: uniqueStrings(input.crossingIds ?? []),
    buildingEntranceIds: uniqueStrings(input.buildingEntranceIds ?? []),
    parcelIds: uniqueStrings(input.parcelIds ?? []),
    transitStopIds: uniqueStrings(input.transitStopIds ?? []),
    navigationGraphEdgeIds: [],
    tags: {
      controlKind: input.controlKind,
      ruleKind: input.ruleKind,
      publicAccess: input.publicAccess,
      emergencyOverride: input.emergencyOverride
    }
  };
}

function attachSidewalkRefs(
  control: AccessControl,
  roadsById: ReadonlyMap<CityId, RoadSegment>,
  sidewalkGraph: SidewalkGraph
): AccessControl {
  const sidewalkIds = new Set(control.sidewalkIds);

  for (const roadId of control.roadIds) {
    for (const sidewalk of roadsById.get(roadId)?.sidewalks ?? []) {
      sidewalkIds.add(sidewalk.id);
    }
  }

  const crossingIds = new Set(control.crossingIds);
  for (const edge of sidewalkGraph.edges) {
    if (edge.crossingId && control.navigationGraphEdgeIds.some((edgeId) => edgeId.includes(sanitizeSourceId(edge.id)))) {
      crossingIds.add(edge.crossingId);
    }
  }

  return {
    ...control,
    sidewalkIds: [...sidewalkIds].sort(),
    crossingIds: [...crossingIds].sort()
  };
}

function findMatchingNavigationEdges(
  control: AccessControl,
  edges: readonly NavigationGraphEdge[]
): CityId[] {
  return edges
    .filter((edge) => controlAffectsNavigationEdge(control, edge))
    .map((edge) => edge.id)
    .sort();
}

function controlAffectsNavigationEdge(control: AccessControl, edge: NavigationGraphEdge): boolean {
  if (![...control.allowedModes, ...control.restrictedModes].includes(edge.mode)) {
    return false;
  }

  return (
    edge.roadIds.some((roadId) => control.roadIds.includes(roadId)) ||
    control.controlledObjectIds.includes(edge.sourceObjectId) ||
    control.transitStopIds.includes(edge.sourceObjectId) ||
    control.serviceAccessCorridorIds.includes(edge.sourceObjectId)
  );
}

function edgeCanPassControl(mode: NavigationMode, control: AccessControl): boolean {
  if (mode === 'emergency' && control.emergencyOverride) {
    return true;
  }

  return !control.restrictedModes.includes(mode);
}

function groupControlsByNavigationEdgeId(controls: readonly AccessControl[]): Map<CityId, AccessControl[]> {
  const groups = new Map<CityId, AccessControl[]>();

  for (const control of controls) {
    for (const edgeId of control.navigationGraphEdgeIds) {
      groups.set(edgeId, [...(groups.get(edgeId) ?? []), control]);
    }
  }

  return groups;
}

function boundaryEdgeLine(boundary: Polygon2D, edge: 'north' | 'south' | 'east' | 'west'): Polyline2D {
  const bounds = getPolygonBounds(boundary);

  switch (edge) {
    case 'north':
      return [
        { x: bounds.minX, z: bounds.maxZ },
        { x: bounds.maxX, z: bounds.maxZ }
      ];
    case 'south':
      return [
        { x: bounds.minX, z: bounds.minZ },
        { x: bounds.maxX, z: bounds.minZ }
      ];
    case 'east':
      return [
        { x: bounds.maxX, z: bounds.minZ },
        { x: bounds.maxX, z: bounds.maxZ }
      ];
    case 'west':
      return [
        { x: bounds.minX, z: bounds.minZ },
        { x: bounds.minX, z: bounds.maxZ }
      ];
  }
}

function roadCrossLine(road: RoadSegment, point: Point2D, lengthMeters: number): Polyline2D {
  const halfLength = lengthMeters / 2;

  if (road.orientation === 'vertical') {
    return [
      { x: point.x - halfLength, z: point.z },
      { x: point.x + halfLength, z: point.z }
    ];
  }

  return [
    { x: point.x, z: point.z - halfLength },
    { x: point.x, z: point.z + halfLength }
  ];
}

function shortControlLine(center: Point2D, lengthMeters: number, orientation: 'horizontal' | 'vertical'): Polyline2D {
  const halfLength = lengthMeters / 2;

  if (orientation === 'horizontal') {
    return [
      { x: center.x - halfLength, z: center.z },
      { x: center.x + halfLength, z: center.z }
    ];
  }

  return [
    { x: center.x, z: center.z - halfLength },
    { x: center.x, z: center.z + halfLength }
  ];
}

function lineEnvelope(centerline: Polyline2D, widthMeters: number): Polygon2D {
  const bounds = getPolygonBounds(centerline);
  const lengthX = bounds.maxX - bounds.minX;
  const lengthZ = bounds.maxZ - bounds.minZ;

  return rectanglePolygon(lineMidpoint(centerline), {
    x: Math.max(widthMeters, lengthX + widthMeters),
    z: Math.max(widthMeters, lengthZ + widthMeters)
  });
}

function lineMidpoint(centerline: Polyline2D): Point2D {
  const first = centerline[0];
  const last = centerline[centerline.length - 1] ?? first;

  return roundPoint({
    x: (first.x + last.x) / 2,
    z: (first.z + last.z) / 2
  });
}

function roundPoint(point: Point2D): Point2D {
  return {
    x: round(point.x),
    z: round(point.z)
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function uniqueModes(values: readonly NavigationMode[]): NavigationMode[] {
  const order = new Map(ALL_NAVIGATION_MODES.map((mode, index) => [mode, index]));
  return [...new Set(values)].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

function sanitizeSourceId(id: CityId): string {
  return id.replace(/[^a-z0-9-]/g, '-');
}
