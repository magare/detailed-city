import * as THREE from 'three';
import type { WeatherPreset } from '../../types/city';

export function createCityLighting(scene: THREE.Scene, weatherPreset?: WeatherPreset): void {
  const rendering = weatherPreset?.rendering;
  const ambient = new THREE.HemisphereLight(0xd9eef7, 0x26331f, rendering?.hemisphereIntensity ?? 1.2);
  ambient.name = 'HemisphereLight';
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0d0, rendering?.sunIntensity ?? 4.2);
  sun.name = 'SunLight';
  sun.position.set(-180, 260, 140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 620;
  sun.shadow.camera.left = -320;
  sun.shadow.camera.right = 320;
  sun.shadow.camera.top = 320;
  sun.shadow.camera.bottom = -320;
  scene.add(sun);

  const skylineFill = new THREE.DirectionalLight(0x8fb8ff, rendering?.fillIntensity ?? 0.85);
  skylineFill.name = 'SkylineFillLight';
  skylineFill.position.set(220, 120, -180);
  scene.add(skylineFill);
}
