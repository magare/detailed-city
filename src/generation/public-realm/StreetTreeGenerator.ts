import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import { DEFAULT_STREET_PROFILES, type TreeSpecies } from '../../city/data-contracts/cityContracts';
import type { BuildingPlan, CityConfig, CurbZone, DetailedStreetSlice, RoadSegment, TreePlanting } from '../../types/city';
import { hashString } from '../../utils/random';
import {
  getBuildingCollision,
  getRoadCollision,
  isTreeCenterClear,
  pushPointOutsideRoadCorridor,
  type TreePlacementAvoidance
} from '../vegetation/treePlacementConstraints';

export interface StreetTreeSource {
  readonly slices: readonly DetailedStreetSlice[];
  readonly roads: readonly RoadSegment[];
  readonly curbZones: readonly CurbZone[];
  readonly buildings: readonly BuildingPlan[];
}

const TREE_PIT_LENGTH_METERS = 3.2;
const TREE_PIT_WIDTH_METERS = 1.4;
const CITYWIDE_TREE_MIN_SPACING_METERS = 82;
const CITYWIDE_TREE_MAX_SPACING_METERS = 148;

export class StreetTreeGenerator {
  constructor(private readonly config: CityConfig) {}

  create(source: StreetTreeSource): TreePlanting[] {
    const detailedRoadIds = new Set(source.slices.map((slice) => slice.corridorRoadId));
    const avoidance: TreePlacementAvoidance = {
      roads: source.roads,
      buildings: source.buildings,
      roadClearanceMeters: 0.75,
      buildingClearanceMeters: 1.1
    };
    const detailedStreetTrees = source.slices.flatMap((slice) => {
      const road = source.roads.find((candidate) => candidate.id === slice.corridorRoadId);

      if (!road) {
        return [];
      }

      return source.curbZones
        .filter((curbZone) => curbZone.sliceId === slice.id && curbZone.curbUse !== 'no-stopping')
        .flatMap((curbZone, index) => {
          const tree = createStreetTree(slice, road, curbZone, index);
          const center = resolveStreetTreeCenter(tree.center, road, tree.id, avoidance);

          return center ? [{ ...tree, center }] : [];
        });
    });

    const citywideStreetTrees = source.roads
      .filter((road) => !detailedRoadIds.has(road.id) && hasTreeZone(road))
      .flatMap((road) => createCitywideStreetTrees(road, this.config.density.treeDensity, avoidance));

    return [...detailedStreetTrees, ...citywideStreetTrees];
  }
}

function createStreetTree(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  curbZone: CurbZone,
  index: number
): TreePlanting {
  const treeId = `street-tree-${road.id}-${curbZone.side}-${index}`;
  const species = selectStreetSpecies(road, curbZone.side, index);
  const traits = createTreeTraits(species, 'shade-corridor', treeId);

  return {
    id: treeId,
    kind: 'tree-planting',
    ownerDomain: 'public-realm',
    parentId: curbZone.sidewalkId,
    plantingContext: 'street',
    plantingForm: 'street-tree',
    sliceId: slice.id,
    roadId: road.id,
    sidewalkId: curbZone.sidewalkId,
    curbZoneId: curbZone.id,
    lod: 'lod3',
    center: getTreeCenter(road, curbZone),
    species,
    height: traits.height,
    canopyDiameter: traits.canopyDiameter,
    canopyClass: traits.canopyClass,
    canopySpreadMeters: traits.canopyDiameter,
    soilVolumeCubicMeters: 11.8,
    seasonalColor: traits.seasonalColor,
    greenCorridorId: `green-corridor-${road.id}`,
    greenCorridorRole: 'shade-corridor',
    heatMitigationScore: traits.heatMitigationScore,
    ecologyScore: traits.ecologyScore,
    treePit: {
      widthMeters: TREE_PIT_WIDTH_METERS,
      lengthMeters: TREE_PIT_LENGTH_METERS,
      surface: 'grate'
    },
    offsetFromRoadEdgeMeters: getOffsetFromRoadEdge(curbZone),
    tags: {
      detailedStreetSliceId: slice.id,
      detailedStreetSliceRole: 'corridor-street-tree',
      corridorRoadId: road.id,
      curbZoneId: curbZone.id
    }
  };
}

function createCitywideStreetTrees(
  road: RoadSegment,
  treeDensity: number,
  avoidance: TreePlacementAvoidance
): TreePlanting[] {
  const spacing = getCitywideTreeSpacing(treeDensity);
  const countPerSide = Math.max(3, Math.floor(road.length / spacing));
  const sidewalkIds = [`${road.id}-sidewalk-left`, `${road.id}-sidewalk-right`] as const;

  return sidewalkIds.flatMap((sidewalkId) => {
    const side = sidewalkId.endsWith('left') ? 'left' : 'right';

    return Array.from({ length: countPerSide }).flatMap((_, index): TreePlanting[] => {
      const treeId = `citywide-tree-${road.id}-${side}-${index}`;
      const species = selectStreetSpecies(road, side, index);
      const role = road.hierarchy === 'promenade' ? 'waterfront-cooling' : 'shade-corridor';
      const traits = createTreeTraits(species, role, treeId);
      const plantingForm = shouldUseRaisedPlanter(road, side, index) ? 'raised-planter' : 'street-tree';
      const candidateCenter = getRoadSideTreeCenter(road, side, index, countPerSide);
      const center = resolveStreetTreeCenter(candidateCenter, road, treeId, avoidance);

      if (!center) {
        return [];
      }

      const tree: TreePlanting = {
        id: treeId,
        kind: 'tree-planting',
        ownerDomain: 'public-realm',
        parentId: sidewalkId,
        plantingContext: 'street',
        plantingForm,
        roadId: road.id,
        sidewalkId,
        lod: road.hierarchy === 'promenade' ? 'lod3' : 'lod2',
        center,
        species,
        height: traits.height,
        canopyDiameter: traits.canopyDiameter,
        canopyClass: traits.canopyClass,
        canopySpreadMeters: traits.canopyDiameter,
        soilVolumeCubicMeters: plantingForm === 'raised-planter' ? 7.2 : 10.4,
        seasonalColor: traits.seasonalColor,
        greenCorridorId: `green-corridor-${road.continuityGroupId ?? road.id}`,
        greenCorridorRole: role,
        heatMitigationScore: traits.heatMitigationScore,
        ecologyScore: traits.ecologyScore,
        treePit: {
          widthMeters: getProfileTreePitWidth(road, plantingForm),
          lengthMeters: plantingForm === 'raised-planter' ? 2.8 : TREE_PIT_LENGTH_METERS,
          surface: plantingForm === 'raised-planter' ? 'open-soil' : 'grate'
        },
        offsetFromRoadEdgeMeters: getProfileTreeOffset(road),
        tags: {
          corridorRoadId: road.id,
          greenCorridorId: `green-corridor-${road.continuityGroupId ?? road.id}`,
          plantingForm
        }
      };
      return [tree];
    });
  });
}

function getTreeCenter(road: RoadSegment, curbZone: CurbZone): { x: number; z: number } {
  const alongRoad = -road.length / 2 + (curbZone.startMeters + curbZone.endMeters) / 2;
  const sideSign = curbZone.side === 'left' ? -1 : 1;
  const perpendicularOffset = road.widthMeters / 2 + getOffsetFromRoadEdge(curbZone);

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

function getOffsetFromRoadEdge(curbZone: CurbZone): number {
  return Math.min(1.2, Math.max(0.8, curbZone.widthMeters * 0.42));
}

function getRoadSideTreeCenter(
  road: RoadSegment,
  side: 'left' | 'right',
  index: number,
  countPerSide: number
): { x: number; z: number } {
  const startInset = Math.min(28, road.length * 0.12);
  const usableLength = Math.max(1, road.length - startInset * 2);
  const spacing = usableLength / countPerSide;
  const alongJitter = signedUnitHash(`${road.id}:${side}:${index}:along`) * Math.min(7.5, spacing * 0.18);
  const offsetJitter = signedUnitHash(`${road.id}:${side}:${index}:offset`) * 0.32;
  const alongRoad = -road.length / 2 + startInset + (usableLength * (index + 0.5)) / countPerSide + alongJitter;
  const sideSign = side === 'left' ? -1 : 1;
  const perpendicularOffset = road.widthMeters / 2 + getProfileTreeOffset(road) + offsetJitter;

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

function resolveStreetTreeCenter(
  center: { readonly x: number; readonly z: number },
  road: RoadSegment,
  treeId: string,
  avoidance: TreePlacementAvoidance
): { readonly x: number; readonly z: number } | undefined {
  for (const candidate of createStreetTreeCenterCandidates(center, road, treeId)) {
    const roadClearCandidate = resolveRoadConflicts(candidate, avoidance);

    if (roadClearCandidate && !getBuildingCollision(roadClearCandidate, avoidance)) {
      return roadClearCandidate;
    }

    if (roadClearCandidate && isTreeCenterClear(roadClearCandidate, avoidance)) {
      return roadClearCandidate;
    }
  }

  return undefined;
}

function createStreetTreeCenterCandidates(
  center: { readonly x: number; readonly z: number },
  road: RoadSegment,
  treeId: string
): { readonly x: number; readonly z: number }[] {
  const primaryDirection = signedUnitHash(`${treeId}:placement-direction`) >= 0 ? 1 : -1;
  const shiftMeters = [0, 5.5, -5.5, 11, -11, 18, -18, 26, -26, 34, -34];

  return shiftMeters.map((shift) => translateAlongRoad(road, center, shift * primaryDirection));
}

function resolveRoadConflicts(
  center: { readonly x: number; readonly z: number },
  avoidance: TreePlacementAvoidance
): { readonly x: number; readonly z: number } | undefined {
  let candidate = center;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const collision = getRoadCollision(candidate, avoidance);

    if (!collision) {
      return candidate;
    }

    candidate = pushPointOutsideRoadCorridor(candidate, collision, attempt * 0.45);
  }

  return undefined;
}

function translateAlongRoad(
  road: RoadSegment,
  center: { readonly x: number; readonly z: number },
  offsetMeters: number
): { readonly x: number; readonly z: number } {
  if (road.orientation === 'vertical') {
    return {
      x: center.x,
      z: roundMeters(center.z + offsetMeters)
    };
  }

  return {
    x: roundMeters(center.x + offsetMeters),
    z: center.z
  };
}

function hasTreeZone(road: RoadSegment): boolean {
  const profile = DEFAULT_STREET_PROFILES.find((candidate) => candidate.id === road.streetProfileId);
  return profile?.treeZone === true;
}

function getCitywideTreeSpacing(treeDensity: number): number {
  const density = Math.max(0, Math.min(1, treeDensity));
  return roundMeters(CITYWIDE_TREE_MAX_SPACING_METERS - (CITYWIDE_TREE_MAX_SPACING_METERS - CITYWIDE_TREE_MIN_SPACING_METERS) * density);
}

function selectStreetSpecies(road: RoadSegment, side: 'left' | 'right', index: number): TreeSpecies {
  const species = CITY_BLUEPRINT.treeSpeciesCycle;
  const hierarchyBias = road.hierarchy === 'promenade'
    ? 1
    : road.hierarchy === 'local'
      ? 2
      : road.hierarchy === 'transit-corridor'
        ? 3
        : 0;
  const hash = hashString(`${road.id}:${side}:${index}:${road.streetProfileId}:${hierarchyBias}`);

  return species[(hash + hierarchyBias) % species.length];
}

function shouldUseRaisedPlanter(road: RoadSegment, side: 'left' | 'right', index: number): boolean {
  if (road.hierarchy === 'promenade') {
    return index % 4 === 0;
  }

  return normalizedHash(`${road.id}:${side}:${index}:planter`) > 0.72;
}

function getProfileTreeOffset(road: RoadSegment): number {
  const profile = DEFAULT_STREET_PROFILES.find((candidate) => candidate.id === road.streetProfileId);
  const furnishingZoneMeters = getProfileFurnishingZoneMeters(profile);
  return roundMeters(Math.max(0.35, furnishingZoneMeters * 0.62));
}

function getProfileTreePitWidth(road: RoadSegment, plantingForm: TreePlanting['plantingForm']): number {
  const profile = DEFAULT_STREET_PROFILES.find((candidate) => candidate.id === road.streetProfileId);
  const furnishingZoneMeters = getProfileFurnishingZoneMeters(profile);
  const fitWidth = Math.max(0.45, furnishingZoneMeters * 0.82);
  return roundMeters(plantingForm === 'raised-planter' ? Math.min(1.1, fitWidth) : Math.min(TREE_PIT_WIDTH_METERS, fitWidth));
}

function getProfileFurnishingZoneMeters(profile: (typeof DEFAULT_STREET_PROFILES)[number] | undefined): number {
  if (!profile?.treeZone) {
    return 0;
  }

  return Math.min(1.6, profile.sidewalkWidthMeters * 0.32);
}

function createTreeTraits(species: TreeSpecies, role: TreePlanting['greenCorridorRole'], variantKey: string): {
  readonly height: number;
  readonly canopyDiameter: number;
  readonly canopyClass: TreePlanting['canopyClass'];
  readonly seasonalColor: TreePlanting['seasonalColor'];
  readonly heatMitigationScore: number;
  readonly ecologyScore: number;
} {
  const base = species === 'palm'
    ? { height: 7.8, canopyDiameter: 3.6, canopyClass: 'palm' as const, seasonalColor: 'evergreen' as const, ecologyScore: 0.46 }
    : species === 'rain-tree'
      ? { height: 8.4, canopyDiameter: 6.2, canopyClass: 'broad' as const, seasonalColor: 'summer-green' as const, ecologyScore: 0.82 }
      : species === 'jacaranda'
        ? { height: 7.4, canopyDiameter: 5.2, canopyClass: 'medium' as const, seasonalColor: 'spring-purple' as const, ecologyScore: 0.74 }
        : { height: 7.6, canopyDiameter: 5.6, canopyClass: 'medium' as const, seasonalColor: 'autumn-gold' as const, ecologyScore: 0.68 };
  const roleBoost = role === 'waterfront-cooling' ? 0.06 : 0;
  const heightScale = 0.82 + normalizedHash(`${variantKey}:height`) * 0.36;
  const canopyScale = 0.76 + normalizedHash(`${variantKey}:canopy`) * 0.42;
  const ecologyShift = (normalizedHash(`${variantKey}:ecology`) - 0.5) * 0.08;
  const canopyDiameter = roundMeters(base.canopyDiameter * canopyScale);

  return {
    ...base,
    height: roundMeters(base.height * heightScale),
    canopyDiameter,
    heatMitigationScore: Math.min(1, roundMeters(canopyDiameter / 7 + roleBoost)),
    ecologyScore: Math.max(0.3, Math.min(1, roundMeters(base.ecologyScore + ecologyShift)))
  };
}

function normalizedHash(key: string): number {
  return hashString(key) / 0xffffffff;
}

function signedUnitHash(key: string): number {
  return normalizedHash(key) * 2 - 1;
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
