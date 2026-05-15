import type { AssetDefinition, RenderBinding } from '../../data-contracts/cityContracts';

export const CANONICAL_MATERIAL_SURFACES = [
  'asphalt',
  'concrete',
  'glass',
  'brick',
  'metal',
  'water',
  'sign',
  'foliage',
  'facade-panel',
  'roof',
  'utility',
  'overlay'
] as const;

export type CanonicalMaterialSurface = (typeof CANONICAL_MATERIAL_SURFACES)[number];

export interface MaterialZoneDefinition {
  readonly id: string;
  readonly name: string;
  readonly surface: CanonicalMaterialSurface;
  readonly fallbackMaterial: string;
  readonly atlasChannel: string;
}

export const MATERIAL_ZONE_DEFINITIONS = [
  defineZone('terrain', 'Terrain Ground', 'overlay', 'terrain', 'ground'),
  defineZone('asphalt', 'Road Asphalt', 'asphalt', 'asphalt', 'road-pavement'),
  defineZone('lane-paint', 'Lane Paint', 'sign', 'lanePaint', 'road-markings'),
  defineZone('crosswalk-paint', 'Crosswalk Paint', 'sign', 'lanePaint', 'road-markings'),
  defineZone('tactile-paving', 'Tactile Paving', 'concrete', 'tactilePaving', 'sidewalk-detail'),
  defineZone('curb-concrete', 'Curb Concrete', 'concrete', 'refugeIsland', 'curbs'),
  defineZone('traffic-calming', 'Traffic Calming Surface', 'concrete', 'trafficCalming', 'traffic-calming'),
  defineZone('water', 'Water Surface', 'water', 'water', 'water-surface'),
  defineZone('park', 'Park Ground', 'foliage', 'park', 'park-ground'),
  defineZone('park-lawn', 'Park Lawn', 'foliage', 'park', 'park-ground'),
  defineZone('park-path', 'Park Path', 'concrete', 'refugeIsland', 'park-hardscape'),
  defineZone('park-planting', 'Park Planting', 'foliage', 'treeCanopy', 'planting'),
  defineZone('park-sports', 'Park Sports Surface', 'concrete', 'signPanelBlue', 'park-program'),
  defineZone('park-seating', 'Park Seating Surface', 'concrete', 'streetFurnitureWood', 'park-program'),
  defineZone('park-water-feature', 'Park Water Feature', 'water', 'water', 'water-surface'),
  defineZone('park-shade', 'Park Shade Structure', 'metal', 'streetFurnitureMetal', 'shade-structure'),
  defineZone('plaza', 'Plaza Hardscape', 'concrete', 'plazaHardscape', 'plaza-hardscape'),
  defineZone('plaza-zone', 'Plaza Zone Surface', 'concrete', 'plazaHardscape', 'plaza-hardscape'),
  defineZone('waterfront', 'Waterfront Edge', 'concrete', 'waterfrontEdge', 'waterfront-hardscape'),
  defineZone('waterfront-edge', 'Waterfront Edge Primitive', 'concrete', 'waterfrontEdge', 'waterfront-hardscape'),
  defineZone('waterfront-open-space', 'Waterfront Open Space', 'concrete', 'waterfrontEdge', 'waterfront-open-space'),
  defineZone('building', 'Building Massing', 'facade-panel', 'building', 'facade-panel'),
  defineZone('brick', 'Brick Facade', 'brick', 'brick', 'facade-panel'),
  defineZone('civic', 'Civic Facade', 'facade-panel', 'building', 'civic-facade'),
  defineZone('civic-anchor', 'Civic Anchor Marker', 'facade-panel', 'building', 'civic-marker'),
  defineZone('community-anchor', 'Community Anchor Marker', 'facade-panel', 'plazaHardscape', 'civic-marker'),
  defineZone('culture-anchor', 'Culture Anchor Marker', 'sign', 'storefrontSign', 'civic-marker'),
  defineZone('government-anchor', 'Government Anchor Marker', 'facade-panel', 'building', 'civic-marker'),
  defineZone('roof', 'Roof Surface', 'roof', 'rooftop', 'roof'),
  defineZone('solar', 'Solar Roof Panel', 'roof', 'roofSolarPanel', 'roof-detail'),
  defineZone('green-roof', 'Green Roof', 'foliage', 'roofGreen', 'roof-detail'),
  defineZone('terrace', 'Roof Terrace', 'concrete', 'roofTerrace', 'roof-detail'),
  defineZone('metal', 'Architectural Metal', 'metal', 'metal', 'metal-panel'),
  defineZone('storefront-window', 'Storefront Window', 'glass', 'storefrontGlass', 'storefront'),
  defineZone('storefront-glass', 'Storefront Glass', 'glass', 'storefrontGlass', 'storefront'),
  defineZone('storefront-awning', 'Storefront Awning', 'facade-panel', 'storefrontAwning', 'storefront'),
  defineZone('storefront-sign', 'Storefront Sign', 'sign', 'storefrontSign', 'signage'),
  defineZone('entrance-door', 'Entrance Door', 'facade-panel', 'entranceDoor', 'storefront'),
  defineZone('night-window', 'Night Window Glow', 'glass', 'windowGlow', 'window-light'),
  defineZone('window-glow', 'Window Glow', 'glass', 'windowGlow', 'window-light'),
  defineZone('tree-trunk', 'Tree Trunk', 'foliage', 'treeTrunk', 'planting'),
  defineZone('bark', 'Tree Bark', 'foliage', 'treeTrunk', 'planting'),
  defineZone('tree-canopy', 'Tree Canopy', 'foliage', 'treeCanopy', 'planting'),
  defineZone('foliage', 'Foliage', 'foliage', 'treeCanopy', 'planting'),
  defineZone('street-light', 'Street Light', 'metal', 'streetLightPole', 'street-lighting'),
  defineZone('street-light-glow', 'Street Light Glow', 'sign', 'streetLightGlow', 'street-lighting'),
  defineZone('street-furniture', 'Street Furniture', 'metal', 'streetFurnitureMetal', 'street-furniture'),
  defineZone('bench', 'Bench', 'metal', 'streetFurnitureWood', 'street-furniture'),
  defineZone('bin', 'Bin', 'utility', 'streetFurnitureAccent', 'street-furniture'),
  defineZone('bike-rack', 'Bike Rack', 'metal', 'streetFurnitureMetal', 'street-furniture'),
  defineZone('bollard', 'Bollard', 'metal', 'streetFurnitureMetal', 'street-furniture'),
  defineZone('bus-shelter', 'Bus Shelter', 'glass', 'shelterGlass', 'transit'),
  defineZone('kiosk', 'Kiosk', 'utility', 'streetFurnitureAccent', 'street-furniture'),
  defineZone('railing', 'Railing', 'metal', 'streetFurnitureMetal', 'waterfront-open-space'),
  defineZone('signage', 'Signage Panel', 'sign', 'signPanelWhite', 'signage'),
  defineZone('regulatory-sign', 'Regulatory Sign', 'sign', 'signPanelWhite', 'signage'),
  defineZone('street-name-sign', 'Street Name Sign', 'sign', 'signPanelGreen', 'signage'),
  defineZone('wayfinding-sign', 'Wayfinding Sign', 'sign', 'signPanelBlue', 'signage'),
  defineZone('transit', 'Transit Stop', 'utility', 'transitStop', 'transit'),
  defineZone('bus-stop', 'Bus Stop', 'utility', 'transitStop', 'transit'),
  defineZone('vehicle', 'Vehicle Body', 'metal', 'vehicleBody', 'vehicles'),
  defineZone('vehicle-body', 'Vehicle Body Paint', 'metal', 'vehicleBody', 'vehicles'),
  defineZone('lane-marking', 'Lane Marking Primitive', 'sign', 'lanePaint', 'road-markings'),
  defineZone('zebra-crossing', 'Zebra Crossing Primitive', 'sign', 'lanePaint', 'road-markings'),
  defineZone('stop-bar', 'Stop Bar Primitive', 'sign', 'lanePaint', 'road-markings'),
  defineZone('turn-arrow', 'Turn Arrow Primitive', 'sign', 'lanePaint', 'road-markings'),
  defineZone('refuge-island', 'Refuge Island Primitive', 'concrete', 'refugeIsland', 'curbs')
] as const satisfies readonly MaterialZoneDefinition[];

export type MaterialZoneId = (typeof MATERIAL_ZONE_DEFINITIONS)[number]['id'];

export const MATERIAL_ZONE_IDS = MATERIAL_ZONE_DEFINITIONS.map((zone) => zone.id).sort();

export const MATERIAL_ZONE_ID_SET: ReadonlySet<string> = new Set(MATERIAL_ZONE_IDS);

export interface MaterialZoneDiagnostics {
  readonly definitions: number;
  readonly canonicalSurfaces: readonly CanonicalMaterialSurface[];
  readonly zonesBySurface: Readonly<Record<CanonicalMaterialSurface, number>>;
  readonly registeredZones: readonly string[];
  readonly assetZones: readonly string[];
  readonly bindingZones: readonly string[];
  readonly unregisteredAssetZones: readonly string[];
  readonly unregisteredBindingZones: readonly string[];
  readonly fallbackMaterials: readonly string[];
  readonly atlasChannels: readonly string[];
}

export function isMaterialZoneId(zoneId: string): zoneId is MaterialZoneId {
  return MATERIAL_ZONE_ID_SET.has(zoneId);
}

export function getMaterialZoneDefinition(zoneId: string): MaterialZoneDefinition | undefined {
  return MATERIAL_ZONE_DEFINITIONS.find((zone) => zone.id === zoneId);
}

export function createMaterialZoneDiagnostics(
  assetCatalog: readonly AssetDefinition[],
  assetBindings: readonly RenderBinding[]
): MaterialZoneDiagnostics {
  const assetZones = uniqueSorted(
    assetCatalog
      .map((asset) => asset.tags.materialZone)
      .filter((zone): zone is string => typeof zone === 'string')
  );
  const bindingZones = uniqueSorted(
    assetBindings
      .map((binding) => binding.materialZone)
      .filter((zone): zone is string => typeof zone === 'string')
  );
  const zonesBySurface = createSurfaceCounts();

  for (const zone of MATERIAL_ZONE_DEFINITIONS) {
    zonesBySurface[zone.surface] += 1;
  }

  return {
    definitions: MATERIAL_ZONE_DEFINITIONS.length,
    canonicalSurfaces: [...CANONICAL_MATERIAL_SURFACES],
    zonesBySurface,
    registeredZones: MATERIAL_ZONE_IDS,
    assetZones,
    bindingZones,
    unregisteredAssetZones: assetZones.filter((zone) => !MATERIAL_ZONE_ID_SET.has(zone)),
    unregisteredBindingZones: bindingZones.filter((zone) => !MATERIAL_ZONE_ID_SET.has(zone)),
    fallbackMaterials: uniqueSorted(MATERIAL_ZONE_DEFINITIONS.map((zone) => zone.fallbackMaterial)),
    atlasChannels: uniqueSorted(MATERIAL_ZONE_DEFINITIONS.map((zone) => zone.atlasChannel))
  };
}

function defineZone(
  id: string,
  name: string,
  surface: CanonicalMaterialSurface,
  fallbackMaterial: string,
  atlasChannel: string
): MaterialZoneDefinition {
  return {
    id,
    name,
    surface,
    fallbackMaterial,
    atlasChannel
  };
}

function createSurfaceCounts(): Record<CanonicalMaterialSurface, number> {
  return CANONICAL_MATERIAL_SURFACES.reduce(
    (counts, surface) => ({
      ...counts,
      [surface]: 0
    }),
    {} as Record<CanonicalMaterialSurface, number>
  );
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}
