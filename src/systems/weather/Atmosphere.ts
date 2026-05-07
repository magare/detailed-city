import * as THREE from 'three';
import type { Updatable } from '../../types/city';

export class Atmosphere implements Updatable {
  private readonly sky: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.SphereGeometry(1200, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x8fb3c7,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    });

    this.sky = new THREE.Mesh(geometry, material);
    this.sky.name = 'AtmosphereSkyDome';
    scene.add(this.sky);
  }

  update(_deltaSeconds: number, elapsedSeconds: number): void {
    this.sky.rotation.y = elapsedSeconds * 0.008;
  }
}
