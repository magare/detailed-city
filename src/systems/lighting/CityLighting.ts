import * as THREE from 'three';
import type { WeatherPreset } from '../../types/city';

export function createCityLighting(scene: THREE.Scene, weatherPreset?: WeatherPreset): void {
  const rendering = weatherPreset?.rendering;

  const ambient = new THREE.HemisphereLight(0xbdd4ec, 0x42493c, rendering?.hemisphereIntensity ?? 0.55);
  ambient.name = 'HemisphereLight';
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffdcb4, rendering?.sunIntensity ?? 2.7);
  sun.name = 'SunLight';
  sun.position.set(-270, 190, 160);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 900;
  sun.shadow.camera.left = -340;
  sun.shadow.camera.right = 340;
  sun.shadow.camera.top = 340;
  sun.shadow.camera.bottom = -340;
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.7;
  sun.shadow.radius = 4;
  scene.add(sun);

  const skylineFill = new THREE.DirectionalLight(0x9dbbdd, rendering?.fillIntensity ?? 0.32);
  skylineFill.name = 'SkylineFillLight';
  skylineFill.position.set(220, 120, -180);
  scene.add(skylineFill);
}
