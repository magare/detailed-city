import type {
  CivicAnchorArrivalMode,
  CivicAnchorServiceType,
  CityId
} from '../../city/data-contracts/cityContracts';
import type { AdministrativeBoundaryPlan, BuildingPlan, CivicAnchor, DistrictPlan, Parcel } from '../../types/city';
import { getPolygonBounds } from '../../utils/geometry';

export interface CivicAnchorGeneratorInput {
  readonly administrativeBoundaries: readonly AdministrativeBoundaryPlan[];
  readonly districts: readonly DistrictPlan[];
  readonly parcels: readonly Parcel[];
  readonly buildings: readonly BuildingPlan[];
}

interface CivicAnchorTemplate {
  readonly serviceType: CivicAnchorServiceType;
  readonly name: string;
  readonly scheduleProfileId: string;
  readonly arrivalModes: readonly CivicAnchorArrivalMode[];
  readonly catchmentRadiusMeters: number;
  readonly dailyVisitors: number;
  readonly staff: number;
  readonly emergencyAccess: boolean;
  readonly emergencyOccupancy?: number;
}

const CIVIC_ANCHOR_TEMPLATES = [
  {
    serviceType: 'government',
    name: 'Civic Campus Service Anchor',
    scheduleProfileId: 'schedule:civic:government-weekday',
    arrivalModes: ['pedestrian', 'bike', 'transit', 'vehicle', 'service'],
    catchmentRadiusMeters: 520,
    dailyVisitors: 840,
    staff: 180,
    emergencyAccess: true,
    emergencyOccupancy: 260
  },
  {
    serviceType: 'education',
    name: 'Learning Commons Service Anchor',
    scheduleProfileId: 'schedule:civic:education-day',
    arrivalModes: ['pedestrian', 'bike', 'transit', 'vehicle'],
    catchmentRadiusMeters: 460,
    dailyVisitors: 620,
    staff: 92,
    emergencyAccess: false
  },
  {
    serviceType: 'healthcare',
    name: 'Community Health Service Anchor',
    scheduleProfileId: 'schedule:civic:healthcare-extended',
    arrivalModes: ['pedestrian', 'transit', 'vehicle', 'service', 'emergency'],
    catchmentRadiusMeters: 640,
    dailyVisitors: 520,
    staff: 110,
    emergencyAccess: true,
    emergencyOccupancy: 120
  },
  {
    serviceType: 'emergency',
    name: 'Emergency Readiness Service Anchor',
    scheduleProfileId: 'schedule:civic:emergency-24h',
    arrivalModes: ['vehicle', 'service', 'emergency'],
    catchmentRadiusMeters: 780,
    dailyVisitors: 160,
    staff: 72,
    emergencyAccess: true,
    emergencyOccupancy: 320
  }
] as const satisfies readonly CivicAnchorTemplate[];

export class CivicAnchorGenerator {
  create(input: CivicAnchorGeneratorInput): CivicAnchor[] {
    const civicDistrict = input.districts.find((district) => district.district === 'civic');
    const civicBuildings = input.buildings
      .filter((building) => building.typology.kind === 'civic')
      .sort((first, second) => first.id.localeCompare(second.id));

    if (!civicDistrict || civicBuildings.length === 0) {
      return [];
    }

    return CIVIC_ANCHOR_TEMPLATES.map((template, index) => {
      const building = civicBuildings[index % civicBuildings.length];
      const parcel = input.parcels.find((candidate) => candidate.id === building.parcelId);
      const serviceArea = selectServiceArea(input.administrativeBoundaries, template.serviceType);

      return createCivicAnchor({
        template,
        building,
        parcel,
        districtId: civicDistrict.id,
        serviceAreaBoundaryId: serviceArea.id,
        administrativeBoundaryIds: buildingAdministrativeBoundaryIds(parcel, serviceArea.id)
      });
    });
  }
}

function createCivicAnchor(input: {
  readonly template: CivicAnchorTemplate;
  readonly building: BuildingPlan;
  readonly parcel?: Parcel;
  readonly districtId: CityId;
  readonly serviceAreaBoundaryId: CityId;
  readonly administrativeBoundaryIds: readonly CityId[];
}): CivicAnchor {
  const serviceEntranceIds = [`${input.building.id}-entrance-service`];
  const catchmentArea = Math.PI * input.template.catchmentRadiusMeters * input.template.catchmentRadiusMeters;

  return {
    id: `civic-anchor-${input.template.serviceType}-base`,
    kind: 'civic-anchor',
    ownerDomain: 'civic',
    parentId: input.building.id,
    name: input.template.name,
    lod: 'lod2',
    tags: {
      serviceType: input.template.serviceType,
      civicBaseContract: true,
      renderBinding: 'civic-anchor'
    },
    serviceType: input.template.serviceType,
    buildingId: input.building.id,
    districtId: input.districtId,
    blockId: input.parcel?.blockId ?? input.building.parentId ?? '',
    parcelId: input.building.parcelId,
    administrativeBoundaryIds: input.administrativeBoundaryIds,
    serviceAreaBoundaryId: input.serviceAreaBoundaryId,
    center: input.building.center,
    catchment: {
      radiusMeters: input.template.catchmentRadiusMeters,
      populationCapacity: Math.round(input.template.dailyVisitors * 1.6),
      serviceAreaSqM: Number(catchmentArea.toFixed(2)),
      targetDistrictIds: [input.districtId]
    },
    capacity: {
      dailyVisitors: input.template.dailyVisitors,
      staff: input.template.staff,
      emergencyOccupancy: input.template.emergencyOccupancy
    },
    arrivalModes: input.template.arrivalModes,
    publicEntranceIds: input.building.publicEntranceIds,
    serviceEntranceIds,
    schedule: {
      scheduleProfileId: input.template.scheduleProfileId,
      openHour: input.template.emergencyAccess ? 0 : 8,
      closeHour: input.template.emergencyAccess ? 24 : 18,
      emergencyAccess: input.template.emergencyAccess
    },
    renderBindingId: 'binding:civic:anchor'
  };
}

function selectServiceArea(
  boundaries: readonly AdministrativeBoundaryPlan[],
  serviceType: CivicAnchorServiceType
): AdministrativeBoundaryPlan {
  const preferredService = serviceType === 'emergency' || serviceType === 'healthcare' ? 'emergency' : 'public-works';
  const serviceArea = boundaries.find(
    (boundary) => boundary.boundaryKind === 'service-area' && boundary.serviceTypes.includes(preferredService)
  );
  const cityLimit = boundaries.find((boundary) => boundary.boundaryKind === 'city-limit');

  return serviceArea ?? cityLimit ?? boundaries[0];
}

function buildingAdministrativeBoundaryIds(parcel: Parcel | undefined, serviceAreaBoundaryId: CityId): CityId[] {
  const ids = new Set(parcel?.administrativeBoundaryIds ?? []);
  ids.add(serviceAreaBoundaryId);
  return [...ids].sort();
}

export function getCivicAnchorCatchmentBounds(anchor: CivicAnchor): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const radius = anchor.catchment.radiusMeters;
  return getPolygonBounds([
    { x: anchor.center.x - radius, z: anchor.center.z - radius },
    { x: anchor.center.x + radius, z: anchor.center.z - radius },
    { x: anchor.center.x + radius, z: anchor.center.z + radius },
    { x: anchor.center.x - radius, z: anchor.center.z + radius }
  ]);
}
