import * as THREE from 'three';
import type { CityConfig } from '../../types/city';
import { createOverviewVisualQaCameraPreset, type VisualQaCameraPreset } from './VisualQaCameraPresets';

export class CameraRig {
  static applyOverview(camera: THREE.PerspectiveCamera, config: CityConfig): void {
    this.applyPreset(camera, createOverviewVisualQaCameraPreset(config));
  }

  static applyPreset(camera: THREE.PerspectiveCamera, preset: VisualQaCameraPreset): void {
    camera.position.set(preset.position.x, preset.position.y, preset.position.z);
    camera.lookAt(preset.target.x, preset.target.y, preset.target.z);
    camera.updateProjectionMatrix();
  }
}
