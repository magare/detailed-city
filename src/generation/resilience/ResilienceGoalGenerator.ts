import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import type { ResilienceFocusRule } from '../../city/blueprint/resilience/resilienceGoals';
import type {
  CityBounds,
  CityConfig,
  ParkPatch,
  ResilienceGoalPlan,
  RoadSegment,
  Waterway
} from '../../types/city';
import { getPolygonBounds, rectanglePolygon } from '../../utils/geometry';

export interface ResilienceGoalGeneratorInput {
  readonly bounds: CityBounds;
  readonly parks: readonly ParkPatch[];
  readonly roads: readonly RoadSegment[];
  readonly waterways: readonly Waterway[];
}

export class ResilienceGoalGenerator {
  constructor(private readonly config: CityConfig) {}

  create(input: ResilienceGoalGeneratorInput): ResilienceGoalPlan[] {
    const parksById = new Map(input.parks.map((park) => [park.id, park]));
    const roadsById = new Map(input.roads.map((road) => [road.id, road]));
    const waterwaysById = new Map(input.waterways.map((waterway) => [waterway.id, waterway]));

    return CITY_BLUEPRINT.resilienceGoalRules.flatMap((rule) => {
      const focusBoundary = this.resolveFocusBoundary(rule.focus, input.bounds, parksById, roadsById, waterwaysById);

      if (!focusBoundary) {
        return [];
      }

      const focusPoint = getBoundaryCenter(focusBoundary);

      return [
        {
          id: rule.id,
          kind: 'resilience-goal',
          ownerDomain: 'blueprint',
          name: rule.name,
          lod: 'lod0',
          goalKind: rule.goalKind,
          priority: rule.priority,
          description: rule.description,
          target: rule.target,
          targetDistrictIds: [...rule.targetDistrictIds],
          requiredObjectIds: [...rule.requiredObjectIds],
          relatedObjectIds: [...rule.relatedObjectIds],
          routeRoadIds: [...rule.routeRoadIds],
          shelterObjectIds: [...rule.shelterObjectIds],
          coveredConstraintIds: [...rule.coveredConstraintIds],
          continuityTargets: [...rule.continuityTargets],
          adaptationActions: [...rule.adaptationActions],
          recoveryPriority: rule.recoveryPriority,
          focusPoint,
          focusBoundary,
          tags: {
            goalKind: rule.goalKind,
            priority: rule.priority,
            targetMetric: rule.target.metric,
            targetMinimumCount: rule.target.minimumCount,
            recoveryPriority: rule.recoveryPriority
          }
        }
      ];
    });
  }

  private resolveFocusBoundary(
    focus: ResilienceFocusRule,
    bounds: CityBounds,
    parksById: ReadonlyMap<string, ParkPatch>,
    roadsById: ReadonlyMap<string, RoadSegment>,
    waterwaysById: ReadonlyMap<string, Waterway>
  ): ResilienceGoalPlan['focusBoundary'] | undefined {
    switch (focus.source) {
      case 'city-bounds':
        return rectanglePolygon({ x: 0, z: 0 }, { x: bounds.span, z: bounds.span });
      case 'public-space':
        return parksById.get(focus.publicSpaceId)?.boundary;
      case 'road-corridor': {
        const road = roadsById.get(focus.roadId);

        if (!road) {
          return undefined;
        }

        const width = road.widthMeters + (focus.extraWidthMeters ?? 0);
        const size =
          road.orientation === 'vertical' ? { x: width, z: road.length } : { x: road.length, z: width };

        return rectanglePolygon(road.center, size);
      }
      case 'waterway-buffer': {
        const waterway = waterwaysById.get(focus.waterwayId);

        if (!waterway) {
          return undefined;
        }

        return rectanglePolygon(waterway.center, {
          x: waterway.length,
          z: waterway.width + this.config.blockSize * focus.bufferByBlock
        });
      }
      case 'normalized-zone': {
        const center = {
          x: -bounds.halfSpan + ((focus.minX + focus.maxX) / 2) * bounds.span,
          z: -bounds.halfSpan + ((focus.minZ + focus.maxZ) / 2) * bounds.span
        };
        const size = {
          x: (focus.maxX - focus.minX) * bounds.span,
          z: (focus.maxZ - focus.minZ) * bounds.span
        };

        return rectanglePolygon(center, size);
      }
      default:
        return undefined;
    }
  }
}

function getBoundaryCenter(boundary: NonNullable<ResilienceGoalPlan['focusBoundary']>): ResilienceGoalPlan['focusPoint'] {
  const bounds = getPolygonBounds(boundary);

  return {
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2
  };
}
