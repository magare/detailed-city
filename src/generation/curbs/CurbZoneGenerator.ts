import { DEFAULT_STREET_PROFILES, type CurbSide, type CurbZoneUse, type StreetProfile } from '../../city/data-contracts/cityContracts';
import type { CurbZone, DetailedStreetSlice, IntersectionPlan, RoadSegment } from '../../types/city';

export interface CurbZoneSource {
  readonly slices: readonly DetailedStreetSlice[];
  readonly roads: readonly RoadSegment[];
  readonly intersections: readonly IntersectionPlan[];
}

const CROSSING_CLEARANCE_METERS = 8;
const CURB_WIDTH_METERS = 2.4;
const MIN_ACTIVE_ZONE_LENGTH_METERS = 10;

export class CurbZoneGenerator {
  create(source: CurbZoneSource): CurbZone[] {
    const detailedRoadIds = new Set(source.slices.map((slice) => slice.corridorRoadId));
    const detailedZones = source.slices.flatMap((slice) => {
      const road = source.roads.find((candidate) => candidate.id === slice.corridorRoadId);

      if (!road) {
        return [];
      }

      const profile = getStreetProfile(road.streetProfileId);
      const intersectionOffsets = source.intersections
        .filter((intersection) => slice.intersectionIds.includes(intersection.id))
        .map((intersection) => getRoadOffsetMeters(road, intersection))
        .sort((a, b) => a - b);

      return road.sidewalks.flatMap((sidewalk) => {
        const side = getSidewalkSide(sidewalk.id);

        return [
          ...createNoStoppingZones({ slice, road, sidewalkId: sidewalk.id, side, intersectionOffsets, context: 'detailed-street' }),
          ...createActiveCurbZones({ slice, road, sidewalkId: sidewalk.id, side, profile, intersectionOffsets, context: 'detailed-street' })
        ];
      });
    });
    const citywideZones = source.roads
      .filter((road) => !detailedRoadIds.has(road.id))
      .flatMap((road) => {
        const profile = getStreetProfile(road.streetProfileId);
        const intersectionOffsets = source.intersections
          .filter((intersection) => intersection.connectedRoadIds.includes(road.id))
          .map((intersection) => getRoadOffsetMeters(road, intersection))
          .sort((a, b) => a - b);

        return road.sidewalks.flatMap((sidewalk) => {
          const side = getSidewalkSide(sidewalk.id);

          return [
            ...createNoStoppingZones({ road, sidewalkId: sidewalk.id, side, intersectionOffsets, context: 'citywide' }),
            ...createActiveCurbZones({ road, sidewalkId: sidewalk.id, side, profile, intersectionOffsets, context: 'citywide' })
          ];
        });
      });

    return [...detailedZones, ...citywideZones];
  }
}

export function attachCurbZoneIdsToSlices(
  slices: readonly DetailedStreetSlice[],
  curbZones: readonly CurbZone[]
): DetailedStreetSlice[] {
  return slices.map((slice) => ({
    ...slice,
    curbZoneIds: curbZones.filter((zone) => zone.sliceId === slice.id).map((zone) => zone.id)
  }));
}

function createNoStoppingZones(input: {
  readonly slice?: DetailedStreetSlice;
  readonly road: RoadSegment;
  readonly sidewalkId: string;
  readonly side: CurbSide;
  readonly intersectionOffsets: readonly number[];
  readonly context: CurbZone['managementContext'];
}): CurbZone[] {
  return input.intersectionOffsets.map((offset, index) => {
    const startMeters = Math.max(0, offset - CROSSING_CLEARANCE_METERS);
    const endMeters = Math.min(input.road.length, offset + CROSSING_CLEARANCE_METERS);

    return createCurbZone({
      id: `curb-zone-${input.road.id}-${input.side}-intersection-${index}-no-stopping`,
      slice: input.slice,
      road: input.road,
      sidewalkId: input.sidewalkId,
      side: input.side,
      curbUse: 'no-stopping',
      startMeters,
      endMeters,
      context: input.context
    });
  });
}

function createActiveCurbZones(input: {
  readonly slice?: DetailedStreetSlice;
  readonly road: RoadSegment;
  readonly sidewalkId: string;
  readonly side: CurbSide;
  readonly profile: StreetProfile;
  readonly intersectionOffsets: readonly number[];
  readonly context: CurbZone['managementContext'];
}): CurbZone[] {
  const zones: CurbZone[] = [];

  for (let index = 0; index < input.intersectionOffsets.length - 1; index += 1) {
    const startMeters = input.intersectionOffsets[index] + CROSSING_CLEARANCE_METERS;
    const endMeters = input.intersectionOffsets[index + 1] - CROSSING_CLEARANCE_METERS;

    if (endMeters - startMeters < MIN_ACTIVE_ZONE_LENGTH_METERS) {
      continue;
    }

    const curbUse = getCurbUse(index, input.side, input.profile);
    zones.push(
      createCurbZone({
        id: `curb-zone-${input.road.id}-${input.side}-segment-${index}-${curbUse}`,
        slice: input.slice,
        road: input.road,
        sidewalkId: input.sidewalkId,
        side: input.side,
        curbUse,
        startMeters,
        endMeters,
        context: input.context
      })
    );
  }

  return zones;
}

function createCurbZone(input: {
  readonly id: string;
  readonly slice?: DetailedStreetSlice;
  readonly road: RoadSegment;
  readonly sidewalkId: string;
  readonly side: CurbSide;
  readonly curbUse: CurbZoneUse;
  readonly startMeters: number;
  readonly endMeters: number;
  readonly context: CurbZone['managementContext'];
}): CurbZone {
  return {
    id: input.id,
    kind: 'curb-zone',
    ownerDomain: 'mobility',
    parentId: input.sidewalkId,
    lod: 'lod3',
    sliceId: input.slice?.id,
    managementContext: input.context,
    roadId: input.road.id,
    sidewalkId: input.sidewalkId,
    side: input.side,
    curbUse: input.curbUse,
    streetProfileId: input.road.streetProfileId,
    startMeters: roundMeters(input.startMeters),
    endMeters: roundMeters(input.endMeters),
    lengthMeters: roundMeters(input.endMeters - input.startMeters),
    widthMeters: CURB_WIDTH_METERS,
    center: getCurbCenter(input.road, input.side, input.startMeters, input.endMeters),
    crossingClearanceMeters: CROSSING_CLEARANCE_METERS,
    management: createManagementPolicy(input.curbUse, input.road),
    tags: {
      detailedStreetSliceId: input.slice?.id ?? '',
      detailedStreetSliceRole: input.slice ? 'corridor-curb-zone' : '',
      citywideCurbManagement: input.context === 'citywide',
      corridorRoadId: input.road.id,
      curbUse: input.curbUse,
      pricing: createManagementPolicy(input.curbUse, input.road).pricing,
      enforcement: createManagementPolicy(input.curbUse, input.road).enforcement
    }
  };
}

function createManagementPolicy(curbUse: CurbZoneUse, road: RoadSegment): CurbZone['management'] {
  switch (curbUse) {
    case 'parking':
      return {
        pricing: road.hierarchy === 'local' ? 'permit' : 'metered',
        enforcement: 'patrol',
        maxStayMinutes: road.hierarchy === 'local' ? 480 : 120,
        disabledSpaces: road.hierarchy === 'local' ? 0 : 1,
        loadingDockAccess: false,
        fireLaneClearance: true,
        transitStopClearance: true
      };
    case 'loading':
      return {
        pricing: 'commercial-loading',
        enforcement: 'camera',
        maxStayMinutes: 30,
        disabledSpaces: 0,
        loadingDockAccess: true,
        fireLaneClearance: true,
        transitStopClearance: true
      };
    case 'ride-hail':
      return {
        pricing: 'free',
        enforcement: 'camera',
        maxStayMinutes: 5,
        disabledSpaces: 0,
        loadingDockAccess: false,
        fireLaneClearance: true,
        transitStopClearance: true
      };
    case 'bus-stop':
      return {
        pricing: 'not-applicable',
        enforcement: 'camera',
        maxStayMinutes: 0,
        disabledSpaces: 0,
        loadingDockAccess: false,
        fireLaneClearance: true,
        transitStopClearance: true
      };
    case 'emergency':
    case 'no-stopping':
      return {
        pricing: 'not-applicable',
        enforcement: 'patrol',
        maxStayMinutes: 0,
        disabledSpaces: 0,
        loadingDockAccess: false,
        fireLaneClearance: true,
        transitStopClearance: true
      };
  }
}

function getCurbUse(segmentIndex: number, side: CurbSide, profile: StreetProfile): CurbZoneUse {
  if (segmentIndex === 0 && side === 'left') {
    return 'emergency';
  }

  if (profile.transitLane && side === 'right' && segmentIndex % 4 === 1) {
    return 'bus-stop';
  }

  if (segmentIndex % 5 === 2) {
    return 'ride-hail';
  }

  if (profile.parking === 'two-side' || (profile.parking === 'one-side' && side === 'right')) {
    return 'parking';
  }

  if (profile.parking === 'none') {
    return 'no-stopping';
  }

  return 'loading';
}

function getCurbCenter(road: RoadSegment, side: CurbSide, startMeters: number, endMeters: number): { x: number; z: number } {
  const sideSign = side === 'left' ? -1 : 1;
  const offset = road.widthMeters / 2 + CURB_WIDTH_METERS / 2;
  const alongRoad = -road.length / 2 + (startMeters + endMeters) / 2;

  if (road.orientation === 'vertical') {
    return {
      x: roundMeters(road.center.x + sideSign * offset),
      z: roundMeters(road.center.z + alongRoad)
    };
  }

  return {
    x: roundMeters(road.center.x + alongRoad),
    z: roundMeters(road.center.z + sideSign * offset)
  };
}

function getRoadOffsetMeters(road: RoadSegment, intersection: IntersectionPlan): number {
  const coordinate = road.orientation === 'vertical' ? intersection.center.z - road.center.z : intersection.center.x - road.center.x;

  return roundMeters(coordinate + road.length / 2);
}

function getSidewalkSide(sidewalkId: string): CurbSide {
  return sidewalkId.endsWith('-left') ? 'left' : 'right';
}

function getStreetProfile(streetProfileId: string): StreetProfile {
  return DEFAULT_STREET_PROFILES.find((profile) => profile.id === streetProfileId) ?? DEFAULT_STREET_PROFILES[0];
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
