import type { CityConfig } from '../types/city';

export const cityConfig: CityConfig = {
  seed: 'detailed-city-v1',
  qualityPreset: 'medium',
  gridSize: 12,
  blockSize: 36,
  roadWidth: 8,
  waterwayWidth: 28,
  density: {
    cityDensity: 0.72,
    trafficDensity: 0.42,
    propDensity: 0.68,
    treeDensity: 0.62
  },
  building: {
    minHeight: 8,
    maxHeight: 92,
    setback: 3
  },
  districts: {
    downtown: {
      density: 0.95,
      heightBias: 1,
      lotSplit: 3
    },
    residential: {
      density: 0.55,
      heightBias: 0.36,
      lotSplit: 2
    },
    industrial: {
      density: 0.68,
      heightBias: 0.42,
      lotSplit: 2
    },
    waterfront: {
      density: 0.75,
      heightBias: 0.56,
      lotSplit: 2
    },
    civic: {
      density: 0.62,
      heightBias: 0.48,
      lotSplit: 2
    }
  }
};
