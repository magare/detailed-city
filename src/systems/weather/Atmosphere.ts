import * as THREE from 'three';
import type { Updatable } from '../../types/city';
import type { WeatherPreset } from '../../types/city';

export class Atmosphere implements Updatable {
  private readonly sky: THREE.Mesh;
  private readonly rotationSpeed: number;

  constructor(scene: THREE.Scene, weatherPreset?: WeatherPreset) {
    const rendering = weatherPreset?.rendering;
    const geometry = new THREE.SphereGeometry(1200, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      color: rendering?.skyColor ?? 0x8fb3c7,
      side: THREE.BackSide,
      transparent: true,
      opacity: rendering?.skyOpacity ?? 0.32,
      depthWrite: false
    });

    this.sky = new THREE.Mesh(geometry, material);
    this.sky.name = 'AtmosphereSkyDome';
    this.rotationSpeed = 0.006 + Math.min((weatherPreset?.windSpeedKph ?? 8) / 1200, 0.04);
    scene.add(this.sky);
  }

  update(_deltaSeconds: number, elapsedSeconds: number): void {
    this.sky.rotation.y = elapsedSeconds * this.rotationSpeed;
  }
}
