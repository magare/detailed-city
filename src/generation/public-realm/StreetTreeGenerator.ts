import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import { DEFAULT_STREET_PROFILES, type TreeSpecies } from '../../city/data-contracts/cityContracts';
import type { CurbZone, DetailedStreetSlice, RoadSegment, TreePlanting } from '../../types/city';

export interface StreetTreeSource {
  readonly slices: readonly DetailedStreetSlice[];
  readonly roads: readonly RoadSegment[];
  readonly curbZones: readonly CurbZone[];
}

const TREE_PIT_LENGTH_METERS = 3.2;
const TREE_PIT_WIDTH_METERS = 1.4;
const CITYWIDE_TREE_SPACING_METERS = 240;

export class StreetTreeGenerator {
  create(source: StreetTreeSource): TreePlanting[] {
    const detailedRoadIds = new Set(source.slices.map((slice) => slice.corridorRoadId));
    const detailedStreetTrees = source.slices.flatMap((slice) => {
      const road = source.roads.find((candidate) => candidate.id === slice.corridorRoadId);

      if (!road) {
        return [];
      }

      return source.curbZones
        .filter((curbZone) => curbZone.sliceId === slice.id && curbZone.curbUse !== 'no-stopping')
        .map((curbZone, index) => createStreetTree(slice, road, curbZone, index));
    });

    const citywideStreetTrees = source.roads
      .filter((road) => !detailedRoadIds.has(road.id) && hasTreeZone(road))
      .flatMap((road) => createCitywideStreetTrees(road));

    return [...detailedStreetTrees, ...citywideStreetTrees];
  }
}

function createStreetTree(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  curbZone: CurbZone,
  index: number
): TreePlanting {
  const species = CITY_BLUEPRINT.treeSpeciesCycle[index % CITY_BLUEPRINT.treeSpeciesCycle.length];
  const traits = createTreeTraits(species, 'shade-corridor');

  return {
    id: `street-tree-${road.id}-${curbZone.side}-${index}`,
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

function createCitywideStreetTrees(road: RoadSegment): TreePlanting[] {
  const spacing = CITYWIDE_TREE_SPACING_METERS;
  const countPerSide = Math.max(2, Math.floor(road.length / spacing));
  const sidewalkIds = [`${road.id}-sidewalk-left`, `${road.id}-sidewalk-right`] as const;

  return sidewalkIds.flatMap((sidewalkId) => {
    const side = sidewalkId.endsWith('left') ? 'left' : 'right';

    return Array.from({ length: countPerSide }, (_, index) => {
      const species = CITY_BLUEPRINT.treeSpeciesCycle[(index + road.id.length + (side === 'left' ? 0 : 2)) % CITY_BLUEPRINT.treeSpeciesCycle.length];
      const role = road.hierarchy === 'promenade' ? 'waterfront-cooling' : 'shade-corridor';
      const traits = createTreeTraits(species, role);
      const plantingForm = index % 5 === 0 ? 'raised-planter' : 'street-tree';
      const center = getRoadSideTreeCenter(road, side, index, countPerSide);

      return {
        id: `citywide-tree-${road.id}-${side}-${index}`,
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
  const alongRoad = -road.length / 2 + startInset + (usableLength * (index + 0.5)) / countPerSide;
  const sideSign = side === 'left' ? -1 : 1;
  const perpendicularOffset = road.widthMeters / 2 + getProfileTreeOffset(road);

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

function hasTreeZone(road: RoadSegment): boolean {
  const profile = DEFAULT_STREET_PROFILES.find((candidate) => candidate.id === road.streetProfileId);
  return profile?.treeZone === true;
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

function createTreeTraits(species: TreeSpecies, role: TreePlanting['greenCorridorRole']): {
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

  return {
    ...base,
    heatMitigationScore: Math.min(1, roundMeters(base.canopyDiameter / 7 + roleBoost))
  };
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
