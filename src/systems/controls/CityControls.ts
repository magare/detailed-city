import type * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Updatable } from '../../types/city';

export class CityControls implements Updatable {
  private readonly controls: OrbitControls;

  constructor(camera: THREE.PerspectiveCamera, element: HTMLElement) {
    this.controls = new OrbitControls(camera, element);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 80;
    this.controls.maxDistance = 900;
    this.controls.target.set(0, 12, 0);
  }

  update(): void {
    this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
