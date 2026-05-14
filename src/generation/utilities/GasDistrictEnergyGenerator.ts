import type { BuildingPlan, RoadSegment, UtilityEdge, UtilityNode } from '../../types/city';
import type {
  CityId,
  Point2D,
  ThermalEnergyEquipmentKind,
  ThermalEnergyMediumKind
} from '../../city/data-contracts/cityContracts';

export interface GasDistrictEnergyInput {
  readonly utilityNodes: readonly UtilityNode[];
  readonly utilityEdges: readonly UtilityEdge[];
  readonly roads: readonly RoadSegment[];
  readonly buildings: readonly BuildingPlan[];
}

export interface GasDistrictEnergyOutput {
  readonly utilityNodes: UtilityNode[];
  readonly utilityEdges: UtilityEdge[];
  readonly buildings: BuildingPlan[];
}

interface ThermalNodeTemplate {
  readonly id: CityId;
  readonly utilityType: 'district-energy' | 'gas';
  readonly equipmentKind: ThermalEnergyEquipmentKind;
  readonly nodeRole: UtilityNode['nodeRole'];
  readonly center: Point2D;
  readonly parentId: CityId;
  readonly capacityKwThermal: number;
  readonly capacityUnit: UtilityNode['capacity']['unit'];
  readonly thermalLoopId: CityId;
  readonly medium: ThermalEnergyMediumKind;
  readonly criticality: UtilityNode['outage']['criticality'];
  readonly backupAvailable: boolean;
  readonly clearAccessMeters: number;
  readonly servedObjectIds: readonly CityId[];
  readonly supplyTemperatureC?: number;
  readonly returnTemperatureC?: number;
  readonly pressureKpa?: number;
  readonly plantRoomBuildingId?: CityId;
  readonly thermalStorageMwh?: number;
  readonly backupFuelAvailable: boolean;
}

const OWNER_ENTITY_ID = 'utility-owner-district-energy';
const SERVICE_AREA_BOUNDARY_ID = 'administrative-boundary-service-utilities-east';
const THERMAL_LOOP_ID = 'thermal-loop-downtown-primary';
const CHILLED_WATER_LOOP_ID = 'thermal-loop-downtown-chilled-water';
const GAS_LOOP_ID = 'gas-loop-downtown-primary';
const OUTAGE_DOMAIN_ID = 'outage-domain-thermal-downtown-primary';
const GAS_REGULATOR_NODE_ID = 'utility-node-gas-regulator-downtown';
const GAS_VALVE_NODE_ID = 'utility-node-gas-valve-road-v-6';
const GAS_METER_NODE_ID = 'utility-node-gas-meter-bank-downtown';
const PLANT_NODE_ID = 'utility-node-district-energy-plant-room-downtown';
const BOILER_NODE_ID = 'utility-node-district-energy-boiler-downtown';
const CHILLER_NODE_ID = 'utility-node-district-energy-chilled-water-plant-downtown';
const STORAGE_NODE_ID = 'utility-node-district-energy-thermal-storage-downtown';
const HEAT_EXCHANGER_NODE_ID = 'utility-node-district-energy-heat-exchanger-downtown';
const SERVICE_LATERAL_EDGE_ID = 'utility-edge-district-energy-service-heat-exchanger-downtown';

export class GasDistrictEnergyGenerator {
  create(input: GasDistrictEnergyInput): GasDistrictEnergyOutput {
    const accessRoad = input.roads.find((road) => road.id === 'road-v-6') ?? input.roads[0];
    const crossRoad = input.roads.find((road) => road.id === 'road-h-6') ?? accessRoad;
    const serviceArea = createFallbackServiceArea(input.buildings);
    const anchor = accessRoad.center;
    const accessPointAnchor = input.utilityNodes.find((node) => node.utilityType === 'power')?.center ?? anchor;
    const plantRoomBuilding = getPlantRoomBuilding(input.buildings);
    const buildingBuckets = createBuildingBuckets(input.buildings, 2);
    const templates: ThermalNodeTemplate[] = [
      {
        id: GAS_REGULATOR_NODE_ID,
        utilityType: 'gas',
        equipmentKind: 'gas-regulator',
        nodeRole: 'valve',
        center: offsetPoint(anchor, -8, -6),
        parentId: accessRoad.id,
        capacityKwThermal: 18500,
        capacityUnit: 'kj-per-hour',
        thermalLoopId: GAS_LOOP_ID,
        medium: 'gas',
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 3.5,
        servedObjectIds: [GAS_LOOP_ID, GAS_VALVE_NODE_ID, GAS_METER_NODE_ID],
        pressureKpa: 420,
        backupFuelAvailable: true
      },
      {
        id: GAS_VALVE_NODE_ID,
        utilityType: 'gas',
        equipmentKind: 'gas-valve',
        nodeRole: 'valve',
        center: offsetPoint(crossRoad.center, -5, 6),
        parentId: crossRoad.id,
        capacityKwThermal: 12800,
        capacityUnit: 'kj-per-hour',
        thermalLoopId: GAS_LOOP_ID,
        medium: 'gas',
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 2.5,
        servedObjectIds: [GAS_METER_NODE_ID, ...buildingBuckets[0].slice(0, 24).map((building) => building.id)],
        pressureKpa: 310,
        backupFuelAvailable: true
      },
      {
        id: GAS_METER_NODE_ID,
        utilityType: 'gas',
        equipmentKind: 'gas-meter',
        nodeRole: 'meter-bank',
        center: offsetPoint(anchor, 7, -5),
        parentId: accessRoad.id,
        capacityKwThermal: 9400,
        capacityUnit: 'kj-per-hour',
        thermalLoopId: GAS_LOOP_ID,
        medium: 'gas',
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 2,
        servedObjectIds: input.buildings.map((building) => building.id),
        pressureKpa: 160,
        backupFuelAvailable: true
      },
      {
        id: PLANT_NODE_ID,
        utilityType: 'district-energy',
        equipmentKind: 'district-energy-plant',
        nodeRole: 'plant',
        center: offsetPoint(anchor, -7, 6),
        parentId: accessRoad.id,
        capacityKwThermal: 18400,
        capacityUnit: 'kw-thermal',
        thermalLoopId: THERMAL_LOOP_ID,
        medium: 'hot-water',
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 4,
        servedObjectIds: [THERMAL_LOOP_ID, CHILLED_WATER_LOOP_ID, BOILER_NODE_ID, CHILLER_NODE_ID, STORAGE_NODE_ID],
        supplyTemperatureC: 82,
        returnTemperatureC: 48,
        pressureKpa: 760,
        plantRoomBuildingId: plantRoomBuilding?.id,
        backupFuelAvailable: true
      },
      {
        id: BOILER_NODE_ID,
        utilityType: 'district-energy',
        equipmentKind: 'boiler',
        nodeRole: 'plant',
        center: offsetPoint(anchor, -2, 8),
        parentId: accessRoad.id,
        capacityKwThermal: 7200,
        capacityUnit: 'kw-thermal',
        thermalLoopId: THERMAL_LOOP_ID,
        medium: 'steam',
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 3,
        servedObjectIds: [HEAT_EXCHANGER_NODE_ID, ...buildingBuckets[0].slice(0, 32).map((building) => building.id)],
        supplyTemperatureC: 165,
        returnTemperatureC: 82,
        pressureKpa: 900,
        plantRoomBuildingId: plantRoomBuilding?.id,
        backupFuelAvailable: true
      },
      {
        id: CHILLER_NODE_ID,
        utilityType: 'district-energy',
        equipmentKind: 'chilled-water-plant',
        nodeRole: 'plant',
        center: offsetPoint(anchor, 3, 8),
        parentId: accessRoad.id,
        capacityKwThermal: 6900,
        capacityUnit: 'kw-thermal',
        thermalLoopId: CHILLED_WATER_LOOP_ID,
        medium: 'chilled-water',
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 3,
        servedObjectIds: [HEAT_EXCHANGER_NODE_ID, ...buildingBuckets[1].slice(0, 32).map((building) => building.id)],
        supplyTemperatureC: 6,
        returnTemperatureC: 14,
        pressureKpa: 620,
        plantRoomBuildingId: plantRoomBuilding?.id,
        backupFuelAvailable: true
      },
      {
        id: STORAGE_NODE_ID,
        utilityType: 'district-energy',
        equipmentKind: 'thermal-storage',
        nodeRole: 'thermal-storage',
        center: offsetPoint(anchor, 8, 5),
        parentId: accessRoad.id,
        capacityKwThermal: 3600,
        capacityUnit: 'kw-thermal',
        thermalLoopId: THERMAL_LOOP_ID,
        medium: 'hot-water',
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 3,
        servedObjectIds: [HEAT_EXCHANGER_NODE_ID, THERMAL_LOOP_ID],
        supplyTemperatureC: 78,
        returnTemperatureC: 50,
        pressureKpa: 540,
        plantRoomBuildingId: plantRoomBuilding?.id,
        thermalStorageMwh: 16,
        backupFuelAvailable: true
      },
      {
        id: HEAT_EXCHANGER_NODE_ID,
        utilityType: 'district-energy',
        equipmentKind: 'heat-exchanger',
        nodeRole: 'heat-exchanger',
        center: offsetPoint(crossRoad.center, 7, 6),
        parentId: crossRoad.id,
        capacityKwThermal: 11200,
        capacityUnit: 'kw-thermal',
        thermalLoopId: THERMAL_LOOP_ID,
        medium: 'hot-water',
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 2,
        servedObjectIds: input.buildings.map((building) => building.id),
        supplyTemperatureC: 70,
        returnTemperatureC: 45,
        pressureKpa: 500,
        backupFuelAvailable: true
      }
    ];
    const generatedNodes = templates.map((template) => createThermalNode(template, serviceArea, accessPointAnchor));
    const edges = createThermalEdges(generatedNodes);
    const edgeIdsByNodeId = new Map<string, string[]>();
    const utilityEdges = [
      ...input.utilityEdges.filter((edge) => edge.utilityType !== 'district-energy' && edge.utilityType !== 'gas'),
      ...edges
    ];

    for (const edge of utilityEdges) {
      edgeIdsByNodeId.set(edge.fromNodeId, [...(edgeIdsByNodeId.get(edge.fromNodeId) ?? []), edge.id]);
      edgeIdsByNodeId.set(edge.toNodeId, [...(edgeIdsByNodeId.get(edge.toNodeId) ?? []), edge.id]);
    }

    const utilityNodes = [
      ...input.utilityNodes
        .filter((node) => node.utilityType !== 'district-energy' && node.utilityType !== 'gas')
        .map((node) => ({
          ...node,
          connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? []
        })),
      ...generatedNodes.map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? []
      }))
    ];
    const buildings = input.buildings.map((building) => ({
      ...building,
      thermalService: {
        serviceNodeId: HEAT_EXCHANGER_NODE_ID,
        heatExchangerNodeId: HEAT_EXCHANGER_NODE_ID,
        gasServiceNodeId: GAS_METER_NODE_ID,
        serviceLateralEdgeId: SERVICE_LATERAL_EDGE_ID,
        thermalLoopId: THERMAL_LOOP_ID,
        outageDomainId: OUTAGE_DOMAIN_ID,
        serviceModes: getBuildingThermalServiceModes(building),
        estimatedPeakKwThermal: getBuildingPeakKwThermal(building),
        estimatedPeakGasKjPerHour: getBuildingPeakGasKjPerHour(building)
      }
    }));

    return {
      utilityNodes,
      utilityEdges,
      buildings
    };
  }
}

function createThermalNode(
  template: ThermalNodeTemplate,
  serviceArea: UtilityNode['serviceArea'],
  accessPointPosition: Point2D
): UtilityNode {
  return {
    id: template.id,
    kind: 'utility-node',
    ownerDomain: 'utilities',
    parentId: template.parentId,
    lod: 'lod2',
    utilityType: template.utilityType,
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
      value: template.capacityKwThermal,
      unit: template.capacityUnit,
      peakLoadFactor: template.equipmentKind === 'thermal-storage' ? 0.52 : 0.76
    },
    accessPoint: {
      accessPointKind: template.utilityType === 'gas' ? 'roadside-vault' : 'building-service',
      objectId: template.parentId,
      position: accessPointPosition,
      clearAccessMeters: template.clearAccessMeters
    },
    outage: {
      outageDomainId: OUTAGE_DOMAIN_ID,
      isolationGroupId: `isolation-group-${template.thermalLoopId}`,
      backupAvailable: template.backupAvailable,
      criticality: template.criticality
    },
    ownerEntityId: OWNER_ENTITY_ID,
    connectedEdgeIds: [],
    renderBindingId: `binding:utility:${template.utilityType}:${template.equipmentKind}`,
    thermalEnergy: {
      equipmentKind: template.equipmentKind,
      thermalLoopId: template.thermalLoopId,
      serviceAreaId: SERVICE_AREA_BOUNDARY_ID,
      medium: template.medium,
      capacityKwThermal: template.capacityKwThermal,
      servedObjectIds: template.servedObjectIds,
      supplyTemperatureC: template.supplyTemperatureC,
      returnTemperatureC: template.returnTemperatureC,
      pressureKpa: template.pressureKpa,
      plantRoomBuildingId: template.plantRoomBuildingId,
      thermalStorageMwh: template.thermalStorageMwh,
      backupFuelAvailable: template.backupFuelAvailable
    }
  };
}

function createThermalEdges(nodes: readonly UtilityNode[]): UtilityEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const gasRegulator = byId.get(GAS_REGULATOR_NODE_ID);
  const gasValve = byId.get(GAS_VALVE_NODE_ID);
  const gasMeter = byId.get(GAS_METER_NODE_ID);
  const plant = byId.get(PLANT_NODE_ID);
  const boiler = byId.get(BOILER_NODE_ID);
  const chiller = byId.get(CHILLER_NODE_ID);
  const storage = byId.get(STORAGE_NODE_ID);
  const exchanger = byId.get(HEAT_EXCHANGER_NODE_ID);
  const edges: UtilityEdge[] = [];

  if (gasRegulator && gasValve) {
    edges.push(createThermalEdge('utility-edge-gas-main-downtown-regulator-valve', gasRegulator, gasValve, 'gas', 18500, 180, 420, false));
  }
  if (gasValve && gasMeter) {
    edges.push(createThermalEdge('utility-edge-gas-service-meter-bank-downtown', gasValve, gasMeter, 'gas', 9400, 120, 300, false));
  }
  if (plant && boiler) {
    edges.push(createThermalEdge('utility-edge-district-energy-plant-boiler-steam', plant, boiler, 'steam', 7200, 220, 900, true, 83));
  }
  if (plant && chiller) {
    edges.push(createThermalEdge('utility-edge-district-energy-plant-chiller-water', plant, chiller, 'chilled-water', 6900, 260, 620, true, 8));
  }
  if (plant && storage) {
    edges.push(createThermalEdge('utility-edge-district-energy-plant-storage-hot-water', plant, storage, 'hot-water', 3600, 180, 540, true, 28));
  }
  if (boiler && exchanger) {
    edges.push(createThermalEdge(SERVICE_LATERAL_EDGE_ID, boiler, exchanger, 'steam', 6200, 180, 780, true, 68));
  }
  if (chiller && exchanger) {
    edges.push(createThermalEdge('utility-edge-district-energy-service-chilled-water-downtown', chiller, exchanger, 'chilled-water', 5600, 200, 560, true, 8));
  }

  return edges;
}

function createThermalEdge(
  id: CityId,
  fromNode: UtilityNode,
  toNode: UtilityNode,
  medium: ThermalEnergyMediumKind,
  capacityKwThermal: number,
  pipeDiameterMm: number,
  maxPressureKpa: number,
  insulated: boolean,
  designDeltaTC?: number
): UtilityEdge {
  const utilityType = medium === 'gas' ? 'gas' : 'district-energy';
  return {
    id,
    kind: 'utility-edge',
    ownerDomain: 'utilities',
    parentId: fromNode.id,
    lod: 'lod2',
    utilityType,
    edgeRole: utilityType === 'gas' ? 'main' : 'thermal-loop',
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    centerline: [fromNode.center, toNode.center],
    lengthMeters: Number(distance2D(fromNode.center, toNode.center).toFixed(2)),
    serviceAreaBoundaryId: fromNode.serviceArea.serviceAreaBoundaryId,
    capacity: {
      value: capacityKwThermal,
      unit: utilityType === 'gas' ? 'kj-per-hour' : 'kw-thermal',
      peakLoadFactor: utilityType === 'gas' ? 0.63 : 0.72
    },
    accessPointIds: [fromNode.id, toNode.id],
    outageDomainId: OUTAGE_DOMAIN_ID,
    ownerEntityId: OWNER_ENTITY_ID,
    renderBindingId: `binding:utility:${utilityType}:${medium}`,
    thermalEnergy: {
      loopId: utilityType === 'gas' ? GAS_LOOP_ID : medium === 'chilled-water' ? CHILLED_WATER_LOOP_ID : THERMAL_LOOP_ID,
      fromEquipmentKind: fromNode.thermalEnergy?.equipmentKind ?? 'district-energy-plant',
      toEquipmentKind: toNode.thermalEnergy?.equipmentKind ?? 'heat-exchanger',
      medium,
      capacityKwThermal,
      pipeDiameterMm,
      maxPressureKpa,
      designDeltaTC,
      buried: utilityType === 'gas',
      insulated
    }
  };
}

function createFallbackServiceArea(buildings: readonly BuildingPlan[]): UtilityNode['serviceArea'] {
  return {
    serviceAreaBoundaryId: SERVICE_AREA_BOUNDARY_ID,
    districtIds: [],
    parcelIds: [],
    criticalObjectIds: buildings.filter(isCriticalFacilityBuilding).slice(0, 12).map((building) => building.id)
  };
}

function getPlantRoomBuilding(buildings: readonly BuildingPlan[]): BuildingPlan | undefined {
  return buildings.find((building) => building.uses.includes('utility')) ?? buildings.find((building) => building.uses.includes('civic')) ?? buildings[0];
}

function createBuildingBuckets(buildings: readonly BuildingPlan[], bucketCount: number): BuildingPlan[][] {
  const buckets = Array.from({ length: bucketCount }, () => [] as BuildingPlan[]);
  for (const [index, building] of buildings.entries()) {
    buckets[index % bucketCount].push(building);
  }
  return buckets;
}

function getBuildingThermalServiceModes(building: BuildingPlan): ThermalEnergyMediumKind[] {
  if (building.uses.includes('industrial') || building.uses.includes('utility')) {
    return ['gas', 'steam', 'hot-water'];
  }
  if (building.uses.includes('office') || building.uses.includes('retail') || building.uses.includes('hospitality')) {
    return ['gas', 'hot-water', 'chilled-water'];
  }
  return ['hot-water', 'chilled-water'];
}

function getBuildingPeakKwThermal(building: BuildingPlan): number {
  const useFactor = building.uses.includes('industrial') ? 34 : building.uses.includes('office') ? 28 : building.uses.includes('retail') ? 24 : 18;
  return Number((useFactor * Math.max(1, building.floorCount * 0.62)).toFixed(2));
}

function getBuildingPeakGasKjPerHour(building: BuildingPlan): number {
  const base = building.uses.includes('industrial') || building.uses.includes('utility') ? 480 : building.uses.includes('hospitality') ? 360 : 190;
  return Number((base * Math.max(1, building.floorCount * 0.45)).toFixed(2));
}

function isCriticalFacilityBuilding(building: BuildingPlan): boolean {
  return building.uses.some((use) => use === 'civic' || use === 'education' || use === 'transport' || use === 'utility');
}

function isGeneratedObjectReference(id: CityId): boolean {
  return id.startsWith('building-') || id.startsWith('road-') || id.startsWith('utility-node-');
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

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)];
}
