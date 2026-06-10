import * as THREE from 'three';
import type { Updatable } from '../../types/city';
import type { WeatherPreset } from '../../types/city';

const NIGHT_TRANSITION_SECONDS = 1.6;

// Matches the sun position in CityLighting so the sky glow sits behind the light source.
const SUN_DIRECTION = new THREE.Vector3(-270, 190, 160).normalize();

export class Atmosphere implements Updatable {
  private readonly sky: THREE.Mesh;
  private readonly skyMaterial: THREE.ShaderMaterial;
  private nightTarget = 0;

  constructor(scene: THREE.Scene, weatherPreset?: WeatherPreset) {
    const rendering = weatherPreset?.rendering;
    const zenithDay = new THREE.Color(rendering?.skyColor ?? 0x4f83b8);
    const horizonDay = new THREE.Color(rendering?.fogColor ?? 0xc9d4dc);
    const geometry = new THREE.SphereGeometry(1200, 32, 16);

    this.skyMaterial = new THREE.ShaderMaterial({
      name: 'AtmosphereSkyShader',
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenithDay: { value: zenithDay },
        uHorizonDay: { value: horizonDay },
        uZenithNight: { value: new THREE.Color(0x070d1c) },
        uHorizonNight: { value: new THREE.Color(0x1a2336) },
        uSunDirection: { value: SUN_DIRECTION.clone() },
        uSunColor: { value: new THREE.Color(0xffe2b8) },
        uNight: { value: 0 }
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldDirection;

        void main() {
          vWorldDirection = (modelMatrix * vec4(position, 0.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenithDay;
        uniform vec3 uHorizonDay;
        uniform vec3 uZenithNight;
        uniform vec3 uHorizonNight;
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform float uNight;
        varying vec3 vWorldDirection;

        float starHash(vec3 cell) {
          return fract(sin(dot(cell, vec3(12.9898, 78.233, 54.53))) * 43758.5453);
        }

        void main() {
          vec3 dir = normalize(vWorldDirection);
          float elevation = clamp(dir.y, 0.0, 1.0);
          float horizonBlend = pow(1.0 - elevation, 2.4);

          vec3 day = mix(uZenithDay, uHorizonDay, horizonBlend);
          vec3 night = mix(uZenithNight, uHorizonNight, horizonBlend);

          // Warm sodium-vapor city glow hugging the night horizon.
          night += vec3(0.16, 0.09, 0.03) * pow(1.0 - elevation, 7.0);

          // Sun disc and halo, fades out at night.
          float sunAmount = max(dot(dir, uSunDirection), 0.0);
          vec3 halo = uSunColor * (pow(sunAmount, 18.0) * 0.32 + pow(sunAmount, 240.0) * 1.6);
          day += halo;

          // Sparse star field, only above the horizon, only at night.
          vec3 cell = floor(dir * 220.0);
          float star = step(0.9992, starHash(cell)) * smoothstep(0.04, 0.22, dir.y);
          night += vec3(0.75, 0.82, 1.0) * star * (0.35 + 0.65 * starHash(cell + 17.0));

          vec3 color = mix(day, night, uNight);
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `
    });

    this.sky = new THREE.Mesh(geometry, this.skyMaterial);
    this.sky.name = 'AtmosphereSkyDome';
    this.sky.frustumCulled = false;
    scene.add(this.sky);
  }

  setNightModeEnabled(enabled: boolean): void {
    this.nightTarget = enabled ? 1 : 0;
  }

  update(deltaSeconds: number): void {
    const uniform = this.skyMaterial.uniforms.uNight;
    const step = deltaSeconds / NIGHT_TRANSITION_SECONDS;
    uniform.value = THREE.MathUtils.clamp(
      uniform.value + Math.sign(this.nightTarget - uniform.value) * step,
      Math.min(uniform.value, this.nightTarget),
      Math.max(uniform.value, this.nightTarget)
    );
  }
}
