import * as THREE from 'three';
import type { ValidationIssue, ValidationResult } from '../city/data-contracts/cityContracts';
import {
  CITY_DISTRICT_KINDS,
  CITY_QUALITY_PRESETS,
  type CityConfig,
  type CityQualityPreset,
  type DistrictKind
} from '../types/city';
import type { RenderConfig } from './renderConfig';

export const CONFIG_SCHEMA_VERSION = 'city-config-schema-v1';

export interface AppConfigValidationSource {
  readonly cityConfig: CityConfig;
  readonly renderConfig: RenderConfig;
}

export interface ConfigDiagnostics {
  readonly schemaVersion: typeof CONFIG_SCHEMA_VERSION;
  readonly validation: ValidationResult;
  readonly qualityPresets: readonly CityQualityPreset[];
  readonly city: {
    readonly seed: string;
    readonly qualityPreset: CityQualityPreset;
    readonly gridSize: number;
    readonly blockSize: number;
    readonly roadWidth: number;
    readonly waterwayWidth: number;
    readonly density: CityConfig['density'];
    readonly building: CityConfig['building'];
  };
  readonly districts: readonly {
    readonly district: DistrictKind;
    readonly density: number;
    readonly heightBias: number;
    readonly lotSplit: number;
  }[];
  readonly render: {
    readonly qualityPreset: CityQualityPreset;
    readonly antialias: boolean;
    readonly fov: number;
    readonly maxPixelRatio: number;
    readonly near: number;
    readonly far: number;
    readonly fogDensity: number;
    readonly shadows: boolean;
  };
}

export function validateAppConfig(source: AppConfigValidationSource): ValidationResult {
  const cityValidation = validateCityConfig(source.cityConfig);
  const renderValidation = validateRenderConfig(source.renderConfig);
  const issues = [...cityValidation.issues, ...renderValidation.issues];

  if (source.cityConfig.qualityPreset !== source.renderConfig.qualityPreset) {
    issues.push(
      createConfigIssue(
        'config-quality-preset-mismatch',
        'warning',
        `City quality preset ${source.cityConfig.qualityPreset} does not match render preset ${source.renderConfig.qualityPreset}.`
      )
    );
  }

  return createValidationResult(issues);
}

export function validateCityConfig(config: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(config)) {
    return createValidationResult([
      createConfigIssue('invalid-city-config-shape', 'error', 'City config must be an object.')
    ]);
  }

  validateSeed(config.seed, issues);
  validateQualityPreset(config.qualityPreset, 'city', issues);
  validateIntegerRange(config.gridSize, 'gridSize', 4, 40, issues);
  validateNumberRange(config.blockSize, 'blockSize', 16, 120, issues);
  validateNumberRange(config.roadWidth, 'roadWidth', 4, 40, issues);
  validateNumberRange(config.waterwayWidth, 'waterwayWidth', 8, 160, issues);

  if (
    typeof config.blockSize === 'number' &&
    typeof config.roadWidth === 'number' &&
    Number.isFinite(config.blockSize) &&
    Number.isFinite(config.roadWidth) &&
    config.roadWidth >= config.blockSize
  ) {
    issues.push(
      createConfigIssue('invalid-config-road-width-ratio', 'error', 'Road width must stay smaller than block size.')
    );
  }

  validateDensityConfig(config.density, issues);
  validateBuildingConfig(config.building, config.blockSize, issues);
  validateDistrictConfig(config.districts, issues);

  return createValidationResult(issues);
}

export function validateRenderConfig(config: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(config)) {
    return createValidationResult([
      createConfigIssue('invalid-render-config-shape', 'error', 'Render config must be an object.')
    ]);
  }

  validateQualityPreset(config.qualityPreset, 'render', issues);
  validateBoolean(config.antialias, 'render-antialias', 'Render antialias must be a boolean.', issues);
  validateColor(config.background, 'render-background', 'Render background must be a valid color.', issues);
  validateColor(config.fogColor, 'render-fog-color', 'Render fog color must be a valid color.', issues);
  validateNumberRange(config.fogDensity, 'render-fogDensity', 0, 0.02, issues);
  validateNumberRange(config.fov, 'render-fov', 20, 90, issues);
  validateNumberRange(config.maxPixelRatio, 'render-maxPixelRatio', 0.5, 3, issues);
  validateNumberRange(config.near, 'render-near', 0.01, 10, issues);
  validateNumberRange(config.far, 'render-far', 100, 10000, issues);
  validateBoolean(config.shadows, 'render-shadows', 'Render shadows must be a boolean.', issues);

  if (
    typeof config.near === 'number' &&
    typeof config.far === 'number' &&
    Number.isFinite(config.near) &&
    Number.isFinite(config.far) &&
    config.near >= config.far
  ) {
    issues.push(
      createConfigIssue('invalid-render-clipping-range', 'error', 'Render far plane must be greater than near plane.')
    );
  }

  return createValidationResult(issues);
}

export function createConfigDiagnostics(
  cityConfig: CityConfig,
  renderConfig: RenderConfig
): ConfigDiagnostics {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    validation: validateAppConfig({ cityConfig, renderConfig }),
    qualityPresets: CITY_QUALITY_PRESETS,
    city: {
      seed: cityConfig.seed,
      qualityPreset: cityConfig.qualityPreset,
      gridSize: cityConfig.gridSize,
      blockSize: cityConfig.blockSize,
      roadWidth: cityConfig.roadWidth,
      waterwayWidth: cityConfig.waterwayWidth,
      density: cityConfig.density,
      building: cityConfig.building
    },
    districts: CITY_DISTRICT_KINDS.map((district) => ({
      district,
      density: cityConfig.districts[district].density,
      heightBias: cityConfig.districts[district].heightBias,
      lotSplit: cityConfig.districts[district].lotSplit
    })),
    render: {
      qualityPreset: renderConfig.qualityPreset,
      antialias: renderConfig.antialias,
      fov: renderConfig.fov,
      maxPixelRatio: renderConfig.maxPixelRatio,
      near: renderConfig.near,
      far: renderConfig.far,
      fogDensity: renderConfig.fogDensity,
      shadows: renderConfig.shadows
    }
  };
}

function validateSeed(value: unknown, issues: ValidationIssue[]): void {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9:_-]{2,63}$/i.test(value)) {
    issues.push(
      createConfigIssue(
        'invalid-config-seed',
        'error',
        'City seed must be a 3-64 character stable string using letters, numbers, colon, underscore, or hyphen.'
      )
    );
  }
}

function validateQualityPreset(value: unknown, scope: 'city' | 'render', issues: ValidationIssue[]): void {
  if (!CITY_QUALITY_PRESETS.includes(value as CityQualityPreset)) {
    issues.push(
      createConfigIssue(
        `invalid-${scope}-quality-preset`,
        'error',
        `${scope === 'city' ? 'City' : 'Render'} quality preset must be one of ${CITY_QUALITY_PRESETS.join(', ')}.`
      )
    );
  }
}

function validateDensityConfig(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(createConfigIssue('invalid-config-density', 'error', 'City density config must be an object.'));
    return;
  }

  validateUnitInterval(value.cityDensity, 'density-cityDensity', issues);
  validateUnitInterval(value.trafficDensity, 'density-trafficDensity', issues);
  validateUnitInterval(value.propDensity, 'density-propDensity', issues);
  validateUnitInterval(value.treeDensity, 'density-treeDensity', issues);
}

function validateBuildingConfig(value: unknown, blockSize: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(createConfigIssue('invalid-config-building', 'error', 'Building config must be an object.'));
    return;
  }

  validateNumberRange(value.minHeight, 'building-minHeight', 1, 240, issues);
  validateNumberRange(value.maxHeight, 'building-maxHeight', 1, 300, issues);
  validateNumberRange(value.setback, 'building-setback', 0, 40, issues);

  if (
    typeof value.minHeight === 'number' &&
    typeof value.maxHeight === 'number' &&
    Number.isFinite(value.minHeight) &&
    Number.isFinite(value.maxHeight) &&
    value.minHeight > value.maxHeight
  ) {
    issues.push(
      createConfigIssue(
        'invalid-config-building-height-range',
        'error',
        'Building minHeight must be less than or equal to maxHeight.'
      )
    );
  }

  if (
    typeof blockSize === 'number' &&
    typeof value.setback === 'number' &&
    Number.isFinite(blockSize) &&
    Number.isFinite(value.setback) &&
    value.setback >= blockSize / 2
  ) {
    issues.push(
      createConfigIssue(
        'invalid-config-building-setback-ratio',
        'error',
        'Building setback must stay below half the block size.'
      )
    );
  }
}

function validateDistrictConfig(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push(createConfigIssue('invalid-config-districts', 'error', 'District config must be an object.'));
    return;
  }

  for (const district of CITY_DISTRICT_KINDS) {
    const districtConfig = value[district];

    if (!isRecord(districtConfig)) {
      issues.push(
        createConfigIssue(`missing-config-district-${district}`, 'error', `Missing ${district} district config.`)
      );
      continue;
    }

    validateUnitInterval(districtConfig.density, `district-${district}-density`, issues);
    validateUnitInterval(districtConfig.heightBias, `district-${district}-heightBias`, issues);
    validateIntegerRange(districtConfig.lotSplit, `district-${district}-lotSplit`, 1, 6, issues);
  }
}

function validateBoolean(value: unknown, idSuffix: string, message: string, issues: ValidationIssue[]): void {
  if (typeof value !== 'boolean') {
    issues.push(createConfigIssue(`invalid-${idSuffix}`, 'error', message));
  }
}

function validateColor(value: unknown, idSuffix: string, message: string, issues: ValidationIssue[]): void {
  if (typeof value === 'number' && (!Number.isInteger(value) || value < 0 || value > 0xffffff)) {
    issues.push(createConfigIssue(`invalid-${idSuffix}`, 'error', message));
    return;
  }

  try {
    new THREE.Color(value as THREE.ColorRepresentation);
  } catch {
    issues.push(createConfigIssue(`invalid-${idSuffix}`, 'error', message));
  }
}

function validateUnitInterval(value: unknown, idSuffix: string, issues: ValidationIssue[]): void {
  validateNumberRange(value, idSuffix, 0, 1, issues);
}

function validateIntegerRange(
  value: unknown,
  idSuffix: string,
  min: number,
  max: number,
  issues: ValidationIssue[]
): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    issues.push(
      createConfigIssue(`invalid-config-${idSuffix}`, 'error', `${idSuffix} must be an integer from ${min} to ${max}.`)
    );
  }
}

function validateNumberRange(
  value: unknown,
  idSuffix: string,
  min: number,
  max: number,
  issues: ValidationIssue[]
): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    issues.push(
      createConfigIssue(`invalid-config-${idSuffix}`, 'error', `${idSuffix} must be a number from ${min} to ${max}.`)
    );
  }
}

function createValidationResult(issues: readonly ValidationIssue[]): ValidationResult {
  return {
    passed: issues.every((issue) => issue.severity !== 'error'),
    issues
  };
}

function createConfigIssue(
  id: string,
  severity: ValidationIssue['severity'],
  message: string
): ValidationIssue {
  return {
    id,
    severity,
    category: 'config',
    message
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
