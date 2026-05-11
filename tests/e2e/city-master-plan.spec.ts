import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { CITY_BLUEPRINT, getBlueprintDistrictForNormalizedBlock } from '../../src/city/blueprint/cityBlueprint';
import {
  createMasterPlanDiagnostics,
  getMasterPlanDistrictForNormalizedBlock,
  validateMasterPlan
} from '../../src/city/blueprint/master-plan/masterPlan';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('master plan exposes executable city form, centers, skyline, open space, water edge, and growth boundaries', () => {
  const diagnostics = createMasterPlanDiagnostics(CITY_BLUEPRINT.masterPlan);

  expect(CITY_BLUEPRINT.masterPlan).toMatchObject({
    id: 'master-plan-detailed-city-v1',
    ownerDomain: 'blueprint',
    lod: 'lod0',
    cityForm: {
      formKind: 'river-coastal-polycentric-grid',
      primaryAxisRoadId: 'road-v-6',
      waterRelationship: 'south-river-edge'
    }
  });
  expect(diagnostics).toMatchObject({
    cityFormKind: 'river-coastal-polycentric-grid',
    centers: {
      total: 4,
      primary: 1,
      secondary: 2,
      local: 1
    },
    skyline: {
      intentCount: 3,
      landmarkCount: 5
    },
    protectedOpenSpaces: {
      total: 3,
      noBuild: 3
    },
    waterEdges: {
      total: 1,
      continuousPublicEdges: 1
    },
    growthBoundaries: {
      total: 3,
      active: 3
    },
    validation: {
      passed: true,
      issues: []
    }
  });
});

test('district generation resolves block districts from master-plan constraints', () => {
  const city = new CityGenerator(cityConfig).generate();
  const gridMax = Math.max(cityConfig.gridSize - 1, 1);

  for (const block of city.blocks) {
    const normalized = {
      x: block.grid.x / gridMax,
      z: block.grid.z / gridMax
    };

    expect(block.district).toBe(getBlueprintDistrictForNormalizedBlock(normalized));
  }

  expect(getBlueprintDistrictForNormalizedBlock({ x: 0.5, z: 0.54 })).toBe('downtown');
  expect(getBlueprintDistrictForNormalizedBlock({ x: 0.5, z: 0.25 })).toBe('waterfront');
  expect(getBlueprintDistrictForNormalizedBlock({ x: 0.82, z: 0.72 })).toBe('industrial');
  expect(getBlueprintDistrictForNormalizedBlock({ x: 0.18, z: 0.72 })).toBe('civic');
  expect(getBlueprintDistrictForNormalizedBlock({ x: 0.12, z: 0.42 })).toBe('residential');
  expect(city.parks.map((park) => park.tags?.masterPlanProtectedOpenSpaceId)).toEqual([
    'protected-open-space-central-park',
    'protected-open-space-civic-plaza',
    'protected-open-space-riverside-green'
  ]);
  expect(city.districts.map((district) => district.id).sort()).toEqual([
    'district-civic',
    'district-downtown',
    'district-industrial',
    'district-residential',
    'district-waterfront'
  ]);
});

test('master plan validation catches invalid centers, skyline references, and growth boundaries', () => {
  const invalidMasterPlan = {
    ...CITY_BLUEPRINT.masterPlan,
    centers: [
      {
        ...CITY_BLUEPRINT.masterPlan.centers[0],
        influence: {
          shape: 'radial' as const,
          center: { x: 1.2, z: 0.5 },
          radius: -1
        }
      },
      {
        ...CITY_BLUEPRINT.masterPlan.centers[1],
        id: CITY_BLUEPRINT.masterPlan.centers[0].id
      }
    ],
    skyline: [
      {
        ...CITY_BLUEPRINT.masterPlan.skyline[0],
        centerId: 'missing-center',
        heightRangeMeters: [92, 30] as const
      }
    ],
    growthBoundaries: [
      {
        ...CITY_BLUEPRINT.masterPlan.growthBoundaries[0],
        allowedDistricts: []
      }
    ]
  };
  const validation = validateMasterPlan(invalidMasterPlan);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'duplicate-master-plan-id-center-downtown-core',
        category: 'config'
      }),
      expect.objectContaining({
        id: 'invalid-master-plan-influence-center-downtown-core',
        category: 'config'
      }),
      expect.objectContaining({
        id: 'missing-skyline-center-skyline-downtown-peak-missing-center',
        category: 'config'
      }),
      expect.objectContaining({
        id: 'invalid-skyline-height-range-skyline-downtown-peak',
        category: 'config'
      }),
      expect.objectContaining({
        id: 'missing-growth-boundary-districts-growth-boundary-city-limit',
        category: 'config'
      })
    ])
  );
});

test('city diagnostics and browser state expose master-plan counts', async ({ page }) => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const diagnostics = createCityDiagnostics(city, traffic, renderConfig, cityConfig);

  expect(diagnostics.masterPlan.validation.passed).toBe(true);
  expect(diagnostics.objectCounts).toMatchObject({
    masterPlanCenters: 4,
    masterPlanProtectedOpenSpaces: 3,
    masterPlanGrowthBoundaries: 3
  });

  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const browserDiagnostics = await page.evaluate(() => ({
    masterPlanPassed: window.cityDiagnostics?.masterPlan.validation.passed,
    centers: window.cityDiagnostics?.masterPlan.centers.total,
    openSpaces: window.cityDiagnostics?.masterPlan.protectedOpenSpaces.total,
    growthBoundaries: window.cityDiagnostics?.masterPlan.growthBoundaries.total,
    cityFormKind: window.cityDiagnostics?.masterPlan.cityFormKind
  }));

  expect(browserDiagnostics).toEqual({
    masterPlanPassed: true,
    centers: 4,
    openSpaces: 3,
    growthBoundaries: 3,
    cityFormKind: 'river-coastal-polycentric-grid'
  });
});

test('master-plan resolver falls back when no active center or edge matches', () => {
  expect(getMasterPlanDistrictForNormalizedBlock(CITY_BLUEPRINT.masterPlan, { x: 0.04, z: 0.42 }, 'residential')).toBe(
    'residential'
  );
});
