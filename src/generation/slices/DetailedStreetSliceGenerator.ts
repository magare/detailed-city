import type {
  BuildingPlan,
  CityConfig,
  CrossingPlan,
  DetailedStreetSlice,
  IntersectionPlan,
  Parcel,
  RoadSegment,
  SidewalkGraph
} from '../../types/city';

export interface DetailedStreetSliceSource {
  readonly roads: readonly RoadSegment[];
  readonly intersections: readonly IntersectionPlan[];
  readonly crossings: readonly CrossingPlan[];
  readonly sidewalkGraph: SidewalkGraph;
  readonly parcels: readonly Parcel[];
  readonly buildings: readonly BuildingPlan[];
}

export interface DetailedStreetSliceTaggedSource {
  readonly roads: RoadSegment[];
  readonly intersections: IntersectionPlan[];
  readonly crossings: CrossingPlan[];
  readonly sidewalkGraph: SidewalkGraph;
  readonly parcels: Parcel[];
  readonly buildings: BuildingPlan[];
}

type TaggableObject = {
  readonly tags?: Readonly<Record<string, string | number | boolean>>;
};

export class DetailedStreetSliceGenerator {
  constructor(private readonly config: CityConfig) {}

  create(source: DetailedStreetSliceSource): DetailedStreetSlice[] {
    const road = this.selectCorridorRoad(source.roads);

    if (!road) {
      return [];
    }

    const intersectionIds = source.intersections
      .filter((intersection) => intersection.connectedRoadIds.includes(road.id))
      .map((intersection) => intersection.id);
    const intersectionIdSet = new Set(intersectionIds);
    const sidewalkIds = road.sidewalks.map((sidewalk) => sidewalk.id);
    const sidewalkIdSet = new Set(sidewalkIds);
    const crossings = source.crossings.filter(
      (crossing) => crossing.intersectionId !== undefined && intersectionIdSet.has(crossing.intersectionId)
    );
    const crossingIds = crossings.map((crossing) => crossing.id);
    const crossingIdSet = new Set(crossingIds);
    const graphNodeIds = source.sidewalkGraph.nodes
      .filter(
        (node) => node.intersectionId !== undefined && intersectionIdSet.has(node.intersectionId) && sidewalkIdSet.has(node.sidewalkId)
      )
      .map((node) => node.id);
    const graphEdgeIds = source.sidewalkGraph.edges
      .filter((edge) => {
        if (edge.sidewalkId && sidewalkIdSet.has(edge.sidewalkId)) {
          return true;
        }

        return Boolean(edge.crossingId && crossingIdSet.has(edge.crossingId));
      })
      .map((edge) => edge.id);
    const parcels = source.parcels.filter((parcel) => parcel.frontageRoadIds.includes(road.id));
    const parcelIds = parcels.map((parcel) => parcel.id);
    const parcelIdSet = new Set(parcelIds);
    const buildingIds = source.buildings
      .filter((building) => parcelIdSet.has(building.parcelId))
      .map((building) => building.id);
    const crossStreetRoadIds = source.intersections
      .filter((intersection) => intersectionIdSet.has(intersection.id))
      .flatMap((intersection) => intersection.connectedRoadIds.filter((roadId) => roadId !== road.id));

    return [
      {
        id: `slice-detailed-street-${road.id}`,
        kind: 'vertical-slice',
        ownerDomain: 'blueprint',
        parentId: road.id,
        name: `Detailed Street Slice ${road.id}`,
        lod: 'lod0',
        sliceKind: 'detailed-street',
        corridorRoadId: road.id,
        streetProfileId: road.streetProfileId,
        hierarchy: road.hierarchy,
        roadIds: [road.id],
        crossStreetRoadIds,
        sidewalkIds,
        intersectionIds,
        crossingIds,
        curbZoneIds: [],
        sidewalkGraphNodeIds: graphNodeIds,
        sidewalkGraphEdgeIds: graphEdgeIds,
        parcelIds,
        buildingIds,
        cameraTarget: { x: road.center.x, y: 14, z: road.center.z },
        cameraPosition: getCameraPosition(road),
        tags: {
          implementationSlice: 'slice-2-detailed-street',
          detailedStreetSliceId: `slice-detailed-street-${road.id}`,
          corridorRoadId: road.id,
          streetProfileId: road.streetProfileId
        }
      }
    ];
  }

  private selectCorridorRoad(roads: readonly RoadSegment[]): RoadSegment | undefined {
    const centralRoadId = `road-v-${Math.floor(this.config.gridSize / 2)}`;
    const detailedProfileRoads = roads.filter((road) =>
      road.streetProfileId === 'main-street' || road.streetProfileId === 'grand-avenue'
    );

    return detailedProfileRoads.find((road) => road.id === centralRoadId) ?? detailedProfileRoads[0];
  }
}

export function applyDetailedStreetSliceTags(
  source: DetailedStreetSliceSource,
  slices: readonly DetailedStreetSlice[]
): DetailedStreetSliceTaggedSource {
  const slice = slices[0];

  if (!slice) {
    return {
      roads: [...source.roads],
      intersections: [...source.intersections],
      crossings: [...source.crossings],
      sidewalkGraph: {
        nodes: [...source.sidewalkGraph.nodes],
        edges: [...source.sidewalkGraph.edges]
      },
      parcels: [...source.parcels],
      buildings: [...source.buildings]
    };
  }

  const roadIds = new Set(slice.roadIds);
  const sidewalkIds = new Set(slice.sidewalkIds);
  const intersectionIds = new Set(slice.intersectionIds);
  const crossingIds = new Set(slice.crossingIds);
  const graphNodeIds = new Set(slice.sidewalkGraphNodeIds);
  const graphEdgeIds = new Set(slice.sidewalkGraphEdgeIds);
  const parcelIds = new Set(slice.parcelIds);
  const buildingIds = new Set(slice.buildingIds);

  return {
    roads: source.roads.map((road) => {
      const sidewalks = road.sidewalks.map((sidewalk) =>
        sidewalkIds.has(sidewalk.id) ? withSliceTag(sidewalk, slice, 'corridor-sidewalk') : sidewalk
      );

      return roadIds.has(road.id) ? withSliceTag({ ...road, sidewalks }, slice, 'corridor-road') : { ...road, sidewalks };
    }),
    intersections: source.intersections.map((intersection) =>
      intersectionIds.has(intersection.id) ? withSliceTag(intersection, slice, 'corridor-intersection') : intersection
    ),
    crossings: source.crossings.map((crossing) =>
      crossingIds.has(crossing.id) ? withSliceTag(crossing, slice, 'corridor-crossing') : crossing
    ),
    sidewalkGraph: {
      nodes: source.sidewalkGraph.nodes.map((node) =>
        graphNodeIds.has(node.id) ? withSliceTag(node, slice, 'corridor-sidewalk-node') : node
      ),
      edges: source.sidewalkGraph.edges.map((edge) =>
        graphEdgeIds.has(edge.id) ? withSliceTag(edge, slice, 'corridor-sidewalk-edge') : edge
      )
    },
    parcels: source.parcels.map((parcel) =>
      parcelIds.has(parcel.id) ? withSliceTag(parcel, slice, 'corridor-frontage-parcel') : parcel
    ),
    buildings: source.buildings.map((building) =>
      buildingIds.has(building.id) ? withSliceTag(building, slice, 'corridor-frontage-building') : building
    )
  };
}

function withSliceTag<ObjectType extends TaggableObject>(
  object: ObjectType,
  slice: DetailedStreetSlice,
  sliceRole: string
): ObjectType {
  return {
    ...object,
    tags: {
      ...object.tags,
      detailedStreetSliceId: slice.id,
      detailedStreetSliceRole: sliceRole,
      corridorRoadId: slice.corridorRoadId
    }
  };
}

function getCameraPosition(road: RoadSegment): { x: number; y: number; z: number } {
  if (road.orientation === 'vertical') {
    return {
      x: road.center.x + road.widthMeters * 3.6,
      y: 72,
      z: road.center.z - Math.min(180, road.length * 0.22)
    };
  }

  return {
    x: road.center.x - Math.min(180, road.length * 0.22),
    y: 72,
    z: road.center.z + road.widthMeters * 3.6
  };
}
