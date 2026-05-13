import type {
  BuildingPlan,
  DistrictPlan,
  HazardZonePlan,
  RoadSegment,
  SolarShadingSample,
  TreePlanting,
  UrbanHeatZone,
  WeatherPreset,
  WaterfrontOpenSpace
} from '../../types/city';
import { isPointInsidePolygon, rectanglePolygon } from '../../utils/geometry';

export interface UrbanHeatGeneratorInput {
  readonly districts: readonly DistrictPlan[];
  readonly buildings: readonly BuildingPlan[];
  readonly roads: readonly RoadSegment[];
  readonly hazardZones: readonly HazardZonePlan[];
  readonly solarShadingSamples: readonly SolarShadingSample[];
  readonly trees: readonly TreePlanting[];
  readonly weatherPresets: readonly WeatherPreset[];
  readonly waterfrontOpenSpaces: readonly WaterfrontOpenSpace[];
}

export class UrbanHeatGenerator {
  create(input: UrbanHeatGeneratorInput): UrbanHeatZone[] {
    const activeWeather = input.weatherPresets.find((preset) => preset.active) ?? input.weatherPresets[0];

    return [
      ...this.createDistrictHeatIslands(input, activeWeather.id),
      ...this.createCoolRoofZones(input.buildings, input.solarShadingSamples, activeWeather.id),
      ...this.createCanopyCoolingZones(input.trees, activeWeather.id),
      ...this.createWaterCoolingZones(input.waterfrontOpenSpaces, activeWeather.id),
      ...this.createPublicRouteRiskZones(input.roads, input.solarShadingSamples, input.trees, activeWeather.id)
    ];
  }

  private createDistrictHeatIslands(input: UrbanHeatGeneratorInput, weatherPresetId: string): UrbanHeatZone[] {
    const heatHazardIds = input.hazardZones
      .filter((hazard) => hazard.hazardKind === 'heat-exposure')
      .map((hazard) => hazard.id);

    return input.districts.map((district, index) => {
      const districtBuildings = input.buildings.filter((building) => `district-${building.district}` === district.id);
      const districtTrees = input.trees.filter((tree) => isPointInsidePolygon(tree.center, district.boundary));
      const shadeSamples = input.solarShadingSamples.filter((sample) => isPointInsidePolygon(sample.center, district.boundary));
      const densityScore = getDensityScore(district.density);
      const canopyCooling = roundUnit(districtTrees.reduce((sum, tree) => sum + tree.heatMitigationScore, 0) / Math.max(1, districtTrees.length));
      const shadeCoverage = roundUnit(shadeSamples.reduce((sum, sample) => sum + sample.shadeCoverageRatio, 0) / Math.max(1, shadeSamples.length));
      const coolRoofCoverage = roundUnit(
        districtBuildings.reduce((sum, building) => sum + building.roofGrammar.greenRoof.coverageRatio, 0) /
          Math.max(1, districtBuildings.length)
      );
      const waterCooling = district.primaryUses.includes('water') || district.district === 'waterfront' ? 0.36 : 0;
      const mitigationEffectScore = roundUnit(canopyCooling * 0.42 + shadeCoverage * 0.28 + coolRoofCoverage * 0.2 + waterCooling * 0.1);
      const heatRiskScore = roundUnit(densityScore + (heatHazardIds.length > 0 && district.district === 'downtown' ? 0.08 : 0) - mitigationEffectScore * 0.34);

      return {
        id: `urban-heat-heat-island-${index}`,
        kind: 'urban-heat-zone',
        ownerDomain: 'environment',
        parentId: district.id,
        parentObjectId: district.id,
        name: `${district.id} Heat Island`,
        lod: 'lod0',
        zoneKind: 'heat-island',
        riskLevel: getRiskLevel(heatRiskScore),
        center: getPolygonCenter(district.boundary),
        boundary: district.boundary,
        weatherPresetId,
        daytimeTemperatureDeltaCelsius: roundMetric(1.2 + heatRiskScore * 5.1, 1),
        nightTemperatureDeltaCelsius: roundMetric(0.8 + heatRiskScore * 3.4, 1),
        surfaceAlbedo: roundMetric(0.18 + coolRoofCoverage * 0.22 + waterCooling * 0.18, 2),
        shadeCoverageRatio: shadeCoverage,
        treeCanopyCoolingScore: canopyCooling,
        waterCoolingScore: waterCooling,
        coolRoofCoverageRatio: coolRoofCoverage,
        mitigationEffectScore,
        heatRiskScore,
        routeExposureScore: roundUnit(densityScore * 0.7 + (1 - shadeCoverage) * 0.3),
        references: {
          districtId: district.id,
          buildingIds: districtBuildings.slice(0, 12).map((building) => building.id),
          treeIds: districtTrees.slice(0, 12).map((tree) => tree.id),
          solarShadingSampleIds: shadeSamples.slice(0, 6).map((sample) => sample.id),
          hazardZoneIds: heatHazardIds
        },
        tags: {
          zoneKind: 'heat-island',
          riskLevel: getRiskLevel(heatRiskScore),
          heatRiskScore
        }
      };
    });
  }

  private createCoolRoofZones(
    buildings: readonly BuildingPlan[],
    solarShadingSamples: readonly SolarShadingSample[],
    weatherPresetId: string
  ): UrbanHeatZone[] {
    return buildings
      .filter((building) => building.roofGrammar.greenRoof.enabled || building.roofGrammar.solar.panelCount > 0)
      .sort(
        (a, b) =>
          b.roofGrammar.greenRoof.areaSqM +
            b.roofGrammar.solar.arrayAreaSqM -
            (a.roofGrammar.greenRoof.areaSqM + a.roofGrammar.solar.arrayAreaSqM) ||
          a.id.localeCompare(b.id)
      )
      .slice(0, 4)
      .map((building, index) => {
        const relatedSolar = solarShadingSamples.find((sample) => sample.references.buildingId === building.id);
        const coolRoofCoverage = roundUnit(
          building.roofGrammar.greenRoof.coverageRatio + building.roofGrammar.solar.arrayAreaSqM / Math.max(1, building.roofGrammar.roofPlane.areaSqM) * 0.45
        );
        const mitigationEffectScore = roundUnit(0.32 + coolRoofCoverage * 0.5);
        const heatRiskScore = roundUnit(0.58 - mitigationEffectScore * 0.28);

        return {
          id: `urban-heat-cool-roof-${index}`,
          kind: 'urban-heat-zone',
          ownerDomain: 'environment',
          parentId: building.id,
          parentObjectId: building.id,
          name: `Cool Roof ${index + 1}`,
          lod: 'lod0',
          zoneKind: 'cool-roof',
          riskLevel: getRiskLevel(heatRiskScore),
          center: building.center,
          boundary: building.footprint,
          weatherPresetId,
          daytimeTemperatureDeltaCelsius: roundMetric(0.4 + heatRiskScore * 2.2, 1),
          nightTemperatureDeltaCelsius: roundMetric(0.2 + heatRiskScore * 1.2, 1),
          surfaceAlbedo: roundMetric(0.42 + coolRoofCoverage * 0.28, 2),
          shadeCoverageRatio: relatedSolar?.shadeCoverageRatio ?? 0,
          treeCanopyCoolingScore: 0,
          waterCoolingScore: 0,
          coolRoofCoverageRatio: coolRoofCoverage,
          mitigationEffectScore,
          heatRiskScore,
          routeExposureScore: 0,
          references: {
            buildingIds: [building.id],
            solarShadingSampleIds: relatedSolar ? [relatedSolar.id] : []
          },
          tags: {
            zoneKind: 'cool-roof',
            riskLevel: getRiskLevel(heatRiskScore),
            coolRoofCoverage
          }
        };
      });
  }

  private createCanopyCoolingZones(trees: readonly TreePlanting[], weatherPresetId: string): UrbanHeatZone[] {
    const corridorRoles = ['shade-corridor', 'park-grove', 'waterfront-cooling'] as const;

    return corridorRoles.map((role, index) => {
      const roleTrees = trees
        .filter((tree) => tree.greenCorridorRole === role)
        .sort((a, b) => b.heatMitigationScore - a.heatMitigationScore || a.id.localeCompare(b.id));
      const coolingScore = roundUnit(roleTrees.reduce((sum, tree) => sum + tree.heatMitigationScore, 0) / Math.max(1, roleTrees.length));
      const center = getAveragePoint(roleTrees.slice(0, 12).map((tree) => tree.center));
      const heatRiskScore = roundUnit(0.5 - coolingScore * 0.26);

      return {
        id: `urban-heat-canopy-cooling-${index}`,
        kind: 'urban-heat-zone',
        ownerDomain: 'environment',
        parentId: roleTrees[0]?.id,
        parentObjectId: roleTrees[0]?.id ?? `tree-corridor-${role}`,
        name: `${role} Cooling`,
        lod: 'lod0',
        zoneKind: 'canopy-cooling',
        riskLevel: getRiskLevel(heatRiskScore),
        center,
        boundary: rectanglePolygon(center, { x: 96, z: 96 }),
        weatherPresetId,
        daytimeTemperatureDeltaCelsius: roundMetric(0.3 + heatRiskScore * 1.8, 1),
        nightTemperatureDeltaCelsius: roundMetric(0.2 + heatRiskScore * 0.9, 1),
        surfaceAlbedo: 0.26,
        shadeCoverageRatio: roundUnit(0.42 + coolingScore * 0.38),
        treeCanopyCoolingScore: coolingScore,
        waterCoolingScore: role === 'waterfront-cooling' ? 0.28 : 0,
        coolRoofCoverageRatio: 0,
        mitigationEffectScore: roundUnit(0.38 + coolingScore * 0.44),
        heatRiskScore,
        routeExposureScore: roundUnit(0.34 - coolingScore * 0.16),
        references: {
          treeIds: roleTrees.slice(0, 16).map((tree) => tree.id)
        },
        tags: {
          zoneKind: 'canopy-cooling',
          greenCorridorRole: role,
          coolingScore
        }
      };
    });
  }

  private createWaterCoolingZones(
    openSpaces: readonly WaterfrontOpenSpace[],
    weatherPresetId: string
  ): UrbanHeatZone[] {
    return openSpaces.slice(0, 3).map((openSpace, index) => {
      const waterCoolingScore = roundUnit(0.46 + (openSpace.waterAccessPoint ? 0.16 : 0) + openSpace.comfort.shadeCoverageRatio * 0.22);
      const heatRiskScore = roundUnit(0.48 - waterCoolingScore * 0.22);

      return {
        id: `urban-heat-water-cooling-${index}`,
        kind: 'urban-heat-zone',
        ownerDomain: 'environment',
        parentId: openSpace.id,
        parentObjectId: openSpace.id,
        name: `Water Cooling ${index + 1}`,
        lod: 'lod0',
        zoneKind: 'water-cooling',
        riskLevel: getRiskLevel(heatRiskScore),
        center: openSpace.center,
        boundary: openSpace.boundary,
        weatherPresetId,
        daytimeTemperatureDeltaCelsius: roundMetric(0.2 + heatRiskScore * 1.7, 1),
        nightTemperatureDeltaCelsius: roundMetric(0.1 + heatRiskScore * 0.8, 1),
        surfaceAlbedo: 0.34,
        shadeCoverageRatio: openSpace.comfort.shadeCoverageRatio,
        treeCanopyCoolingScore: roundUnit(openSpace.shadeTreeIds.length * 0.04),
        waterCoolingScore,
        coolRoofCoverageRatio: 0,
        mitigationEffectScore: roundUnit(0.34 + waterCoolingScore * 0.42),
        heatRiskScore,
        routeExposureScore: roundUnit(0.3 - waterCoolingScore * 0.12),
        references: {
          waterfrontOpenSpaceId: openSpace.id,
          treeIds: openSpace.shadeTreeIds
        },
        tags: {
          zoneKind: 'water-cooling',
          waterCoolingScore
        }
      };
    });
  }

  private createPublicRouteRiskZones(
    roads: readonly RoadSegment[],
    solarShadingSamples: readonly SolarShadingSample[],
    trees: readonly TreePlanting[],
    weatherPresetId: string
  ): UrbanHeatZone[] {
    return roads
      .filter((road) => road.hierarchy === 'arterial' || road.hierarchy === 'transit-corridor' || road.hierarchy === 'promenade')
      .slice(0, 2)
      .map((road, index) => {
        const nearbyTrees = trees.filter((tree) => Math.hypot(tree.center.x - road.center.x, tree.center.z - road.center.z) < 90);
        const nearbyShadeSamples = solarShadingSamples.filter((sample) => Math.hypot(sample.center.x - road.center.x, sample.center.z - road.center.z) < 120);
        const shadeCoverage = roundUnit(nearbyShadeSamples.reduce((sum, sample) => sum + sample.shadeCoverageRatio, 0) / Math.max(1, nearbyShadeSamples.length));
        const canopyCooling = roundUnit(nearbyTrees.reduce((sum, tree) => sum + tree.heatMitigationScore, 0) / Math.max(1, nearbyTrees.length));
        const routeExposureScore = roundUnit(0.76 - shadeCoverage * 0.18 - canopyCooling * 0.16);
        const mitigationEffectScore = roundUnit(Math.max(0.24, shadeCoverage * 0.36 + canopyCooling * 0.42));
        const heatRiskScore = roundUnit(routeExposureScore - mitigationEffectScore * 0.18);

        return {
          id: `urban-heat-public-route-risk-${index}`,
          kind: 'urban-heat-zone',
          ownerDomain: 'environment',
          parentId: road.id,
          parentObjectId: road.id,
          name: `Public Route Heat Risk ${index + 1}`,
          lod: 'lod0',
          zoneKind: 'public-route-risk',
          riskLevel: getRiskLevel(heatRiskScore),
          center: road.center,
          boundary: rectanglePolygon(road.center, { x: road.widthMeters + 36, z: Math.max(72, Math.min(180, road.length / 4)) }),
          weatherPresetId,
          daytimeTemperatureDeltaCelsius: roundMetric(1.1 + heatRiskScore * 3.8, 1),
          nightTemperatureDeltaCelsius: roundMetric(0.7 + heatRiskScore * 2.2, 1),
          surfaceAlbedo: 0.16,
          shadeCoverageRatio: shadeCoverage,
          treeCanopyCoolingScore: canopyCooling,
          waterCoolingScore: road.hierarchy === 'promenade' ? 0.28 : 0,
          coolRoofCoverageRatio: 0,
          mitigationEffectScore,
          heatRiskScore,
          routeExposureScore,
          references: {
            roadIds: [road.id],
            treeIds: nearbyTrees.slice(0, 10).map((tree) => tree.id),
            solarShadingSampleIds: nearbyShadeSamples.slice(0, 5).map((sample) => sample.id)
          },
          tags: {
            zoneKind: 'public-route-risk',
            routeExposureScore
          }
        };
      });
  }
}

function getDensityScore(density: DistrictPlan['density']): number {
  switch (density) {
    case 'low':
      return 0.42;
    case 'medium':
      return 0.56;
    case 'high':
      return 0.72;
    case 'super-tall':
      return 0.86;
  }
}

function getRiskLevel(score: number): UrbanHeatZone['riskLevel'] {
  if (score >= 0.82) {
    return 'critical';
  }

  if (score >= 0.68) {
    return 'high';
  }

  if (score >= 0.45) {
    return 'moderate';
  }

  return 'low';
}

function getPolygonCenter(boundary: readonly { readonly x: number; readonly z: number }[]) {
  return getAveragePoint(boundary);
}

function getAveragePoint(points: readonly { readonly x: number; readonly z: number }[]) {
  if (points.length === 0) {
    return { x: 0, z: 0 };
  }

  return {
    x: roundMetric(points.reduce((sum, point) => sum + point.x, 0) / points.length, 2),
    z: roundMetric(points.reduce((sum, point) => sum + point.z, 0) / points.length, 2)
  };
}

function roundUnit(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function roundMetric(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
