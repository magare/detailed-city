import { SceneBootstrap } from '../core/SceneBootstrap';
import { RenderLoop } from '../core/RenderLoop';
import { Viewport } from '../core/Viewport';
import { cityConfig } from '../config/cityConfig';
import { renderConfig } from '../config/renderConfig';
import { MaterialLibrary } from '../rendering/materials/MaterialLibrary';
import { CameraRig } from '../systems/camera/CameraRig';
import { CityControls } from '../systems/controls/CityControls';
import { createCityLighting } from '../systems/lighting/CityLighting';
import { Atmosphere } from '../systems/weather/Atmosphere';
import { City } from '../world/city/City';

export class App {
  private readonly bootstrap: SceneBootstrap;
  private readonly viewport: Viewport;
  private readonly materials = new MaterialLibrary();
  private readonly city: City;
  private readonly controls: CityControls;
  private readonly atmosphere: Atmosphere;
  private readonly loop: RenderLoop;
  private disposed = false;

  constructor(container: HTMLElement) {
    this.bootstrap = new SceneBootstrap(container, renderConfig);

    CameraRig.applyOverview(this.bootstrap.camera, cityConfig);
    createCityLighting(this.bootstrap.scene);

    this.atmosphere = new Atmosphere(this.bootstrap.scene);
    this.city = new City(cityConfig, this.materials);
    this.bootstrap.scene.add(this.city.group);

    this.controls = new CityControls(this.bootstrap.camera, this.bootstrap.renderer.domElement);
    this.viewport = new Viewport(
      container,
      this.bootstrap.camera,
      this.bootstrap.renderer,
      renderConfig.maxPixelRatio
    );

    this.loop = new RenderLoop(this.bootstrap.renderer, this.bootstrap.scene, this.bootstrap.camera, [
      this.controls,
      this.atmosphere,
      this.city
    ]);
  }

  start(): void {
    this.viewport.resize();
    this.loop.start();
    document.body.dataset.sceneReady = 'true';
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.loop.dispose();
    this.viewport.dispose();
    this.controls.dispose();
    this.city.dispose();
    this.materials.dispose();
    this.bootstrap.dispose();
    this.disposed = true;
  }
}
