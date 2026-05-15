import type { CityId, HealthcareAnchorKind, Point2D } from '../../city/data-contracts/cityContracts';
import type {
  BuildingPlan,
  CivicAnchor,
  HealthcareAnchor,
  NavigationGraphEdge,
  NavigationGraphNode,
  RoadSegment,
  TransitStop
} from '../../types/city';

export interface HealthcareAnchorGeneratorInput {
  readonly civicAnchors: readonly CivicAnchor[];
  readonly buildings: readonly BuildingPlan[];
  readonly navigationGraphNodes: readonly NavigationGraphNode[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
  readonly roads: readonly RoadSegment[];
  readonly transitStops: readonly TransitStop[];
}

interface HealthcareAnchorTemplate {
  readonly anchorKind: HealthcareAnchorKind;
  readonly name: string;
  readonly offset: Point2D;
  readonly bedCapacity: number;
  readonly examRooms: number;
  readonly pharmacyCounters: number;
  readonly urgentCareBays: number;
  readonly ambulanceBays: number;
  readonly staffCapacity: number;
  readonly dailyPatients: number;
  readonly appointmentShare: number;
  readonly emergencyArrivalShare: number;
  readonly radiusMeters: number;
  readonly estimatedAmbulanceResponseSeconds: number;
  readonly coverageScore: number;
  readonly acceptsAmbulance: boolean;
  readonly emergencyDepartment: boolean;
}

const HEALTHCARE_ANCHOR_TEMPLATES = [
  {
    anchorKind: 'hospital',
    name: 'District Hospital Anchor',
    offset: { x: -10, z: -8 },
    bedCapacity: 96,
    examRooms: 30,
    pharmacyCounters: 6,
    urgentCareBays: 10,
    ambulanceBays: 4,
    staffCapacity: 210,
    dailyPatients: 920,
    appointmentShare: 0.58,
    emergencyArrivalShare: 0.18,
    radiusMeters: 1250,
    estimatedAmbulanceResponseSeconds: 260,
    coverageScore: 92,
    acceptsAmbulance: true,
    emergencyDepartment: true
  },
  {
    anchorKind: 'clinic',
    name: 'Neighborhood Clinic Anchor',
    offset: { x: 9, z: -5 },
    bedCapacity: 0,
    examRooms: 14,
    pharmacyCounters: 1,
    urgentCareBays: 0,
    ambulanceBays: 0,
    staffCapacity: 46,
    dailyPatients: 310,
    appointmentShare: 0.78,
    emergencyArrivalShare: 0.02,
    radiusMeters: 760,
    estimatedAmbulanceResponseSeconds: 420,
    coverageScore: 74,
    acceptsAmbulance: false,
    emergencyDepartment: false
  },
  {
    anchorKind: 'pharmacy',
    name: 'Civic Pharmacy Anchor',
    offset: { x: -6, z: 6 },
    bedCapacity: 0,
    examRooms: 0,
    pharmacyCounters: 5,
    urgentCareBays: 0,
    ambulanceBays: 0,
    staffCapacity: 24,
    dailyPatients: 470,
    appointmentShare: 0.24,
    emergencyArrivalShare: 0,
    radiusMeters: 620,
    estimatedAmbulanceResponseSeconds: 540,
    coverageScore: 66,
    acceptsAmbulance: false,
    emergencyDepartment: false
  },
  {
    anchorKind: 'urgent-care',
    name: 'Urgent Care Anchor',
    offset: { x: 7, z: 8 },
    bedCapacity: 0,
    examRooms: 12,
    pharmacyCounters: 2,
    urgentCareBays: 8,
    ambulanceBays: 1,
    staffCapacity: 58,
    dailyPatients: 360,
    appointmentShare: 0.36,
    emergencyArrivalShare: 0.1,
    radiusMeters: 900,
    estimatedAmbulanceResponseSeconds: 320,
    coverageScore: 81,
    acceptsAmbulance: true,
    emergencyDepartment: false
  },
  {
    anchorKind: 'ambulance-bay',
    name: 'Ambulance Access Bay Anchor',
    offset: { x: 0, z: 14 },
    bedCapacity: 0,
    examRooms: 3,
    pharmacyCounters: 0,
    urgentCareBays: 2,
    ambulanceBays: 6,
    staffCapacity: 34,
    dailyPatients: 120,
    appointmentShare: 0.12,
    emergencyArrivalShare: 0.42,
    radiusMeters: 1180,
    estimatedAmbulanceResponseSeconds: 220,
    coverageScore: 89,
    acceptsAmbulance: true,
    emergencyDepartment: false
  }
] as const satisfies readonly HealthcareAnchorTemplate[];

export class HealthcareAnchorGenerator {
  create(input: HealthcareAnchorGeneratorInput): HealthcareAnchor[] {
    const civicAnchor = input.civicAnchors.find((anchor) => anchor.serviceType === 'healthcare');
    const building = civicAnchor
      ? input.buildings.find((candidate) => candidate.id === civicAnchor.buildingId)
      : undefined;

    if (!civicAnchor || !building) {
      return [];
    }

    return HEALTHCARE_ANCHOR_TEMPLATES.map((template) =>
      createHealthcareAnchor(template, civicAnchor, building, input)
    );
  }
}

function createHealthcareAnchor(
  template: HealthcareAnchorTemplate,
  civicAnchor: CivicAnchor,
  building: BuildingPlan,
  input: HealthcareAnchorGeneratorInput
): HealthcareAnchor {
  const center = {
    x: roundMeters(building.center.x + template.offset.x),
    z: roundMeters(building.center.z + template.offset.z)
  };
  const coverageNodes = selectNearestNodes(center, input.navigationGraphNodes, template.radiusMeters);
  const coverageEdges = selectNearestEdges(center, input.navigationGraphEdges, input.navigationGraphNodes, template.radiusMeters);
  const ambulanceNodes = selectNearestNodes(center, input.navigationGraphNodes, template.radiusMeters, 'emergency');
  const ambulanceEdges = selectNearestEdges(center, input.navigationGraphEdges, input.navigationGraphNodes, template.radiusMeters, 'emergency');
  const transitStopIds = selectNearestTransitStopIds(center, input.transitStops);
  const ambulanceAccessRoadIds = uniqueIds([
    building.primaryFrontageRoadId,
    ...ambulanceEdges.flatMap((edge) => edge.roadIds),
    ...input.roads
      .map((road) => ({ id: road.id, distance: distance2D(center, road.center) }))
      .sort((first, second) => first.distance - second.distance)
      .slice(0, 2)
      .map((road) => road.id)
  ]);

  return {
    id: `healthcare-anchor-${template.anchorKind}`,
    kind: 'healthcare-anchor',
    ownerDomain: 'civic',
    parentId: civicAnchor.id,
    name: template.name,
    lod: template.acceptsAmbulance ? 'lod3' : 'lod2',
    tags: {
      serviceType: 'healthcare',
      healthcareAnchorKind: template.anchorKind,
      acceptsAmbulance: template.acceptsAmbulance,
      emergencyDepartment: template.emergencyDepartment,
      renderBinding: 'healthcare-anchor'
    },
    anchorKind: template.anchorKind,
    civicAnchorId: civicAnchor.id,
    buildingId: building.id,
    parcelId: building.parcelId,
    districtId: civicAnchor.districtId,
    roadId: building.primaryFrontageRoadId,
    serviceAreaBoundaryId: civicAnchor.serviceAreaBoundaryId,
    center,
    capacity: {
      bedCapacity: template.bedCapacity,
      examRooms: template.examRooms,
      pharmacyCounters: template.pharmacyCounters,
      urgentCareBays: template.urgentCareBays,
      ambulanceBays: template.ambulanceBays,
      staffCapacity: template.staffCapacity
    },
    arrivals: {
      dailyPatients: template.dailyPatients,
      appointmentShare: template.appointmentShare,
      emergencyArrivalShare: template.emergencyArrivalShare,
      publicEntranceIds: building.publicEntranceIds,
      serviceEntranceIds: building.serviceEntranceIds ?? [],
      transitStopIds,
      ambulanceAccessRoadIds,
      ambulanceNavigationNodeIds: template.acceptsAmbulance ? ambulanceNodes.map((node) => node.id) : [],
      ambulanceNavigationEdgeIds: template.acceptsAmbulance ? ambulanceEdges.map((edge) => edge.id) : []
    },
    coverage: {
      radiusMeters: template.radiusMeters,
      targetDistrictIds: uniqueIds([civicAnchor.districtId, ...civicAnchor.catchment.targetDistrictIds]),
      coveredNavigationNodeIds: coverageNodes.map((node) => node.id),
      coveredNavigationEdgeIds: coverageEdges.map((edge) => edge.id),
      estimatedAmbulanceResponseSeconds: template.estimatedAmbulanceResponseSeconds,
      coverageScore: template.coverageScore
    },
    acceptsAmbulance: template.acceptsAmbulance,
    emergencyDepartment: template.emergencyDepartment,
    scheduleProfileId: civicAnchor.schedule.scheduleProfileId,
    renderBindingId: 'binding:civic:healthcare-anchor'
  };
}

function selectNearestNodes(
  center: Point2D,
  nodes: readonly NavigationGraphNode[],
  radiusMeters: number,
  mode?: NavigationGraphNode['mode']
): NavigationGraphNode[] {
  return nodes
    .filter((node) => (!mode || node.mode === mode) && distance2D(center, node.position) <= radiusMeters)
    .sort((first, second) => distance2D(center, first.position) - distance2D(center, second.position))
    .slice(0, 12);
}

function selectNearestEdges(
  center: Point2D,
  edges: readonly NavigationGraphEdge[],
  nodes: readonly NavigationGraphNode[],
  radiusMeters: number,
  mode?: NavigationGraphEdge['mode']
): NavigationGraphEdge[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  return edges
    .map((edge) => ({
      edge,
      distance: Math.min(
        distance2D(center, nodesById.get(edge.fromNodeId)?.position ?? center),
        distance2D(center, nodesById.get(edge.toNodeId)?.position ?? center)
      )
    }))
    .filter(({ edge, distance }) => (!mode || edge.mode === mode) && distance <= radiusMeters)
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 12)
    .map(({ edge }) => edge);
}

function selectNearestTransitStopIds(center: Point2D, transitStops: readonly TransitStop[]): CityId[] {
  return transitStops
    .map((stop) => ({ id: stop.id, distance: distance2D(center, stop.center) }))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 3)
    .map((stop) => stop.id);
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids.filter(Boolean))].sort();
}

function distance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
