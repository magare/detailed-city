import * as THREE from 'three';
import type { RenderConfig } from '../../config/renderConfig';

export function applyRendererQuality(
  renderer: THREE.WebGLRenderer,
  config: Pick<RenderConfig, 'maxPixelRatio' | 'shadows'>
): void {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.maxPixelRatio));
  renderer.shadowMap.enabled = config.shadows;
}
