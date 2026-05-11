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
    return source.slices.flatMap((slice) => {
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
          ...createNoStoppingZones(slice, road, sidewalk.id, side, intersectionOffsets),
          ...createActiveCurbZones(slice, road, sidewalk.id, side, profile, intersectionOffsets)
        ];
      });
    });
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

function createNoStoppingZones(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  sidewalkId: string,
  side: CurbSide,
  intersectionOffsets: readonly number[]
): CurbZone[] {
  return intersectionOffsets.map((offset, index) => {
    const startMeters = Math.max(0, offset - CROSSING_CLEARANCE_METERS);
    const endMeters = Math.min(road.length, offset + CROSSING_CLEARANCE_METERS);

    return createCurbZone({
      id: `curb-zone-${road.id}-${side}-intersection-${index}-no-stopping`,
      slice,
      road,
      sidewalkId,
      side,
      curbUse: 'no-stopping',
      startMeters,
      endMeters
    });
  });
}

function createActiveCurbZones(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  sidewalkId: string,
  side: CurbSide,
  profile: StreetProfile,
  intersectionOffsets: readonly number[]
): CurbZone[] {
  const zones: CurbZone[] = [];

  for (let index = 0; index < intersectionOffsets.length - 1; index += 1) {
    const startMeters = intersectionOffsets[index] + CROSSING_CLEARANCE_METERS;
    const endMeters = intersectionOffsets[index + 1] - CROSSING_CLEARANCE_METERS;

    if (endMeters - startMeters < MIN_ACTIVE_ZONE_LENGTH_METERS) {
      continue;
    }

    zones.push(
      createCurbZone({
        id: `curb-zone-${road.id}-${side}-segment-${index}-${getCurbUse(index, side, profile)}`,
        slice,
        road,
        sidewalkId,
        side,
        curbUse: getCurbUse(index, side, profile),
        startMeters,
        endMeters
      })
    );
  }

  return zones;
}

function createCurbZone(input: {
  readonly id: string;
  readonly slice: DetailedStreetSlice;
  readonly road: RoadSegment;
  readonly sidewalkId: string;
  readonly side: CurbSide;
  readonly curbUse: CurbZoneUse;
  readonly startMeters: number;
  readonly endMeters: number;
}): CurbZone {
  return {
    id: input.id,
    kind: 'curb-zone',
    ownerDomain: 'mobility',
    parentId: input.sidewalkId,
    lod: 'lod3',
    sliceId: input.slice.id,
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
    tags: {
      detailedStreetSliceId: input.slice.id,
      detailedStreetSliceRole: 'corridor-curb-zone',
      corridorRoadId: input.road.id,
      curbUse: input.curbUse
    }
  };
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
