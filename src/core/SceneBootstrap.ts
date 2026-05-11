import * as THREE from 'three';
import type { RenderConfig } from '../config/renderConfig';
import { applyRendererQuality } from '../systems/performance/QualityManager';

export class SceneBootstrap {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;

  constructor(
    private readonly container: HTMLElement,
    config: RenderConfig
  ) {
    this.camera = new THREE.PerspectiveCamera(
      config.fov,
      container.clientWidth / Math.max(container.clientHeight, 1),
      config.near,
      config.far
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: config.antialias,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    applyRendererQuality(this.renderer, config);
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.background = new THREE.Color(config.background);
    this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    this.container.appendChild(this.renderer.domElement);
  }

  dispose(): void {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
