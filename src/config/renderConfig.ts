import * as THREE from 'three';
import type { CityQualityPreset } from '../types/city';

export interface RenderConfig {
  qualityPreset: CityQualityPreset;
  antialias: boolean;
  background: THREE.ColorRepresentation;
  fogColor: THREE.ColorRepresentation;
  fogDensity: number;
  fov: number;
  maxPixelRatio: number;
  near: number;
  far: number;
  shadows: boolean;
}

export const renderConfig: RenderConfig = {
  qualityPreset: 'medium',
  antialias: true,
  background: 0x111820,
  fogColor: 0x9daeb8,
  fogDensity: 0.0019,
  fov: 48,
  maxPixelRatio: 1.75,
  near: 0.1,
  far: 1800,
  shadows: true
};
