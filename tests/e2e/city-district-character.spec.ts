import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { CITY_BLUEPRINT } from '../../src/city/blueprint/cityBlueprint';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { BlockPlan } from '../../src/types/city';

test('generated districts consume blueprint character rules', () => {
  const city = new CityGenerator(cityConfig).generate();
  const rulesByDistrict = new Map(CITY_BLUEPRINT.districtRules.map((rule) => [rule.id, rule]));

  expect(CITY_BLUEPRINT.districtRules).toHaveLength(5);
  expect(city.validation.passed).toBe(true);

  for (const rule of CITY_BLUEPRINT.districtRules) {
    expect(rule.useMix.length).toBeGreaterThan(0);
    expect(rule.landmarkTargets.length).toBeGreaterThan(0);
    expect(rule.transitionBuffers.length).toBeGreaterThan(0);
    expect(rule.styleHints.preferredMaterialZones.length).toBeGreaterThan(0);
    expect(rule.allowedStreetProfiles.length).toBeGreaterThan(0);
  }

  for (const district of city.districts) {
    const rule = rulesByDistrict.get(district.district);

    expect(rule).toBeDefined();
    expect(district.useMix).toEqual(rule?.useMix);
    expect(district.densityGradient).toEqual(rule?.densityGradient);
    expect(district.landmarkTargets).toEqual(rule?.landmarkTargets);
    expect(district.transitionBuffers).toEqual(rule?.transitionBuffers);
    expect(district.styleHints).toEqual(rule?.styleHints);
    expect(district.allowedStreetProfiles).toEqual(rule?.allowedStreetProfiles);
    expect(district.tags).toMatchObject({
      blueprintDistrictRuleId: district.district,
      materialPalette: rule?.styleHints.materialPalette,
      densityGradientCenterId: rule?.densityGradient.centerId
    });
  }

  for (const parcel of city.parcels) {
    const rule = rulesByDistrict.get(parcel.district);

    expect(rule).toBeDefined();
    expect(parcel.allowedUses).toEqual(rule?.useMix.map((mix) => mix.use));
  }

  for (const building of city.buildings) {
    const rule = rulesByDistrict.get(building.district);

    expect(rule).toBeDefined();
    expect(building.heightMeters).toBeGreaterThanOrEqual(rule?.heightRangeMeters[0] ?? 0);
    expect(building.heightMeters).toBeLessThanOrEqual(rule?.heightRangeMeters[1] ?? Number.POSITIVE_INFINITY);
    expect(building.uses.every((use) => rule?.useMix.some((mix) => mix.use === use))).toBe(true);
  }
});

test('district character generation is deterministic for stable ids and counts', () => {
  const first = new CityGenerator(cityConfig).generate();
  const second = new CityGenerator(cityConfig).generate();

  expect(first.districts.map((district) => district.id)).toEqual(second.districts.map((district) => district.id));
  expect(first.districts.map((district) => district.useMix)).toEqual(second.districts.map((district) => district.useMix));
  expect(first.districts.map((district) => district.transitionBuffers)).toEqual(
    second.districts.map((district) => district.transitionBuffers)
  );
  expect(first.buildings.map((building) => [building.id, building.heightMeters, building.uses])).toEqual(
    second.buildings.map((building) => [building.id, building.heightMeters, building.uses])
  );
});

test('district validation catches malformed character rules and illegal transitions', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstDistrict, ...remainingDistricts] = city.districts;
  const invalidDistrict = {
    ...firstDistrict,
    useMix: [{ ...firstDistrict.useMix[0], share: -0.2 }, ...firstDistrict.useMix.slice(1)],
    allowedStreetProfiles: [...firstDistrict.allowedStreetProfiles, 'missing-profile'],
    densityGradient: {
      ...firstDistrict.densityGradient,
      centerId: '',
      coreIntensity: 1.4
    },
    landmarkTargets: [],
    transitionBuffers: [
      ...firstDistrict.transitionBuffers,
      {
        ...firstDistrict.transitionBuffers[0],
        adjacentDistrictId: 'district-missing',
        widthBlocks: 0
      }
    ],
    styleHints: {
      ...firstDistrict.styleHints,
      preferredMaterialZones: []
    }
  };
  const malformedDistrictCity = {
    ...city,
    districts: [invalidDistrict, ...remainingDistricts]
  };
  const malformedValidation = validateGeneratedCity({
    ...malformedDistrictCity,
    objectIndex: createGeneratedCityObjectIndex(malformedDistrictCity)
  });

  expect(malformedValidation.passed).toBe(false);
  expect(malformedValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-district-use-mix-${firstDistrict.id}`, category: 'zoning' }),
      expect.objectContaining({
        id: `invalid-district-street-profile-${firstDistrict.id}-missing-profile`,
        category: 'zoning'
      }),
      expect.objectContaining({ id: `invalid-district-density-gradient-${firstDistrict.id}`, category: 'zoning' }),
      expect.objectContaining({
        id: `invalid-district-landmark-target-${firstDistrict.id}-missing`,
        category: 'zoning'
      }),
      expect.objectContaining({
        id: `invalid-district-transition-buffer-${firstDistrict.id}-district-missing`,
        category: 'graph'
      }),
      expect.objectContaining({ id: `invalid-district-style-hints-${firstDistrict.id}`, category: 'zoning' })
    ])
  );

  const illegalTransition = createIllegalDistrictTransition(city.blocks);
  const transitionBlocks = city.blocks.map((block) =>
    block.id === illegalTransition.neighbor.id
      ? {
          ...block,
          parentId: 'district-industrial',
          districtId: 'district-industrial',
          district: 'industrial' as const
        }
      : block
  );
  const transitionCity = {
    ...city,
    blocks: transitionBlocks
  };
  const transitionValidation = validateGeneratedCity({
    ...transitionCity,
    objectIndex: createGeneratedCityObjectIndex(transitionCity)
  });

  expect(transitionValidation.passed).toBe(false);
  expect(transitionValidation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `illegal-district-transition-${illegalTransition.block.id}-${illegalTransition.neighbor.id}`,
        category: 'zoning',
        objectId: illegalTransition.block.id
      })
    ])
  );
});

test('city diagnostics and browser state expose district character counts', async ({ page }) => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const diagnostics = createCityDiagnostics(city, traffic, renderConfig, cityConfig);

  expect(diagnostics.districtCharacter).toMatchObject({
    districtRules: 5,
    useMixRules: 17,
    landmarkTargets: 5,
    transitionBuffers: 14,
    stylePalettes: [
      'civic-stone-copper',
      'downtown-glass-stone',
      'industrial-brick-metal',
      'residential-brick-foliage',
      'waterfront-light-masonry'
    ]
  });
  expect(diagnostics.objectCounts).toMatchObject({
    districtUseMixRules: 17,
    districtLandmarkTargets: 5,
    districtTransitionBuffers: 14,
    districtStylePalettes: 5
  });

  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const browserDiagnostics = await page.evaluate(() => ({
    districtRules: window.cityDiagnostics?.districtCharacter.districtRules,
    useMixRules: window.cityDiagnostics?.districtCharacter.useMixRules,
    landmarkTargets: window.cityDiagnostics?.districtCharacter.landmarkTargets,
    transitionBuffers: window.cityDiagnostics?.districtCharacter.transitionBuffers,
    stylePalettes: window.cityDiagnostics?.districtCharacter.stylePalettes.length,
    generatedDistricts: window.cityDiagnostics?.objectCounts.districts
  }));

  expect(browserDiagnostics).toEqual({
    districtRules: 5,
    useMixRules: 17,
    landmarkTargets: 5,
    transitionBuffers: 14,
    stylePalettes: 5,
    generatedDistricts: 5
  });
});

function createIllegalDistrictTransition(blocks: readonly BlockPlan[]): {
  readonly block: BlockPlan;
  readonly neighbor: BlockPlan;
} {
  const blocksByGrid = new Map(blocks.map((block) => [`${block.grid.x}:${block.grid.z}`, block]));

  for (const block of blocks) {
    if (block.districtId !== 'district-civic') {
      continue;
    }

    const candidates = [
      blocksByGrid.get(`${block.grid.x + 1}:${block.grid.z}`),
      blocksByGrid.get(`${block.grid.x}:${block.grid.z + 1}`)
    ];

    for (const neighbor of candidates) {
      if (neighbor) {
        return { block, neighbor };
      }
    }
  }

  throw new Error('Expected generated city to contain a civic block with a right or north neighbor.');
}
