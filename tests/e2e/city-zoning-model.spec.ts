import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import type { LandUse } from '../../src/city/data-contracts/cityContracts';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('zoning model is deterministic and drives parcel and building controls', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const firstZoning = firstCity.zoningDistricts.find((zoning) => zoning.id === 'zoning-district-waterfront');
  expect(firstZoning).toBeDefined();
  const zoning = firstZoning!;
  const firstParcel = firstCity.parcels.find((parcel) => parcel.zoningDistrictId === zoning.id);
  const firstBuilding = firstCity.buildings.find((building) => building.parcelId === firstParcel?.id);

  expect(firstCity.zoningDistricts.map((zoning) => zoning.id)).toEqual(
    secondCity.zoningDistricts.map((zoning) => zoning.id)
  );
  expect(firstCity.zoningDistricts).toHaveLength(5);
  expect(firstCity.objectIndex.countsByKind['zoning-district']).toBe(5);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'zoning')).toEqual([]);
  expect(zoning).toMatchObject({
    id: 'zoning-district-waterfront',
    kind: 'zoning-district',
    ownerDomain: 'land',
    parentId: 'district-waterfront',
    zoningCode: 'FB-WF-5',
    zoningKind: 'form-based',
    controls: {
      maxHeightMeters: 58,
      maxFloorAreaRatio: 12,
      maxCoverageRatio: 0.82,
      frontageRules: {
        requiredPriority: 'any',
        activeUsesAllowed: true,
        activeFrontageRequiredOnPrimary: true
      }
    }
  });
  expect(firstParcel).toBeDefined();
  expect(firstParcel?.zoningDistrictId).toBe(zoning.id);
  expect(firstParcel?.zoning).toEqual(zoning.controls);
  expect(firstBuilding).toBeDefined();
  expect(firstBuilding?.zoningDistrictId).toBe(zoning.id);
  expect(diagnostics.zoningModel).toMatchObject({
    total: 5,
    formBasedDistricts: 2,
    parcelsWithZoning: firstCity.parcels.length,
    allowedUseRules: 17,
    maxHeightMeters: 92,
    maxFloorAreaRatio: 18
  });
  expect(overlays.find((overlay) => overlay.id === 'zoning')?.featureCount).toBe(5);
  expect(
    overlays.find((overlay) => overlay.id === 'zoning')?.features.find((feature) => feature.objectId === zoning.id)
  ).toMatchObject({
    id: 'overlay:zoning:zoning-district-waterfront',
    objectId: 'zoning-district-waterfront',
    objectKind: 'zoning-district',
    ownerDomain: 'land',
    geometry: { type: 'polygon' },
    metadata: {
      zoningCode: 'FB-WF-5',
      zoningKind: 'form-based',
      maxFloorAreaRatio: 12,
      maxCoverageRatio: 0.82
    }
  });
});

test('zoning validation reports use, height, FAR, coverage, buffer, and frontage violations', () => {
  const city = new CityGenerator(cityConfig).generate();
  const parcel = city.parcels.find((candidate) => candidate.frontagePriority.every((frontage) => frontage.priority !== 'service'));
  expect(parcel).toBeDefined();
  const building = city.buildings.find((candidate) => candidate.parcelId === parcel?.id);
  expect(building).toBeDefined();
  const invalidParcel = {
    ...parcel!,
    allowedUses: ['open-space'] as LandUse[],
    maxHeightMeters: 1,
    maxCoverageRatio: 0.1,
    zoning: {
      ...parcel!.zoning,
      allowedUses: ['open-space'] as LandUse[],
      maxHeightMeters: 1,
      maxFloorAreaRatio: 0.1,
      maxCoverageRatio: 0.1,
      bufferMeters: 999,
      frontageRules: {
        ...parcel!.zoning.frontageRules,
        requiredPriority: 'service' as const
      }
    }
  };
  const invalidCity = {
    ...city,
    parcels: city.parcels.map((candidate) => (candidate.id === invalidParcel.id ? invalidParcel : candidate))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `use-over-zoning-${building!.id}-${building!.uses[0]}`,
        category: 'zoning',
        objectId: building!.id
      }),
      expect.objectContaining({
        id: `height-over-zoning-${building!.id}`,
        category: 'zoning',
        objectId: building!.id
      }),
      expect.objectContaining({
        id: `floor-area-ratio-over-zoning-${building!.id}`,
        category: 'zoning',
        objectId: building!.id
      }),
      expect.objectContaining({
        id: `coverage-over-zoning-${building!.id}`,
        category: 'zoning',
        objectId: building!.id
      }),
      expect.objectContaining({
        id: `zoning-buffer-over-parcel-${parcel!.id}`,
        category: 'zoning',
        objectId: parcel!.id
      }),
      expect.objectContaining({
        id: `zoning-frontage-priority-missing-${parcel!.id}-service`,
        category: 'zoning',
        objectId: parcel!.id
      })
    ])
  );
});

test('browser diagnostics expose zoning model counts in the debug panel', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    zoningDistricts: window.cityDiagnostics?.zoningModel.total,
    formBasedDistricts: window.cityDiagnostics?.zoningModel.formBasedDistricts,
    parcelsWithZoning: window.cityDiagnostics?.zoningModel.parcelsWithZoning,
    zoningOverlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'zoning')?.featureCount,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics).toMatchObject({
    validationPassed: true,
    zoningDistricts: 5,
    formBasedDistricts: 2,
    parcelsWithZoning: 583,
    zoningOverlayFeatures: 5
  });
  expect(diagnostics.debugText).toContain('Zoning');
  expect(diagnostics.debugText).toContain('5 districts, 2 form, 583 parcels');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
