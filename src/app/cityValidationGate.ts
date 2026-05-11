import type { ValidationIssue, ValidationResult } from '../city/data-contracts/cityContracts';

export class CityValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(formatValidationMessage('Generated city', issues));
    this.name = 'CityValidationError';
    this.issues = issues;
  }
}

export class ConfigValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(formatValidationMessage('App config', issues));
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

export function assertAppConfigValid(validation: ValidationResult): void {
  if (!validation.passed) {
    throw new ConfigValidationError(validation.issues.filter((issue) => issue.severity === 'error'));
  }
}

export function assertGeneratedCityValid(validation: ValidationResult): void {
  if (!validation.passed) {
    throw new CityValidationError(validation.issues.filter((issue) => issue.severity === 'error'));
  }
}

function formatValidationMessage(label: string, issues: readonly ValidationIssue[]): string {
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const sampleIssues = issues
    .slice(0, 3)
    .map((issue) => `${issue.severity}:${issue.category}:${issue.objectId ?? issue.id}`)
    .join(', ');

  return `${label} failed validation (${errorCount} errors, ${warningCount} warnings). ${sampleIssues}`;
}
