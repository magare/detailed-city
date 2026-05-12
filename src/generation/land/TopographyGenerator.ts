import type { CityId, LandformBuildability, RetainingCondition } from '../../city/data-contracts/cityContracts';
import type { BuildingPlan, CityBounds, RoadSegment, TopographyZonePlan } from '../../types/city';
import { getPolygonBounds, rectanglePolygon } from '../../utils/geometry';

export interface TopographyGenerationInput {
  readonly bounds: CityBounds;
  readonly roads: readonly RoadSegment[];
  readonly buildings: readonly BuildingPlan[];
}

export interface TopographyGenerationResult {
  readonly topographyZones: TopographyZonePlan[];
  readonly roads: RoadSegment[];
  readonly buildings: BuildingPlan[];
}

interface ElevationSample {
  readonly elevationMeters: number;
  readonly slopePercent: number;
  readonly aspectDegrees: number;
  readonly zoneIds: readonly CityId[];
  readonly buildability: LandformBuildability;
  readonly retainingCondition: RetainingCondition;
}

const BAND_COUNT = 5;
export class TopographyGenerator {
  create(input: TopographyGenerationInput): TopographyGenerationResult {
    const topographyZones = this.createZones(input);

    return {
      topographyZones,
      roads: input.roads.map((road) => this.withRoadGroundProfile(road, topographyZones)),
      buildings: input.buildings.map((building) => this.withBuildingGroundProfile(building, topographyZones))
    };
  }

  private createZones(input: TopographyGenerationInput): TopographyZonePlan[] {
    const zones: TopographyZonePlan[] = [];
    const bandDepth = input.bounds.span / BAND_COUNT;
    const minZ = -input.bounds.halfSpan;

    for (let index = 0; index < BAND_COUNT; index += 1) {
      const centerZ = minZ + bandDepth * index + bandDepth / 2;
      const center = { x: 0, z: centerZ };
      const sample = sampleTopography(center, input.bounds);
      const bandElevations = [
        sample.elevationMeters,
        sampleElevation({ x: 0, z: centerZ - bandDepth / 2 }, input.bounds),
        sampleElevation({ x: 0, z: centerZ + bandDepth / 2 }, input.bounds)
      ];
      const slopePercent = sampleSlopePercent(center, input.bounds);
      const buildability = getBuildability(slopePercent);
      const retainingCondition = getRetainingCondition(slopePercent);
      const zoneKind = index === 0 ? 'retaining-condition' : slopePercent > 8 ? 'slope-area' : 'elevation-band';
      const id = `topography-zone-${zoneKind}-${index}`;

      zones.push({
        id,
        kind: 'topography-zone',
        ownerDomain: 'land',
        lod: 'lod0',
        zoneKind,
        name: `Topography band ${index + 1}`,
        center,
        boundary: rectanglePolygon(center, { x: input.bounds.span, z: bandDepth }),
        minElevationMeters: roundMeters(Math.min(...bandElevations)),
        maxElevationMeters: roundMeters(Math.max(...bandElevations)),
        averageElevationMeters: sample.elevationMeters,
        slopePercent,
        aspectDegrees: sample.aspectDegrees,
        buildability,
        retainingCondition,
        gradeLimitPercent: buildability === 'restricted' ? 6 : buildability === 'limited' ? 9 : 12,
        relatedRoadIds: input.roads.filter((road) => pointInZone(road.center, centerZ, bandDepth)).map((road) => road.id),
        relatedBuildingIds: input.buildings
          .filter((building) => pointInZone(building.center, centerZ, bandDepth))
          .map((building) => building.id),
        tags: {
          bandIndex: index,
          unlocks: 'KAN-364-sidewalk-grades'
        }
      });
    }

    return zones;
  }

  private withRoadGroundProfile(road: RoadSegment, zones: readonly TopographyZonePlan[]): RoadSegment {
    const start = road.centerline[0];
    const end = road.centerline[road.centerline.length - 1];
    const startSample = sampleTopography(start, boundsFromZones(zones));
    const endSample = sampleTopography(end, boundsFromZones(zones));
    const centerSample = sampleTopography(road.center, boundsFromZones(zones));
    const elevationDelta = Math.abs(endSample.elevationMeters - startSample.elevationMeters);
    const gradeFromEndpoints = (elevationDelta / Math.max(1, road.length)) * 100;
    const maxGradePercent = roundPercent(Math.max(startSample.slopePercent, endSample.slopePercent, gradeFromEndpoints));
    const topographyZoneIds = unique([...startSample.zoneIds, ...endSample.zoneIds, ...centerSample.zoneIds]);

    return {
      ...road,
      groundProfile: {
        startElevationMeters: startSample.elevationMeters,
        endElevationMeters: endSample.elevationMeters,
        averageElevationMeters: roundMeters((startSample.elevationMeters + endSample.elevationMeters + centerSample.elevationMeters) / 3),
        minElevationMeters: Math.min(startSample.elevationMeters, endSample.elevationMeters, centerSample.elevationMeters),
        maxElevationMeters: Math.max(startSample.elevationMeters, endSample.elevationMeters, centerSample.elevationMeters),
        maxGradePercent,
        topographyZoneIds
      }
    };
  }

  private withBuildingGroundProfile(building: BuildingPlan, zones: readonly TopographyZonePlan[]): BuildingPlan {
    const bounds = boundsFromZones(zones);
    const sample = sampleTopography(building.center, bounds);
    const footprintBounds = getPolygonBounds(building.footprint);
    const cornerSamples = [
      { x: footprintBounds.minX, z: footprintBounds.minZ },
      { x: footprintBounds.maxX, z: footprintBounds.minZ },
      { x: footprintBounds.maxX, z: footprintBounds.maxZ },
      { x: footprintBounds.minX, z: footprintBounds.maxZ }
    ].map((point) => sampleTopography(point, bounds));
    const elevationSpread = Math.max(...cornerSamples.map((corner) => corner.elevationMeters)) - Math.min(...cornerSamples.map((corner) => corner.elevationMeters));
    const shortestSide = Math.max(1, Math.min(building.size.x, building.size.z));
    const maxFootprintGradePercent = roundPercent(Math.max(sample.slopePercent, (elevationSpread / shortestSide) * 100));
    const buildabilityFromLandform = maxFootprintGradePercent > 14 ? 'restricted' : getBuildability(maxFootprintGradePercent);

    return {
      ...building,
      groundElevationMeters: sample.elevationMeters,
      finishedFloorElevationMeters: roundMeters(sample.elevationMeters + (sample.retainingCondition === 'required' ? 0.75 : 0.35)),
      maxFootprintGradePercent,
      topographyZoneIds: unique(cornerSamples.flatMap((corner) => corner.zoneIds).concat(sample.zoneIds)),
      buildabilityFromLandform
    };
  }
}

function sampleTopography(point: { readonly x: number; readonly z: number }, bounds: CityBounds): ElevationSample {
  const slopePercent = sampleSlopePercent(point, bounds);
  const buildability = getBuildability(slopePercent);

  return {
    elevationMeters: sampleElevation(point, bounds),
    slopePercent,
    aspectDegrees: 18,
    zoneIds: [getZoneId(point, bounds)],
    buildability,
    retainingCondition: getRetainingCondition(slopePercent)
  };
}

function sampleElevation(point: { readonly x: number; readonly z: number }, bounds: CityBounds): number {
  const normalizedZ = (point.z + bounds.halfSpan) / bounds.span;
  const normalizedX = point.x / Math.max(1, bounds.halfSpan);
  const riverCut = Math.exp(-Math.pow((point.z - bounds.halfSpan * 0.38) / 95, 2)) * 2.9;
  const coastalPlain = Math.max(0, 0.28 - normalizedZ) * 2.4;
  const uplandRise = normalizedZ * 8.4;
  const eastRidge = Math.max(0, normalizedX) * 1.35;

  return roundMeters(0.8 + uplandRise + eastRidge - riverCut - coastalPlain);
}

function sampleSlopePercent(point: { readonly x: number; readonly z: number }, bounds: CityBounds): number {
  const step = 10;
  const elevationX = sampleElevation({ x: point.x + step, z: point.z }, bounds) - sampleElevation({ x: point.x - step, z: point.z }, bounds);
  const elevationZ = sampleElevation({ x: point.x, z: point.z + step }, bounds) - sampleElevation({ x: point.x, z: point.z - step }, bounds);

  return roundPercent((Math.sqrt(elevationX * elevationX + elevationZ * elevationZ) / (step * 2)) * 100);
}

function getBuildability(slopePercent: number): LandformBuildability {
  if (slopePercent > 14) {
    return 'restricted';
  }
  if (slopePercent > 9) {
    return 'limited';
  }
  if (slopePercent > 5) {
    return 'moderate';
  }
  return 'high';
}

function getRetainingCondition(slopePercent: number): RetainingCondition {
  if (slopePercent > 10) {
    return 'required';
  }
  if (slopePercent > 6) {
    return 'recommended';
  }
  return 'none';
}

function getZoneId(point: { readonly z: number }, bounds: CityBounds): CityId {
  const index = Math.max(0, Math.min(BAND_COUNT - 1, Math.floor(((point.z + bounds.halfSpan) / bounds.span) * BAND_COUNT)));
  const centerZ = -bounds.halfSpan + (inputBandDepth(bounds) * index + inputBandDepth(bounds) / 2);
  const slopePercent = sampleSlopePercent({ x: 0, z: centerZ }, bounds);
  const zoneKind = index === 0 ? 'retaining-condition' : slopePercent > 8 ? 'slope-area' : 'elevation-band';

  return `topography-zone-${zoneKind}-${index}`;
}

function inputBandDepth(bounds: CityBounds): number {
  return bounds.span / BAND_COUNT;
}

function pointInZone(point: { readonly z: number }, centerZ: number, bandDepth: number): boolean {
  return point.z >= centerZ - bandDepth / 2 && point.z < centerZ + bandDepth / 2;
}

function boundsFromZones(zones: readonly TopographyZonePlan[]): CityBounds {
  const firstBoundary = zones[0]?.boundary ?? rectanglePolygon({ x: 0, z: 0 }, { x: 1, z: 1 });
  const allPoints = zones.flatMap((zone) => zone.boundary);
  const bounds = getPolygonBounds(allPoints.length > 0 ? allPoints : firstBoundary);
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);

  return {
    spacing: span / 12,
    span,
    halfSpan: span / 2
  };
}

function unique(values: readonly CityId[]): readonly CityId[] {
  return [...new Set(values)].sort();
}

function roundMeters(value: number): number {
  return Number(value.toFixed(2));
}

function roundPercent(value: number): number {
  return Number(value.toFixed(2));
}
