import {
  DEFAULT_STREET_PROFILES,
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
      const isAvenue = index % 3 === 0 || index === Math.floor(this.config.gridSize / 2);
      const laneCount = isAvenue ? 4 : 2;
      const hierarchy = isAvenue ? 'arterial' : 'local';
      const streetProfileId = isAvenue ? 'grand-avenue' : 'residential-street';
      const profile = getStreetProfile(streetProfileId);
      const width = getCarriagewayWidth(profile, isAvenue ? this.config.roadWidth * 1.34 : this.config.roadWidth);
      const verticalCenter = { x: offset, z: 0 };
      const horizontalCenter = { x: 0, z: offset };
      const verticalId = `road-v-${index}`;
      const horizontalId = `road-h-${index}`;

      roads.push({
        id: verticalId,
        kind: 'road-segment',
        ownerDomain: 'mobility',
        lod: 'lod1',
        orientation: 'vertical',
        center: verticalCenter,
        centerline: axisAlignedCenterline(verticalCenter, bounds.span, 'vertical'),
        hierarchy,
        streetProfileId,
        length: bounds.span,
        width,
        widthMeters: width,
        laneCount,
        lanes: createLanes(verticalId, laneCount, profile),
        sidewalks: createSidewalks(verticalId, profile)
      });

      roads.push({
        id: horizontalId,
        kind: 'road-segment',
        ownerDomain: 'mobility',
        lod: 'lod1',
        orientation: 'horizontal',
        center: horizontalCenter,
        centerline: axisAlignedCenterline(horizontalCenter, bounds.span, 'horizontal'),
        hierarchy,
        streetProfileId,
        length: bounds.span,
        width,
        widthMeters: width,
        laneCount,
        lanes: createLanes(horizontalId, laneCount, profile),
        sidewalks: createSidewalks(horizontalId, profile)
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
