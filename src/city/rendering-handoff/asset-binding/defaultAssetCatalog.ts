import type { AssetDefinition, RenderBinding } from '../../data-contracts/cityContracts';
import { createProceduralSourceMetadata, INTERNAL_PROCEDURAL_LICENSE } from '../../data-contracts/sourceMetadata';

export const DEFAULT_RENDER_ASSET_CATALOG = [
  createProceduralAsset('asset:texture:terrain-ground:primitive', 'texture', 'Terrain Ground Primitive', 'terrain', 700, 'lod0'),
  createProceduralAsset('asset:road:asphalt:primitive', 'road', 'Asphalt Primitive', 'asphalt', 34, 'lod1'),
  createProceduralAsset('asset:texture:water:primitive', 'texture', 'Water Primitive', 'water', 536, 'lod1'),
  createProceduralAsset('asset:nature:park-grass:primitive', 'nature', 'Park Grass Primitive', 'park', 70, 'lod1'),
  createProceduralAsset('asset:nature:park-lawn:primitive', 'nature', 'Park Lawn Primitive', 'park-lawn', 36, 'lod1'),
  createProceduralAsset('asset:nature:park-path:primitive', 'nature', 'Park Path Primitive', 'park-path', 18, 'lod2'),
  createProceduralAsset('asset:nature:park-planting:primitive', 'nature', 'Park Planting Primitive', 'park-planting', 12, 'lod2'),
  createProceduralAsset('asset:nature:park-sports:primitive', 'nature', 'Park Sports Primitive', 'park-sports', 20, 'lod2'),
  createProceduralAsset('asset:nature:park-seating:primitive', 'nature', 'Park Seating Primitive', 'park-seating', 8, 'lod3'),
  createProceduralAsset('asset:nature:park-water-feature:primitive', 'nature', 'Park Water Feature Primitive', 'park-water-feature', 12, 'lod2'),
  createProceduralAsset('asset:nature:park-shade:primitive', 'nature', 'Park Shade Primitive', 'park-shade', 7, 'lod3'),
  createProceduralAsset('asset:street-prop:plaza-zone:primitive', 'street-prop', 'Plaza Zone Primitive', 'plaza-zone', 22, 'lod2'),
  createProceduralAsset('asset:building:massing:primitive', 'building', 'Building Massing Primitive', 'building', 36, 'lod1'),
  createProceduralAsset('asset:building:roof-detail:primitive', 'building', 'Roof Detail Primitive', 'roof', 10, 'lod2'),
  createProceduralAsset('asset:nature:tree-trunk:primitive', 'nature', 'Tree Trunk Primitive', 'tree-trunk', 7, 'lod2'),
  createProceduralAsset('asset:nature:tree-canopy:primitive', 'nature', 'Tree Canopy Primitive', 'tree-canopy', 5, 'lod2'),
  createProceduralAsset('asset:street-prop:street-light:primitive', 'street-prop', 'Street Light Primitive', 'street-light', 6.2, 'lod3'),
  createProceduralAsset('asset:street-prop:bench:primitive', 'street-prop', 'Bench Primitive', 'bench', 2.1, 'lod3'),
  createProceduralAsset('asset:street-prop:bin:primitive', 'street-prop', 'Bin Primitive', 'bin', 1.05, 'lod3'),
  createProceduralAsset('asset:street-prop:bike-rack:primitive', 'street-prop', 'Bike Rack Primitive', 'bike-rack', 1.8, 'lod3'),
  createProceduralAsset('asset:street-prop:bollard:primitive', 'street-prop', 'Bollard Primitive', 'bollard', 0.95, 'lod3'),
  createProceduralAsset('asset:street-prop:bus-shelter:primitive', 'street-prop', 'Bus Shelter Primitive', 'bus-shelter', 4.8, 'lod3'),
  createProceduralAsset('asset:street-prop:kiosk:primitive', 'street-prop', 'Kiosk Primitive', 'kiosk', 2.6, 'lod3'),
  createProceduralAsset('asset:street-prop:railing:primitive', 'street-prop', 'Railing Primitive', 'railing', 3.4, 'lod3'),
  createProceduralAsset('asset:street-prop:regulatory-sign:primitive', 'street-prop', 'Regulatory Sign Primitive', 'regulatory-sign', 2.4, 'lod4'),
  createProceduralAsset('asset:street-prop:street-name-sign:primitive', 'street-prop', 'Street Name Sign Primitive', 'street-name-sign', 2.65, 'lod4'),
  createProceduralAsset('asset:street-prop:wayfinding-sign:primitive', 'street-prop', 'Wayfinding Sign Primitive', 'wayfinding-sign', 2.35, 'lod4'),
  createProceduralAsset('asset:road:lane-marking:primitive', 'road', 'Lane Marking Primitive', 'lane-marking', 7.2, 'lod2'),
  createProceduralAsset('asset:road:zebra-crossing:primitive', 'road', 'Zebra Crossing Primitive', 'zebra-crossing', 14, 'lod2'),
  createProceduralAsset('asset:road:stop-bar:primitive', 'road', 'Stop Bar Primitive', 'stop-bar', 12, 'lod2'),
  createProceduralAsset('asset:road:turn-arrow:primitive', 'road', 'Turn Arrow Primitive', 'turn-arrow', 5.4, 'lod2'),
  createProceduralAsset('asset:road:tactile-paving:primitive', 'road', 'Tactile Paving Primitive', 'tactile-paving', 2.8, 'lod3'),
  createProceduralAsset('asset:road:refuge-island:primitive', 'road', 'Refuge Island Primitive', 'refuge-island', 5.8, 'lod2'),
  createProceduralAsset('asset:road:traffic-calming:primitive', 'road', 'Traffic Calming Primitive', 'traffic-calming', 7.5, 'lod3'),
  createProceduralAsset('asset:building:storefront-window:primitive', 'building', 'Storefront Window Primitive', 'storefront-window', 4.8, 'lod3'),
  createProceduralAsset('asset:building:storefront-awning:primitive', 'building', 'Storefront Awning Primitive', 'storefront-awning', 3.8, 'lod3'),
  createProceduralAsset('asset:building:storefront-sign:primitive', 'building', 'Storefront Sign Primitive', 'storefront-sign', 3.2, 'lod4'),
  createProceduralAsset('asset:building:entrance-door:primitive', 'building', 'Entrance Door Primitive', 'entrance-door', 2.2, 'lod4'),
  createProceduralAsset('asset:building:night-window:primitive', 'building', 'Night Window Primitive', 'night-window', 2.4, 'lod3'),
  createProceduralAsset('asset:building:civic-anchor:primitive', 'building', 'Civic Anchor Primitive', 'civic-anchor', 12, 'lod2'),
  createProceduralAsset('asset:street-prop:waterfront-edge:primitive', 'street-prop', 'Waterfront Edge Primitive', 'waterfront-edge', 18, 'lod2'),
  createProceduralAsset('asset:street-prop:waterfront-open-space:primitive', 'street-prop', 'Waterfront Open Space Primitive', 'waterfront-open-space', 18, 'lod3'),
  createProceduralAsset('asset:vehicle:traffic-car:primitive', 'vehicle', 'Traffic Car Primitive', 'vehicle', 4.8, 'lod2')
] as const satisfies readonly AssetDefinition[];

export const DEFAULT_RENDER_BINDINGS = [
  {
    id: 'binding:terrain:ground',
    objectKind: 'block',
    semanticTag: 'terrain-ground',
    assetId: 'asset:texture:terrain-ground:primitive',
    materialZone: 'terrain',
    fallbackMaterial: 'terrain',
    fallbackGeometry: 'ground-plane'
  },
  {
    id: 'binding:road:asphalt',
    objectKind: 'road-segment',
    semanticTag: 'road-surface',
    assetId: 'asset:road:asphalt:primitive',
    materialZone: 'asphalt',
    fallbackMaterial: 'asphalt',
    fallbackGeometry: 'road-segment-box'
  },
  {
    id: 'binding:water:river',
    objectKind: 'waterway',
    semanticTag: 'river-surface',
    assetId: 'asset:texture:water:primitive',
    materialZone: 'water',
    fallbackMaterial: 'water',
    fallbackGeometry: 'waterway-box'
  },
  {
    id: 'binding:park:grass',
    objectKind: 'park',
    semanticTag: 'park-surface',
    assetId: 'asset:nature:park-grass:primitive',
    materialZone: 'park',
    fallbackMaterial: 'park',
    fallbackGeometry: 'park-box'
  },
  createParkFeatureBinding('lawn', 'park-lawn', 'park-lawn-surface'),
  createParkFeatureBinding('path', 'park-path', 'park-path-strip'),
  createParkFeatureBinding('planting', 'park-planting', 'park-planting-bed'),
  createParkFeatureBinding('sports', 'park-sports', 'park-sports-court'),
  createParkFeatureBinding('seating', 'park-seating', 'park-seating-deck'),
  createParkFeatureBinding('water-feature', 'park-water-feature', 'park-water-feature-basin'),
  createParkFeatureBinding('shade', 'park-shade', 'park-shade-canopy'),
  {
    id: 'binding:plaza:zone',
    objectKind: 'plaza-zone',
    semanticTag: 'plaza-zone',
    assetId: 'asset:street-prop:plaza-zone:primitive',
    materialZone: 'plaza',
    fallbackMaterial: 'plazaHardscape',
    fallbackGeometry: 'plaza-zone-box'
  },
  {
    id: 'binding:building:massing',
    objectKind: 'building',
    semanticTag: 'building-mass',
    assetId: 'asset:building:massing:primitive',
    materialZone: 'building',
    fallbackMaterial: 'building',
    fallbackGeometry: 'building-box'
  },
  {
    id: 'binding:building:roof-detail',
    objectKind: 'building',
    semanticTag: 'roof-detail',
    assetId: 'asset:building:roof-detail:primitive',
    materialZone: 'roof',
    fallbackMaterial: 'rooftop',
    fallbackGeometry: 'roof-detail-box'
  },
  {
    id: 'binding:tree:trunk',
    objectKind: 'tree-planting',
    semanticTag: 'tree-trunk',
    assetId: 'asset:nature:tree-trunk:primitive',
    materialZone: 'bark',
    fallbackMaterial: 'treeTrunk',
    fallbackGeometry: 'tree-trunk-cylinder'
  },
  {
    id: 'binding:tree:canopy',
    objectKind: 'tree-planting',
    semanticTag: 'tree-canopy',
    assetId: 'asset:nature:tree-canopy:primitive',
    materialZone: 'foliage',
    fallbackMaterial: 'treeCanopy',
    fallbackGeometry: 'tree-canopy-cone'
  },
  {
    id: 'binding:street-light:pole-fixture',
    objectKind: 'street-light',
    semanticTag: 'street-light',
    assetId: 'asset:street-prop:street-light:primitive',
    materialZone: 'street-light',
    fallbackMaterial: 'streetLightPole',
    fallbackGeometry: 'street-light-pole-fixture'
  },
  {
    id: 'binding:street-furniture:bench',
    objectKind: 'street-furniture',
    semanticTag: 'bench',
    assetId: 'asset:street-prop:bench:primitive',
    materialZone: 'street-furniture',
    fallbackMaterial: 'streetFurnitureWood',
    fallbackGeometry: 'bench-boxes'
  },
  {
    id: 'binding:street-furniture:bin',
    objectKind: 'street-furniture',
    semanticTag: 'bin',
    assetId: 'asset:street-prop:bin:primitive',
    materialZone: 'street-furniture',
    fallbackMaterial: 'streetFurnitureAccent',
    fallbackGeometry: 'bin-cylinder'
  },
  {
    id: 'binding:street-furniture:bike-rack',
    objectKind: 'street-furniture',
    semanticTag: 'bike-rack',
    assetId: 'asset:street-prop:bike-rack:primitive',
    materialZone: 'street-furniture',
    fallbackMaterial: 'streetFurnitureMetal',
    fallbackGeometry: 'bike-rack-hoop'
  },
  {
    id: 'binding:street-furniture:bollard',
    objectKind: 'street-furniture',
    semanticTag: 'bollard',
    assetId: 'asset:street-prop:bollard:primitive',
    materialZone: 'street-furniture',
    fallbackMaterial: 'streetFurnitureMetal',
    fallbackGeometry: 'bollard-cylinder'
  },
  {
    id: 'binding:street-furniture:bus-shelter',
    objectKind: 'street-furniture',
    semanticTag: 'bus-shelter',
    assetId: 'asset:street-prop:bus-shelter:primitive',
    materialZone: 'street-furniture',
    fallbackMaterial: 'shelterGlass',
    fallbackGeometry: 'bus-shelter-boxes'
  },
  {
    id: 'binding:street-furniture:kiosk',
    objectKind: 'street-furniture',
    semanticTag: 'kiosk',
    assetId: 'asset:street-prop:kiosk:primitive',
    materialZone: 'street-furniture',
    fallbackMaterial: 'streetFurnitureAccent',
    fallbackGeometry: 'kiosk-box'
  },
  {
    id: 'binding:street-furniture:railing',
    objectKind: 'street-furniture',
    semanticTag: 'railing',
    assetId: 'asset:street-prop:railing:primitive',
    materialZone: 'street-furniture',
    fallbackMaterial: 'streetFurnitureMetal',
    fallbackGeometry: 'railing-bar'
  },
  {
    id: 'binding:street-furniture:regulatory-sign',
    objectKind: 'street-furniture',
    semanticTag: 'regulatory-sign',
    assetId: 'asset:street-prop:regulatory-sign:primitive',
    materialZone: 'signage',
    fallbackMaterial: 'signPanelWhite',
    fallbackGeometry: 'sign-post-panel'
  },
  {
    id: 'binding:street-furniture:street-name-sign',
    objectKind: 'street-furniture',
    semanticTag: 'street-name-sign',
    assetId: 'asset:street-prop:street-name-sign:primitive',
    materialZone: 'signage',
    fallbackMaterial: 'signPanelGreen',
    fallbackGeometry: 'sign-post-panel'
  },
  {
    id: 'binding:street-furniture:wayfinding-sign',
    objectKind: 'street-furniture',
    semanticTag: 'wayfinding-sign',
    assetId: 'asset:street-prop:wayfinding-sign:primitive',
    materialZone: 'signage',
    fallbackMaterial: 'signPanelBlue',
    fallbackGeometry: 'wayfinding-post-panel'
  },
  {
    id: 'binding:road:lane-marking',
    objectKind: 'lane-marking',
    semanticTag: 'lane-dash',
    assetId: 'asset:road:lane-marking:primitive',
    materialZone: 'lane-paint',
    fallbackMaterial: 'lanePaint',
    fallbackGeometry: 'lane-dash-plane'
  },
  {
    id: 'binding:road:zebra-crossing',
    objectKind: 'lane-marking',
    semanticTag: 'zebra-crossing-stripe',
    assetId: 'asset:road:zebra-crossing:primitive',
    materialZone: 'crosswalk-paint',
    fallbackMaterial: 'lanePaint',
    fallbackGeometry: 'crosswalk-stripe-plane'
  },
  {
    id: 'binding:road:stop-bar',
    objectKind: 'lane-marking',
    semanticTag: 'stop-bar',
    assetId: 'asset:road:stop-bar:primitive',
    materialZone: 'lane-paint',
    fallbackMaterial: 'lanePaint',
    fallbackGeometry: 'stop-bar-plane'
  },
  {
    id: 'binding:road:turn-arrow',
    objectKind: 'lane-marking',
    semanticTag: 'turn-arrow',
    assetId: 'asset:road:turn-arrow:primitive',
    materialZone: 'lane-paint',
    fallbackMaterial: 'lanePaint',
    fallbackGeometry: 'turn-arrow-plane'
  },
  {
    id: 'binding:road:tactile-paving',
    objectKind: 'lane-marking',
    semanticTag: 'tactile-paving',
    assetId: 'asset:road:tactile-paving:primitive',
    materialZone: 'tactile-paving',
    fallbackMaterial: 'tactilePaving',
    fallbackGeometry: 'tactile-pad-plane'
  },
  {
    id: 'binding:road:refuge-island',
    objectKind: 'lane-marking',
    semanticTag: 'refuge-island',
    assetId: 'asset:road:refuge-island:primitive',
    materialZone: 'curb-concrete',
    fallbackMaterial: 'refugeIsland',
    fallbackGeometry: 'refuge-island-box'
  },
  {
    id: 'binding:road:traffic-calming',
    objectKind: 'traffic-calming-device',
    semanticTag: 'traffic-calming',
    assetId: 'asset:road:traffic-calming:primitive',
    materialZone: 'traffic-calming',
    fallbackMaterial: 'trafficCalming',
    fallbackGeometry: 'traffic-calming-box'
  },
  {
    id: 'binding:facade:storefront-window',
    objectKind: 'facade',
    semanticTag: 'storefront-window',
    assetId: 'asset:building:storefront-window:primitive',
    materialZone: 'storefront-glass',
    fallbackMaterial: 'storefrontGlass',
    fallbackGeometry: 'storefront-window-box'
  },
  {
    id: 'binding:facade:awning',
    objectKind: 'facade',
    semanticTag: 'awning',
    assetId: 'asset:building:storefront-awning:primitive',
    materialZone: 'storefront-awning',
    fallbackMaterial: 'storefrontAwning',
    fallbackGeometry: 'storefront-awning-box'
  },
  {
    id: 'binding:facade:sign',
    objectKind: 'facade',
    semanticTag: 'storefront-sign',
    assetId: 'asset:building:storefront-sign:primitive',
    materialZone: 'storefront-sign',
    fallbackMaterial: 'storefrontSign',
    fallbackGeometry: 'storefront-sign-box'
  },
  {
    id: 'binding:facade:entrance-door',
    objectKind: 'facade',
    semanticTag: 'entrance-door',
    assetId: 'asset:building:entrance-door:primitive',
    materialZone: 'entrance-door',
    fallbackMaterial: 'entranceDoor',
    fallbackGeometry: 'entrance-door-box'
  },
  {
    id: 'binding:facade:night-window',
    objectKind: 'facade',
    semanticTag: 'night-window',
    assetId: 'asset:building:night-window:primitive',
    materialZone: 'window-glow',
    fallbackMaterial: 'windowGlow',
    fallbackGeometry: 'night-window-box'
  },
  {
    id: 'binding:civic:anchor',
    objectKind: 'civic-anchor',
    semanticTag: 'civic-anchor',
    assetId: 'asset:building:civic-anchor:primitive',
    materialZone: 'civic',
    fallbackMaterial: 'building',
    fallbackGeometry: 'civic-anchor-marker'
  },
  {
    id: 'binding:waterfront:edge',
    objectKind: 'waterfront-edge',
    semanticTag: 'waterfront-edge',
    assetId: 'asset:street-prop:waterfront-edge:primitive',
    materialZone: 'waterfront',
    fallbackMaterial: 'waterfrontEdge',
    fallbackGeometry: 'waterfront-edge-box'
  },
  {
    id: 'binding:waterfront:open-space',
    objectKind: 'waterfront-open-space',
    semanticTag: 'waterfront-open-space',
    assetId: 'asset:street-prop:waterfront-open-space:primitive',
    materialZone: 'waterfront',
    fallbackMaterial: 'waterfrontEdge',
    fallbackGeometry: 'waterfront-open-space-promenade'
  },
  {
    id: 'binding:vehicle:traffic-car',
    objectKind: 'traffic-vehicle',
    semanticTag: 'traffic-car',
    assetId: 'asset:vehicle:traffic-car:primitive',
    materialZone: 'vehicle-body',
    fallbackMaterial: 'vehicleBody',
    fallbackGeometry: 'vehicle-box'
  }
] as const satisfies readonly RenderBinding[];

type AssetCategory = AssetDefinition['category'];
type AssetLod = AssetDefinition['lod'];

function createProceduralAsset(
  id: string,
  category: AssetCategory,
  name: string,
  materialZone: string,
  scaleMeters: number,
  lod: AssetLod
): AssetDefinition {
  return {
    id,
    kind: 'asset',
    ownerDomain: 'rendering-handoff',
    name,
    lod,
    category,
    format: 'procedural',
    scaleMeters,
    tags: {
      materialZone,
      fallback: true
    },
    attribution: 'Procedural fallback primitive generated by detailed-city.',
    license: INTERNAL_PROCEDURAL_LICENSE,
    metadata: createProceduralSourceMetadata(`render-fallback:${id}`, 'render-asset-catalog')
  };
}

function createParkFeatureBinding(featureKind: string, semanticTag: string, fallbackGeometry: string): RenderBinding {
  return {
    id: `binding:park-feature:${featureKind}`,
    objectKind: 'park-feature',
    semanticTag,
    assetId: `asset:nature:${semanticTag}:primitive`,
    materialZone: 'park',
    fallbackMaterial: semanticTag,
    fallbackGeometry
  };
}
