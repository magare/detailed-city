import type { CityId, EducationAnchorKind, Point2D } from '../../city/data-contracts/cityContracts';
import type {
  BikeParking,
  BuildingPlan,
  CivicAnchor,
  CurbZone,
  EducationAnchor,
  NavigationGraphEdge,
  NavigationGraphNode,
  ParkFeature,
  TransitStop
} from '../../types/city';

export interface EducationAnchorGeneratorInput {
  readonly civicAnchors: readonly CivicAnchor[];
  readonly buildings: readonly BuildingPlan[];
  readonly navigationGraphNodes: readonly NavigationGraphNode[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
  readonly curbZones: readonly CurbZone[];
  readonly transitStops: readonly TransitStop[];
  readonly bikeParking: readonly BikeParking[];
  readonly parkFeatures: readonly ParkFeature[];
}

interface EducationAnchorTemplate {
  readonly anchorKind: EducationAnchorKind;
  readonly name: string;
  readonly offset: Point2D;
  readonly studentCapacity: number;
  readonly classroomCount: number;
  readonly librarySeats: number;
  readonly childcareSlots: number;
  readonly lectureHallSeats: number;
  readonly staffCapacity: number;
  readonly dailyLearners: number;
  readonly dropOffTrips: number;
  readonly radiusMeters: number;
  readonly educationAccessScore: number;
  readonly estimatedDropOffWalkMeters: number;
  readonly acceptsDropOff: boolean;
  readonly publicLearningAccess: boolean;
}

const EDUCATION_ANCHOR_TEMPLATES = [
  {
    anchorKind: 'school',
    name: 'Civic School Anchor',
    offset: { x: -9, z: -6 },
    studentCapacity: 620,
    classroomCount: 24,
    librarySeats: 60,
    childcareSlots: 0,
    lectureHallSeats: 90,
    staffCapacity: 58,
    dailyLearners: 680,
    dropOffTrips: 180,
    radiusMeters: 900,
    educationAccessScore: 82,
    estimatedDropOffWalkMeters: 72,
    acceptsDropOff: true,
    publicLearningAccess: true
  },
  {
    anchorKind: 'library',
    name: 'Public Library Learning Anchor',
    offset: { x: 8, z: -7 },
    studentCapacity: 160,
    classroomCount: 4,
    librarySeats: 220,
    childcareSlots: 0,
    lectureHallSeats: 0,
    staffCapacity: 32,
    dailyLearners: 520,
    dropOffTrips: 35,
    radiusMeters: 700,
    educationAccessScore: 78,
    estimatedDropOffWalkMeters: 86,
    acceptsDropOff: false,
    publicLearningAccess: true
  },
  {
    anchorKind: 'university',
    name: 'University Extension Anchor',
    offset: { x: -5, z: 7 },
    studentCapacity: 900,
    classroomCount: 34,
    librarySeats: 180,
    childcareSlots: 0,
    lectureHallSeats: 420,
    staffCapacity: 112,
    dailyLearners: 1240,
    dropOffTrips: 210,
    radiusMeters: 1200,
    educationAccessScore: 88,
    estimatedDropOffWalkMeters: 110,
    acceptsDropOff: true,
    publicLearningAccess: true
  },
  {
    anchorKind: 'childcare',
    name: 'Childcare Anchor',
    offset: { x: 9, z: 6 },
    studentCapacity: 96,
    classroomCount: 8,
    librarySeats: 0,
    childcareSlots: 96,
    lectureHallSeats: 0,
    staffCapacity: 28,
    dailyLearners: 110,
    dropOffTrips: 72,
    radiusMeters: 520,
    educationAccessScore: 74,
    estimatedDropOffWalkMeters: 48,
    acceptsDropOff: true,
    publicLearningAccess: false
  },
  {
    anchorKind: 'learning-campus',
    name: 'Community Learning Campus Anchor',
    offset: { x: 0, z: 14 },
    studentCapacity: 450,
    classroomCount: 18,
    librarySeats: 90,
    childcareSlots: 24,
    lectureHallSeats: 160,
    staffCapacity: 64,
    dailyLearners: 560,
    dropOffTrips: 140,
    radiusMeters: 1000,
    educationAccessScore: 85,
    estimatedDropOffWalkMeters: 95,
    acceptsDropOff: true,
    publicLearningAccess: true
  }
] as const satisfies readonly EducationAnchorTemplate[];

export class EducationAnchorGenerator {
  create(input: EducationAnchorGeneratorInput): EducationAnchor[] {
    const civicAnchor = input.civicAnchors.find((anchor) => anchor.serviceType === 'education');
    const building = civicAnchor
      ? input.buildings.find((candidate) => candidate.id === civicAnchor.buildingId)
      : undefined;

    if (!civicAnchor || !building) {
      return [];
    }

    return EDUCATION_ANCHOR_TEMPLATES.map((template) =>
      createEducationAnchor(template, civicAnchor, building, input)
    );
  }
}

function createEducationAnchor(
  template: EducationAnchorTemplate,
  civicAnchor: CivicAnchor,
  building: BuildingPlan,
  input: EducationAnchorGeneratorInput
): EducationAnchor {
  const center = {
    x: roundMeters(building.center.x + template.offset.x),
    z: roundMeters(building.center.z + template.offset.z)
  };
  const coverageNodes = selectNearestNodes(center, input.navigationGraphNodes, template.radiusMeters);
  const coverageEdges = selectNearestEdges(center, input.navigationGraphEdges, input.navigationGraphNodes, template.radiusMeters);
  const accessibleNodes = selectNearestNodes(center, input.navigationGraphNodes, template.radiusMeters, 'pedestrian');
  const accessibleEdges = selectNearestEdges(center, input.navigationGraphEdges, input.navigationGraphNodes, template.radiusMeters, 'pedestrian');
  const dropOffCurbZoneIds = template.acceptsDropOff ? selectNearestDropOffCurbZoneIds(center, input.curbZones) : [];

  return {
    id: `education-anchor-${template.anchorKind}`,
    kind: 'education-anchor',
    ownerDomain: 'civic',
    parentId: civicAnchor.id,
    name: template.name,
    lod: template.acceptsDropOff ? 'lod3' : 'lod2',
    tags: {
      serviceType: 'education',
      educationAnchorKind: template.anchorKind,
      acceptsDropOff: template.acceptsDropOff,
      publicLearningAccess: template.publicLearningAccess,
      renderBinding: 'education-anchor'
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
      studentCapacity: template.studentCapacity,
      classroomCount: template.classroomCount,
      librarySeats: template.librarySeats,
      childcareSlots: template.childcareSlots,
      lectureHallSeats: template.lectureHallSeats,
      staffCapacity: template.staffCapacity
    },
    access: {
      dailyLearners: template.dailyLearners,
      dropOffTrips: template.dropOffTrips,
      publicEntranceIds: building.publicEntranceIds,
      serviceEntranceIds: building.serviceEntranceIds ?? [],
      dropOffCurbZoneIds,
      transitStopIds: selectNearestTransitStopIds(center, input.transitStops),
      bikeParkingIds: selectNearestBikeParkingIds(center, input.bikeParking),
      playgroundFeatureIds: selectNearestPlaygroundFeatureIds(center, input.parkFeatures),
      accessibleNavigationNodeIds: accessibleNodes.map((node) => node.id),
      accessibleNavigationEdgeIds: accessibleEdges.map((edge) => edge.id)
    },
    coverage: {
      radiusMeters: template.radiusMeters,
      targetDistrictIds: uniqueIds([civicAnchor.districtId, ...civicAnchor.catchment.targetDistrictIds]),
      coveredNavigationNodeIds: coverageNodes.map((node) => node.id),
      coveredNavigationEdgeIds: coverageEdges.map((edge) => edge.id),
      educationAccessScore: template.educationAccessScore,
      estimatedDropOffWalkMeters: template.estimatedDropOffWalkMeters
    },
    acceptsDropOff: template.acceptsDropOff,
    publicLearningAccess: template.publicLearningAccess,
    scheduleProfileId: civicAnchor.schedule.scheduleProfileId,
    renderBindingId: 'binding:civic:education-anchor'
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

function selectNearestDropOffCurbZoneIds(center: Point2D, curbZones: readonly CurbZone[]): CityId[] {
  return curbZones
    .filter((zone) => zone.curbUse === 'ride-hail' || zone.curbUse === 'loading' || zone.curbUse === 'parking')
    .map((zone) => ({ id: zone.id, distance: distance2D(center, zone.center) }))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 4)
    .map((zone) => zone.id);
}

function selectNearestTransitStopIds(center: Point2D, transitStops: readonly TransitStop[]): CityId[] {
  return transitStops
    .map((stop) => ({ id: stop.id, distance: distance2D(center, stop.center) }))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 3)
    .map((stop) => stop.id);
}

function selectNearestBikeParkingIds(center: Point2D, bikeParking: readonly BikeParking[]): CityId[] {
  return bikeParking
    .map((parking) => ({ id: parking.id, distance: distance2D(center, parking.position) }))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 4)
    .map((parking) => parking.id);
}

function selectNearestPlaygroundFeatureIds(center: Point2D, parkFeatures: readonly ParkFeature[]): CityId[] {
  return parkFeatures
    .filter((feature) => feature.programKind === 'active-recreation' || feature.surface === 'play-surface')
    .map((feature) => ({ id: feature.id, distance: distance2D(center, feature.center) }))
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 3)
    .map((feature) => feature.id);
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
