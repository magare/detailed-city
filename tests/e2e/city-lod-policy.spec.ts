import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { CITY_OBJECT_KIND_REGISTRY_ENTRIES } from '../../src/city/data-contracts/cityObjectRegistry';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { validateTrafficPlan } from '../../src/city/data-contracts/validation/validateTrafficPlan';
import type { CityObjectKind } from '../../src/city/data-contracts/cityContracts';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('LOD policy covers every city object kind and current runtime object', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const diagnostics = createCityDiagnostics(city, traffic, renderConfig);
  const registryKinds = CITY_OBJECT_KIND_REGISTRY_ENTRIES.map((entry) => entry.kind).sort();
  const lodPolicyKinds = city.lodPolicy.objectPolicies.map((policy) => policy.objectKind).sort();
  const tierCounts = Object.values(diagnostics.lodCoverage.countsByTier).reduce((sum, count) => sum + count, 0);

  expect(city.validation.issues.filter((issue) => issue.category === 'lod')).toEqual([]);
  expect(validateTraffic(city, traffic).issues.filter((issue) => issue.category === 'lod')).toEqual([]);
  expect(lodPolicyKinds).toEqual(registryKinds);
  expect(city.lodPolicy.rules.map((rule) => rule.tier)).toEqual(['lod0', 'lod1', 'lod2', 'lod3', 'lod4']);
  expect(diagnostics.lodCoverage).toMatchObject({
    tierCount: 5,
    objectPolicyCount: 48,
    objectsWithPolicy: 5969,
    objectsWithoutPolicy: 0,
    objectsWithUnsupportedTier: 0,
    missingPolicyKinds: [],
    unsupportedObjectIds: []
  });
  expect(tierCounts).toBe(diagnostics.objectIndex.objectIds.length);
});

test('generated city validation rejects missing kind policy and unsupported object tier', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstBuilding, ...remainingBuildings] = city.buildings;
  const missingBuildingPolicyCity = {
    ...city,
    lodPolicy: removeObjectKindPolicy(city.lodPolicy, 'building')
  };
  const unsupportedBuildingTierCity = {
    ...city,
    buildings: [
      {
        ...firstBuilding,
        lod: 'lod4' as const
      },
      ...remainingBuildings
    ]
  };
  const missingPolicyValidation = validateGeneratedCity({
    ...missingBuildingPolicyCity,
    objectIndex: createGeneratedCityObjectIndex(missingBuildingPolicyCity)
  });
  const unsupportedTierValidation = validateGeneratedCity({
    ...unsupportedBuildingTierCity,
    objectIndex: createGeneratedCityObjectIndex(unsupportedBuildingTierCity)
  });

  expect(missingPolicyValidation.passed).toBe(false);
  expect(missingPolicyValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'missing-lod-object-policy-building',
        severity: 'error',
        category: 'lod',
        objectId: 'building'
      })
    ])
  );
  expect(unsupportedTierValidation.passed).toBe(false);
  expect(unsupportedTierValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `unsupported-object-lod-${firstBuilding.id}-lod4`,
        severity: 'error',
        category: 'lod',
        objectId: firstBuilding.id
      })
    ])
  );
});

test('traffic validation rejects runtime agents outside their LOD policy', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const [firstVehicle, ...remainingVehicles] = traffic.vehicles;
  const invalidTraffic = {
    ...traffic,
    vehicles: [
      {
        ...firstVehicle,
        lod: 'lod4' as const
      },
      ...remainingVehicles
    ]
  };
  const validation = validateTraffic(city, invalidTraffic);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `unsupported-object-lod-${firstVehicle.id}-lod4`,
        severity: 'error',
        category: 'lod',
        objectId: firstVehicle.id
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

function validateTraffic(city: ReturnType<CityGenerator['generate']>, traffic: ReturnType<typeof createTraffic>) {
  return validateTrafficPlan({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    assetBindings: city.assetBindings,
    traffic,
    lodPolicy: city.lodPolicy
  });
}

function removeObjectKindPolicy(lodPolicy: ReturnType<CityGenerator['generate']>['lodPolicy'], objectKind: CityObjectKind) {
  return {
    ...lodPolicy,
    objectPolicies: lodPolicy.objectPolicies.filter((policy) => policy.objectKind !== objectKind)
  };
}
