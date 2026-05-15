import type { CityId, GreenStormwaterFeatureKind, GreenStormwaterSurface, Point2D, Polygon2D } from '../../city/data-contracts/cityContracts';
import type { GreenStormwaterFeature, RoadSegment, TreePlanting, UtilityEdge, UtilityNode } from '../../types/city';

export interface GreenStormwaterSource {
  readonly roads: readonly RoadSegment[];
  readonly utilityNodes: readonly UtilityNode[];
  readonly utilityEdges: readonly UtilityEdge[];
  readonly trees: readonly TreePlanting[];
}

interface FeatureRecipe {
  readonly kind: GreenStormwaterFeatureKind;
  readonly side: 'left' | 'right';
  readonly slotRatio: number;
}

const OWNER_ENTITY_ID = 'public-works-green-infrastructure';
const ASSET_BINDING_ID = 'binding:green-stormwater:feature';
const FEATURE_SEQUENCE = [
  'rain-garden',
  'bioswale',
  'flow-through-planter',
  'pervious-strip',
  'permeable-pavement',
  'curb-cut',
  'tree-trench'
] as const satisfies readonly GreenStormwaterFeatureKind[];

export class GreenStormwaterGenerator {
  create(source: GreenStormwaterSource): GreenStormwaterFeature[] {
    const utilityNodeIds = new Set(source.utilityNodes.map((node) => node.id));
    const utilityEdgeIds = new Set(source.utilityEdges.map((edge) => edge.id));
    const treesByRoadId = createTreesByRoadId(source.trees);
    const featureRoads = source.roads.filter((road) => road.stormwaterDrainage && hasPublicRealmStormwaterOpportunity(road));

    return featureRoads.flatMap((road, roadIndex) =>
      createRoadRecipes(road, roadIndex).map((recipe, recipeIndex) =>
        createFeature(
          road,
          recipe,
          recipeIndex,
          utilityNodeIds,
          utilityEdgeIds,
          treesByRoadId.get(road.id) ?? []
        )
      )
    );
  }
}

function createRoadRecipes(road: RoadSegment, roadIndex: number): readonly FeatureRecipe[] {
  const primaryKind = FEATURE_SEQUENCE[roadIndex % FEATURE_SEQUENCE.length];
  const secondaryKind = FEATURE_SEQUENCE[(roadIndex + 3) % FEATURE_SEQUENCE.length];
  const recipes: FeatureRecipe[] = [
    {
      kind: primaryKind,
      side: roadIndex % 2 === 0 ? 'left' : 'right',
      slotRatio: 0.32
    }
  ];

  if (road.hierarchy === 'arterial' || road.hierarchy === 'collector' || road.hierarchy === 'promenade' || road.id === 'road-v-6') {
    recipes.push({
      kind: secondaryKind,
      side: roadIndex % 2 === 0 ? 'right' : 'left',
      slotRatio: 0.68
    });
  }

  return recipes;
}

function createFeature(
  road: RoadSegment,
  recipe: FeatureRecipe,
  index: number,
  utilityNodeIds: ReadonlySet<string>,
  utilityEdgeIds: ReadonlySet<string>,
  roadTrees: readonly TreePlanting[]
): GreenStormwaterFeature {
  const sidewalk = road.sidewalks.find((candidate) => candidate.id.endsWith(recipe.side)) ?? road.sidewalks[0];
  const drainage = road.stormwaterDrainage;
  const center = getFeatureCenter(road, recipe.side, recipe.slotRatio, sidewalk?.furnishingZoneMeters ?? 1.2);
  const size = getFeatureSize(road, recipe.kind);
  const utilityNodes = drainage
    ? uniqueIds([
      ...drainage.inletNodeIds,
      drainage.lowPointNodeId,
      drainage.detentionNodeId,
      ...drainage.perviousAreaNodeIds
    ]).filter((id) => utilityNodeIds.has(id))
    : [];
  const runoffEdges = drainage?.runoffPathEdgeIds.filter((id) => utilityEdgeIds.has(id)) ?? [];
  const linkedTreeIds = recipe.kind === 'tree-trench'
    ? roadTrees
      .filter((tree) => tree.sidewalkId === sidewalk?.id)
      .slice(0, 3)
      .map((tree) => tree.id)
    : [];

  return {
    id: `green-stormwater-${recipe.kind}-${road.id}-${index}`,
    kind: 'green-stormwater-feature',
    ownerDomain: 'public-realm',
    parentId: road.id,
    lod: 'lod3',
    featureKind: recipe.kind,
    roadId: road.id,
    sidewalkId: sidewalk?.id ?? `${road.id}-sidewalk-${recipe.side}`,
    utilityNodeIds: utilityNodes,
    runoffPathEdgeIds: runoffEdges,
    treeIds: linkedTreeIds,
    maintenanceOwnerEntityId: OWNER_ENTITY_ID,
    center,
    size,
    boundary: createRectangleBoundary(center, size),
    surface: getFeatureSurface(recipe.kind),
    storageVolumeCubicMeters: getStorageVolume(recipe.kind, size),
    treatmentVolumeCubicMeters: getTreatmentVolume(recipe.kind, size),
    designStormMmPerHour: drainage?.designStormMmPerHour ?? 82,
    clearPathMeters: sidewalk?.accessibleClearPathMeters ?? 2.1,
    curbCutCount: recipe.kind === 'curb-cut' ? 2 : recipe.kind === 'rain-garden' || recipe.kind === 'bioswale' ? 1 : 0,
    runoffCapturePercent: getRunoffCapturePercent(recipe.kind),
    maintenanceAccessMeters: recipe.kind === 'permeable-pavement' ? 2.4 : 2,
    assetBindingId: ASSET_BINDING_ID,
    tags: {
      corridorRoadId: road.id,
      drainageCatchmentId: drainage?.drainageCatchmentId ?? 'stormwater-catchment-unknown',
      stormwaterFeatureKind: recipe.kind
    }
  };
}

function hasPublicRealmStormwaterOpportunity(road: RoadSegment): boolean {
  if (!road.stormwaterDrainage || road.sidewalks.length === 0) {
    return false;
  }
  if (road.id === 'road-v-6' || road.id === 'road-h-6') {
    return true;
  }
  return road.hierarchy !== 'local' && road.sidewalks.some((sidewalk) => sidewalk.furnishingZoneMeters >= 0.9);
}

function getFeatureCenter(
  road: RoadSegment,
  side: 'left' | 'right',
  slotRatio: number,
  furnishingZoneMeters: number
): Point2D {
  const startInset = Math.min(36, road.length * 0.14);
  const usableLength = Math.max(1, road.length - startInset * 2);
  const alongRoad = -road.length / 2 + startInset + usableLength * slotRatio;
  const sideSign = side === 'left' ? -1 : 1;
  const offset = road.widthMeters / 2 + Math.max(0.45, Math.min(1.35, furnishingZoneMeters * 0.58));

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

function getFeatureSize(road: RoadSegment, kind: GreenStormwaterFeatureKind): { readonly x: number; readonly z: number } {
  const long = kind === 'permeable-pavement' ? 8.8 : kind === 'pervious-strip' || kind === 'bioswale' ? 7.2 : 4.6;
  const short = kind === 'curb-cut' ? 0.9 : kind === 'flow-through-planter' ? 1.3 : 1.7;

  return road.orientation === 'vertical'
    ? { x: roundMeters(short), z: roundMeters(long) }
    : { x: roundMeters(long), z: roundMeters(short) };
}

function createRectangleBoundary(center: Point2D, size: { readonly x: number; readonly z: number }): Polygon2D {
  const halfX = size.x / 2;
  const halfZ = size.z / 2;

  return [
    { x: roundMeters(center.x - halfX), z: roundMeters(center.z - halfZ) },
    { x: roundMeters(center.x + halfX), z: roundMeters(center.z - halfZ) },
    { x: roundMeters(center.x + halfX), z: roundMeters(center.z + halfZ) },
    { x: roundMeters(center.x - halfX), z: roundMeters(center.z + halfZ) }
  ];
}

function getFeatureSurface(kind: GreenStormwaterFeatureKind): GreenStormwaterSurface {
  switch (kind) {
    case 'curb-cut':
      return 'curb-cut-concrete';
    case 'flow-through-planter':
    case 'rain-garden':
      return 'planting-bed';
    case 'permeable-pavement':
      return 'permeable-paver';
    case 'bioswale':
    case 'tree-trench':
      return 'engineered-soil';
    case 'pervious-strip':
      return 'stone-check-dam';
  }
}

function getStorageVolume(kind: GreenStormwaterFeatureKind, size: { readonly x: number; readonly z: number }): number {
  const area = size.x * size.z;
  const depth = kind === 'permeable-pavement' ? 0.18 : kind === 'curb-cut' ? 0.08 : kind === 'tree-trench' ? 0.42 : 0.34;
  return roundMeters(area * depth);
}

function getTreatmentVolume(kind: GreenStormwaterFeatureKind, size: { readonly x: number; readonly z: number }): number {
  const treatmentFactor = kind === 'curb-cut' ? 0.35 : kind === 'permeable-pavement' ? 0.48 : 0.68;
  return roundMeters(getStorageVolume(kind, size) * treatmentFactor);
}

function getRunoffCapturePercent(kind: GreenStormwaterFeatureKind): number {
  switch (kind) {
    case 'curb-cut':
      return 18;
    case 'permeable-pavement':
      return 34;
    case 'pervious-strip':
      return 42;
    case 'flow-through-planter':
      return 48;
    case 'tree-trench':
      return 54;
    case 'rain-garden':
      return 58;
    case 'bioswale':
      return 64;
  }
}

function createTreesByRoadId(trees: readonly TreePlanting[]): ReadonlyMap<CityId, readonly TreePlanting[]> {
  const treesByRoadId = new Map<CityId, TreePlanting[]>();

  for (const tree of trees) {
    if (!tree.roadId) {
      continue;
    }
    treesByRoadId.set(tree.roadId, [...(treesByRoadId.get(tree.roadId) ?? []), tree]);
  }

  return treesByRoadId;
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)];
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
