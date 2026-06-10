import * as THREE from 'three';
import type { Updatable } from '../types/city';

export class RenderLoop {
  private readonly timer = new THREE.Timer();
  private frameId = 0;
  private running = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly updatables: Updatable[],
    private readonly renderFrame?: () => void
  ) {}

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.timer.connect(document);
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  renderOnce(): void {
    this.renderer.info.reset();
    if (this.renderFrame) {
      this.renderFrame();
      return;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.stop();
    this.timer.dispose();
  }

  private tick = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    this.timer.update(timestamp);
    const delta = Math.max(0, Math.min(this.timer.getDelta(), 0.05));
    const elapsed = this.timer.getElapsed();

    for (const updatable of this.updatables) {
      updatable.update(delta, elapsed);
    }

    this.renderer.info.reset();
    if (this.renderFrame) {
      this.renderFrame();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.frameId = requestAnimationFrame(this.tick);
  };
}
