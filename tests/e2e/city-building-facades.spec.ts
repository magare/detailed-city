import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('building facade grammar is deterministic and exposes floor grids, bays, modules, and atlas slots', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);

  expect(firstCity.buildings.map(getFacadeSignature)).toEqual(secondCity.buildings.map(getFacadeSignature));
  expect(firstCity.validation.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
  expect(diagnostics.buildingFacades.buildingsWithGrammar).toBe(firstCity.buildings.length);
  expect(diagnostics.buildingFacades.facadeRhythms).toBeGreaterThanOrEqual(5);
  expect(diagnostics.buildingFacades.facadeSides).toBe(firstCity.buildings.length * 4);
  expect(diagnostics.buildingFacades.windowModules).toBeGreaterThan(firstCity.buildings.length);
  expect(diagnostics.buildingFacades.storefrontModules).toBeGreaterThan(0);
  expect(diagnostics.buildingFacades.atlasSlotIds).toEqual(expect.arrayContaining(['facade-window-punched-a']));

  for (const building of firstCity.buildings) {
    const grammar = building.facadeGrammar;
    expect(grammar.grammarId).toBe(`${building.id}-facade-grammar`);
    expect(grammar.templateId).toBe(building.facadeGrammarId);
    expect(grammar.sourceStructureShellId).toBe(building.structureShell.grammarId);
    expect(grammar.floorGrid.floorCount).toBe(building.floorCount);
    expect(grammar.sides).toHaveLength(4);
    expect(grammar.sides.every((side) => side.bayCount > 0 && side.windowModule.widthMeters > 0)).toBe(true);
  }

  const activeFrontageBuildingIds = new Set(firstCity.activeFrontages.map((frontage) => frontage.buildingId));
  const detailedStorefronts = firstCity.buildings.filter((building) => activeFrontageBuildingIds.has(building.id));
  expect(detailedStorefronts.length).toBeGreaterThan(0);
  expect(
    detailedStorefronts.every((building) =>
      building.facadeGrammar.sides.some(
        (side) =>
          side.side === building.primaryFrontageSide &&
          side.storefrontModule.enabled &&
          side.storefrontModule.roadId === building.primaryFrontageRoadId
      )
    )
  ).toBe(true);
});

test('building facade grammar validation rejects invalid floor grids, modules, material zones, and active frontage mismatches', () => {
  const city = new CityGenerator(cityConfig).generate();
  const activeFrontageBuildingId = city.activeFrontages[0]?.buildingId;
  const building = city.buildings.find((candidate) => candidate.id === activeFrontageBuildingId);
  expect(building).toBeDefined();
  const primarySide = building!.facadeGrammar.sides.find((side) => side.side === building!.primaryFrontageSide)!;
  const invalidBuilding = {
    ...building!,
    facadeGrammar: {
      ...building!.facadeGrammar,
      grammarId: 'bad-facade-grammar',
      templateId: 'bad-template',
      sourceStructureShellId: 'bad-shell',
      rhythm: 'bad-rhythm',
      floorGrid: {
        ...building!.facadeGrammar.floorGrid,
        floorCount: 1,
        expressedFloorLevels: primarySide.floorLevels
      },
      baySpacingMeters: 0,
      sides: [
        {
          ...primarySide,
          windowModule: {
            ...primarySide.windowModule,
            transparencyRatio: 2
          },
          storefrontModule: {
            ...primarySide.storefrontModule,
            enabled: true,
            roadId: 'road-v-999',
            bayCount: 0
          },
          materialZones: ['bad-zone']
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
      expect.objectContaining({ id: `invalid-building-facade-grammar-kind-${building!.id}`, category: 'asset' }),
      expect.objectContaining({ id: `building-facade-floor-grid-mismatch-${building!.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `building-facade-window-module-mismatch-${building!.id}-${building!.primaryFrontageSide}`, category: 'asset' }),
      expect.objectContaining({ id: `building-facade-material-zone-mismatch-${building!.id}-${building!.primaryFrontageSide}`, category: 'asset' }),
      expect.objectContaining({ id: `building-facade-storefront-module-mismatch-${building!.id}-${building!.primaryFrontageSide}`, category: 'asset' }),
      expect.objectContaining({ id: `building-facade-grammar-completeness-${building!.id}`, category: 'asset' })
    ])
  );
  expect(validation.issues.some((issue) => issue.id.startsWith('active-frontage-facade-grammar-mismatch-'))).toBe(true);
});

test('browser diagnostics expose building facade grammar counts in the debug panel', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    buildings: window.cityDiagnostics?.objectCounts.buildings,
    buildingsWithGrammar: window.cityDiagnostics?.buildingFacades.buildingsWithGrammar,
    facadeRhythms: window.cityDiagnostics?.buildingFacades.facadeRhythms,
    facadeSides: window.cityDiagnostics?.buildingFacades.facadeSides,
    windowModules: window.cityDiagnostics?.buildingFacades.windowModules,
    storefrontModules: window.cityDiagnostics?.buildingFacades.storefrontModules,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.buildingsWithGrammar).toBe(diagnostics.buildings);
  expect(diagnostics.facadeRhythms).toBeGreaterThanOrEqual(5);
  expect(diagnostics.facadeSides).toBe((diagnostics.buildings ?? 0) * 4);
  expect(diagnostics.windowModules).toBeGreaterThan(diagnostics.buildings ?? 0);
  expect(diagnostics.storefrontModules).toBeGreaterThan(0);
  expect(diagnostics.debugText).toContain('Facades');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}

function getFacadeSignature(building: ReturnType<CityGenerator['generate']>['buildings'][number]) {
  return {
    id: building.id,
    grammarId: building.facadeGrammar.grammarId,
    templateId: building.facadeGrammar.templateId,
    sourceStructureShellId: building.facadeGrammar.sourceStructureShellId,
    rhythm: building.facadeGrammar.rhythm,
    floorCount: building.facadeGrammar.floorGrid.floorCount,
    baySpacingMeters: building.facadeGrammar.baySpacingMeters,
    materialPaletteId: building.facadeGrammar.materialPaletteId,
    atlasSlots: building.facadeGrammar.atlasSlots,
    sides: building.facadeGrammar.sides.map((side) => ({
      side: side.side,
      bayCount: side.bayCount,
      baySpacingMeters: side.baySpacingMeters,
      floorLevels: side.floorLevels.length,
      window: side.windowModule,
      balconyEnabled: side.balconyModule.enabled,
      storefrontEnabled: side.storefrontModule.enabled,
      storefrontRoadId: side.storefrontModule.roadId,
      materialZones: side.materialZones
    }))
  };
}
