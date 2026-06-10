import * as THREE from 'three';

export class Viewport {
  constructor(
    private readonly container: HTMLElement,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly renderer: THREE.WebGLRenderer,
    private readonly maxPixelRatio: number,
    private readonly onResize?: (width: number, height: number, pixelRatio: number) => void
  ) {
    window.addEventListener('resize', this.resize);
  }

  resize = (): void => {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    const pixelRatio = Math.min(window.devicePixelRatio, this.maxPixelRatio);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.onResize?.(width, height, pixelRatio);
  };

  dispose(): void {
    window.removeEventListener('resize', this.resize);
  }
}
