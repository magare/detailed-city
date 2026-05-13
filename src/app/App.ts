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
import { Atmosphere } from '../systems/weather/Atmosphere';
import { City } from '../world/city/City';
import type { CityPickResult } from '../city/rendering-handoff/picking/pickingMetadata';
import { createCityDiagnostics, type CityDiagnostics } from './cityDiagnostics';
import { validateAppConfig } from '../config/configSchema';
import { assertAppConfigValid, assertGeneratedCityValid } from './cityValidationGate';
import { DebugPanel } from './DebugPanel';

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
  private readonly activeAgentCount: number;
  private readonly loop: RenderLoop;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pickPoint = new THREE.Vector2();
  private disposed = false;

  constructor(container: HTMLElement) {
    assertAppConfigValid(validateAppConfig({ cityConfig, renderConfig }));

    const generatedCity = new CityGenerator(cityConfig).generate();
    assertGeneratedCityValid(generatedCity.validation);

    const trafficPlan = new TrafficLaneGenerator().create({
      roads: generatedCity.roads,
      crossings: generatedCity.crossings,
      intersections: generatedCity.intersections,
      trafficCalmingDevices: generatedCity.trafficCalmingDevices
    });
    this.activeAgentCount = trafficPlan.vehicles.length;
    this.diagnostics = createCityDiagnostics(generatedCity, trafficPlan, renderConfig, cityConfig);
    const activeWeatherPreset = getActiveWeatherPreset(generatedCity.weatherPresets);
    this.bootstrap = new SceneBootstrap(container, renderConfig, activeWeatherPreset);

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
      renderConfig.maxPixelRatio
    );

    this.loop = new RenderLoop(this.bootstrap.renderer, this.bootstrap.scene, this.bootstrap.camera, [
      this.performanceMonitor,
      this.controls,
      this.atmosphere,
      this.city
    ]);
    this.debugPanel = new DebugPanel(container, {
      seed: cityConfig.seed,
      diagnostics: this.diagnostics,
      getPerformanceDiagnostics: () => this.getPerformanceDiagnostics()
    });
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

  start(): void {
    this.viewport.resize();
    this.loop.start();
    this.debugPanel.start();
    document.body.dataset.sceneReady = 'true';
    document.body.dataset.sceneValidationStatus = this.diagnostics.validation.passed ? 'passed' : 'failed';
    document.body.dataset.sceneValidationIssues = String(this.diagnostics.validation.issues.length);
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
