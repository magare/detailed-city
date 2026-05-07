export type CityPlanningLayer =
  | 'blueprint'
  | 'land'
  | 'mobility'
  | 'utilities'
  | 'buildings'
  | 'public-realm'
  | 'civic'
  | 'economy'
  | 'environment'
  | 'operations'
  | 'simulation'
  | 'data-contracts'
  | 'rendering-handoff';

export interface CityPlanningDomain {
  readonly id: CityPlanningLayer;
  readonly purpose: string;
  readonly owns: readonly string[];
  readonly feeds: readonly CityPlanningLayer[];
}

export const CITY_PLANNING_DOMAINS = [
  {
    id: 'blueprint',
    purpose: 'City intent, district logic, constraints, phasing, resilience goals, and success metrics.',
    owns: ['master-plan', 'districts', 'phasing', 'constraints', 'resilience', 'metrics'],
    feeds: ['land', 'mobility', 'utilities', 'buildings', 'public-realm', 'civic', 'economy', 'environment'],
  },
  {
    id: 'land',
    purpose: 'The physical ground truth: boundaries, blocks, parcels, zoning, terrain, water, hazards, and cadastre.',
    owns: [
      'administrative-boundaries',
      'blocks',
      'cadastre',
      'hazards',
      'parcels',
      'soil-geology',
      'topography',
      'waterfront',
      'waterways',
      'zoning',
    ],
    feeds: ['mobility', 'utilities', 'buildings', 'public-realm', 'environment'],
  },
  {
    id: 'mobility',
    purpose: 'Movement networks for vehicles, pedestrians, cyclists, transit, freight, parking, and routing.',
    owns: [
      'bridges-tunnels',
      'crossings',
      'cycling',
      'freight-logistics',
      'intersections',
      'lanes',
      'navigation-graphs',
      'parking-curbs',
      'sidewalks',
      'street-network',
      'transit',
    ],
    feeds: ['public-realm', 'simulation', 'operations', 'rendering-handoff'],
  },
  {
    id: 'utilities',
    purpose: 'Hidden infrastructure: power, water, wastewater, stormwater, telecom, waste, energy, and service access.',
    owns: [
      'gas-district-energy',
      'power-grid',
      'service-access',
      'stormwater',
      'telecom',
      'waste-management',
      'wastewater',
      'water-supply',
    ],
    feeds: ['buildings', 'operations', 'simulation', 'rendering-handoff'],
  },
  {
    id: 'buildings',
    purpose: 'Structures and occupiable places from footprints to facades, interiors, roofs, entrances, and safety systems.',
    owns: [
      'accessibility',
      'amenities',
      'entrances',
      'facades',
      'fire-safety',
      'footprints',
      'interiors',
      'mechanical-electrical-plumbing',
      'roofs',
      'structure-shell',
      'typologies',
    ],
    feeds: ['economy', 'civic', 'simulation', 'rendering-handoff'],
  },
  {
    id: 'public-realm',
    purpose: 'Human-scale outdoor detail: parks, plazas, planting, lighting, furniture, signs, public art, and visibility.',
    owns: [
      'lighting',
      'parks',
      'playgrounds-sports',
      'plazas',
      'public-art',
      'safety-visibility',
      'signage-wayfinding',
      'street-furniture',
      'trees-planting',
      'waterfront-open-space',
    ],
    feeds: ['simulation', 'operations', 'rendering-handoff'],
  },
  {
    id: 'civic',
    purpose: 'Public institutions and community anchors such as schools, clinics, culture, emergency, and government.',
    owns: ['community-services', 'culture', 'education', 'emergency-services', 'government', 'healthcare', 'religious'],
    feeds: ['simulation', 'operations', 'rendering-handoff'],
  },
  {
    id: 'economy',
    purpose: 'Daily urban activity: retail, offices, industry, logistics, hospitality, markets, tourism, and jobs.',
    owns: ['hospitality', 'industry', 'informal-markets', 'offices', 'retail', 'tourism', 'warehouses'],
    feeds: ['simulation', 'operations', 'rendering-handoff'],
  },
  {
    id: 'environment',
    purpose: 'Climate and environmental performance: weather, sun, wind, air, noise, heat, ecology, and flood risk.',
    owns: [
      'air-quality',
      'climate-weather',
      'ecology-habitats',
      'flood-risk',
      'noise',
      'solar-shading',
      'urban-heat',
      'wind-comfort',
    ],
    feeds: ['blueprint', 'public-realm', 'operations', 'simulation', 'rendering-handoff'],
  },
  {
    id: 'operations',
    purpose: 'How the city is maintained and monitored: assets, permits, sensors, events, service schedules, and response.',
    owns: [
      'asset-inventory',
      'emergency-response',
      'events-crowds',
      'maintenance',
      'permits-inspections',
      'sensors-iot',
      'service-schedules',
    ],
    feeds: ['simulation', 'rendering-handoff'],
  },
  {
    id: 'simulation',
    purpose: 'Runtime behavior models for people, traffic, transit, utilities, weather, emergencies, and economic activity.',
    owns: [
      'economy-activity',
      'emergency-scenarios',
      'pedestrian-flow',
      'population-agents',
      'traffic-flow',
      'transit-operations',
      'utility-loads',
      'weather-daynight',
    ],
    feeds: ['rendering-handoff'],
  },
  {
    id: 'data-contracts',
    purpose: 'Stable identifiers, geospatial references, metadata, LOD rules, import/export, and validation gates.',
    owns: ['geospatial', 'identifiers', 'import-export', 'level-of-detail', 'metadata', 'validation'],
    feeds: [
      'blueprint',
      'land',
      'mobility',
      'utilities',
      'buildings',
      'public-realm',
      'civic',
      'economy',
      'environment',
      'operations',
      'simulation',
      'rendering-handoff',
    ],
  },
  {
    id: 'rendering-handoff',
    purpose: 'The adapter boundary from city-planning data into Three.js assets, materials, meshes, LOD, and scene layers.',
    owns: ['asset-binding', 'lod-policy', 'material-zones', 'mesh-builders', 'scene-layers'],
    feeds: [],
  },
] as const satisfies readonly CityPlanningDomain[];

export const CITY_LAYER_SEQUENCE = CITY_PLANNING_DOMAINS.map((domain) => domain.id);
