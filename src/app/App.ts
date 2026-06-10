import * as THREE from 'three';
import { SceneBootstrap } from '../core/SceneBootstrap';
import { RenderLoop } from '../core/RenderLoop';
import { Viewport } from '../core/Viewport';
import { cityConfig } from '../config/cityConfig';
import { renderConfig } from '../config/renderConfig';
import { CityGenerator } from '../generation/CityGenerator';
import { getActiveWeatherPreset } from '../generation/environment/ClimateWeatherGenerator';
import { TrafficLaneGenerator } from '../generation/traffic/TrafficLaneGenerator';
import { MaterialLibrary } from '../rendering/materials/MaterialLibrary';
import { CityComposer } from '../rendering/postprocessing/CityComposer';
import { CameraRig } from '../systems/camera/CameraRig';
import { CityControls } from '../systems/controls/CityControls';
import { createCityLighting } from '../systems/lighting/CityLighting';
import {
  PerformanceMonitor,
  type RuntimePerformanceDiagnostics
} from '../systems/performance/PerformanceMonitor';
import {
  createVisualQaCameraPresets,
  type VisualQaCameraPreset,
  type VisualQaCameraPresetId
} from '../systems/camera/VisualQaCameraPresets';
import { Atmosphere } from '../systems/weather/Atmosphere';
import { City, type StreetLightRuntimeState } from '../world/city/City';
import type { CityPickResult } from '../city/rendering-handoff/picking/pickingMetadata';
import { createCityDiagnostics, type CityDiagnostics } from './cityDiagnostics';
import { validateAppConfig } from '../config/configSchema';
import { assertAppConfigValid, assertGeneratedCityValid } from './cityValidationGate';
import { DebugPanel } from './DebugPanel';
import { APP_UPDATED_AT } from './buildInfo';
import type { RenderConfig } from '../config/renderConfig';
import type {
  CitySceneLayerId,
  CitySceneLayerRuntimeState
} from '../city/rendering-handoff/scene-layers/sceneLayerDefinitions';

const TEST_MODE_PARAM = 'testMode';
const FAST_RENDER_CONFIG: Partial<RenderConfig> = {
  qualityPreset: 'low',
  antialias: false,
  maxPixelRatio: 1,
  shadows: false
};
const FAST_STREET_LIGHT_DYNAMIC_LIMIT = 0;
const DEFAULT_STREET_LIGHT_DYNAMIC_LIMIT = 32;
const NIGHT_BACKGROUND_COLOR = 0x050914;
const NIGHT_FOG_COLOR = 0x101827;
const NIGHT_FOG_DENSITY = 0.0012;
const NIGHT_EXPOSURE = 0.62;
const NIGHT_HEMISPHERE_INTENSITY = 0.2;
const NIGHT_SUN_INTENSITY = 0.14;
const NIGHT_FILL_INTENSITY = 0.1;
const NIGHT_MOON_COLOR = 0x93a9d4;
const NIGHT_SKY_AMBIENT_COLOR = 0x4a5c84;
const DAY_SUN_COLOR = 0xffdcb4;
const DAY_HEMISPHERE_SKY_COLOR = 0xbdd4ec;

interface NightModeRuntimeState {
  readonly enabled: boolean;
}

interface LightIntensitySnapshot {
  readonly hemisphere: number;
  readonly sun: number;
  readonly fill: number;
}

function isFastTestMode(): boolean {
  return new URLSearchParams(window.location.search).get(TEST_MODE_PARAM) === 'fast';
}

function getRuntimeRenderConfig(): RenderConfig {
  if (!isFastTestMode()) {
    return renderConfig;
  }

  return {
    ...renderConfig,
    ...FAST_RENDER_CONFIG
  };
}

function getDebugPanelRefreshIntervalMs(): number {
  return isFastTestMode() ? 0 : 1000;
}

function getStreetLightShadowCastingLimit(config: RenderConfig): number {
  switch (config.qualityPreset) {
    case 'low':
      return 0;
    case 'high':
    case 'debug':
      return 6;
    default:
      return 3;
  }
}

export class App {
  readonly diagnostics: CityDiagnostics;
  private readonly bootstrap: SceneBootstrap;
  private readonly composer: CityComposer;
  private readonly viewport: Viewport;
  private readonly materials = new MaterialLibrary();
  private readonly city: City;
  private readonly controls: CityControls;
  private readonly atmosphere: Atmosphere;
  private readonly debugPanel: DebugPanel;
  private readonly performanceMonitor = new PerformanceMonitor();
  private readonly visualQaCameraPresets: readonly VisualQaCameraPreset[];
  private readonly activeAgentCount: number;
  private readonly loop: RenderLoop;
  private readonly runtimeRenderConfig: RenderConfig;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pickPoint = new THREE.Vector2();
  private readonly dayBackgroundColor: THREE.Color;
  private readonly dayFogColor: THREE.Color | undefined;
  private readonly dayFogDensity: number | undefined;
  private readonly dayExposure: number;
  private readonly dayLightIntensity: LightIntensitySnapshot;
  private nightModeEnabled = false;
  private disposed = false;

  constructor(container: HTMLElement) {
    this.runtimeRenderConfig = getRuntimeRenderConfig();

    assertAppConfigValid(validateAppConfig({ cityConfig, renderConfig }));

    const generatedCity = new CityGenerator(cityConfig).generate();
    assertGeneratedCityValid(generatedCity.validation);
    this.visualQaCameraPresets = createVisualQaCameraPresets(cityConfig, generatedCity);

    const trafficPlan = new TrafficLaneGenerator().create({
      roads: generatedCity.roads,
      crossings: generatedCity.crossings,
      intersections: generatedCity.intersections,
      trafficCalmingDevices: generatedCity.trafficCalmingDevices
    });
    this.activeAgentCount = trafficPlan.vehicles.length;
    this.diagnostics = createCityDiagnostics(generatedCity, trafficPlan, renderConfig, cityConfig);
    const activeWeatherPreset = getActiveWeatherPreset(generatedCity.weatherPresets);
    this.bootstrap = new SceneBootstrap(container, this.runtimeRenderConfig, activeWeatherPreset);
    this.dayBackgroundColor = this.bootstrap.scene.background instanceof THREE.Color
      ? this.bootstrap.scene.background.clone()
      : new THREE.Color(this.runtimeRenderConfig.background);
    this.dayFogColor = this.bootstrap.scene.fog instanceof THREE.FogExp2 ? this.bootstrap.scene.fog.color.clone() : undefined;
    this.dayFogDensity = this.bootstrap.scene.fog instanceof THREE.FogExp2 ? this.bootstrap.scene.fog.density : undefined;
    this.dayExposure = this.bootstrap.renderer.toneMappingExposure;

    CameraRig.applyOverview(this.bootstrap.camera, cityConfig);
    createCityLighting(this.bootstrap.scene, activeWeatherPreset);
    this.dayLightIntensity = this.captureLightIntensity();

    this.atmosphere = new Atmosphere(this.bootstrap.scene, activeWeatherPreset);
    this.materials.applyWeatherPreset(activeWeatherPreset);
    this.city = new City(generatedCity, trafficPlan, this.materials, {
      streetLightDynamicLightLimit: getStreetLightDynamicLightLimit(this.runtimeRenderConfig),
      streetLightShadowCastingLightLimit: getStreetLightShadowCastingLimit(this.runtimeRenderConfig)
    });
    this.bootstrap.scene.add(this.city.group);

    this.controls = new CityControls(this.bootstrap.camera, this.bootstrap.renderer.domElement);
    this.composer = new CityComposer(this.bootstrap.renderer, this.bootstrap.scene, this.bootstrap.camera, {
      bloomEnabled: this.runtimeRenderConfig.qualityPreset !== 'low'
    });
    this.viewport = new Viewport(
      container,
      this.bootstrap.camera,
      this.bootstrap.renderer,
      this.runtimeRenderConfig.maxPixelRatio,
      (width, height, pixelRatio) => this.composer.setSize(width, height, pixelRatio)
    );

    this.loop = new RenderLoop(
      this.bootstrap.renderer,
      this.bootstrap.scene,
      this.bootstrap.camera,
      [this.performanceMonitor, this.controls, this.atmosphere, this.city],
      () => this.composer.render()
    );
    this.debugPanel = new DebugPanel(container, {
      seed: cityConfig.seed,
      updatedAt: APP_UPDATED_AT,
      diagnostics: this.diagnostics,
      getPerformanceDiagnostics: () => this.getPerformanceDiagnostics(),
      getSceneLayerStates: () => this.getSceneLayerStates(),
      setSceneLayerVisible: (layerId, visible) => this.setSceneLayerVisible(layerId, visible),
      setSceneLayerRenderOrder: (layerId, renderOrder) => this.setSceneLayerRenderOrder(layerId, renderOrder),
      getStreetLightRuntimeState: () => this.getStreetLightRuntimeState(),
      setStreetLightsEnabled: (enabled) => this.setStreetLightsEnabled(enabled),
      getNightModeState: () => this.getNightModeState(),
      setNightModeEnabled: (enabled) => this.setNightModeEnabled(enabled)
    }, { refreshIntervalMs: getDebugPanelRefreshIntervalMs() });
  }

  pickCityObjectAtClientPoint(clientX: number, clientY: number): CityPickResult | undefined {
    const canvas = this.bootstrap.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return undefined;
    }

    this.pickPoint.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1)
    );
    this.raycaster.setFromCamera(this.pickPoint, this.bootstrap.camera);

    return this.city.resolvePickingMetadata(this.raycaster.intersectObject(this.city.group, true));
  }

  getPerformanceDiagnostics(): RuntimePerformanceDiagnostics {
    return this.performanceMonitor.snapshot(
      this.bootstrap.renderer,
      this.diagnostics.performanceBudget,
      this.activeAgentCount
    );
  }

  getSceneLayerStates(): readonly CitySceneLayerRuntimeState[] {
    return this.city.getSceneLayerStates();
  }

  setSceneLayerVisible(layerId: CitySceneLayerId, visible: boolean): void {
    this.city.setSceneLayerVisible(layerId, visible);
    setLayerVisibilityDataset(layerId, visible);
  }

  setSceneLayerRenderOrder(layerId: CitySceneLayerId, renderOrder: number): void {
    this.city.setSceneLayerRenderOrder(layerId, renderOrder);
    const state = this.city.getSceneLayerStates().find((layer) => layer.id === layerId);

    if (state) {
      setLayerOrderDataset(layerId, state.renderOrder);
    }
  }

  getStreetLightRuntimeState(): StreetLightRuntimeState {
    return this.city.getStreetLightRuntimeState();
  }

  setStreetLightsEnabled(enabled: boolean): void {
    this.city.setStreetLightsEnabled(enabled);
    document.body.dataset.streetLightsEnabled = String(enabled);
  }

  getNightModeState(): NightModeRuntimeState {
    return { enabled: this.nightModeEnabled };
  }

  setNightModeEnabled(enabled: boolean): void {
    this.nightModeEnabled = enabled;
    this.applyNightModeLighting(enabled);
    this.atmosphere.setNightModeEnabled(enabled);
    this.materials.setNightFactor(enabled ? 1 : 0);
    this.composer.setNightModeEnabled(enabled);
    document.body.dataset.nightModeEnabled = String(enabled);
  }

  private captureLightIntensity(): LightIntensitySnapshot {
    return {
      hemisphere: getSceneLight(this.bootstrap.scene, 'HemisphereLight')?.intensity ?? 0,
      sun: getSceneLight(this.bootstrap.scene, 'SunLight')?.intensity ?? 0,
      fill: getSceneLight(this.bootstrap.scene, 'SkylineFillLight')?.intensity ?? 0
    };
  }

  private applyNightModeLighting(enabled: boolean): void {
    const hemisphere = getSceneLight(this.bootstrap.scene, 'HemisphereLight');
    const sun = getSceneLight(this.bootstrap.scene, 'SunLight');
    const fill = getSceneLight(this.bootstrap.scene, 'SkylineFillLight');

    if (enabled) {
      this.bootstrap.scene.background = new THREE.Color(NIGHT_BACKGROUND_COLOR);
      this.bootstrap.scene.fog = new THREE.FogExp2(NIGHT_FOG_COLOR, NIGHT_FOG_DENSITY);
      this.bootstrap.renderer.toneMappingExposure = NIGHT_EXPOSURE;
      if (hemisphere) {
        hemisphere.intensity = NIGHT_HEMISPHERE_INTENSITY;
        hemisphere.color.set(NIGHT_SKY_AMBIENT_COLOR);
      }
      if (sun) {
        sun.intensity = NIGHT_SUN_INTENSITY;
        sun.color.set(NIGHT_MOON_COLOR);
      }
      if (fill) fill.intensity = NIGHT_FILL_INTENSITY;
      return;
    }

    this.bootstrap.scene.background = this.dayBackgroundColor.clone();
    if (this.dayFogColor && this.dayFogDensity !== undefined) {
      this.bootstrap.scene.fog = new THREE.FogExp2(this.dayFogColor, this.dayFogDensity);
    }
    this.bootstrap.renderer.toneMappingExposure = this.dayExposure;
    if (hemisphere) {
      hemisphere.intensity = this.dayLightIntensity.hemisphere;
      hemisphere.color.set(DAY_HEMISPHERE_SKY_COLOR);
    }
    if (sun) {
      sun.intensity = this.dayLightIntensity.sun;
      sun.color.set(DAY_SUN_COLOR);
    }
    if (fill) fill.intensity = this.dayLightIntensity.fill;
  }

  getVisualQaCameraPresets(): readonly VisualQaCameraPreset[] {
    return this.visualQaCameraPresets;
  }

  applyVisualQaCameraPreset(presetId: VisualQaCameraPresetId): boolean {
    const preset = this.visualQaCameraPresets.find((candidate) => candidate.id === presetId);

    if (!preset) {
      return false;
    }

    CameraRig.applyPreset(this.bootstrap.camera, preset);
    this.controls.setTarget(preset.target);
    return true;
  }

  renderVisualQaFrame(): void {
    this.loop.stop();
    this.controls.update();
    this.loop.renderOnce();
  }

  start(): void {
    this.viewport.resize();
    this.loop.start();
    this.debugPanel.start();
    document.body.dataset.sceneValidationStatus = this.diagnostics.validation.passed ? 'passed' : 'failed';
    document.body.dataset.sceneValidationIssues = String(this.diagnostics.validation.issues.length);
    for (const layer of this.city.getSceneLayerStates()) {
      setLayerVisibilityDataset(layer.id, layer.visible);
      setLayerOrderDataset(layer.id, layer.renderOrder);
    }
    this.setStreetLightsEnabled(this.city.getStreetLightRuntimeState().enabled);
    this.setNightModeEnabled(false);
    document.body.dataset.sceneReady = 'true';
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.loop.dispose();
    this.debugPanel.dispose();
    this.viewport.dispose();
    this.controls.dispose();
    this.city.dispose();
    this.materials.dispose();
    this.composer.dispose();
    this.bootstrap.dispose();
    this.disposed = true;
  }
}

function getLayerDatasetKey(layerId: CitySceneLayerId, suffix: 'Visible' | 'Order'): string {
  return `sceneLayer${layerId
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')}${suffix}`;
}

function setLayerVisibilityDataset(layerId: CitySceneLayerId, visible: boolean): void {
  document.body.dataset[getLayerDatasetKey(layerId, 'Visible')] = String(visible);
}

function setLayerOrderDataset(layerId: CitySceneLayerId, renderOrder: number): void {
  document.body.dataset[getLayerDatasetKey(layerId, 'Order')] = String(renderOrder);
}

function getStreetLightDynamicLightLimit(config: RenderConfig): number {
  return config.qualityPreset === 'low' ? FAST_STREET_LIGHT_DYNAMIC_LIMIT : DEFAULT_STREET_LIGHT_DYNAMIC_LIMIT;
}

function getSceneLight(scene: THREE.Scene, name: string): THREE.Light | undefined {
  const object = scene.getObjectByName(name);
  return object instanceof THREE.Light ? object : undefined;
}
