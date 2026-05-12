import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import type { DevelopmentPhaseRule } from '../../city/blueprint/phasing/phasingPlan';
import type { Point2D } from '../../city/data-contracts/cityContracts';
import type { CityBounds, DevelopmentPhasePlan } from '../../types/city';
import { rectanglePolygon } from '../../utils/geometry';

export interface PhasingGeneratorInput {
  readonly bounds: CityBounds;
}

export class PhasingGenerator {
  create(input: PhasingGeneratorInput): DevelopmentPhasePlan[] {
    return CITY_BLUEPRINT.phasingPlan.map((rule) => createPhasePlan(rule, input.bounds));
  }
}

function createPhasePlan(rule: DevelopmentPhaseRule, bounds: CityBounds): DevelopmentPhasePlan {
  const center = normalizedZoneCenter(rule.normalizedZone, bounds);
  const size = normalizedZoneSize(rule.normalizedZone, bounds);

  return {
    id: rule.id,
    kind: 'development-phase',
    ownerDomain: 'blueprint',
    lod: 'lod0',
    name: rule.name,
    phaseKind: rule.phaseKind,
    status: rule.status,
    sequence: rule.sequence,
    startYear: rule.startYear,
    targetYear: rule.targetYear,
    focusPoint: center,
    boundary: rectanglePolygon(center, size),
    description: rule.description,
    unlocksAfterPhaseIds: rule.unlocksAfterPhaseIds,
    unlocksObjectIds: rule.unlocksObjectIds,
    temporaryRoadIds: rule.temporaryRoadIds,
    temporaryParkIds: rule.temporaryParkIds,
    closureRoadIds: rule.closureRoadIds,
    masterPlanGrowthBoundaryIds: rule.masterPlanGrowthBoundaryIds,
    operationsHooks: rule.operationsHooks,
    tags: {
      phaseKind: rule.phaseKind,
      status: rule.status,
      sequence: rule.sequence
    }
  };
}

function normalizedZoneCenter(
  zone: DevelopmentPhaseRule['normalizedZone'],
  bounds: CityBounds
): Point2D {
  return {
    x: normalizedToLocal((zone.minX + zone.maxX) / 2, bounds),
    z: normalizedToLocal((zone.minZ + zone.maxZ) / 2, bounds)
  };
}

function normalizedZoneSize(
  zone: DevelopmentPhaseRule['normalizedZone'],
  bounds: CityBounds
): { readonly x: number; readonly z: number } {
  return {
    x: Math.max(1, (zone.maxX - zone.minX) * bounds.span),
    z: Math.max(1, (zone.maxZ - zone.minZ) * bounds.span)
  };
}

function normalizedToLocal(value: number, bounds: CityBounds): number {
  return -bounds.halfSpan + value * bounds.span;
}
