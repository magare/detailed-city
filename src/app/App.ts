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
import { City } from '../world/city/City';
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

export class App {
  readonly diagnostics: CityDiagnostics;
  private readonly bootstrap: SceneBootstrap;
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

    CameraRig.applyOverview(this.bootstrap.camera, cityConfig);
    createCityLighting(this.bootstrap.scene, activeWeatherPreset);

    this.atmosphere = new Atmosphere(this.bootstrap.scene, activeWeatherPreset);
    this.materials.applyWeatherPreset(activeWeatherPreset);
    this.city = new City(generatedCity, trafficPlan, this.materials);
    this.bootstrap.scene.add(this.city.group);

    this.controls = new CityControls(this.bootstrap.camera, this.bootstrap.renderer.domElement);
    this.viewport = new Viewport(
      container,
      this.bootstrap.camera,
      this.bootstrap.renderer,
      this.runtimeRenderConfig.maxPixelRatio
    );

    this.loop = new RenderLoop(this.bootstrap.renderer, this.bootstrap.scene, this.bootstrap.camera, [
      this.performanceMonitor,
      this.controls,
      this.atmosphere,
      this.city
    ]);
    this.debugPanel = new DebugPanel(container, {
      seed: cityConfig.seed,
      updatedAt: APP_UPDATED_AT,
      diagnostics: this.diagnostics,
      getPerformanceDiagnostics: () => this.getPerformanceDiagnostics(),
      getSceneLayerStates: () => this.getSceneLayerStates(),
      setSceneLayerVisible: (layerId, visible) => this.setSceneLayerVisible(layerId, visible),
      setSceneLayerRenderOrder: (layerId, renderOrder) => this.setSceneLayerRenderOrder(layerId, renderOrder)
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
    document.body.dataset.sceneReady = 'true';
    document.body.dataset.sceneValidationStatus = this.diagnostics.validation.passed ? 'passed' : 'failed';
    document.body.dataset.sceneValidationIssues = String(this.diagnostics.validation.issues.length);
    for (const layer of this.city.getSceneLayerStates()) {
      setLayerVisibilityDataset(layer.id, layer.visible);
      setLayerOrderDataset(layer.id, layer.renderOrder);
    }
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
