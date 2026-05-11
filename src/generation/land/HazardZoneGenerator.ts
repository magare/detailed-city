import type {
  CityId,
  CityObjectKind,
  HazardMitigationKind,
  HazardSeverity,
  HazardZoneKind,
  Point2D,
  Polygon2D
} from '../../city/data-contracts/cityContracts';
import type { CityBounds, ConstraintPlan, HazardZonePlan, RoadSegment, Waterway, ZoningDistrictPlan } from '../../types/city';
import { rectanglePolygon } from '../../utils/geometry';

export interface HazardZoneGeneratorInput {
  readonly bounds: CityBounds;
  readonly constraints: readonly ConstraintPlan[];
  readonly roads: readonly RoadSegment[];
  readonly waterways: readonly Waterway[];
  readonly zoningDistricts: readonly ZoningDistrictPlan[];
}

interface HazardZoneSeed {
  readonly slug: string;
  readonly hazardKind: HazardZoneKind;
  readonly severity: HazardSeverity;
  readonly name: string;
  readonly description: string;
  readonly boundary: Polygon2D;
  readonly affectedObjectKinds: readonly CityObjectKind[];
  readonly prohibitedObjectKinds: readonly CityObjectKind[];
  readonly mitigationKinds: readonly HazardMitigationKind[];
  readonly relatedConstraintIds: readonly CityId[];
  readonly relatedWaterwayIds: readonly CityId[];
  readonly relatedZoningDistrictIds: readonly CityId[];
  readonly relatedRoadIds: readonly CityId[];
}

export class HazardZoneGenerator {
  create(input: HazardZoneGeneratorInput): HazardZonePlan[] {
    const river = input.waterways[0];
    const waterfrontZoning = findZoning(input.zoningDistricts, 'zoning-district-waterfront');
    const industrialZoning = findZoning(input.zoningDistricts, 'zoning-district-industrial');
    const downtownZoning = findZoning(input.zoningDistricts, 'zoning-district-downtown');
    const civicZoning = findZoning(input.zoningDistricts, 'zoning-district-civic');
    const floodConstraintIds = filterConstraintIds(input.constraints, ['hazard-buffer', 'waterfront-buffer']);
    const restrictedConstraintIds = filterConstraintIds(input.constraints, ['no-build-zone', 'emergency-access-corridor']);
    const eastArterial = input.roads.find((road) => road.id === 'road-v-9');
    const civicRoad = input.roads.find((road) => road.id === 'road-h-5');

    const seeds: HazardZoneSeed[] = [
      {
        slug: 'south-river-flood-plain',
        hazardKind: 'flood-plain',
        severity: 'high',
        name: 'South River Flood Plain',
        description: 'Primary river flood exposure surface used by waterfront, parcel, and building mitigation checks.',
        boundary: rectanglePolygon(river.center, { x: river.length, z: river.width + 70 }),
        affectedObjectKinds: ['parcel', 'building', 'waterfront-edge', 'road-segment'],
        prohibitedObjectKinds: [],
        mitigationKinds: ['flood-proofing', 'setback'],
        relatedConstraintIds: floodConstraintIds,
        relatedWaterwayIds: [river.id],
        relatedZoningDistrictIds: optionalId(waterfrontZoning),
        relatedRoadIds: input.roads.filter((road) => road.orientation === 'vertical' && Math.abs(road.center.x) <= 260).map((road) => road.id)
      },
      {
        slug: 'south-river-floodway-restricted',
        hazardKind: 'restricted-area',
        severity: 'critical',
        name: 'South River Floodway Restricted Area',
        description: 'Open-water floodway where permanent parcels and buildings are prohibited.',
        boundary: river.boundary,
        affectedObjectKinds: ['parcel', 'building', 'waterfront-edge'],
        prohibitedObjectKinds: ['parcel', 'building'],
        mitigationKinds: ['access-control', 'setback'],
        relatedConstraintIds: floodConstraintIds,
        relatedWaterwayIds: [river.id],
        relatedZoningDistrictIds: optionalId(waterfrontZoning),
        relatedRoadIds: []
      },
      {
        slug: 'downtown-heat-island',
        hazardKind: 'heat-exposure',
        severity: 'medium',
        name: 'Downtown Heat Exposure',
        description: 'Dense core heat exposure zone consumed by future cooling, public-realm, and emergency rules.',
        boundary: downtownZoning?.boundary ?? normalizedBoundary(input.bounds, 0.34, 0.66, 0.33, 0.64),
        affectedObjectKinds: ['parcel', 'building', 'park', 'road-segment'],
        prohibitedObjectKinds: [],
        mitigationKinds: ['cooling-canopy'],
        relatedConstraintIds: [],
        relatedWaterwayIds: [],
        relatedZoningDistrictIds: optionalId(downtownZoning),
        relatedRoadIds: civicRoad ? [civicRoad.id] : []
      },
      {
        slug: 'industrial-contamination-watch',
        hazardKind: 'contamination',
        severity: 'high',
        name: 'Industrial Contamination Watch',
        description: 'Industrial land contamination watch area for future remediation and utility placement checks.',
        boundary: industrialZoning?.boundary ?? normalizedBoundary(input.bounds, 0.7, 0.95, 0.58, 0.9),
        affectedObjectKinds: ['parcel', 'building', 'utility-node', 'utility-edge'],
        prohibitedObjectKinds: [],
        mitigationKinds: ['remediation', 'access-control'],
        relatedConstraintIds: [],
        relatedWaterwayIds: [],
        relatedZoningDistrictIds: optionalId(industrialZoning),
        relatedRoadIds: eastArterial ? [eastArterial.id] : []
      },
      {
        slug: 'east-bluff-landslide-risk',
        hazardKind: 'landslide-risk',
        severity: 'medium',
        name: 'East Bluff Landslide Risk',
        description: 'Edge-of-city slope risk zone reserved for topography and emergency route validation.',
        boundary: normalizedBoundary(input.bounds, 0.985, 0.995, 0.02, 0.09),
        affectedObjectKinds: ['parcel', 'building', 'road-segment'],
        prohibitedObjectKinds: ['building'],
        mitigationKinds: ['slope-stabilization', 'setback'],
        relatedConstraintIds: [],
        relatedWaterwayIds: [],
        relatedZoningDistrictIds: [],
        relatedRoadIds: []
      },
      {
        slug: 'civic-security-restricted-area',
        hazardKind: 'restricted-area',
        severity: 'medium',
        name: 'Civic Security Restricted Area',
        description: 'Civic operations restricted area that future emergency, access-control, and event cards can consume.',
        boundary: civicZoning?.boundary ?? normalizedBoundary(input.bounds, 0.38, 0.56, 0.6, 0.82),
        affectedObjectKinds: ['parcel', 'building', 'road-segment'],
        prohibitedObjectKinds: [],
        mitigationKinds: ['access-control'],
        relatedConstraintIds: restrictedConstraintIds,
        relatedWaterwayIds: [],
        relatedZoningDistrictIds: optionalId(civicZoning),
        relatedRoadIds: civicRoad ? [civicRoad.id] : []
      }
    ];

    return seeds.map((seed) => ({
      id: `hazard-zone-${seed.hazardKind}-${seed.slug}`,
      kind: 'hazard-zone',
      ownerDomain: 'land',
      name: seed.name,
      lod: 'lod0',
      hazardKind: seed.hazardKind,
      severity: seed.severity,
      description: seed.description,
      boundary: seed.boundary,
      focusPoint: getBoundaryCenter(seed.boundary),
      affectedObjectKinds: seed.affectedObjectKinds,
      prohibitedObjectKinds: seed.prohibitedObjectKinds,
      mitigationKinds: seed.mitigationKinds,
      relatedConstraintIds: seed.relatedConstraintIds,
      relatedWaterwayIds: seed.relatedWaterwayIds,
      relatedZoningDistrictIds: seed.relatedZoningDistrictIds,
      relatedRoadIds: seed.relatedRoadIds,
      requiresMitigation: seed.mitigationKinds.length > 0,
      tags: {
        hazardKind: seed.hazardKind,
        severity: seed.severity,
        mitigationCount: seed.mitigationKinds.length,
        prohibitedKinds: seed.prohibitedObjectKinds.join(',')
      }
    }));
  }
}

function findZoning(
  zoningDistricts: readonly ZoningDistrictPlan[],
  zoningDistrictId: CityId
): ZoningDistrictPlan | undefined {
  return zoningDistricts.find((zoning) => zoning.id === zoningDistrictId);
}

function filterConstraintIds(constraints: readonly ConstraintPlan[], constraintKinds: readonly string[]): CityId[] {
  return constraints
    .filter((constraint) => constraintKinds.includes(constraint.constraintKind))
    .map((constraint) => constraint.id);
}

function optionalId(object: { readonly id: CityId } | undefined): CityId[] {
  return object ? [object.id] : [];
}

function normalizedBoundary(
  bounds: CityBounds,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number
): Polygon2D {
  const center = {
    x: -bounds.halfSpan + ((minX + maxX) / 2) * bounds.span,
    z: -bounds.halfSpan + ((minZ + maxZ) / 2) * bounds.span
  };
  const size = {
    x: (maxX - minX) * bounds.span,
    z: (maxZ - minZ) * bounds.span
  };

  return rectanglePolygon(center, size);
}

function getBoundaryCenter(boundary: Polygon2D): Point2D {
  const x = boundary.reduce((sum, point) => sum + point.x, 0) / boundary.length;
  const z = boundary.reduce((sum, point) => sum + point.z, 0) / boundary.length;

  return { x, z };
}
