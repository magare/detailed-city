import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import type { AssetDefinition, RenderBinding } from '../../src/city/data-contracts/cityContracts';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('asset binding diagnostics expose current fallback coverage', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const diagnostics = createCityDiagnostics(city, traffic, renderConfig);

  expect(city.validation.issues.filter((issue) => issue.category === 'asset')).toEqual([]);
  expect(city.validation.issues.filter((issue) => issue.category === 'metadata')).toEqual([]);
  expect(diagnostics.assetBindingDiagnostics).toMatchObject({
    assetDefinitions: 40,
    renderBindings: 40,
    bindingsWithAssets: 40,
    bindingsMissingAssets: 0,
    bindingsWithFallbacks: 40,
    bindingsMissingFallbacks: 0,
    unboundAssetDefinitions: 0
  });
  expect(diagnostics.assetBindingDiagnostics.renderableObjectKinds).toEqual(
    expect.arrayContaining([
      'building',
      'facade',
      'lane-marking',
      'park-feature',
      'plaza-zone',
      'road-segment',
      'street-furniture',
      'street-light',
      'traffic-calming-device',
      'traffic-vehicle',
      'tree-planting',
      'waterfront-edge',
      'waterway'
    ])
  );
  expect(diagnostics.assetBindingDiagnostics.materialZones.length).toBeGreaterThan(20);
  expect(diagnostics.assetBindingDiagnostics.semanticTags).toContain('traffic-car');
});

test('asset validation catches malformed catalog definitions and LOD variants', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [asset, ...remainingAssets] = city.assetCatalog;
  const invalidAsset: AssetDefinition = {
    ...asset,
    category: 'invalid-category' as AssetDefinition['category'],
    format: 'invalid-format' as AssetDefinition['format'],
    scaleMeters: 0,
    tags: {},
    lodVariants: {
      lod4: 'asset:missing:variant'
    }
  };
  const invalidCity = {
    ...city,
    assetCatalog: [invalidAsset, ...remainingAssets]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-asset-category-${asset.id}-invalid-category`,
        severity: 'error',
        category: 'asset',
        objectId: asset.id
      }),
      expect.objectContaining({
        id: `invalid-asset-format-${asset.id}-invalid-format`,
        severity: 'error',
        category: 'asset',
        objectId: asset.id
      }),
      expect.objectContaining({
        id: `invalid-asset-scale-${asset.id}`,
        severity: 'error',
        category: 'asset',
        objectId: asset.id
      }),
      expect.objectContaining({
        id: `missing-asset-material-zone-${asset.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: asset.id
      }),
      expect.objectContaining({
        id: `missing-asset-lod-variant-${asset.id}-lod4`,
        severity: 'warning',
        category: 'asset',
        objectId: asset.id
      })
    ])
  );
});

test('asset validation catches binary URL mismatches and invalid render binding semantics', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [asset, ...remainingAssets] = city.assetCatalog;
  const [binding, ...remainingBindings] = city.assetBindings;
  const binaryMismatchAsset: AssetDefinition = {
    ...asset,
    format: 'glb',
    url: '/assets/models/terrain-ground.png'
  };
  const invalidBinding: RenderBinding = {
    ...binding,
    id: 'binding:invalid:test',
    objectKind: 'not-a-kind' as RenderBinding['objectKind'],
    semanticTag: '',
    materialZone: '',
    fallbackMaterial: '',
    fallbackGeometry: '',
    assetId: 'asset:missing:binding'
  };
  const invalidCity = {
    ...city,
    assetCatalog: [binaryMismatchAsset, ...remainingAssets],
    assetBindings: [invalidBinding, ...remainingBindings]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `asset-url-format-mismatch-${asset.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: asset.id
      }),
      expect.objectContaining({
        id: 'invalid-render-binding-object-kind-binding:invalid:test',
        severity: 'error',
        category: 'asset',
        objectId: 'binding:invalid:test'
      }),
      expect.objectContaining({
        id: 'missing-render-binding-semantic-tag-binding:invalid:test',
        severity: 'warning',
        category: 'asset',
        objectId: 'binding:invalid:test'
      }),
      expect.objectContaining({
        id: 'missing-render-binding-material-zone-binding:invalid:test',
        severity: 'warning',
        category: 'asset',
        objectId: 'binding:invalid:test'
      }),
      expect.objectContaining({
        id: 'missing-render-fallback-binding:invalid:test',
        severity: 'warning',
        category: 'asset',
        objectId: 'binding:invalid:test'
      }),
      expect.objectContaining({
        id: 'missing-render-binding-asset-binding:invalid:test',
        severity: 'warning',
        category: 'asset',
        objectId: 'binding:invalid:test'
      })
    ])
  );
});
