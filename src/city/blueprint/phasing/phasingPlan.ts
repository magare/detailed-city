import type {
  CityId,
  DevelopmentPhaseKind,
  DevelopmentPhaseStatus
} from '../../data-contracts/cityContracts';

export interface DevelopmentPhaseRule {
  readonly id: CityId;
  readonly name: string;
  readonly phaseKind: DevelopmentPhaseKind;
  readonly status: DevelopmentPhaseStatus;
  readonly sequence: number;
  readonly startYear: number;
  readonly targetYear: number;
  readonly normalizedZone: {
    readonly minX: number;
    readonly maxX: number;
    readonly minZ: number;
    readonly maxZ: number;
  };
  readonly description: string;
  readonly unlocksAfterPhaseIds: readonly CityId[];
  readonly unlocksObjectIds: readonly CityId[];
  readonly temporaryRoadIds: readonly CityId[];
  readonly temporaryParkIds: readonly CityId[];
  readonly closureRoadIds: readonly CityId[];
  readonly masterPlanGrowthBoundaryIds: readonly CityId[];
  readonly operationsHooks: {
    readonly closureIds: readonly CityId[];
    readonly simulationScenarioIds: readonly CityId[];
  };
}

export const CITY_PHASING_PLAN = [
  {
    id: 'development-phase-baseline-operational-city',
    name: 'Operational City Baseline',
    phaseKind: 'baseline',
    status: 'active',
    sequence: 0,
    startYear: 2026,
    targetYear: 2026,
    normalizedZone: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 },
    description: 'Current city condition with the generated street, parcel, park, water, building, and public-realm systems open.',
    unlocksAfterPhaseIds: [],
    unlocksObjectIds: ['road-v-6', 'central-park', 'south-river'],
    temporaryRoadIds: [],
    temporaryParkIds: [],
    closureRoadIds: [],
    masterPlanGrowthBoundaryIds: ['growth-boundary-city-limit'],
    operationsHooks: {
      closureIds: [],
      simulationScenarioIds: ['scenario-baseline-daily-operations']
    }
  },
  {
    id: 'development-phase-future-expansion-core-intensification',
    name: 'Core Intensification Expansion',
    phaseKind: 'future-expansion',
    status: 'planned',
    sequence: 1,
    startYear: 2027,
    targetYear: 2031,
    normalizedZone: { minX: 0.26, maxX: 0.68, minZ: 0.34, maxZ: 0.78 },
    description: 'Planned infill and public-realm improvements inside the master-plan core intensification boundary.',
    unlocksAfterPhaseIds: ['development-phase-baseline-operational-city'],
    unlocksObjectIds: ['road-v-6', 'civic-plaza'],
    temporaryRoadIds: [],
    temporaryParkIds: [],
    closureRoadIds: ['road-h-5'],
    masterPlanGrowthBoundaryIds: ['growth-boundary-core-intensification'],
    operationsHooks: {
      closureIds: ['closure-core-intensification-road-h-5'],
      simulationScenarioIds: ['scenario-core-intensification-construction']
    }
  },
  {
    id: 'development-phase-temporary-condition-civic-campus-works',
    name: 'Civic Campus Works',
    phaseKind: 'temporary-condition',
    status: 'temporary',
    sequence: 2,
    startYear: 2027,
    targetYear: 2028,
    normalizedZone: { minX: 0, maxX: 0.3, minZ: 0.58, maxZ: 1 },
    description: 'Temporary civic-campus construction condition with managed road closures and an interim open-space detour.',
    unlocksAfterPhaseIds: ['development-phase-future-expansion-core-intensification'],
    unlocksObjectIds: ['road-v-2', 'civic-plaza'],
    temporaryRoadIds: ['road-v-2'],
    temporaryParkIds: ['civic-plaza'],
    closureRoadIds: ['road-h-6', 'road-v-1'],
    masterPlanGrowthBoundaryIds: ['growth-boundary-city-limit'],
    operationsHooks: {
      closureIds: ['closure-civic-campus-road-h-6', 'closure-civic-campus-road-v-1'],
      simulationScenarioIds: ['scenario-civic-campus-temporary-access']
    }
  }
] as const satisfies readonly DevelopmentPhaseRule[];
