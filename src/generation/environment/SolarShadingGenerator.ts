import type {
  BuildingPlan,
  ParkFeature,
  ParkPatch,
  PlazaZone,
  SolarShadingSample,
  TreePlanting,
  WeatherPreset,
  WaterfrontOpenSpace
} from '../../types/city';

export interface SolarShadingGeneratorInput {
  readonly buildings: readonly BuildingPlan[];
  readonly plazaZones: readonly PlazaZone[];
  readonly parks: readonly ParkPatch[];
  readonly parkFeatures: readonly ParkFeature[];
  readonly waterfrontOpenSpaces: readonly WaterfrontOpenSpace[];
  readonly trees: readonly TreePlanting[];
  readonly weatherPresets: readonly WeatherPreset[];
}

const SUN_PATH = [
  { hour: 8, altitudeDegrees: 21, azimuthDegrees: 91, shadowLengthMultiplier: 2.61, irradianceWattsPerSqM: 390 },
  { hour: 10, altitudeDegrees: 44, azimuthDegrees: 116, shadowLengthMultiplier: 1.04, irradianceWattsPerSqM: 690 },
  { hour: 12, altitudeDegrees: 68, azimuthDegrees: 178, shadowLengthMultiplier: 0.4, irradianceWattsPerSqM: 890 },
  { hour: 14, altitudeDegrees: 55, azimuthDegrees: 238, shadowLengthMultiplier: 0.7, irradianceWattsPerSqM: 780 },
  { hour: 16, altitudeDegrees: 31, azimuthDegrees: 269, shadowLengthMultiplier: 1.66, irradianceWattsPerSqM: 510 }
] as const;

export class SolarShadingGenerator {
  create(input: SolarShadingGeneratorInput): SolarShadingSample[] {
    const activeWeather = input.weatherPresets.find((preset) => preset.active) ?? input.weatherPresets[0];
    const cloudModifier = Math.max(0.52, 1 - activeWeather.cloudCover * 0.36);
    const samples = [
      ...this.createRoofSamples(input.buildings, activeWeather.id, cloudModifier),
      ...this.createPlazaSamples(input.plazaZones, activeWeather.id, cloudModifier),
      ...this.createParkSamples(input.parks, input.parkFeatures, activeWeather.id, cloudModifier),
      ...this.createWaterfrontSamples(input.waterfrontOpenSpaces, input.trees, activeWeather.id, cloudModifier)
    ];

    return samples;
  }

  private createRoofSamples(
    buildings: readonly BuildingPlan[],
    weatherPresetId: string,
    cloudModifier: number
  ): SolarShadingSample[] {
    return buildings
      .filter((building) => building.roofGrammar.solar.panelCount > 0)
      .sort((a, b) => b.roofGrammar.solar.arrayAreaSqM - a.roofGrammar.solar.arrayAreaSqM || a.id.localeCompare(b.id))
      .slice(0, 12)
      .map((building, index) => {
        const solar = building.roofGrammar.solar;
        const roofArea = Math.max(1, building.roofGrammar.roofPlane.usableAreaSqM);
        const roofSuitabilityScore = roundUnit(Math.min(1, solar.arrayAreaSqM / roofArea + building.heightMeters / 240));
        const solarPotentialKwhPerDay = roundMetric(solar.arrayAreaSqM * 4.35 * cloudModifier * roofSuitabilityScore, 2);

        return {
          id: `solar-shading-roof-solar-${index}`,
          kind: 'solar-shading-sample',
          ownerDomain: 'environment',
          parentId: building.id,
          parentObjectId: building.id,
          name: `Roof Solar ${index + 1}`,
          lod: 'lod0',
          sampleKind: 'roof-solar',
          center: building.center,
          analysisRadiusMeters: Math.max(12, Math.round(Math.sqrt(roofArea))),
          weatherPresetId,
          daylightHours: 11.8,
          peakSunHour: 12,
          shadeCoverageRatio: roundUnit(Math.min(0.55, building.heightMeters / 210)),
          comfortScore: roundUnit(0.42 + roofSuitabilityScore * 0.32),
          glareRisk: solar.azimuthDegrees >= 160 && solar.azimuthDegrees <= 210 ? 'medium' : 'low',
          solarPotentialKwhPerDay,
          roofSuitabilityScore,
          sunPath: scaleSunPath(cloudModifier),
          references: {
            buildingId: building.id,
            roofDetailIds: solar.detailIds
          },
          tags: {
            sampleKind: 'roof-solar',
            parentObjectId: building.id,
            solarPotentialKwhPerDay,
            roofSuitabilityScore
          }
        };
      });
  }

  private createPlazaSamples(
    plazaZones: readonly PlazaZone[],
    weatherPresetId: string,
    cloudModifier: number
  ): SolarShadingSample[] {
    return plazaZones.slice(0, 6).map((zone, index) => {
      const shadeCoverageRatio = roundUnit(zone.shadeCoveragePercent / 100);
      const comfortScore = roundUnit(0.38 + shadeCoverageRatio * 0.5 + (zone.zoneKind === 'shade' ? 0.08 : 0));

      return {
        id: `solar-shading-plaza-comfort-${index}`,
        kind: 'solar-shading-sample',
        ownerDomain: 'environment',
        parentId: zone.id,
        parentObjectId: zone.id,
        name: `Plaza Shade ${index + 1}`,
        lod: 'lod0',
        sampleKind: 'plaza-comfort',
        center: zone.center,
        analysisRadiusMeters: Math.max(zone.size.x, zone.size.z),
        weatherPresetId,
        daylightHours: 10.7,
        peakSunHour: 13,
        shadeCoverageRatio,
        comfortScore,
        glareRisk: zone.surface === 'stone-paver' && shadeCoverageRatio < 0.2 ? 'medium' : 'low',
        solarPotentialKwhPerDay: roundMetric(zone.size.x * zone.size.z * 0.03 * cloudModifier, 2),
        roofSuitabilityScore: 0,
        sunPath: scaleSunPath(cloudModifier),
        references: {
          plazaZoneId: zone.id,
          parkFeatureIds: zone.parkFeatureIds
        },
        tags: {
          sampleKind: 'plaza-comfort',
          parentObjectId: zone.id,
          shadeCoverageRatio,
          comfortScore
        }
      };
    });
  }

  private createParkSamples(
    parks: readonly ParkPatch[],
    parkFeatures: readonly ParkFeature[],
    weatherPresetId: string,
    cloudModifier: number
  ): SolarShadingSample[] {
    return parks.slice(0, 3).map((park, index) => {
      const relatedFeatures = parkFeatures.filter((feature) => feature.parkId === park.id);
      const shadeFeatures = relatedFeatures.filter((feature) => feature.featureKind === 'shade');
      const shadeCoverageRatio = roundUnit(Math.min(0.82, 0.18 + shadeFeatures.length * 0.18));

      return {
        id: `solar-shading-park-comfort-${index}`,
        kind: 'solar-shading-sample',
        ownerDomain: 'environment',
        parentId: park.id,
        parentObjectId: park.id,
        name: `Park Shade ${index + 1}`,
        lod: 'lod0',
        sampleKind: 'park-comfort',
        center: park.center,
        analysisRadiusMeters: Math.max(24, Math.round(Math.max(park.size.x, park.size.z) / 2)),
        weatherPresetId,
        daylightHours: 10.9,
        peakSunHour: 13,
        shadeCoverageRatio,
        comfortScore: roundUnit(0.48 + shadeCoverageRatio * 0.42),
        glareRisk: 'low',
        solarPotentialKwhPerDay: roundMetric(relatedFeatures.length * 1.4 * cloudModifier, 2),
        roofSuitabilityScore: 0,
        sunPath: scaleSunPath(cloudModifier),
        references: {
          parkId: park.id,
          parkFeatureIds: relatedFeatures.map((feature) => feature.id)
        },
        tags: {
          sampleKind: 'park-comfort',
          parentObjectId: park.id,
          shadeCoverageRatio
        }
      };
    });
  }

  private createWaterfrontSamples(
    openSpaces: readonly WaterfrontOpenSpace[],
    trees: readonly TreePlanting[],
    weatherPresetId: string,
    cloudModifier: number
  ): SolarShadingSample[] {
    return openSpaces.slice(0, 3).map((openSpace, index) => {
      const shadeCoverageRatio = roundUnit(openSpace.comfort.shadeCoverageRatio);
      const glareRisk = 'high';
      const shadeTrees = openSpace.shadeTreeIds.filter((treeId) => trees.some((tree) => tree.id === treeId));

      return {
        id: `solar-shading-waterfront-comfort-${index}`,
        kind: 'solar-shading-sample',
        ownerDomain: 'environment',
        parentId: openSpace.id,
        parentObjectId: openSpace.id,
        name: `Waterfront Shade ${index + 1}`,
        lod: 'lod0',
        sampleKind: 'waterfront-comfort',
        center: openSpace.center,
        analysisRadiusMeters: Math.max(openSpace.widthMeters, Math.round(openSpace.lengthMeters / 4)),
        weatherPresetId,
        daylightHours: 11.2,
        peakSunHour: 14,
        shadeCoverageRatio,
        comfortScore: roundUnit(0.44 + shadeCoverageRatio * 0.38 + (openSpace.waterAccessPoint ? 0.08 : 0)),
        glareRisk,
        solarPotentialKwhPerDay: roundMetric(openSpace.lengthMeters * openSpace.widthMeters * 0.018 * cloudModifier, 2),
        roofSuitabilityScore: 0,
        sunPath: scaleSunPath(cloudModifier),
        references: {
          waterfrontOpenSpaceId: openSpace.id,
          shadeTreeIds: shadeTrees
        },
        tags: {
          sampleKind: 'waterfront-comfort',
          parentObjectId: openSpace.id,
          shadeCoverageRatio,
          glareRisk
        }
      };
    });
  }
}

function scaleSunPath(cloudModifier: number): SolarShadingSample['sunPath'] {
  return SUN_PATH.map((sample) => ({
    ...sample,
    irradianceWattsPerSqM: Math.round(sample.irradianceWattsPerSqM * cloudModifier)
  }));
}

function roundUnit(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function roundMetric(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}
