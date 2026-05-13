import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import {
  CITY_EXCHANGE_FORMAT_CONTRACTS,
  CITY_EXCHANGE_FORMATS,
  CITY_EXCHANGE_SCHEMA_VERSION,
  RENDERER_ONLY_EXPORT_KEYS,
  countProceduralSeedDomainObjects,
  createProceduralSeedJsonExport,
  validateProceduralSeedJsonExport
} from '../../src/city/data-contracts/import-export';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('import/export format contracts define the current exchange surface', () => {
  expect(CITY_EXCHANGE_SCHEMA_VERSION).toBe('city-exchange-v1');
  expect(CITY_EXCHANGE_FORMATS).toEqual([
    'geojson-feature-collection',
    'cityjson-domain',
    'osm-inspired-features',
    'gltf-asset-binding',
    'csv-table',
    'procedural-seed-json'
  ]);
  expect(CITY_EXCHANGE_FORMAT_CONTRACTS).toHaveLength(6);
  expect(CITY_EXCHANGE_FORMAT_CONTRACTS.every((contract) => contract.ownerDomain === 'data-contracts')).toBe(true);
  expect(CITY_EXCHANGE_FORMAT_CONTRACTS.every((contract) => contract.coordinateFrame === 'local-xz-meter')).toBe(true);
  expect(CITY_EXCHANGE_FORMAT_CONTRACTS.every((contract) => contract.requiredSections.length > 0)).toBe(true);
  expect(CITY_EXCHANGE_FORMAT_CONTRACTS.every((contract) => contract.excludedSections.includes('objectIndex'))).toBe(
    true
  );
});

test('procedural seed export is deterministic JSON without renderer-only fields', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const firstExport = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });
  const secondExport = createProceduralSeedJsonExport(secondCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });

  expect(JSON.stringify(firstExport)).toBe(JSON.stringify(secondExport));
  expect(firstExport).toMatchObject({
    schemaVersion: CITY_EXCHANGE_SCHEMA_VERSION,
    citySchemaVersion: firstCity.schemaVersion,
    format: 'procedural-seed-json',
    exportId: 'export:procedural-seed:detailed-city-v1',
    seed: 'detailed-city-v1',
    geospatial: {
      unit: 'meter',
      coordinateSystem: 'local-xz'
    },
    validation: {
      passed: true,
      issues: []
    }
  });
  expect(firstExport.config).toEqual(cityConfig);
  expect(firstExport.objectCount).toBe(firstCity.objectIndex.objectIds.length);
  expect(firstExport.objectCount).toBe(countProceduralSeedDomainObjects(firstExport));
  expect(firstExport.domainSectionCounts).toMatchObject({
    districts: 5,
    constraints: 11,
    hazardZones: 6,
    roads: 26,
    lanes: 72,
    sidewalks: 52,
    trafficCalmingDevices: 12,
    buildings: 583,
    civicAnchors: 6,
    communityAnchors: 8,
    cultureAnchors: 6,
    governmentAnchors: 5,
    activeFrontages: 44,
    parkFeatures: 24,
    plazaZones: 6,
    waterfrontOpenSpaces: 8,
    assetCatalog: 46,
    renderBindings: 46
  });
  expect(firstExport.city.civicAnchors).toHaveLength(6);
  expect(firstExport.city.communityAnchors).toHaveLength(8);
  expect(firstExport.city.cultureAnchors).toHaveLength(6);
  expect(firstExport.city.governmentAnchors).toHaveLength(5);
  expect(firstExport.city.waterfrontOpenSpaces).toHaveLength(8);
  expect(firstExport.assets.catalog).toHaveLength(46);
  expect(firstExport.assets.bindings).toHaveLength(46);

  const jsonText = JSON.stringify(firstExport);
  const jsonArtifact = JSON.parse(jsonText) as Record<string, unknown>;

  expect(jsonArtifact).toHaveProperty('city');
  expect(jsonArtifact).toHaveProperty('assets');
  expect(jsonArtifact).not.toHaveProperty('objectIndex');

  for (const rendererOnlyKey of RENDERER_ONLY_EXPORT_KEYS) {
    expect(jsonText).not.toContain(`"${rendererOnlyKey}":`);
  }

  expect(validateProceduralSeedJsonExport(firstExport)).toEqual({
    passed: true,
    issues: []
  });
});

test('procedural seed export validation rejects count mismatches and renderer state', () => {
  const city = new CityGenerator(cityConfig).generate();
  const exportArtifact = createProceduralSeedJsonExport(city, {
    seed: cityConfig.seed,
    config: cityConfig
  });
  const invalidArtifact = {
    ...exportArtifact,
    objectCount: exportArtifact.objectCount + 1,
    objectIndex: city.objectIndex
  } as Partial<typeof exportArtifact> & Record<string, unknown>;

  const validation = validateProceduralSeedJsonExport(invalidArtifact);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'invalid-export-object-count',
        severity: 'error',
        category: 'import-export'
      }),
      expect.objectContaining({
        id: 'export-renderer-only-field-objectIndex',
        severity: 'error',
        category: 'import-export'
      })
    ])
  );
});

test('city diagnostics expose procedural export readiness without embedding the artifact', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const diagnostics = createCityDiagnostics(city, traffic, renderConfig);

  expect(diagnostics.importExport).toMatchObject({
    schemaVersion: CITY_EXCHANGE_SCHEMA_VERSION,
    supportedFormatCount: 6,
    supportedFormats: CITY_EXCHANGE_FORMATS,
    proceduralSeedExport: {
      format: 'procedural-seed-json',
      objectCount: city.objectIndex.objectIds.length,
      exportedAssetDefinitions: 46,
      exportedRenderBindings: 46,
      validationPassed: true,
      jsonSerializable: true,
      rendererOnlyFieldsDetected: [],
      rendererOnlyFieldCount: 0
    }
  });
});
