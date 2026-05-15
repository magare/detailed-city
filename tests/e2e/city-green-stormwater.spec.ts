import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('green stormwater public realm is deterministic, routed, and sidewalk-safe', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));
  const utilityNodeIds = new Set(firstCity.utilityNodes.filter((node) => node.utilityType === 'stormwater').map((node) => node.id));
  const runoffEdgeIds = new Set(
    firstCity.utilityEdges
      .filter((edge) => edge.utilityType === 'stormwater' && edge.edgeRole === 'runoff-path')
      .map((edge) => edge.id)
  );

  expect(firstCity.greenStormwaterFeatures.map(getGreenStormwaterSignature)).toEqual(
    secondCity.greenStormwaterFeatures.map(getGreenStormwaterSignature)
  );
  expect(firstCity.validation.passed).toBe(true);
  expect(firstCity.greenStormwaterFeatures).toHaveLength(31);
  expect(diagnostics.greenStormwater.byKind).toEqual({
    bioswale: 5,
    'curb-cut': 4,
    'flow-through-planter': 4,
    'permeable-pavement': 4,
    'pervious-strip': 5,
    'rain-garden': 5,
    'tree-trench': 4
  });
  expect(diagnostics.greenStormwater).toMatchObject({
    totalFeatures: 31,
    roadBoundFeatures: 31,
    utilityBoundFeatures: 31,
    runoffRoutedFeatures: 31,
    treeLinkedFeatures: 4,
    maintenanceOwners: ['public-works-green-infrastructure']
  });
  expect(firstCity.greenStormwaterFeatures.every((feature) => feature.parentId === feature.roadId)).toBe(true);
  expect(firstCity.greenStormwaterFeatures.every((feature) => feature.clearPathMeters >= 1.8)).toBe(true);
  expect(firstCity.greenStormwaterFeatures.every((feature) => feature.utilityNodeIds.every((id) => utilityNodeIds.has(id)))).toBe(true);
  expect(firstCity.greenStormwaterFeatures.every((feature) => feature.runoffPathEdgeIds.every((id) => runoffEdgeIds.has(id)))).toBe(true);
  expect(firstCity.greenStormwaterFeatures.filter((feature) => feature.featureKind === 'tree-trench').every((feature) => feature.treeIds.length > 0)).toBe(true);
  expect(overlays.find((overlay) => overlay.id === 'green-stormwater')?.featureCount).toBe(31);
});

test('green stormwater validation catches blocked sidewalks and broken runoff references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const feature = city.greenStormwaterFeatures.find((candidate) => candidate.featureKind === 'tree-trench');

  expect(feature).toBeDefined();

  const invalidFeature = {
    ...feature!,
    clearPathMeters: 1.2,
    utilityNodeIds: ['missing-stormwater-node'],
    runoffPathEdgeIds: ['missing-runoff-edge'],
    treeIds: []
  };
  const invalidCity = {
    ...city,
    greenStormwaterFeatures: [
      invalidFeature,
      ...city.greenStormwaterFeatures.filter((candidate) => candidate.id !== feature!.id)
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
        id: `green-stormwater-blocked-clear-path-${feature!.id}`,
        category: 'geometry',
        objectId: feature!.id
      }),
      expect.objectContaining({
        id: `green-stormwater-invalid-utility-node-missing-stormwater-node-${feature!.id}`,
        category: 'graph',
        objectId: feature!.id
      }),
      expect.objectContaining({
        id: `green-stormwater-invalid-runoff-edge-missing-runoff-edge-${feature!.id}`,
        category: 'graph',
        objectId: feature!.id
      }),
      expect.objectContaining({
        id: `green-stormwater-missing-tree-trench-trees-${feature!.id}`,
        category: 'graph',
        objectId: feature!.id
      })
    ])
  );
});

test('green stormwater diagnostics and meshes are visible in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    totalFeatures: window.cityDiagnostics?.greenStormwater.totalFeatures,
    runoffRoutedFeatures: window.cityDiagnostics?.greenStormwater.runoffRoutedFeatures,
    treeLinkedFeatures: window.cityDiagnostics?.greenStormwater.treeLinkedFeatures,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'green-stormwater')?.featureCount,
    visiblePlanting: Boolean(
      (window.cityApp as unknown as { city?: { group: { getObjectByName(name: string): { visible?: boolean } | undefined } } })
        ?.city?.group.getObjectByName('GreenStormwaterPlantingInstances')?.visible
    ),
    visiblePaving: Boolean(
      (window.cityApp as unknown as { city?: { group: { getObjectByName(name: string): { visible?: boolean } | undefined } } })
        ?.city?.group.getObjectByName('GreenStormwaterPermeablePavingInstances')?.visible
    ),
    panelText: document.body.innerText
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.totalFeatures).toBe(31);
  expect(diagnostics.runoffRoutedFeatures).toBe(31);
  expect(diagnostics.treeLinkedFeatures).toBe(4);
  expect(diagnostics.overlayFeatures).toBe(31);
  expect(diagnostics.visiblePlanting).toBe(true);
  expect(diagnostics.visiblePaving).toBe(true);
  expect(diagnostics.panelText).toContain('Green Stormwater');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getGreenStormwaterSignature(feature: ReturnType<CityGenerator['generate']>['greenStormwaterFeatures'][number]): readonly unknown[] {
  return [
    feature.id,
    feature.featureKind,
    feature.roadId,
    feature.sidewalkId,
    feature.utilityNodeIds.join(','),
    feature.runoffPathEdgeIds.join(','),
    feature.treeIds.join(','),
    feature.center.x,
    feature.center.z,
    feature.storageVolumeCubicMeters,
    feature.treatmentVolumeCubicMeters,
    feature.runoffCapturePercent
  ];
}
