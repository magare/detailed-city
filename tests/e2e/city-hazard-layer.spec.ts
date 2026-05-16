import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import { rectanglePolygon } from '../../src/utils/geometry';

test('hazard layer is deterministic, indexed, and connected to land context', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));

  expect(firstCity.hazardZones.map((hazard) => hazard.id)).toEqual(
    secondCity.hazardZones.map((hazard) => hazard.id)
  );
  expect(firstCity.hazardZones).toHaveLength(6);
  expect(firstCity.objectIndex.countsByKind['hazard-zone']).toBe(6);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'land')).toEqual([]);
  expect(countHazardsByKind(firstCity.hazardZones)).toEqual({
    contamination: 1,
    'flood-plain': 1,
    'heat-exposure': 1,
    'landslide-risk': 1,
    'restricted-area': 2
  });
  expect(diagnostics.hazardLayer).toMatchObject({
    total: 6,
    criticalHazards: 1,
    noBuildHazards: 2,
    mitigationRequiredHazards: 6,
    relatedWaterwayHazards: 2,
    relatedZoningHazards: 5
  });
  expect(diagnostics.hazardLayer.mitigationKinds).toEqual([
    'access-control',
    'cooling-canopy',
    'flood-proofing',
    'remediation',
    'setback',
    'slope-stabilization'
  ]);
  expect(overlays.map((overlay) => overlay.id)).toEqual([
    'administrative-boundaries',
    'districts',
    'zoning',
    'waterways',
    'waterfront',
    'hazards',
    'topography',
    'soil-geology',
    'phasing',
    'weather-presets',
    'solar-shading',
    'urban-heat',
    'wind-comfort',
    'economy-anchors',
    'office-workplaces',
    'city-metrics',
    'cycling-network',
    'navigation-graphs',
    'freight-logistics',
    'water-transport-access',
    'asset-inventory',
    'maintenance-operations',
    'permits-inspections',
    'curb-activations',
    'public-amenities',
    'civic-anchors',
    'community-anchors',
    'culture-anchors',
    'government-anchors',
    'education-anchors',
    'emergency-equipment',
    'healthcare-anchors',
    'emergency-service-anchors',
    'building-access',
    'building-fire-safety',
    'addressing-gazetteer',
    'access-controls',
    'public-lighting',
    'signage-wayfinding',
    'green-stormwater',
    'constraints',
    'resilience-goals',
    'service-access',
    'thermal-service',
    'thermal-outages',
    'parcels',
    'roads',
    'validation-issues',
    'owner-domains'
  ]);
  expect(overlays.find((overlay) => overlay.id === 'hazards')?.featureCount).toBe(6);
  expect(
    overlays.find((overlay) => overlay.id === 'hazards')?.features.find((feature) => feature.objectId === 'hazard-zone-flood-plain-south-river-flood-plain')
  ).toMatchObject({
    objectKind: 'hazard-zone',
    ownerDomain: 'land',
    geometry: { type: 'polygon' },
    metadata: {
      hazardKind: 'flood-plain',
      hazardSeverity: 'high',
      relatedWaterways: 1,
      requiresMitigation: true
    }
  });
});

test('hazard validation catches missing references and prohibited object conflicts', () => {
  const city = new CityGenerator(cityConfig).generate();
  const building = city.buildings[0];
  const hazard = city.hazardZones.find((candidate) => candidate.id === 'hazard-zone-flood-plain-south-river-flood-plain');

  expect(hazard).toBeDefined();

  const invalidHazard = {
    ...hazard!,
    id: 'hazard-zone-restricted-area-test-conflict',
    hazardKind: 'restricted-area' as const,
    severity: 'critical' as const,
    boundary: rectanglePolygon(building.center, { x: 6, z: 6 }),
    focusPoint: building.center,
    affectedObjectKinds: ['building', 'road-segment'] as const,
    prohibitedObjectKinds: ['building'] as const,
    relatedRoadIds: ['missing-road'] as const
  };
  const invalidCity = {
    ...city,
    hazardZones: [invalidHazard, ...city.hazardZones.filter((candidate) => candidate.id !== hazard!.id)]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'hazard-missing-road-segment-missing-road-hazard-zone-restricted-area-test-conflict',
        category: 'land',
        objectId: 'hazard-zone-restricted-area-test-conflict'
      }),
      expect.objectContaining({
        id: `hazard-conflict-hazard-zone-restricted-area-test-conflict-${building.id}`,
        category: 'land',
        objectId: 'hazard-zone-restricted-area-test-conflict',
        affectedBoundary: building.footprint,
        suggestedFix: expect.stringContaining(building.id)
      })
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function countHazardsByKind(hazards: ReturnType<CityGenerator['generate']>['hazardZones']): Record<string, number> {
  return hazards.reduce<Record<string, number>>((countsByKind, hazard) => {
    countsByKind[hazard.hazardKind] = (countsByKind[hazard.hazardKind] ?? 0) + 1;
    return countsByKind;
  }, {});
}
