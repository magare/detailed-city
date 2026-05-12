import {
  DEFAULT_STREET_PROFILES,
  type CityId,
  type ConflictPointSeverity,
  type IntersectionApproachPriority,
  type IntersectionControlType,
  type LaneContract,
  type LaneRole,
  type SidewalkContract,
  type StreetHierarchy,
  type StreetProfile,
  type TravelMode
} from '../../city/data-contracts/cityContracts';
import type { CityBounds, CityConfig, IntersectionPlan, RoadSegment } from '../../types/city';
import { axisAlignedCenterline } from '../../utils/geometry';

export class RoadNetworkGenerator {
  constructor(private readonly config: CityConfig) {}

  getBounds(): CityBounds {
    const spacing = this.config.blockSize + this.config.roadWidth;
    const span = this.config.gridSize * spacing + this.config.roadWidth;

    return {
      spacing,
      span,
      halfSpan: span / 2
    };
  }

  generate(): RoadSegment[] {
    const bounds = this.getBounds();
    const roads: RoadSegment[] = [];

    for (let index = 0; index <= this.config.gridSize; index += 1) {
      const offset = -bounds.halfSpan + this.config.roadWidth / 2 + index * bounds.spacing;
      const verticalCenter = { x: offset, z: 0 };
      const horizontalCenter = { x: 0, z: offset };
      const verticalId = `road-v-${index}`;
      const horizontalId = `road-h-${index}`;
      const verticalPolicy = createStreetPolicy('vertical', index, this.config.gridSize, this.config.roadWidth);
      const horizontalPolicy = createStreetPolicy('horizontal', index, this.config.gridSize, this.config.roadWidth);

      roads.push({
        id: verticalId,
        kind: 'road-segment',
        ownerDomain: 'mobility',
        lod: 'lod1',
        orientation: 'vertical',
        center: verticalCenter,
        centerline: axisAlignedCenterline(verticalCenter, bounds.span, 'vertical'),
        hierarchy: verticalPolicy.hierarchy,
        streetProfileId: verticalPolicy.streetProfileId,
        length: bounds.span,
        width: verticalPolicy.carriagewayWidth,
        widthMeters: verticalPolicy.carriagewayWidth,
        rightOfWayWidthMeters: verticalPolicy.rightOfWayWidthMeters,
        designSpeedKph: verticalPolicy.designSpeedKph,
        corridorId: verticalPolicy.corridorId,
        corridorName: verticalPolicy.corridorName,
        continuityGroupId: verticalPolicy.continuityGroupId,
        transitEligible: verticalPolicy.transitEligible,
        laneCount: verticalPolicy.laneCount,
        lanes: createLanes(verticalId, verticalPolicy.laneCount, verticalPolicy.profile),
        sidewalks: createSidewalks(verticalId, verticalPolicy.profile)
      });

      roads.push({
        id: horizontalId,
        kind: 'road-segment',
        ownerDomain: 'mobility',
        lod: 'lod1',
        orientation: 'horizontal',
        center: horizontalCenter,
        centerline: axisAlignedCenterline(horizontalCenter, bounds.span, 'horizontal'),
        hierarchy: horizontalPolicy.hierarchy,
        streetProfileId: horizontalPolicy.streetProfileId,
        length: bounds.span,
        width: horizontalPolicy.carriagewayWidth,
        widthMeters: horizontalPolicy.carriagewayWidth,
        rightOfWayWidthMeters: horizontalPolicy.rightOfWayWidthMeters,
        designSpeedKph: horizontalPolicy.designSpeedKph,
        corridorId: horizontalPolicy.corridorId,
        corridorName: horizontalPolicy.corridorName,
        continuityGroupId: horizontalPolicy.continuityGroupId,
        transitEligible: horizontalPolicy.transitEligible,
        laneCount: horizontalPolicy.laneCount,
        lanes: createLanes(horizontalId, horizontalPolicy.laneCount, horizontalPolicy.profile),
        sidewalks: createSidewalks(horizontalId, horizontalPolicy.profile)
      });
    }

    return roads;
  }

  generateIntersections(roads: readonly RoadSegment[]): IntersectionPlan[] {
    const roadsById = new Map(roads.map((road) => [road.id, road]));
    const intersections: IntersectionPlan[] = [];

    for (let verticalIndex = 0; verticalIndex <= this.config.gridSize; verticalIndex += 1) {
      const verticalRoadId = `road-v-${verticalIndex}`;
      const verticalRoad = roadsById.get(verticalRoadId);

      if (!verticalRoad) {
        continue;
      }

      for (let horizontalIndex = 0; horizontalIndex <= this.config.gridSize; horizontalIndex += 1) {
        const horizontalRoadId = `road-h-${horizontalIndex}`;
        const horizontalRoad = roadsById.get(horizontalRoadId);

        if (!horizontalRoad) {
          continue;
        }

        const hierarchyMix = uniqueHierarchies([verticalRoad.hierarchy, horizontalRoad.hierarchy]);
        const signalExpectation = getSignalExpectation(hierarchyMix);
        const behavior = createIntersectionBehavior({
          id: `intersection-v${verticalIndex}-h${horizontalIndex}`,
          verticalRoad,
          horizontalRoad,
          hierarchyMix,
          signalExpectation
        });

        intersections.push({
          id: `intersection-v${verticalIndex}-h${horizontalIndex}`,
          kind: 'intersection',
          ownerDomain: 'mobility',
          lod: 'lod2',
          center: {
            x: verticalRoad.center.x,
            z: horizontalRoad.center.z
          },
          connectedRoadIds: [verticalRoadId, horizontalRoadId],
          hierarchyMix,
          signalExpectation,
          ...behavior,
          grid: { x: verticalIndex, z: horizontalIndex },
          verticalRoadId,
          horizontalRoadId
        });
      }
    }

    return intersections;
  }
}

type IntersectionBehaviorInput = {
  readonly id: CityId;
  readonly verticalRoad: RoadSegment;
  readonly horizontalRoad: RoadSegment;
  readonly hierarchyMix: readonly StreetHierarchy[];
  readonly signalExpectation: IntersectionPlan['signalExpectation'];
};

type IntersectionBehavior = Pick<
  IntersectionPlan,
  | 'controlType'
  | 'approachRules'
  | 'turnConstraints'
  | 'conflictPoints'
  | 'visibilitySplays'
  | 'cornerRadiusMeters'
  | 'raisedJunction'
>;

function createIntersectionBehavior(input: IntersectionBehaviorInput): IntersectionBehavior {
  const { id, verticalRoad, horizontalRoad, hierarchyMix, signalExpectation } = input;
  const controlType = getControlType(signalExpectation, verticalRoad, horizontalRoad);
  const center = { x: verticalRoad.center.x, z: horizontalRoad.center.z };
  const cornerRadiusMeters = getCornerRadiusMeters(hierarchyMix);

  return {
    controlType,
    approachRules: [createApproachRule(verticalRoad, controlType, horizontalRoad), createApproachRule(horizontalRoad, controlType, verticalRoad)],
    turnConstraints: createTurnConstraints(verticalRoad, horizontalRoad),
    conflictPoints: createConflictPoints(id, center, hierarchyMix),
    visibilitySplays: [verticalRoad, horizontalRoad].map((road) => ({
      roadId: road.id,
      distanceMeters: roundMeters(Math.max(18, road.designSpeedKph * 1.25)),
      clearSightTriangleMeters: roundMeters(Math.max(6, road.designSpeedKph * 0.32))
    })),
    cornerRadiusMeters,
    raisedJunction: shouldUseRaisedJunction(controlType, hierarchyMix)
  };
}

function getControlType(
  signalExpectation: IntersectionPlan['signalExpectation'],
  verticalRoad: RoadSegment,
  horizontalRoad: RoadSegment
): IntersectionControlType {
  if (signalExpectation === 'signalized') {
    return 'traffic-signal';
  }

  if (signalExpectation === 'uncontrolled') {
    return verticalRoad.hierarchy === 'promenade' || horizontalRoad.hierarchy === 'promenade' ? 'yield' : 'uncontrolled';
  }

  return verticalRoad.hierarchy === horizontalRoad.hierarchy ? 'all-way-stop' : 'minor-stop';
}

function createApproachRule(
  road: RoadSegment,
  controlType: IntersectionControlType,
  pairedRoad: RoadSegment
): IntersectionPlan['approachRules'][number] {
  if (controlType === 'traffic-signal') {
    return { roadId: road.id, control: 'signal', priority: getApproachPriority(road, pairedRoad) };
  }

  if (controlType === 'all-way-stop') {
    return { roadId: road.id, control: 'stop', priority: 'shared' };
  }

  if (controlType === 'minor-stop') {
    const priority = getApproachPriority(road, pairedRoad);
    return { roadId: road.id, control: priority === 'minor' ? 'stop' : 'uncontrolled', priority };
  }

  if (controlType === 'yield') {
    return { roadId: road.id, control: road.hierarchy === 'promenade' ? 'uncontrolled' : 'yield', priority: getApproachPriority(road, pairedRoad) };
  }

  return { roadId: road.id, control: 'uncontrolled', priority: getApproachPriority(road, pairedRoad) };
}

function getApproachPriority(road: RoadSegment, pairedRoad: RoadSegment): IntersectionApproachPriority {
  const roadPriority = getHierarchyPriority(road.hierarchy);
  const pairedPriority = getHierarchyPriority(pairedRoad.hierarchy);

  if (roadPriority === pairedPriority) {
    return 'shared';
  }

  return roadPriority > pairedPriority ? 'major' : 'minor';
}

function createTurnConstraints(
  verticalRoad: RoadSegment,
  horizontalRoad: RoadSegment
): IntersectionPlan['turnConstraints'] {
  return [
    createTurnConstraint(verticalRoad, horizontalRoad),
    createTurnConstraint(horizontalRoad, verticalRoad)
  ];
}

function createTurnConstraint(fromRoad: RoadSegment, toRoad: RoadSegment): IntersectionPlan['turnConstraints'][number] {
  const hasCalmStreet = fromRoad.hierarchy === 'alley' || fromRoad.hierarchy === 'promenade';
  const allowedMovements = hasCalmStreet ? (['through', 'right'] as const) : (['left', 'through', 'right'] as const);

  return {
    fromRoadId: fromRoad.id,
    toRoadId: toRoad.id,
    allowedMovements
  };
}

function createConflictPoints(
  intersectionId: CityId,
  center: { readonly x: number; readonly z: number },
  hierarchyMix: readonly StreetHierarchy[]
): IntersectionPlan['conflictPoints'] {
  const severity = getConflictSeverity(hierarchyMix);

  return [
    {
      id: `${intersectionId}-conflict-vehicle`,
      point: center,
      conflictKind: 'vehicle-vehicle',
      severity
    },
    {
      id: `${intersectionId}-conflict-crossing-v`,
      point: { x: center.x, z: roundMeters(center.z - 2.4) },
      conflictKind: 'vehicle-pedestrian',
      severity
    },
    {
      id: `${intersectionId}-conflict-crossing-h`,
      point: { x: roundMeters(center.x + 2.4), z: center.z },
      conflictKind: 'vehicle-pedestrian',
      severity
    }
  ];
}

function getConflictSeverity(hierarchyMix: readonly StreetHierarchy[]): ConflictPointSeverity {
  if (hierarchyMix.includes('arterial') || hierarchyMix.includes('transit-corridor')) {
    return 'high';
  }

  if (hierarchyMix.includes('collector')) {
    return 'medium';
  }

  return 'low';
}

function getCornerRadiusMeters(hierarchyMix: readonly StreetHierarchy[]): number {
  return Math.max(...hierarchyMix.map((hierarchy) => getHierarchyCornerRadiusMeters(hierarchy)));
}

function getHierarchyCornerRadiusMeters(hierarchy: StreetHierarchy): number {
  switch (hierarchy) {
    case 'arterial':
    case 'transit-corridor':
      return 9;
    case 'collector':
      return 6;
    case 'local':
      return 4.5;
    case 'alley':
      return 3;
    case 'promenade':
      return 2.5;
  }
}

function shouldUseRaisedJunction(controlType: IntersectionControlType, hierarchyMix: readonly StreetHierarchy[]): boolean {
  return controlType !== 'traffic-signal' && (hierarchyMix.includes('local') || hierarchyMix.includes('promenade'));
}

function getHierarchyPriority(hierarchy: StreetHierarchy): number {
  switch (hierarchy) {
    case 'transit-corridor':
    case 'arterial':
      return 5;
    case 'collector':
      return 4;
    case 'local':
      return 3;
    case 'promenade':
      return 2;
    case 'alley':
      return 1;
  }
}

type StreetPolicy = {
  readonly hierarchy: StreetHierarchy;
  readonly streetProfileId: string;
  readonly profile: StreetProfile;
  readonly laneCount: number;
  readonly carriagewayWidth: number;
  readonly rightOfWayWidthMeters: number;
  readonly designSpeedKph: number;
  readonly corridorId: CityId;
  readonly corridorName: string;
  readonly continuityGroupId: CityId;
  readonly transitEligible: boolean;
};

function createStreetPolicy(
  orientation: RoadSegment['orientation'],
  index: number,
  gridSize: number,
  roadWidth: number
): StreetPolicy {
  const midpoint = Math.floor(gridSize / 2);
  const policyBase = selectPolicyBase(orientation, index, gridSize, midpoint);
  const profile = getStreetProfile(policyBase.streetProfileId);
  const profileFallbackWidth =
    profile.hierarchy === 'arterial' || profile.hierarchy === 'transit-corridor' ? roadWidth * 1.34 : roadWidth;
  const carriagewayWidth = getCarriagewayWidth(profile, profileFallbackWidth);

  return {
    hierarchy: profile.hierarchy,
    streetProfileId: profile.id,
    profile,
    laneCount: profile.vehicleLanes,
    carriagewayWidth,
    rightOfWayWidthMeters: profile.totalWidthMeters,
    designSpeedKph: profile.designSpeedKph,
    corridorId: policyBase.corridorId,
    corridorName: policyBase.corridorName,
    continuityGroupId: policyBase.continuityGroupId,
    transitEligible: profile.transitLane || profile.hierarchy === 'transit-corridor'
  };
}

function selectPolicyBase(
  orientation: RoadSegment['orientation'],
  index: number,
  gridSize: number,
  midpoint: number
): Pick<StreetPolicy, 'streetProfileId' | 'corridorId' | 'corridorName' | 'continuityGroupId'> {
  if (orientation === 'vertical' && index === midpoint) {
    return createPolicyBase('grand-avenue', 'corridor-central-grand-avenue', 'Central Grand Avenue');
  }

  if (orientation === 'horizontal' && index === midpoint) {
    return createPolicyBase('transit-corridor', 'corridor-crosstown-transit', 'Crosstown Transit Corridor');
  }

  if (orientation === 'horizontal' && index === Math.max(1, Math.floor(gridSize / 3))) {
    return createPolicyBase('waterfront-promenade', 'corridor-south-river-promenade', 'South River Promenade');
  }

  if (orientation === 'vertical' && (index === 2 || index === gridSize - 2)) {
    return createPolicyBase('service-alley', 'corridor-service-alley-spines', 'Service Alley Spines');
  }

  if (index % 3 === 0 || index === 0 || index === gridSize) {
    const name = orientation === 'vertical' ? `North South Avenue ${index}` : `East West Avenue ${index}`;
    return createPolicyBase('grand-avenue', `corridor-${orientation}-avenue-${index}`, name);
  }

  if (index % 2 === 0) {
    const name = orientation === 'vertical' ? `Collector Street ${index}` : `Market Collector ${index}`;
    return createPolicyBase('main-street', `corridor-${orientation}-collector-${index}`, name);
  }

  const name = orientation === 'vertical' ? `Local Street ${index}` : `Neighborhood Street ${index}`;
  return createPolicyBase('residential-street', `corridor-${orientation}-local-${index}`, name);
}

function createPolicyBase(
  streetProfileId: string,
  corridorId: CityId,
  corridorName: string
): Pick<StreetPolicy, 'streetProfileId' | 'corridorId' | 'corridorName' | 'continuityGroupId'> {
  return {
    streetProfileId,
    corridorId,
    corridorName,
    continuityGroupId: corridorId
  };
}

function getStreetProfile(streetProfileId: string): StreetProfile {
  return DEFAULT_STREET_PROFILES.find((profile) => profile.id === streetProfileId) ?? DEFAULT_STREET_PROFILES[0];
}

function createLanes(roadId: string, laneCount: number, profile: StreetProfile): LaneContract[] {
  return Array.from({ length: laneCount }, (_, index) => {
    const direction = index < Math.ceil(laneCount / 2) ? 'forward' : 'backward';
    const laneRole = getLaneRole(profile, index, laneCount);
    const allowedModes = getAllowedModes(laneRole);

    return {
      id: `${roadId}-lane-${index}`,
      kind: 'lane',
      ownerDomain: 'mobility',
      parentId: roadId,
      lod: 'lod2',
      roadSegmentId: roadId,
      laneIndex: index,
      laneRole,
      allowedModes,
      restrictedModes: getRestrictedModes(allowedModes),
      widthMeters: profile.laneWidthMeters || 3,
      direction,
      turnMovements: getLaneTurnMovements(laneRole),
      reversible: laneRole === 'reversible',
      continuityGroupId: `${roadId}-${direction}-${laneRole}`
    };
  });
}

function getLaneRole(profile: StreetProfile, index: number, laneCount: number): LaneRole {
  if (profile.transitLane && index === 0) {
    return 'bus-only';
  }

  if (profile.hierarchy === 'transit-corridor' && index === 1) {
    return 'reversible';
  }

  if (profile.hierarchy === 'arterial' && index === laneCount - 1) {
    return 'turn-pocket';
  }

  if (profile.hierarchy === 'alley') {
    return 'service';
  }

  return 'general';
}

function getAllowedModes(laneRole: LaneRole): readonly TravelMode[] {
  switch (laneRole) {
    case 'bus-only':
      return ['bus', 'emergency'];
    case 'reversible':
      return ['vehicle', 'bus', 'emergency'];
    case 'turn-pocket':
      return ['vehicle', 'emergency'];
    case 'service':
      return ['vehicle', 'freight', 'emergency'];
    case 'general':
      return ['vehicle', 'freight', 'emergency'];
  }
}

function getRestrictedModes(allowedModes: readonly TravelMode[]): readonly TravelMode[] {
  const allowed = new Set(allowedModes);
  return (['vehicle', 'bus', 'bike', 'freight', 'emergency'] as const).filter((mode) => !allowed.has(mode));
}

function getLaneTurnMovements(laneRole: LaneRole): LaneContract['turnMovements'] {
  switch (laneRole) {
    case 'bus-only':
      return ['through'];
    case 'turn-pocket':
      return ['left', 'right'];
    case 'service':
      return ['through', 'right'];
    case 'reversible':
    case 'general':
      return ['left', 'through', 'right'];
  }
}

function createSidewalks(roadId: string, profile: StreetProfile): SidewalkContract[] {
  if (profile.sidewalkWidthMeters <= 0) {
    return [];
  }

  return ['left', 'right'].map((side) => {
    const frontageZoneMeters = roundMeters(Math.min(1.2, profile.sidewalkWidthMeters * 0.28));
    const furnishingZoneMeters = roundMeters(profile.treeZone ? Math.min(1.6, profile.sidewalkWidthMeters * 0.32) : 0);
    const accessibleClearPathMeters = getAccessibleClearPathMeters(
      profile.sidewalkWidthMeters,
      frontageZoneMeters,
      furnishingZoneMeters
    );

    return {
      id: `${roadId}-sidewalk-${side}`,
      kind: 'sidewalk',
      ownerDomain: 'mobility',
      parentId: roadId,
      lod: 'lod2',
      roadSegmentId: roadId,
      clearWidthMeters: profile.sidewalkWidthMeters,
      frontageZoneMeters,
      furnishingZoneMeters,
      accessibleClearPathMeters,
      runningGradePercent: 0,
      crossSlopePercent: 1.5,
      accessibility: {
        stepFree: true,
        clearPathContinuous: true,
        wheelchairPassable: accessibleClearPathMeters >= 1.8,
        maxRunningGradePercent: 5,
        maxCrossSlopePercent: 2
      }
    };
  });
}

function getAccessibleClearPathMeters(
  sidewalkWidthMeters: number,
  frontageZoneMeters: number,
  furnishingZoneMeters: number
): number {
  return roundMeters(Math.min(sidewalkWidthMeters, Math.max(1.8, sidewalkWidthMeters - frontageZoneMeters * 0.4 - furnishingZoneMeters * 0.5)));
}

function getCarriagewayWidth(profile: StreetProfile, fallbackWidth: number): number {
  const vehicleWidth = profile.vehicleLanes * profile.laneWidthMeters;
  const bikeWidth = profile.bikeLane === 'none' ? 0 : profile.bikeLane === 'painted' ? 1.8 : 2.4;
  const medianWidth = profile.median ? 2.4 : 0;

  return Math.max(fallbackWidth, vehicleWidth + bikeWidth + medianWidth);
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}

function uniqueHierarchies(hierarchies: readonly StreetHierarchy[]): StreetHierarchy[] {
  return [...new Set(hierarchies)];
}

function getSignalExpectation(hierarchyMix: readonly StreetHierarchy[]): IntersectionPlan['signalExpectation'] {
  if (hierarchyMix.includes('arterial') || hierarchyMix.includes('transit-corridor')) {
    return 'signalized';
  }

  if (hierarchyMix.includes('promenade') || hierarchyMix.includes('alley')) {
    return 'uncontrolled';
  }

  return 'stop-controlled';
}
