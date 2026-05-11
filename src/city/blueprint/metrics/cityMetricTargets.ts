import type { CityId, CityMetricKind, CityMetricTarget, CityMetricUnit } from '../../data-contracts/cityContracts';

export interface CityMetricTargetRule {
  readonly id: CityId;
  readonly metricKind: CityMetricKind;
  readonly name: string;
  readonly description: string;
  readonly unit: CityMetricUnit;
  readonly target: CityMetricTarget;
}

export const CITY_METRIC_TARGET_RULES = [
  {
    id: 'city-metric-walkability',
    metricKind: 'walkability',
    name: 'Walkability',
    description: 'Sidewalk graph and crossing density score for the generated city.',
    unit: 'score',
    target: { min: 70, idealDirection: 'higher' }
  },
  {
    id: 'city-metric-density',
    metricKind: 'density',
    name: 'Density',
    description: 'Building count per square kilometer of generated city area.',
    unit: 'objects-per-square-kilometer',
    target: { min: 900, max: 1800, idealDirection: 'range' }
  },
  {
    id: 'city-metric-open-space-access',
    metricKind: 'open-space-access',
    name: 'Open Space Access',
    description: 'Protected park area score relative to the generated city footprint.',
    unit: 'score',
    target: { min: 45, idealDirection: 'higher' }
  },
  {
    id: 'city-metric-service-coverage',
    metricKind: 'service-coverage',
    name: 'Service Coverage',
    description: 'Shelter and continuity target coverage from resilience goals.',
    unit: 'score',
    target: { min: 80, idealDirection: 'higher' }
  },
  {
    id: 'city-metric-traffic',
    metricKind: 'traffic',
    name: 'Traffic Load',
    description: 'Configured traffic load normalized by generated road length.',
    unit: 'vehicles-per-kilometer',
    target: { max: 22, idealDirection: 'lower' }
  },
  {
    id: 'city-metric-energy',
    metricKind: 'energy',
    name: 'Energy Demand',
    description: 'Coarse daily building energy demand index derived from generated floor area.',
    unit: 'megawatt-hours-per-day',
    target: { max: 110, idealDirection: 'lower' }
  },
  {
    id: 'city-metric-emissions',
    metricKind: 'emissions',
    name: 'Emissions',
    description: 'Coarse daily operational emissions index from traffic load and building energy.',
    unit: 'kilograms-co2e-per-day',
    target: { max: 14000, idealDirection: 'lower' }
  },
  {
    id: 'city-metric-quality-checks',
    metricKind: 'quality-checks',
    name: 'Quality Checks',
    description: 'Readiness score for core generated city invariants needed by downstream cards.',
    unit: 'score',
    target: { min: 100, idealDirection: 'higher' }
  }
] as const satisfies readonly CityMetricTargetRule[];
