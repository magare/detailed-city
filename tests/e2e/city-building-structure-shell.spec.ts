import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('building structure shells are deterministic and expose floor plates, cores, and transfer levels', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);

  expect(firstCity.buildings.map(getStructureSignature)).toEqual(secondCity.buildings.map(getStructureSignature));
  expect(firstCity.validation.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
  expect(diagnostics.buildingStructureShells.buildingsWithShell).toBe(firstCity.buildings.length);
  expect(diagnostics.buildingStructureShells.structuralSystemKinds).toBeGreaterThanOrEqual(4);
  expect(diagnostics.buildingStructureShells.floorPlates).toBeGreaterThan(firstCity.buildings.length);
  expect(diagnostics.buildingStructureShells.cores).toBe(firstCity.buildings.length);
  expect(diagnostics.buildingStructureShells.transferLevels).toBeGreaterThan(0);
  expect(diagnostics.buildingStructureShells.longSpanBuildings).toBeGreaterThan(0);

  for (const building of firstCity.buildings) {
    const shell = building.structureShell;
    expect(shell.grammarId).toBe(`${building.id}-structure-shell`);
    expect(shell.massing.floorCount).toBe(building.floorCount);
    expect(shell.floorPlates).toHaveLength(building.floorCount);
    expect(shell.core.servesLevels).toEqual([1, building.floorCount]);
    expect(shell.floorPlates.every((floorPlate) => floorPlate.structuralGridId === shell.structuralGrid.gridId)).toBe(true);
    expect(shell.floorPlates.every((floorPlate, index) => floorPlate.level === index + 1)).toBe(true);
  }

  const tower = firstCity.buildings.find((building) => building.footprintGrammar.kind === 'tower-on-podium');
  expect(tower?.structureShell.structuralSystem).toBe('concrete-core-outrigger');
  expect(tower?.structureShell.transferLevels.length).toBeGreaterThan(0);
  expect(tower?.structureShell.massing.towerFloorCount).toBeGreaterThan(0);

  const warehouse = firstCity.buildings.find((building) => building.structureShell.structuralSystem === 'long-span-steel');
  expect(warehouse?.structureShell.loadBearingAssumptions.longSpan).toBe(true);
});

test('building structure shell validation rejects invalid massing, core, grid, and assumptions', () => {
  const city = new CityGenerator(cityConfig).generate();
  const building = city.buildings.find((candidate) => candidate.footprintGrammar.kind === 'tower-on-podium');
  expect(building).toBeDefined();
  const [firstFloorPlate] = building!.structureShell.floorPlates;
  const invalidBuilding = {
    ...building!,
    structureShell: {
      ...building!.structureShell,
      grammarId: 'bad-structure-shell',
      structuralSystem: 'bad-frame',
      massing: {
        ...building!.structureShell.massing,
        floorCount: 1,
        totalHeightMeters: 1,
        roofElevationMeters: 1
      },
      core: {
        ...building!.structureShell.core,
        coreId: 'bad-core',
        servesLevels: [2, 1] as const,
        egressStairCount: 0
      },
      structuralGrid: {
        ...building!.structureShell.structuralGrid,
        gridId: 'bad-grid',
        baySpacingMeters: { x: 0, z: 0 },
        columnLineCount: { x: 1, z: 1 },
        primarySpanMeters: 0
      },
      floorPlates: [
        {
          ...firstFloorPlate,
          level: 99,
          areaSqM: 0,
          structuralGridId: 'bad-grid',
          use: 'industrial' as const
        }
      ],
      transferLevels: [],
      loadBearingAssumptions: {
        ...building!.structureShell.loadBearingAssumptions,
        gravitySystem: '',
        liveLoadKpa: 0,
        longSpan: true
      }
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
      expect.objectContaining({ id: `invalid-building-structure-shell-kind-${building!.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `building-structure-massing-mismatch-${building!.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `building-floor-plate-mismatch-${building!.id}-99`, category: 'geometry' }),
      expect.objectContaining({ id: `building-core-mismatch-${building!.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `building-structural-grid-mismatch-${building!.id}`, category: 'geometry' }),
      expect.objectContaining({ id: `building-load-bearing-assumption-mismatch-${building!.id}`, category: 'geometry' })
    ])
  );
});

test('browser diagnostics expose building structure shell counts', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    buildings: window.cityDiagnostics?.objectCounts.buildings,
    buildingsWithShell: window.cityDiagnostics?.buildingStructureShells.buildingsWithShell,
    structuralSystemKinds: window.cityDiagnostics?.buildingStructureShells.structuralSystemKinds,
    floorPlates: window.cityDiagnostics?.buildingStructureShells.floorPlates,
    transferLevels: window.cityDiagnostics?.buildingStructureShells.transferLevels,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.buildingsWithShell).toBe(diagnostics.buildings);
  expect(diagnostics.structuralSystemKinds).toBeGreaterThanOrEqual(4);
  expect(diagnostics.floorPlates).toBeGreaterThan(diagnostics.buildings ?? 0);
  expect(diagnostics.transferLevels).toBeGreaterThan(0);
  expect(diagnostics.debugText).toContain('Shells');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}

function getStructureSignature(building: ReturnType<CityGenerator['generate']>['buildings'][number]) {
  return {
    id: building.id,
    shell: building.structureShell
  };
}
