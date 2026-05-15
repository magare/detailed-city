import type {
  CityId,
  EmergencyResponseMode,
  EmergencyServiceAnchorKind,
  Point2D
} from '../../city/data-contracts/cityContracts';
import type {
  BuildingFireSafetyProfile,
  BuildingPlan,
  CivicAnchor,
  CurbZone,
  EmergencyServiceAnchor,
  NavigationGraphEdge,
  NavigationGraphNode
} from '../../types/city';

export interface EmergencyServiceAnchorGeneratorInput {
  readonly civicAnchors: readonly CivicAnchor[];
  readonly buildings: readonly BuildingPlan[];
  readonly buildingFireSafetyProfiles: readonly BuildingFireSafetyProfile[];
  readonly navigationGraphNodes: readonly NavigationGraphNode[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
  readonly curbZones: readonly CurbZone[];
}

interface EmergencyServiceAnchorTemplate {
  readonly anchorKind: EmergencyServiceAnchorKind;
  readonly responseMode: EmergencyResponseMode;
  readonly name: string;
  readonly buildingOffset: number;
  readonly centerOffset: Point2D;
  readonly unitCapacity: number;
  readonly responderCapacity: number;
  readonly vehiclesAvailable: number;
  readonly stagingBays: number;
  readonly dispatchPriority: number;
  readonly coverageRadiusMeters: number;
  readonly estimatedResponseSeconds: number;
  readonly stagingAreaSqM: number;
  readonly assemblyCapacityPeople: number;
  readonly ambulanceBays: number;
  readonly commandPostReady: boolean;
  readonly shelterCapacityPeople: number;
}

const EMERGENCY_SERVICE_ANCHOR_TEMPLATES = [
  {
    anchorKind: 'fire-station',
    responseMode: 'fire',
    name: 'Central Fire Station Dispatch Anchor',
    buildingOffset: 0,
    centerOffset: { x: -10, z: -8 },
    unitCapacity: 4,
    responderCapacity: 34,
    vehiclesAvailable: 5,
    stagingBays: 3,
    dispatchPriority: 1,
    coverageRadiusMeters: 960,
    estimatedResponseSeconds: 260,
    stagingAreaSqM: 620,
    assemblyCapacityPeople: 80,
    ambulanceBays: 0,
    commandPostReady: false,
    shelterCapacityPeople: 0
  },
  {
    anchorKind: 'police-station',
    responseMode: 'police',
    name: 'Public Safety Police Station Anchor',
    buildingOffset: 1,
    centerOffset: { x: 10, z: -6 },
    unitCapacity: 5,
    responderCapacity: 42,
    vehiclesAvailable: 8,
    stagingBays: 2,
    dispatchPriority: 2,
    coverageRadiusMeters: 900,
    estimatedResponseSeconds: 300,
    stagingAreaSqM: 480,
    assemblyCapacityPeople: 70,
    ambulanceBays: 0,
    commandPostReady: false,
    shelterCapacityPeople: 0
  },
  {
    anchorKind: 'ambulance-post',
    responseMode: 'medical',
    name: 'Ambulance Response Post Anchor',
    buildingOffset: 2,
    centerOffset: { x: -8, z: 8 },
    unitCapacity: 3,
    responderCapacity: 22,
    vehiclesAvailable: 4,
    stagingBays: 2,
    dispatchPriority: 1,
    coverageRadiusMeters: 980,
    estimatedResponseSeconds: 240,
    stagingAreaSqM: 360,
    assemblyCapacityPeople: 44,
    ambulanceBays: 4,
    commandPostReady: false,
    shelterCapacityPeople: 0
  },
  {
    anchorKind: 'public-shelter',
    responseMode: 'shelter',
    name: 'Emergency Public Shelter Anchor',
    buildingOffset: 3,
    centerOffset: { x: 8, z: 9 },
    unitCapacity: 2,
    responderCapacity: 18,
    vehiclesAvailable: 2,
    stagingBays: 1,
    dispatchPriority: 4,
    coverageRadiusMeters: 760,
    estimatedResponseSeconds: 480,
    stagingAreaSqM: 720,
    assemblyCapacityPeople: 260,
    ambulanceBays: 1,
    commandPostReady: false,
    shelterCapacityPeople: 420
  },
  {
    anchorKind: 'command-post',
    responseMode: 'command',
    name: 'Incident Command Post Anchor',
    buildingOffset: 4,
    centerOffset: { x: 0, z: -14 },
    unitCapacity: 2,
    responderCapacity: 28,
    vehiclesAvailable: 3,
    stagingBays: 2,
    dispatchPriority: 1,
    coverageRadiusMeters: 1120,
    estimatedResponseSeconds: 360,
    stagingAreaSqM: 540,
    assemblyCapacityPeople: 96,
    ambulanceBays: 1,
    commandPostReady: true,
    shelterCapacityPeople: 0
  },
  {
    anchorKind: 'staging-area',
    responseMode: 'multi-agency',
    name: 'Multi Agency Staging Area Anchor',
    buildingOffset: 5,
    centerOffset: { x: 0, z: 16 },
    unitCapacity: 6,
    responderCapacity: 64,
    vehiclesAvailable: 12,
    stagingBays: 6,
    dispatchPriority: 3,
    coverageRadiusMeters: 1180,
    estimatedResponseSeconds: 420,
    stagingAreaSqM: 1250,
    assemblyCapacityPeople: 180,
    ambulanceBays: 2,
    commandPostReady: true,
    shelterCapacityPeople: 160
  }
] as const satisfies readonly EmergencyServiceAnchorTemplate[];

export class EmergencyServiceAnchorGenerator {
  create(input: EmergencyServiceAnchorGeneratorInput): EmergencyServiceAnchor[] {
    const civicAnchor = input.civicAnchors.find((anchor) => anchor.serviceType === 'emergency');
    const civicBuildings = input.buildings
      .filter((building) => building.typology.kind === 'civic')
      .sort((first, second) => first.id.localeCompare(second.id));
    const buildingsById = new Map(input.buildings.map((building) => [building.id, building]));

    if (!civicAnchor || civicBuildings.length === 0) {
      return [];
    }

    return EMERGENCY_SERVICE_ANCHOR_TEMPLATES.map((template) => {
      const building = civicBuildings[template.buildingOffset % civicBuildings.length];
      const coveredProfiles = selectCoveredFireSafetyProfiles(
        building,
        template,
        input.buildingFireSafetyProfiles,
        buildingsById
      );
      const access = createEmergencyAccessRefs({
        center: building.center,
        roadId: building.primaryFrontageRoadId,
        coveredProfiles,
        navigationGraphNodes: input.navigationGraphNodes,
        navigationGraphEdges: input.navigationGraphEdges,
        curbZones: input.curbZones
      });

      return {
        id: `emergency-service-anchor-${template.anchorKind}`,
        kind: 'emergency-service-anchor',
        ownerDomain: 'civic',
        parentId: civicAnchor.id,
        name: template.name,
        lod: template.anchorKind === 'staging-area' ? 'lod4' : 'lod3',
        tags: {
          serviceType: 'emergency',
          emergencyServiceKind: template.anchorKind,
          responseMode: template.responseMode,
          dispatchAnchor: true,
          renderBinding: 'emergency-service-anchor'
        },
        anchorKind: template.anchorKind,
        responseMode: template.responseMode,
        civicAnchorId: civicAnchor.id,
        buildingId: building.id,
        parcelId: building.parcelId,
        districtId: civicAnchor.districtId,
        roadId: building.primaryFrontageRoadId,
        serviceAreaBoundaryId: civicAnchor.serviceAreaBoundaryId,
        center: {
          x: roundMeters(building.center.x + template.centerOffset.x),
          z: roundMeters(building.center.z + template.centerOffset.z)
        },
        dispatch: {
          unitCapacity: template.unitCapacity,
          responderCapacity: template.responderCapacity,
          vehiclesAvailable: template.vehiclesAvailable,
          stagingBays: template.stagingBays,
          operates24h: true,
          dispatchPriority: template.dispatchPriority
        },
        coverage: {
          radiusMeters: template.coverageRadiusMeters,
          targetDistrictIds: uniqueIds([civicAnchor.districtId]),
          coveredRoadIds: selectCoveredRoadIds(building, input.navigationGraphEdges, template.coverageRadiusMeters),
          coveredBuildingFireSafetyProfileIds: coveredProfiles.map((profile) => profile.id),
          estimatedResponseSeconds: template.estimatedResponseSeconds,
          coverageScore: getCoverageScore(template, coveredProfiles.length)
        },
        staging: {
          stagingAreaSqM: template.stagingAreaSqM,
          assemblyCapacityPeople: template.assemblyCapacityPeople,
          ambulanceBays: template.ambulanceBays,
          commandPostReady: template.commandPostReady,
          shelterCapacityPeople: template.shelterCapacityPeople
        },
        access,
        scheduleProfileId: civicAnchor.schedule.scheduleProfileId,
        renderBindingId: 'binding:civic:emergency-service-anchor'
      };
    });
  }
}

function selectCoveredFireSafetyProfiles(
  building: BuildingPlan,
  template: EmergencyServiceAnchorTemplate,
  profiles: readonly BuildingFireSafetyProfile[],
  buildingsById: ReadonlyMap<CityId, BuildingPlan>
): BuildingFireSafetyProfile[] {
  const sortedProfiles = profiles
    .map((profile) => ({
      profile,
      distance: distance2D(building.center, buildingsById.get(profile.buildingId)?.center ?? building.center)
    }))
    .filter(({ distance }) => distance <= template.coverageRadiusMeters)
    .sort((first, second) => first.distance - second.distance || first.profile.id.localeCompare(second.profile.id));
  const minimumCount = template.anchorKind === 'public-shelter' ? 48 : 72;

  return sortedProfiles.slice(0, Math.max(minimumCount, Math.min(sortedProfiles.length, 120))).map(({ profile }) => profile);
}

function createEmergencyAccessRefs(input: {
  readonly center: Point2D;
  readonly roadId: CityId;
  readonly coveredProfiles: readonly BuildingFireSafetyProfile[];
  readonly navigationGraphNodes: readonly NavigationGraphNode[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
  readonly curbZones: readonly CurbZone[];
}): EmergencyServiceAnchor['access'] {
  const navigationNodeIds = input.navigationGraphNodes
    .filter((node) => node.mode === 'emergency')
    .map((node) => ({ node, distance: distance2D(input.center, node.position) }))
    .sort((first, second) => first.distance - second.distance || first.node.id.localeCompare(second.node.id))
    .slice(0, 3)
    .map(({ node }) => node.id);
  const navigationEdgeIds = input.navigationGraphEdges
    .filter((edge) => edge.mode === 'emergency' && edge.roadIds.includes(input.roadId))
    .slice(0, 3)
    .map((edge) => edge.id);
  const roadFireLaneIds = input.curbZones
    .filter((curbZone) => curbZone.roadId === input.roadId && curbZone.management.fireLaneClearance)
    .map((curbZone) => curbZone.id);
  const profileFireLaneIds = input.coveredProfiles.flatMap((profile) => profile.fireLaneCurbZoneIds);
  const serviceAccessCorridorIds = input.coveredProfiles.flatMap((profile) => profile.serviceAccessCorridorIds);
  const hydrantNodeIds = input.coveredProfiles.map((profile) => profile.hydrantNodeId);

  return {
    navigationNodeIds,
    navigationEdgeIds,
    fireLaneCurbZoneIds: uniqueIds([...roadFireLaneIds, ...profileFireLaneIds]).slice(0, 12),
    serviceAccessCorridorIds: uniqueIds(serviceAccessCorridorIds).slice(0, 12),
    hydrantNodeIds: uniqueIds(hydrantNodeIds).slice(0, 12)
  };
}

function selectCoveredRoadIds(
  building: BuildingPlan,
  navigationGraphEdges: readonly NavigationGraphEdge[],
  radiusMeters: number
): CityId[] {
  const candidateRoadIds = navigationGraphEdges
    .filter((edge) => edge.mode === 'emergency')
    .flatMap((edge) => edge.roadIds)
    .filter((roadId) => roadId === building.primaryFrontageRoadId || radiusMeters >= 900);
  return uniqueIds([building.primaryFrontageRoadId, ...candidateRoadIds]).slice(0, 28);
}

function getCoverageScore(template: EmergencyServiceAnchorTemplate, coveredProfileCount: number): number {
  const coverageFactor = Math.min(1, coveredProfileCount / 90);
  const capacityFactor = Math.min(1, (template.responderCapacity + template.vehiclesAvailable * 6) / 80);
  return Number(((coverageFactor * 0.62 + capacityFactor * 0.38) * 100).toFixed(1));
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)].filter(Boolean).sort();
}

function distance2D(start: Point2D, end: Point2D): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
