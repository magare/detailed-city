import type { DistrictKind } from '../../types/city';
import type {
  DistrictDensityGradient,
  DistrictLandmarkTarget,
  DistrictStyleHints,
  DistrictTransitionBuffer,
  DistrictUseMixRule,
  LandUse
} from '../data-contracts/cityContracts';
import {
  CITY_MASTER_PLAN,
  getMasterPlanDistrictForNormalizedBlock,
  type CityMasterPlan
} from './master-plan/masterPlan';
import { CITY_CONSTRAINT_RULES, type ConstraintRule } from './constraints/constraintLayer';

export interface DistrictRule {
  readonly id: DistrictKind;
  readonly name: string;
  readonly densityBand: 'low' | 'medium' | 'high' | 'super-tall';
  readonly primaryUses: readonly LandUse[];
  readonly useMix: readonly DistrictUseMixRule[];
  readonly heightRangeMeters: readonly [number, number];
  readonly densityGradient: DistrictDensityGradient;
  readonly landmarkTargets: readonly DistrictLandmarkTarget[];
  readonly transitionBuffers: readonly DistrictTransitionBuffer[];
  readonly styleHints: DistrictStyleHints;
  readonly allowedStreetProfiles: readonly string[];
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
  readonly masterPlan: CityMasterPlan;
  readonly districtRules: readonly DistrictRule[];
  readonly constraintRules: readonly ConstraintRule[];
  readonly publicSpaces: readonly PlannedPublicSpace[];
  readonly waterways: readonly PlannedWaterway[];
  readonly treeSpeciesCycle: readonly ('plane' | 'rain-tree' | 'palm' | 'jacaranda')[];
}

export const CITY_BLUEPRINT: CityBlueprint = {
  id: 'detailed-city-v1',
  masterPlan: CITY_MASTER_PLAN,
  constraintRules: CITY_CONSTRAINT_RULES,
  districtRules: [
    {
      id: 'downtown',
      name: 'Central Business Core',
      densityBand: 'super-tall',
      primaryUses: ['office', 'retail', 'mixed-use', 'hospitality'],
      useMix: [
        { use: 'office', share: 0.42 },
        { use: 'mixed-use', share: 0.28 },
        { use: 'retail', share: 0.18 },
        { use: 'hospitality', share: 0.12 }
      ],
      heightRangeMeters: [36, 92],
      densityGradient: {
        centerId: 'center-downtown-core',
        coreIntensity: 1,
        edgeIntensity: 0.72,
        heightMultiplierAtCore: 1.12,
        heightMultiplierAtEdge: 0.88
      },
      landmarkTargets: [
        {
          id: 'landmark-target-downtown-skyline',
          landmarkKind: 'skyline-peak',
          targetCount: 3,
          centerId: 'center-downtown-core'
        }
      ],
      transitionBuffers: [
        { adjacentDistrictId: 'district-waterfront', widthBlocks: 1, transitionKind: 'active-edge' },
        { adjacentDistrictId: 'district-industrial', widthBlocks: 1, transitionKind: 'employment-buffer' },
        { adjacentDistrictId: 'district-civic', widthBlocks: 1, transitionKind: 'civic-buffer' },
        { adjacentDistrictId: 'district-residential', widthBlocks: 2, transitionKind: 'mixed-use-buffer' }
      ],
      styleHints: {
        materialPalette: 'downtown-glass-stone',
        facadeRhythm: 'fine-grain',
        roofline: 'tower-stepped',
        publicRealmCharacter: 'active retail streets with high canopy and formal plazas',
        preferredMaterialZones: ['glass', 'stone', 'metal', 'signs']
      },
      allowedStreetProfiles: ['grand-avenue', 'main-street'],
      matches: ({ x, z }) => Math.hypot(x - 0.5, z - 0.54) < 0.24
    },
    {
      id: 'waterfront',
      name: 'Waterfront Edge',
      densityBand: 'high',
      primaryUses: ['mixed-use', 'hospitality', 'open-space', 'retail'],
      useMix: [
        { use: 'mixed-use', share: 0.36 },
        { use: 'hospitality', share: 0.24 },
        { use: 'open-space', share: 0.22 },
        { use: 'retail', share: 0.18 }
      ],
      heightRangeMeters: [18, 58],
      densityGradient: {
        centerId: 'water-edge-south-river-north-bank',
        coreIntensity: 0.82,
        edgeIntensity: 0.68,
        heightMultiplierAtCore: 0.96,
        heightMultiplierAtEdge: 0.82
      },
      landmarkTargets: [
        {
          id: 'landmark-target-waterfront-marker',
          landmarkKind: 'waterfront-marker',
          targetCount: 1,
          centerId: 'water-edge-south-river-north-bank'
        }
      ],
      transitionBuffers: [
        { adjacentDistrictId: 'district-downtown', widthBlocks: 1, transitionKind: 'active-edge' },
        { adjacentDistrictId: 'district-residential', widthBlocks: 1, transitionKind: 'green-buffer' }
      ],
      styleHints: {
        materialPalette: 'waterfront-light-masonry',
        facadeRhythm: 'mid-rise-waterfront',
        roofline: 'green-lowrise',
        publicRealmCharacter: 'continuous promenade with hospitality terraces and shade planting',
        preferredMaterialZones: ['concrete', 'glass', 'foliage', 'water']
      },
      allowedStreetProfiles: ['waterfront-promenade', 'main-street', 'grand-avenue'],
      matches: ({ z }) => z < 0.34
    },
    {
      id: 'industrial',
      name: 'Production And Logistics Quarter',
      densityBand: 'medium',
      primaryUses: ['industrial', 'utility', 'office'],
      useMix: [
        { use: 'industrial', share: 0.58 },
        { use: 'utility', share: 0.24 },
        { use: 'office', share: 0.18 }
      ],
      heightRangeMeters: [10, 34],
      densityGradient: {
        centerId: 'center-industrial-logistics',
        coreIntensity: 0.72,
        edgeIntensity: 0.52,
        heightMultiplierAtCore: 0.9,
        heightMultiplierAtEdge: 0.72
      },
      landmarkTargets: [
        {
          id: 'landmark-target-industrial-stack',
          landmarkKind: 'employment-node',
          targetCount: 2,
          centerId: 'center-industrial-logistics'
        }
      ],
      transitionBuffers: [
        { adjacentDistrictId: 'district-downtown', widthBlocks: 1, transitionKind: 'employment-buffer' },
        { adjacentDistrictId: 'district-residential', widthBlocks: 2, transitionKind: 'green-buffer' }
      ],
      styleHints: {
        materialPalette: 'industrial-brick-metal',
        facadeRhythm: 'industrial-large-bay',
        roofline: 'mechanical-sawtooth',
        publicRealmCharacter: 'wide service edges with durable paving and limited frontage planting',
        preferredMaterialZones: ['brick', 'metal', 'utility', 'asphalt']
      },
      allowedStreetProfiles: ['service-alley', 'main-street', 'grand-avenue'],
      matches: ({ x, z }) => x > 0.68 && z > 0.45
    },
    {
      id: 'civic',
      name: 'Civic And Institutional District',
      densityBand: 'medium',
      primaryUses: ['civic', 'education', 'open-space'],
      useMix: [
        { use: 'civic', share: 0.42 },
        { use: 'education', share: 0.32 },
        { use: 'open-space', share: 0.26 }
      ],
      heightRangeMeters: [12, 42],
      densityGradient: {
        centerId: 'center-civic-campus',
        coreIntensity: 0.76,
        edgeIntensity: 0.54,
        heightMultiplierAtCore: 0.98,
        heightMultiplierAtEdge: 0.78
      },
      landmarkTargets: [
        {
          id: 'landmark-target-civic-marker',
          landmarkKind: 'civic-marker',
          targetCount: 1,
          centerId: 'center-civic-campus'
        }
      ],
      transitionBuffers: [
        { adjacentDistrictId: 'district-downtown', widthBlocks: 1, transitionKind: 'civic-buffer' },
        { adjacentDistrictId: 'district-residential', widthBlocks: 1, transitionKind: 'green-buffer' }
      ],
      styleHints: {
        materialPalette: 'civic-stone-copper',
        facadeRhythm: 'civic-formal',
        roofline: 'civic-cornice',
        publicRealmCharacter: 'formal tree-lined civic rooms with clear ceremonial edges',
        preferredMaterialZones: ['stone', 'metal', 'foliage', 'overlay']
      },
      allowedStreetProfiles: ['main-street', 'grand-avenue', 'residential-street'],
      matches: ({ x, z }) => x < 0.3 && z > 0.58
    },
    {
      id: 'residential',
      name: 'Residential Neighborhoods',
      densityBand: 'medium',
      primaryUses: ['residential', 'retail', 'open-space'],
      useMix: [
        { use: 'residential', share: 0.64 },
        { use: 'retail', share: 0.2 },
        { use: 'open-space', share: 0.16 }
      ],
      heightRangeMeters: [8, 32],
      densityGradient: {
        centerId: 'center-neighborhoods',
        coreIntensity: 0.58,
        edgeIntensity: 0.42,
        heightMultiplierAtCore: 0.86,
        heightMultiplierAtEdge: 0.68
      },
      landmarkTargets: [
        {
          id: 'landmark-target-neighborhood-centers',
          landmarkKind: 'neighborhood-node',
          targetCount: 4,
          centerId: 'center-neighborhoods'
        }
      ],
      transitionBuffers: [
        { adjacentDistrictId: 'district-downtown', widthBlocks: 2, transitionKind: 'mixed-use-buffer' },
        { adjacentDistrictId: 'district-waterfront', widthBlocks: 1, transitionKind: 'green-buffer' },
        { adjacentDistrictId: 'district-industrial', widthBlocks: 2, transitionKind: 'green-buffer' },
        { adjacentDistrictId: 'district-civic', widthBlocks: 1, transitionKind: 'green-buffer' }
      ],
      styleHints: {
        materialPalette: 'residential-brick-foliage',
        facadeRhythm: 'residential-regular',
        roofline: 'flat-varied',
        publicRealmCharacter: 'regular street trees, small retail corners, and calm residential sidewalks',
        preferredMaterialZones: ['brick', 'foliage', 'concrete', 'roof']
      },
      allowedStreetProfiles: ['residential-street', 'main-street'],
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

export function getBlueprintDistrictForNormalizedBlock(normalizedBlock: { readonly x: number; readonly z: number }): DistrictKind {
  const fallbackDistrict = CITY_BLUEPRINT.districtRules.find((rule) => rule.matches(normalizedBlock))?.id ?? 'residential';

  return getMasterPlanDistrictForNormalizedBlock(CITY_BLUEPRINT.masterPlan, normalizedBlock, fallbackDistrict);
}

export function getBlueprintDistrictRule(district: DistrictKind): DistrictRule {
  const rule = CITY_BLUEPRINT.districtRules.find((candidate) => candidate.id === district);

  if (!rule) {
    throw new Error(`Missing blueprint district rule for ${district}.`);
  }

  return rule;
}

export function getBlueprintDistrictHeightMultiplier(
  district: DistrictKind,
  normalizedBlock: { readonly x: number; readonly z: number }
): number {
  const rule = getBlueprintDistrictRule(district);
  const influence =
    CITY_BLUEPRINT.masterPlan.centers.find((center) => center.id === rule.densityGradient.centerId)?.influence ??
    CITY_BLUEPRINT.masterPlan.waterEdges.find((waterEdge) => waterEdge.id === rule.densityGradient.centerId)
      ?.normalizedInfluence;
  const strength = influence ? getInfluenceStrength(normalizedBlock, influence) : 0;

  return (
    rule.densityGradient.heightMultiplierAtEdge +
    (rule.densityGradient.heightMultiplierAtCore - rule.densityGradient.heightMultiplierAtEdge) * strength
  );
}

function getInfluenceStrength(
  point: { readonly x: number; readonly z: number },
  influence: CityMasterPlan['centers'][number]['influence']
): number {
  if (influence.shape === 'radial') {
    const distance = Math.hypot(point.x - influence.center.x, point.z - influence.center.z);
    return clamp01(1 - distance / influence.radius);
  }

  if (point.x < influence.minX || point.x > influence.maxX || point.z < influence.minZ || point.z > influence.maxZ) {
    return 0;
  }

  const center = {
    x: (influence.minX + influence.maxX) / 2,
    z: (influence.minZ + influence.maxZ) / 2
  };
  const halfWidth = Math.max(0.001, (influence.maxX - influence.minX) / 2);
  const halfHeight = Math.max(0.001, (influence.maxZ - influence.minZ) / 2);
  const normalizedDistance = Math.max(Math.abs(point.x - center.x) / halfWidth, Math.abs(point.z - center.z) / halfHeight);

  return clamp01(1 - normalizedDistance);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
