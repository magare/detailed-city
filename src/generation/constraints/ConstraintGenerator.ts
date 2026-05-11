import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import type { ConstraintRule } from '../../city/blueprint/constraints/constraintLayer';
import type { CityBounds, CityConfig, ConstraintPlan, ParkPatch, RoadSegment, Waterway } from '../../types/city';
import { rectanglePolygon } from '../../utils/geometry';

export interface ConstraintGeneratorInput {
  readonly bounds: CityBounds;
  readonly parks: readonly ParkPatch[];
  readonly waterways: readonly Waterway[];
  readonly roads: readonly RoadSegment[];
}

export class ConstraintGenerator {
  constructor(private readonly config: CityConfig) {}

  create(input: ConstraintGeneratorInput): ConstraintPlan[] {
    const parksById = new Map(input.parks.map((park) => [park.id, park]));
    const waterwaysById = new Map(input.waterways.map((waterway) => [waterway.id, waterway]));
    const roadsById = new Map(input.roads.map((road) => [road.id, road]));

    return CITY_BLUEPRINT.constraintRules.flatMap((rule) => {
      const boundary = this.resolveBoundary(rule, input.bounds, parksById, waterwaysById, roadsById);

      if (!boundary) {
        return [];
      }

      return [
        {
          id: rule.id,
          kind: 'constraint',
          ownerDomain: 'blueprint',
          name: rule.name,
          lod: 'lod0',
          constraintKind: rule.constraintKind,
          priority: rule.priority,
          description: rule.description,
          boundary,
          affectedObjectKinds: [...rule.affectedObjectKinds],
          prohibitedObjectKinds: [...rule.prohibitedObjectKinds],
          requiredObjectIds: [...rule.requiredObjectIds],
          relatedObjectIds: [...rule.relatedObjectIds],
          minSetbackMeters: rule.minSetbackMeters,
          minClearanceMeters: rule.minClearanceMeters,
          maxHeightMeters: rule.maxHeightMeters,
          tags: {
            constraintKind: rule.constraintKind,
            priority: rule.priority,
            affectedKinds: rule.affectedObjectKinds.join(','),
            prohibitedKinds: rule.prohibitedObjectKinds.join(','),
            relatedObjectCount: rule.relatedObjectIds.length
          }
        }
      ];
    });
  }

  private resolveBoundary(
    rule: ConstraintRule,
    bounds: CityBounds,
    parksById: ReadonlyMap<string, ParkPatch>,
    waterwaysById: ReadonlyMap<string, Waterway>,
    roadsById: ReadonlyMap<string, RoadSegment>
  ): ConstraintPlan['boundary'] | undefined {
    switch (rule.geometry.source) {
      case 'city-bounds':
        return rectanglePolygon({ x: 0, z: 0 }, { x: bounds.span, z: bounds.span });
      case 'public-space':
        return parksById.get(rule.geometry.publicSpaceId)?.boundary;
      case 'waterway-buffer': {
        const waterway = waterwaysById.get(rule.geometry.waterwayId);

        if (!waterway) {
          return undefined;
        }

        return rectanglePolygon(waterway.center, {
          x: waterway.length,
          z: waterway.width + this.config.blockSize * rule.geometry.bufferByBlock
        });
      }
      case 'road-corridor': {
        const road = roadsById.get(rule.geometry.roadId);

        if (!road) {
          return undefined;
        }

        const width = road.widthMeters + (rule.geometry.extraWidthMeters ?? 0);
        const size =
          road.orientation === 'vertical' ? { x: width, z: road.length } : { x: road.length, z: width };

        return rectanglePolygon(road.center, size);
      }
      case 'normalized-zone': {
        const center = {
          x: -bounds.halfSpan + ((rule.geometry.minX + rule.geometry.maxX) / 2) * bounds.span,
          z: -bounds.halfSpan + ((rule.geometry.minZ + rule.geometry.maxZ) / 2) * bounds.span
        };
        const size = {
          x: (rule.geometry.maxX - rule.geometry.minX) * bounds.span,
          z: (rule.geometry.maxZ - rule.geometry.minZ) * bounds.span
        };

        return rectanglePolygon(center, size);
      }
      default:
        return undefined;
    }
  }
}
