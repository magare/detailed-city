import type { CurbZone, DetailedStreetSlice, IntersectionPlan, RoadSegment, StreetLight } from '../../types/city';

export interface StreetLightSource {
  readonly slices: readonly DetailedStreetSlice[];
  readonly roads: readonly RoadSegment[];
  readonly curbZones: readonly CurbZone[];
  readonly intersections: readonly IntersectionPlan[];
}

interface LightingRecipe {
  readonly fixtureType: StreetLight['fixtureType'];
  readonly lightingPurpose: StreetLight['lightingPurpose'];
  readonly heightMeters: number;
  readonly armLengthMeters: number;
  readonly fixtureLengthMeters: number;
  readonly coverageRadiusMeters: number;
  readonly colorTemperatureKelvin: number;
  readonly targetIlluminanceLux: number;
  readonly estimatedIlluminanceLux: number;
  readonly emissiveIntensity: number;
  readonly shielded: boolean;
  readonly decorative: boolean;
}

export class StreetLightGenerator {
  create(source: StreetLightSource): StreetLight[] {
    const detailedRoadIds = new Set(source.slices.map((slice) => slice.corridorRoadId));
    const detailedStreetLights = source.slices.flatMap((slice) => {
      const road = source.roads.find((candidate) => candidate.id === slice.corridorRoadId);

      if (!road) {
        return [];
      }

      return source.curbZones
        .filter((curbZone) => curbZone.sliceId === slice.id && curbZone.curbUse !== 'no-stopping')
        .map((curbZone, index) => createStreetLight(slice, road, curbZone, index));
    });
    const citywideStreetLights = source.roads
      .filter((road) => !detailedRoadIds.has(road.id))
      .flatMap((road) =>
        createCitywideStreetLights(
          road,
          source.intersections.filter((intersection) => intersection.connectedRoadIds.includes(road.id))
        )
      );

    return [...detailedStreetLights, ...citywideStreetLights];
  }
}

function createStreetLight(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  curbZone: CurbZone,
  index: number
): StreetLight {
  const alongRoadMeters = getCurbZoneLightAlongRoadMeters(curbZone);
  const recipe = getDetailedStreetRecipe(curbZone, index);

  return {
    id: `street-light-${road.id}-${curbZone.side}-${index}`,
    kind: 'street-light',
    ownerDomain: 'public-realm',
    parentId: curbZone.sidewalkId,
    lod: 'lod3',
    placementContext: 'detailed-street',
    fixtureType: recipe.fixtureType,
    lightingPurpose: recipe.lightingPurpose,
    sliceId: slice.id,
    roadId: road.id,
    sidewalkId: curbZone.sidewalkId,
    curbZoneId: curbZone.id,
    position: getLightPosition(road, curbZone.side, getOffsetFromRoadEdgeMeters(road, curbZone.widthMeters), alongRoadMeters),
    side: curbZone.side,
    alongRoadMeters,
    offsetFromRoadEdgeMeters: getOffsetFromRoadEdgeMeters(road, curbZone.widthMeters),
    heightMeters: recipe.heightMeters,
    poleRadiusMeters: 0.12,
    armLengthMeters: recipe.armLengthMeters,
    fixtureLengthMeters: recipe.fixtureLengthMeters,
    coverageRadiusMeters: recipe.coverageRadiusMeters,
    colorTemperatureKelvin: recipe.colorTemperatureKelvin,
    powerCircuitId: `power-circuit-placeholder-${slice.corridorRoadId}`,
    coverage: createCoverage(recipe, true),
    nightSafety: createNightSafety(recipe, true),
    glareControl: createGlareControl(recipe),
    decorativeLighting: {
      enabled: recipe.decorative,
      districtIdentity: true,
      eventReady: curbZone.curbUse === 'bus-stop' || curbZone.curbUse === 'ride-hail'
    },
    nightLighting: {
      enabledByDefault: true,
      emissiveIntensity: recipe.emissiveIntensity,
      castsDynamicLight: true
    },
    tags: {
      detailedStreetSliceId: slice.id,
      detailedStreetSliceRole: 'corridor-street-light',
      corridorRoadId: road.id,
      curbZoneId: curbZone.id,
      colorTemperatureKelvin: recipe.colorTemperatureKelvin,
      fixtureType: recipe.fixtureType,
      lightingPurpose: recipe.lightingPurpose
    }
  };
}

function createCitywideStreetLights(
  road: RoadSegment,
  intersections: readonly IntersectionPlan[]
): StreetLight[] {
  if (road.sidewalks.length === 0) {
    return [];
  }

  const offsets = [0, ...intersections.map((intersection) => getRoadOffsetMeters(road, intersection)).sort((a, b) => a - b), road.length];
  const segments = offsets
    .slice(0, -1)
    .map((start, index) => ({ start, end: offsets[index + 1], index }))
    .filter((segment) => segment.end - segment.start >= getMinimumLitSegmentLength(road));

  return road.sidewalks.flatMap((sidewalk) => {
    const side = sidewalk.id.endsWith('left') ? 'left' : 'right';
    const sideOffset = side === 'left' ? 0 : 1;

    return segments
      .filter((segment) => shouldPlaceCitywideLight(road, segment.index, sideOffset))
      .map((segment) =>
        createCitywideStreetLight(
          road,
          sidewalk,
          side,
          segment.index,
          roundMeters((segment.start + segment.end) / 2),
          sideOffset
        )
      );
  });
}

function createCitywideStreetLight(
  road: RoadSegment,
  sidewalk: RoadSegment['sidewalks'][number],
  side: 'left' | 'right',
  segmentIndex: number,
  alongRoadMeters: number,
  sideOffset: number
): StreetLight {
  const recipe = getCitywideRecipe(road, segmentIndex, sideOffset);
  const offsetFromRoadEdgeMeters = getOffsetFromRoadEdgeMeters(road, sidewalk.furnishingZoneMeters);
  const criticalPedestrianPath = isCriticalLightingRoad(road);

  return {
    id: `street-light-${road.id}-${side}-${segmentIndex}`,
    kind: 'street-light',
    ownerDomain: 'public-realm',
    parentId: sidewalk.id,
    lod: 'lod3',
    placementContext: 'citywide-street',
    fixtureType: recipe.fixtureType,
    lightingPurpose: recipe.lightingPurpose,
    roadId: road.id,
    sidewalkId: sidewalk.id,
    position: getLightPosition(road, side, offsetFromRoadEdgeMeters, alongRoadMeters),
    side,
    alongRoadMeters,
    offsetFromRoadEdgeMeters,
    heightMeters: recipe.heightMeters,
    poleRadiusMeters: 0.12,
    armLengthMeters: recipe.armLengthMeters,
    fixtureLengthMeters: recipe.fixtureLengthMeters,
    coverageRadiusMeters: recipe.coverageRadiusMeters,
    colorTemperatureKelvin: recipe.colorTemperatureKelvin,
    powerCircuitId: `power-circuit-placeholder-${road.id}`,
    coverage: createCoverage(recipe, criticalPedestrianPath),
    nightSafety: createNightSafety(recipe, criticalPedestrianPath),
    glareControl: createGlareControl(recipe),
    decorativeLighting: {
      enabled: recipe.decorative,
      districtIdentity: road.hierarchy === 'promenade' || road.transitEligible,
      eventReady: road.hierarchy === 'promenade'
    },
    nightLighting: {
      enabledByDefault: true,
      emissiveIntensity: recipe.emissiveIntensity,
      castsDynamicLight: true
    },
    tags: {
      citywideLighting: true,
      corridorRoadId: road.id,
      streetProfileId: road.streetProfileId,
      hierarchy: road.hierarchy,
      colorTemperatureKelvin: recipe.colorTemperatureKelvin,
      fixtureType: recipe.fixtureType,
      lightingPurpose: recipe.lightingPurpose
    }
  };
}

function getDetailedStreetRecipe(curbZone: CurbZone, index: number): LightingRecipe {
  if (curbZone.curbUse === 'bus-stop' || curbZone.curbUse === 'ride-hail') {
    return {
      fixtureType: 'double-arm',
      lightingPurpose: 'transit-stop-safety',
      heightMeters: 6.8,
      armLengthMeters: 1.7,
      fixtureLengthMeters: 0.82,
      coverageRadiusMeters: 24,
      colorTemperatureKelvin: 3000,
      targetIlluminanceLux: 24,
      estimatedIlluminanceLux: 28,
      emissiveIntensity: 0.96,
      shielded: true,
      decorative: index % 2 === 0
    };
  }

  return {
    fixtureType: index % 3 === 0 ? 'decorative-pedestrian' : 'single-arm',
    lightingPurpose: 'promenade-comfort',
    heightMeters: 6.2,
    armLengthMeters: 1.4,
    fixtureLengthMeters: 0.72,
    coverageRadiusMeters: 20,
    colorTemperatureKelvin: 3000,
    targetIlluminanceLux: 18,
    estimatedIlluminanceLux: 22,
    emissiveIntensity: 0.86,
    shielded: true,
    decorative: index % 3 === 0
  };
}

function getCitywideRecipe(road: RoadSegment, segmentIndex: number, sideOffset: number): LightingRecipe {
  if (road.hierarchy === 'arterial' || road.hierarchy === 'transit-corridor') {
    return {
      fixtureType: 'cutoff-led',
      lightingPurpose: road.transitEligible ? 'transit-stop-safety' : 'arterial-safety',
      heightMeters: 7.4,
      armLengthMeters: 1.8,
      fixtureLengthMeters: 0.82,
      coverageRadiusMeters: 28,
      colorTemperatureKelvin: 3200,
      targetIlluminanceLux: 22,
      estimatedIlluminanceLux: 26,
      emissiveIntensity: 0.92,
      shielded: true,
      decorative: false
    };
  }

  if (road.hierarchy === 'promenade') {
    return {
      fixtureType: 'decorative-pedestrian',
      lightingPurpose: 'promenade-comfort',
      heightMeters: 5.4,
      armLengthMeters: 1.1,
      fixtureLengthMeters: 0.66,
      coverageRadiusMeters: 22,
      colorTemperatureKelvin: 2700,
      targetIlluminanceLux: 18,
      estimatedIlluminanceLux: 23,
      emissiveIntensity: 0.9,
      shielded: true,
      decorative: true
    };
  }

  if (road.hierarchy === 'collector') {
    return {
      fixtureType: (segmentIndex + sideOffset) % 2 === 0 ? 'single-arm' : 'pedestrian-scale',
      lightingPurpose: 'arterial-safety',
      heightMeters: 6.6,
      armLengthMeters: 1.35,
      fixtureLengthMeters: 0.72,
      coverageRadiusMeters: 24,
      colorTemperatureKelvin: 3000,
      targetIlluminanceLux: 16,
      estimatedIlluminanceLux: 20,
      emissiveIntensity: 0.82,
      shielded: true,
      decorative: false
    };
  }

  return {
    fixtureType: 'pedestrian-scale',
    lightingPurpose: 'local-wayfinding',
    heightMeters: 5.8,
    armLengthMeters: 1.05,
    fixtureLengthMeters: 0.62,
    coverageRadiusMeters: 20,
    colorTemperatureKelvin: 3000,
    targetIlluminanceLux: 10,
    estimatedIlluminanceLux: 14,
    emissiveIntensity: 0.72,
    shielded: true,
    decorative: false
  };
}

function createCoverage(recipe: LightingRecipe, criticalPedestrianPath: boolean): StreetLight['coverage'] {
  return {
    radiusMeters: recipe.coverageRadiusMeters,
    overlapScore: criticalPedestrianPath ? 0.72 : 0.58,
    criticalPedestrianPath
  };
}

function createNightSafety(recipe: LightingRecipe, criticalPedestrianPath: boolean): StreetLight['nightSafety'] {
  return {
    targetIlluminanceLux: recipe.targetIlluminanceLux,
    estimatedIlluminanceLux: recipe.estimatedIlluminanceLux,
    darkPathRisk: recipe.estimatedIlluminanceLux >= recipe.targetIlluminanceLux ? 'low' : 'medium',
    emergencyRouteSupport: criticalPedestrianPath
  };
}

function createGlareControl(recipe: LightingRecipe): StreetLight['glareControl'] {
  return {
    shielded: recipe.shielded,
    glareRating: recipe.shielded && recipe.colorTemperatureKelvin <= 3200 ? 'low' : 'medium',
    cutoffAngleDegrees: recipe.shielded ? 72 : 90
  };
}

function shouldPlaceCitywideLight(road: RoadSegment, segmentIndex: number, sideOffset: number): boolean {
  if (isCriticalLightingRoad(road)) {
    return true;
  }

  if (road.hierarchy === 'local') {
    return (segmentIndex + sideOffset + road.id.length) % 2 === 0;
  }

  return (segmentIndex + sideOffset) % 2 === 0;
}

function isCriticalLightingRoad(road: RoadSegment): boolean {
  return road.transitEligible || road.hierarchy === 'arterial' || road.hierarchy === 'collector' || road.hierarchy === 'promenade';
}

function getMinimumLitSegmentLength(road: RoadSegment): number {
  return isCriticalLightingRoad(road) ? 18 : 24;
}

function getCurbZoneLightAlongRoadMeters(curbZone: CurbZone): number {
  const alongRatio = curbZone.side === 'left' ? 0.25 : 0.75;
  return roundMeters(curbZone.startMeters + curbZone.lengthMeters * alongRatio);
}

function getOffsetFromRoadEdgeMeters(road: RoadSegment, furnishingZoneMeters: number): number {
  return roundMeters(Math.max(0.7, Math.min(1.5, Math.max(road.sidewalks[0]?.furnishingZoneMeters ?? 0, furnishingZoneMeters) * 0.55)));
}

function getLightPosition(
  road: RoadSegment,
  side: 'left' | 'right',
  offsetFromRoadEdgeMeters: number,
  alongRoadMeters: number
): { x: number; z: number } {
  const sideSign = side === 'left' ? -1 : 1;
  const perpendicularOffset = road.widthMeters / 2 + offsetFromRoadEdgeMeters;
  const alongRoad = -road.length / 2 + alongRoadMeters;

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

function getRoadOffsetMeters(road: RoadSegment, intersection: IntersectionPlan): number {
  const coordinate = road.orientation === 'vertical' ? intersection.center.z - road.center.z : intersection.center.x - road.center.x;

  return roundMeters(coordinate + road.length / 2);
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
