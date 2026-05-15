import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('access controls are deterministic, indexed, diagnosed, and constrain navigation edges', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, createGeneratedRuntimeObjectIndex(firstCity, traffic));
  const controlledEdges = firstCity.navigationGraphEdges.filter((edge) => (edge.accessControlIds ?? []).length > 0);
  const controlledVehicleEdge = firstCity.navigationGraphEdges.find((edge) => edge.id === 'navigation-edge-vehicle-road-h-5');
  const controlledEmergencyEdge = firstCity.navigationGraphEdges.find((edge) => edge.id === 'navigation-edge-emergency-road-h-5');

  expect(firstCity.accessControls.map((control) => [control.id, control.controlKind, control.ruleKind])).toEqual(
    secondCity.accessControls.map((control) => [control.id, control.controlKind, control.ruleKind])
  );
  expect(firstCity.validation.passed).toBe(true);
  expect(firstCity.accessControls).toHaveLength(12);
  expect(firstCity.objectIndex.countsByKind['access-control']).toBe(firstCity.accessControls.length);
  expect(countControlsByKind(firstCity.accessControls)).toEqual({
    'bollard-line': 2,
    checkpoint: 2,
    fence: 1,
    gate: 2,
    guardrail: 1,
    turnstile: 3,
    wall: 1
  });
  expect(firstCity.accessControls.every((control) => control.centerline.length >= 2 && control.boundary.length >= 4)).toBe(true);
  expect(firstCity.accessControls.every((control) => control.emergencyOverride)).toBe(true);
  expect(firstCity.accessControls.some((control) => control.publicAccess)).toBe(true);
  expect(firstCity.accessControls.some((control) => control.privateAccess)).toBe(true);
  expect(controlledEdges).toHaveLength(18);
  expect(controlledEdges.every((edge) => edge.restrictions.some((restriction) => restriction.startsWith('access-control:')))).toBe(true);
  expect(controlledVehicleEdge?.accessible).toBe(false);
  expect(controlledVehicleEdge?.accessControlIds).toContain(
    'access-control-fence-hazard-zone-restricted-area-civic-security-restricted-area'
  );
  expect(controlledEmergencyEdge?.accessible).toBe(true);
  expect(diagnostics.accessControls).toMatchObject({
    total: 12,
    gates: 2,
    checkpoints: 2,
    turnstiles: 3,
    navigationControlledEdges: 18,
    restrictedNavigationEdges: 18
  });
  expect(overlays.find((overlay) => overlay.id === 'access-controls')?.featureCount).toBe(12);
});

test('access-control validation catches invalid geometry, references, and navigation links', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [control, ...remainingControls] = city.accessControls;

  expect(control).toBeDefined();

  const invalidControl = {
    ...control,
    centerline: [control.center],
    roadIds: ['missing-road'],
    allowedModes: ['vehicle', 'emergency'] as const,
    restrictedModes: ['vehicle'] as const,
    navigationGraphEdgeIds: ['missing-edge']
  };
  const invalidCity = {
    ...city,
    accessControls: [invalidControl, ...remainingControls]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-access-control-${control.id}-invalid-geometry`,
        category: 'land',
        objectId: control.id
      }),
      expect.objectContaining({
        id: `invalid-access-control-${control.id}-invalid-mode-rules`,
        category: 'land',
        objectId: control.id
      }),
      expect.objectContaining({
        id: `invalid-access-control-${control.id}-missing-road-missing-road`,
        category: 'land',
        objectId: control.id
      }),
      expect.objectContaining({
        id: `invalid-access-control-navigation-edge-${control.id}-missing-edge`,
        category: 'graph',
        objectId: control.id
      })
    ])
  );
});

test('access-control diagnostics are visible in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    total: window.cityDiagnostics?.accessControls.total,
    gates: window.cityDiagnostics?.accessControls.gates,
    checkpoints: window.cityDiagnostics?.accessControls.checkpoints,
    turnstiles: window.cityDiagnostics?.accessControls.turnstiles,
    navigationControlledEdges: window.cityDiagnostics?.accessControls.navigationControlledEdges,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'access-controls')
      ?.featureCount,
    panelText: document.body.innerText
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.total).toBe(12);
  expect(diagnostics.gates).toBe(2);
  expect(diagnostics.checkpoints).toBe(2);
  expect(diagnostics.turnstiles).toBe(3);
  expect(diagnostics.navigationControlledEdges).toBe(18);
  expect(diagnostics.overlayFeatures).toBe(12);
  expect(diagnostics.panelText).toContain('Access Control');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function countControlsByKind(controls: ReturnType<CityGenerator['generate']>['accessControls']): Record<string, number> {
  return controls.reduce<Record<string, number>>((counts, control) => {
    counts[control.controlKind] = (counts[control.controlKind] ?? 0) + 1;
    return counts;
  }, {});
}
