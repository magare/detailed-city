import type { CityId, PublicAmenityKind, PublicAmenityPlacementContext } from '../../city/data-contracts/cityContracts';
import type { PlazaZone, PublicAmenity, ServiceAccessCorridor, StreetFurniture, WaterfrontOpenSpace } from '../../types/city';
import { rectanglePolygon } from '../../utils/geometry';

export interface PublicAmenityGeneratorInput {
  readonly streetFurniture: readonly StreetFurniture[];
  readonly plazaZones: readonly PlazaZone[];
  readonly waterfrontOpenSpaces: readonly WaterfrontOpenSpace[];
  readonly serviceAccessCorridors: readonly ServiceAccessCorridor[];
}

interface PublicAmenityRecipe {
  readonly amenityKind: PublicAmenityKind;
  readonly dimensions: PublicAmenity['dimensions'];
  readonly clearanceEnvelope: PublicAmenity['clearanceEnvelope'];
  readonly capacityUsers: number;
  readonly accessiblePathMeters: number;
  readonly utilityRequirements: PublicAmenity['utilityRequirements'];
  readonly serviceRequired: boolean;
  readonly comfort: Omit<PublicAmenity['comfort'], 'expectedDailyUsers'>;
  readonly assetBindingId: CityId;
}

const AMENITY_RECIPES: Readonly<Record<PublicAmenityKind, PublicAmenityRecipe>> = {
  'public-toilet': createRecipe('public-toilet', 2.2, 3.2, 2.8, 3, { water: true, power: true, drainage: true }, true, {
    shadeProvided: false,
    coolingProvided: false,
    seatingSupported: false
  }),
  'drinking-fountain': createRecipe('drinking-fountain', 0.55, 0.55, 1.1, 1, { water: true, power: false, drainage: true }, true, {
    shadeProvided: false,
    coolingProvided: false,
    seatingSupported: false
  }),
  'shade-structure': createRecipe('shade-structure', 3.6, 4.2, 3.1, 10, { water: false, power: false, drainage: false }, false, {
    shadeProvided: true,
    coolingProvided: false,
    seatingSupported: true
  }),
  'misting-cooling-point': createRecipe('misting-cooling-point', 1.1, 1.1, 2.25, 6, { water: true, power: true, drainage: true }, true, {
    shadeProvided: false,
    coolingProvided: true,
    seatingSupported: false
  }),
  'charging-point': createRecipe('charging-point', 0.7, 0.7, 1.35, 2, { water: false, power: true, drainage: false }, true, {
    shadeProvided: false,
    coolingProvided: false,
    seatingSupported: false
  }),
  clock: createRecipe('clock', 0.35, 0.35, 3.2, 4, { water: false, power: false, drainage: false }, false, {
    shadeProvided: false,
    coolingProvided: false,
    seatingSupported: false
  }),
  'information-kiosk': createRecipe('information-kiosk', 1.2, 0.85, 2.1, 3, { water: false, power: true, drainage: false }, true, {
    shadeProvided: true,
    coolingProvided: false,
    seatingSupported: false
  }),
  'repair-stand': createRecipe('repair-stand', 1.1, 0.8, 1.35, 2, { water: false, power: false, drainage: false }, true, {
    shadeProvided: false,
    coolingProvided: false,
    seatingSupported: false
  })
};

const STREET_AMENITY_CYCLE: readonly PublicAmenityKind[] = [
  'drinking-fountain',
  'charging-point',
  'repair-stand',
  'clock',
  'information-kiosk',
  'shade-structure',
  'public-toilet',
  'misting-cooling-point'
];
const PLAZA_AMENITY_CYCLE: readonly PublicAmenityKind[] = [
  'shade-structure',
  'misting-cooling-point',
  'information-kiosk',
  'drinking-fountain',
  'charging-point',
  'clock'
];
const WATERFRONT_AMENITY_CYCLE: readonly PublicAmenityKind[] = [
  'drinking-fountain',
  'shade-structure',
  'repair-stand',
  'information-kiosk',
  'charging-point',
  'public-toilet',
  'misting-cooling-point',
  'clock'
];

export class PublicAmenityGenerator {
  create(input: PublicAmenityGeneratorInput): PublicAmenity[] {
    const streetAmenities = input.streetFurniture
      .filter(isPublicAmenityStreetAnchor)
      .slice(0, 32)
      .map((anchor, index) =>
        createStreetAmenity(anchor, AMENITY_RECIPES[STREET_AMENITY_CYCLE[index % STREET_AMENITY_CYCLE.length]], index, input.serviceAccessCorridors)
      );
    const plazaAmenities = input.plazaZones
      .slice(0, 6)
      .map((zone, index) =>
        createSurfaceAmenity(zone, 'plaza', AMENITY_RECIPES[PLAZA_AMENITY_CYCLE[index % PLAZA_AMENITY_CYCLE.length]], index, input.serviceAccessCorridors)
      );
    const waterfrontAmenities = input.waterfrontOpenSpaces
      .slice(0, 8)
      .map((openSpace, index) =>
        createSurfaceAmenity(
          openSpace,
          'waterfront',
          AMENITY_RECIPES[WATERFRONT_AMENITY_CYCLE[index % WATERFRONT_AMENITY_CYCLE.length]],
          index,
          input.serviceAccessCorridors
        )
      );

    return [...streetAmenities, ...plazaAmenities, ...waterfrontAmenities];
  }
}

function createStreetAmenity(
  anchor: StreetFurniture,
  recipe: PublicAmenityRecipe,
  index: number,
  serviceAccessCorridors: readonly ServiceAccessCorridor[]
): PublicAmenity {
  const position = offsetFromStreetAnchor(anchor, recipe, index);
  const service = resolveServiceAccess(position, recipe, serviceAccessCorridors);

  return createAmenity({
    id: `public-amenity-${recipe.amenityKind}-${anchor.id}`,
    recipe,
    placementContext: anchor.placementContext,
    parentId: anchor.sidewalkId,
    position,
    orientationRadians: anchor.orientationRadians,
    roadId: anchor.roadId,
    sidewalkId: anchor.sidewalkId,
    side: anchor.side,
    service
  });
}

function createSurfaceAmenity(
  source: PlazaZone | WaterfrontOpenSpace,
  placementContext: Extract<PublicAmenityPlacementContext, 'plaza' | 'waterfront'>,
  recipe: PublicAmenityRecipe,
  index: number,
  serviceAccessCorridors: readonly ServiceAccessCorridor[]
): PublicAmenity {
  const position = offsetFromSurfaceCenter(source.center, recipe, index);
  const service = resolveServiceAccess(position, recipe, serviceAccessCorridors);

  return createAmenity({
    id: `public-amenity-${recipe.amenityKind}-${source.id}`,
    recipe,
    placementContext,
    parentId: source.id,
    position,
    orientationRadians: index % 2 === 0 ? 0 : Math.PI / 2,
    plazaZoneId: placementContext === 'plaza' ? source.id : undefined,
    waterfrontOpenSpaceId: placementContext === 'waterfront' ? source.id : undefined,
    service
  });
}

function createAmenity(input: {
  readonly id: CityId;
  readonly recipe: PublicAmenityRecipe;
  readonly placementContext: PublicAmenityPlacementContext;
  readonly parentId: CityId;
  readonly position: PublicAmenity['position'];
  readonly orientationRadians: number;
  readonly roadId?: CityId;
  readonly sidewalkId?: CityId;
  readonly plazaZoneId?: CityId;
  readonly waterfrontOpenSpaceId?: CityId;
  readonly side?: PublicAmenity['side'];
  readonly service: ResolvedServiceAccess;
}): PublicAmenity {
  return {
    id: input.id,
    kind: 'public-amenity',
    ownerDomain: 'public-realm',
    parentId: input.parentId,
    lod: input.recipe.amenityKind === 'information-kiosk' || input.recipe.amenityKind === 'clock' ? 'lod4' : 'lod3',
    amenityKind: input.recipe.amenityKind,
    placementContext: input.placementContext,
    roadId: input.roadId,
    sidewalkId: input.sidewalkId,
    plazaZoneId: input.plazaZoneId,
    waterfrontOpenSpaceId: input.waterfrontOpenSpaceId,
    serviceAccessCorridorId: input.service.corridorId,
    side: input.side,
    position: input.position,
    boundary: rectanglePolygon(input.position, {
      x: input.recipe.clearanceEnvelope.widthMeters,
      z: input.recipe.clearanceEnvelope.lengthMeters
    }),
    orientationRadians: input.orientationRadians,
    dimensions: input.recipe.dimensions,
    clearanceEnvelope: input.recipe.clearanceEnvelope,
    accessiblePathMeters: input.recipe.accessiblePathMeters,
    capacityUsers: input.recipe.capacityUsers,
    comfort: {
      ...input.recipe.comfort,
      expectedDailyUsers: getExpectedDailyUsers(input.recipe.amenityKind, input.placementContext)
    },
    utilityRequirements: input.recipe.utilityRequirements,
    serviceAccess: {
      required: input.recipe.serviceRequired,
      provided: input.service.provided,
      maintenanceAccessMeters: input.service.maintenanceAccessMeters
    },
    assetBindingId: input.recipe.assetBindingId,
    tags: {
      amenityKind: input.recipe.amenityKind,
      placementContext: input.placementContext,
      roadId: input.roadId ?? '',
      serviceAccessCorridorId: input.service.corridorId ?? '',
      utilityWater: input.recipe.utilityRequirements.water,
      utilityPower: input.recipe.utilityRequirements.power,
      utilityDrainage: input.recipe.utilityRequirements.drainage
    }
  };
}

function createRecipe(
  amenityKind: PublicAmenityKind,
  widthMeters: number,
  lengthMeters: number,
  heightMeters: number,
  capacityUsers: number,
  utilityRequirements: PublicAmenity['utilityRequirements'],
  serviceRequired: boolean,
  comfort: Omit<PublicAmenity['comfort'], 'expectedDailyUsers'>
): PublicAmenityRecipe {
  return {
    amenityKind,
    dimensions: { widthMeters, lengthMeters, heightMeters },
    clearanceEnvelope: {
      widthMeters: roundMeters(widthMeters + 0.55),
      lengthMeters: roundMeters(lengthMeters + 0.65)
    },
    accessiblePathMeters: 2.1,
    capacityUsers,
    utilityRequirements,
    serviceRequired,
    comfort,
    assetBindingId: `binding:public-amenity:${amenityKind}`
  };
}

function isPublicAmenityStreetAnchor(anchor: StreetFurniture): boolean {
  return (
    anchor.furnitureType === 'bench' ||
    anchor.furnitureType === 'bike-rack' ||
    anchor.furnitureType === 'bus-shelter' ||
    anchor.furnitureType === 'kiosk' ||
    anchor.furnitureType === 'railing'
  );
}

function offsetFromStreetAnchor(anchor: StreetFurniture, recipe: PublicAmenityRecipe, index: number): PublicAmenity['position'] {
  const direction = index % 2 === 0 ? 1 : -1;
  const shift = recipe.clearanceEnvelope.lengthMeters / 2 + 0.85;

  if (Math.abs(anchor.orientationRadians) < 0.01) {
    return {
      x: roundMeters(anchor.position.x),
      z: roundMeters(anchor.position.z + shift * direction)
    };
  }

  return {
    x: roundMeters(anchor.position.x + shift * direction),
    z: roundMeters(anchor.position.z)
  };
}

function offsetFromSurfaceCenter(
  center: PublicAmenity['position'],
  recipe: PublicAmenityRecipe,
  index: number
): PublicAmenity['position'] {
  const ring = 1 + (index % 3) * 0.35;
  const direction = index % 2 === 0 ? 1 : -1;

  return {
    x: roundMeters(center.x + direction * (recipe.clearanceEnvelope.widthMeters * 0.45 + ring)),
    z: roundMeters(center.z + ((index % 4) - 1.5) * (recipe.clearanceEnvelope.lengthMeters * 0.22))
  };
}

interface ResolvedServiceAccess {
  readonly corridorId?: CityId;
  readonly provided: boolean;
  readonly maintenanceAccessMeters: number;
}

function resolveServiceAccess(
  position: PublicAmenity['position'],
  recipe: PublicAmenityRecipe,
  corridors: readonly ServiceAccessCorridor[]
): ResolvedServiceAccess {
  if (!recipe.serviceRequired) {
    return {
      provided: true,
      maintenanceAccessMeters: 0
    };
  }

  const nearest = corridors.reduce<{ corridor?: ServiceAccessCorridor; distance: number }>(
    (best, corridor) => {
      const distanceMeters = distance(position, corridor.center);

      return distanceMeters < best.distance ? { corridor, distance: distanceMeters } : best;
    },
    { distance: Number.POSITIVE_INFINITY }
  );

  return {
    corridorId: nearest.corridor?.id,
    provided: Boolean(nearest.corridor),
    maintenanceAccessMeters: roundMeters(nearest.distance)
  };
}

function getExpectedDailyUsers(amenityKind: PublicAmenityKind, context: PublicAmenityPlacementContext): number {
  const baseByKind: Readonly<Record<PublicAmenityKind, number>> = {
    'public-toilet': 180,
    'drinking-fountain': 95,
    'shade-structure': 130,
    'misting-cooling-point': 120,
    'charging-point': 70,
    clock: 60,
    'information-kiosk': 110,
    'repair-stand': 42
  };
  const contextMultiplier = context === 'plaza' ? 1.35 : context === 'waterfront' ? 1.25 : context === 'detailed-street' ? 1.15 : 1;

  return Math.round(baseByKind[amenityKind] * contextMultiplier);
}

function distance(a: PublicAmenity['position'], b: PublicAmenity['position']): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function roundMeters(value: number): number {
  return Number(value.toFixed(2));
}
