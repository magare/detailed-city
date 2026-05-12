import type { CultureAnchorKind, Point2D } from '../../city/data-contracts/cityContracts';
import type { BuildingPlan, CivicAnchor, CultureAnchor, PlazaZone } from '../../types/city';

export interface CultureAnchorGeneratorInput {
  readonly civicAnchors: readonly CivicAnchor[];
  readonly buildings: readonly BuildingPlan[];
  readonly plazaZones: readonly PlazaZone[];
}

interface CultureAnchorTemplate {
  readonly anchorKind: CultureAnchorKind;
  readonly idSuffix: string;
  readonly name: string;
  readonly program: string;
  readonly plazaZoneKinds: readonly PlazaZone['zoneKind'][];
  readonly offset: Point2D;
  readonly culturalFootfallDaily: number;
  readonly staffCapacity: number;
  readonly eventCapacityPeople: number;
  readonly tourismAttractionScore: number;
  readonly eveningActivity: boolean;
  readonly heritageProtected: boolean;
}

const CULTURE_ANCHOR_TEMPLATES = [
  {
    anchorKind: 'museum',
    idSuffix: 'museum',
    name: 'City Museum Culture Anchor',
    program: 'museum',
    plazaZoneKinds: ['hardscape', 'seating'],
    offset: { x: 0, z: -10 },
    culturalFootfallDaily: 360,
    staffCapacity: 45,
    eventCapacityPeople: 120,
    tourismAttractionScore: 92,
    eveningActivity: false,
    heritageProtected: true
  },
  {
    anchorKind: 'theater',
    idSuffix: 'theater',
    name: 'Civic Theater Culture Anchor',
    program: 'theater',
    plazaZoneKinds: ['event', 'hardscape'],
    offset: { x: -10, z: -2 },
    culturalFootfallDaily: 300,
    staffCapacity: 38,
    eventCapacityPeople: 320,
    tourismAttractionScore: 85,
    eveningActivity: true,
    heritageProtected: false
  },
  {
    anchorKind: 'gallery',
    idSuffix: 'gallery',
    name: 'Public Gallery Culture Anchor',
    program: 'gallery',
    plazaZoneKinds: ['active-edge', 'seating'],
    offset: { x: 10, z: -2 },
    culturalFootfallDaily: 180,
    staffCapacity: 20,
    eventCapacityPeople: 80,
    tourismAttractionScore: 75,
    eveningActivity: true,
    heritageProtected: false
  },
  {
    anchorKind: 'venue',
    idSuffix: 'venue',
    name: 'Live Venue Culture Anchor',
    program: 'live-venue',
    plazaZoneKinds: ['event', 'paving'],
    offset: { x: -7, z: 8 },
    culturalFootfallDaily: 280,
    staffCapacity: 34,
    eventCapacityPeople: 260,
    tourismAttractionScore: 78,
    eveningActivity: true,
    heritageProtected: false
  },
  {
    anchorKind: 'heritage-site',
    idSuffix: 'heritage-site',
    name: 'Heritage Site Culture Anchor',
    program: 'heritage-site',
    plazaZoneKinds: ['hardscape', 'shade'],
    offset: { x: 7, z: 8 },
    culturalFootfallDaily: 220,
    staffCapacity: 16,
    eventCapacityPeople: 60,
    tourismAttractionScore: 95,
    eveningActivity: false,
    heritageProtected: true
  },
  {
    anchorKind: 'event-space',
    idSuffix: 'event-space',
    name: 'Cultural Event Space Anchor',
    program: 'event-space',
    plazaZoneKinds: ['event', 'hardscape', 'paving'],
    offset: { x: 0, z: 15 },
    culturalFootfallDaily: 340,
    staffCapacity: 28,
    eventCapacityPeople: 420,
    tourismAttractionScore: 80,
    eveningActivity: true,
    heritageProtected: false
  }
] as const satisfies readonly CultureAnchorTemplate[];

export class CultureAnchorGenerator {
  create(input: CultureAnchorGeneratorInput): CultureAnchor[] {
    const cultureAnchor = input.civicAnchors.find((anchor) => anchor.serviceType === 'culture');
    const building = cultureAnchor
      ? input.buildings.find((candidate) => candidate.id === cultureAnchor.buildingId)
      : undefined;

    if (!cultureAnchor || !building) {
      return [];
    }

    return CULTURE_ANCHOR_TEMPLATES.map((template) =>
      createCultureAnchor(template, cultureAnchor, building, input.plazaZones)
    );
  }
}

function createCultureAnchor(
  template: CultureAnchorTemplate,
  civicAnchor: CivicAnchor,
  building: BuildingPlan,
  plazaZones: readonly PlazaZone[]
): CultureAnchor {
  return {
    id: `culture-anchor-${template.idSuffix}`,
    kind: 'culture-anchor',
    ownerDomain: 'civic',
    parentId: civicAnchor.id,
    name: template.name,
    lod: template.anchorKind === 'heritage-site' || template.anchorKind === 'gallery' ? 'lod3' : 'lod2',
    tags: {
      serviceType: civicAnchor.serviceType,
      cultureAnchorKind: template.anchorKind,
      culturalProgram: template.program,
      renderBinding: 'culture-anchor'
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
    culturalProgram: template.program,
    culturalFootfallDaily: template.culturalFootfallDaily,
    staffCapacity: template.staffCapacity,
    eventCapacityPeople: template.eventCapacityPeople,
    tourismAttractionScore: template.tourismAttractionScore,
    eveningActivity: template.eveningActivity,
    heritageProtected: template.heritageProtected,
    scheduleProfileId: civicAnchor.schedule.scheduleProfileId,
    renderBindingId: 'binding:civic:culture-anchor'
  };
}

function selectPlazaZoneIds(plazaZones: readonly PlazaZone[], zoneKinds: readonly PlazaZone['zoneKind'][]): string[] {
  return plazaZones
    .filter((zone) => zone.plazaId === 'civic-plaza' && zoneKinds.includes(zone.zoneKind))
    .map((zone) => zone.id)
    .sort();
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
