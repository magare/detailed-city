import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import type { CurbZone, DetailedStreetSlice, RoadSegment, TreePlanting } from '../../types/city';

export interface StreetTreeSource {
  readonly slices: readonly DetailedStreetSlice[];
  readonly roads: readonly RoadSegment[];
  readonly curbZones: readonly CurbZone[];
}

const TREE_PIT_LENGTH_METERS = 3.2;
const TREE_PIT_WIDTH_METERS = 1.4;

export class StreetTreeGenerator {
  create(source: StreetTreeSource): TreePlanting[] {
    return source.slices.flatMap((slice) => {
      const road = source.roads.find((candidate) => candidate.id === slice.corridorRoadId);

      if (!road) {
        return [];
      }

      return source.curbZones
        .filter((curbZone) => curbZone.sliceId === slice.id && curbZone.curbUse !== 'no-stopping')
        .map((curbZone, index) => createStreetTree(slice, road, curbZone, index));
    });
  }
}

function createStreetTree(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  curbZone: CurbZone,
  index: number
): TreePlanting {
  const species = CITY_BLUEPRINT.treeSpeciesCycle[index % CITY_BLUEPRINT.treeSpeciesCycle.length];

  return {
    id: `street-tree-${road.id}-${curbZone.side}-${index}`,
    kind: 'tree-planting',
    ownerDomain: 'public-realm',
    parentId: curbZone.sidewalkId,
    plantingContext: 'street',
    sliceId: slice.id,
    roadId: road.id,
    sidewalkId: curbZone.sidewalkId,
    curbZoneId: curbZone.id,
    lod: 'lod3',
    center: getTreeCenter(road, curbZone),
    species,
    height: species === 'palm' ? 7.8 : 7.2,
    canopyDiameter: species === 'palm' ? 3.6 : 5,
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

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
