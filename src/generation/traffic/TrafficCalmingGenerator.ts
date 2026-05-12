import type {
  CurbSide,
  Point2D,
  TrafficCalmingDeviceKind
} from '../../city/data-contracts/cityContracts';
import type { CrossingPlan, CurbZone, DetailedStreetSlice, IntersectionPlan, RoadSegment, TrafficCalmingDevice } from '../../types/city';

export interface TrafficCalmingSource {
  readonly slices: readonly DetailedStreetSlice[];
  readonly roads: readonly RoadSegment[];
  readonly intersections: readonly IntersectionPlan[];
  readonly crossings: readonly CrossingPlan[];
  readonly curbZones: readonly CurbZone[];
}

const BINDING_ID = 'binding:road:traffic-calming';
const MIN_EMERGENCY_CLEARANCE_METERS = 3.6;
const MIN_ACCESSIBLE_CLEAR_PATH_METERS = 2.1;

export class TrafficCalmingGenerator {
  create(source: TrafficCalmingSource): TrafficCalmingDevice[] {
    return source.slices.flatMap((slice) => {
      const road = source.roads.find((candidate) => candidate.id === slice.corridorRoadId);

      if (!road) {
        return [];
      }

      const intersections = source.intersections
        .filter((intersection) => slice.intersectionIds.includes(intersection.id))
        .sort((a, b) => getPositionOnRoadMeters(road, a.center) - getPositionOnRoadMeters(road, b.center));
      const crossings = source.crossings.filter((crossing) => crossing.roadId === road.id);
      const curbZones = source.curbZones.filter((curbZone) => curbZone.sliceId === slice.id && curbZone.roadId === road.id);

      return createTrafficCalmingDevices(slice, road, intersections, crossings, curbZones);
    });
  }
}

function createTrafficCalmingDevices(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  intersections: readonly IntersectionPlan[],
  crossings: readonly CrossingPlan[],
  curbZones: readonly CurbZone[]
): TrafficCalmingDevice[] {
  const devices: TrafficCalmingDevice[] = [];
  const busZones = curbZones.filter((zone) => zone.curbUse === 'bus-stop').slice(0, 2);
  const raisedCrossings = (
    crossings.some((crossing) => crossing.raisedCrossing)
      ? crossings.filter((crossing) => crossing.raisedCrossing)
      : crossings.slice(Math.max(0, Math.floor(crossings.length / 2) - 1), Math.max(0, Math.floor(crossings.length / 2) + 1))
  ).slice(0, 2);
  const calmingIntersections = intersections.filter((_, index) => index % 4 === 2).slice(0, 2);

  for (const [index, intersection] of calmingIntersections.entries()) {
    const position = getPositionOnRoadMeters(road, intersection.center);
    devices.push(
      createDevice({
        slice,
        road,
        kind: 'curb-extension',
        index,
        positionOnRoadMeters: position,
        side: 'both',
        intersectionId: intersection.id,
        crossingId: crossings.find((crossing) => crossing.intersectionId === intersection.id)?.id,
        curbZoneIds: curbZones.filter((zone) => zone.curbUse === 'no-stopping' && isNear(zone, position, 10)).map((zone) => zone.id)
      })
    );
  }

  for (const [index, curbZone] of busZones.entries()) {
    devices.push(
      createDevice({
        slice,
        road,
        kind: 'bus-bulb',
        index,
        positionOnRoadMeters: (curbZone.startMeters + curbZone.endMeters) / 2,
        side: curbZone.side,
        curbZoneIds: [curbZone.id]
      })
    );
  }

  devices.push(
    createDevice({ slice, road, kind: 'chicane', index: 0, positionOnRoadMeters: road.length * 0.38, side: 'left' }),
    createDevice({ slice, road, kind: 'pinchpoint', index: 0, positionOnRoadMeters: road.length * 0.5, side: 'both' }),
    createDevice({ slice, road, kind: 'speed-hump', index: 0, positionOnRoadMeters: road.length * 0.31, side: 'both' }),
    createDevice({ slice, road, kind: 'speed-cushion', index: 0, positionOnRoadMeters: road.length * 0.69, side: 'both' }),
    createDevice({ slice, road, kind: 'neighborhood-gateway', index: 0, positionOnRoadMeters: road.length * 0.08, side: 'both' }),
    createDevice({ slice, road, kind: 'neighborhood-gateway', index: 1, positionOnRoadMeters: road.length * 0.92, side: 'both' })
  );

  for (const [index, crossing] of raisedCrossings.entries()) {
    devices.push(
      createDevice({
        slice,
        road,
        kind: 'speed-table',
        index,
        positionOnRoadMeters: getPositionOnRoadMeters(road, crossing.center),
        side: 'both',
        intersectionId: crossing.intersectionId,
        crossingId: crossing.id
      })
    );
  }

  return devices.sort((a, b) => a.positionOnRoadMeters - b.positionOnRoadMeters || a.id.localeCompare(b.id));
}

function createDevice(input: {
  readonly slice: DetailedStreetSlice;
  readonly road: RoadSegment;
  readonly kind: TrafficCalmingDeviceKind;
  readonly index: number;
  readonly positionOnRoadMeters: number;
  readonly side: CurbSide | 'both';
  readonly intersectionId?: string;
  readonly crossingId?: string;
  readonly curbZoneIds?: readonly string[];
}): TrafficCalmingDevice {
  const profile = getDeviceProfile(input.kind, input.road);
  const center = getDeviceCenter(input.road, input.positionOnRoadMeters, input.side, profile.acrossMeters);

  return {
    id: `traffic-calming-${input.road.id}-${input.kind}-${input.index}`,
    kind: 'traffic-calming-device',
    ownerDomain: 'mobility',
    parentId: input.road.id,
    lod: 'lod3',
    sliceId: input.slice.id,
    roadId: input.road.id,
    intersectionId: input.intersectionId,
    crossingId: input.crossingId,
    curbZoneIds: input.curbZoneIds ?? [],
    deviceKind: input.kind,
    center,
    orientation: input.road.orientation,
    positionOnRoadMeters: roundMeters(input.positionOnRoadMeters),
    side: input.side,
    size: getDeviceSize(input.road, profile.alongMeters, profile.acrossMeters),
    heightMeters: profile.heightMeters,
    targetSpeedKph: profile.targetSpeedKph,
    designSpeedKph: input.road.designSpeedKph,
    emergencyVehicleClearanceMeters: MIN_EMERGENCY_CLEARANCE_METERS,
    accessibleClearPathMeters: MIN_ACCESSIBLE_CLEAR_PATH_METERS,
    crossingSafetyBenefit: profile.crossingSafetyBenefit,
    assetBindingId: BINDING_ID,
    tags: {
      detailedStreetSliceId: input.slice.id,
      roadId: input.road.id,
      deviceKind: input.kind,
      targetSpeedKph: profile.targetSpeedKph
    }
  };
}

function getDeviceProfile(kind: TrafficCalmingDeviceKind, road: RoadSegment) {
  switch (kind) {
    case 'curb-extension':
      return { alongMeters: 8, acrossMeters: 3.4, heightMeters: 0.16, targetSpeedKph: 25, crossingSafetyBenefit: 'shorter-crossing' as const };
    case 'bus-bulb':
      return { alongMeters: 18, acrossMeters: 3.2, heightMeters: 0.14, targetSpeedKph: 25, crossingSafetyBenefit: 'transit-access' as const };
    case 'chicane':
      return { alongMeters: 13, acrossMeters: 2.8, heightMeters: 0.18, targetSpeedKph: 20, crossingSafetyBenefit: 'speed-reduction' as const };
    case 'pinchpoint':
      return { alongMeters: 9, acrossMeters: road.widthMeters * 0.46, heightMeters: 0.12, targetSpeedKph: 20, crossingSafetyBenefit: 'shorter-crossing' as const };
    case 'speed-hump':
      return { alongMeters: 4.2, acrossMeters: road.widthMeters * 0.68, heightMeters: 0.11, targetSpeedKph: 18, crossingSafetyBenefit: 'speed-reduction' as const };
    case 'speed-table':
      return { alongMeters: 6.4, acrossMeters: road.widthMeters, heightMeters: 0.14, targetSpeedKph: 15, crossingSafetyBenefit: 'shorter-crossing' as const };
    case 'speed-cushion':
      return { alongMeters: 3.4, acrossMeters: road.widthMeters * 0.44, heightMeters: 0.1, targetSpeedKph: 22, crossingSafetyBenefit: 'speed-reduction' as const };
    case 'neighborhood-gateway':
      return { alongMeters: 9.5, acrossMeters: road.widthMeters * 0.76, heightMeters: 0.2, targetSpeedKph: 25, crossingSafetyBenefit: 'gateway-slow-zone' as const };
  }
}

function getDeviceCenter(
  road: RoadSegment,
  positionOnRoadMeters: number,
  side: CurbSide | 'both',
  acrossMeters: number
): Point2D {
  const alongOffset = -road.length / 2 + positionOnRoadMeters;
  const sideOffset = side === 'both' ? 0 : (side === 'left' ? -1 : 1) * (road.widthMeters / 2 - acrossMeters / 2);

  if (road.orientation === 'vertical') {
    return {
      x: roundMeters(road.center.x + sideOffset),
      z: roundMeters(road.center.z + alongOffset)
    };
  }

  return {
    x: roundMeters(road.center.x + alongOffset),
    z: roundMeters(road.center.z + sideOffset)
  };
}

function getDeviceSize(road: RoadSegment, alongMeters: number, acrossMeters: number): { x: number; z: number } {
  return road.orientation === 'vertical'
    ? { x: roundMeters(acrossMeters), z: roundMeters(alongMeters) }
    : { x: roundMeters(alongMeters), z: roundMeters(acrossMeters) };
}

function getPositionOnRoadMeters(road: RoadSegment, point: Point2D): number {
  const localOffset = road.orientation === 'vertical' ? point.z - road.center.z : point.x - road.center.x;
  return roundMeters(localOffset + road.length / 2);
}

function isNear(curbZone: CurbZone, positionOnRoadMeters: number, toleranceMeters: number): boolean {
  return curbZone.startMeters <= positionOnRoadMeters + toleranceMeters && curbZone.endMeters >= positionOnRoadMeters - toleranceMeters;
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
