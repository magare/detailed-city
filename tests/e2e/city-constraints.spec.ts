import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import { isPointInsidePolygon, rectanglePolygon } from '../../src/utils/geometry';

test('constraint layer is deterministic, indexed, and visible in overlays', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);

  expect(firstCity.constraints.map((constraint) => constraint.id)).toEqual(
    secondCity.constraints.map((constraint) => constraint.id)
  );
  expect(firstCity.constraints).toHaveLength(11);
  expect(firstCity.objectIndex.countsByKind.constraint).toBe(11);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'zoning')).toEqual([]);
  expect(countConstraintsByKind(firstCity.constraints)).toEqual({
    setback: 1,
    'protected-corridor': 1,
    easement: 1,
    clearance: 1,
    'no-build-zone': 3,
    'hazard-buffer': 1,
    'view-corridor': 1,
    'waterfront-buffer': 1,
    'emergency-access-corridor': 1
  });
  expect(firstCity.objectIndex.objectsById['constraint-emergency-access-road-v-6']).toMatchObject({
    id: 'constraint-emergency-access-road-v-6',
    kind: 'constraint',
    ownerDomain: 'blueprint',
    lod: 'lod0',
    requiredObjectIds: ['road-v-6']
  });

  for (const constraint of firstCity.constraints) {
    if (constraint.prohibitedObjectKinds.includes('parcel')) {
      expect(firstCity.parcels.some((parcel) => isPointInsidePolygon(parcel.center, constraint.boundary))).toBe(false);
    }

    if (constraint.prohibitedObjectKinds.includes('building')) {
      expect(firstCity.buildings.some((building) => isPointInsidePolygon(building.center, constraint.boundary))).toBe(false);
    }
  }

  expect(overlays.map((overlay) => overlay.id)).toEqual([
    'districts',
    'constraints',
    'resilience-goals',
    'parcels',
    'roads',
    'validation-issues',
    'owner-domains'
  ]);
  expect(overlays.find((overlay) => overlay.id === 'constraints')?.featureCount).toBe(11);
  expect(overlays.find((overlay) => overlay.id === 'constraints')?.features[0]).toMatchObject({
    id: 'overlay:constraints:constraint-setback-citywide',
    objectId: 'constraint-setback-citywide',
    objectKind: 'constraint',
    ownerDomain: 'blueprint',
    geometry: { type: 'polygon' },
    metadata: {
      constraintKind: 'setback',
      priority: 'high',
      minSetbackMeters: 1
    }
  });
});

test('constraint validation catches no-build conflicts and exposes overlay focus', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const [building] = city.buildings;
  const [baseConstraint, ...remainingConstraints] = city.constraints;
  const invalidConstraint = {
    ...baseConstraint,
    id: 'constraint-no-build-zone-test',
    name: 'Test No-Build Conflict',
    constraintKind: 'no-build-zone' as const,
    boundary: rectanglePolygon(building.center, { x: 4, z: 4 }),
    affectedObjectKinds: ['building'] as const,
    prohibitedObjectKinds: ['building'] as const,
    requiredObjectIds: [] as const,
    relatedObjectIds: [] as const,
    minSetbackMeters: undefined,
    minClearanceMeters: undefined
  };
  const invalidCity = {
    ...city,
    constraints: [invalidConstraint, ...remainingConstraints]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const indexedInvalidCity = {
    ...invalidCity,
    validation,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  };
  const runtimeIndex = createGeneratedRuntimeObjectIndex(indexedInvalidCity, traffic);
  const overlays = createCityOverlayDatasets(indexedInvalidCity, runtimeIndex);
  const validationOverlay = overlays.find((overlay) => overlay.id === 'validation-issues');

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `constraint-conflict-constraint-no-build-zone-test-${building.id}`,
        category: 'zoning',
        objectId: 'constraint-no-build-zone-test',
        affectedBoundary: building.footprint,
        suggestedFix: expect.stringContaining(building.id)
      })
    ])
  );
  expect(validationOverlay?.features[0]).toMatchObject({
    overlayId: 'validation-issues',
    objectId: 'constraint-no-build-zone-test',
    objectKind: 'constraint',
    geometry: { type: 'polygon' },
    focus: {
      objectId: 'constraint-no-build-zone-test',
      boundary: building.footprint,
      suggestedFix: expect.stringContaining(building.id)
    }
  });
});

test('constraint validation catches missing references and road clearance failures', () => {
  const city = new CityGenerator(cityConfig).generate();
  const constraint = city.constraints.find((candidate) => candidate.id === 'constraint-emergency-access-road-v-6');

  expect(constraint).toBeDefined();

  const invalidConstraint = {
    ...constraint!,
    requiredObjectIds: ['road-v-6', 'missing-road'] as const,
    minClearanceMeters: 99
  };
  const invalidCity = {
    ...city,
    constraints: city.constraints.map((candidate) =>
      candidate.id === invalidConstraint.id ? invalidConstraint : candidate
    )
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'constraint-missing-required-reference-missing-road-constraint-emergency-access-road-v-6',
        category: 'identifier',
        objectId: 'constraint-emergency-access-road-v-6'
      }),
      expect.objectContaining({
        id: 'constraint-conflict-constraint-emergency-access-road-v-6-road-v-6',
        category: 'zoning',
        objectId: 'constraint-emergency-access-road-v-6'
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

function countConstraintsByKind(constraints: ReturnType<CityGenerator['generate']>['constraints']): Record<string, number> {
  return constraints.reduce<Record<string, number>>((countsByKind, constraint) => {
    countsByKind[constraint.constraintKind] = (countsByKind[constraint.constraintKind] ?? 0) + 1;
    return countsByKind;
  }, {});
}
