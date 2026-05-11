import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('waterfront land model is deterministic and connects public access to waterways and public realm', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const waterfront = firstCity.waterfrontEdges;
  const publicAccess = waterfront.find((edge) => edge.waterfrontKind === 'public-access');
  const pier = waterfront.find((edge) => edge.waterfrontKind === 'pier' && edge.publicAccess);

  expect(waterfront.map((edge) => edge.id)).toEqual(secondCity.waterfrontEdges.map((edge) => edge.id));
  expect(waterfront).toHaveLength(11);
  expect(firstCity.objectIndex.countsByKind['waterfront-edge']).toBe(11);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'land')).toEqual([]);
  expect(publicAccess).toMatchObject({
    id: 'waterfront-edge-south-river-public-access-2',
    kind: 'waterfront-edge',
    ownerDomain: 'land',
    parentId: 'south-river',
    waterfrontKind: 'public-access',
    waterwayId: 'south-river',
    waterwayEdgeSegmentId: 'south-river-edge-north-2',
    publicAccess: true,
    connectedWaterwayComponentIds: ['south-river-edge-north-2'],
    floodProtection: { kind: 'none' },
    materialHint: 'concrete-promenade'
  });
  expect(publicAccess?.publicAccessPoint).toBeDefined();
  expect(publicAccess?.connectedRoadIds.length).toBeGreaterThan(0);
  expect(pier).toMatchObject({
    waterfrontKind: 'pier',
    dockId: expect.stringMatching(/^south-river-dock-/),
    materialHint: 'boardwalk'
  });
  expect(diagnostics.waterfrontModel).toMatchObject({
    total: 11,
    publicAccessEdges: 6,
    floodProtectionEdges: 4,
    piers: 3,
    byKind: {
      'ecological-edge': 2,
      'flood-wall': 2,
      pier: 3,
      promenade: 2,
      'public-access': 1,
      quay: 1
    }
  });
  expect(diagnostics.objectCounts).toMatchObject({
    waterfrontEdges: 11,
    waterfrontPublicAccessEdges: 6,
    waterfrontFloodProtectionEdges: 4,
    waterfrontPiers: 3
  });
  expect(overlays.find((overlay) => overlay.id === 'waterfront')?.featureCount).toBe(11);
  expect(overlays.find((overlay) => overlay.id === 'waterfront')?.features[0]).toMatchObject({
    id: 'overlay:waterfront:waterfront-edge-south-river-quay-0',
    objectKind: 'waterfront-edge',
    ownerDomain: 'land',
    geometry: { type: 'polygon' },
    metadata: {
      waterfrontKind: 'quay',
      waterwayId: 'south-river',
      publicAccess: true,
      floodProtection: 'none'
    }
  });
});

test('waterfront validation catches broken water, public realm, road, dock, and flood protection references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseEdge = city.waterfrontEdges.find((edge) => edge.waterfrontKind === 'public-access');
  const floodWall = city.waterfrontEdges.find((edge) => edge.waterfrontKind === 'flood-wall');
  expect(baseEdge).toBeDefined();
  expect(floodWall).toBeDefined();
  const invalidPublicEdge = {
    ...baseEdge!,
    widthMeters: 0,
    publicAccess: false,
    publicAccessPoint: undefined,
    waterwayEdgeSegmentId: 'missing-water-edge',
    connectedPublicRealmIds: ['missing-park'],
    connectedRoadIds: ['road-v-999'],
    connectedWaterwayComponentIds: ['missing-water-component']
  };
  const invalidFloodWall = {
    ...floodWall!,
    floodProtection: { kind: 'none' as const }
  };
  const invalidPier = {
    ...city.waterfrontEdges.find((edge) => edge.waterfrontKind === 'pier')!,
    dockId: 'missing-dock'
  };
  const invalidCity = {
    ...city,
    waterfrontEdges: city.waterfrontEdges.map((edge) => {
      if (edge.id === invalidPublicEdge.id) {
        return invalidPublicEdge;
      }
      if (edge.id === invalidFloodWall.id) {
        return invalidFloodWall;
      }
      if (edge.id === invalidPier.id) {
        return invalidPier;
      }
      return edge;
    })
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `waterfront-invalid-dimensions-${invalidPublicEdge.id}`, category: 'land' }),
      expect.objectContaining({ id: `waterfront-inaccessible-public-access-${invalidPublicEdge.id}`, category: 'land' }),
      expect.objectContaining({
        id: `waterfront-missing-waterway-edge-missing-water-edge-${invalidPublicEdge.id}`,
        category: 'land'
      }),
      expect.objectContaining({ id: `waterfront-missing-public-realm-missing-park-${invalidPublicEdge.id}`, category: 'land' }),
      expect.objectContaining({ id: `waterfront-missing-road-road-v-999-${invalidPublicEdge.id}`, category: 'land' }),
      expect.objectContaining({
        id: `waterfront-missing-water-component-missing-water-component-${invalidPublicEdge.id}`,
        category: 'land'
      }),
      expect.objectContaining({
        id: `waterfront-missing-flood-wall-protection-${invalidFloodWall.id}`,
        category: 'land'
      }),
      expect.objectContaining({ id: `waterfront-missing-dock-missing-dock-${invalidPier.id}`, category: 'land' })
    ])
  );
});

test('browser diagnostics expose waterfront model counts and visible pickable waterfront objects', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    waterfrontModel: window.cityDiagnostics?.waterfrontModel,
    objectCounts: window.cityDiagnostics?.objectCounts,
    waterfrontOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'waterfront'),
    pickingKindCount: window.cityDiagnostics?.picking.countsByKind['waterfront-edge'],
    debugText: document.body.textContent
  }));

  expect(diagnostics.waterfrontModel).toMatchObject({
    total: 11,
    publicAccessEdges: 6,
    floodProtectionEdges: 4,
    piers: 3
  });
  expect(diagnostics.objectCounts).toMatchObject({
    waterfrontEdges: 11,
    waterfrontPublicAccessEdges: 6,
    waterfrontFloodProtectionEdges: 4,
    waterfrontPiers: 3
  });
  expect(diagnostics.waterfrontOverlay).toMatchObject({
    id: 'waterfront',
    featureCount: 11
  });
  expect(diagnostics.pickingKindCount).toBe(11);
  expect(diagnostics.debugText).toContain('Waterfront');
  expect(diagnostics.debugText).toContain('11 edges, 6 public, 3 piers');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
