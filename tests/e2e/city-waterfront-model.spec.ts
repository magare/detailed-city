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
  const openSpaces = firstCity.waterfrontOpenSpaces;
  const publicAccess = waterfront.find((edge) => edge.waterfrontKind === 'public-access');
  const pier = waterfront.find((edge) => edge.waterfrontKind === 'pier' && edge.publicAccess);
  const waterAccessOpenSpace = openSpaces.find((openSpace) => openSpace.openSpaceKind === 'water-access');
  const overlookOpenSpace = openSpaces.find((openSpace) => openSpace.openSpaceKind === 'overlook');

  expect(waterfront.map((edge) => edge.id)).toEqual(secondCity.waterfrontEdges.map((edge) => edge.id));
  expect(openSpaces.map((openSpace) => openSpace.id)).toEqual(secondCity.waterfrontOpenSpaces.map((openSpace) => openSpace.id));
  expect(waterfront).toHaveLength(11);
  expect(openSpaces).toHaveLength(8);
  expect(firstCity.objectIndex.countsByKind['waterfront-edge']).toBe(11);
  expect(firstCity.objectIndex.countsByKind['waterfront-open-space']).toBe(8);
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
  expect(waterAccessOpenSpace).toMatchObject({
    id: 'waterfront-open-space-south-river-water-access-2',
    kind: 'waterfront-open-space',
    ownerDomain: 'public-realm',
    parentId: 'waterfront-edge-south-river-public-access-2',
    openSpaceKind: 'water-access',
    waterfrontEdgeId: 'waterfront-edge-south-river-public-access-2',
    waterwayId: 'south-river',
    accessible: true,
    publicAccess: true,
    surface: 'concrete-promenade',
    assetBindingId: 'binding:waterfront:open-space'
  });
  expect(waterAccessOpenSpace?.waterAccessPoint).toBeDefined();
  expect(waterAccessOpenSpace?.seatingCapacity).toBeGreaterThan(0);
  expect(waterAccessOpenSpace?.railingLengthMeters).toBeGreaterThan(0);
  expect(overlookOpenSpace).toMatchObject({
    openSpaceKind: 'overlook',
    comfort: expect.objectContaining({ overlook: true })
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
  expect(diagnostics.waterfrontOpenSpace).toMatchObject({
    total: 8,
    publicAccessSpaces: 6,
    accessibleSpaces: 6,
    waterAccessPoints: 3,
    ecologicalSpaces: 2,
    byKind: {
      boardwalk: 1,
      'ecological-edge': 2,
      overlook: 1,
      'pier-landing': 2,
      promenade: 1,
      'water-access': 1
    }
  });
  expect(diagnostics.waterfrontOpenSpace.seatingCapacity).toBeGreaterThan(100);
  expect(diagnostics.waterfrontOpenSpace.railingLengthMeters).toBeGreaterThan(500);
  expect(diagnostics.objectCounts).toMatchObject({
    waterfrontEdges: 11,
    waterfrontPublicAccessEdges: 6,
    waterfrontFloodProtectionEdges: 4,
    waterfrontPiers: 3,
    waterfrontOpenSpaces: 8,
    waterfrontWaterAccessPoints: 3,
    waterfrontEcologicalOpenSpaces: 2
  });
  expect(overlays.find((overlay) => overlay.id === 'waterfront')?.featureCount).toBe(19);
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
  expect(overlays.find((overlay) => overlay.id === 'waterfront')?.features.at(-1)).toMatchObject({
    objectKind: 'waterfront-open-space',
    ownerDomain: 'public-realm',
    geometry: { type: 'polygon' },
    metadata: expect.objectContaining({
      openSpaceKind: 'pier-landing',
      waterAccess: true
    })
  });
});

test('waterfront validation catches broken water, public realm, road, dock, open space, and flood protection references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const baseEdge = city.waterfrontEdges.find((edge) => edge.waterfrontKind === 'public-access');
  const floodWall = city.waterfrontEdges.find((edge) => edge.waterfrontKind === 'flood-wall');
  const baseOpenSpace = city.waterfrontOpenSpaces.find((openSpace) => openSpace.openSpaceKind === 'water-access');
  expect(baseEdge).toBeDefined();
  expect(floodWall).toBeDefined();
  expect(baseOpenSpace).toBeDefined();
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
  const invalidOpenSpace = {
    ...baseOpenSpace!,
    parentId: 'missing-waterfront-edge',
    waterfrontEdgeId: 'missing-waterfront-edge',
    lengthMeters: 0,
    accessible: false,
    waterAccessPoint: undefined,
    connectedRoadIds: ['missing-road'],
    connectedParkIds: ['missing-park'],
    nearbyFurnitureIds: ['missing-furniture'],
    shadeTreeIds: ['missing-tree'],
    seatingCapacity: 0,
    railingLengthMeters: 0,
    comfort: {
      ...baseOpenSpace!.comfort,
      shadeCoverageRatio: 1.4
    },
    assetBindingId: 'missing-binding'
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
    }),
    waterfrontOpenSpaces: city.waterfrontOpenSpaces.map((openSpace) =>
      openSpace.id === invalidOpenSpace.id ? invalidOpenSpace : openSpace
    )
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
      expect.objectContaining({ id: `waterfront-missing-dock-missing-dock-${invalidPier.id}`, category: 'land' }),
      expect.objectContaining({
        id: `waterfront-open-space-missing-waterfront-edge-${invalidOpenSpace.id}`,
        category: 'land'
      })
    ])
  );
});

test('browser diagnostics expose waterfront model counts and visible pickable waterfront objects', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    waterfrontModel: window.cityDiagnostics?.waterfrontModel,
    waterfrontOpenSpace: window.cityDiagnostics?.waterfrontOpenSpace,
    objectCounts: window.cityDiagnostics?.objectCounts,
    waterfrontOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'waterfront'),
    pickingKindCount: window.cityDiagnostics?.picking.countsByKind['waterfront-edge'],
    pickingOpenSpaceKindCount: window.cityDiagnostics?.picking.countsByKind['waterfront-open-space'],
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
    waterfrontPiers: 3,
    waterfrontOpenSpaces: 8,
    waterfrontWaterAccessPoints: 3,
    waterfrontEcologicalOpenSpaces: 2
  });
  expect(diagnostics.waterfrontOpenSpace).toMatchObject({
    total: 8,
    publicAccessSpaces: 6,
    waterAccessPoints: 3,
    ecologicalSpaces: 2
  });
  expect(diagnostics.waterfrontOverlay).toMatchObject({
    id: 'waterfront',
    featureCount: 19
  });
  expect(diagnostics.pickingKindCount).toBe(11);
  expect(diagnostics.pickingOpenSpaceKindCount).toBe(8);
  expect(diagnostics.debugText).toContain('Waterfront');
  expect(diagnostics.debugText).toContain('11 edges, 6 public, 3 piers');
  expect(diagnostics.debugText).toContain('Promenade');
  expect(diagnostics.debugText).toContain('8 spaces');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
