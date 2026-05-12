import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import type {
  CityBounds,
  CityConfig,
  ConstraintPlan,
  ParkFeature,
  ParkPatch,
  RoadSegment,
  TreePlanting,
  Waterway
} from '../../types/city';
import { isPointInsidePolygon, rectanglePolygon } from '../../utils/geometry';

export class TerrainGenerator {
  constructor(private readonly config: CityConfig) {}

  generateParks(bounds: CityBounds): ParkPatch[] {
    const block = this.config.blockSize;
    const publicSpacesById = new Map(CITY_BLUEPRINT.publicSpaces.map((space) => [space.id, space]));

    return CITY_BLUEPRINT.masterPlan.protectedOpenSpaces.flatMap((protectedSpace) => {
      const space = publicSpacesById.get(protectedSpace.publicSpaceId);

      if (!space) {
        return [];
      }

      const center = {
        x: bounds.spacing * space.centerBySpacing.x,
        z: bounds.spacing * space.centerBySpacing.z
      };
      const size = {
        x: block * space.sizeByBlock.x,
        z: block * space.sizeByBlock.z
      };

      return [
        {
          id: space.id,
          kind: 'park',
          ownerDomain: 'public-realm',
          name: space.name,
          lod: 'lod1',
          tags: {
            masterPlanProtectedOpenSpaceId: protectedSpace.id,
            protectionPolicy: protectedSpace.protectionPolicy
          },
          center,
          size,
          boundary: rectanglePolygon(center, size),
          connectedSidewalkIds: [],
          programZoneIds: [],
          pathFeatureIds: []
        }
      ];
    });
  }

  connectParksToSidewalks(parks: readonly ParkPatch[], roads: readonly RoadSegment[]): ParkPatch[] {
    return parks.map((park) => ({
      ...park,
      connectedSidewalkIds: getNearestSidewalkIds(park, roads, 2)
    }));
  }

  attachParkFeatureIds(parks: readonly ParkPatch[], features: readonly ParkFeature[]): ParkPatch[] {
    return parks.map((park) => {
      const parkFeatures = features.filter((feature) => feature.parkId === park.id);

      return {
        ...park,
        programZoneIds: parkFeatures.filter((feature) => feature.featureKind !== 'path').map((feature) => feature.id),
        pathFeatureIds: parkFeatures.filter((feature) => feature.featureKind === 'path').map((feature) => feature.id)
      };
    });
  }

  generateParkFeatures(parks: readonly ParkPatch[]): ParkFeature[] {
    return parks.flatMap((park) => createParkFeatureTemplates(park).map((template, index) => {
      const center = offsetPoint(park.center, park.size, template.offset);
      const size = {
        x: Math.max(1.4, park.size.x * template.sizeRatio.x),
        z: Math.max(1.4, park.size.z * template.sizeRatio.z)
      };

      return {
        id: `park-feature-${park.id}-${template.featureKind}-${index}`,
        kind: 'park-feature',
        ownerDomain: 'public-realm',
        parentId: park.id,
        parkId: park.id,
        name: `${park.name ?? park.id} ${template.name}`,
        lod: template.lod,
        featureKind: template.featureKind,
        programKind: template.programKind,
        center,
        size,
        boundary: rectanglePolygon(center, size),
        surface: template.surface,
        accessible: template.accessible,
        connectedSidewalkIds: template.featureKind === 'path' || template.accessible ? park.connectedSidewalkIds : [],
        capacityPeople: template.capacityPeople,
        shadeTreeIds: [],
        assetBindingId: `binding:park-feature:${template.featureKind}`,
        tags: {
          parkId: park.id,
          featureKind: template.featureKind,
          programKind: template.programKind
        }
      };
    }));
  }

  generateWaterways(bounds: CityBounds, roads: readonly RoadSegment[]): Waterway[] {
    return CITY_BLUEPRINT.waterways.map((waterway) => {
      const center = {
        x: bounds.span * waterway.centerBySpan.x,
        z: bounds.span * waterway.centerBySpan.z
      };
      const length = bounds.span * waterway.lengthBySpan;
      const size = { x: length, z: this.config.waterwayWidth };
      const boundary = rectanglePolygon(center, size);
      const edgeSegments = createWaterwayEdgeSegments(waterway, center, length, this.config.waterwayWidth);
      const crossingRefs = createWaterwayCrossings(waterway.id, center, length, roads, edgeSegments);
      const culverts = crossingRefs
        .filter((crossing) => crossing.crossingKind === 'culvert')
        .map((crossing, index) => ({
          id: `${waterway.id}-culvert-${index}`,
          roadId: crossing.roadId,
          center: crossing.center,
          inletEdgeSegmentId: crossing.edgeSegmentIds[0],
          outletEdgeSegmentId: crossing.edgeSegmentIds[1],
          diameterMeters: 1.6,
          outfallIds: [`${waterway.id}-outfall-${index % 4}`]
        }));
      const docks = createWaterwayDocks(waterway.id, center, length, this.config.waterwayWidth, edgeSegments, roads);
      const outfalls = createWaterwayOutfalls(waterway.id, center, length, this.config.waterwayWidth, edgeSegments);
      const channels = createWaterwayChannels(waterway.id, center, length, this.config.waterwayWidth, edgeSegments);

      return {
        id: waterway.id,
        kind: 'waterway',
        ownerDomain: 'land',
        name: waterway.name,
        lod: 'lod1',
        waterwayKind: waterway.waterwayKind,
        center,
        length,
        width: this.config.waterwayWidth,
        boundary,
        flowDirection: 'eastbound',
        edgeSegments,
        channels,
        crossingRefs,
        culverts,
        docks,
        outfalls,
        connectedWaterwayIds: []
      };
    });
  }

  generateTreePlantings(parks: ParkPatch[]): TreePlanting[] {
    const trees: TreePlanting[] = [];

    for (const park of parks) {
      const treeCount = Math.max(8, Math.floor((park.size.x * park.size.z) / 260));

      for (let index = 0; index < treeCount; index += 1) {
        const angle = index * 2.399963;
        const radius = Math.sqrt((index + 0.5) / treeCount);
        const center = {
          x: park.center.x + Math.cos(angle) * radius * park.size.x * 0.42,
          z: park.center.z + Math.sin(angle) * radius * park.size.z * 0.42
        };
        const species = CITY_BLUEPRINT.treeSpeciesCycle[index % CITY_BLUEPRINT.treeSpeciesCycle.length];

        trees.push({
          id: `${park.id}-tree-${index}`,
          kind: 'tree-planting',
          ownerDomain: 'public-realm',
          parentId: park.id,
          plantingContext: 'park',
          parkId: park.id,
          lod: 'lod2',
          center,
          species,
          height: species === 'palm' ? 6.8 : 6.2,
          canopyDiameter: species === 'palm' ? 3.2 : 4.2
        });
      }
    }

    return trees;
  }

  getExcludedBlocks(bounds: CityBounds, constraints: readonly ConstraintPlan[]): Set<string> {
    const excluded = new Set<string>();
    const exclusionConstraints = constraints.filter(
      (constraint) =>
        constraint.prohibitedObjectKinds.includes('parcel') || constraint.prohibitedObjectKinds.includes('building')
    );

    for (let blockX = 0; blockX < this.config.gridSize; blockX += 1) {
      for (let blockZ = 0; blockZ < this.config.gridSize; blockZ += 1) {
        const center = this.getBlockCenter(bounds, blockX, blockZ);

        if (exclusionConstraints.some((constraint) => isPointInsidePolygon(center, constraint.boundary))) {
          excluded.add(blockKey(blockX, blockZ));
        }
      }
    }

    return excluded;
  }

  private getBlockCenter(bounds: CityBounds, blockX: number, blockZ: number): { x: number; z: number } {
    return {
      x: -bounds.halfSpan + this.config.roadWidth + this.config.blockSize / 2 + blockX * bounds.spacing,
      z: -bounds.halfSpan + this.config.roadWidth + this.config.blockSize / 2 + blockZ * bounds.spacing
    };
  }
}

interface ParkFeatureTemplate {
  readonly name: string;
  readonly featureKind: ParkFeature['featureKind'];
  readonly programKind: ParkFeature['programKind'];
  readonly surface: ParkFeature['surface'];
  readonly lod: ParkFeature['lod'];
  readonly accessible: boolean;
  readonly offset: { readonly x: number; readonly z: number };
  readonly sizeRatio: { readonly x: number; readonly z: number };
  readonly capacityPeople?: number;
}

function createParkFeatureTemplates(park: ParkPatch): readonly ParkFeatureTemplate[] {
  const programKind = park.id === 'civic-plaza'
    ? 'civic-gathering'
    : park.id === 'riverside-green'
      ? 'waterfront-open-space'
      : 'passive-recreation';

  return [
    {
      name: 'Lawn',
      featureKind: 'lawn',
      programKind,
      surface: 'grass',
      lod: 'lod1',
      accessible: true,
      offset: { x: 0, z: 0 },
      sizeRatio: { x: 0.62, z: 0.46 },
      capacityPeople: Math.round((park.size.x * park.size.z) / 18)
    },
    {
      name: 'Primary Path',
      featureKind: 'path',
      programKind,
      surface: 'compacted-gravel',
      lod: 'lod2',
      accessible: true,
      offset: { x: 0, z: -0.28 },
      sizeRatio: { x: 0.84, z: 0.06 }
    },
    {
      name: 'Cross Path',
      featureKind: 'path',
      programKind,
      surface: 'compacted-gravel',
      lod: 'lod2',
      accessible: true,
      offset: { x: -0.28, z: 0 },
      sizeRatio: { x: 0.06, z: 0.76 }
    },
    {
      name: 'Planting Bed',
      featureKind: 'planting',
      programKind: 'ecological-buffer',
      surface: 'planting-bed',
      lod: 'lod2',
      accessible: false,
      offset: { x: 0.32, z: 0.28 },
      sizeRatio: { x: 0.24, z: 0.22 }
    },
    {
      name: 'Active Recreation',
      featureKind: 'sports',
      programKind: 'active-recreation',
      surface: 'play-surface',
      lod: 'lod2',
      accessible: true,
      offset: { x: 0.26, z: -0.18 },
      sizeRatio: { x: 0.24, z: 0.2 },
      capacityPeople: 18
    },
    {
      name: 'Seating Grove',
      featureKind: 'seating',
      programKind,
      surface: 'timber',
      lod: 'lod3',
      accessible: true,
      offset: { x: -0.28, z: 0.28 },
      sizeRatio: { x: 0.18, z: 0.12 },
      capacityPeople: 12
    },
    {
      name: park.id === 'riverside-green' ? 'Water Overlook' : 'Water Feature',
      featureKind: 'water-feature',
      programKind: park.id === 'riverside-green' ? 'waterfront-open-space' : programKind,
      surface: 'water',
      lod: 'lod2',
      accessible: true,
      offset: { x: 0.12, z: 0.22 },
      sizeRatio: { x: 0.16, z: 0.12 },
      capacityPeople: 8
    },
    {
      name: 'Shade Structure',
      featureKind: 'shade',
      programKind,
      surface: 'paving',
      lod: 'lod3',
      accessible: true,
      offset: { x: -0.18, z: -0.18 },
      sizeRatio: { x: 0.18, z: 0.12 },
      capacityPeople: 10
    }
  ];
}

function offsetPoint(
  center: ParkPatch['center'],
  size: ParkPatch['size'],
  offset: { readonly x: number; readonly z: number }
): ParkPatch['center'] {
  return {
    x: center.x + size.x * offset.x,
    z: center.z + size.z * offset.z
  };
}

function getNearestSidewalkIds(park: ParkPatch, roads: readonly RoadSegment[], limit: number): string[] {
  return roads
    .flatMap((road) =>
      road.sidewalks.map((sidewalk) => ({
        id: sidewalk.id,
        distance: distanceFromParkToRoad(park, road)
      }))
    )
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
    .slice(0, limit)
    .map((sidewalk) => sidewalk.id);
}

function distanceFromParkToRoad(park: ParkPatch, road: RoadSegment): number {
  const halfX = park.size.x / 2;
  const halfZ = park.size.z / 2;

  if (road.orientation === 'vertical') {
    return Math.max(0, Math.abs(road.center.x - park.center.x) - halfX);
  }

  return Math.max(0, Math.abs(road.center.z - park.center.z) - halfZ);
}

export function blockKey(blockX: number, blockZ: number): string {
  return `${blockX}:${blockZ}`;
}

type BlueprintWaterway = (typeof CITY_BLUEPRINT.waterways)[number];
type WaterwayEdgeSegment = Waterway['edgeSegments'][number];
type WaterwayCrossingRef = Waterway['crossingRefs'][number];

function createWaterwayEdgeSegments(
  waterway: BlueprintWaterway,
  center: { readonly x: number; readonly z: number },
  length: number,
  width: number
): WaterwayEdgeSegment[] {
  const segmentCount = 4;
  const segmentLength = length / segmentCount;
  const minX = center.x - length / 2;

  return (['north', 'south'] as const).flatMap((side) => {
    const z = center.z + (side === 'north' ? 1 : -1) * (width / 2);

    return Array.from({ length: segmentCount }, (_, index) => {
      const startX = minX + index * segmentLength;
      const endX = startX + segmentLength;
      const id = `${waterway.id}-edge-${side}-${index}`;
      const connectedSegmentIds = [
        ...(index > 0 ? [`${waterway.id}-edge-${side}-${index - 1}`] : []),
        ...(index < segmentCount - 1 ? [`${waterway.id}-edge-${side}-${index + 1}`] : [])
      ];

      return {
        id,
        side,
        edgeKind: waterway.edgeCharacter[side],
        centerline: [
          { x: startX, z },
          { x: endX, z }
        ],
        lengthMeters: segmentLength,
        connectedSegmentIds,
        publicAccess: side === 'north',
        districtIds: side === 'north' ? ['district-waterfront', 'district-downtown'] : ['district-waterfront']
      };
    });
  });
}

function createWaterwayCrossings(
  waterwayId: string,
  center: { readonly x: number; readonly z: number },
  length: number,
  roads: readonly RoadSegment[],
  edgeSegments: readonly WaterwayEdgeSegment[]
): WaterwayCrossingRef[] {
  const minX = center.x - length / 2;
  const maxX = center.x + length / 2;

  return roads
    .filter((road) => road.orientation === 'vertical' && road.center.x >= minX && road.center.x <= maxX)
    .map((road) => {
      const edgeSegmentIds = getOppositeEdgeSegmentIds(waterwayId, road.center.x, minX, length, edgeSegments);

      const isGradeSeparated = road.hierarchy === 'arterial' || road.hierarchy === 'transit-corridor';

      return {
        id: `${waterwayId}-crossing-${road.id}`,
        crossingKind: isGradeSeparated ? 'bridge' : 'culvert',
        roadId: road.id,
        center: { x: road.center.x, z: center.z },
        edgeSegmentIds,
        clearanceMeters: isGradeSeparated ? 5.2 : 2.4
      };
    });
}

function createWaterwayDocks(
  waterwayId: string,
  center: { readonly x: number; readonly z: number },
  length: number,
  width: number,
  edgeSegments: readonly WaterwayEdgeSegment[],
  roads: readonly RoadSegment[]
): Waterway['docks'] {
  const minX = center.x - length / 2;
  const dockOffsets = [-0.22, 0.04, 0.31];

  return dockOffsets.map((normalizedOffset, index) => {
    const x = center.x + length * normalizedOffset;
    const edgeSegmentId = getEdgeSegmentId(waterwayId, 'north', x, minX, length, edgeSegments);
    const accessRoad = nearestVerticalRoad(roads, x);

    return {
      id: `${waterwayId}-dock-${index}`,
      edgeSegmentId,
      center: { x, z: center.z + width / 2 + 4 },
      use: index === 1 ? 'ferry' : index === 2 ? 'service' : 'recreation',
      lengthMeters: 18 + index * 4,
      widthMeters: 5,
      ...(accessRoad ? { accessRoadId: accessRoad.id } : {})
    };
  });
}

function createWaterwayOutfalls(
  waterwayId: string,
  center: { readonly x: number; readonly z: number },
  length: number,
  width: number,
  edgeSegments: readonly WaterwayEdgeSegment[]
): Waterway['outfalls'] {
  const minX = center.x - length / 2;
  const outfallInputs = [
    { side: 'north' as const, normalizedOffset: -0.36, source: 'stormwater' as const },
    { side: 'north' as const, normalizedOffset: 0.18, source: 'treated-water' as const },
    { side: 'south' as const, normalizedOffset: -0.08, source: 'stormwater' as const },
    { side: 'south' as const, normalizedOffset: 0.38, source: 'overflow' as const }
  ];

  return outfallInputs.map((input, index) => {
    const x = center.x + length * input.normalizedOffset;
    const z = center.z + (input.side === 'north' ? 1 : -1) * (width / 2 + 1.5);

    return {
      id: `${waterwayId}-outfall-${index}`,
      edgeSegmentId: getEdgeSegmentId(waterwayId, input.side, x, minX, length, edgeSegments),
      center: { x, z },
      source: input.source,
      receivingWaterwayId: waterwayId,
      diameterMeters: input.source === 'overflow' ? 1.8 : 1.2
    };
  });
}

function createWaterwayChannels(
  waterwayId: string,
  center: { readonly x: number; readonly z: number },
  length: number,
  width: number,
  edgeSegments: readonly WaterwayEdgeSegment[]
): Waterway['channels'] {
  const minX = center.x - length / 2;
  const maxX = center.x + length / 2;
  const northZ = center.z + width / 2;
  const southZ = center.z - width / 2;

  return [
    {
      id: `${waterwayId}-channel-main`,
      channelKind: 'main-channel',
      centerline: [
        { x: minX, z: center.z },
        { x: maxX, z: center.z }
      ],
      widthMeters: width * 0.58,
      connectsToEdgeSegmentIds: [
        getEdgeSegmentId(waterwayId, 'north', minX + length * 0.5, minX, length, edgeSegments),
        getEdgeSegmentId(waterwayId, 'south', minX + length * 0.5, minX, length, edgeSegments)
      ],
      navigable: true
    },
    {
      id: `${waterwayId}-channel-market-canal`,
      channelKind: 'canal',
      centerline: [
        { x: center.x - length * 0.22, z: northZ },
        { x: center.x - length * 0.14, z: northZ + width * 0.34 }
      ],
      widthMeters: width * 0.22,
      connectsToEdgeSegmentIds: [getEdgeSegmentId(waterwayId, 'north', center.x - length * 0.2, minX, length, edgeSegments)],
      navigable: true
    },
    {
      id: `${waterwayId}-channel-civic-drain`,
      channelKind: 'drainage-channel',
      centerline: [
        { x: center.x + length * 0.28, z: southZ },
        { x: center.x + length * 0.35, z: southZ - width * 0.28 }
      ],
      widthMeters: width * 0.16,
      connectsToEdgeSegmentIds: [getEdgeSegmentId(waterwayId, 'south', center.x + length * 0.3, minX, length, edgeSegments)],
      navigable: false
    }
  ];
}

function getOppositeEdgeSegmentIds(
  waterwayId: string,
  x: number,
  minX: number,
  length: number,
  edgeSegments: readonly WaterwayEdgeSegment[]
): readonly [string, string] {
  return [
    getEdgeSegmentId(waterwayId, 'north', x, minX, length, edgeSegments),
    getEdgeSegmentId(waterwayId, 'south', x, minX, length, edgeSegments)
  ];
}

function getEdgeSegmentId(
  waterwayId: string,
  side: 'north' | 'south',
  x: number,
  minX: number,
  length: number,
  edgeSegments: readonly WaterwayEdgeSegment[]
): string {
  const segmentIndex = Math.max(0, Math.min(3, Math.floor(((x - minX) / length) * 4)));
  const id = `${waterwayId}-edge-${side}-${segmentIndex}`;

  return edgeSegments.some((segment) => segment.id === id) ? id : `${waterwayId}-edge-${side}-0`;
}

function nearestVerticalRoad(roads: readonly RoadSegment[], x: number): RoadSegment | undefined {
  return roads
    .filter((road) => road.orientation === 'vertical')
    .reduce<RoadSegment | undefined>((nearest, road) => {
      if (!nearest) {
        return road;
      }

      return Math.abs(road.center.x - x) < Math.abs(nearest.center.x - x) ? road : nearest;
    }, undefined);
}
