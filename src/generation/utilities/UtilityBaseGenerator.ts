import type {
  AdministrativeBoundaryPlan,
  DistrictPlan,
  Parcel,
  RoadSegment,
  UtilityEdge,
  UtilityNode
} from '../../types/city';
import type {
  CityId,
  Point2D,
  UtilityCapacityContract,
  UtilityEdgeRole,
  UtilityNetworkKind,
  UtilityNodeRole
} from '../../city/data-contracts/cityContracts';

export interface UtilityBaseInput {
  readonly administrativeBoundaries: readonly AdministrativeBoundaryPlan[];
  readonly districts: readonly DistrictPlan[];
  readonly parcels: readonly Parcel[];
  readonly roads: readonly RoadSegment[];
}

export interface UtilityBaseOutput {
  readonly utilityNodes: UtilityNode[];
  readonly utilityEdges: UtilityEdge[];
}

interface UtilityTemplate {
  readonly utilityType: UtilityNetworkKind;
  readonly nodeRole: UtilityNodeRole;
  readonly edgeRole: UtilityEdgeRole;
  readonly capacity: UtilityCapacityContract;
  readonly ownerEntityId: CityId;
  readonly criticality: UtilityNode['outage']['criticality'];
  readonly backupAvailable: boolean;
}

const UTILITY_TEMPLATES: readonly UtilityTemplate[] = [
  {
    utilityType: 'power',
    nodeRole: 'substation',
    edgeRole: 'feeder',
    capacity: { value: 4200, unit: 'kva', peakLoadFactor: 0.82 },
    ownerEntityId: 'utility-owner-public-power',
    criticality: 'high',
    backupAvailable: true
  },
  {
    utilityType: 'water',
    nodeRole: 'valve',
    edgeRole: 'main',
    capacity: { value: 180, unit: 'liters-per-second', peakLoadFactor: 0.68 },
    ownerEntityId: 'utility-owner-water-authority',
    criticality: 'high',
    backupAvailable: true
  },
  {
    utilityType: 'wastewater',
    nodeRole: 'pump',
    edgeRole: 'main',
    capacity: { value: 150, unit: 'liters-per-second', peakLoadFactor: 0.73 },
    ownerEntityId: 'utility-owner-water-authority',
    criticality: 'medium',
    backupAvailable: true
  },
  {
    utilityType: 'stormwater',
    nodeRole: 'outfall',
    edgeRole: 'main',
    capacity: { value: 240, unit: 'liters-per-second', peakLoadFactor: 0.9 },
    ownerEntityId: 'utility-owner-public-works',
    criticality: 'high',
    backupAvailable: false
  },
  {
    utilityType: 'telecom',
    nodeRole: 'cabinet',
    edgeRole: 'conduit',
    capacity: { value: 10000, unit: 'mbps', peakLoadFactor: 0.58 },
    ownerEntityId: 'utility-owner-fiber-coop',
    criticality: 'medium',
    backupAvailable: true
  },
  {
    utilityType: 'waste',
    nodeRole: 'collection-point',
    edgeRole: 'collection-route',
    capacity: { value: 42, unit: 'tons-per-day', peakLoadFactor: 0.61 },
    ownerEntityId: 'utility-owner-sanitation',
    criticality: 'low',
    backupAvailable: false
  }
];

export class UtilityBaseGenerator {
  create(input: UtilityBaseInput): UtilityBaseOutput {
    const serviceArea = this.getUtilityServiceArea(input.administrativeBoundaries);
    const serviceDistrictIds = input.districts
      .filter((district) => serviceArea.districtIds.includes(district.id) || serviceArea.districtIds.length === 0)
      .map((district) => district.id);
    const districtIds = serviceDistrictIds.length > 0 ? serviceDistrictIds : input.districts.map((district) => district.id);
    const serviceParcels = input.parcels
      .filter((parcel) => parcel.administrativeBoundaryIds.includes(serviceArea.id))
      .slice(0, 72);
    const parcels = serviceParcels.length > 0 ? serviceParcels : input.parcels.slice(0, 72);
    const accessRoads = this.selectAccessRoads(input.roads, serviceArea);
    const nodes = UTILITY_TEMPLATES.map((template, index) =>
      this.createNode({
        template,
        index,
        serviceAreaBoundaryId: serviceArea.id,
        districtIds,
        parcels,
        road: accessRoads[index % accessRoads.length],
        serviceArea
      })
    );
    const edges = nodes.slice(0, -1).map((node, index) => this.createEdge(node, nodes[index + 1], UTILITY_TEMPLATES[index]));
    const edgeIdsByNodeId = new Map<string, string[]>();

    for (const edge of edges) {
      edgeIdsByNodeId.set(edge.fromNodeId, [...(edgeIdsByNodeId.get(edge.fromNodeId) ?? []), edge.id]);
      edgeIdsByNodeId.set(edge.toNodeId, [...(edgeIdsByNodeId.get(edge.toNodeId) ?? []), edge.id]);
    }

    return {
      utilityNodes: nodes.map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? []
      })),
      utilityEdges: edges
    };
  }

  private createNode(input: {
    readonly template: UtilityTemplate;
    readonly index: number;
    readonly serviceAreaBoundaryId: CityId;
    readonly districtIds: readonly CityId[];
    readonly parcels: readonly Parcel[];
    readonly road: RoadSegment;
    readonly serviceArea: AdministrativeBoundaryPlan;
  }): UtilityNode {
    const parcel = input.parcels[(input.index * 11) % input.parcels.length];
    const center = this.getNodeCenter(input.road, input.index, input.serviceArea);
    const id = `utility-node-${input.template.utilityType}-${input.template.nodeRole}-${input.index}`;

    return {
      id,
      kind: 'utility-node',
      ownerDomain: 'utilities',
      parentId: input.road.id,
      lod: 'lod2',
      utilityType: input.template.utilityType,
      nodeRole: input.template.nodeRole,
      center,
      serviceArea: {
        serviceAreaBoundaryId: input.serviceAreaBoundaryId,
        districtIds: input.districtIds,
        parcelIds: input.parcels.map((candidate) => candidate.id),
        criticalObjectIds: [input.road.id, parcel.id]
      },
      capacity: input.template.capacity,
      accessPoint: {
        accessPointKind: input.template.utilityType === 'waste' ? 'surface-cover' : 'roadside-vault',
        objectId: input.road.id,
        position: center,
        clearAccessMeters: input.template.utilityType === 'power' ? 4 : 2.5
      },
      outage: {
        outageDomainId: `outage-domain-${input.template.utilityType}-base`,
        isolationGroupId: `isolation-group-${input.template.utilityType}-core`,
        backupAvailable: input.template.backupAvailable,
        criticality: input.template.criticality
      },
      ownerEntityId: input.template.ownerEntityId,
      connectedEdgeIds: [],
      renderBindingId: `binding:utility:${input.template.utilityType}:base`
    };
  }

  private createEdge(fromNode: UtilityNode, toNode: UtilityNode, template: UtilityTemplate): UtilityEdge {
    return {
      id: `utility-edge-${template.utilityType}-${template.edgeRole}-base`,
      kind: 'utility-edge',
      ownerDomain: 'utilities',
      parentId: fromNode.id,
      lod: 'lod2',
      utilityType: template.utilityType,
      edgeRole: template.edgeRole,
      fromNodeId: fromNode.id,
      toNodeId: toNode.id,
      centerline: [fromNode.center, toNode.center],
      lengthMeters: Number(distance2D(fromNode.center, toNode.center).toFixed(2)),
      serviceAreaBoundaryId: fromNode.serviceArea.serviceAreaBoundaryId,
      capacity: template.capacity,
      accessPointIds: [fromNode.id, toNode.id],
      outageDomainId: fromNode.outage.outageDomainId,
      ownerEntityId: template.ownerEntityId,
      renderBindingId: `binding:utility:${template.utilityType}:base`
    };
  }

  private getUtilityServiceArea(boundaries: readonly AdministrativeBoundaryPlan[]): AdministrativeBoundaryPlan {
    return (
      boundaries.find((boundary) => boundary.id === 'administrative-boundary-service-utilities-east') ??
      boundaries.find((boundary) => boundary.boundaryKind === 'service-area' && boundary.serviceTypes.includes('utilities')) ??
      boundaries.find((boundary) => boundary.boundaryKind === 'city-limit') ??
      boundaries[0]
    );
  }

  private selectAccessRoads(roads: readonly RoadSegment[], serviceArea: AdministrativeBoundaryPlan): readonly RoadSegment[] {
    const serviceRoads = roads.filter((road) => isPointInsideBounds(road.center, serviceArea.boundary));
    const transitRoads = serviceRoads.filter((road) => road.transitEligible);
    if (transitRoads.length >= UTILITY_TEMPLATES.length) {
      return transitRoads;
    }
    return serviceRoads.length > 0 ? serviceRoads : roads.slice(0, UTILITY_TEMPLATES.length);
  }

  private getNodeCenter(road: RoadSegment, index: number, serviceArea: AdministrativeBoundaryPlan): Point2D {
    const [start, end] = road.centerline;
    const t = 0.2 + (index % 4) * 0.18;
    const point = {
      x: Number((start.x + (end.x - start.x) * t).toFixed(2)),
      z: Number((start.z + (end.z - start.z) * t).toFixed(2))
    };
    return clampPointToBounds(point, serviceArea.boundary);
  }
}

function distance2D(start: Point2D, end: Point2D): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function isPointInsideBounds(point: Point2D, boundary: readonly Point2D[]): boolean {
  const bounds = boundary.reduce(
    (result, candidate) => ({
      minX: Math.min(result.minX, candidate.x),
      maxX: Math.max(result.maxX, candidate.x),
      minZ: Math.min(result.minZ, candidate.z),
      maxZ: Math.max(result.maxZ, candidate.z)
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minZ: Number.POSITIVE_INFINITY, maxZ: Number.NEGATIVE_INFINITY }
  );
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}

function clampPointToBounds(point: Point2D, boundary: readonly Point2D[]): Point2D {
  const bounds = boundary.reduce(
    (result, candidate) => ({
      minX: Math.min(result.minX, candidate.x),
      maxX: Math.max(result.maxX, candidate.x),
      minZ: Math.min(result.minZ, candidate.z),
      maxZ: Math.max(result.maxZ, candidate.z)
    }),
    { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, minZ: Number.POSITIVE_INFINITY, maxZ: Number.NEGATIVE_INFINITY }
  );
  return {
    x: Number(Math.min(bounds.maxX, Math.max(bounds.minX, point.x)).toFixed(2)),
    z: Number(Math.min(bounds.maxZ, Math.max(bounds.minZ, point.z)).toFixed(2))
  };
}
