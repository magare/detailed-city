import type {
  CityId,
  Point2D,
  WaterfrontOpenSpaceKind,
  WaterfrontOpenSpaceSurface
} from '../../city/data-contracts/cityContracts';
import type { ParkPatch, StreetFurniture, TreePlanting, WaterfrontEdge, WaterfrontOpenSpace } from '../../types/city';
import { getPolygonBounds } from '../../utils/geometry';

export interface WaterfrontOpenSpaceGeneratorInput {
  readonly waterfrontEdges: readonly WaterfrontEdge[];
  readonly parks: readonly ParkPatch[];
  readonly streetFurniture: readonly StreetFurniture[];
  readonly trees: readonly TreePlanting[];
}

export class WaterfrontOpenSpaceGenerator {
  create(input: WaterfrontOpenSpaceGeneratorInput): WaterfrontOpenSpace[] {
    return input.waterfrontEdges
      .filter((edge) => edge.publicAccess || edge.waterfrontKind === 'ecological-edge')
      .map((edge, index) => this.createOpenSpace(edge, index, input));
  }

  private createOpenSpace(
    edge: WaterfrontEdge,
    index: number,
    input: WaterfrontOpenSpaceGeneratorInput
  ): WaterfrontOpenSpace {
    const openSpaceKind = getOpenSpaceKind(edge, index);
    const surface = getOpenSpaceSurface(edge, openSpaceKind);
    const connectedParkIds = uniqueIds([...edge.connectedPublicRealmIds, ...getNearbyParkIds(edge, input.parks)]);
    const nearbyFurnitureIds = getNearbyFurnitureIds(edge, input.streetFurniture);
    const shadeTreeIds = getNearbyShadeTreeIds(edge, input.trees);
    const seatingCapacity = getSeatingCapacity(edge, openSpaceKind, nearbyFurnitureIds.length);
    const railingLengthMeters = getRailingLength(edge, openSpaceKind);
    const eventCapacityPeople = getEventCapacity(edge, openSpaceKind);

    return {
      id: `waterfront-open-space-${edge.waterwayId}-${openSpaceKind}-${index}`,
      kind: 'waterfront-open-space',
      ownerDomain: 'public-realm',
      parentId: edge.id,
      name: `${edge.name ?? edge.id} Open Space`,
      lod: openSpaceKind === 'ecological-edge' ? 'lod2' : 'lod3',
      openSpaceKind,
      waterfrontEdgeId: edge.id,
      waterwayId: edge.waterwayId,
      boundary: edge.boundary,
      center: edge.center,
      lengthMeters: edge.lengthMeters,
      widthMeters: edge.widthMeters,
      elevationMeters: edge.elevationMeters + 0.08,
      surface,
      accessible: edge.publicAccess,
      publicAccess: edge.publicAccess,
      connectedRoadIds: edge.connectedRoadIds,
      connectedParkIds,
      seatingCapacity,
      railingLengthMeters,
      shadeTreeIds,
      nearbyFurnitureIds,
      ...(openSpaceKind === 'water-access' || openSpaceKind === 'pier-landing'
        ? { waterAccessPoint: edge.publicAccessPoint ?? edge.center }
        : {}),
      comfort: {
        shadeCoverageRatio: getShadeCoverage(edge, shadeTreeIds.length, openSpaceKind),
        ecologyScore: openSpaceKind === 'ecological-edge' ? 0.92 : surface === 'ecological-planting' ? 0.68 : 0.34,
        overlook: openSpaceKind === 'overlook',
        eventCapacityPeople
      },
      assetBindingId: 'binding:waterfront:open-space',
      tags: {
        waterfrontEdgeId: edge.id,
        waterfrontKind: edge.waterfrontKind,
        surface
      }
    };
  }
}

function getOpenSpaceKind(edge: WaterfrontEdge, index: number): WaterfrontOpenSpaceKind {
  switch (edge.waterfrontKind) {
    case 'ecological-edge':
      return 'ecological-edge';
    case 'pier':
      return 'pier-landing';
    case 'public-access':
      return 'water-access';
    case 'quay':
      return 'promenade';
    case 'promenade':
      return index % 4 === 1 ? 'overlook' : 'boardwalk';
    case 'flood-wall':
      return 'promenade';
  }
}

function getOpenSpaceSurface(edge: WaterfrontEdge, kind: WaterfrontOpenSpaceKind): WaterfrontOpenSpaceSurface {
  if (kind === 'boardwalk' || kind === 'pier-landing') {
    return 'timber-boardwalk';
  }

  if (kind === 'ecological-edge') {
    return 'ecological-planting';
  }

  if (edge.materialHint === 'stone-quay') {
    return 'stone-quay';
  }

  return 'concrete-promenade';
}

function getNearbyParkIds(edge: WaterfrontEdge, parks: readonly ParkPatch[]): CityId[] {
  const edgeBounds = expandBounds(getPolygonBounds(edge.boundary), 24);

  return parks
    .filter((park) => intersects(edgeBounds, getPolygonBounds(park.boundary)))
    .map((park) => park.id);
}

function getNearbyFurnitureIds(edge: WaterfrontEdge, furniture: readonly StreetFurniture[]): CityId[] {
  const bounds = expandBounds(getPolygonBounds(edge.boundary), 18);

  return furniture
    .filter((item) => pointInBounds(item.position, bounds))
    .slice(0, 8)
    .map((item) => item.id);
}

function getNearbyShadeTreeIds(edge: WaterfrontEdge, trees: readonly TreePlanting[]): CityId[] {
  const bounds = expandBounds(getPolygonBounds(edge.boundary), 26);

  return trees
    .filter((tree) => pointInBounds(tree.center, bounds))
    .slice(0, 10)
    .map((tree) => tree.id);
}

function getSeatingCapacity(edge: WaterfrontEdge, kind: WaterfrontOpenSpaceKind, nearbyFurnitureCount: number): number {
  if (kind === 'ecological-edge') {
    return 0;
  }

  const baseCapacity = kind === 'pier-landing' ? 8 : kind === 'overlook' ? 18 : 14;
  return baseCapacity + Math.min(nearbyFurnitureCount, 6) * 2 + Math.floor(edge.lengthMeters / 55) * 2;
}

function getRailingLength(edge: WaterfrontEdge, kind: WaterfrontOpenSpaceKind): number {
  if (kind === 'ecological-edge') {
    return Math.round(edge.lengthMeters * 0.35);
  }

  if (kind === 'water-access') {
    return Math.round(edge.lengthMeters * 0.45);
  }

  return Math.round(edge.lengthMeters * 0.72);
}

function getEventCapacity(edge: WaterfrontEdge, kind: WaterfrontOpenSpaceKind): number {
  if (kind === 'ecological-edge') {
    return 0;
  }

  const usableArea = edge.lengthMeters * edge.widthMeters;
  const density = kind === 'pier-landing' ? 0.18 : kind === 'overlook' ? 0.28 : 0.22;
  return Math.max(8, Math.floor(usableArea * density));
}

function getShadeCoverage(edge: WaterfrontEdge, shadeTreeCount: number, kind: WaterfrontOpenSpaceKind): number {
  if (kind === 'ecological-edge') {
    return 0.72;
  }

  return Math.min(0.85, Number((shadeTreeCount * 0.08 + edge.connectedPublicRealmIds.length * 0.12).toFixed(2)));
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)].sort();
}

function expandBounds(
  bounds: ReturnType<typeof getPolygonBounds>,
  paddingMeters: number
): ReturnType<typeof getPolygonBounds> {
  return {
    minX: bounds.minX - paddingMeters,
    maxX: bounds.maxX + paddingMeters,
    minZ: bounds.minZ - paddingMeters,
    maxZ: bounds.maxZ + paddingMeters
  };
}

function intersects(a: ReturnType<typeof getPolygonBounds>, b: ReturnType<typeof getPolygonBounds>): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

function pointInBounds(point: Point2D, bounds: ReturnType<typeof getPolygonBounds>): boolean {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}
