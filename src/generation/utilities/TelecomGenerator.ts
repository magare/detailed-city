import type { BuildingPlan, RoadSegment, UtilityEdge, UtilityNode } from '../../types/city';
import type { CityId, Point2D, TelecomEquipmentKind, TelecomMediumKind } from '../../city/data-contracts/cityContracts';

export interface TelecomInput {
  readonly utilityNodes: readonly UtilityNode[];
  readonly utilityEdges: readonly UtilityEdge[];
  readonly roads: readonly RoadSegment[];
  readonly buildings: readonly BuildingPlan[];
}

export interface TelecomOutput {
  readonly utilityNodes: UtilityNode[];
  readonly utilityEdges: UtilityEdge[];
  readonly buildings: BuildingPlan[];
}

interface TelecomNodeTemplate {
  readonly id: CityId;
  readonly equipmentKind: TelecomEquipmentKind;
  readonly nodeRole: UtilityNode['nodeRole'];
  readonly center: Point2D;
  readonly parentId: CityId;
  readonly bandwidthMbps: number;
  readonly criticality: UtilityNode['outage']['criticality'];
  readonly backupAvailable: boolean;
  readonly clearAccessMeters: number;
  readonly servedObjectIds: readonly CityId[];
  readonly coverageRadiusMeters?: number;
  readonly frequencyBandGhz?: number;
  readonly backhaulNodeId?: CityId;
  readonly redundantBackhaulAvailable: boolean;
}

const OWNER_ENTITY_ID = 'utility-owner-fiber-coop';
const SERVICE_AREA_BOUNDARY_ID = 'administrative-boundary-service-utilities-east';
const NETWORK_ZONE_ID = 'telecom-zone-downtown-primary';
const COVERAGE_ASSUMPTION_ID = 'telecom-coverage-assumption-downtown-primary';
const FIBER_ROUTE_ID = 'telecom-fiber-route-downtown-primary';
const OUTAGE_DOMAIN_ID = 'outage-domain-telecom-downtown-primary';
const FIBER_HUB_NODE_ID = 'utility-node-telecom-fiber-hub-downtown';
const DUCT_BANK_NODE_ID = 'utility-node-telecom-duct-bank-road-v-6';
const DISTRIBUTION_CABINET_NODE_ID = 'utility-node-telecom-cabinet-road-h-6';
const CELL_SITE_NODE_ID = 'utility-node-telecom-cell-site-downtown-rooftop';
const ANTENNA_EAST_NODE_ID = 'utility-node-telecom-antenna-rooftop-sector-east';
const ANTENNA_WEST_NODE_ID = 'utility-node-telecom-antenna-rooftop-sector-west';
const SERVICE_DROP_EDGE_ID = 'utility-edge-telecom-service-drop-downtown';

export class TelecomGenerator {
  create(input: TelecomInput): TelecomOutput {
    const baseTelecomNode = input.utilityNodes.find((node) => node.utilityType === 'telecom');
    const serviceArea = baseTelecomNode?.serviceArea ?? createFallbackServiceArea(input.buildings);
    const accessRoad = getAccessRoad(input.roads, baseTelecomNode);
    const telecomAnchor = baseTelecomNode?.center ?? accessRoad.center;
    const detailedStreetRoad = input.roads.find((road) => road.id === 'road-v-6') ?? accessRoad;
    const eastRoad = input.roads.find((road) => road.id === 'road-h-6') ?? detailedStreetRoad;
    const buildingBuckets = createBuildingBuckets(input.buildings, 2);
    const criticalBuildingIds = input.buildings.filter(isCriticalFacilityBuilding).map((building) => building.id);
    const templates: TelecomNodeTemplate[] = [
      {
        id: baseTelecomNode?.id ?? 'utility-node-telecom-cabinet-4',
        equipmentKind: 'cabinet',
        nodeRole: 'cabinet',
        center: baseTelecomNode?.center ?? telecomAnchor,
        parentId: baseTelecomNode?.parentId ?? accessRoad.id,
        bandwidthMbps: Math.max(baseTelecomNode?.capacity.value ?? 0, 12000),
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 2.5,
        servedObjectIds: [FIBER_ROUTE_ID, DUCT_BANK_NODE_ID, ...buildingBuckets[0].slice(0, 24).map((building) => building.id)],
        backhaulNodeId: FIBER_HUB_NODE_ID,
        redundantBackhaulAvailable: true
      },
      {
        id: FIBER_HUB_NODE_ID,
        equipmentKind: 'fiber-hub',
        nodeRole: 'fiber-node',
        center: offsetPoint(telecomAnchor, -5, -4),
        parentId: accessRoad.id,
        bandwidthMbps: 48000,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 3.5,
        servedObjectIds: [FIBER_ROUTE_ID, NETWORK_ZONE_ID, ...criticalBuildingIds.slice(0, 24)],
        redundantBackhaulAvailable: true
      },
      {
        id: DUCT_BANK_NODE_ID,
        equipmentKind: 'duct-bank',
        nodeRole: 'duct-bank',
        center: offsetPoint(detailedStreetRoad.center, -6, 5),
        parentId: detailedStreetRoad.id,
        bandwidthMbps: 18000,
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 2,
        servedObjectIds: [detailedStreetRoad.id, DISTRIBUTION_CABINET_NODE_ID],
        backhaulNodeId: baseTelecomNode?.id ?? 'utility-node-telecom-cabinet-4',
        redundantBackhaulAvailable: true
      },
      {
        id: DISTRIBUTION_CABINET_NODE_ID,
        equipmentKind: 'cabinet',
        nodeRole: 'cabinet',
        center: offsetPoint(eastRoad.center, 6, 4),
        parentId: eastRoad.id,
        bandwidthMbps: 16000,
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 2,
        servedObjectIds: buildingBuckets[1].map((building) => building.id),
        backhaulNodeId: DUCT_BANK_NODE_ID,
        redundantBackhaulAvailable: true
      },
      {
        id: CELL_SITE_NODE_ID,
        equipmentKind: 'cell-site',
        nodeRole: 'cell-site',
        center: getRooftopTelecomPoint(input.buildings, telecomAnchor),
        parentId: getRooftopParentId(input.buildings, accessRoad.id),
        bandwidthMbps: 9200,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 1.5,
        servedObjectIds: input.buildings.map((building) => building.id),
        coverageRadiusMeters: 460,
        frequencyBandGhz: 3.5,
        backhaulNodeId: DISTRIBUTION_CABINET_NODE_ID,
        redundantBackhaulAvailable: true
      },
      {
        id: ANTENNA_EAST_NODE_ID,
        equipmentKind: 'antenna',
        nodeRole: 'antenna',
        center: offsetPoint(getRooftopTelecomPoint(input.buildings, telecomAnchor), 2, 1),
        parentId: getRooftopParentId(input.buildings, accessRoad.id),
        bandwidthMbps: 3800,
        criticality: 'high',
        backupAvailable: true,
        clearAccessMeters: 1,
        servedObjectIds: buildingBuckets[0].map((building) => building.id),
        coverageRadiusMeters: 360,
        frequencyBandGhz: 3.5,
        backhaulNodeId: CELL_SITE_NODE_ID,
        redundantBackhaulAvailable: true
      },
      {
        id: ANTENNA_WEST_NODE_ID,
        equipmentKind: 'antenna',
        nodeRole: 'antenna',
        center: offsetPoint(getRooftopTelecomPoint(input.buildings, telecomAnchor), -2, -1),
        parentId: getRooftopParentId(input.buildings, accessRoad.id),
        bandwidthMbps: 3600,
        criticality: 'medium',
        backupAvailable: true,
        clearAccessMeters: 1,
        servedObjectIds: buildingBuckets[1].map((building) => building.id),
        coverageRadiusMeters: 340,
        frequencyBandGhz: 2.6,
        backhaulNodeId: CELL_SITE_NODE_ID,
        redundantBackhaulAvailable: true
      }
    ];
    const generatedNodes = templates.map((template) => createTelecomNode(template, serviceArea, telecomAnchor));
    const baseNodeId = generatedNodes.find((node) => node.telecom?.equipmentKind === 'cabinet')?.id ?? 'utility-node-telecom-cabinet-4';
    const edges = createTelecomEdges(generatedNodes, baseNodeId);
    const edgeIdsByNodeId = new Map<string, string[]>();
    const utilityEdges = [...input.utilityEdges.filter((edge) => edge.utilityType !== 'telecom'), ...edges];

    for (const edge of utilityEdges) {
      edgeIdsByNodeId.set(edge.fromNodeId, [...(edgeIdsByNodeId.get(edge.fromNodeId) ?? []), edge.id]);
      edgeIdsByNodeId.set(edge.toNodeId, [...(edgeIdsByNodeId.get(edge.toNodeId) ?? []), edge.id]);
    }

    const utilityNodes = [
      ...input.utilityNodes.filter((node) => node.utilityType !== 'telecom').map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? []
      })),
      ...generatedNodes.map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? []
      }))
    ];
    const serviceNodes = [baseNodeId, DISTRIBUTION_CABINET_NODE_ID];
    const coverageNodes = [ANTENNA_EAST_NODE_ID, ANTENNA_WEST_NODE_ID, CELL_SITE_NODE_ID];
    const buildings = input.buildings.map((building, index) => ({
      ...building,
      telecomService: {
        serviceNodeId: serviceNodes[index % serviceNodes.length],
        serviceDropEdgeId: SERVICE_DROP_EDGE_ID,
        coverageNodeId: coverageNodes[index % coverageNodes.length],
        networkZoneId: NETWORK_ZONE_ID,
        subscriberId: `telecom-subscriber-${building.id}`,
        estimatedPeakMbps: getBuildingPeakMbps(building),
        redundancyTier: getBuildingRedundancyTier(building, index)
      }
    }));

    return {
      utilityNodes,
      utilityEdges,
      buildings
    };
  }
}

function createTelecomNode(
  template: TelecomNodeTemplate,
  serviceArea: UtilityNode['serviceArea'],
  accessPointPosition: Point2D
): UtilityNode {
  return {
    id: template.id,
    kind: 'utility-node',
    ownerDomain: 'utilities',
    parentId: template.parentId,
    lod: 'lod2',
    utilityType: 'telecom',
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
      value: template.bandwidthMbps,
      unit: 'mbps',
      peakLoadFactor: template.equipmentKind === 'antenna' ? 0.68 : 0.74
    },
    accessPoint: {
      accessPointKind: template.equipmentKind === 'antenna' || template.equipmentKind === 'cell-site' ? 'building-service' : 'roadside-vault',
      objectId: template.parentId,
      position: accessPointPosition,
      clearAccessMeters: template.clearAccessMeters
    },
    outage: {
      outageDomainId: OUTAGE_DOMAIN_ID,
      isolationGroupId: `isolation-group-${template.equipmentKind}-${NETWORK_ZONE_ID}`,
      backupAvailable: template.backupAvailable,
      criticality: template.criticality
    },
    ownerEntityId: OWNER_ENTITY_ID,
    connectedEdgeIds: [],
    renderBindingId: `binding:utility:telecom:${template.equipmentKind}`,
    telecom: {
      equipmentKind: template.equipmentKind,
      networkZoneId: NETWORK_ZONE_ID,
      coverageAssumptionId: COVERAGE_ASSUMPTION_ID,
      bandwidthMbps: template.bandwidthMbps,
      servedObjectIds: template.servedObjectIds,
      coverageRadiusMeters: template.coverageRadiusMeters,
      frequencyBandGhz: template.frequencyBandGhz,
      backhaulNodeId: template.backhaulNodeId,
      redundantBackhaulAvailable: template.redundantBackhaulAvailable
    }
  };
}

function createTelecomEdges(nodes: readonly UtilityNode[], baseNodeId: CityId): UtilityEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const baseCabinet = byId.get(baseNodeId);
  const fiberHub = byId.get(FIBER_HUB_NODE_ID);
  const ductBank = byId.get(DUCT_BANK_NODE_ID);
  const distributionCabinet = byId.get(DISTRIBUTION_CABINET_NODE_ID);
  const cellSite = byId.get(CELL_SITE_NODE_ID);
  const antennaEast = byId.get(ANTENNA_EAST_NODE_ID);
  const antennaWest = byId.get(ANTENNA_WEST_NODE_ID);
  const edges: UtilityEdge[] = [];

  if (fiberHub && baseCabinet) {
    edges.push(createTelecomEdge('utility-edge-telecom-fiber-hub-core-cabinet', fiberHub, baseCabinet, 'fiber', 48000, 0.8, 8, 144, true));
  }
  if (baseCabinet && ductBank) {
    edges.push(createTelecomEdge(SERVICE_DROP_EDGE_ID, baseCabinet, ductBank, 'fiber', 16000, 1.2, 6, 96, true));
  }
  if (ductBank && distributionCabinet) {
    edges.push(createTelecomEdge('utility-edge-telecom-conduit-road-v-6-cabinet', ductBank, distributionCabinet, 'fiber', 14000, 1.4, 4, 72, true));
  }
  if (distributionCabinet && cellSite) {
    edges.push(createTelecomEdge('utility-edge-telecom-backhaul-cabinet-cell-site', distributionCabinet, cellSite, 'fiber', 9200, 2.1, 2, 48, true));
  }
  if (cellSite && antennaEast) {
    edges.push(createTelecomEdge('utility-edge-telecom-radio-cell-site-antenna-east', cellSite, antennaEast, 'wireless', 3800, 3.5, undefined, undefined, false));
  }
  if (cellSite && antennaWest) {
    edges.push(createTelecomEdge('utility-edge-telecom-radio-cell-site-antenna-west', cellSite, antennaWest, 'wireless', 3600, 3.8, undefined, undefined, false));
  }

  return edges;
}

function createTelecomEdge(
  id: CityId,
  fromNode: UtilityNode,
  toNode: UtilityNode,
  medium: TelecomMediumKind,
  bandwidthMbps: number,
  latencyMs: number,
  ductCount: number | undefined,
  fiberStrandCount: number | undefined,
  buried: boolean
): UtilityEdge {
  return {
    id,
    kind: 'utility-edge',
    ownerDomain: 'utilities',
    parentId: fromNode.id,
    lod: 'lod2',
    utilityType: 'telecom',
    edgeRole: medium === 'fiber' ? 'fiber-route' : 'conduit',
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    centerline: [fromNode.center, toNode.center],
    lengthMeters: Number(distance2D(fromNode.center, toNode.center).toFixed(2)),
    serviceAreaBoundaryId: fromNode.serviceArea.serviceAreaBoundaryId,
    capacity: {
      value: bandwidthMbps,
      unit: 'mbps',
      peakLoadFactor: medium === 'wireless' ? 0.66 : 0.72
    },
    accessPointIds: [fromNode.id, toNode.id],
    outageDomainId: OUTAGE_DOMAIN_ID,
    ownerEntityId: OWNER_ENTITY_ID,
    renderBindingId: `binding:utility:telecom:${medium}`,
    telecom: {
      routeId: FIBER_ROUTE_ID,
      fromEquipmentKind: fromNode.telecom?.equipmentKind ?? 'cabinet',
      toEquipmentKind: toNode.telecom?.equipmentKind ?? 'cabinet',
      medium,
      bandwidthMbps,
      latencyMs,
      ductCount,
      fiberStrandCount,
      buried,
      coverageAssumptionId: COVERAGE_ASSUMPTION_ID
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

function getAccessRoad(roads: readonly RoadSegment[], baseTelecomNode: UtilityNode | undefined): RoadSegment {
  return roads.find((road) => road.id === baseTelecomNode?.parentId) ?? roads.find((road) => road.id === 'road-v-6') ?? roads[0];
}

function createBuildingBuckets(buildings: readonly BuildingPlan[], bucketCount: number): BuildingPlan[][] {
  const buckets = Array.from({ length: bucketCount }, () => [] as BuildingPlan[]);
  for (const [index, building] of buildings.entries()) {
    buckets[index % bucketCount].push(building);
  }
  return buckets;
}

function getRooftopTelecomPoint(buildings: readonly BuildingPlan[], fallback: Point2D): Point2D {
  const rooftopBuilding = buildings.find((building) => building.heightMeters >= 90) ?? buildings[0];
  if (!rooftopBuilding) {
    return offsetPoint(fallback, 8, 8);
  }
  const x = rooftopBuilding.footprint.reduce((sum, point) => sum + point.x, 0) / rooftopBuilding.footprint.length;
  const z = rooftopBuilding.footprint.reduce((sum, point) => sum + point.z, 0) / rooftopBuilding.footprint.length;
  return { x: Number(x.toFixed(2)), z: Number(z.toFixed(2)) };
}

function getRooftopParentId(buildings: readonly BuildingPlan[], fallbackRoadId: CityId): CityId {
  return buildings.find((building) => building.heightMeters >= 90)?.id ?? buildings[0]?.id ?? fallbackRoadId;
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

function getBuildingPeakMbps(building: BuildingPlan): number {
  const base = building.uses.includes('office') ? 42 : building.uses.includes('retail') ? 24 : building.uses.includes('industrial') ? 34 : 12;
  const floorFactor = Math.max(1, building.floorCount * 0.7);
  return Number((base * floorFactor).toFixed(2));
}

function isCriticalFacilityBuilding(building: BuildingPlan): boolean {
  return building.uses.some((use) => use === 'civic' || use === 'education' || use === 'transport' || use === 'utility');
}

function getBuildingRedundancyTier(
  building: BuildingPlan,
  index: number
): NonNullable<BuildingPlan['telecomService']>['redundancyTier'] {
  return isCriticalFacilityBuilding(building) ? 'critical-facility' : index % 5 === 0 ? 'secondary-backhaul' : 'none';
}

function isGeneratedObjectReference(id: CityId): boolean {
  return id.startsWith('building-') || id.startsWith('road-') || id.startsWith('utility-node-');
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)];
}
