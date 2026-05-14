import type { BuildingPlan, RoadSegment, UtilityEdge, UtilityNode } from '../../types/city';
import type { CityId, Point2D, WaterSupplyEquipmentKind } from '../../city/data-contracts/cityContracts';

export interface WaterSupplyInput {
  readonly utilityNodes: readonly UtilityNode[];
  readonly utilityEdges: readonly UtilityEdge[];
  readonly roads: readonly RoadSegment[];
  readonly buildings: readonly BuildingPlan[];
}

export interface WaterSupplyOutput {
  readonly utilityNodes: UtilityNode[];
  readonly utilityEdges: UtilityEdge[];
  readonly buildings: BuildingPlan[];
}

interface WaterNodeTemplate {
  readonly id: CityId;
  readonly equipmentKind: WaterSupplyEquipmentKind;
  readonly nodeRole: UtilityNode['nodeRole'];
  readonly center: Point2D;
  readonly parentId: CityId;
  readonly capacityLitersPerSecond: number;
  readonly pressureMinKpa: number;
  readonly pressureMaxKpa: number;
  readonly criticality: UtilityNode['outage']['criticality'];
  readonly backupAvailable: boolean;
  readonly clearAccessMeters: number;
  readonly servedObjectIds: readonly CityId[];
  readonly hydrantReachMeters?: number;
  readonly storageVolumeCubicMeters?: number;
}

const OWNER_ENTITY_ID = 'utility-owner-water-authority';
const SERVICE_AREA_BOUNDARY_ID = 'administrative-boundary-service-utilities-east';
const PRESSURE_ZONE_ID = 'water-pressure-zone-downtown-primary';
const MAIN_ID = 'water-main-downtown-primary';
const OUTAGE_DOMAIN_ID = 'outage-domain-water-downtown-primary';
const PUMP_NODE_ID = 'utility-node-water-pump-downtown';
const TANK_NODE_ID = 'utility-node-water-tank-downtown';
const METER_NODE_ID = 'utility-node-water-meter-bank-downtown';

export class WaterSupplyGenerator {
  create(input: WaterSupplyInput): WaterSupplyOutput {
    const baseWaterNode = input.utilityNodes.find((node) => node.utilityType === 'water');
    const serviceArea = baseWaterNode?.serviceArea ?? createFallbackServiceArea(input.buildings);
    const accessRoad = getAccessRoad(input.roads, baseWaterNode);
    const waterAnchor = baseWaterNode?.center ?? accessRoad.center;
    const detailedStreetRoad = input.roads.find((road) => road.id === 'road-v-6') ?? accessRoad;
    const hydrantRoad = input.roads.find((road) => road.id === 'road-h-6') ?? detailedStreetRoad;
    const buildingBuckets = createBuildingBuckets(input.buildings, 2);
    const templates: WaterNodeTemplate[] = [
      {
        id: baseWaterNode?.id ?? 'utility-node-water-valve-1',
        equipmentKind: 'valve',
        nodeRole: 'valve',
        center: baseWaterNode?.center ?? waterAnchor,
        parentId: baseWaterNode?.parentId ?? accessRoad.id,
        capacityLitersPerSecond: Math.max(baseWaterNode?.capacity.value ?? 0, 260),
        pressureMinKpa: 360,
        pressureMaxKpa: 620,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 3,
        servedObjectIds: [MAIN_ID, PUMP_NODE_ID, TANK_NODE_ID]
      },
      {
        id: PUMP_NODE_ID,
        equipmentKind: 'pump',
        nodeRole: 'pump',
        center: offsetPoint(waterAnchor, -4, 3),
        parentId: accessRoad.id,
        capacityLitersPerSecond: 220,
        pressureMinKpa: 420,
        pressureMaxKpa: 650,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 4,
        servedObjectIds: [PRESSURE_ZONE_ID, TANK_NODE_ID]
      },
      {
        id: TANK_NODE_ID,
        equipmentKind: 'tank',
        nodeRole: 'tank',
        center: offsetPoint(waterAnchor, 4, 3),
        parentId: accessRoad.id,
        capacityLitersPerSecond: 180,
        pressureMinKpa: 340,
        pressureMaxKpa: 580,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 4,
        servedObjectIds: [PRESSURE_ZONE_ID],
        storageVolumeCubicMeters: 950
      },
      {
        id: 'utility-node-water-pressure-zone-downtown',
        equipmentKind: 'pressure-zone',
        nodeRole: 'pressure-zone',
        center: offsetPoint(waterAnchor, 0, 5),
        parentId: detailedStreetRoad.id,
        capacityLitersPerSecond: 260,
        pressureMinKpa: 350,
        pressureMaxKpa: 600,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 2.5,
        servedObjectIds: input.buildings.map((building) => building.id)
      },
      {
        id: 'utility-node-water-hydrant-road-v-6-north',
        equipmentKind: 'hydrant',
        nodeRole: 'hydrant',
        center: offsetPoint(detailedStreetRoad.center, -8, 0),
        parentId: detailedStreetRoad.id,
        capacityLitersPerSecond: 38,
        pressureMinKpa: 310,
        pressureMaxKpa: 560,
        criticality: 'high',
        backupAvailable: false,
        clearAccessMeters: 2,
        servedObjectIds: buildingBuckets[0].map((building) => building.id),
        hydrantReachMeters: 90
      },
      {
        id: 'utility-node-water-hydrant-road-h-6-east',
        equipmentKind: 'hydrant',
        nodeRole: 'hydrant',
        center: offsetPoint(hydrantRoad.center, 8, 0),
        parentId: hydrantRoad.id,
        capacityLitersPerSecond: 38,
        pressureMinKpa: 310,
        pressureMaxKpa: 560,
        criticality: 'high',
        backupAvailable: false,
        clearAccessMeters: 2,
        servedObjectIds: buildingBuckets[1].map((building) => building.id),
        hydrantReachMeters: 90
      },
      {
        id: METER_NODE_ID,
        equipmentKind: 'meter',
        nodeRole: 'meter-bank',
        center: offsetPoint(waterAnchor, 0, -5),
        parentId: detailedStreetRoad.id,
        capacityLitersPerSecond: 120,
        pressureMinKpa: 330,
        pressureMaxKpa: 560,
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 2,
        servedObjectIds: input.buildings.slice(0, 72).map((building) => building.id)
      }
    ];
    const generatedNodes = templates.map((template) => createWaterNode(template, serviceArea, waterAnchor));
    const edges = createWaterEdges(generatedNodes);
    const edgeIdsByNodeId = new Map<string, string[]>();
    const utilityEdges = [...input.utilityEdges.filter((edge) => edge.utilityType !== 'water'), ...edges];

    for (const edge of utilityEdges) {
      edgeIdsByNodeId.set(edge.fromNodeId, [...(edgeIdsByNodeId.get(edge.fromNodeId) ?? []), edge.id]);
      edgeIdsByNodeId.set(edge.toNodeId, [...(edgeIdsByNodeId.get(edge.toNodeId) ?? []), edge.id]);
    }

    const utilityNodes = [
      ...input.utilityNodes.filter((node) => node.utilityType !== 'water').map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? node.connectedEdgeIds
      })),
      ...generatedNodes.map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? []
      }))
    ];
    const hydrantIds = generatedNodes.filter((node) => node.waterSupply?.equipmentKind === 'hydrant').map((node) => node.id);
    const buildings = input.buildings.map((building, index) => ({
      ...building,
      waterService: {
        serviceNodeId: METER_NODE_ID,
        serviceLateralEdgeId: 'utility-edge-water-service-meter-bank-downtown',
        meterId: `water-meter-${building.id}`,
        pressureZoneId: PRESSURE_ZONE_ID,
        nearestHydrantNodeId: hydrantIds[index % hydrantIds.length],
        estimatedPeakLitersPerSecond: getBuildingPeakLitersPerSecond(building)
      }
    }));

    return {
      utilityNodes,
      utilityEdges,
      buildings
    };
  }
}

function createWaterNode(
  template: WaterNodeTemplate,
  serviceArea: UtilityNode['serviceArea'],
  accessPointPosition: Point2D
): UtilityNode {
  return {
    id: template.id,
    kind: 'utility-node',
    ownerDomain: 'utilities',
    parentId: template.parentId,
    lod: 'lod2',
    utilityType: 'water',
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
      peakLoadFactor: template.equipmentKind === 'hydrant' ? 0.5 : 0.76
    },
    accessPoint: {
      accessPointKind: template.equipmentKind === 'meter' ? 'building-service' : 'roadside-vault',
      objectId: template.parentId,
      position: accessPointPosition,
      clearAccessMeters: template.clearAccessMeters
    },
    outage: {
      outageDomainId: OUTAGE_DOMAIN_ID,
      isolationGroupId: `isolation-group-${template.equipmentKind}-${PRESSURE_ZONE_ID}`,
      backupAvailable: template.backupAvailable,
      criticality: template.criticality
    },
    ownerEntityId: OWNER_ENTITY_ID,
    connectedEdgeIds: [],
    renderBindingId: `binding:utility:water:${template.equipmentKind}`,
    waterSupply: {
      equipmentKind: template.equipmentKind,
      pressureZoneId: PRESSURE_ZONE_ID,
      pressureMinKpa: template.pressureMinKpa,
      pressureMaxKpa: template.pressureMaxKpa,
      servedObjectIds: template.servedObjectIds,
      hydrantReachMeters: template.hydrantReachMeters,
      storageVolumeCubicMeters: template.storageVolumeCubicMeters
    }
  };
}

function createWaterEdges(nodes: readonly UtilityNode[]): UtilityEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const valve = byId.get('utility-node-water-valve-1');
  const pump = byId.get(PUMP_NODE_ID);
  const tank = byId.get(TANK_NODE_ID);
  const pressureZone = byId.get('utility-node-water-pressure-zone-downtown');
  const hydrantNorth = byId.get('utility-node-water-hydrant-road-v-6-north');
  const hydrantEast = byId.get('utility-node-water-hydrant-road-h-6-east');
  const meter = byId.get(METER_NODE_ID);
  const edges: UtilityEdge[] = [];

  if (valve && pump) {
    edges.push(createWaterEdge('utility-edge-water-main-valve-pump', valve, pump, 450, true));
  }
  if (pump && tank) {
    edges.push(createWaterEdge('utility-edge-water-main-pump-tank', pump, tank, 400, true));
  }
  if (tank && pressureZone) {
    edges.push(createWaterEdge('utility-edge-water-main-tank-pressure-zone', tank, pressureZone, 350, true));
  }
  if (pressureZone && hydrantNorth) {
    edges.push(createWaterEdge('utility-edge-water-hydrant-road-v-6-north', pressureZone, hydrantNorth, 200, true));
  }
  if (pressureZone && hydrantEast) {
    edges.push(createWaterEdge('utility-edge-water-hydrant-road-h-6-east', pressureZone, hydrantEast, 200, true));
  }
  if (pressureZone && meter) {
    edges.push(createWaterEdge('utility-edge-water-service-meter-bank-downtown', pressureZone, meter, 150, true));
  }

  return edges;
}

function createWaterEdge(
  id: CityId,
  fromNode: UtilityNode,
  toNode: UtilityNode,
  pipeDiameterMm: number,
  normallyOpen: boolean
): UtilityEdge {
  return {
    id,
    kind: 'utility-edge',
    ownerDomain: 'utilities',
    parentId: fromNode.id,
    lod: 'lod2',
    utilityType: 'water',
    edgeRole: toNode.waterSupply?.equipmentKind === 'meter' ? 'service-lateral' : 'main',
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
    renderBindingId: `binding:utility:water:${toNode.waterSupply?.equipmentKind === 'meter' ? 'service-lateral' : 'main'}`,
    waterSupply: {
      mainId: MAIN_ID,
      fromEquipmentKind: fromNode.waterSupply?.equipmentKind ?? 'valve',
      toEquipmentKind: toNode.waterSupply?.equipmentKind ?? 'main',
      pipeDiameterMm,
      pressureZoneId: PRESSURE_ZONE_ID,
      normallyOpen
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

function getAccessRoad(roads: readonly RoadSegment[], baseWaterNode: UtilityNode | undefined): RoadSegment {
  return roads.find((road) => road.id === baseWaterNode?.parentId) ?? roads.find((road) => road.id === 'road-v-6') ?? roads[0];
}

function createBuildingBuckets(buildings: readonly BuildingPlan[], bucketCount: number): BuildingPlan[][] {
  const buckets = Array.from({ length: bucketCount }, () => [] as BuildingPlan[]);
  for (const [index, building] of buildings.entries()) {
    buckets[index % bucketCount].push(building);
  }
  return buckets;
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

function getBuildingPeakLitersPerSecond(building: BuildingPlan): number {
  const useMultiplier = building.uses.includes('industrial') || building.uses.includes('civic') ? 0.34 : 0.2;
  return Number(Math.max(0.35, building.floorCount * useMultiplier + building.heightMeters * 0.018).toFixed(2));
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)];
}

function isGeneratedObjectReference(id: CityId): boolean {
  return id.startsWith('building-') || id.startsWith('utility-node-') || id.startsWith('road-') || id.startsWith('parcel-');
}
