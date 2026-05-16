import type {
  CityId,
  Point2D,
  Polygon2D,
  WindComfortRiskLevel,
  WindComfortZoneKind
} from '../../city/data-contracts/cityContracts';
import type {
  BuildingPlan,
  ParkPatch,
  PlazaZone,
  RoadSegment,
  SolarShadingSample,
  TreePlanting,
  Waterway,
  WeatherPreset,
  WindComfortZone,
  WaterfrontOpenSpace
} from '../../types/city';
import { rectanglePolygon } from '../../utils/geometry';

export interface WindComfortGeneratorInput {
  readonly buildings: readonly BuildingPlan[];
  readonly roads: readonly RoadSegment[];
  readonly parks: readonly ParkPatch[];
  readonly plazaZones: readonly PlazaZone[];
  readonly waterfrontOpenSpaces: readonly WaterfrontOpenSpace[];
  readonly waterways: readonly Waterway[];
  readonly trees: readonly TreePlanting[];
  readonly solarShadingSamples: readonly SolarShadingSample[];
  readonly weatherPresets: readonly WeatherPreset[];
}

interface WindZoneSeed {
  readonly id: CityId;
  readonly zoneKind: WindComfortZoneKind;
  readonly parentObjectId: CityId;
  readonly name: string;
  readonly center: Point2D;
  readonly boundary: Polygon2D;
  readonly accelerationFactor: number;
  readonly shelterFactor: number;
  readonly downdraftRiskScore: number;
  readonly waterfrontExposureScore: number;
  readonly references: WindComfortZone['references'];
}

const PREVAILING_WIND_DEGREES = 245;

export class WindComfortGenerator {
  create(input: WindComfortGeneratorInput): WindComfortZone[] {
    const activeWeather = input.weatherPresets.find((preset) => preset.active) ?? input.weatherPresets[0];
    const weatherPresetId = activeWeather?.id ?? 'weather-preset-coastal-clear';
    const baseWindSpeedKph = activeWeather?.windSpeedKph ?? 12;
    const seeds = [
      ...createWindCorridors(input.roads),
      ...createDowndraftRiskZones(input.buildings),
      ...createBridgeEffectZones(input.waterways),
      ...createWaterfrontExposureZones(input.waterfrontOpenSpaces),
      ...createShelteredAreas(input.parks, input.plazaZones, input.trees, input.solarShadingSamples),
      ...createPublicSpaceComfortZones(input.plazaZones, input.waterfrontOpenSpaces, input.solarShadingSamples)
    ];

    return seeds
      .map((seed) => createZone(seed, weatherPresetId, baseWindSpeedKph))
      .sort((first, second) => first.id.localeCompare(second.id));
  }
}

function createWindCorridors(roads: readonly RoadSegment[]): WindZoneSeed[] {
  return roads
    .filter((road) => road.hierarchy === 'arterial' || road.hierarchy === 'transit-corridor' || road.hierarchy === 'promenade')
    .sort((first, second) => second.length - first.length || first.id.localeCompare(second.id))
    .slice(0, 4)
    .map((road, index) => {
      const corridorLength = Math.max(90, Math.min(280, road.length / 3));
      const corridorWidth = road.widthMeters + 34;
      const accelerationFactor = 1.42 +
        (road.hierarchy === 'transit-corridor' ? 0.34 : 0) +
        (road.hierarchy === 'promenade' ? 0.26 : 0) +
        (road.orientation === 'vertical' ? 0.12 : 0);

      return {
        id: `wind-comfort-wind-corridor-${index}`,
        zoneKind: 'wind-corridor',
        parentObjectId: road.id,
        name: `Wind Corridor ${index + 1}`,
        center: road.center,
        boundary: rectanglePolygon(road.center, {
          x: road.orientation === 'horizontal' ? corridorLength : corridorWidth,
          z: road.orientation === 'horizontal' ? corridorWidth : corridorLength
        }),
        accelerationFactor,
        shelterFactor: road.hierarchy === 'promenade' ? 0.2 : 0.14,
        downdraftRiskScore: 0.18,
        waterfrontExposureScore: road.hierarchy === 'promenade' ? 0.48 : 0.16,
        references: {
          roadIds: [road.id]
        }
      };
    });
}

function createDowndraftRiskZones(buildings: readonly BuildingPlan[]): WindZoneSeed[] {
  return buildings
    .filter((building) => building.heightMeters >= 70)
    .sort((first, second) => second.heightMeters - first.heightMeters || first.id.localeCompare(second.id))
    .slice(0, 5)
    .map((building, index) => {
      const heightFactor = Math.min(1, building.heightMeters / 150);
      const footprintArea = Math.max(1, building.footprintGrammar.footprintAreaSqM);
      const slenderness = Math.min(1, building.heightMeters / Math.sqrt(footprintArea) / 8);
      const downdraftRiskScore = roundUnit(0.48 + heightFactor * 0.34 + slenderness * 0.18);

      return {
        id: `wind-comfort-downdraft-risk-${index}`,
        zoneKind: 'downdraft-risk',
        parentObjectId: building.id,
        name: `Tall Building Downdraft ${index + 1}`,
        center: building.center,
        boundary: rectanglePolygon(building.center, {
          x: Math.max(28, Math.sqrt(footprintArea) * 1.8),
          z: Math.max(28, Math.sqrt(footprintArea) * 1.8)
        }),
        accelerationFactor: roundMetric(1.68 + heightFactor * 0.52 + slenderness * 0.32, 2),
        shelterFactor: roundUnit(building.roofGrammar.greenRoof.coverageRatio * 0.18),
        downdraftRiskScore,
        waterfrontExposureScore: building.district === 'waterfront' ? 0.38 : 0.08,
        references: {
          buildingIds: [building.id]
        }
      };
    });
}

function createBridgeEffectZones(waterways: readonly Waterway[]): WindZoneSeed[] {
  const bridgeCrossings = waterways.flatMap((waterway) =>
    waterway.crossingRefs
      .filter((crossing) => crossing.crossingKind === 'bridge')
      .map((crossing) => ({ waterway, crossing }))
  );

  return bridgeCrossings.slice(0, 5).map(({ waterway, crossing }, index) => ({
    id: `wind-comfort-bridge-effect-${index}`,
    zoneKind: 'bridge-effect',
    parentObjectId: crossing.roadId,
    name: `Bridge Wind Effect ${index + 1}`,
    center: crossing.center,
    boundary: rectanglePolygon(crossing.center, { x: 72, z: Math.max(54, waterway.width + 16) }),
    accelerationFactor: roundMetric(1.82 + Math.max(0, crossing.clearanceMeters - 4) * 0.12, 2),
    shelterFactor: 0.06,
    downdraftRiskScore: 0.22,
    waterfrontExposureScore: 0.66,
    references: {
      roadIds: [crossing.roadId],
      waterwayId: waterway.id,
      waterwayCrossingIds: [crossing.id]
    }
  }));
}

function createWaterfrontExposureZones(openSpaces: readonly WaterfrontOpenSpace[]): WindZoneSeed[] {
  return [...openSpaces]
    .sort(
      (first, second) =>
        Number(Boolean(second.waterAccessPoint)) - Number(Boolean(first.waterAccessPoint)) ||
        second.lengthMeters - first.lengthMeters ||
        first.id.localeCompare(second.id)
    )
    .slice(0, 4)
    .map((openSpace, index) => ({
      id: `wind-comfort-waterfront-exposure-${index}`,
      zoneKind: 'waterfront-exposure',
      parentObjectId: openSpace.id,
      name: `Waterfront Exposure ${index + 1}`,
      center: openSpace.center,
      boundary: openSpace.boundary,
      accelerationFactor: roundMetric(1.64 + (openSpace.waterAccessPoint ? 0.28 : 0) + openSpace.lengthMeters / 520, 2),
      shelterFactor: roundUnit(openSpace.comfort.shadeCoverageRatio * 0.32 + openSpace.railingLengthMeters / 900),
      downdraftRiskScore: 0.08,
      waterfrontExposureScore: roundUnit(0.56 + (openSpace.waterAccessPoint ? 0.18 : 0) + openSpace.widthMeters / 160),
      references: {
        waterfrontOpenSpaceId: openSpace.id,
        treeIds: openSpace.shadeTreeIds
      }
    }));
}

function createShelteredAreas(
  parks: readonly ParkPatch[],
  plazaZones: readonly PlazaZone[],
  trees: readonly TreePlanting[],
  solarShadingSamples: readonly SolarShadingSample[]
): WindZoneSeed[] {
  const parkSeeds = parks.slice(0, 2).map((park, index) => {
    const nearbyTrees = getNearbyTrees(trees, park.center, Math.max(60, Math.max(park.size.x, park.size.z) / 2));
    const relatedSolar = solarShadingSamples.find((sample) => sample.references.parkId === park.id);
    const shelterFactor = roundUnit(0.36 + nearbyTrees.length * 0.035 + (relatedSolar?.shadeCoverageRatio ?? 0) * 0.28);

    return {
      id: `wind-comfort-sheltered-area-${index}`,
      zoneKind: 'sheltered-area' as const,
      parentObjectId: park.id,
      name: `Park Wind Shelter ${index + 1}`,
      center: park.center,
      boundary: rectanglePolygon(park.center, { x: Math.max(42, park.size.x * 0.58), z: Math.max(42, park.size.z * 0.58) }),
      accelerationFactor: roundMetric(0.78 + (relatedSolar?.glareRisk === 'high' ? 0.08 : 0), 2),
      shelterFactor,
      downdraftRiskScore: 0.04,
      waterfrontExposureScore: 0.1,
      references: {
        parkId: park.id,
        treeIds: nearbyTrees.slice(0, 12).map((tree) => tree.id),
        solarShadingSampleIds: relatedSolar ? [relatedSolar.id] : []
      }
    };
  });
  const plazaSeeds = plazaZones
    .filter((zone) => zone.zoneKind === 'shade' || zone.zoneKind === 'seating')
    .slice(0, 2)
    .map((zone, index) => {
      const relatedSolar = solarShadingSamples.find((sample) => sample.references.plazaZoneId === zone.id);

      return {
        id: `wind-comfort-sheltered-area-${index + parkSeeds.length}`,
        zoneKind: 'sheltered-area' as const,
        parentObjectId: zone.id,
        name: `Plaza Wind Shelter ${index + 1}`,
        center: zone.center,
        boundary: rectanglePolygon(zone.center, zone.size),
        accelerationFactor: 0.9,
        shelterFactor: roundUnit(0.42 + zone.shadeCoveragePercent / 180 + zone.capacityPeople / 420),
        downdraftRiskScore: 0.08,
        waterfrontExposureScore: 0.04,
        references: {
          plazaZoneId: zone.id,
          solarShadingSampleIds: relatedSolar ? [relatedSolar.id] : []
        }
      };
    });

  return [...parkSeeds, ...plazaSeeds];
}

function createPublicSpaceComfortZones(
  plazaZones: readonly PlazaZone[],
  openSpaces: readonly WaterfrontOpenSpace[],
  solarShadingSamples: readonly SolarShadingSample[]
): WindZoneSeed[] {
  const plazas = plazaZones.slice(0, 3).map((zone, index) => {
    const relatedSolar = solarShadingSamples.find((sample) => sample.references.plazaZoneId === zone.id);
    const shelterFactor = roundUnit(0.18 + zone.shadeCoveragePercent / 220 + zone.capacityPeople / 520);

    return {
      id: `wind-comfort-public-space-comfort-${index}`,
      zoneKind: 'public-space-comfort' as const,
      parentObjectId: zone.id,
      name: `Public Space Wind Comfort ${index + 1}`,
      center: zone.center,
      boundary: rectanglePolygon(zone.center, zone.size),
      accelerationFactor: roundMetric(1.08 + (zone.zoneKind === 'hardscape' ? 0.18 : 0), 2),
      shelterFactor,
      downdraftRiskScore: zone.activeFrontageIds.length > 0 ? 0.16 : 0.08,
      waterfrontExposureScore: 0.06,
      references: {
        plazaZoneId: zone.id,
        solarShadingSampleIds: relatedSolar ? [relatedSolar.id] : []
      }
    };
  });
  const waterfront = openSpaces.slice(0, 3).map((openSpace, index) => ({
    id: `wind-comfort-public-space-comfort-${index + plazas.length}`,
    zoneKind: 'public-space-comfort' as const,
    parentObjectId: openSpace.id,
    name: `Waterfront Wind Comfort ${index + 1}`,
    center: openSpace.center,
    boundary: openSpace.boundary,
    accelerationFactor: roundMetric(1.18 + (openSpace.waterAccessPoint ? 0.16 : 0), 2),
    shelterFactor: roundUnit(0.2 + openSpace.comfort.shadeCoverageRatio * 0.32 + openSpace.railingLengthMeters / 1000),
    downdraftRiskScore: 0.06,
    waterfrontExposureScore: roundUnit(0.34 + openSpace.widthMeters / 180),
    references: {
      waterfrontOpenSpaceId: openSpace.id,
      treeIds: openSpace.shadeTreeIds
    }
  }));

  return [...plazas, ...waterfront];
}

function createZone(seed: WindZoneSeed, weatherPresetId: CityId, baseWindSpeedKph: number): WindComfortZone {
  const accelerationFactor = roundMetric(seed.accelerationFactor, 2);
  const shelterFactor = roundUnit(seed.shelterFactor);
  const downdraftRiskScore = roundUnit(seed.downdraftRiskScore);
  const waterfrontExposureScore = roundUnit(seed.waterfrontExposureScore);
  const gustWindSpeedKph = roundMetric(
    baseWindSpeedKph * accelerationFactor +
      downdraftRiskScore * 7.2 +
      waterfrontExposureScore * 4.8 -
      shelterFactor * 4.4,
    1
  );
  const riskScore = roundUnit(gustWindSpeedKph / 44 + downdraftRiskScore * 0.18 + waterfrontExposureScore * 0.12 - shelterFactor * 0.2);
  const riskLevel = getRiskLevel(riskScore, gustWindSpeedKph);
  const pedestrianComfortScore = roundUnit(1 - riskScore);

  return {
    id: seed.id,
    kind: 'wind-comfort-zone',
    ownerDomain: 'environment',
    parentId: seed.parentObjectId,
    parentObjectId: seed.parentObjectId,
    name: seed.name,
    lod: 'lod0',
    zoneKind: seed.zoneKind,
    riskLevel,
    center: seed.center,
    boundary: seed.boundary,
    weatherPresetId,
    prevailingWindDegrees: PREVAILING_WIND_DEGREES,
    baseWindSpeedKph,
    gustWindSpeedKph,
    pedestrianComfortScore,
    shelterFactor,
    accelerationFactor,
    downdraftRiskScore,
    waterfrontExposureScore,
    pedestrianWarning: riskLevel === 'windy' || riskLevel === 'hazardous',
    references: seed.references,
    tags: {
      zoneKind: seed.zoneKind,
      riskLevel,
      pedestrianWarning: riskLevel === 'windy' || riskLevel === 'hazardous',
      gustWindSpeedKph
    }
  };
}

function getRiskLevel(riskScore: number, gustWindSpeedKph: number): WindComfortRiskLevel {
  if (riskScore >= 0.82 || gustWindSpeedKph >= 42) {
    return 'hazardous';
  }

  if (riskScore >= 0.58 || gustWindSpeedKph >= 27) {
    return 'windy';
  }

  if (riskScore >= 0.28 || gustWindSpeedKph >= 13) {
    return 'comfortable';
  }

  return 'calm';
}

function getNearbyTrees(
  trees: readonly TreePlanting[],
  center: Point2D,
  radiusMeters: number
): TreePlanting[] {
  return trees
    .filter((tree) => Math.hypot(tree.center.x - center.x, tree.center.z - center.z) <= radiusMeters)
    .sort((first, second) => first.id.localeCompare(second.id));
}

function roundUnit(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function roundMetric(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
