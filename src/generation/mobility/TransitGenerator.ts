import type { CityId } from '../../city/data-contracts/cityContracts';
import type { RoadSegment, StreetFurniture, TransitRoute, TransitStop } from '../../types/city';

export interface TransitSource {
  readonly roads: readonly RoadSegment[];
  readonly streetFurniture: readonly StreetFurniture[];
}

export interface TransitPlanResult {
  readonly stops: TransitStop[];
  readonly routes: TransitRoute[];
}

const TRANSIT_BINDING_ID = 'binding:transit:bus-stop';

export class TransitGenerator {
  create(source: TransitSource): TransitPlanResult {
    const roadsById = new Map(source.roads.map((road) => [road.id, road]));
    const shelterStops = source.streetFurniture
      .filter((furniture) => furniture.furnitureType === 'bus-shelter' && furniture.transitStopId)
      .map((shelter): TransitStop | undefined => {
        const road = roadsById.get(shelter.roadId);

        if (!road || !road.transitEligible || !shelter.transitStopId) {
          return undefined;
        }

        const routeId = createRouteId(road.id);

        return {
          id: shelter.transitStopId,
          kind: 'transit-stop',
          ownerDomain: 'mobility',
          parentId: shelter.sidewalkId,
          name: `${road.corridorName} ${shelter.side === 'left' ? 'West/North' : 'East/South'} Stop`,
          lod: 'lod3',
          stopType: 'bus-stop',
          mode: 'bus',
          roadId: road.id,
          sidewalkId: shelter.sidewalkId,
          shelterFurnitureId: shelter.id,
          routeIds: [routeId],
          side: shelter.side,
          center: shelter.position,
          alongRoadMeters: shelter.alongRoadMeters,
          platformLengthMeters: 18,
          passengerDemandSeed: getStopDemandSeed(road, shelter.alongRoadMeters),
          serviceHeadwayMinutes: getHeadwayMinutes(road),
          accessible: shelter.clearPathWidthMeters >= 1.8,
          transferRoadIds: [],
          assetBindingId: TRANSIT_BINDING_ID,
          tags: {
            transitMode: 'bus',
            roadId: road.id,
            streetProfileId: road.streetProfileId,
            shelterFurnitureId: shelter.id
          }
        };
      })
      .filter((stop): stop is TransitStop => stop !== undefined);

    const stopsByRoadId = groupBy(shelterStops, (stop) => stop.roadId);
    const routes = [...stopsByRoadId.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([roadId, stops]): TransitRoute | undefined => {
        const road = roadsById.get(roadId);

        if (!road || stops.length < 2) {
          return undefined;
        }

        const orderedStops = [...stops].sort((a, b) => a.alongRoadMeters - b.alongRoadMeters || a.id.localeCompare(b.id));
        const busLaneIds = road.lanes.filter((lane) => lane.allowedModes.includes('bus')).map((lane) => lane.id);

        return {
          id: createRouteId(road.id),
          kind: 'transit-route',
          ownerDomain: 'mobility',
          name: `${road.corridorName} Bus`,
          lod: 'lod1',
          mode: 'bus',
          routeShortName: getRouteShortName(road),
          roadIds: [road.id],
          stopIds: orderedStops.map((stop) => stop.id),
          laneIds: busLaneIds,
          headwayMinutes: getHeadwayMinutes(road),
          serviceSpan: road.hierarchy === 'transit-corridor' ? 'all-day' : 'peak-only',
          passengerDemandSeed: orderedStops.reduce((sum, stop) => sum + stop.passengerDemandSeed, 0),
          colorHex: road.hierarchy === 'transit-corridor' ? '#2e6a9e' : '#d8b55b',
          tags: {
            transitMode: 'bus',
            roadId: road.id,
            streetProfileId: road.streetProfileId,
            stopCount: orderedStops.length
          }
        };
      })
      .filter((route): route is TransitRoute => route !== undefined);

    const routeIds = new Set(routes.map((route) => route.id));
    return {
      stops: shelterStops.filter((stop) => stop.routeIds.some((routeId) => routeIds.has(routeId))),
      routes
    };
  }
}

function createRouteId(roadId: CityId): CityId {
  return `transit-route-bus-${roadId}`;
}

function getRouteShortName(road: RoadSegment): string {
  const prefix = road.orientation === 'vertical' ? 'V' : 'H';
  return `${prefix}${road.id.split('-').at(-1) ?? '0'}`;
}

function getHeadwayMinutes(road: RoadSegment): number {
  return road.hierarchy === 'transit-corridor' ? 8 : 12;
}

function getStopDemandSeed(road: RoadSegment, alongRoadMeters: number): number {
  const base = road.hierarchy === 'transit-corridor' ? 90 : 62;
  return Math.round(base + (alongRoadMeters % 120) * 0.4);
}

function groupBy<T>(items: readonly T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
}
