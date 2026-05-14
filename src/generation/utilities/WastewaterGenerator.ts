import type { BuildingPlan, RoadSegment, UtilityEdge, UtilityNode, Waterway } from '../../types/city';
import type { CityId, Point2D, WastewaterEquipmentKind } from '../../city/data-contracts/cityContracts';

export interface WastewaterInput {
  readonly utilityNodes: readonly UtilityNode[];
  readonly utilityEdges: readonly UtilityEdge[];
  readonly roads: readonly RoadSegment[];
  readonly buildings: readonly BuildingPlan[];
  readonly waterways: readonly Waterway[];
}

export interface WastewaterOutput {
  readonly utilityNodes: UtilityNode[];
  readonly utilityEdges: UtilityEdge[];
  readonly buildings: BuildingPlan[];
}

interface WastewaterNodeTemplate {
  readonly id: CityId;
  readonly equipmentKind: WastewaterEquipmentKind;
  readonly nodeRole: UtilityNode['nodeRole'];
  readonly center: Point2D;
  readonly parentId: CityId;
  readonly capacityLitersPerSecond: number;
  readonly invertElevationMeters: number;
  readonly rimElevationMeters: number;
  readonly criticality: UtilityNode['outage']['criticality'];
  readonly backupAvailable: boolean;
  readonly clearAccessMeters: number;
  readonly servedObjectIds: readonly CityId[];
  readonly wetWellVolumeCubicMeters?: number;
  readonly receivingWaterwayId?: CityId;
}

const OWNER_ENTITY_ID = 'utility-owner-water-authority';
const SERVICE_AREA_BOUNDARY_ID = 'administrative-boundary-service-utilities-east';
const SEWER_BASIN_ID = 'wastewater-basin-downtown-primary';
const SEWER_LINE_ID = 'wastewater-sanitary-main-downtown-primary';
const OUTAGE_DOMAIN_ID = 'outage-domain-wastewater-downtown-primary';
const LIFT_STATION_NODE_ID = 'utility-node-wastewater-lift-station-downtown';
const SERVICE_NODE_ID = 'utility-node-wastewater-service-collector-downtown';
const MANHOLE_NORTH_NODE_ID = 'utility-node-wastewater-manhole-road-v-6-north';
const MANHOLE_EAST_NODE_ID = 'utility-node-wastewater-manhole-road-h-6-east';
const TREATMENT_NODE_ID = 'utility-node-wastewater-treatment-plant-east';
const OUTFALL_NODE_ID = 'utility-node-wastewater-outfall-south-river';
const SERVICE_LATERAL_EDGE_ID = 'utility-edge-wastewater-service-collector-downtown';

export class WastewaterGenerator {
  create(input: WastewaterInput): WastewaterOutput {
    const baseWastewaterNode = input.utilityNodes.find((node) => node.utilityType === 'wastewater');
    const serviceArea = baseWastewaterNode?.serviceArea ?? createFallbackServiceArea(input.buildings);
    const accessRoad = getAccessRoad(input.roads, baseWastewaterNode);
    const wastewaterAnchor = baseWastewaterNode?.center ?? accessRoad.center;
    const detailedStreetRoad = input.roads.find((road) => road.id === 'road-v-6') ?? accessRoad;
    const eastRoad = input.roads.find((road) => road.id === 'road-h-6') ?? detailedStreetRoad;
    const receivingWaterway = input.waterways.find((waterway) => waterway.id === 'waterway-south-river') ?? input.waterways[0];
    const receivingWaterwayId = receivingWaterway?.id ?? 'waterway-south-river';
    const buildingBuckets = createBuildingBuckets(input.buildings, 2);
    const templates: WastewaterNodeTemplate[] = [
      {
        id: baseWastewaterNode?.id ?? LIFT_STATION_NODE_ID,
        equipmentKind: 'lift-station',
        nodeRole: 'lift-station',
        center: baseWastewaterNode?.center ?? wastewaterAnchor,
        parentId: baseWastewaterNode?.parentId ?? accessRoad.id,
        capacityLitersPerSecond: Math.max(baseWastewaterNode?.capacity.value ?? 0, 190),
        invertElevationMeters: -2.4,
        rimElevationMeters: 0.4,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 4,
        servedObjectIds: [SEWER_LINE_ID, ...buildingBuckets[0].slice(0, 24).map((building) => building.id)],
        wetWellVolumeCubicMeters: 180
      },
      {
        id: SERVICE_NODE_ID,
        equipmentKind: 'service-connection',
        nodeRole: 'distribution-node',
        center: offsetPoint(wastewaterAnchor, 0, -5),
        parentId: detailedStreetRoad.id,
        capacityLitersPerSecond: 110,
        invertElevationMeters: -1.2,
        rimElevationMeters: 0.6,
        criticality: 'medium',
        backupAvailable: false,
        clearAccessMeters: 2,
        servedObjectIds: input.buildings.map((building) => building.id)
      },
      {
        id: MANHOLE_NORTH_NODE_ID,
        equipmentKind: 'manhole',
        nodeRole: 'manhole',
        center: offsetPoint(detailedStreetRoad.center, -7, -2),
        parentId: detailedStreetRoad.id,
        capacityLitersPerSecond: 95,
        invertElevationMeters: -1.5,
        rimElevationMeters: 0.7,
        criticality: 'medium',
        backupAvailable: false,
        clearAccessMeters: 2,
        servedObjectIds: buildingBuckets[0].map((building) => building.id)
      },
      {
        id: MANHOLE_EAST_NODE_ID,
        equipmentKind: 'manhole',
        nodeRole: 'manhole',
        center: offsetPoint(eastRoad.center, 7, -2),
        parentId: eastRoad.id,
        capacityLitersPerSecond: 95,
        invertElevationMeters: -1.6,
        rimElevationMeters: 0.7,
        criticality: 'medium',
        backupAvailable: false,
        clearAccessMeters: 2,
        servedObjectIds: buildingBuckets[1].map((building) => building.id)
      },
      {
        id: TREATMENT_NODE_ID,
        equipmentKind: 'treatment-plant',
        nodeRole: 'plant',
        center: offsetPoint(wastewaterAnchor, 5, 4),
        parentId: accessRoad.id,
        capacityLitersPerSecond: 260,
        invertElevationMeters: -2.1,
        rimElevationMeters: 0.8,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 5,
        servedObjectIds: [SEWER_BASIN_ID, OUTFALL_NODE_ID]
      },
      {
        id: OUTFALL_NODE_ID,
        equipmentKind: 'outfall',
        nodeRole: 'outfall',
        center: receivingWaterway ? getWaterwayOutfallPoint(receivingWaterway) : offsetPoint(wastewaterAnchor, 10, 12),
        parentId: receivingWaterwayId,
        capacityLitersPerSecond: 240,
        invertElevationMeters: -1.8,
        rimElevationMeters: 0.2,
        criticality: 'medium',
        backupAvailable: false,
        clearAccessMeters: 3,
        servedObjectIds: [TREATMENT_NODE_ID, receivingWaterwayId],
        receivingWaterwayId
      }
    ];
    const generatedNodes = templates.map((template) => createWastewaterNode(template, serviceArea, wastewaterAnchor));
    const edges = createWastewaterEdges(generatedNodes, receivingWaterwayId);
    const edgeIdsByNodeId = new Map<string, string[]>();
    const utilityEdges = [...input.utilityEdges.filter((edge) => edge.utilityType !== 'wastewater'), ...edges];

    for (const edge of utilityEdges) {
      edgeIdsByNodeId.set(edge.fromNodeId, [...(edgeIdsByNodeId.get(edge.fromNodeId) ?? []), edge.id]);
      edgeIdsByNodeId.set(edge.toNodeId, [...(edgeIdsByNodeId.get(edge.toNodeId) ?? []), edge.id]);
    }

    const utilityNodes = [
      ...input.utilityNodes.filter((node) => node.utilityType !== 'wastewater').map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? node.connectedEdgeIds
      })),
      ...generatedNodes.map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? []
      }))
    ];
    const manholeIds = generatedNodes.filter((node) => node.wastewater?.equipmentKind === 'manhole').map((node) => node.id);
    const buildings = input.buildings.map((building, index) => ({
      ...building,
      wastewaterService: {
        serviceNodeId: SERVICE_NODE_ID,
        serviceLateralEdgeId: SERVICE_LATERAL_EDGE_ID,
        nearestManholeNodeId: manholeIds[index % manholeIds.length],
        sewerBasinId: SEWER_BASIN_ID,
        estimatedPeakLitersPerSecond: getBuildingPeakWastewaterLitersPerSecond(building),
        pretreatmentRequired: building.uses.includes('industrial')
      }
    }));

    return {
      utilityNodes,
      utilityEdges,
      buildings
    };
  }
}

function createWastewaterNode(
  template: WastewaterNodeTemplate,
  serviceArea: UtilityNode['serviceArea'],
  accessPointPosition: Point2D
): UtilityNode {
  return {
    id: template.id,
    kind: 'utility-node',
    ownerDomain: 'utilities',
    parentId: template.parentId,
    lod: 'lod2',
    utilityType: 'wastewater',
    nodeRole: template.nodeRole,
    center: template.center,
    serviceArea: {
      ...serviceArea,
      criticalObjectIds: uniqueIds([
        ...serviceArea.criticalObjectIds,
        template.parentId,
        ...template.servedObjectIds.filter(isGeneratedObjectReference).slice(0, 24)
      ])
    },
    capacity: {
      value: template.capacityLitersPerSecond,
      unit: 'liters-per-second',
      peakLoadFactor: template.equipmentKind === 'service-connection' ? 0.64 : 0.82
    },
    accessPoint: {
      accessPointKind: template.equipmentKind === 'manhole' || template.equipmentKind === 'outfall' ? 'surface-cover' : 'roadside-vault',
      objectId: template.parentId,
      position: accessPointPosition,
      clearAccessMeters: template.clearAccessMeters
    },
    outage: {
      outageDomainId: OUTAGE_DOMAIN_ID,
      isolationGroupId: `isolation-group-${template.equipmentKind}-${SEWER_BASIN_ID}`,
      backupAvailable: template.backupAvailable,
      criticality: template.criticality
    },
    ownerEntityId: OWNER_ENTITY_ID,
    connectedEdgeIds: [],
    renderBindingId: `binding:utility:wastewater:${template.equipmentKind}`,
    wastewater: {
      equipmentKind: template.equipmentKind,
      sewerBasinId: SEWER_BASIN_ID,
      invertElevationMeters: template.invertElevationMeters,
      rimElevationMeters: template.rimElevationMeters,
      servedObjectIds: template.servedObjectIds,
      wetWellVolumeCubicMeters: template.wetWellVolumeCubicMeters,
      receivingWaterwayId: template.receivingWaterwayId
    }
  };
}

function createWastewaterEdges(nodes: readonly UtilityNode[], receivingWaterwayId: CityId): UtilityEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const liftStation = byId.get(LIFT_STATION_NODE_ID) ?? nodes.find((node) => node.wastewater?.equipmentKind === 'lift-station');
  const serviceCollector = byId.get(SERVICE_NODE_ID);
  const manholeNorth = byId.get(MANHOLE_NORTH_NODE_ID);
  const manholeEast = byId.get(MANHOLE_EAST_NODE_ID);
  const treatment = byId.get(TREATMENT_NODE_ID);
  const outfall = byId.get(OUTFALL_NODE_ID);
  const edges: UtilityEdge[] = [];

  if (serviceCollector && manholeNorth) {
    edges.push(createWastewaterEdge(SERVICE_LATERAL_EDGE_ID, serviceCollector, manholeNorth, 160, 1.8, 'gravity'));
  }
  if (manholeNorth && liftStation) {
    edges.push(createWastewaterEdge('utility-edge-wastewater-main-manhole-north-lift-station', manholeNorth, liftStation, 300, 1.2, 'gravity'));
  }
  if (manholeEast && liftStation) {
    edges.push(createWastewaterEdge('utility-edge-wastewater-main-manhole-east-lift-station', manholeEast, liftStation, 300, 1.1, 'gravity'));
  }
  if (liftStation && treatment) {
    edges.push(createWastewaterEdge('utility-edge-wastewater-force-main-lift-station-treatment', liftStation, treatment, 450, 0.6, 'pumped'));
  }
  if (treatment && outfall) {
    edges.push(
      createWastewaterEdge('utility-edge-wastewater-treated-outfall-south-river', treatment, outfall, 500, 0.4, 'gravity', receivingWaterwayId)
    );
  }

  return edges;
}

function createWastewaterEdge(
  id: CityId,
  fromNode: UtilityNode,
  toNode: UtilityNode,
  pipeDiameterMm: number,
  slopePercent: number,
  flowMethod: 'gravity' | 'pumped',
  receivingWaterwayId?: CityId
): UtilityEdge {
  return {
    id,
    kind: 'utility-edge',
    ownerDomain: 'utilities',
    parentId: fromNode.id,
    lod: 'lod2',
    utilityType: 'wastewater',
    edgeRole: fromNode.wastewater?.equipmentKind === 'service-connection' ? 'service-lateral' : 'main',
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    centerline: [fromNode.center, toNode.center],
    lengthMeters: Number(distance2D(fromNode.center, toNode.center).toFixed(2)),
    serviceAreaBoundaryId: fromNode.serviceArea.serviceAreaBoundaryId,
    capacity: {
      value: Math.min(fromNode.capacity.value, toNode.capacity.value),
      unit: 'liters-per-second',
      peakLoadFactor: Math.max(fromNode.capacity.peakLoadFactor, toNode.capacity.peakLoadFactor)
    },
    accessPointIds: [fromNode.id, toNode.id],
    outageDomainId: OUTAGE_DOMAIN_ID,
    ownerEntityId: OWNER_ENTITY_ID,
    renderBindingId: `binding:utility:wastewater:${flowMethod === 'pumped' ? 'force-main' : 'sanitary-main'}`,
    wastewater: {
      sewerLineId: SEWER_LINE_ID,
      fromEquipmentKind: fromNode.wastewater?.equipmentKind ?? 'manhole',
      toEquipmentKind: toNode.wastewater?.equipmentKind ?? 'lift-station',
      pipeDiameterMm,
      slopePercent,
      flowMethod,
      sewerBasinId: SEWER_BASIN_ID,
      capacityReservePercent: Math.max(12, Number((100 - Math.max(fromNode.capacity.peakLoadFactor, toNode.capacity.peakLoadFactor) * 100).toFixed(1))),
      receivingWaterwayId
    }
  };
}

function createFallbackServiceArea(buildings: readonly BuildingPlan[]): UtilityNode['serviceArea'] {
  return {
    serviceAreaBoundaryId: SERVICE_AREA_BOUNDARY_ID,
    districtIds: [],
    parcelIds: uniqueIds(buildings.map((building) => building.parcelId)).slice(0, 72),
    criticalObjectIds: []
  };
}

function getAccessRoad(roads: readonly RoadSegment[], baseWastewaterNode: UtilityNode | undefined): RoadSegment {
  return roads.find((road) => road.id === baseWastewaterNode?.parentId) ?? roads.find((road) => road.id === 'road-v-6') ?? roads[0];
}

function createBuildingBuckets(buildings: readonly BuildingPlan[], bucketCount: number): BuildingPlan[][] {
  const buckets = Array.from({ length: bucketCount }, () => [] as BuildingPlan[]);
  for (const [index, building] of buildings.entries()) {
    buckets[index % bucketCount].push(building);
  }
  return buckets;
}

function getWaterwayOutfallPoint(waterway: Waterway): Point2D {
  const outfall = waterway.outfalls[waterway.outfalls.length - 1];
  if (outfall) {
    return outfall.center;
  }
  const edgeSegment = waterway.edgeSegments[waterway.edgeSegments.length - 1];
  if (edgeSegment) {
    return edgeSegment.centerline[1];
  }
  return waterway.center;
}

function offsetPoint(point: Point2D, x: number, z: number): Point2D {
  return {
    x: Number((point.x + x).toFixed(2)),
    z: Number((point.z + z).toFixed(2))
  };
}

function distance2D(start: Point2D, end: Point2D): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function getBuildingPeakWastewaterLitersPerSecond(building: BuildingPlan): number {
  const useMultiplier = building.uses.includes('industrial') ? 0.3 : building.uses.includes('civic') ? 0.24 : 0.18;
  return Number(Math.max(0.28, building.floorCount * useMultiplier + building.heightMeters * 0.012).toFixed(2));
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)];
}

function isGeneratedObjectReference(id: CityId): boolean {
  return id.startsWith('building-') || id.startsWith('utility-node-') || id.startsWith('road-') || id.startsWith('parcel-') || id.startsWith('waterway-');
}
