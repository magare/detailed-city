import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('cadastre records are deterministic and cover every parcel', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const diagnostics = createCityDiagnostics(firstCity, createTraffic(firstCity), renderConfig);

  expect(firstCity.cadastreRecords.map(getCadastreSignature)).toEqual(secondCity.cadastreRecords.map(getCadastreSignature));
  expect(firstCity.cadastreRecords).toHaveLength(firstCity.parcels.length);
  expect(firstCity.objectIndex.countsByKind['cadastre-record']).toBe(firstCity.parcels.length);
  expect(firstCity.parcels.every((parcel) => firstCity.objectIndex.objectsById[parcel.cadastreRecordId]?.kind === 'cadastre-record')).toBe(true);
  expect(firstCity.cadastreRecords.every((record) => record.rights.some((right) => right.rightKind === 'build'))).toBe(true);
  expect(firstCity.cadastreRecords.every((record) => record.easements.length >= 1)).toBe(true);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('cadastre'))).toEqual([]);
  expect(diagnostics.cadastreModel).toMatchObject({
    total: firstCity.parcels.length,
    parcelsWithCadastre: firstCity.parcels.length,
    recordsWithBuildRights: firstCity.parcels.length
  });
  expect(diagnostics.cadastreModel.easements).toBeGreaterThan(firstCity.parcels.length);
  expect(diagnostics.objectCounts.cadastreRecords).toBe(firstCity.parcels.length);
});

test('cadastre validation catches parcel mismatches and invalid legal data', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstRecord, ...remainingRecords] = city.cadastreRecords;
  const invalidRecord = {
    ...firstRecord,
    ownerName: '',
    assessedLandValue: 0,
    rights: [],
    easements: [
      {
        ...firstRecord.easements[0],
        widthMeters: -1,
        boundary: city.parcels[0].boundary.map((point) => ({ x: point.x + 1000, z: point.z + 1000 }))
      }
    ]
  };
  const invalidCity = {
    ...city,
    cadastreRecords: [invalidRecord, ...remainingRecords]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-cadastre-${firstRecord.id}-missing-legal-fields`, category: 'land' }),
      expect.objectContaining({ id: `invalid-cadastre-${firstRecord.id}-invalid-assessed-value`, category: 'land' }),
      expect.objectContaining({ id: `invalid-cadastre-${firstRecord.id}-missing-rights`, category: 'land' }),
      expect.objectContaining({
        id: `invalid-cadastre-${firstRecord.id}-invalid-easement-${firstRecord.easements[0].id}`,
        category: 'land'
      })
    ])
  );
});

test('browser diagnostics expose cadastre counts in the debug panel', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    cadastreRecords: window.cityDiagnostics?.cadastreModel.total,
    parcelsWithCadastre: window.cityDiagnostics?.cadastreModel.parcelsWithCadastre,
    cadastreEasements: window.cityDiagnostics?.cadastreModel.easements,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.cadastreRecords ?? 0).toBeGreaterThan(0);
  expect(diagnostics.parcelsWithCadastre).toBe(diagnostics.cadastreRecords);
  expect(diagnostics.cadastreEasements ?? 0).toBeGreaterThan(diagnostics.cadastreRecords ?? 0);
  expect(diagnostics.debugText).toContain('Cadastre');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getCadastreSignature(record: ReturnType<CityGenerator['generate']>['cadastreRecords'][number]) {
  return {
    id: record.id,
    parcelId: record.parcelId,
    tenure: record.tenure,
    ownerEntityId: record.ownerEntityId,
    titleReference: record.titleReference,
    assessedLandValue: record.assessedLandValue,
    rights: record.rights,
    easements: record.easements
  };
}
