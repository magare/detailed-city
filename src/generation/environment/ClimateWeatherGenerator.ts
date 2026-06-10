import type { WeatherPreset } from '../../types/city';

const WEATHER_PRESETS = [
  {
    id: 'weather-preset-coastal-clear',
    name: 'Coastal Clear',
    presetKind: 'clear',
    season: 'summer',
    active: true,
    cloudCover: 0.18,
    precipitation: 'none',
    precipitationIntensity: 0,
    visibilityMeters: 1450,
    surfaceWetness: 0.04,
    puddleCoverage: 0,
    humidity: 0.58,
    temperatureCelsius: 27,
    windSpeedKph: 13,
    transitionSeconds: 18,
    rendering: {
      backgroundColor: 0x8fb0cd,
      fogColor: 0xb9c8d4,
      fogDensity: 0.0005,
      skyColor: 0x4f83b8,
      skyOpacity: 0.32,
      sunIntensity: 2.7,
      hemisphereIntensity: 0.55,
      fillIntensity: 0.32,
      exposure: 1.0
    },
    simulationHooks: {
      trafficSpeedMultiplier: 1,
      pedestrianComfort: 'comfortable',
      drainageLoad: 'none'
    }
  },
  {
    id: 'weather-preset-humid-clouds',
    name: 'Humid Cloud Cover',
    presetKind: 'cloudy',
    season: 'summer',
    active: false,
    cloudCover: 0.68,
    precipitation: 'none',
    precipitationIntensity: 0,
    visibilityMeters: 1180,
    surfaceWetness: 0.12,
    puddleCoverage: 0.02,
    humidity: 0.78,
    temperatureCelsius: 30,
    windSpeedKph: 9,
    transitionSeconds: 24,
    rendering: {
      backgroundColor: 0x17232a,
      fogColor: 0xa8b5ba,
      fogDensity: 0.0024,
      skyColor: 0x9aaeb6,
      skyOpacity: 0.38,
      sunIntensity: 1.8,
      hemisphereIntensity: 0.62,
      fillIntensity: 0.42,
      exposure: 0.98
    },
    simulationHooks: {
      trafficSpeedMultiplier: 0.98,
      pedestrianComfort: 'humid',
      drainageLoad: 'none'
    }
  },
  {
    id: 'weather-preset-evening-rain',
    name: 'Evening Rain',
    presetKind: 'rain',
    season: 'monsoon',
    active: false,
    cloudCover: 0.84,
    precipitation: 'rain',
    precipitationIntensity: 0.58,
    visibilityMeters: 760,
    surfaceWetness: 0.72,
    puddleCoverage: 0.18,
    humidity: 0.9,
    temperatureCelsius: 24,
    windSpeedKph: 18,
    transitionSeconds: 16,
    rendering: {
      backgroundColor: 0x111920,
      fogColor: 0x8e9ca4,
      fogDensity: 0.0036,
      skyColor: 0x71828c,
      skyOpacity: 0.46,
      sunIntensity: 0.9,
      hemisphereIntensity: 0.5,
      fillIntensity: 0.46,
      exposure: 0.94
    },
    simulationHooks: {
      trafficSpeedMultiplier: 0.86,
      pedestrianComfort: 'reduced-visibility',
      drainageLoad: 'medium'
    }
  },
  {
    id: 'weather-preset-monsoon-burst',
    name: 'Monsoon Burst',
    presetKind: 'monsoon',
    season: 'monsoon',
    active: false,
    cloudCover: 0.96,
    precipitation: 'heavy-rain',
    precipitationIntensity: 0.92,
    visibilityMeters: 520,
    surfaceWetness: 0.94,
    puddleCoverage: 0.34,
    humidity: 0.96,
    temperatureCelsius: 23,
    windSpeedKph: 34,
    transitionSeconds: 10,
    rendering: {
      backgroundColor: 0x0f171d,
      fogColor: 0x798991,
      fogDensity: 0.0052,
      skyColor: 0x60727b,
      skyOpacity: 0.54,
      sunIntensity: 0.55,
      hemisphereIntensity: 0.46,
      fillIntensity: 0.5,
      exposure: 0.9
    },
    simulationHooks: {
      trafficSpeedMultiplier: 0.74,
      pedestrianComfort: 'storm',
      drainageLoad: 'high'
    }
  },
  {
    id: 'weather-preset-morning-fog',
    name: 'Morning Fog',
    presetKind: 'fog',
    season: 'winter',
    active: false,
    cloudCover: 0.52,
    precipitation: 'drizzle',
    precipitationIntensity: 0.18,
    visibilityMeters: 640,
    surfaceWetness: 0.42,
    puddleCoverage: 0.08,
    humidity: 0.88,
    temperatureCelsius: 18,
    windSpeedKph: 5,
    transitionSeconds: 30,
    rendering: {
      backgroundColor: 0x182028,
      fogColor: 0xb5c1c4,
      fogDensity: 0.0044,
      skyColor: 0xaebdc1,
      skyOpacity: 0.5,
      sunIntensity: 1.3,
      hemisphereIntensity: 0.6,
      fillIntensity: 0.4,
      exposure: 0.98
    },
    simulationHooks: {
      trafficSpeedMultiplier: 0.9,
      pedestrianComfort: 'reduced-visibility',
      drainageLoad: 'low'
    }
  }
] as const satisfies readonly Omit<WeatherPreset, 'kind' | 'ownerDomain' | 'lod' | 'tags'>[];

export class ClimateWeatherGenerator {
  create(): WeatherPreset[] {
    return WEATHER_PRESETS.map((preset) => ({
      ...preset,
      kind: 'weather-preset',
      ownerDomain: 'environment',
      lod: 'lod0',
      tags: {
        presetKind: preset.presetKind,
        season: preset.season,
        active: preset.active,
        precipitation: preset.precipitation
      }
    }));
  }
}

export function getActiveWeatherPreset(weatherPresets: readonly WeatherPreset[]): WeatherPreset {
  return weatherPresets.find((preset) => preset.active) ?? weatherPresets[0];
}
