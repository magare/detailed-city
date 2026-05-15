import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { countProceduralSeedDomainObjects, createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('building fire safety profiles are deterministic, indexed, diagnosed, overlaid, and exported', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, diagnostics.objectIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });

  expect(firstCity.buildingFireSafetyProfiles.map(getProfileSignature)).toEqual(
    secondCity.buildingFireSafetyProfiles.map(getProfileSignature)
  );
  expect(firstCity.buildingFireSafetyProfiles).toHaveLength(firstCity.buildings.length);
  expect(firstCity.objectIndex.countsByKind['building-fire-safety']).toBe(firstCity.buildingFireSafetyProfiles.length);
  expect(firstCity.validation.issues.filter((issue) => issue.id.includes('building-fire-safety'))).toEqual([]);
  expect(firstCity.buildingFireSafetyProfiles.every((profile) => profile.hydrantWithinReach)).toBe(true);
  expect(firstCity.buildingFireSafetyProfiles.every((profile) => profile.fireLaneClearance)).toBe(true);
  expect(firstCity.buildingFireSafetyProfiles.every((profile) => profile.egress.providedExitCount >= profile.egress.requiredExitCount)).toBe(true);
  expect(firstCity.buildingFireSafetyProfiles.every((profile) => !profile.sprinkler.required || profile.sprinkler.provided)).toBe(true);
  expect(diagnostics.buildingFireSafety).toMatchObject({
    profiles: firstCity.buildingFireSafetyProfiles.length,
    hydrantCoveredBuildings: firstCity.buildingFireSafetyProfiles.length,
    fireLaneBuildings: firstCity.buildingFireSafetyProfiles.length,
    sprinkleredBuildings: firstCity.buildingFireSafetyProfiles.length
  });
  expect(overlays.find((overlay) => overlay.id === 'building-fire-safety')?.featureCount).toBe(
    firstCity.buildingFireSafetyProfiles.length
  );
  expect(exportArtifact.domainSectionCounts.buildingFireSafetyProfiles).toBe(firstCity.buildingFireSafetyProfiles.length);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);
});

test('building fire safety validation catches hydrant, fire lane, egress, sprinkler, and refuge gaps', () => {
  const city = new CityGenerator(cityConfig).generate();
  const invalidSourceProfile =
    city.buildingFireSafetyProfiles.find((profile) => profile.refugeAreas.length > 0) ?? city.buildingFireSafetyProfiles[0];
  const invalidProfile = {
    ...invalidSourceProfile,
    hydrantNodeId: 'missing-hydrant',
    hydrantDistanceMeters: invalidSourceProfile.hydrantReachMeters + 1,
    hydrantWithinReach: false,
    fireLaneCurbZoneIds: ['missing-fire-lane'],
    fireLaneClearance: false,
    egressEntranceIds: ['missing-egress-entrance'],
    emergencyAccessEntranceIds: [],
    serviceAccessCorridorIds: ['missing-service-access-corridor'],
    egress: {
      ...invalidSourceProfile.egress,
      providedExitCount: 0,
      totalExitWidthMeters: 0,
      minExitSeparationMeters: 0,
      exitCapacityPersons: 0
    },
    sprinkler: {
      ...invalidSourceProfile.sprinkler,
      required: true,
      provided: false,
      waterServiceNodeId: 'missing-water-node',
      pressureZoneId: '',
      estimatedFlowLitersPerSecond: 0
    },
    refugeAreas: [],
    emergencyAccess: {
      maxAccessDistanceMeters: 0,
      serviceAccessProvided: false,
      fireLaneProvided: false,
      hydrantReachProvided: false
    }
  };
  const invalidCity = {
    ...city,
    buildingFireSafetyProfiles: city.buildingFireSafetyProfiles.map((profile) =>
      profile.id === invalidProfile.id ? invalidProfile : profile
    )
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `invalid-building-fire-safety-${invalidProfile.id}-missing-hydrant`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-building-fire-safety-${invalidProfile.id}-hydrant-reach-exceeded`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-building-fire-safety-${invalidProfile.id}-missing-fire-lane`,
        category: 'graph'
      }),
      expect.objectContaining({
        id: `invalid-building-fire-safety-${invalidProfile.id}-insufficient-egress`,
        category: 'graph'
      }),
      expect.objectContaining({
        id: `invalid-building-fire-safety-${invalidProfile.id}-missing-emergency-access-entrance`,
        category: 'graph'
      }),
      expect.objectContaining({
        id: `invalid-building-fire-safety-${invalidProfile.id}-missing-service-access-missing-service-access-corridor`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-building-fire-safety-${invalidProfile.id}-invalid-sprinkler-service`,
        category: 'utility-coverage'
      }),
      expect.objectContaining({
        id: `invalid-building-fire-safety-${invalidProfile.id}-missing-refuge-area`,
        category: 'zoning'
      })
    ])
  );
});

test('building fire safety diagnostics are visible in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    profiles: window.cityDiagnostics?.buildingFireSafety.profiles,
    fireSafetyOverlay: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'building-fire-safety')
      ?.featureCount,
    panelText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.profiles).toBeGreaterThan(0);
  expect(diagnostics.fireSafetyOverlay).toBe(diagnostics.profiles);
  expect(diagnostics.panelText).toContain('Fire Safety');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getProfileSignature(profile: ReturnType<CityGenerator['generate']>['buildingFireSafetyProfiles'][number]) {
  return {
    id: profile.id,
    buildingId: profile.buildingId,
    hydrantNodeId: profile.hydrantNodeId,
    hydrantDistanceMeters: profile.hydrantDistanceMeters,
    hydrantReachMeters: profile.hydrantReachMeters,
    fireLaneCurbZoneIds: profile.fireLaneCurbZoneIds,
    egressEntranceIds: profile.egressEntranceIds,
    emergencyAccessEntranceIds: profile.emergencyAccessEntranceIds,
    serviceAccessCorridorIds: profile.serviceAccessCorridorIds,
    egress: profile.egress,
    sprinkler: profile.sprinkler,
    refugeAreas: profile.refugeAreas,
    emergencyAccess: profile.emergencyAccess
  };
}
