import type { DistrictKind } from '../../types/city';
import type { LandUse } from '../data-contracts/cityContracts';

export interface DistrictRule {
  readonly id: DistrictKind;
  readonly name: string;
  readonly densityBand: 'low' | 'medium' | 'high' | 'super-tall';
  readonly primaryUses: readonly LandUse[];
  readonly heightRangeMeters: readonly [number, number];
  readonly matches: (normalizedBlock: { readonly x: number; readonly z: number }) => boolean;
}

export interface PlannedPublicSpace {
  readonly id: string;
  readonly name: string;
  readonly centerBySpacing: { readonly x: number; readonly z: number };
  readonly sizeByBlock: { readonly x: number; readonly z: number };
}

export interface PlannedWaterway {
  readonly id: string;
  readonly name: string;
  readonly centerBySpan: { readonly x: number; readonly z: number };
  readonly lengthBySpan: number;
}

export interface CityBlueprint {
  readonly id: string;
  readonly districtRules: readonly DistrictRule[];
  readonly publicSpaces: readonly PlannedPublicSpace[];
  readonly waterways: readonly PlannedWaterway[];
  readonly treeSpeciesCycle: readonly ('plane' | 'rain-tree' | 'palm' | 'jacaranda')[];
}

export const CITY_BLUEPRINT: CityBlueprint = {
  id: 'detailed-city-v1',
  districtRules: [
    {
      id: 'downtown',
      name: 'Central Business Core',
      densityBand: 'super-tall',
      primaryUses: ['office', 'retail', 'mixed-use', 'hospitality'],
      heightRangeMeters: [36, 92],
      matches: ({ x, z }) => Math.hypot(x - 0.5, z - 0.54) < 0.24
    },
    {
      id: 'waterfront',
      name: 'Waterfront Edge',
      densityBand: 'high',
      primaryUses: ['mixed-use', 'hospitality', 'open-space', 'retail'],
      heightRangeMeters: [18, 58],
      matches: ({ z }) => z < 0.34
    },
    {
      id: 'industrial',
      name: 'Production And Logistics Quarter',
      densityBand: 'medium',
      primaryUses: ['industrial', 'utility', 'office'],
      heightRangeMeters: [10, 34],
      matches: ({ x, z }) => x > 0.68 && z > 0.45
    },
    {
      id: 'civic',
      name: 'Civic And Institutional District',
      densityBand: 'medium',
      primaryUses: ['civic', 'education', 'open-space'],
      heightRangeMeters: [12, 42],
      matches: ({ x, z }) => x < 0.3 && z > 0.58
    },
    {
      id: 'residential',
      name: 'Residential Neighborhoods',
      densityBand: 'medium',
      primaryUses: ['residential', 'retail', 'open-space'],
      heightRangeMeters: [8, 32],
      matches: () => true
    }
  ],
  publicSpaces: [
    {
      id: 'central-park',
      name: 'Central Park',
      centerBySpacing: { x: -0.55, z: 0.2 },
      sizeByBlock: { x: 1.85, z: 1.42 }
    },
    {
      id: 'civic-plaza',
      name: 'Civic Plaza',
      centerBySpacing: { x: 2.45, z: 1.45 },
      sizeByBlock: { x: 1.2, z: 0.88 }
    },
    {
      id: 'riverside-green',
      name: 'Riverside Green',
      centerBySpacing: { x: -2.7, z: -3.0 },
      sizeByBlock: { x: 1.55, z: 0.72 }
    }
  ],
  waterways: [
    {
      id: 'south-river',
      name: 'South River',
      centerBySpan: { x: 0, z: -0.28 },
      lengthBySpan: 1.16
    }
  ],
  treeSpeciesCycle: ['plane', 'rain-tree', 'jacaranda', 'palm']
};
