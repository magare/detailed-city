import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('building roof grammar is deterministic and exposes rooftop equipment, access, and exemptions', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);

  expect(firstCity.buildings.map(getRoofSignature)).toEqual(secondCity.buildings.map(getRoofSignature));
  expect(firstCity.validation.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
  expect(diagnostics.buildingRoofs.buildingsWithGrammar).toBe(firstCity.buildings.length);
  expect(diagnostics.buildingRoofs.roofStyles).toBeGreaterThanOrEqual(4);
  expect(diagnostics.buildingRoofs.detailModules).toBeGreaterThan(firstCity.buildings.length);
  expect(diagnostics.buildingRoofs.mechanicalScreens).toBeGreaterThan(0);
  expect(diagnostics.buildingRoofs.solarArrays).toBeGreaterThan(0);
  expect(diagnostics.buildingRoofs.greenRoofs).toBeGreaterThan(0);
  expect(diagnostics.buildingRoofs.antennas).toBeGreaterThan(0);
  expect(diagnostics.buildingRoofs.terraces).toBeGreaterThan(0);
  expect(diagnostics.buildingRoofs.roofAccessCores).toBe(firstCity.buildings.length);
  expect(diagnostics.buildingRoofs.heightExemptions).toBeGreaterThan(0);

  for (const building of firstCity.buildings) {
    const grammar = building.roofGrammar;
    expect(grammar.grammarId).toBe(`${building.id}-roof-grammar`);
    expect(grammar.templateId).toBe(building.roofGrammarId);
    expect(grammar.sourceStructureShellId).toBe(building.structureShell.grammarId);
    expect(grammar.roofPlane.elevationMeters).toBeCloseTo(building.structureShell.massing.roofElevationMeters, 2);
    expect(grammar.details.some((detail) => detail.detailKind === 'roof-access')).toBe(true);
    expect(grammar.details.every((detail) => detail.sizeMeters.x > 0 && detail.sizeMeters.y > 0 && detail.sizeMeters.z > 0)).toBe(true);
    expect(grammar.details.every((detail) => detail.topElevationMeters >= detail.baseElevationMeters)).toBe(true);
  }
});

test('building roof grammar validation rejects impossible rooftop equipment and exemptions', () => {
  const city = new CityGenerator(cityConfig).generate();
  const building = city.buildings.find((candidate) => candidate.roofGrammar.details.some((detail) => detail.detailKind === 'antenna'));
  expect(building).toBeDefined();
  const detail = building!.roofGrammar.details[0];
  const invalidDetail = {
    ...detail,
    detailId: `${detail.detailId}-invalid`,
    detailKind: 'bad-roof-detail',
    centerOffsetMeters: { x: 999, z: 999 },
    sizeMeters: { ...detail.sizeMeters, x: -1 },
    materialZone: 'bad-zone',
    topElevationMeters: detail.baseElevationMeters - 1,
    heightExempt: true
  };
  const invalidBuilding = {
    ...building!,
    roofGrammar: {
      ...building!.roofGrammar,
      grammarId: 'bad-roof-grammar',
      templateId: 'bad-template',
      sourceStructureShellId: 'bad-shell',
      roofStyle: 'bad-style',
      roofPlane: {
        ...building!.roofGrammar.roofPlane,
        areaSqM: 0,
        elevationMeters: 0,
        usableAreaSqM: -1
      },
      details: [invalidDetail],
      solar: {
        ...building!.roofGrammar.solar,
        panelCount: 3,
        tiltDegrees: 90,
        detailIds: ['missing-solar-detail']
      },
      greenRoof: {
        ...building!.roofGrammar.greenRoof,
        enabled: true,
        coverageRatio: 2,
        detailId: 'missing-green-detail'
      },
      roofAccess: {
        hasStairBulkhead: false,
        hasMaintenancePath: false,
        accessDetailIds: []
      },
      heightExemptions: [
        {
          detailId: invalidDetail.detailId,
          allowed: false,
          reason: 'antenna',
          exemptHeightMeters: 20,
          zoningLimitMeters: 0
        }
      ]
    }
  };
  const invalidCity = {
    ...city,
    buildings: city.buildings.map((candidate) => (candidate.id === invalidBuilding.id ? invalidBuilding : candidate))
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity as any)
  } as any);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-building-roof-grammar-kind-${building!.id}`, category: 'asset' }),
      expect.objectContaining({ id: `building-roof-plane-mismatch-${building!.id}`, category: 'geometry' }),
      expect.objectContaining({ id: expect.stringContaining(`building-roof-detail-mismatch-${building!.id}`), category: 'asset' }),
      expect.objectContaining({ id: `building-roof-access-mismatch-${building!.id}`, category: 'asset' }),
      expect.objectContaining({ id: `building-roof-solar-mismatch-${building!.id}`, category: 'asset' }),
      expect.objectContaining({ id: `building-roof-green-roof-mismatch-${building!.id}`, category: 'asset' }),
      expect.objectContaining({ id: expect.stringContaining(`building-roof-height-exemption-invalid-${building!.id}`), category: 'zoning' })
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}

function getRoofSignature(building: ReturnType<CityGenerator['generate']>['buildings'][number]) {
  return {
    id: building.id,
    grammarId: building.roofGrammar.grammarId,
    templateId: building.roofGrammar.templateId,
    sourceStructureShellId: building.roofGrammar.sourceStructureShellId,
    roofStyle: building.roofGrammar.roofStyle,
    roofPlane: building.roofGrammar.roofPlane,
    details: building.roofGrammar.details,
    solar: building.roofGrammar.solar,
    greenRoof: building.roofGrammar.greenRoof,
    roofAccess: building.roofGrammar.roofAccess,
    heightExemptions: building.roofGrammar.heightExemptions
  };
}
