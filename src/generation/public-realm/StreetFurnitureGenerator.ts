import type {
  CityId,
  StreetFurniturePlacementZone,
  StreetFurnitureType
} from '../../city/data-contracts/cityContracts';
import type { CurbZone, DetailedStreetSlice, RoadSegment, StreetFurniture } from '../../types/city';

export interface StreetFurnitureSource {
  readonly slices: readonly DetailedStreetSlice[];
  readonly roads: readonly RoadSegment[];
  readonly curbZones: readonly CurbZone[];
}

interface StreetFurnitureRecipe {
  readonly furnitureType: StreetFurnitureType;
  readonly slotRatio: number;
  readonly offsetFromRoadEdgeMeters: number;
  readonly dimensions: StreetFurniture['dimensions'];
  readonly clearanceEnvelope: StreetFurniture['clearanceEnvelope'];
  readonly assetBindingId: CityId;
  readonly placementZone: StreetFurniturePlacementZone;
  readonly signRole?: NonNullable<StreetFurniture['signFace']>['signRole'];
}

const BASE_RECIPES = {
  bench: createRecipe('bench', 0.38, 1.18, 0.62, 2.1, 0.92, 'binding:street-furniture:bench'),
  bin: createRecipe('bin', 0.22, 0.78, 0.55, 0.55, 1.05, 'binding:street-furniture:bin'),
  'bike-rack': createRecipe('bike-rack', 0.62, 0.9, 1.05, 1.8, 0.9, 'binding:street-furniture:bike-rack'),
  bollard: createRecipe('bollard', 0.08, 0.42, 0.22, 0.8, 0.95, 'binding:street-furniture:bollard'),
  kiosk: createRecipe('kiosk', 0.82, 0.8, 1.3, 1.8, 2.6, 'binding:street-furniture:kiosk'),
  'bus-shelter': createRecipe('bus-shelter', 0.52, 0.8, 1.4, 4.8, 2.45, 'binding:street-furniture:bus-shelter'),
  'regulatory-sign': createRecipe(
    'regulatory-sign',
    0.18,
    0.62,
    0.22,
    0.55,
    2.4,
    'binding:street-furniture:regulatory-sign',
    'regulatory'
  ),
  'street-name-sign': createRecipe(
    'street-name-sign',
    0.9,
    0.7,
    0.26,
    0.72,
    2.65,
    'binding:street-furniture:street-name-sign',
    'street-name'
  ),
  'wayfinding-sign': createRecipe(
    'wayfinding-sign',
    0.74,
    0.72,
    0.34,
    0.82,
    2.35,
    'binding:street-furniture:wayfinding-sign',
    'wayfinding'
  )
} as const satisfies Readonly<Record<StreetFurnitureType, StreetFurnitureRecipe>>;

export class StreetFurnitureGenerator {
  create(source: StreetFurnitureSource): StreetFurniture[] {
    return source.slices.flatMap((slice) => {
      const road = source.roads.find((candidate) => candidate.id === slice.corridorRoadId);

      if (!road) {
        return [];
      }

      return source.curbZones
        .filter((curbZone) => curbZone.sliceId === slice.id && curbZone.curbUse !== 'no-stopping')
        .flatMap((curbZone, curbZoneIndex) => createStreetFurnitureForCurbZone(slice, road, curbZone, curbZoneIndex));
    });
  }
}

function createStreetFurnitureForCurbZone(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  curbZone: CurbZone,
  curbZoneIndex: number
): StreetFurniture[] {
  return getRecipesForCurbZone(curbZone, curbZoneIndex).map((recipe) =>
    createStreetFurniture(slice, road, curbZone, recipe, curbZoneIndex)
  );
}

function getRecipesForCurbZone(curbZone: CurbZone, curbZoneIndex: number): StreetFurnitureRecipe[] {
  const recipes: StreetFurnitureRecipe[] = [];

  if (curbZoneIndex % 2 === 0) {
    recipes.push(BASE_RECIPES.bench);
  }

  if (curbZoneIndex % 3 === 0) {
    recipes.push(BASE_RECIPES.bin);
  }

  if (curbZoneIndex % 4 === 0) {
    recipes.push(BASE_RECIPES['bike-rack']);
  }

  if (curbZoneIndex % 5 === 0) {
    recipes.push(BASE_RECIPES.kiosk);
  }

  if (curbZone.curbUse === 'bus-stop') {
    recipes.push(BASE_RECIPES['bus-shelter']);
  }

  if (curbZone.curbUse === 'emergency' || curbZoneIndex % 6 === 2) {
    recipes.push(BASE_RECIPES.bollard);
  }

  if (curbZoneIndex % 2 === 1) {
    recipes.push(BASE_RECIPES['regulatory-sign']);
  }

  if (curbZoneIndex % 6 === 0) {
    recipes.push(BASE_RECIPES['street-name-sign']);
  }

  if (curbZoneIndex % 8 === 3) {
    recipes.push(BASE_RECIPES['wayfinding-sign']);
  }

  return recipes;
}

function createStreetFurniture(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  curbZone: CurbZone,
  recipe: StreetFurnitureRecipe,
  curbZoneIndex: number
): StreetFurniture {
  const alongRoadMeters = roundMeters(curbZone.startMeters + curbZone.lengthMeters * recipe.slotRatio);

  return {
    id: `street-furniture-${road.id}-${curbZone.side}-${curbZoneIndex}-${recipe.furnitureType}`,
    kind: 'street-furniture',
    ownerDomain: 'public-realm',
    parentId: curbZone.sidewalkId,
    lod: recipe.signRole ? 'lod4' : 'lod3',
    sliceId: slice.id,
    roadId: road.id,
    sidewalkId: curbZone.sidewalkId,
    curbZoneId: curbZone.id,
    side: curbZone.side,
    furnitureType: recipe.furnitureType,
    placementZone: recipe.placementZone,
    position: getFurniturePosition(road, curbZone, recipe.offsetFromRoadEdgeMeters, alongRoadMeters),
    alongRoadMeters,
    offsetFromRoadEdgeMeters: recipe.offsetFromRoadEdgeMeters,
    orientationRadians: road.orientation === 'vertical' ? 0 : Math.PI / 2,
    dimensions: recipe.dimensions,
    clearanceEnvelope: recipe.clearanceEnvelope,
    assetBindingId: recipe.assetBindingId,
    signFace: recipe.signRole
      ? {
          signRole: recipe.signRole,
          textCode: getSignTextCode(recipe.furnitureType, road.id, curbZone.side),
          facing: recipe.signRole === 'regulatory' ? 'road' : 'sidewalk'
        }
      : undefined,
    tags: {
      detailedStreetSliceId: slice.id,
      detailedStreetSliceRole: `corridor-${recipe.furnitureType}`,
      corridorRoadId: road.id,
      curbZoneId: curbZone.id,
      furnitureType: recipe.furnitureType,
      placementZone: recipe.placementZone
    }
  };
}

function createRecipe(
  furnitureType: StreetFurnitureType,
  slotRatio: number,
  offsetFromRoadEdgeMeters: number,
  widthMeters: number,
  lengthMeters: number,
  heightMeters: number,
  assetBindingId: CityId,
  signRole?: NonNullable<StreetFurniture['signFace']>['signRole']
): StreetFurnitureRecipe {
  return {
    furnitureType,
    slotRatio,
    offsetFromRoadEdgeMeters,
    dimensions: { widthMeters, lengthMeters, heightMeters },
    clearanceEnvelope: {
      widthMeters: roundMeters(widthMeters + 0.2),
      lengthMeters: roundMeters(lengthMeters + 0.4)
    },
    assetBindingId,
    placementZone: 'furnishing-zone',
    signRole
  };
}

function getFurniturePosition(
  road: RoadSegment,
  curbZone: CurbZone,
  offsetFromRoadEdgeMeters: number,
  alongRoadMeters: number
): { x: number; z: number } {
  const sideSign = curbZone.side === 'left' ? -1 : 1;
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

function getSignTextCode(furnitureType: StreetFurnitureType, roadId: CityId, side: string): string {
  switch (furnitureType) {
    case 'regulatory-sign':
      return `${roadId}:speed-40`;
    case 'street-name-sign':
      return `${roadId}:${side}`;
    case 'wayfinding-sign':
      return `${roadId}:district-guide`;
    default:
      return `${roadId}:public-realm`;
  }
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
