import * as THREE from 'three';

export class Viewport {
  constructor(
    private readonly container: HTMLElement,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly renderer: THREE.WebGLRenderer,
    private readonly maxPixelRatio: number
  ) {
    window.addEventListener('resize', this.resize);
  }

  resize = (): void => {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
    this.renderer.setSize(width, height, false);
  };

  dispose(): void {
    window.removeEventListener('resize', this.resize);
  }
}
