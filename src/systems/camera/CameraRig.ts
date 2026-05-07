import * as THREE from 'three';
import type { CityConfig } from '../../types/city';

export class CameraRig {
  static applyOverview(camera: THREE.PerspectiveCamera, config: CityConfig): void {
    const span = config.gridSize * (config.blockSize + config.roadWidth);
    camera.position.set(span * 0.42, span * 0.58, span * 0.68);
    camera.lookAt(0, 0, 0);
  }
}
