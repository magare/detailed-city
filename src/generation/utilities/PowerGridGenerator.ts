import type { BuildingPlan, RoadSegment, StreetLight, UtilityEdge, UtilityNode } from '../../types/city';
import type { CityId, Point2D, PowerGridEquipmentKind } from '../../city/data-contracts/cityContracts';

export interface PowerGridInput {
  readonly utilityNodes: readonly UtilityNode[];
  readonly utilityEdges: readonly UtilityEdge[];
  readonly roads: readonly RoadSegment[];
  readonly buildings: readonly BuildingPlan[];
  readonly streetLights: readonly StreetLight[];
}

export interface PowerGridOutput {
  readonly utilityNodes: UtilityNode[];
  readonly utilityEdges: UtilityEdge[];
  readonly buildings: BuildingPlan[];
  readonly streetLights: StreetLight[];
}

interface PowerNodeTemplate {
  readonly id: CityId;
  readonly equipmentKind: PowerGridEquipmentKind;
  readonly nodeRole: UtilityNode['nodeRole'];
  readonly center: Point2D;
  readonly parentId: CityId;
  readonly capacityKva: number;
  readonly voltageKv: number;
  readonly circuitId: CityId;
  readonly feederId?: CityId;
  readonly backupSupplyId?: CityId;
  readonly criticality: UtilityNode['outage']['criticality'];
  readonly backupAvailable: boolean;
  readonly clearAccessMeters: number;
  readonly servedObjectIds: readonly CityId[];
}

const OWNER_ENTITY_ID = 'utility-owner-public-power';
const SERVICE_AREA_BOUNDARY_ID = 'administrative-boundary-service-utilities-east';
const FEEDER_ID = 'power-feeder-downtown-primary';
const OUTAGE_DOMAIN_ID = 'outage-domain-power-downtown-primary';
const BACKUP_SUPPLY_ID = 'utility-node-power-backup-supply-downtown';
const STREET_LIGHT_CIRCUIT_ID = 'power-circuit-road-v-6-street-lighting';
const BUILDING_CIRCUIT_ID = 'power-circuit-downtown-building-service';

export class PowerGridGenerator {
  create(input: PowerGridInput): PowerGridOutput {
    const basePowerNode = input.utilityNodes.find((node) => node.utilityType === 'power');
    const serviceArea = basePowerNode?.serviceArea ?? createFallbackServiceArea(input.buildings, input.streetLights);
    const accessRoad = getAccessRoad(input.roads, basePowerNode);
    const powerAnchor = basePowerNode?.center ?? accessRoad.center;
    const detailedStreetRoad = input.roads.find((road) => road.id === 'road-v-6') ?? accessRoad;
    const transformers = createTransformerTemplates(input.buildings, powerAnchor, detailedStreetRoad.id || accessRoad.id);
    const streetLightIds = input.streetLights.map((light) => light.id);
    const templates: PowerNodeTemplate[] = [
      {
        id: basePowerNode?.id ?? 'utility-node-power-substation-0',
        equipmentKind: 'substation',
        nodeRole: 'substation',
        center: basePowerNode?.center ?? accessRoad.center,
        parentId: basePowerNode?.parentId ?? accessRoad.id,
        capacityKva: Math.max(basePowerNode?.capacity.value ?? 0, 6800),
        voltageKv: 33,
        circuitId: FEEDER_ID,
        feederId: FEEDER_ID,
        backupSupplyId: BACKUP_SUPPLY_ID,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 4.5,
        servedObjectIds: [FEEDER_ID, ...transformers.map((transformer) => transformer.id)]
      },
      {
        id: 'utility-node-power-switchgear-downtown',
        equipmentKind: 'switchgear',
        nodeRole: 'distribution-node',
        center: offsetPoint(powerAnchor, 4, -3),
        parentId: accessRoad.id,
        capacityKva: 5400,
        voltageKv: 11,
        circuitId: FEEDER_ID,
        feederId: FEEDER_ID,
        backupSupplyId: BACKUP_SUPPLY_ID,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 3.5,
        servedObjectIds: transformers.map((transformer) => transformer.id)
      },
      {
        id: BACKUP_SUPPLY_ID,
        equipmentKind: 'backup-supply',
        nodeRole: 'plant',
        center: offsetPoint(powerAnchor, -4, -3),
        parentId: accessRoad.id,
        capacityKva: 1400,
        voltageKv: 11,
        circuitId: 'power-circuit-downtown-backup',
        feederId: FEEDER_ID,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 4,
        servedObjectIds: [FEEDER_ID, STREET_LIGHT_CIRCUIT_ID]
      },
      ...transformers,
      {
        id: 'utility-node-power-meter-bank-downtown',
        equipmentKind: 'meter',
        nodeRole: 'meter-bank',
        center: offsetPoint(powerAnchor, -3, 4),
        parentId: detailedStreetRoad.id,
        capacityKva: 1200,
        voltageKv: 0.415,
        circuitId: BUILDING_CIRCUIT_ID,
        feederId: FEEDER_ID,
        backupSupplyId: BACKUP_SUPPLY_ID,
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 2,
        servedObjectIds: input.buildings.slice(0, 48).map((building) => building.id)
      },
      {
        id: 'utility-node-power-street-light-circuit-road-v-6',
        equipmentKind: 'street-light-circuit',
        nodeRole: 'cabinet',
        center: offsetPoint(powerAnchor, 3, 4),
        parentId: detailedStreetRoad.id,
        capacityKva: 90,
        voltageKv: 0.24,
        circuitId: STREET_LIGHT_CIRCUIT_ID,
        feederId: FEEDER_ID,
        backupSupplyId: BACKUP_SUPPLY_ID,
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 2,
        servedObjectIds: streetLightIds
      }
    ];
    const generatedNodes = templates.map((template) => createPowerNode(template, serviceArea, powerAnchor));
    const edges = createPowerEdges(generatedNodes, transformers);
    const edgeIdsByNodeId = new Map<string, string[]>();
    const utilityEdges = [...input.utilityEdges.filter((edge) => edge.utilityType !== 'power'), ...edges];

    for (const edge of utilityEdges) {
      edgeIdsByNodeId.set(edge.fromNodeId, [...(edgeIdsByNodeId.get(edge.fromNodeId) ?? []), edge.id]);
      edgeIdsByNodeId.set(edge.toNodeId, [...(edgeIdsByNodeId.get(edge.toNodeId) ?? []), edge.id]);
    }

    const utilityNodes = [
      ...input.utilityNodes.filter((node) => node.utilityType !== 'power').map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? node.connectedEdgeIds
      })),
      ...generatedNodes.map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? []
      }))
    ];
    const transformerIds = transformers.map((transformer) => transformer.id);
    const meterNodeId = 'utility-node-power-meter-bank-downtown';
    const serviceLateralEdgeId = 'utility-edge-power-service-meter-bank-downtown';
    const buildings = input.buildings.map((building, index) => ({
      ...building,
      powerService: {
        serviceNodeId: meterNodeId,
        transformerNodeId: transformerIds[index % transformerIds.length],
        meterId: `power-meter-${building.id}`,
        serviceLateralEdgeId,
        circuitId: BUILDING_CIRCUIT_ID,
        outageDomainId: OUTAGE_DOMAIN_ID,
        estimatedPeakKva: getBuildingPeakKva(building)
      }
    }));
    const streetLights = input.streetLights.map((light) => ({
      ...light,
      powerCircuitId: STREET_LIGHT_CIRCUIT_ID,
      tags: {
        ...light.tags,
        powerCircuitId: STREET_LIGHT_CIRCUIT_ID,
        powerServiceNodeId: 'utility-node-power-street-light-circuit-road-v-6'
      }
    }));

    return {
      utilityNodes,
      utilityEdges,
      buildings,
      streetLights
    };
  }
}

function createTransformerTemplates(
  buildings: readonly BuildingPlan[],
  powerAnchor: Point2D,
  parentId: CityId
): PowerNodeTemplate[] {
  const servedBuckets: BuildingPlan[][] = [[], [], []];
  for (const [index, building] of buildings.entries()) {
    servedBuckets[index % servedBuckets.length].push(building);
  }
  return servedBuckets.map((servedBuildings, index) => ({
    id: `utility-node-power-transformer-downtown-${index}`,
    equipmentKind: 'transformer',
    nodeRole: 'distribution-node',
    center: offsetPoint(powerAnchor, (index - 1) * 3, index % 2 === 0 ? 2 : -2),
    parentId,
    capacityKva: 1650,
    voltageKv: 0.415,
    circuitId: `${BUILDING_CIRCUIT_ID}-${index}`,
    feederId: FEEDER_ID,
    backupSupplyId: BACKUP_SUPPLY_ID,
    criticality: 'medium',
    backupAvailable: true,
    clearAccessMeters: 2.5,
    servedObjectIds: servedBuildings.map((building) => building.id)
  }));
}

function createPowerNode(
  template: PowerNodeTemplate,
  serviceArea: UtilityNode['serviceArea'],
  accessPointPosition: Point2D
): UtilityNode {
  return {
    id: template.id,
    kind: 'utility-node',
    ownerDomain: 'utilities',
    parentId: template.parentId,
    lod: 'lod2',
    utilityType: 'power',
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
      value: template.capacityKva,
      unit: 'kva',
      peakLoadFactor: template.equipmentKind === 'street-light-circuit' ? 0.44 : 0.78
    },
    accessPoint: {
      accessPointKind: template.equipmentKind === 'meter' ? 'building-service' : 'roadside-vault',
      objectId: template.parentId,
      position: accessPointPosition,
      clearAccessMeters: template.clearAccessMeters
    },
    outage: {
      outageDomainId: OUTAGE_DOMAIN_ID,
      isolationGroupId: `isolation-group-${template.circuitId}`,
      backupAvailable: template.backupAvailable,
      criticality: template.criticality
    },
    ownerEntityId: OWNER_ENTITY_ID,
    connectedEdgeIds: [],
    renderBindingId: `binding:utility:power:${template.equipmentKind}`,
    powerGrid: {
      equipmentKind: template.equipmentKind,
      voltageKv: template.voltageKv,
      circuitId: template.circuitId,
      feederId: template.feederId,
      backupSupplyId: template.backupSupplyId,
      servedObjectIds: template.servedObjectIds
    }
  };
}

function createPowerEdges(nodes: readonly UtilityNode[], transformers: readonly PowerNodeTemplate[]): UtilityEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const switchgear = byId.get('utility-node-power-switchgear-downtown');
  const substation = byId.get('utility-node-power-substation-0');
  const backup = byId.get(BACKUP_SUPPLY_ID);
  const meter = byId.get('utility-node-power-meter-bank-downtown');
  const streetLightCircuit = byId.get('utility-node-power-street-light-circuit-road-v-6');
  const edges: UtilityEdge[] = [];

  if (substation && switchgear) {
    edges.push(createPowerEdge('utility-edge-power-feeder-substation-switchgear', substation, switchgear, FEEDER_ID, 33, false));
  }
  if (backup && switchgear) {
    edges.push(createPowerEdge('utility-edge-power-backup-supply-switchgear', backup, switchgear, 'power-circuit-downtown-backup', 11, true));
  }
  for (const transformerTemplate of transformers) {
    const transformer = byId.get(transformerTemplate.id);
    if (switchgear && transformer) {
      edges.push(createPowerEdge(`utility-edge-power-feeder-${transformer.id}`, switchgear, transformer, transformerTemplate.circuitId, 11, false));
    }
  }
  if (byId.get('utility-node-power-transformer-downtown-0') && streetLightCircuit) {
    edges.push(
      createPowerEdge(
        'utility-edge-power-street-light-circuit-road-v-6',
        byId.get('utility-node-power-transformer-downtown-0')!,
        streetLightCircuit,
        STREET_LIGHT_CIRCUIT_ID,
        0.24,
        false
      )
    );
  }
  if (byId.get('utility-node-power-transformer-downtown-1') && meter) {
    edges.push(
      createPowerEdge(
        'utility-edge-power-service-meter-bank-downtown',
        byId.get('utility-node-power-transformer-downtown-1')!,
        meter,
        BUILDING_CIRCUIT_ID,
        0.415,
        false
      )
    );
  }

  return edges;
}

function createPowerEdge(
  id: CityId,
  fromNode: UtilityNode,
  toNode: UtilityNode,
  circuitId: CityId,
  voltageKv: number,
  normallyOpen: boolean
): UtilityEdge {
  return {
    id,
    kind: 'utility-edge',
    ownerDomain: 'utilities',
    parentId: fromNode.id,
    lod: 'lod2',
    utilityType: 'power',
    edgeRole: voltageKv <= 0.415 ? 'service-lateral' : 'feeder',
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    centerline: [fromNode.center, toNode.center],
    lengthMeters: Number(distance2D(fromNode.center, toNode.center).toFixed(2)),
    serviceAreaBoundaryId: fromNode.serviceArea.serviceAreaBoundaryId,
    capacity: {
      value: Math.min(fromNode.capacity.value, toNode.capacity.value),
      unit: 'kva',
      peakLoadFactor: Math.max(fromNode.capacity.peakLoadFactor, toNode.capacity.peakLoadFactor)
    },
    accessPointIds: [fromNode.id, toNode.id],
    outageDomainId: OUTAGE_DOMAIN_ID,
    ownerEntityId: OWNER_ENTITY_ID,
    renderBindingId: `binding:utility:power:${voltageKv <= 0.415 ? 'service-lateral' : 'feeder'}`,
    powerGrid: {
      circuitId,
      fromEquipmentKind: fromNode.powerGrid?.equipmentKind ?? 'substation',
      toEquipmentKind: toNode.powerGrid?.equipmentKind ?? 'switchgear',
      voltageKv,
      phase: voltageKv <= 0.24 ? 'single' : 'three',
      normallyOpen
    }
  };
}

function createFallbackServiceArea(
  buildings: readonly BuildingPlan[],
  streetLights: readonly StreetLight[]
): UtilityNode['serviceArea'] {
  return {
    serviceAreaBoundaryId: SERVICE_AREA_BOUNDARY_ID,
    districtIds: [],
    parcelIds: uniqueIds(buildings.map((building) => building.parcelId)).slice(0, 72),
    criticalObjectIds: streetLights.slice(0, 12).map((light) => light.id)
  };
}

function getAccessRoad(roads: readonly RoadSegment[], basePowerNode: UtilityNode | undefined): RoadSegment {
  return roads.find((road) => road.id === basePowerNode?.parentId) ?? roads.find((road) => road.id === 'road-v-6') ?? roads[0];
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

function getBuildingPeakKva(building: BuildingPlan): number {
  const useMultiplier = building.uses.includes('industrial') || building.uses.includes('civic') ? 2.2 : 1.35;
  return Number(Math.max(8, building.floorCount * useMultiplier + building.heightMeters * 0.18).toFixed(2));
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)];
}

function isGeneratedObjectReference(id: CityId): boolean {
  return (
    id.startsWith('building-') ||
    id.startsWith('street-light-') ||
    id.startsWith('utility-node-') ||
    id.startsWith('road-') ||
    id.startsWith('parcel-')
  );
}
