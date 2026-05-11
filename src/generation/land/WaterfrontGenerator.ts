import type { CityId, Point2D, Polygon2D, WaterfrontEdgeKind } from '../../city/data-contracts/cityContracts';
import type { ParkPatch, RoadSegment, Waterway, WaterfrontEdge } from '../../types/city';
import { getPolygonBounds, rectanglePolygon } from '../../utils/geometry';

export interface WaterfrontGeneratorInput {
  readonly waterways: readonly Waterway[];
  readonly roads: readonly RoadSegment[];
  readonly parks: readonly ParkPatch[];
}

export class WaterfrontGenerator {
  create(input: WaterfrontGeneratorInput): WaterfrontEdge[] {
    return input.waterways.flatMap((waterway) => [
      ...this.createLinearEdges(waterway, input.roads, input.parks),
      ...this.createPierEdges(waterway, input.roads, input.parks)
    ]);
  }

  private createLinearEdges(
    waterway: Waterway,
    roads: readonly RoadSegment[],
    parks: readonly ParkPatch[]
  ): WaterfrontEdge[] {
    return waterway.edgeSegments.map((segment) => {
      const index = getSegmentIndex(segment.id);
      const waterfrontKind = getLinearWaterfrontKind(segment.side, index);
      const widthMeters = getWaterfrontWidth(waterfrontKind);
      const centerline = offsetCenterlineFromWater(segment.centerline, segment.side, widthMeters / 2);
      const center = midpoint(centerline);
      const boundary = horizontalBoundary(centerline, widthMeters);
      const connectedRoadIds = getNearbyRoadIds(roads, centerline[0].x, centerline[1].x);
      const connectedPublicRealmIds = getConnectedPublicRealmIds(parks, boundary, waterfrontKind);

      return {
        id: `waterfront-edge-${waterway.id}-${waterfrontKind}-${index}`,
        kind: 'waterfront-edge',
        ownerDomain: 'land',
        parentId: waterway.id,
        name: `${waterway.name ?? waterway.id} ${toTitle(waterfrontKind)} ${index + 1}`,
        lod: waterfrontKind === 'flood-wall' ? 'lod2' : 'lod3',
        waterfrontKind,
        waterwayId: waterway.id,
        waterwayEdgeSegmentId: segment.id,
        boundary,
        center,
        centerline,
        lengthMeters: segment.lengthMeters,
        widthMeters,
        elevationMeters: waterfrontKind === 'flood-wall' ? 2.4 : waterfrontKind === 'ecological-edge' ? 0.7 : 0.35,
        publicAccess: waterfrontKind !== 'flood-wall' && waterfrontKind !== 'ecological-edge',
        ...(waterfrontKind !== 'flood-wall' && waterfrontKind !== 'ecological-edge' ? { publicAccessPoint: center } : {}),
        connectedPublicRealmIds,
        connectedRoadIds,
        connectedWaterwayComponentIds: [segment.id],
        floodProtection: getFloodProtection(waterfrontKind),
        materialHint: getMaterialHint(waterfrontKind)
      };
    });
  }

  private createPierEdges(
    waterway: Waterway,
    roads: readonly RoadSegment[],
    parks: readonly ParkPatch[]
  ): WaterfrontEdge[] {
    return waterway.docks.map((dock, index) => {
      const widthMeters = Math.max(4, dock.widthMeters);
      const lengthMeters = dock.lengthMeters;
      const waterEdgeZ = waterway.center.z + waterway.width / 2;
      const center = {
        x: dock.center.x,
        z: waterEdgeZ - lengthMeters / 2
      };
      const centerline = [
        { x: dock.center.x, z: waterEdgeZ + 1.5 },
        { x: dock.center.x, z: waterEdgeZ - lengthMeters - 1.5 }
      ] as const;
      const boundary = verticalBoundary(centerline, widthMeters);
      const accessRoad = dock.accessRoadId ? roads.find((road) => road.id === dock.accessRoadId) : undefined;

      return {
        id: `waterfront-edge-${waterway.id}-pier-${index}`,
        kind: 'waterfront-edge',
        ownerDomain: 'land',
        parentId: waterway.id,
        name: `${waterway.name ?? waterway.id} Pier ${index + 1}`,
        lod: 'lod3',
        waterfrontKind: 'pier',
        waterwayId: waterway.id,
        dockId: dock.id,
        boundary,
        center,
        centerline,
        lengthMeters,
        widthMeters,
        elevationMeters: 0.55,
        publicAccess: dock.use !== 'service',
        publicAccessPoint: dock.center,
        connectedPublicRealmIds: getConnectedPublicRealmIds(parks, boundary, 'pier'),
        connectedRoadIds: accessRoad ? [accessRoad.id] : [],
        connectedWaterwayComponentIds: [dock.id, dock.edgeSegmentId],
        floodProtection: { kind: 'none' },
        materialHint: 'boardwalk'
      };
    });
  }
}

function getLinearWaterfrontKind(side: 'north' | 'south' | 'east' | 'west', index: number): WaterfrontEdgeKind {
  if (side === 'north') {
    return (['quay', 'promenade', 'public-access', 'promenade'] as const)[index % 4];
  }

  return index % 2 === 0 ? 'ecological-edge' : 'flood-wall';
}

function getWaterfrontWidth(kind: WaterfrontEdgeKind): number {
  switch (kind) {
    case 'ecological-edge':
      return 10;
    case 'flood-wall':
      return 4;
    case 'pier':
      return 5;
    case 'promenade':
      return 9;
    case 'public-access':
      return 11;
    case 'quay':
      return 7;
  }
}

function offsetCenterlineFromWater(
  centerline: readonly [Point2D, Point2D],
  side: 'north' | 'south' | 'east' | 'west',
  distance: number
): readonly [Point2D, Point2D] {
  const direction = side === 'north' || side === 'east' ? 1 : -1;

  if (side === 'east' || side === 'west') {
    return [
      { x: centerline[0].x + direction * distance, z: centerline[0].z },
      { x: centerline[1].x + direction * distance, z: centerline[1].z }
    ];
  }

  return [
    { x: centerline[0].x, z: centerline[0].z + direction * distance },
    { x: centerline[1].x, z: centerline[1].z + direction * distance }
  ];
}

function horizontalBoundary(centerline: readonly [Point2D, Point2D], widthMeters: number): Polygon2D {
  const center = midpoint(centerline);
  return rectanglePolygon(center, { x: Math.abs(centerline[1].x - centerline[0].x), z: widthMeters });
}

function verticalBoundary(centerline: readonly [Point2D, Point2D], widthMeters: number): Polygon2D {
  const center = midpoint(centerline);
  return rectanglePolygon(center, { x: widthMeters, z: Math.abs(centerline[1].z - centerline[0].z) });
}

function midpoint(centerline: readonly [Point2D, Point2D]): Point2D {
  return {
    x: (centerline[0].x + centerline[1].x) / 2,
    z: (centerline[0].z + centerline[1].z) / 2
  };
}

function getNearbyRoadIds(roads: readonly RoadSegment[], minX: number, maxX: number): CityId[] {
  return roads
    .filter((road) => road.orientation === 'vertical' && road.center.x >= minX - 8 && road.center.x <= maxX + 8)
    .map((road) => road.id);
}

function getConnectedPublicRealmIds(
  parks: readonly ParkPatch[],
  boundary: Polygon2D,
  waterfrontKind: WaterfrontEdgeKind
): CityId[] {
  const bounds = getPolygonBounds(boundary);

  if (waterfrontKind === 'flood-wall') {
    return [];
  }

  return parks
    .filter((park) => {
      const parkBounds = getPolygonBounds(park.boundary);
      return bounds.minX <= parkBounds.maxX && bounds.maxX >= parkBounds.minX && Math.abs(bounds.maxZ - parkBounds.minZ) < 90;
    })
    .map((park) => park.id);
}

function getFloodProtection(kind: WaterfrontEdgeKind): WaterfrontEdge['floodProtection'] {
  if (kind === 'flood-wall') {
    return { kind: 'flood-wall', crestElevationMeters: 3.2 };
  }

  if (kind === 'ecological-edge') {
    return { kind: 'berm', crestElevationMeters: 1.4 };
  }

  return { kind: 'none' };
}

function getMaterialHint(kind: WaterfrontEdgeKind): WaterfrontEdge['materialHint'] {
  switch (kind) {
    case 'ecological-edge':
      return 'ecological-planting';
    case 'flood-wall':
    case 'quay':
      return 'stone-quay';
    case 'pier':
      return 'boardwalk';
    case 'promenade':
    case 'public-access':
      return 'concrete-promenade';
  }
}

function getSegmentIndex(id: string): number {
  const match = id.match(/-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function toTitle(value: string): string {
  return value
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
