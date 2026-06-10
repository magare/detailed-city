import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const DAY_BLOOM_STRENGTH = 0.14;
const DAY_BLOOM_THRESHOLD = 1.15;
const NIGHT_BLOOM_STRENGTH = 0.32;
const NIGHT_BLOOM_THRESHOLD = 0.92;
const BLOOM_RADIUS = 0.35;

export class CityComposer {
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options?: { bloomEnabled?: boolean }
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      DAY_BLOOM_STRENGTH,
      BLOOM_RADIUS,
      DAY_BLOOM_THRESHOLD
    );
    this.bloomPass.enabled = options?.bloomEnabled ?? true;
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  setNightModeEnabled(enabled: boolean): void {
    this.bloomPass.strength = enabled ? NIGHT_BLOOM_STRENGTH : DAY_BLOOM_STRENGTH;
    this.bloomPass.threshold = enabled ? NIGHT_BLOOM_THRESHOLD : DAY_BLOOM_THRESHOLD;
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
  }
}
