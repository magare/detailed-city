import * as THREE from 'three';
import type {
  CityId,
  CityObjectBase,
  CityObjectIndex,
  CityObjectKind,
  LodTier
} from '../../data-contracts/cityContracts';
import type { CityPlanningLayer } from '../../cityPlan';
import type { CitySceneLayerId } from '../scene-layers/sceneLayerDefinitions';
import type { AccessControl, GeneratedCity, GeneratedRuntimeCityObject, TrafficPlan } from '../../../types/city';

export const CITY_PICKING_USER_DATA_KEY = 'cityPicking';

export interface CityPickingReferences {
  readonly districtId?: CityId;
  readonly blockId?: CityId;
  readonly parcelId?: CityId;
  readonly buildingId?: CityId;
  readonly civicAnchorId?: CityId;
  readonly addressPointId?: CityId;
  readonly placeId?: CityId;
  readonly roadId?: CityId;
  readonly roadSegmentId?: CityId;
  readonly laneId?: CityId;
  readonly parkId?: CityId;
  readonly waterwayId?: CityId;
  readonly waterfrontEdgeId?: CityId;
  readonly waterfrontOpenSpaceId?: CityId;
  readonly plazaZoneId?: CityId;
  readonly serviceAccessCorridorId?: CityId;
  readonly sliceId?: CityId;
  readonly curbZoneId?: CityId;
  readonly intersectionId?: CityId;
  readonly crossingId?: CityId;
  readonly sidewalkId?: CityId;
  readonly transitStopId?: CityId;
  readonly transitRouteId?: CityId;
  readonly navigationNodeId?: CityId;
}

export interface CityPickingMetadata {
  readonly objectId: CityId;
  readonly kind: CityObjectKind;
  readonly ownerDomain: CityPlanningLayer;
  readonly parentId?: CityId;
  readonly lod: LodTier;
  readonly label: string;
  readonly references: CityPickingReferences;
}

export interface CityPickingCatalog {
  readonly ownerDomain: 'rendering-handoff';
  readonly pickableObjects: readonly CityPickingMetadata[];
  readonly pickableObjectIds: readonly CityId[];
  readonly metadataByObjectId: Readonly<Record<CityId, CityPickingMetadata>>;
  readonly countsByKind: Readonly<Partial<Record<CityObjectKind, number>>>;
}

export interface CityPickResult extends CityPickingMetadata {
  readonly renderObjectName: string;
  readonly sceneLayerId?: CitySceneLayerId;
  readonly instanceId?: number;
  readonly distance: number;
}

interface CityPickingUserData {
  readonly metadata?: CityPickingMetadata;
  readonly instances?: readonly CityPickingMetadata[];
}

type PickableObjectSource = Pick<
  GeneratedCity,
  | 'addressPoints'
  | 'accessControls'
  | 'activeFrontages'
  | 'buildings'
  | 'buildingEntrances'
  | 'civicAnchors'
  | 'communityAnchors'
  | 'cultureAnchors'
  | 'educationAnchors'
  | 'curbActivations'
  | 'emergencyServiceAnchors'
  | 'governmentAnchors'
  | 'healthcareAnchors'
  | 'gazetteerEntries'
  | 'namedPlaces'
  | 'parks'
  | 'parkFeatures'
  | 'plazaZones'
  | 'publicAmenities'
  | 'roads'
  | 'streetFurniture'
  | 'streetLights'
  | 'trafficCalmingDevices'
  | 'transitRoutes'
  | 'transitStops'
  | 'trees'
  | 'waterTransportAccess'
  | 'waterfrontEdges'
  | 'waterfrontOpenSpaces'
  | 'waterways'
>;

export function createCityPickingMetadataCatalog(
  city: PickableObjectSource,
  traffic: TrafficPlan,
  objectIndex?: CityObjectIndex
): CityPickingCatalog {
  const pickableObjects: GeneratedRuntimeCityObject[] = [
    ...city.roads,
    ...city.addressPoints,
    ...city.buildings,
    ...city.buildingEntrances,
    ...city.namedPlaces,
    ...city.gazetteerEntries,
    ...city.accessControls,
    ...city.civicAnchors,
    ...city.communityAnchors,
    ...city.cultureAnchors,
    ...city.educationAnchors,
    ...city.governmentAnchors,
    ...city.healthcareAnchors,
    ...city.emergencyServiceAnchors,
    ...city.activeFrontages,
    ...city.parks,
    ...city.parkFeatures,
    ...city.plazaZones,
    ...city.curbActivations,
    ...city.publicAmenities,
    ...city.waterways,
    ...city.waterfrontEdges,
    ...city.waterfrontOpenSpaces,
    ...city.trees,
    ...city.streetLights,
    ...city.streetFurniture,
    ...city.transitStops,
    ...city.transitRoutes,
    ...city.trafficCalmingDevices,
    ...city.waterTransportAccess,
    ...traffic.markings,
    ...traffic.vehicles
  ];
  const pickableMetadata = pickableObjects.map((object) => createCityPickingMetadata(object, objectIndex));
  const metadataByObjectId: Record<CityId, CityPickingMetadata> = {};
  const countsByKind: Partial<Record<CityObjectKind, number>> = {};

  for (const metadata of pickableMetadata) {
    metadataByObjectId[metadata.objectId] = metadata;
    countsByKind[metadata.kind] = (countsByKind[metadata.kind] ?? 0) + 1;
  }

  return {
    ownerDomain: 'rendering-handoff',
    pickableObjects: pickableMetadata,
    pickableObjectIds: pickableMetadata.map((metadata) => metadata.objectId),
    metadataByObjectId,
    countsByKind
  };
}

export function createCityPickingMetadata(
  object: CityObjectBase,
  objectIndex?: CityObjectIndex
): CityPickingMetadata {
  return {
    objectId: object.id,
    kind: object.kind,
    ownerDomain: object.ownerDomain,
    parentId: object.parentId,
    lod: object.lod,
    label: object.name ?? object.id,
    references: createPickingReferences(object, objectIndex)
  };
}

export function attachCityPickingMetadata(object: THREE.Object3D, metadata: CityPickingMetadata): void {
  object.userData[CITY_PICKING_USER_DATA_KEY] = {
    metadata
  } satisfies CityPickingUserData;
}

export function attachCityPickingInstanceMetadata(
  object: THREE.Object3D,
  instances: readonly CityPickingMetadata[]
): void {
  object.userData[CITY_PICKING_USER_DATA_KEY] = {
    instances
  } satisfies CityPickingUserData;
}

export function resolveCityPickFromIntersections(
  intersections: readonly THREE.Intersection[]
): CityPickResult | undefined {
  for (const intersection of intersections) {
    const result = resolveCityPickFromIntersection(intersection);

    if (result) {
      return result;
    }
  }

  return undefined;
}

export function resolveCityPickFromIntersection(intersection: THREE.Intersection): CityPickResult | undefined {
  const picking = getCityPickingUserData(intersection.object);
  const metadata =
    typeof intersection.instanceId === 'number'
      ? picking?.instances?.[intersection.instanceId] ?? picking?.metadata
      : picking?.metadata;

  if (!metadata) {
    return undefined;
  }

  return {
    ...metadata,
    renderObjectName: intersection.object.name,
    sceneLayerId: getSceneLayerId(intersection.object),
    instanceId: typeof intersection.instanceId === 'number' ? intersection.instanceId : undefined,
    distance: intersection.distance
  };
}

function createPickingReferences(object: CityObjectBase, objectIndex?: CityObjectIndex): CityPickingReferences {
  const references: WritableCityPickingReferences = {};
  const record = object as unknown as Record<string, unknown>;

  copyStringReference(record, references, 'districtId');
  copyStringReference(record, references, 'blockId');
  copyStringReference(record, references, 'buildingId');
  copyStringReference(record, references, 'civicAnchorId');
  copyStringReference(record, references, 'addressPointId');
  copyStringReference(record, references, 'placeId');
  copyStringReference(record, references, 'parcelId');
  copyStringReference(record, references, 'roadId');
  copyStringReference(record, references, 'roadSegmentId');
  copyStringReference(record, references, 'laneId');
  copyStringReference(record, references, 'parkId');
  copyStringReference(record, references, 'waterfrontOpenSpaceId');
  copyStringReference(record, references, 'plazaZoneId');
  copyStringReference(record, references, 'serviceAccessCorridorId');
  copyStringReference(record, references, 'sliceId');
  copyStringReference(record, references, 'curbZoneId');
  copyStringReference(record, references, 'intersectionId');
  copyStringReference(record, references, 'crossingId');
  copyStringReference(record, references, 'sidewalkId');
  copyStringReference(record, references, 'transitStopId');
  copyStringReference(record, references, 'transitRouteId');

  if (object.kind === 'building') {
    references.buildingId = object.id;
    const parcelId = typeof record.parcelId === 'string' ? record.parcelId : undefined;
    const parcel = parcelId ? objectIndex?.objectsById[parcelId] : undefined;

    if (parcel) {
      const parcelRecord = parcel as unknown as Record<string, unknown>;
      references.blockId ??= typeof parcelRecord.blockId === 'string' ? parcelRecord.blockId : undefined;
      references.districtId ??= typeof parcelRecord.districtId === 'string' ? parcelRecord.districtId : undefined;
    }
  }

  if (object.kind === 'road-segment') {
    references.roadId = object.id;
  } else if (object.kind === 'civic-anchor') {
    references.buildingId = typeof record.buildingId === 'string' ? record.buildingId : object.parentId;
  } else if (object.kind === 'community-anchor') {
    references.buildingId = typeof record.buildingId === 'string' ? record.buildingId : undefined;
  } else if (object.kind === 'culture-anchor') {
    references.buildingId = typeof record.buildingId === 'string' ? record.buildingId : undefined;
  } else if (object.kind === 'government-anchor') {
    references.buildingId = typeof record.buildingId === 'string' ? record.buildingId : undefined;
  } else if (object.kind === 'education-anchor') {
    references.buildingId = typeof record.buildingId === 'string' ? record.buildingId : undefined;
    references.roadId = typeof record.roadId === 'string' ? record.roadId : undefined;
    const access = record.access as
      | {
          dropOffCurbZoneIds?: readonly unknown[];
          transitStopIds?: readonly unknown[];
          accessibleNavigationNodeIds?: readonly unknown[];
        }
      | undefined;
    references.curbZoneId =
      typeof access?.dropOffCurbZoneIds?.[0] === 'string' ? access.dropOffCurbZoneIds[0] : references.curbZoneId;
    references.transitStopId =
      typeof access?.transitStopIds?.[0] === 'string' ? access.transitStopIds[0] : references.transitStopId;
    references.navigationNodeId =
      typeof access?.accessibleNavigationNodeIds?.[0] === 'string'
        ? access.accessibleNavigationNodeIds[0]
        : references.navigationNodeId;
  } else if (object.kind === 'healthcare-anchor') {
    references.buildingId = typeof record.buildingId === 'string' ? record.buildingId : undefined;
    references.roadId = typeof record.roadId === 'string' ? record.roadId : undefined;
    const arrivals = record.arrivals as
      | {
          transitStopIds?: readonly unknown[];
          ambulanceNavigationNodeIds?: readonly unknown[];
        }
      | undefined;
    references.transitStopId =
      typeof arrivals?.transitStopIds?.[0] === 'string' ? arrivals.transitStopIds[0] : references.transitStopId;
    references.navigationNodeId =
      typeof arrivals?.ambulanceNavigationNodeIds?.[0] === 'string'
        ? arrivals.ambulanceNavigationNodeIds[0]
        : references.navigationNodeId;
  } else if (object.kind === 'named-place') {
    references.roadId =
      record.placeKind === 'street' && typeof record.sourceObjectId === 'string' ? record.sourceObjectId : undefined;
  } else if (object.kind === 'access-control') {
    const accessControl = object as AccessControl;
    references.roadId = accessControl.roadIds[0];
    references.sidewalkId = accessControl.sidewalkIds[0];
    references.crossingId = accessControl.crossingIds[0];
    references.transitStopId = accessControl.transitStopIds[0];
  } else if (object.kind === 'transit-stop') {
    references.transitStopId = object.id;
  } else if (object.kind === 'transit-route') {
    references.transitRouteId = object.id;
  } else if (object.kind === 'park') {
    references.parkId = object.id;
  } else if (object.kind === 'plaza-zone') {
    references.parkId = typeof record.plazaId === 'string' ? record.plazaId : object.parentId;
  } else if (object.kind === 'waterway') {
    references.waterwayId = object.id;
  } else if (object.kind === 'waterfront-edge') {
    references.waterfrontEdgeId = object.id;
  } else if (object.kind === 'waterfront-open-space') {
    references.waterfrontEdgeId = typeof record.waterfrontEdgeId === 'string' ? record.waterfrontEdgeId : object.parentId;
    references.waterwayId = typeof record.waterwayId === 'string' ? record.waterwayId : undefined;
  } else if (object.kind === 'water-transport-access') {
    references.waterwayId = typeof record.waterwayId === 'string' ? record.waterwayId : undefined;
    references.waterfrontEdgeId = typeof record.waterfrontEdgeId === 'string' ? record.waterfrontEdgeId : undefined;
    references.waterfrontOpenSpaceId =
      typeof record.waterfrontOpenSpaceId === 'string' ? record.waterfrontOpenSpaceId : undefined;
    const routing = record.routing as
      | {
          connectedRoadIds?: readonly unknown[];
          navigationNodeIds?: readonly unknown[];
        }
      | undefined;
    references.roadId =
      typeof record.roadId === 'string'
        ? record.roadId
        : typeof routing?.connectedRoadIds?.[0] === 'string'
          ? routing.connectedRoadIds[0]
          : undefined;
    references.navigationNodeId =
      typeof routing?.navigationNodeIds?.[0] === 'string' ? routing.navigationNodeIds[0] : undefined;
  } else if (
    (object.kind === 'lane-marking' || object.kind === 'traffic-vehicle') &&
    !references.roadId &&
    object.parentId
  ) {
    references.roadId = object.parentId;
  }

  return references;
}

function getCityPickingUserData(object: THREE.Object3D): CityPickingUserData | undefined {
  return object.userData[CITY_PICKING_USER_DATA_KEY] as CityPickingUserData | undefined;
}

function getSceneLayerId(object: THREE.Object3D): CitySceneLayerId | undefined {
  let current: THREE.Object3D | null = object;

  while (current) {
    const sceneLayerId = current.userData.sceneLayerId;

    if (typeof sceneLayerId === 'string') {
      return sceneLayerId as CitySceneLayerId;
    }

    current = current.parent;
  }

  return undefined;
}

function copyStringReference(
  source: Record<string, unknown>,
  target: WritableCityPickingReferences,
  key: keyof CityPickingReferences
): void {
  const value = source[key];

  if (typeof value === 'string') {
    target[key] = value;
  }
}

type WritableCityPickingReferences = Partial<Record<keyof CityPickingReferences, CityId>>;
