import {
  DEFAULT_STREET_PROFILES,
  type CityId,
  type LaneContract,
  type SidewalkContract,
  type StreetHierarchy,
  type StreetProfile
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
          signalExpectation: getSignalExpectation(hierarchyMix),
          grid: { x: verticalIndex, z: horizontalIndex },
          verticalRoadId,
          horizontalRoadId
        });
      }
    }

    return intersections;
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
  return Array.from({ length: laneCount }, (_, index) => ({
    id: `${roadId}-lane-${index}`,
    kind: 'lane',
    ownerDomain: 'mobility',
    parentId: roadId,
    lod: 'lod2',
    roadSegmentId: roadId,
    allowedModes: profile.transitLane && index === 0 ? ['vehicle', 'bus', 'emergency'] : ['vehicle', 'freight', 'emergency'],
    widthMeters: profile.laneWidthMeters || 3,
    direction: index < Math.ceil(laneCount / 2) ? 'forward' : 'backward'
  }));
}

function createSidewalks(roadId: string, profile: StreetProfile): SidewalkContract[] {
  if (profile.sidewalkWidthMeters <= 0) {
    return [];
  }

  return ['left', 'right'].map((side) => ({
    id: `${roadId}-sidewalk-${side}`,
    kind: 'sidewalk',
    ownerDomain: 'mobility',
    parentId: roadId,
    lod: 'lod2',
    roadSegmentId: roadId,
    clearWidthMeters: profile.sidewalkWidthMeters,
    frontageZoneMeters: Math.min(1.2, profile.sidewalkWidthMeters * 0.28),
    furnishingZoneMeters: profile.treeZone ? Math.min(1.6, profile.sidewalkWidthMeters * 0.32) : 0
  }));
}

function getCarriagewayWidth(profile: StreetProfile, fallbackWidth: number): number {
  const vehicleWidth = profile.vehicleLanes * profile.laneWidthMeters;
  const bikeWidth = profile.bikeLane === 'none' ? 0 : profile.bikeLane === 'painted' ? 1.8 : 2.4;
  const medianWidth = profile.median ? 2.4 : 0;

  return Math.max(fallbackWidth, vehicleWidth + bikeWidth + medianWidth);
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
