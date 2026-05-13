import type { CityId, CommunityAnchorKind, Point2D } from '../../city/data-contracts/cityContracts';
import type { BuildingPlan, CivicAnchor, CommunityAnchor, PlazaZone } from '../../types/city';

export interface CommunityAnchorGeneratorInput {
  readonly civicAnchors: readonly CivicAnchor[];
  readonly buildings: readonly BuildingPlan[];
  readonly plazaZones: readonly PlazaZone[];
}

interface CommunityAnchorTemplate {
  readonly anchorKind: CommunityAnchorKind;
  readonly idSuffix: string;
  readonly name: string;
  readonly program: string;
  readonly plazaZoneKinds: readonly PlazaZone['zoneKind'][];
  readonly offset: Point2D;
  readonly dailyVisitors: number;
  readonly staffCapacity: number;
  readonly eventCapacityPeople: number;
  readonly socialServiceCapacityPeople: number;
  readonly shelterCapacityPeople: number;
  readonly communityCoverageScore: number;
  readonly crowdEventReady: boolean;
  readonly foodDistribution: boolean;
  readonly cemeteryCapacityPlots: number;
}

const COMMUNITY_ANCHOR_TEMPLATES = [
  {
    anchorKind: 'worship-place',
    idSuffix: 'worship-place',
    name: 'Worship Place Community Anchor',
    program: 'worship-place',
    plazaZoneKinds: ['hardscape', 'seating'],
    offset: { x: 0, z: -12 },
    dailyVisitors: 260,
    staffCapacity: 22,
    eventCapacityPeople: 220,
    socialServiceCapacityPeople: 0,
    shelterCapacityPeople: 0,
    communityCoverageScore: 82,
    crowdEventReady: true,
    foodDistribution: false,
    cemeteryCapacityPlots: 0
  },
  {
    anchorKind: 'cemetery',
    idSuffix: 'cemetery',
    name: 'Cemetery Memorial Community Anchor',
    program: 'cemetery',
    plazaZoneKinds: ['shade', 'hardscape'],
    offset: { x: -14, z: -4 },
    dailyVisitors: 80,
    staffCapacity: 10,
    eventCapacityPeople: 80,
    socialServiceCapacityPeople: 0,
    shelterCapacityPeople: 0,
    communityCoverageScore: 65,
    crowdEventReady: true,
    foodDistribution: false,
    cemeteryCapacityPlots: 1200
  },
  {
    anchorKind: 'processional-space',
    idSuffix: 'processional-space',
    name: 'Processional Space Community Anchor',
    program: 'processional-space',
    plazaZoneKinds: ['event', 'hardscape', 'paving'],
    offset: { x: 14, z: -4 },
    dailyVisitors: 120,
    staffCapacity: 8,
    eventCapacityPeople: 500,
    socialServiceCapacityPeople: 0,
    shelterCapacityPeople: 0,
    communityCoverageScore: 70,
    crowdEventReady: true,
    foodDistribution: false,
    cemeteryCapacityPlots: 0
  },
  {
    anchorKind: 'social-service',
    idSuffix: 'social-service',
    name: 'Social Services Community Anchor',
    program: 'social-service',
    plazaZoneKinds: ['active-edge', 'seating'],
    offset: { x: -10, z: 6 },
    dailyVisitors: 240,
    staffCapacity: 34,
    eventCapacityPeople: 60,
    socialServiceCapacityPeople: 160,
    shelterCapacityPeople: 0,
    communityCoverageScore: 88,
    crowdEventReady: false,
    foodDistribution: false,
    cemeteryCapacityPlots: 0
  },
  {
    anchorKind: 'recreation-center',
    idSuffix: 'recreation-center',
    name: 'Recreation Center Community Anchor',
    program: 'recreation-center',
    plazaZoneKinds: ['active-edge', 'event'],
    offset: { x: 10, z: 6 },
    dailyVisitors: 320,
    staffCapacity: 28,
    eventCapacityPeople: 180,
    socialServiceCapacityPeople: 80,
    shelterCapacityPeople: 0,
    communityCoverageScore: 84,
    crowdEventReady: true,
    foodDistribution: false,
    cemeteryCapacityPlots: 0
  },
  {
    anchorKind: 'food-bank',
    idSuffix: 'food-bank',
    name: 'Food Bank Community Anchor',
    program: 'food-bank',
    plazaZoneKinds: ['active-edge', 'paving'],
    offset: { x: -12, z: 16 },
    dailyVisitors: 210,
    staffCapacity: 24,
    eventCapacityPeople: 40,
    socialServiceCapacityPeople: 220,
    shelterCapacityPeople: 0,
    communityCoverageScore: 86,
    crowdEventReady: false,
    foodDistribution: true,
    cemeteryCapacityPlots: 0
  },
  {
    anchorKind: 'shelter',
    idSuffix: 'shelter',
    name: 'Community Shelter Anchor',
    program: 'shelter',
    plazaZoneKinds: ['hardscape', 'seating'],
    offset: { x: 12, z: 16 },
    dailyVisitors: 190,
    staffCapacity: 30,
    eventCapacityPeople: 50,
    socialServiceCapacityPeople: 120,
    shelterCapacityPeople: 140,
    communityCoverageScore: 90,
    crowdEventReady: false,
    foodDistribution: false,
    cemeteryCapacityPlots: 0
  },
  {
    anchorKind: 'community-hall',
    idSuffix: 'community-hall',
    name: 'Community Hall Anchor',
    program: 'community-hall',
    plazaZoneKinds: ['event', 'seating', 'hardscape'],
    offset: { x: 0, z: 24 },
    dailyVisitors: 280,
    staffCapacity: 26,
    eventCapacityPeople: 360,
    socialServiceCapacityPeople: 90,
    shelterCapacityPeople: 0,
    communityCoverageScore: 87,
    crowdEventReady: true,
    foodDistribution: false,
    cemeteryCapacityPlots: 0
  }
] as const satisfies readonly CommunityAnchorTemplate[];

export class CommunityAnchorGenerator {
  create(input: CommunityAnchorGeneratorInput): CommunityAnchor[] {
    const communityAnchor = input.civicAnchors.find((anchor) => anchor.serviceType === 'community');
    const building = communityAnchor
      ? input.buildings.find((candidate) => candidate.id === communityAnchor.buildingId)
      : undefined;

    if (!communityAnchor || !building) {
      return [];
    }

    return COMMUNITY_ANCHOR_TEMPLATES.map((template) =>
      createCommunityAnchor(template, communityAnchor, building, input.plazaZones)
    );
  }
}

function createCommunityAnchor(
  template: CommunityAnchorTemplate,
  civicAnchor: CivicAnchor,
  building: BuildingPlan,
  plazaZones: readonly PlazaZone[]
): CommunityAnchor {
  return {
    id: `community-anchor-${template.idSuffix}`,
    kind: 'community-anchor',
    ownerDomain: 'civic',
    parentId: civicAnchor.id,
    name: template.name,
    lod: template.anchorKind === 'social-service' || template.anchorKind === 'food-bank' ? 'lod3' : 'lod2',
    tags: {
      serviceType: civicAnchor.serviceType,
      communityAnchorKind: template.anchorKind,
      serviceProgram: template.program,
      renderBinding: 'community-anchor'
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
    serviceProgram: template.program,
    dailyVisitors: template.dailyVisitors,
    staffCapacity: template.staffCapacity,
    eventCapacityPeople: template.eventCapacityPeople,
    socialServiceCapacityPeople: template.socialServiceCapacityPeople,
    shelterCapacityPeople: template.shelterCapacityPeople,
    communityCoverageScore: template.communityCoverageScore,
    crowdEventReady: template.crowdEventReady,
    foodDistribution: template.foodDistribution,
    cemeteryCapacityPlots: template.cemeteryCapacityPlots,
    scheduleProfileId: civicAnchor.schedule.scheduleProfileId,
    renderBindingId: 'binding:civic:community-anchor'
  };
}

function selectPlazaZoneIds(plazaZones: readonly PlazaZone[], zoneKinds: readonly PlazaZone['zoneKind'][]): CityId[] {
  return plazaZones
    .filter((zone) => zone.plazaId === 'civic-plaza' && zoneKinds.includes(zone.zoneKind))
    .map((zone) => zone.id)
    .sort();
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
