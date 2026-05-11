import type { ActiveFrontageUse, BuildingFrontageSide, CurbSide, LandUse } from '../../city/data-contracts/cityContracts';
import type { ActiveFrontage, BuildingPlan, DetailedStreetSlice, Parcel, RoadSegment } from '../../types/city';

export interface ActiveFrontageSource {
  readonly slices: readonly DetailedStreetSlice[];
  readonly roads: readonly RoadSegment[];
  readonly parcels: readonly Parcel[];
  readonly buildings: readonly BuildingPlan[];
}

const ACTIVE_FRONTAGE_BINDINGS = {
  storefrontWindow: 'binding:facade:storefront-window',
  awning: 'binding:facade:awning',
  sign: 'binding:facade:sign',
  entranceDoor: 'binding:facade:entrance-door',
  nightWindow: 'binding:facade:night-window'
} as const;

const AWNING_COLORS = ['teal', 'ochre', 'brick', 'charcoal'] as const;

export class ActiveFrontageGenerator {
  create(source: ActiveFrontageSource): ActiveFrontage[] {
    const roadsById = new Map(source.roads.map((road) => [road.id, road]));
    const parcelsById = new Map(source.parcels.map((parcel) => [parcel.id, parcel]));
    const buildingsById = new Map(source.buildings.map((building) => [building.id, building]));

    return source.slices.flatMap((slice) => {
      const corridorRoad = roadsById.get(slice.corridorRoadId);

      if (!corridorRoad) {
        return [];
      }

      return slice.buildingIds.flatMap((buildingId, frontageIndex) => {
        const building = buildingsById.get(buildingId);
        const parcel = building ? parcelsById.get(building.parcelId) : undefined;

        if (!building || !parcel || !parcel.frontageRoadIds.includes(corridorRoad.id)) {
          return [];
        }

        const activeUses = getActiveUses(building.uses);

        if (activeUses.length === 0) {
          return [];
        }

        return [createActiveFrontage(slice, corridorRoad, parcel, building, activeUses, frontageIndex)];
      });
    });
  }
}

function createActiveFrontage(
  slice: DetailedStreetSlice,
  road: RoadSegment,
  parcel: Parcel,
  building: BuildingPlan,
  activeUses: readonly ActiveFrontageUse[],
  frontageIndex: number
): ActiveFrontage {
  const frontageSide = getFrontageSide(road, building);
  const roadSide = getRoadSide(road, building);
  const facadeLength = road.orientation === 'vertical' ? building.size.z : building.size.x;
  const widthMeters = roundMeters(Math.max(3.2, Math.min(facadeLength * 0.82, 13.6)));
  const baseFloorHeight = building.heightMeters / Math.max(building.floorCount, 1);
  const groundFloorHeightMeters = roundMeters(Math.min(5.4, Math.max(3.6, baseFloorHeight + 0.7)));
  const displayWindowCount = Math.max(2, Math.min(6, Math.round(widthMeters / 2.3)));

  return {
    id: `facade-active-frontage-${building.id}-${road.id}`,
    kind: 'facade',
    ownerDomain: 'buildings',
    parentId: building.id,
    lod: 'lod3',
    facadeType: 'active-frontage',
    sliceId: slice.id,
    buildingId: building.id,
    parcelId: parcel.id,
    roadId: road.id,
    sidewalkId: getSidewalkId(road, roadSide),
    frontageSide,
    roadSide,
    position: getFacadePosition(building, frontageSide),
    widthMeters,
    heightMeters: groundFloorHeightMeters,
    groundFloorHeightMeters,
    facingDirectionRadians: getFacingDirectionRadians(frontageSide),
    activeUses,
    publicEntranceIds: building.publicEntranceIds,
    storefront: {
      displayWindowCount,
      transparencyRatio: 0.68,
      signTextCode: `${road.id}:${building.id}:storefront-${frontageIndex}`,
      awning: {
        enabled: true,
        depthMeters: 0.92,
        colorCode: AWNING_COLORS[frontageIndex % AWNING_COLORS.length]
      },
      nightWindows: {
        enabledByDefault: true,
        litWindowCount: Math.max(1, Math.min(4, Math.ceil(displayWindowCount / 2))),
        emissiveIntensity: activeUses.includes('hospitality') ? 0.82 : 0.58
      }
    },
    assetBindingIds: ACTIVE_FRONTAGE_BINDINGS,
    tags: {
      detailedStreetSliceId: slice.id,
      detailedStreetSliceRole: 'corridor-active-frontage',
      corridorRoadId: road.id,
      buildingId: building.id,
      parcelId: parcel.id,
      frontageSide,
      activeUse: activeUses.join(',')
    }
  };
}

function getActiveUses(uses: readonly LandUse[]): ActiveFrontageUse[] {
  return uses.filter(isActiveFrontageUse);
}

function isActiveFrontageUse(use: LandUse): use is ActiveFrontageUse {
  return use === 'hospitality' || use === 'mixed-use' || use === 'retail';
}

function getFrontageSide(road: RoadSegment, building: BuildingPlan): BuildingFrontageSide {
  if (road.orientation === 'vertical') {
    return building.center.x < road.center.x ? 'east' : 'west';
  }

  return building.center.z < road.center.z ? 'north' : 'south';
}

function getRoadSide(road: RoadSegment, building: BuildingPlan): CurbSide {
  if (road.orientation === 'vertical') {
    return building.center.x < road.center.x ? 'left' : 'right';
  }

  return building.center.z < road.center.z ? 'left' : 'right';
}

function getSidewalkId(road: RoadSegment, roadSide: CurbSide): string {
  return road.sidewalks.find((sidewalk) => sidewalk.id.endsWith(`-${roadSide}`))?.id ?? `${road.id}-sidewalk-${roadSide}`;
}

function getFacadePosition(building: BuildingPlan, frontageSide: BuildingFrontageSide): { x: number; z: number } {
  const faceOffsetMeters = 0.08;

  switch (frontageSide) {
    case 'east':
      return {
        x: roundMeters(building.center.x + building.size.x / 2 + faceOffsetMeters),
        z: roundMeters(building.center.z)
      };
    case 'west':
      return {
        x: roundMeters(building.center.x - building.size.x / 2 - faceOffsetMeters),
        z: roundMeters(building.center.z)
      };
    case 'north':
      return {
        x: roundMeters(building.center.x),
        z: roundMeters(building.center.z + building.size.z / 2 + faceOffsetMeters)
      };
    case 'south':
      return {
        x: roundMeters(building.center.x),
        z: roundMeters(building.center.z - building.size.z / 2 - faceOffsetMeters)
      };
  }
}

function getFacingDirectionRadians(frontageSide: BuildingFrontageSide): number {
  switch (frontageSide) {
    case 'east':
      return Math.PI / 2;
    case 'west':
      return -Math.PI / 2;
    case 'north':
      return 0;
    case 'south':
      return Math.PI;
  }
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
