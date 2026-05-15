import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { countProceduralSeedDomainObjects, createProceduralSeedJsonExport } from '../../src/city/data-contracts/import-export';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { getActiveWeatherPreset } from '../../src/generation/environment/ClimateWeatherGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('climate weather presets are deterministic, indexed, and exported', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, {
    seed: cityConfig.seed,
    config: cityConfig
  });

  expect(
    firstCity.weatherPresets.map((preset) => [
      preset.id,
      preset.presetKind,
      preset.active,
      preset.visibilityMeters,
      preset.surfaceWetness,
      preset.rendering.fogDensity
    ])
  ).toEqual(
    secondCity.weatherPresets.map((preset) => [
      preset.id,
      preset.presetKind,
      preset.active,
      preset.visibilityMeters,
      preset.surfaceWetness,
      preset.rendering.fogDensity
    ])
  );
  expect(firstCity.weatherPresets.map((preset) => preset.id)).toEqual([
    'weather-preset-coastal-clear',
    'weather-preset-humid-clouds',
    'weather-preset-evening-rain',
    'weather-preset-monsoon-burst',
    'weather-preset-morning-fog'
  ]);
  expect(firstCity.weatherPresets.filter((preset) => preset.active)).toHaveLength(1);
  expect(getActiveWeatherPreset(firstCity.weatherPresets).id).toBe('weather-preset-coastal-clear');
  expect(firstCity.objectIndex.countsByKind['weather-preset']).toBe(5);
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'environment')).toEqual([]);
  expect(firstCity.objectIndex.objectsById['weather-preset-coastal-clear']).toMatchObject({
    id: 'weather-preset-coastal-clear',
    kind: 'weather-preset',
    ownerDomain: 'environment',
    lod: 'lod0',
    presetKind: 'clear',
    active: true
  });
  expect(diagnostics.climateWeather).toMatchObject({
    total: 5,
    activePresetId: 'weather-preset-coastal-clear',
    activePresetKind: 'clear',
    rainyPresets: 3,
    fogPresets: 1,
    monsoonPresets: 1,
    minVisibilityMeters: 520,
    maxSurfaceWetness: 0.94
  });
  expect(diagnostics.objectCounts).toMatchObject({
    weatherPresets: 5,
    activeWeatherPresets: 1,
    rainyWeatherPresets: 3,
    fogWeatherPresets: 1,
    monsoonWeatherPresets: 1
  });
  expect(overlays.find((overlay) => overlay.id === 'weather-presets')?.featureCount).toBe(5);
  expect(exportArtifact.domainSectionCounts.weatherPresets).toBe(5);
  expect(exportArtifact.city.weatherPresets).toHaveLength(5);
  expect(countProceduralSeedDomainObjects(exportArtifact)).toBe(exportArtifact.objectCount);
});

test('climate weather validation catches invalid active, visibility, and wetness states', () => {
  const city = new CityGenerator(cityConfig).generate();
  const invalidPreset = {
    ...city.weatherPresets[2],
    active: true,
    cloudCover: 1.4,
    surfaceWetness: 0.2,
    visibilityMeters: 120,
    rendering: {
      ...city.weatherPresets[2].rendering,
      fogDensity: 0.02
    }
  };
  const invalidCity = {
    ...city,
    weatherPresets: city.weatherPresets.map((preset) => (preset.id === invalidPreset.id ? invalidPreset : preset))
  };
  const indexedInvalidCity = {
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  };
  const validation = validateGeneratedCity(indexedInvalidCity);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'invalid-active-weather-preset-count',
        category: 'environment'
      }),
      expect.objectContaining({
        id: `weather-preset-invalid-normalized-values-${invalidPreset.id}`,
        category: 'environment',
        objectId: invalidPreset.id
      }),
      expect.objectContaining({
        id: `weather-preset-visibility-hides-city-${invalidPreset.id}`,
        category: 'environment',
        objectId: invalidPreset.id
      }),
      expect.objectContaining({
        id: `weather-preset-rain-without-wetness-${invalidPreset.id}`,
        category: 'environment',
        objectId: invalidPreset.id
      })
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
