import type { CityId, GovernmentAnchorKind, Point2D } from '../../city/data-contracts/cityContracts';
import type { BuildingPlan, CivicAnchor, GovernmentAnchor, PlazaZone } from '../../types/city';

export interface GovernmentAnchorGeneratorInput {
  readonly civicAnchors: readonly CivicAnchor[];
  readonly buildings: readonly BuildingPlan[];
  readonly plazaZones: readonly PlazaZone[];
}

interface GovernmentAnchorTemplate {
  readonly anchorKind: GovernmentAnchorKind;
  readonly idSuffix: string;
  readonly name: string;
  readonly role: string;
  readonly plazaZoneKinds: readonly PlazaZone['zoneKind'][];
  readonly offset: Point2D;
  readonly serviceCounterCount: number;
  readonly dailyVisitors: number;
  readonly staffCapacity: number;
  readonly queueCapacityPeople: number;
  readonly ceremonialCapacityPeople: number;
  readonly securityScreening: boolean;
  readonly publicAccess: boolean;
}

const GOVERNMENT_ANCHOR_TEMPLATES = [
  {
    anchorKind: 'city-hall',
    idSuffix: 'city-hall',
    name: 'City Hall Public Administration Anchor',
    role: 'city-hall',
    plazaZoneKinds: ['hardscape', 'event', 'active-edge'],
    offset: { x: 0, z: -7 },
    serviceCounterCount: 8,
    dailyVisitors: 360,
    staffCapacity: 120,
    queueCapacityPeople: 72,
    ceremonialCapacityPeople: 180,
    securityScreening: true,
    publicAccess: true
  },
  {
    anchorKind: 'administrative-office',
    idSuffix: 'administrative-offices',
    name: 'Administrative Offices Anchor',
    role: 'administrative-offices',
    plazaZoneKinds: ['active-edge', 'seating'],
    offset: { x: -8, z: -2 },
    serviceCounterCount: 4,
    dailyVisitors: 220,
    staffCapacity: 150,
    queueCapacityPeople: 44,
    ceremonialCapacityPeople: 0,
    securityScreening: true,
    publicAccess: true
  },
  {
    anchorKind: 'court',
    idSuffix: 'courts',
    name: 'Courts Public Access Anchor',
    role: 'courts',
    plazaZoneKinds: ['hardscape', 'paving'],
    offset: { x: 8, z: -2 },
    serviceCounterCount: 3,
    dailyVisitors: 140,
    staffCapacity: 82,
    queueCapacityPeople: 32,
    ceremonialCapacityPeople: 0,
    securityScreening: true,
    publicAccess: true
  },
  {
    anchorKind: 'service-counter',
    idSuffix: 'service-counters',
    name: 'Public Service Counters Anchor',
    role: 'service-counters',
    plazaZoneKinds: ['active-edge', 'seating'],
    offset: { x: -4, z: 5 },
    serviceCounterCount: 12,
    dailyVisitors: 420,
    staffCapacity: 54,
    queueCapacityPeople: 96,
    ceremonialCapacityPeople: 0,
    securityScreening: false,
    publicAccess: true
  },
  {
    anchorKind: 'civic-plaza-interface',
    idSuffix: 'civic-plaza-interface',
    name: 'Civic Plaza Interface Anchor',
    role: 'civic-plaza-interface',
    plazaZoneKinds: ['event', 'hardscape', 'paving'],
    offset: { x: 0, z: 12 },
    serviceCounterCount: 2,
    dailyVisitors: 260,
    staffCapacity: 24,
    queueCapacityPeople: 120,
    ceremonialCapacityPeople: 255,
    securityScreening: false,
    publicAccess: true
  }
] as const satisfies readonly GovernmentAnchorTemplate[];

export class GovernmentAnchorGenerator {
  create(input: GovernmentAnchorGeneratorInput): GovernmentAnchor[] {
    const governmentAnchor = input.civicAnchors.find((anchor) => anchor.serviceType === 'government');
    const building = governmentAnchor
      ? input.buildings.find((candidate) => candidate.id === governmentAnchor.buildingId)
      : undefined;

    if (!governmentAnchor || !building) {
      return [];
    }

    return GOVERNMENT_ANCHOR_TEMPLATES.map((template) =>
      createGovernmentAnchor(template, governmentAnchor, building, input.plazaZones)
    );
  }
}

function createGovernmentAnchor(
  template: GovernmentAnchorTemplate,
  civicAnchor: CivicAnchor,
  building: BuildingPlan,
  plazaZones: readonly PlazaZone[]
): GovernmentAnchor {
  return {
    id: `government-anchor-${template.idSuffix}`,
    kind: 'government-anchor',
    ownerDomain: 'civic',
    parentId: civicAnchor.id,
    name: template.name,
    lod: template.anchorKind === 'service-counter' ? 'lod3' : 'lod2',
    tags: {
      serviceType: civicAnchor.serviceType,
      governmentAnchorKind: template.anchorKind,
      publicAdministrationRole: template.role,
      renderBinding: 'government-anchor'
    },
    anchorKind: template.anchorKind,
    civicAnchorId: civicAnchor.id,
    buildingId: building.id,
    districtId: civicAnchor.districtId,
    plazaZoneIds: selectPlazaZoneIds(plazaZones, template.plazaZoneKinds),
    center: {
      x: roundMeters(building.center.x + template.offset.x),
      z: roundMeters(building.center.z + template.offset.z)
    },
    publicAdministrationRole: template.role,
    serviceCounterCount: template.serviceCounterCount,
    dailyVisitors: template.dailyVisitors,
    staffCapacity: template.staffCapacity,
    queueCapacityPeople: template.queueCapacityPeople,
    ceremonialCapacityPeople: template.ceremonialCapacityPeople,
    securityScreening: template.securityScreening,
    publicAccess: template.publicAccess,
    scheduleProfileId: civicAnchor.schedule.scheduleProfileId,
    renderBindingId: 'binding:civic:government-anchor'
  };
}

function selectPlazaZoneIds(plazaZones: readonly PlazaZone[], zoneKinds: readonly PlazaZone['zoneKind'][]): CityId[] {
  const ids = plazaZones
    .filter((zone) => zone.plazaId === 'civic-plaza' && zoneKinds.includes(zone.zoneKind))
    .map((zone) => zone.id)
    .sort();

  return ids;
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
