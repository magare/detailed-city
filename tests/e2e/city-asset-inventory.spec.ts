import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { GeneratedCity } from '../../src/types/city';

test('asset inventory is deterministic and covers renderable civic public-realm and utility assets', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));
  const targetIds = getInventoryTargetIds(firstCity);
  const inventoryTargetIds = new Set(firstCity.assetInventoryRecords.map((record) => record.assetObjectId));
  const lookupKeys = new Set(firstCity.assetInventoryRecords.map((record) => record.assetLookupKey));
  const bindingIds = new Set(firstCity.assetBindings.map((binding) => binding.id));
  const assetIds = new Set(firstCity.assetCatalog.map((asset) => asset.id));

  expect(firstCity.assetInventoryRecords.map(getInventorySignature)).toEqual(
    secondCity.assetInventoryRecords.map(getInventorySignature)
  );
  expect(firstCity.validation.passed).toBe(true);
  expect(firstCity.assetInventoryRecords).toHaveLength(1073);
  expect(diagnostics.assetInventory).toMatchObject({
    totalRecords: 1073,
    coveredAssetObjects: 1073,
    lookupKeys: 1073,
    byScope: {
      civic: 31,
      'public-realm': 959,
      utility: 83
    },
    recordsWithRenderAssets: 1073,
    recordsWithInspectionAccess: 1073
  });
  expect(
    firstCity.assetInventoryRecords.filter((record) => record.assetObjectKind === 'water-transport-access')
  ).toHaveLength(6);
  expect([...targetIds].every((id) => inventoryTargetIds.has(id))).toBe(true);
  expect(lookupKeys.size).toBe(firstCity.assetInventoryRecords.length);
  expect(firstCity.assetInventoryRecords.every((record) => bindingIds.has(record.renderBindingId))).toBe(true);
  expect(firstCity.assetInventoryRecords.every((record) => assetIds.has(record.renderAssetId))).toBe(true);
  expect(overlays.find((overlay) => overlay.id === 'asset-inventory')?.featureCount).toBe(1073);
});

test('asset inventory validation catches missing targets and invalid lifecycle data', () => {
  const city = new CityGenerator(cityConfig).generate();
  const record = city.assetInventoryRecords[0];

  expect(record).toBeDefined();

  const invalidRecord = {
    ...record,
    assetObjectId: 'missing-renderable-asset',
    parentId: 'missing-renderable-asset',
    renderBindingId: 'missing-render-binding',
    renderAssetId: 'missing-render-asset',
    replacementCost: {
      ...record.replacementCost,
      amountUsd: 0
    },
    condition: {
      ...record.condition,
      score: 120
    }
  };
  const invalidCity = {
    ...city,
    assetInventoryRecords: [
      invalidRecord,
      ...city.assetInventoryRecords.filter((candidate) => candidate.id !== record.id)
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `missing-asset-inventory-record-${record.assetObjectId}`,
        category: 'asset'
      }),
      expect.objectContaining({
        id: `asset-inventory-missing-target-${record.id}`,
        objectId: record.id,
        category: 'asset'
      })
    ])
  );
});

test('asset inventory diagnostics and overlays are inspectable in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    totalRecords: window.cityDiagnostics?.assetInventory.totalRecords,
    civicAssets: window.cityDiagnostics?.assetInventory.byScope.civic,
    publicRealmAssets: window.cityDiagnostics?.assetInventory.byScope['public-realm'],
    utilityAssets: window.cityDiagnostics?.assetInventory.byScope.utility,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'asset-inventory')?.featureCount,
    panelText: document.body.innerText
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.totalRecords).toBe(1073);
  expect(diagnostics.civicAssets).toBe(31);
  expect(diagnostics.publicRealmAssets).toBe(959);
  expect(diagnostics.utilityAssets).toBe(83);
  expect(diagnostics.overlayFeatures).toBe(1073);
  expect(diagnostics.panelText).toContain('Asset Inventory');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getInventoryTargetIds(city: GeneratedCity): ReadonlySet<string> {
  return new Set([
    ...city.civicAnchors.map((object) => object.id),
    ...city.communityAnchors.map((object) => object.id),
    ...city.cultureAnchors.map((object) => object.id),
    ...city.governmentAnchors.map((object) => object.id),
    ...city.utilityNodes.map((object) => object.id),
    ...city.utilityEdges.map((object) => object.id),
    ...city.streetLights.map((object) => object.id),
    ...city.streetFurniture.map((object) => object.id),
    ...city.parkFeatures.map((object) => object.id),
    ...city.plazaZones.map((object) => object.id),
    ...city.greenStormwaterFeatures.map((object) => object.id),
    ...city.waterTransportAccess.map((object) => object.id),
    ...city.waterfrontOpenSpaces.map((object) => object.id)
  ]);
}

function getInventorySignature(record: GeneratedCity['assetInventoryRecords'][number]): readonly unknown[] {
  return [
    record.id,
    record.assetObjectId,
    record.assetObjectKind,
    record.assetLookupKey,
    record.inventoryScope,
    record.ownerEntityId,
    record.responsibleDepartmentId,
    record.renderBindingId,
    record.renderAssetId,
    record.lifecycle.installedYear,
    record.lifecycle.replacementYear,
    record.condition.score,
    record.operationalStatus,
    record.criticality,
    record.replacementCost.amountUsd
  ];
}
