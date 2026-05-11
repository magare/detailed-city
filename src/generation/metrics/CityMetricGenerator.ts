import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import type {
  ActiveFrontage,
  BuildingPlan,
  CityBounds,
  CityConfig,
  CityMetricPlan,
  CrossingPlan,
  ParkPatch,
  Parcel,
  ResilienceGoalPlan,
  RoadSegment,
  SidewalkGraph
} from '../../types/city';

export interface CityMetricGeneratorInput {
  readonly bounds: CityBounds;
  readonly roads: readonly RoadSegment[];
  readonly crossings: readonly CrossingPlan[];
  readonly sidewalkGraph: SidewalkGraph;
  readonly parcels: readonly Parcel[];
  readonly buildings: readonly BuildingPlan[];
  readonly activeFrontages: readonly ActiveFrontage[];
  readonly parks: readonly ParkPatch[];
  readonly resilienceGoals: readonly ResilienceGoalPlan[];
}

export class CityMetricGenerator {
  constructor(private readonly config: CityConfig) {}

  create(input: CityMetricGeneratorInput): CityMetricPlan[] {
    const cityAreaSquareKilometers = Math.max(0.001, (input.bounds.span * input.bounds.span) / 1_000_000);
    const roadKilometers = Math.max(0.001, input.roads.reduce((sum, road) => sum + road.length, 0) / 1000);
    const shelterCandidateIds = new Set(input.resilienceGoals.flatMap((goal) => goal.shelterObjectIds));
    const resilienceRouteIds = new Set(input.resilienceGoals.flatMap((goal) => goal.routeRoadIds));
    const openSpaceArea = input.parks.reduce((sum, park) => sum + park.size.x * park.size.z, 0);
    const builtFloorArea = input.buildings.reduce((sum, building) => {
      const floors = Math.max(1, building.floorCount);
      return sum + building.size.x * building.size.z * floors;
    }, 0);
    const averageBuildingHeight =
      input.buildings.reduce((sum, building) => sum + building.heightMeters, 0) / Math.max(1, input.buildings.length);

    const walkabilityScore = clampScore(
      (input.sidewalkGraph.edges.length / Math.max(1, input.crossings.length * 3)) * 100 +
        (input.activeFrontages.length / Math.max(1, input.buildings.length)) * 20
    );
    const openSpaceAccessScore = clampScore((openSpaceArea / Math.max(1, input.bounds.span * input.bounds.span)) * 1000);
    const serviceCoverageScore = clampScore((shelterCandidateIds.size / Math.max(1, input.parks.length)) * 100);
    const trafficLoad = roundMetric((this.config.density.trafficDensity * input.roads.length) / roadKilometers);
    const energyDemand = roundMetric((builtFloorArea * 0.018 + averageBuildingHeight * 0.35) / 1000);
    const emissions = roundMetric(trafficLoad * roadKilometers * 42 + energyDemand * 118);
    const qualityScore = clampScore(
      ((input.resilienceGoals.length >= 7 ? 1 : 0) +
        (input.parcels.length >= input.buildings.length ? 1 : 0) +
        (input.sidewalkGraph.nodes.length > 0 ? 1 : 0) +
        (input.parks.length >= 3 ? 1 : 0)) *
        25
    );

    return [
      metric({
        rule: getMetricRule('walkability'),
        value: walkabilityScore,
        computedFromObjectIds: [
          ...input.sidewalkGraph.nodes.slice(0, 8).map((node) => node.id),
          ...input.crossings.slice(0, 8).map((crossing) => crossing.id)
        ],
        focusPoint: { x: 0, z: 0 }
      }),
      metric({
        rule: getMetricRule('density'),
        value: roundMetric(input.buildings.length / cityAreaSquareKilometers),
        computedFromObjectIds: input.buildings.slice(0, 16).map((building) => building.id),
        focusPoint: { x: 0, z: 0 }
      }),
      metric({
        rule: getMetricRule('open-space-access'),
        value: openSpaceAccessScore,
        computedFromObjectIds: input.parks.map((park) => park.id),
        focusPoint: averagePoint(input.parks.map((park) => park.center))
      }),
      metric({
        rule: getMetricRule('service-coverage'),
        value: serviceCoverageScore,
        computedFromObjectIds: [...shelterCandidateIds, ...input.resilienceGoals.map((goal) => goal.id)],
        focusPoint: { x: 0, z: 0 }
      }),
      metric({
        rule: getMetricRule('traffic'),
        value: trafficLoad,
        computedFromObjectIds: [...input.roads.slice(0, 12).map((road) => road.id), ...resilienceRouteIds],
        focusPoint: { x: 0, z: 0 }
      }),
      metric({
        rule: getMetricRule('energy'),
        value: energyDemand,
        computedFromObjectIds: input.buildings.slice(0, 16).map((building) => building.id),
        focusPoint: { x: 0, z: 0 }
      }),
      metric({
        rule: getMetricRule('emissions'),
        value: emissions,
        computedFromObjectIds: [
          ...input.roads.slice(0, 8).map((road) => road.id),
          ...input.buildings.slice(0, 8).map((building) => building.id)
        ],
        focusPoint: { x: 0, z: 0 }
      }),
      metric({
        rule: getMetricRule('quality-checks'),
        value: qualityScore,
        computedFromObjectIds: [
          ...input.resilienceGoals.map((goal) => goal.id),
          ...input.parks.map((park) => park.id),
          ...input.roads.slice(0, 4).map((road) => road.id)
        ],
        focusPoint: { x: 0, z: 0 }
      })
    ];
  }
}

function metric(input: {
  readonly rule: (typeof CITY_BLUEPRINT.metricTargetRules)[number];
  readonly value: number;
  readonly computedFromObjectIds: readonly string[];
  readonly focusPoint: CityMetricPlan['focusPoint'];
}): CityMetricPlan {
  const status = getMetricStatus(input.value, input.rule.target);

  return {
    id: input.rule.id,
    name: input.rule.name,
    kind: 'city-metric',
    ownerDomain: 'blueprint',
    lod: 'lod0',
    metricKind: input.rule.metricKind,
    description: input.rule.description,
    value: input.value,
    unit: input.rule.unit,
    status,
    target: input.rule.target,
    computedFromObjectIds: input.computedFromObjectIds,
    relatedMetricIds: [],
    focusPoint: input.focusPoint,
    tags: {
      metricKind: input.rule.metricKind,
      value: input.value,
      status,
      unit: input.rule.unit
    }
  };
}

function getMetricRule(metricKind: CityMetricPlan['metricKind']): (typeof CITY_BLUEPRINT.metricTargetRules)[number] {
  const rule = CITY_BLUEPRINT.metricTargetRules.find((candidate) => candidate.metricKind === metricKind);

  if (!rule) {
    throw new Error(`Missing city metric target rule for ${metricKind}.`);
  }

  return rule;
}

function getMetricStatus(value: number, target: CityMetricPlan['target']): CityMetricPlan['status'] {
  if (target.min !== undefined && value < target.min) {
    return 'warn';
  }

  if (target.max !== undefined && value > target.max) {
    return 'warn';
  }

  return 'pass';
}

function averagePoint(points: readonly { readonly x: number; readonly z: number }[]): { readonly x: number; readonly z: number } {
  if (points.length === 0) {
    return { x: 0, z: 0 };
  }

  return {
    x: roundMetric(points.reduce((sum, point) => sum + point.x, 0) / points.length),
    z: roundMetric(points.reduce((sum, point) => sum + point.z, 0) / points.length)
  };
}

function clampScore(value: number): number {
  return roundMetric(Math.max(0, Math.min(100, value)));
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}
