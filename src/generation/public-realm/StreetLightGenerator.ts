import type { CurbZone, DetailedStreetSlice, RoadSegment, StreetLight } from '../../types/city';

export interface StreetLightSource {
  readonly slices: readonly DetailedStreetSlice[];
  readonly roads: readonly RoadSegment[];
  readonly curbZones: readonly CurbZone[];
}

export class StreetLightGenerator {
  create(source: StreetLightSource): StreetLight[] {
    return source.slices.flatMap((slice) => {
      const road = source.roads.find((candidate) => candidate.id === slice.corridorRoadId);

      if (!road) {
        return [];
      }

      return source.curbZones
        .filter((curbZone) => curbZone.sliceId === slice.id && curbZone.curbUse !== 'no-stopping')
        .filter((_, index) => index % 2 === 0)
        .map((curbZone, index) => createStreetLight(slice, road, curbZone, index));
    });
  }
}

function createStreetLight(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  curbZone: CurbZone,
  index: number
): StreetLight {
  return {
    id: `street-light-${road.id}-${curbZone.side}-${index}`,
    kind: 'street-light',
    ownerDomain: 'public-realm',
    parentId: curbZone.sidewalkId,
    lod: 'lod3',
    sliceId: slice.id,
    roadId: road.id,
    sidewalkId: curbZone.sidewalkId,
    curbZoneId: curbZone.id,
    position: getLightPosition(road, curbZone),
    side: curbZone.side,
    heightMeters: 6.2,
    poleRadiusMeters: 0.12,
    armLengthMeters: 1.4,
    fixtureLengthMeters: 0.72,
    coverageRadiusMeters: 18,
    colorTemperatureKelvin: 3000,
    powerCircuitId: `power-circuit-placeholder-${slice.corridorRoadId}`,
    nightLighting: {
      enabledByDefault: false,
      emissiveIntensity: 0.82,
      castsDynamicLight: false
    },
    tags: {
      detailedStreetSliceId: slice.id,
      detailedStreetSliceRole: 'corridor-street-light',
      corridorRoadId: road.id,
      curbZoneId: curbZone.id,
      colorTemperatureKelvin: 3000
    }
  };
}

function getLightPosition(road: RoadSegment, curbZone: CurbZone): { x: number; z: number } {
  const alongRatio = curbZone.side === 'left' ? 0.25 : 0.75;
  const alongRoad = -road.length / 2 + curbZone.startMeters + curbZone.lengthMeters * alongRatio;
  const sideSign = curbZone.side === 'left' ? -1 : 1;
  const perpendicularOffset = road.widthMeters / 2 + Math.min(1.5, curbZone.widthMeters * 0.55);

  if (road.orientation === 'vertical') {
    return {
      x: roundMeters(road.center.x + sideSign * perpendicularOffset),
      z: roundMeters(road.center.z + alongRoad)
    };
  }

  return {
    x: roundMeters(road.center.x + alongRoad),
    z: roundMeters(road.center.z + sideSign * perpendicularOffset)
  };
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
