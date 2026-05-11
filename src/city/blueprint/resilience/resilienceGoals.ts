import type {
  CityId,
  ResilienceContinuityTarget,
  ResilienceGoalKind,
  ResilienceGoalTarget,
  ResiliencePriority
} from '../../data-contracts/cityContracts';

export type ResilienceFocusRule =
  | { readonly source: 'city-bounds' }
  | { readonly source: 'public-space'; readonly publicSpaceId: CityId }
  | { readonly source: 'road-corridor'; readonly roadId: CityId; readonly extraWidthMeters?: number }
  | { readonly source: 'waterway-buffer'; readonly waterwayId: CityId; readonly bufferByBlock: number }
  | {
      readonly source: 'normalized-zone';
      readonly minX: number;
      readonly maxX: number;
      readonly minZ: number;
      readonly maxZ: number;
    };

export interface ResilienceGoalRule {
  readonly id: CityId;
  readonly name: string;
  readonly goalKind: ResilienceGoalKind;
  readonly priority: ResiliencePriority;
  readonly description: string;
  readonly focus: ResilienceFocusRule;
  readonly target: ResilienceGoalTarget;
  readonly targetDistrictIds: readonly CityId[];
  readonly requiredObjectIds: readonly CityId[];
  readonly relatedObjectIds: readonly CityId[];
  readonly routeRoadIds: readonly CityId[];
  readonly shelterObjectIds: readonly CityId[];
  readonly coveredConstraintIds: readonly CityId[];
  readonly continuityTargets: readonly ResilienceContinuityTarget[];
  readonly adaptationActions: readonly string[];
  readonly recoveryPriority: number;
}

export const CITY_RESILIENCE_GOAL_RULES = [
  {
    id: 'resilience-goal-redundant-emergency-corridors',
    name: 'Redundant Emergency Corridors',
    goalKind: 'redundancy',
    priority: 'critical',
    description: 'Maintain north-south and east-west arterial redundancy for emergency response and evacuation.',
    focus: { source: 'city-bounds' },
    target: { metric: 'redundant-corridor-count', minimumCount: 2, unit: 'count' },
    targetDistrictIds: ['district-downtown', 'district-civic', 'district-waterfront'],
    requiredObjectIds: [
      'road-v-6',
      'road-h-6',
      'constraint-emergency-access-road-v-6',
      'constraint-clearance-road-h-6'
    ],
    relatedObjectIds: ['road-v-6', 'road-h-6'],
    routeRoadIds: ['road-v-6', 'road-h-6'],
    shelterObjectIds: [],
    coveredConstraintIds: ['constraint-emergency-access-road-v-6', 'constraint-clearance-road-h-6'],
    continuityTargets: ['emergency-response', 'mobility-network'],
    adaptationActions: [],
    recoveryPriority: 1
  },
  {
    id: 'resilience-goal-south-river-climate-adaptation',
    name: 'South River Climate Adaptation',
    goalKind: 'climate-adaptation',
    priority: 'critical',
    description: 'Keep the south river edge available for flood buffering, public access, and future adaptation works.',
    focus: { source: 'waterway-buffer', waterwayId: 'south-river', bufferByBlock: 0.72 },
    target: { metric: 'adaptation-constraint-count', minimumCount: 3, unit: 'count' },
    targetDistrictIds: ['district-waterfront'],
    requiredObjectIds: [
      'south-river',
      'constraint-hazard-buffer-south-river',
      'constraint-waterfront-buffer-south-river'
    ],
    relatedObjectIds: ['south-river', 'riverside-green'],
    routeRoadIds: [],
    shelterObjectIds: ['riverside-green'],
    coveredConstraintIds: [
      'constraint-hazard-buffer-south-river',
      'constraint-waterfront-buffer-south-river',
      'constraint-no-build-zone-riverside-green'
    ],
    continuityTargets: ['stormwater-readiness', 'waterfront-access'],
    adaptationActions: ['preserve-river-buffer', 'floodable-open-space', 'future-drainage-outfalls'],
    recoveryPriority: 2
  },
  {
    id: 'resilience-goal-downtown-evacuation-spine',
    name: 'Downtown Evacuation Spine',
    goalKind: 'evacuation-route',
    priority: 'high',
    description: 'Use the detailed-street corridor and crosstown arterial as the first evacuation spine.',
    focus: { source: 'road-corridor', roadId: 'road-v-6', extraWidthMeters: 8 },
    target: { metric: 'evacuation-route-count', minimumCount: 2, unit: 'count' },
    targetDistrictIds: ['district-downtown', 'district-civic'],
    requiredObjectIds: ['road-v-6', 'road-h-6'],
    relatedObjectIds: ['road-v-6', 'road-h-6', 'central-park', 'civic-plaza'],
    routeRoadIds: ['road-v-6', 'road-h-6'],
    shelterObjectIds: ['central-park', 'civic-plaza'],
    coveredConstraintIds: ['constraint-protected-corridor-road-v-6', 'constraint-clearance-road-h-6'],
    continuityTargets: ['mobility-network', 'public-shelter'],
    adaptationActions: [],
    recoveryPriority: 3
  },
  {
    id: 'resilience-goal-grand-avenue-emergency-access',
    name: 'Grand Avenue Emergency Access',
    goalKind: 'emergency-access',
    priority: 'critical',
    description: 'Preserve a continuous emergency access lane through the detailed-street grand avenue.',
    focus: { source: 'road-corridor', roadId: 'road-v-6', extraWidthMeters: 2 },
    target: { metric: 'emergency-access-corridor-count', minimumCount: 1, unit: 'count' },
    targetDistrictIds: ['district-downtown'],
    requiredObjectIds: ['road-v-6', 'constraint-emergency-access-road-v-6'],
    relatedObjectIds: ['road-v-6'],
    routeRoadIds: ['road-v-6'],
    shelterObjectIds: [],
    coveredConstraintIds: ['constraint-emergency-access-road-v-6'],
    continuityTargets: ['emergency-response'],
    adaptationActions: [],
    recoveryPriority: 1
  },
  {
    id: 'resilience-goal-civic-continuity-hubs',
    name: 'Civic Continuity Hubs',
    goalKind: 'continuity',
    priority: 'high',
    description: 'Keep civic open spaces available as service continuity hubs during incidents or outages.',
    focus: { source: 'public-space', publicSpaceId: 'civic-plaza' },
    target: { metric: 'continuity-system-count', minimumCount: 2, unit: 'count' },
    targetDistrictIds: ['district-civic'],
    requiredObjectIds: ['civic-plaza', 'central-park'],
    relatedObjectIds: ['civic-plaza', 'central-park', 'constraint-easement-civic-access'],
    routeRoadIds: ['road-v-3', 'road-h-9'],
    shelterObjectIds: ['civic-plaza', 'central-park'],
    coveredConstraintIds: ['constraint-easement-civic-access', 'constraint-no-build-zone-civic-plaza'],
    continuityTargets: ['public-shelter', 'emergency-response'],
    adaptationActions: ['reserve-civic-service-space'],
    recoveryPriority: 2
  },
  {
    id: 'resilience-goal-open-space-shelter-network',
    name: 'Open Space Shelter Network',
    goalKind: 'shelter',
    priority: 'high',
    description: 'Use protected open spaces as the first deterministic shelter and assembly network.',
    focus: { source: 'normalized-zone', minX: 0.08, maxX: 0.62, minZ: 0.18, maxZ: 0.82 },
    target: { metric: 'shelter-candidate-count', minimumCount: 3, unit: 'count' },
    targetDistrictIds: ['district-residential', 'district-civic', 'district-waterfront'],
    requiredObjectIds: ['central-park', 'civic-plaza', 'riverside-green'],
    relatedObjectIds: ['central-park', 'civic-plaza', 'riverside-green'],
    routeRoadIds: ['road-v-6', 'road-h-6'],
    shelterObjectIds: ['central-park', 'civic-plaza', 'riverside-green'],
    coveredConstraintIds: [
      'constraint-no-build-zone-central-park',
      'constraint-no-build-zone-civic-plaza',
      'constraint-no-build-zone-riverside-green'
    ],
    continuityTargets: ['public-shelter'],
    adaptationActions: ['protect-assembly-open-spaces'],
    recoveryPriority: 3
  },
  {
    id: 'resilience-goal-public-edge-recovery-priority',
    name: 'Public Edge Recovery Priority',
    goalKind: 'recovery-priority',
    priority: 'medium',
    description: 'Prioritize recovery of waterfront public access and open-space links after flood or storm events.',
    focus: { source: 'public-space', publicSpaceId: 'riverside-green' },
    target: { metric: 'recovery-anchor-count', minimumCount: 2, unit: 'count' },
    targetDistrictIds: ['district-waterfront'],
    requiredObjectIds: ['south-river', 'riverside-green'],
    relatedObjectIds: ['south-river', 'riverside-green', 'constraint-waterfront-buffer-south-river'],
    routeRoadIds: ['road-h-3', 'road-v-6'],
    shelterObjectIds: ['riverside-green'],
    coveredConstraintIds: ['constraint-waterfront-buffer-south-river', 'constraint-hazard-buffer-south-river'],
    continuityTargets: ['waterfront-access'],
    adaptationActions: ['restore-promenade-access', 'stage-debris-clearance'],
    recoveryPriority: 4
  }
] as const satisfies readonly ResilienceGoalRule[];
