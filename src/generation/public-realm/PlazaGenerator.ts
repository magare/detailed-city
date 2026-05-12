import type { ActiveFrontage, ParkFeature, ParkPatch, PlazaZone } from '../../types/city';
import { rectanglePolygon } from '../../utils/geometry';

export interface PlazaGeneratorSource {
  readonly parks: readonly ParkPatch[];
  readonly parkFeatures: readonly ParkFeature[];
  readonly activeFrontages: readonly ActiveFrontage[];
}

interface PlazaZoneTemplate {
  readonly zoneKind: PlazaZone['zoneKind'];
  readonly name: string;
  readonly offset: { readonly x: number; readonly z: number };
  readonly sizeRatio: { readonly x: number; readonly z: number };
  readonly surface: PlazaZone['surface'];
  readonly pavingTier: PlazaZone['pavingTier'];
  readonly gatheringBehavior: PlazaZone['gatheringBehavior'];
  readonly lod: PlazaZone['lod'];
  readonly capacityFactor: number;
  readonly eventFactor: number;
  readonly shadeCoveragePercent: number;
  readonly parkFeatureKinds: readonly ParkFeature['featureKind'][];
}

const PLAZA_ID = 'civic-plaza';
const PLAZA_BINDING_ID = 'binding:plaza:zone';

const PLAZA_ZONE_TEMPLATES: readonly PlazaZoneTemplate[] = [
  {
    zoneKind: 'hardscape',
    name: 'Ceremonial Hardscape',
    offset: { x: 0.02, z: 0 },
    sizeRatio: { x: 0.76, z: 0.58 },
    surface: 'stone-paver',
    pavingTier: 'primary',
    gatheringBehavior: 'circulation',
    lod: 'lod1',
    capacityFactor: 2.4,
    eventFactor: 0,
    shadeCoveragePercent: 18,
    parkFeatureKinds: ['lawn', 'path']
  },
  {
    zoneKind: 'event',
    name: 'Civic Event Terrace',
    offset: { x: 0.05, z: 0.08 },
    sizeRatio: { x: 0.52, z: 0.34 },
    surface: 'stone-paver',
    pavingTier: 'primary',
    gatheringBehavior: 'programmed-event',
    lod: 'lod2',
    capacityFactor: 1.35,
    eventFactor: 0.95,
    shadeCoveragePercent: 10,
    parkFeatureKinds: ['lawn', 'water-feature']
  },
  {
    zoneKind: 'active-edge',
    name: 'Active Civic Edge',
    offset: { x: -0.39, z: 0 },
    sizeRatio: { x: 0.12, z: 0.72 },
    surface: 'permeable-paver',
    pavingTier: 'accent',
    gatheringBehavior: 'threshold',
    lod: 'lod2',
    capacityFactor: 2.1,
    eventFactor: 0,
    shadeCoveragePercent: 28,
    parkFeatureKinds: ['path', 'seating']
  },
  {
    zoneKind: 'seating',
    name: 'Seating Rooms',
    offset: { x: -0.22, z: 0.28 },
    sizeRatio: { x: 0.28, z: 0.18 },
    surface: 'timber',
    pavingTier: 'secondary',
    gatheringBehavior: 'linger',
    lod: 'lod3',
    capacityFactor: 1.15,
    eventFactor: 0,
    shadeCoveragePercent: 42,
    parkFeatureKinds: ['seating']
  },
  {
    zoneKind: 'shade',
    name: 'Shade Canopy',
    offset: { x: -0.18, z: -0.24 },
    sizeRatio: { x: 0.24, z: 0.2 },
    surface: 'shade-canopy',
    pavingTier: 'secondary',
    gatheringBehavior: 'linger',
    lod: 'lod3',
    capacityFactor: 1.5,
    eventFactor: 0,
    shadeCoveragePercent: 78,
    parkFeatureKinds: ['shade']
  },
  {
    zoneKind: 'paving',
    name: 'Paving Band',
    offset: { x: 0, z: -0.34 },
    sizeRatio: { x: 0.84, z: 0.1 },
    surface: 'permeable-paver',
    pavingTier: 'accent',
    gatheringBehavior: 'circulation',
    lod: 'lod2',
    capacityFactor: 4.2,
    eventFactor: 0,
    shadeCoveragePercent: 12,
    parkFeatureKinds: ['path']
  }
];

export class PlazaGenerator {
  create(source: PlazaGeneratorSource): PlazaZone[] {
    const civicPlaza = source.parks.find((park) => park.id === PLAZA_ID);

    if (!civicPlaza) {
      return [];
    }

    const plazaFeatures = source.parkFeatures.filter((feature) => feature.parkId === civicPlaza.id);
    const activeFrontageIds = getNearestActiveFrontageIds(civicPlaza, source.activeFrontages, 4);

    return PLAZA_ZONE_TEMPLATES.map((template, index) => createPlazaZone(civicPlaza, plazaFeatures, activeFrontageIds, template, index));
  }
}

function createPlazaZone(
  plaza: ParkPatch,
  plazaFeatures: readonly ParkFeature[],
  activeFrontageIds: readonly string[],
  template: PlazaZoneTemplate,
  index: number
): PlazaZone {
  const center = {
    x: roundMeters(plaza.center.x + plaza.size.x * template.offset.x),
    z: roundMeters(plaza.center.z + plaza.size.z * template.offset.z)
  };
  const size = {
    x: roundMeters(Math.max(1.8, plaza.size.x * template.sizeRatio.x)),
    z: roundMeters(Math.max(1.8, plaza.size.z * template.sizeRatio.z))
  };
  const area = size.x * size.z;
  const parkFeatureIds = plazaFeatures
    .filter((feature) => template.parkFeatureKinds.includes(feature.featureKind))
    .map((feature) => feature.id);

  return {
    id: `plaza-zone-${plaza.id}-${template.zoneKind}-${index}`,
    kind: 'plaza-zone',
    ownerDomain: 'public-realm',
    parentId: plaza.id,
    plazaId: plaza.id,
    name: `${plaza.name ?? plaza.id} ${template.name}`,
    lod: template.lod,
    zoneKind: template.zoneKind,
    center,
    size,
    boundary: rectanglePolygon(center, size),
    surface: template.surface,
    pavingTier: template.pavingTier,
    gatheringBehavior: template.gatheringBehavior,
    connectedSidewalkIds: plaza.connectedSidewalkIds,
    activeFrontageIds: template.zoneKind === 'active-edge' || template.zoneKind === 'event' ? activeFrontageIds : [],
    parkFeatureIds,
    capacityPeople: Math.max(4, Math.round(area / template.capacityFactor)),
    eventCapacityPeople: template.eventFactor > 0 ? Math.round(area / template.eventFactor) : 0,
    shadeCoveragePercent: template.shadeCoveragePercent,
    assetBindingId: PLAZA_BINDING_ID,
    tags: {
      plazaId: plaza.id,
      zoneKind: template.zoneKind,
      pavingTier: template.pavingTier,
      gatheringBehavior: template.gatheringBehavior
    }
  };
}

function getNearestActiveFrontageIds(
  plaza: ParkPatch,
  activeFrontages: readonly ActiveFrontage[],
  limit: number
): string[] {
  return [...activeFrontages]
    .sort((left, right) => distanceToPlaza(plaza, left) - distanceToPlaza(plaza, right) || left.id.localeCompare(right.id))
    .slice(0, limit)
    .map((frontage) => frontage.id);
}

function distanceToPlaza(plaza: ParkPatch, frontage: ActiveFrontage): number {
  const dx = frontage.position.x - plaza.center.x;
  const dz = frontage.position.z - plaza.center.z;
  return Math.hypot(dx, dz);
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
