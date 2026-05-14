import type { HazardZonePlan, RoadSegment, UtilityEdge, UtilityNode, Waterway } from '../../types/city';
import type { CityId, Point2D, StormwaterConveyanceKind, StormwaterEquipmentKind } from '../../city/data-contracts/cityContracts';

export interface StormwaterInput {
  readonly utilityNodes: readonly UtilityNode[];
  readonly utilityEdges: readonly UtilityEdge[];
  readonly roads: readonly RoadSegment[];
  readonly waterways: readonly Waterway[];
  readonly hazardZones: readonly HazardZonePlan[];
}

export interface StormwaterOutput {
  readonly utilityNodes: UtilityNode[];
  readonly utilityEdges: UtilityEdge[];
  readonly roads: RoadSegment[];
}

interface StormwaterNodeTemplate {
  readonly id: CityId;
  readonly equipmentKind: StormwaterEquipmentKind;
  readonly nodeRole: UtilityNode['nodeRole'];
  readonly center: Point2D;
  readonly parentId: CityId;
  readonly capacityLitersPerSecond: number;
  readonly runoffCoefficient: number;
  readonly imperviousAreaSquareMeters: number;
  readonly criticality: UtilityNode['outage']['criticality'];
  readonly clearAccessMeters: number;
  readonly servedRoadIds: readonly CityId[];
  readonly servedHazardZoneIds: readonly CityId[];
  readonly storageVolumeCubicMeters?: number;
  readonly treatmentVolumeCubicMeters?: number;
  readonly receivingWaterwayId?: CityId;
}

const OWNER_ENTITY_ID = 'utility-owner-public-works';
const SERVICE_AREA_BOUNDARY_ID = 'administrative-boundary-service-utilities-east';
const CATCHMENT_ID = 'stormwater-catchment-downtown-river-primary';
const DRAINAGE_LINE_ID = 'stormwater-drainage-line-downtown-river-primary';
const OUTAGE_DOMAIN_ID = 'outage-domain-stormwater-downtown-primary';
const DESIGN_STORM_MM_PER_HOUR = 82;
const OUTFALL_NODE_ID = 'utility-node-stormwater-outfall-south-river';
const INLET_NORTH_NODE_ID = 'utility-node-stormwater-inlet-road-v-6-north';
const INLET_EAST_NODE_ID = 'utility-node-stormwater-inlet-road-h-6-east';
const DRAIN_NODE_ID = 'utility-node-stormwater-drain-downtown-main';
const BIOSWALE_NODE_ID = 'utility-node-stormwater-bioswale-detailed-street';
const DETENTION_NODE_ID = 'utility-node-stormwater-detention-waterfront';
const CULVERT_NODE_ID = 'utility-node-stormwater-culvert-south-river-crossing';
const PERVIOUS_NODE_ID = 'utility-node-stormwater-pervious-plaza-strip';
const RUNOFF_NORTH_EDGE_ID = 'utility-edge-stormwater-runoff-road-v-6-drain';
const RUNOFF_EAST_EDGE_ID = 'utility-edge-stormwater-runoff-road-h-6-drain';
const PERVIOUS_EDGE_ID = 'utility-edge-stormwater-pervious-bioswale';
const DRAIN_BIOSWALE_EDGE_ID = 'utility-edge-stormwater-drain-bioswale';
const BIOSWALE_DETENTION_EDGE_ID = 'utility-edge-stormwater-bioswale-detention';
const DETENTION_CULVERT_EDGE_ID = 'utility-edge-stormwater-detention-culvert';
const CULVERT_OUTFALL_EDGE_ID = 'utility-edge-stormwater-culvert-outfall-south-river';

export class StormwaterGenerator {
  create(input: StormwaterInput): StormwaterOutput {
    const baseStormwaterNode = input.utilityNodes.find((node) => node.utilityType === 'stormwater');
    const serviceArea = baseStormwaterNode?.serviceArea ?? createFallbackServiceArea(input.roads);
    const accessRoad = getAccessRoad(input.roads, baseStormwaterNode);
    const stormwaterAnchor = baseStormwaterNode?.center ?? accessRoad.center;
    const detailedStreetRoad = input.roads.find((road) => road.id === 'road-v-6') ?? accessRoad;
    const eastRoad = input.roads.find((road) => road.id === 'road-h-6') ?? detailedStreetRoad;
    const receivingWaterway = input.waterways.find((waterway) => waterway.id === 'south-river') ?? input.waterways[0];
    const receivingWaterwayId = receivingWaterway?.id ?? 'south-river';
    const floodHazardIds = input.hazardZones
      .filter((hazard) => hazard.hazardKind === 'flood-plain' || hazard.relatedWaterwayIds.includes(receivingWaterwayId))
      .map((hazard) => hazard.id);
    const roadBuckets = createRoadBuckets(input.roads, 2);
    const allRoadIds = input.roads.map((road) => road.id);
    const templates: StormwaterNodeTemplate[] = [
      {
        id: baseStormwaterNode?.id ?? OUTFALL_NODE_ID,
        equipmentKind: 'outfall',
        nodeRole: 'outfall',
        center: receivingWaterway ? getWaterwayOutfallPoint(receivingWaterway) : offsetPoint(stormwaterAnchor, 10, 10),
        parentId: receivingWaterwayId,
        capacityLitersPerSecond: Math.max(baseStormwaterNode?.capacity.value ?? 0, 360),
        runoffCoefficient: 0.82,
        imperviousAreaSquareMeters: getRoadImperviousArea(input.roads),
        criticality: 'high',
        clearAccessMeters: 3,
        servedRoadIds: allRoadIds,
        servedHazardZoneIds: floodHazardIds,
        receivingWaterwayId
      },
      {
        id: INLET_NORTH_NODE_ID,
        equipmentKind: 'inlet',
        nodeRole: 'inlet',
        center: offsetPoint(detailedStreetRoad.center, -8, -4),
        parentId: detailedStreetRoad.id,
        capacityLitersPerSecond: 86,
        runoffCoefficient: 0.88,
        imperviousAreaSquareMeters: getRoadImperviousArea(roadBuckets[0]),
        criticality: 'high',
        clearAccessMeters: 2,
        servedRoadIds: roadBuckets[0].map((road) => road.id),
        servedHazardZoneIds: floodHazardIds
      },
      {
        id: INLET_EAST_NODE_ID,
        equipmentKind: 'inlet',
        nodeRole: 'inlet',
        center: offsetPoint(eastRoad.center, 8, -4),
        parentId: eastRoad.id,
        capacityLitersPerSecond: 86,
        runoffCoefficient: 0.88,
        imperviousAreaSquareMeters: getRoadImperviousArea(roadBuckets[1]),
        criticality: 'high',
        clearAccessMeters: 2,
        servedRoadIds: roadBuckets[1].map((road) => road.id),
        servedHazardZoneIds: floodHazardIds
      },
      {
        id: DRAIN_NODE_ID,
        equipmentKind: 'drain',
        nodeRole: 'drain',
        center: offsetPoint(stormwaterAnchor, 0, -6),
        parentId: accessRoad.id,
        capacityLitersPerSecond: 190,
        runoffCoefficient: 0.84,
        imperviousAreaSquareMeters: getRoadImperviousArea(input.roads.slice(0, 8)),
        criticality: 'high',
        clearAccessMeters: 2.5,
        servedRoadIds: allRoadIds,
        servedHazardZoneIds: floodHazardIds
      },
      {
        id: BIOSWALE_NODE_ID,
        equipmentKind: 'bioswale',
        nodeRole: 'bioswale',
        center: offsetPoint(detailedStreetRoad.center, 0, 8),
        parentId: detailedStreetRoad.id,
        capacityLitersPerSecond: 74,
        runoffCoefficient: 0.42,
        imperviousAreaSquareMeters: 460,
        criticality: 'medium',
        clearAccessMeters: 2,
        servedRoadIds: [detailedStreetRoad.id, eastRoad.id],
        servedHazardZoneIds: floodHazardIds,
        storageVolumeCubicMeters: 135,
        treatmentVolumeCubicMeters: 62
      },
      {
        id: DETENTION_NODE_ID,
        equipmentKind: 'detention-basin',
        nodeRole: 'detention',
        center: offsetPoint(stormwaterAnchor, 6, 6),
        parentId: accessRoad.id,
        capacityLitersPerSecond: 230,
        runoffCoefficient: 0.58,
        imperviousAreaSquareMeters: 1240,
        criticality: 'high',
        clearAccessMeters: 3.5,
        servedRoadIds: allRoadIds,
        servedHazardZoneIds: floodHazardIds,
        storageVolumeCubicMeters: 920,
        treatmentVolumeCubicMeters: 280
      },
      {
        id: CULVERT_NODE_ID,
        equipmentKind: 'culvert',
        nodeRole: 'culvert',
        center: receivingWaterway ? offsetPoint(receivingWaterway.center, -12, -receivingWaterway.width / 2) : offsetPoint(stormwaterAnchor, 8, 10),
        parentId: receivingWaterwayId,
        capacityLitersPerSecond: 260,
        runoffCoefficient: 0.76,
        imperviousAreaSquareMeters: 980,
        criticality: 'high',
        clearAccessMeters: 3,
        servedRoadIds: allRoadIds.slice(0, 12),
        servedHazardZoneIds: floodHazardIds,
        receivingWaterwayId
      },
      {
        id: PERVIOUS_NODE_ID,
        equipmentKind: 'pervious-area',
        nodeRole: 'bioswale',
        center: offsetPoint(detailedStreetRoad.center, 10, 8),
        parentId: detailedStreetRoad.id,
        capacityLitersPerSecond: 42,
        runoffCoefficient: 0.28,
        imperviousAreaSquareMeters: 0,
        criticality: 'medium',
        clearAccessMeters: 2,
        servedRoadIds: [detailedStreetRoad.id],
        servedHazardZoneIds: floodHazardIds,
        storageVolumeCubicMeters: 80,
        treatmentVolumeCubicMeters: 44
      }
    ];
    const generatedNodes = templates.map((template) => createStormwaterNode(template, serviceArea, stormwaterAnchor));
    const edges = createStormwaterEdges(generatedNodes, receivingWaterwayId);
    const edgeIdsByNodeId = new Map<string, string[]>();
    const utilityEdges = [...input.utilityEdges.filter((edge) => edge.utilityType !== 'stormwater'), ...edges];

    for (const edge of utilityEdges) {
      edgeIdsByNodeId.set(edge.fromNodeId, [...(edgeIdsByNodeId.get(edge.fromNodeId) ?? []), edge.id]);
      edgeIdsByNodeId.set(edge.toNodeId, [...(edgeIdsByNodeId.get(edge.toNodeId) ?? []), edge.id]);
    }

    const utilityNodes = [
      ...input.utilityNodes.filter((node) => node.utilityType !== 'stormwater').map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? node.connectedEdgeIds
      })),
      ...generatedNodes.map((node) => ({
        ...node,
        connectedEdgeIds: edgeIdsByNodeId.get(node.id) ?? []
      }))
    ];
    const outfallNodeId = generatedNodes.find((node) => node.stormwater?.equipmentKind === 'outfall')?.id ?? OUTFALL_NODE_ID;
    const roads = input.roads.map((road, index) => ({
      ...road,
      stormwaterDrainage: createRoadStormwaterDrainage(road, index, floodHazardIds, outfallNodeId)
    }));

    return {
      utilityNodes,
      utilityEdges,
      roads
    };
  }
}

function createStormwaterNode(
  template: StormwaterNodeTemplate,
  serviceArea: UtilityNode['serviceArea'],
  accessPointPosition: Point2D
): UtilityNode {
  return {
    id: template.id,
    kind: 'utility-node',
    ownerDomain: 'utilities',
    parentId: template.parentId,
    lod: 'lod2',
    utilityType: 'stormwater',
    nodeRole: template.nodeRole,
    center: template.center,
    serviceArea: {
      ...serviceArea,
      criticalObjectIds: uniqueIds([
        ...serviceArea.criticalObjectIds,
        template.parentId,
        ...template.servedRoadIds.slice(0, 24),
        ...template.servedHazardZoneIds
      ])
    },
    capacity: {
      value: template.capacityLitersPerSecond,
      unit: 'liters-per-second',
      peakLoadFactor: template.equipmentKind === 'pervious-area' || template.equipmentKind === 'bioswale' ? 0.58 : 0.88
    },
    accessPoint: {
      accessPointKind: template.equipmentKind === 'inlet' || template.equipmentKind === 'culvert' || template.equipmentKind === 'outfall' ? 'surface-cover' : 'roadside-vault',
      objectId: template.parentId,
      position: accessPointPosition,
      clearAccessMeters: template.clearAccessMeters
    },
    outage: {
      outageDomainId: OUTAGE_DOMAIN_ID,
      isolationGroupId: `isolation-group-${template.equipmentKind}-${CATCHMENT_ID}`,
      backupAvailable: false,
      criticality: template.criticality
    },
    ownerEntityId: OWNER_ENTITY_ID,
    connectedEdgeIds: [],
    renderBindingId: `binding:utility:stormwater:${template.equipmentKind}`,
    stormwater: {
      equipmentKind: template.equipmentKind,
      drainageCatchmentId: CATCHMENT_ID,
      designStormMmPerHour: DESIGN_STORM_MM_PER_HOUR,
      runoffCoefficient: template.runoffCoefficient,
      imperviousAreaSquareMeters: template.imperviousAreaSquareMeters,
      servedRoadIds: template.servedRoadIds,
      servedHazardZoneIds: template.servedHazardZoneIds,
      storageVolumeCubicMeters: template.storageVolumeCubicMeters,
      treatmentVolumeCubicMeters: template.treatmentVolumeCubicMeters,
      receivingWaterwayId: template.receivingWaterwayId
    }
  };
}

function createStormwaterEdges(nodes: readonly UtilityNode[], receivingWaterwayId: CityId): UtilityEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const inletNorth = byId.get(INLET_NORTH_NODE_ID);
  const inletEast = byId.get(INLET_EAST_NODE_ID);
  const drain = byId.get(DRAIN_NODE_ID);
  const bioswale = byId.get(BIOSWALE_NODE_ID);
  const detention = byId.get(DETENTION_NODE_ID);
  const culvert = byId.get(CULVERT_NODE_ID);
  const outfall = nodes.find((node) => node.stormwater?.equipmentKind === 'outfall');
  const pervious = byId.get(PERVIOUS_NODE_ID);
  const edges: UtilityEdge[] = [];

  if (inletNorth && drain) {
    edges.push(createStormwaterEdge(RUNOFF_NORTH_EDGE_ID, inletNorth, drain, 'surface-flow', 0.9, 1.6, 1.2));
  }
  if (inletEast && drain) {
    edges.push(createStormwaterEdge(RUNOFF_EAST_EDGE_ID, inletEast, drain, 'surface-flow', 0.9, 1.5, 1.1));
  }
  if (pervious && bioswale) {
    edges.push(createStormwaterEdge(PERVIOUS_EDGE_ID, pervious, bioswale, 'surface-flow', 1.2, 1.7, 0.8));
  }
  if (drain && bioswale) {
    edges.push(createStormwaterEdge(DRAIN_BIOSWALE_EDGE_ID, drain, bioswale, 'pipe', 0.8, 1.1, undefined, 550));
  }
  if (bioswale && detention) {
    edges.push(createStormwaterEdge(BIOSWALE_DETENTION_EDGE_ID, bioswale, detention, 'surface-flow', 1.6, 1.0, 1.4));
  }
  if (detention && culvert) {
    edges.push(createStormwaterEdge(DETENTION_CULVERT_EDGE_ID, detention, culvert, 'culvert', 0.6, 0.8, undefined, 900));
  }
  if (culvert && outfall) {
    edges.push(createStormwaterEdge(CULVERT_OUTFALL_EDGE_ID, culvert, outfall, 'culvert', 0.5, 0.7, undefined, 1000, receivingWaterwayId));
  }

  return edges;
}

function createStormwaterEdge(
  id: CityId,
  fromNode: UtilityNode,
  toNode: UtilityNode,
  conveyanceKind: StormwaterConveyanceKind,
  slopePercent: number,
  capacityReservePercent: number,
  channelWidthMeters?: number,
  pipeDiameterMm?: number,
  receivingWaterwayId?: CityId
): UtilityEdge {
  return {
    id,
    kind: 'utility-edge',
    ownerDomain: 'utilities',
    parentId: fromNode.id,
    lod: 'lod2',
    utilityType: 'stormwater',
    edgeRole: conveyanceKind === 'surface-flow' ? 'runoff-path' : 'drain',
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
    renderBindingId: `binding:utility:stormwater:${conveyanceKind}`,
    stormwater: {
      drainageLineId: DRAINAGE_LINE_ID,
      fromEquipmentKind: fromNode.stormwater?.equipmentKind ?? 'inlet',
      toEquipmentKind: toNode.stormwater?.equipmentKind ?? 'drain',
      conveyanceKind,
      drainageCatchmentId: CATCHMENT_ID,
      designStormMmPerHour: DESIGN_STORM_MM_PER_HOUR,
      slopePercent,
      pipeDiameterMm,
      channelWidthMeters,
      capacityReservePercent,
      receivingWaterwayId
    }
  };
}

function createRoadStormwaterDrainage(
  road: RoadSegment,
  index: number,
  floodHazardIds: readonly CityId[],
  outfallNodeId: CityId
): RoadSegment['stormwaterDrainage'] {
  const usesEastInlet = index % 2 === 1;
  const inletNodeId = usesEastInlet ? INLET_EAST_NODE_ID : INLET_NORTH_NODE_ID;
  const runoffPathEdgeId = usesEastInlet ? RUNOFF_EAST_EDGE_ID : RUNOFF_NORTH_EDGE_ID;

  return {
    drainageCatchmentId: CATCHMENT_ID,
    inletNodeIds: [inletNodeId],
    runoffPathEdgeIds: [runoffPathEdgeId],
    lowPointNodeId: inletNodeId,
    detentionNodeId: DETENTION_NODE_ID,
    outfallNodeId,
    perviousAreaNodeIds: [PERVIOUS_NODE_ID, BIOSWALE_NODE_ID],
    floodHazardZoneIds: floodHazardIds,
    designStormMmPerHour: DESIGN_STORM_MM_PER_HOUR,
    imperviousAreaSquareMeters: getRoadImperviousArea([road]),
    runoffCoefficient: getRoadRunoffCoefficient(road)
  };
}

function createFallbackServiceArea(roads: readonly RoadSegment[]): UtilityNode['serviceArea'] {
  return {
    serviceAreaBoundaryId: SERVICE_AREA_BOUNDARY_ID,
    districtIds: [],
    parcelIds: [],
    criticalObjectIds: roads.slice(0, 12).map((road) => road.id)
  };
}

function getAccessRoad(roads: readonly RoadSegment[], baseStormwaterNode: UtilityNode | undefined): RoadSegment {
  return roads.find((road) => road.id === baseStormwaterNode?.parentId) ?? roads.find((road) => road.id === 'road-v-6') ?? roads[0];
}

function createRoadBuckets(roads: readonly RoadSegment[], bucketCount: number): RoadSegment[][] {
  const buckets = Array.from({ length: bucketCount }, () => [] as RoadSegment[]);
  for (const [index, road] of roads.entries()) {
    buckets[index % bucketCount].push(road);
  }
  return buckets;
}

function getWaterwayOutfallPoint(waterway: Waterway): Point2D {
  const outfall = waterway.outfalls.find((candidate) => candidate.source === 'stormwater') ?? waterway.outfalls[0];
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

function getRoadImperviousArea(roads: readonly RoadSegment[]): number {
  return Number(roads.reduce((sum, road) => sum + road.length * road.widthMeters, 0).toFixed(1));
}

function getRoadRunoffCoefficient(road: RoadSegment): number {
  return road.hierarchy === 'local' ? 0.74 : road.hierarchy === 'arterial' ? 0.9 : 0.82;
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)];
}
