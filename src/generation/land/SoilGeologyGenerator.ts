import type {
  CityId,
  DrainageAssumption,
  FoundationSuitability,
  GroundRiskLevel,
  SoilGeologyKind,
  TunnelDifficulty
} from '../../city/data-contracts/cityContracts';
import type {
  BuildingPlan,
  CityBounds,
  DistrictPlan,
  HazardZonePlan,
  Parcel,
  SoilGeologyZonePlan,
  TopographyZonePlan,
  Waterway
} from '../../types/city';
import { isPointInsidePolygon, polygonsIntersect } from '../../utils/geometry';

export interface SoilGeologyGenerationInput {
  readonly bounds: CityBounds;
  readonly districts: readonly DistrictPlan[];
  readonly parcels: readonly Parcel[];
  readonly buildings: readonly BuildingPlan[];
  readonly topographyZones: readonly TopographyZonePlan[];
  readonly hazardZones: readonly HazardZonePlan[];
  readonly waterways: readonly Waterway[];
}

export interface SoilGeologyGenerationResult {
  readonly soilGeologyZones: SoilGeologyZonePlan[];
  readonly parcels: Parcel[];
  readonly buildings: BuildingPlan[];
}

interface SoilRule {
  readonly soilKind: SoilGeologyKind;
  readonly foundationSuitability: FoundationSuitability;
  readonly bearingCapacityKpa: number;
  readonly settlementRisk: GroundRiskLevel;
  readonly tunnelDifficulty: TunnelDifficulty;
  readonly drainageAssumption: DrainageAssumption;
  readonly permeabilityMillimetersPerHour: number;
  readonly groundwaterDepthMeters: number;
  readonly floodRisk: GroundRiskLevel;
  readonly slopeRisk: GroundRiskLevel;
  readonly liquefactionRisk: GroundRiskLevel;
}

export class SoilGeologyGenerator {
  create(input: SoilGeologyGenerationInput): SoilGeologyGenerationResult {
    const soilGeologyZones = input.districts.map((district) => this.createZone(input, district));

    return {
      soilGeologyZones,
      parcels: input.parcels.map((parcel) => withSoilGeologyZoneIds(parcel, soilGeologyZones, parcel.center)),
      buildings: input.buildings.map((building) => withSoilGeologyZoneIds(building, soilGeologyZones, building.center))
    };
  }

  private createZone(input: SoilGeologyGenerationInput, district: DistrictPlan): SoilGeologyZonePlan {
    const rule = getRuleForDistrict(district.id);
    const parcelIds = input.parcels.filter((parcel) => parcel.districtId === district.id).map((parcel) => parcel.id);
    const buildingIds = input.buildings.filter((building) => building.district === district.district).map((building) => building.id);
    const topographyZoneIds = input.topographyZones
      .filter((zone) => polygonsOverlap(zone.boundary, district.boundary))
      .map((zone) => zone.id);
    const hazardZoneIds = input.hazardZones
      .filter((hazard) => polygonsOverlap(hazard.boundary, district.boundary))
      .map((hazard) => hazard.id);
    const contaminationHazardIds = input.hazardZones
      .filter((hazard) => hazard.hazardKind === 'contamination' && hazardZoneIds.includes(hazard.id))
      .map((hazard) => hazard.id);
    const hasFloodHazard = input.hazardZones.some(
      (hazard) => hazard.hazardKind === 'flood-plain' && hazardZoneIds.includes(hazard.id)
    );
    const slopeHazards = input.hazardZones.filter(
      (hazard) => hazard.hazardKind === 'landslide-risk' && hazardZoneIds.includes(hazard.id)
    );
    const river = input.waterways[0];
    const districtCenter = getBoundaryCenter(district.boundary);
    const nearWaterway = river ? Math.abs(districtCenter.z - river.center.z) <= river.width + 140 : false;
    const soilKind = nearWaterway && rule.soilKind === 'sandy-loam' ? 'alluvial-silt' : rule.soilKind;
    const drainageAssumption = hasFloodHazard ? 'dewatering-required' : rule.drainageAssumption;
    const floodRisk = hasFloodHazard ? 'high' : rule.floodRisk;
    const slopeRisk = slopeHazards.length > 0 ? 'high' : rule.slopeRisk;
    const contaminationStatus = contaminationHazardIds.length > 0 ? 'watch' : 'clean';
    const remediationRequired = contaminationHazardIds.length > 0 && rule.foundationSuitability === 'restricted-remediation';

    return {
      id: `soil-geology-zone-${soilKind}-${district.district}`,
      kind: 'soil-geology-zone',
      ownerDomain: 'land',
      lod: 'lod0',
      name: `${district.name ?? district.id} Soil And Geology`,
      soilKind,
      center: districtCenter,
      boundary: district.boundary,
      districtIds: [district.id],
      topographyZoneIds,
      hazardZoneIds,
      parcelIds,
      buildingIds,
      foundationSuitability: rule.foundationSuitability,
      bearingCapacityKpa: rule.bearingCapacityKpa,
      settlementRisk: rule.settlementRisk,
      tunnelDifficulty: rule.tunnelDifficulty,
      drainageAssumption,
      permeabilityMillimetersPerHour: rule.permeabilityMillimetersPerHour,
      groundwaterDepthMeters: hasFloodHazard ? Math.min(rule.groundwaterDepthMeters, 2.2) : rule.groundwaterDepthMeters,
      contamination: {
        status: contaminationStatus,
        hazardZoneIds: contaminationHazardIds,
        remediationRequired
      },
      groundRisk: {
        overall: maxRisk([rule.settlementRisk, floodRisk, slopeRisk, rule.liquefactionRisk, remediationRequired ? 'high' : 'low']),
        flood: floodRisk,
        slope: slopeRisk,
        liquefaction: rule.liquefactionRisk
      },
      tags: {
        soilKind,
        foundationSuitability: rule.foundationSuitability,
        tunnelDifficulty: rule.tunnelDifficulty,
        drainageAssumption
      }
    };
  }
}

function withSoilGeologyZoneIds<T extends { readonly soilGeologyZoneIds?: readonly CityId[] }>(
  object: T,
  zones: readonly SoilGeologyZonePlan[],
  center: { readonly x: number; readonly z: number }
): T {
  const soilGeologyZoneIds = zones
    .filter((zone) => isPointInsidePolygon(center, zone.boundary))
    .map((zone) => zone.id);

  return {
    ...object,
    soilGeologyZoneIds
  };
}

function getRuleForDistrict(districtId: CityId): SoilRule {
  if (districtId === 'district-downtown') {
    return {
      soilKind: 'shallow-bedrock',
      foundationSuitability: 'mat-foundation',
      bearingCapacityKpa: 420,
      settlementRisk: 'low',
      tunnelDifficulty: 'high',
      drainageAssumption: 'moderate-infiltration',
      permeabilityMillimetersPerHour: 14,
      groundwaterDepthMeters: 6.8,
      floodRisk: 'medium',
      slopeRisk: 'low',
      liquefactionRisk: 'low'
    };
  }
  if (districtId === 'district-waterfront') {
    return {
      soilKind: 'waterfront-clay',
      foundationSuitability: 'pile-foundation',
      bearingCapacityKpa: 150,
      settlementRisk: 'high',
      tunnelDifficulty: 'restricted',
      drainageAssumption: 'dewatering-required',
      permeabilityMillimetersPerHour: 4,
      groundwaterDepthMeters: 1.8,
      floodRisk: 'high',
      slopeRisk: 'medium',
      liquefactionRisk: 'high'
    };
  }
  if (districtId === 'district-industrial') {
    return {
      soilKind: 'contaminated-fill',
      foundationSuitability: 'restricted-remediation',
      bearingCapacityKpa: 190,
      settlementRisk: 'medium',
      tunnelDifficulty: 'high',
      drainageAssumption: 'poor-drainage',
      permeabilityMillimetersPerHour: 8,
      groundwaterDepthMeters: 3.4,
      floodRisk: 'medium',
      slopeRisk: 'low',
      liquefactionRisk: 'medium'
    };
  }
  if (districtId === 'district-civic') {
    return {
      soilKind: 'engineered-fill',
      foundationSuitability: 'mat-foundation',
      bearingCapacityKpa: 260,
      settlementRisk: 'low',
      tunnelDifficulty: 'medium',
      drainageAssumption: 'moderate-infiltration',
      permeabilityMillimetersPerHour: 18,
      groundwaterDepthMeters: 4.6,
      floodRisk: 'low',
      slopeRisk: 'low',
      liquefactionRisk: 'low'
    };
  }

  return {
    soilKind: 'sandy-loam',
    foundationSuitability: 'shallow-spread',
    bearingCapacityKpa: 220,
    settlementRisk: 'low',
    tunnelDifficulty: 'low',
    drainageAssumption: 'free-draining',
    permeabilityMillimetersPerHour: 35,
    groundwaterDepthMeters: 5.2,
    floodRisk: 'low',
    slopeRisk: 'medium',
    liquefactionRisk: 'low'
  };
}

function polygonsOverlap(first: readonly { readonly x: number; readonly z: number }[], second: readonly { readonly x: number; readonly z: number }[]): boolean {
  return first.length >= 3 && second.length >= 3 && polygonsIntersect(first, second);
}

function getBoundaryCenter(boundary: readonly { readonly x: number; readonly z: number }[]): { readonly x: number; readonly z: number } {
  const count = Math.max(1, boundary.length);

  return {
    x: Number((boundary.reduce((sum, point) => sum + point.x, 0) / count).toFixed(2)),
    z: Number((boundary.reduce((sum, point) => sum + point.z, 0) / count).toFixed(2))
  };
}

function maxRisk(levels: readonly GroundRiskLevel[]): GroundRiskLevel {
  const order: Record<GroundRiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3
  };

  return levels.reduce((maxLevel, level) => (order[level] > order[maxLevel] ? level : maxLevel), 'low');
}
