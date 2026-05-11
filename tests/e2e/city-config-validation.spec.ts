import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { ConfigValidationError, assertAppConfigValid } from '../../src/app/cityValidationGate';
import {
  CONFIG_SCHEMA_VERSION,
  createConfigDiagnostics,
  validateAppConfig,
  validateRenderConfig
} from '../../src/config/configSchema';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig, type RenderConfig } from '../../src/config/renderConfig';
import type { CityConfig, CityQualityPreset } from '../../src/types/city';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('active city and render config validate and are exposed in diagnostics', () => {
  const configDiagnostics = createConfigDiagnostics(cityConfig, renderConfig);
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const cityDiagnostics = createCityDiagnostics(city, traffic, renderConfig, cityConfig);

  expect(configDiagnostics).toMatchObject({
    schemaVersion: CONFIG_SCHEMA_VERSION,
    validation: {
      passed: true,
      issues: []
    },
    qualityPresets: ['low', 'medium', 'high', 'debug'],
    city: {
      seed: 'detailed-city-v1',
      qualityPreset: 'medium',
      gridSize: 12,
      density: {
        cityDensity: 0.72,
        trafficDensity: 0.42,
        propDensity: 0.68,
        treeDensity: 0.62
      }
    },
    render: {
      qualityPreset: 'medium',
      maxPixelRatio: 1.75,
      shadows: true
    }
  });
  expect(configDiagnostics.districts).toHaveLength(5);
  expect(cityDiagnostics.config).toEqual(configDiagnostics);
});

test('invalid city config fails the app config gate before generation', () => {
  const invalidCityConfig: CityConfig = {
    ...cityConfig,
    seed: '',
    qualityPreset: 'ultra' as CityQualityPreset,
    gridSize: 2,
    roadWidth: 50,
    density: {
      ...cityConfig.density,
      trafficDensity: 1.4,
      propDensity: -0.1
    },
    building: {
      ...cityConfig.building,
      minHeight: 100,
      maxHeight: 10,
      setback: 30
    },
    districts: {
      ...cityConfig.districts,
      downtown: {
        ...cityConfig.districts.downtown,
        density: 1.2,
        lotSplit: 0
      }
    }
  };

  const validation = validateAppConfig({ cityConfig: invalidCityConfig, renderConfig });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'invalid-config-seed', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-city-quality-preset', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-gridSize', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-roadWidth', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-road-width-ratio', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-density-trafficDensity', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-density-propDensity', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-building-height-range', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-building-setback-ratio', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-district-downtown-density', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-district-downtown-lotSplit', category: 'config', severity: 'error' })
    ])
  );
  expect(() => assertAppConfigValid(validation)).toThrow(ConfigValidationError);
});

test('invalid render config catches quality, color, clipping, and renderer budget fields', () => {
  const invalidRenderConfig: RenderConfig = {
    ...renderConfig,
    qualityPreset: 'ultra' as CityQualityPreset,
    background: -1,
    fogDensity: -0.1,
    fov: 8,
    maxPixelRatio: 4,
    near: 100,
    far: 50,
    shadows: 'yes' as unknown as boolean
  };

  const validation = validateRenderConfig(invalidRenderConfig);

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'invalid-render-quality-preset', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-render-background', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-render-fogDensity', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-render-fov', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-render-maxPixelRatio', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-render-near', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-config-render-far', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-render-clipping-range', category: 'config', severity: 'error' }),
      expect.objectContaining({ id: 'invalid-render-shadows', category: 'config', severity: 'error' })
    ])
  );
});
