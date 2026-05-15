import type {
  BuildingPlan,
  CadastreRecord,
  Parcel,
  RoadSegment,
  ServiceAccessCorridor,
  UtilityEdge,
  UtilityNode
} from '../../types/city';
import type {
  CityId,
  Point2D,
  ServiceAccessCorridorKind,
  ServiceAccessRestrictionKind,
  ServiceAccessSurfaceKind
} from '../../city/data-contracts/cityContracts';
import { getPolygonBounds, rectanglePolygon } from '../../utils/geometry';

export interface ServiceAccessCorridorInput {
  readonly cadastreRecords: readonly CadastreRecord[];
  readonly parcels: readonly Parcel[];
  readonly buildings: readonly BuildingPlan[];
  readonly roads: readonly RoadSegment[];
  readonly utilityNodes: readonly UtilityNode[];
  readonly utilityEdges: readonly UtilityEdge[];
}

export interface ServiceAccessCorridorOutput {
  readonly serviceAccessCorridors: ServiceAccessCorridor[];
  readonly buildings: BuildingPlan[];
  readonly utilityNodes: UtilityNode[];
  readonly utilityEdges: UtilityEdge[];
}

export class ServiceAccessCorridorGenerator {
  create(input: ServiceAccessCorridorInput): ServiceAccessCorridorOutput {
    const parcelsById = new Map(input.parcels.map((parcel) => [parcel.id, parcel]));
    const buildingsByParcelId = groupBuildingsByParcelId(input.buildings);
    const corridors = [
      ...this.createUtilityEasementCorridors(input.cadastreRecords, parcelsById, buildingsByParcelId),
      ...this.createVaultAccessCorridors(input.utilityNodes),
      ...this.createMaintenancePathCorridors(input.utilityEdges, input.utilityNodes),
      ...this.createServiceYardCorridors(input.buildings),
      ...this.createRestrictedCorridors(input.utilityNodes, input.roads)
    ];
    const corridorIdsByBuildingId = new Map<CityId, CityId[]>();
    const corridorIdsByUtilityNodeId = new Map<CityId, CityId[]>();
    const corridorIdsByUtilityEdgeId = new Map<CityId, CityId[]>();

    for (const corridor of corridors) {
      addReferences(corridorIdsByBuildingId, corridor.buildingIds, corridor.id);
      addReferences(corridorIdsByUtilityNodeId, corridor.utilityNodeIds, corridor.id);
      addReferences(corridorIdsByUtilityEdgeId, corridor.utilityEdgeIds, corridor.id);
    }

    return {
      serviceAccessCorridors: corridors,
      buildings: input.buildings.map((building) => ({
        ...building,
        serviceAccessCorridorIds: sortedReferences(corridorIdsByBuildingId.get(building.id))
      })),
      utilityNodes: input.utilityNodes.map((node) => ({
        ...node,
        serviceAccessCorridorIds: sortedReferences(corridorIdsByUtilityNodeId.get(node.id))
      })),
      utilityEdges: input.utilityEdges.map((edge) => ({
        ...edge,
        serviceAccessCorridorIds: sortedReferences(corridorIdsByUtilityEdgeId.get(edge.id))
      }))
    };
  }

  private createUtilityEasementCorridors(
    records: readonly CadastreRecord[],
    parcelsById: ReadonlyMap<CityId, Parcel>,
    buildingsByParcelId: ReadonlyMap<CityId, readonly BuildingPlan[]>
  ): ServiceAccessCorridor[] {
    return records.flatMap((record, index) => {
      const parcel = parcelsById.get(record.parcelId);
      const utilityEasement = record.easements.find((easement) => easement.easementKind === 'utility');

      if (!parcel || !utilityEasement) {
        return [];
      }

      const buildingIds = (buildingsByParcelId.get(parcel.id) ?? []).map((building) => building.id);

      return [
        createCorridor({
          id: `service-access-corridor-utility-easement-${index}`,
          kind: 'utility-easement',
          parentId: parcel.id,
          center: polygonCenter(utilityEasement.boundary),
          boundary: utilityEasement.boundary,
          lengthMeters: polygonLongAxisMeters(utilityEasement.boundary),
          widthMeters: utilityEasement.widthMeters,
          clearAccessMeters: Math.max(utilityEasement.widthMeters, 2),
          surface: parcel.district === 'industrial' ? 'asphalt' : 'concrete',
          buildingIds,
          parcelIds: [parcel.id],
          cadastreRecordIds: [record.id],
          cadastreEasementIds: [utilityEasement.id],
          restricted: true,
          restrictions: ['authorized-only', 'heavy-vehicle'],
          emergencyAccess: false
        })
      ];
    });
  }

  private createVaultAccessCorridors(nodes: readonly UtilityNode[]): ServiceAccessCorridor[] {
    return nodes.map((node, index) =>
      createCorridor({
        id: `service-access-corridor-vault-access-${index}`,
        kind: 'vault-access',
        parentId: node.id,
        center: node.accessPoint.position,
        boundary: rectanglePolygon(node.accessPoint.position, { x: node.accessPoint.clearAccessMeters + 2, z: node.accessPoint.clearAccessMeters + 2 }),
        lengthMeters: node.accessPoint.clearAccessMeters + 2,
        widthMeters: node.accessPoint.clearAccessMeters + 2,
        clearAccessMeters: node.accessPoint.clearAccessMeters,
        surface: node.accessPoint.accessPointKind === 'surface-cover' ? 'concrete' : 'paver',
        utilityNodeIds: [node.id],
        roadIds: node.accessPoint.objectId.startsWith('road-') ? [node.accessPoint.objectId] : [],
        restricted: true,
        restrictions: ['authorized-only'],
        emergencyAccess: node.outage.criticality === 'high'
      })
    );
  }

  private createMaintenancePathCorridors(edges: readonly UtilityEdge[], nodes: readonly UtilityNode[]): ServiceAccessCorridor[] {
    const nodesById = new Map(nodes.map((node) => [node.id, node]));

    return edges.map((edge, index) => {
      const fromNode = nodesById.get(edge.fromNodeId);
      const toNode = nodesById.get(edge.toNodeId);
      const center = midpoint(edge.centerline[0], edge.centerline[edge.centerline.length - 1]);
      const widthMeters = edge.utilityType === 'power' || edge.utilityType === 'stormwater' ? 4 : 3;

      return createCorridor({
        id: `service-access-corridor-maintenance-path-${index}`,
        kind: 'maintenance-path',
        parentId: edge.id,
        center,
        boundary: centerlineEnvelope(edge.centerline, widthMeters),
        lengthMeters: edge.lengthMeters,
        widthMeters,
        clearAccessMeters: widthMeters,
        surface: edge.utilityType === 'waste' ? 'asphalt' : 'gravel',
        utilityNodeIds: [edge.fromNodeId, edge.toNodeId],
        utilityEdgeIds: [edge.id],
        parcelIds: [...new Set([...(fromNode?.serviceArea.parcelIds.slice(0, 2) ?? []), ...(toNode?.serviceArea.parcelIds.slice(0, 2) ?? [])])],
        roadIds: [fromNode?.parentId, toNode?.parentId].filter((id): id is string => Boolean(id?.startsWith('road-'))),
        restricted: true,
        restrictions: ['authorized-only', 'daytime-access'],
        emergencyAccess: edge.utilityType === 'power' || edge.utilityType === 'stormwater'
      });
    });
  }

  private createServiceYardCorridors(buildings: readonly BuildingPlan[]): ServiceAccessCorridor[] {
    return buildings
      .filter((building) => building.typology.serviceAccess === 'yard-loading')
      .map((building, index) =>
        createCorridor({
          id: `service-access-corridor-service-yard-${index}`,
          kind: 'service-yard',
          parentId: building.id,
          center: {
            x: building.center.x,
            z: Number((building.center.z - building.size.z / 2 - 3).toFixed(2))
          },
          boundary: rectanglePolygon(
            {
              x: building.center.x,
              z: Number((building.center.z - building.size.z / 2 - 3).toFixed(2))
            },
            { x: Math.max(6, building.size.x * 0.45), z: 6 }
          ),
          lengthMeters: Math.max(6, building.size.x * 0.45),
          widthMeters: 6,
          clearAccessMeters: 4,
          surface: 'asphalt',
          buildingIds: [building.id],
          parcelIds: [building.parcelId],
          roadIds: [building.primaryFrontageRoadId],
          restricted: true,
          restrictions: ['authorized-only', 'heavy-vehicle'],
          emergencyAccess: true
        })
      );
  }

  private createRestrictedCorridors(nodes: readonly UtilityNode[], roads: readonly RoadSegment[]): ServiceAccessCorridor[] {
    const roadsById = new Map(roads.map((road) => [road.id, road]));

    return nodes
      .filter((node) => node.outage.criticality === 'high')
      .slice(0, 4)
      .map((node, index) => {
        const road = node.parentId ? roadsById.get(node.parentId) : undefined;
        const center = road ? midpoint(road.centerline[0], road.centerline[1]) : node.center;

        return createCorridor({
          id: `service-access-corridor-restricted-corridor-${index}`,
          kind: 'restricted-corridor',
          parentId: node.parentId,
          center,
          boundary: road ? centerlineEnvelope(road.centerline, 5) : rectanglePolygon(center, { x: 10, z: 5 }),
          lengthMeters: road?.length ?? 10,
          widthMeters: 5,
          clearAccessMeters: 4,
          surface: 'concrete',
          utilityNodeIds: [node.id],
          roadIds: road ? [road.id] : [],
          restricted: true,
          restrictions: ['authorized-only', 'emergency-only'],
          emergencyAccess: true
        });
      });
  }
}

function createCorridor(input: {
  readonly id: CityId;
  readonly kind: ServiceAccessCorridorKind;
  readonly parentId?: CityId;
  readonly center: Point2D;
  readonly boundary: readonly Point2D[];
  readonly lengthMeters: number;
  readonly widthMeters: number;
  readonly clearAccessMeters: number;
  readonly surface: ServiceAccessSurfaceKind;
  readonly utilityNodeIds?: readonly CityId[];
  readonly utilityEdgeIds?: readonly CityId[];
  readonly buildingIds?: readonly CityId[];
  readonly parcelIds?: readonly CityId[];
  readonly cadastreRecordIds?: readonly CityId[];
  readonly cadastreEasementIds?: readonly CityId[];
  readonly roadIds?: readonly CityId[];
  readonly restricted: boolean;
  readonly restrictions: readonly ServiceAccessRestrictionKind[];
  readonly emergencyAccess: boolean;
}): ServiceAccessCorridor {
  return {
    id: input.id,
    kind: 'service-access-corridor',
    ownerDomain: 'utilities',
    parentId: input.parentId,
    lod: 'lod2',
    corridorKind: input.kind,
    surface: input.surface,
    center: input.center,
    boundary: input.boundary,
    lengthMeters: Number(input.lengthMeters.toFixed(2)),
    widthMeters: Number(input.widthMeters.toFixed(2)),
    clearAccessMeters: Number(input.clearAccessMeters.toFixed(2)),
    utilityNodeIds: input.utilityNodeIds ?? [],
    utilityEdgeIds: input.utilityEdgeIds ?? [],
    buildingIds: input.buildingIds ?? [],
    parcelIds: input.parcelIds ?? [],
    cadastreRecordIds: input.cadastreRecordIds ?? [],
    cadastreEasementIds: input.cadastreEasementIds ?? [],
    roadIds: input.roadIds ?? [],
    restricted: input.restricted,
    restrictions: input.restrictions,
    authorizedRoleIds: ['role:utility-maintenance', input.emergencyAccess ? 'role:emergency-services' : 'role:service-contractor'],
    maintenanceWindow: {
      startHour: input.emergencyAccess ? 0 : 7,
      endHour: input.emergencyAccess ? 23 : 19,
      days: input.emergencyAccess ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] : ['mon', 'tue', 'wed', 'thu', 'fri']
    },
    emergencyAccess: input.emergencyAccess
  };
}

function groupBuildingsByParcelId(buildings: readonly BuildingPlan[]): Map<CityId, BuildingPlan[]> {
  const groups = new Map<CityId, BuildingPlan[]>();

  for (const building of buildings) {
    groups.set(building.parcelId, [...(groups.get(building.parcelId) ?? []), building]);
  }

  return groups;
}

function addReferences(target: Map<CityId, CityId[]>, objectIds: readonly CityId[], corridorId: CityId): void {
  for (const objectId of objectIds) {
    target.set(objectId, [...(target.get(objectId) ?? []), corridorId]);
  }
}

function sortedReferences(ids: readonly CityId[] | undefined): readonly CityId[] {
  return [...(ids ?? [])].sort();
}

function polygonCenter(points: readonly Point2D[]): Point2D {
  const bounds = getPolygonBounds(points);
  return {
    x: Number(((bounds.minX + bounds.maxX) / 2).toFixed(2)),
    z: Number(((bounds.minZ + bounds.maxZ) / 2).toFixed(2))
  };
}

function polygonLongAxisMeters(points: readonly Point2D[]): number {
  const bounds = getPolygonBounds(points);
  return Number(Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ).toFixed(2));
}

function midpoint(start: Point2D, end: Point2D): Point2D {
  return {
    x: Number(((start.x + end.x) / 2).toFixed(2)),
    z: Number(((start.z + end.z) / 2).toFixed(2))
  };
}

function centerlineEnvelope(centerline: readonly Point2D[], widthMeters: number): readonly Point2D[] {
  const bounds = getPolygonBounds(centerline);

  return rectanglePolygon(
    {
      x: Number(((bounds.minX + bounds.maxX) / 2).toFixed(2)),
      z: Number(((bounds.minZ + bounds.maxZ) / 2).toFixed(2))
    },
    {
      x: Math.max(widthMeters, bounds.maxX - bounds.minX + widthMeters),
      z: Math.max(widthMeters, bounds.maxZ - bounds.minZ + widthMeters)
    }
  );
}
