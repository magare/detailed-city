import * as THREE from 'three';
import type { MaterialZoneId } from '../../city/rendering-handoff/material-zones/materialZoneDefinitions';
import type { BuildingPlan, WeatherPreset } from '../../types/city';

const FACADE_TEXTURE_WIDTH = 256;
const FACADE_TEXTURE_HEIGHT = 512;
const ROOF_TEXTURE_SIZE = 256;

export class MaterialLibrary {
  private readonly buildingFacadeTexture = createFacadeTexture();
  private readonly buildingFacadeBumpTexture = createFacadeBumpTexture();
  private readonly roofTexture = createRoofTexture();
  private readonly terrainTexture = createTerrainTexture();
  private readonly buildingWindowUniforms = {
    uCityNight: { value: 0 },
    uCityWindowGlow: { value: 1.4 }
  };
  private nightFactor = 0;
  private weatherConeOpacity = 0.14;

  constructor() {
    this.setupClippingShader(this.streetLightIllumination);
    this.setupClippingShader(this.streetLightDynamicReceiver);
    this.setupClippingShader(this.streetLightCone);
    this.setupBuildingWindowShader(this.building);
    this.terrain.map = this.terrainTexture;
  }

  readonly terrain = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.96
  });

  readonly asphalt = new THREE.MeshStandardMaterial({
    color: 0x22282d,
    roughness: 0.88
  });

  readonly lanePaint = new THREE.MeshBasicMaterial({
    color: 0xece7d4
  });

  readonly tactilePaving = new THREE.MeshStandardMaterial({
    color: 0xc9a83a,
    roughness: 0.86
  });

  readonly refugeIsland = new THREE.MeshStandardMaterial({
    color: 0xbdb8aa,
    roughness: 0.82
  });

  readonly trafficCalming = new THREE.MeshStandardMaterial({
    color: 0xd0c2a0,
    roughness: 0.84,
    metalness: 0.02
  });

  readonly park = new THREE.MeshStandardMaterial({
    color: 0x5c8f45,
    roughness: 0.96
  });

  readonly plazaHardscape = new THREE.MeshStandardMaterial({
    color: 0xc8c0ad,
    roughness: 0.8,
    metalness: 0.03
  });

  readonly concrete = new THREE.MeshStandardMaterial({
    color: 0xbdb8aa,
    roughness: 0.82,
    metalness: 0.02
  });

  readonly brick = new THREE.MeshStandardMaterial({
    color: 0x9f6f55,
    roughness: 0.86,
    metalness: 0.02
  });

  readonly metal = new THREE.MeshStandardMaterial({
    color: 0x515b62,
    roughness: 0.64,
    metalness: 0.32
  });

  readonly utility = new THREE.MeshStandardMaterial({
    color: 0x60706f,
    roughness: 0.72,
    metalness: 0.18
  });

  readonly overlay = new THREE.MeshBasicMaterial({
    color: 0x7aa7ff,
    transparent: true,
    opacity: 0.42
  });

  readonly treeTrunk = new THREE.MeshStandardMaterial({
    color: 0x5b3a26,
    roughness: 0.95
  });

  readonly treeCanopy = new THREE.MeshStandardMaterial({
    color: 0x2f6b3a,
    roughness: 0.9
  });

  readonly treeTrunkInstanced = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    vertexColors: true
  });

  readonly treeCanopyInstanced = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.96,
    metalness: 0,
    vertexColors: true,
    side: THREE.DoubleSide
  });

  readonly understoryFoliage = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    vertexColors: true
  });

  readonly water = new THREE.MeshPhysicalMaterial({
    color: 0x2c6f86,
    roughness: 0.28,
    metalness: 0,
    clearcoat: 0.42,
    transparent: true,
    opacity: 0.82
  });

  readonly building = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.74,
    metalness: 0.04,
    vertexColors: true
  });

  readonly rooftop = new THREE.MeshStandardMaterial({
    color: 0x8a8780,
    roughness: 0.86,
    metalness: 0.06,
    map: this.roofTexture,
    vertexColors: true
  });

  readonly roofSolarPanel = new THREE.MeshStandardMaterial({
    color: 0x1f3444,
    roughness: 0.42,
    metalness: 0.22
  });

  readonly roofGreen = new THREE.MeshStandardMaterial({
    color: 0x4f7d4e,
    roughness: 0.9,
    metalness: 0.02
  });

  readonly roofTerrace = new THREE.MeshStandardMaterial({
    color: 0xb8ad95,
    roughness: 0.84,
    metalness: 0.03
  });

  readonly windowGlow = new THREE.MeshBasicMaterial({
    color: 0xf4d391,
    transparent: true,
    opacity: 0.38
  });

  readonly storefrontGlass = new THREE.MeshPhysicalMaterial({
    color: 0x7fb4c3,
    roughness: 0.2,
    metalness: 0,
    transparent: true,
    opacity: 0.62,
    clearcoat: 0.36
  });

  readonly facadeFrame = new THREE.MeshStandardMaterial({
    color: 0x778086,
    roughness: 0.68,
    metalness: 0.12
  });

  readonly facadeBalcony = new THREE.MeshStandardMaterial({
    color: 0x57626a,
    roughness: 0.62,
    metalness: 0.28
  });

  readonly storefrontAwning = new THREE.MeshStandardMaterial({
    color: 0x2d7f78,
    roughness: 0.74
  });

  readonly storefrontSign = new THREE.MeshStandardMaterial({
    color: 0xd8b55b,
    roughness: 0.52,
    metalness: 0.04
  });

  readonly entranceDoor = new THREE.MeshStandardMaterial({
    color: 0x4a3630,
    roughness: 0.68,
    metalness: 0.08
  });

  readonly streetLightPole = new THREE.MeshStandardMaterial({
    color: 0x3d4346,
    roughness: 0.72,
    metalness: 0.34
  });

  readonly streetLightGlow = new THREE.MeshBasicMaterial({
    color: 0xffd99a,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending
  });

  readonly streetLightIllumination = new THREE.MeshBasicMaterial({
    color: 0xffc46d,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  });

  readonly streetLightDynamicReceiver = new THREE.MeshStandardMaterial({
    color: 0xffc46d,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  });

  readonly streetLightCone = new THREE.MeshBasicMaterial({
    color: 0xffc46d,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexColors: true
  });

  readonly streetFurnitureMetal = new THREE.MeshStandardMaterial({
    color: 0x46515a,
    roughness: 0.68,
    metalness: 0.28
  });

  readonly streetFurnitureWood = new THREE.MeshStandardMaterial({
    color: 0x8a6a45,
    roughness: 0.84
  });

  readonly streetFurnitureAccent = new THREE.MeshStandardMaterial({
    color: 0xb84c3f,
    roughness: 0.72,
    metalness: 0.05
  });

  readonly shelterGlass = new THREE.MeshPhysicalMaterial({
    color: 0x8fb7c4,
    roughness: 0.18,
    metalness: 0,
    transparent: true,
    opacity: 0.42
  });

  readonly waterfrontEdge = new THREE.MeshStandardMaterial({
    color: 0xb9b7a6,
    roughness: 0.82,
    metalness: 0.04
  });

  readonly signPanelWhite = new THREE.MeshStandardMaterial({
    color: 0xe7e6d8,
    roughness: 0.52
  });

  readonly signPanelGreen = new THREE.MeshStandardMaterial({
    color: 0x2f6f61,
    roughness: 0.58
  });

  readonly signPanelBlue = new THREE.MeshStandardMaterial({
    color: 0x2e6a9e,
    roughness: 0.55
  });

  readonly transitStop = new THREE.MeshStandardMaterial({
    color: 0xd8b55b,
    roughness: 0.5,
    metalness: 0.08
  });

  readonly vehicleBody = [
    new THREE.MeshStandardMaterial({ color: 0xbc3d36, roughness: 0.54 }),
    new THREE.MeshStandardMaterial({ color: 0xf0c14b, roughness: 0.52 }),
    new THREE.MeshStandardMaterial({ color: 0xd8dee8, roughness: 0.48 }),
    new THREE.MeshStandardMaterial({ color: 0x2e6a9e, roughness: 0.55 })
  ] as const;

  readonly vehiclePaint = [
    createVehiclePaint(0xb8352c),
    createVehiclePaint(0x2f5d94),
    createVehiclePaint(0xe8eaee),
    createVehiclePaint(0x39404a),
    createVehiclePaint(0x73818d),
    createVehiclePaint(0x274d36)
  ] as const;

  readonly taxiPaint = createVehiclePaint(0xf4c63a);

  readonly vehicleGlass = new THREE.MeshPhysicalMaterial({
    color: 0x161d27,
    roughness: 0.1,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.06
  });

  readonly vehicleTire = new THREE.MeshStandardMaterial({
    color: 0x131519,
    roughness: 0.94
  });

  readonly vehicleWheelHub = new THREE.MeshStandardMaterial({
    color: 0x99a2ac,
    roughness: 0.35,
    metalness: 0.82
  });

  readonly vehicleTrim = new THREE.MeshStandardMaterial({
    color: 0x434b54,
    roughness: 0.46,
    metalness: 0.6
  });

  readonly vehicleHeadlight = new THREE.MeshStandardMaterial({
    color: 0x202020,
    emissive: 0xfff3d4,
    emissiveIntensity: 0.9,
    roughness: 0.25
  });

  readonly vehicleTaillight = new THREE.MeshStandardMaterial({
    color: 0x200505,
    emissive: 0xff2418,
    emissiveIntensity: 0.8,
    roughness: 0.3
  });

  readonly taxiSign = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: 0xffd34d,
    emissiveIntensity: 0.7,
    roughness: 0.4
  });

  private readonly materialByZone: Readonly<Record<MaterialZoneId, THREE.Material>> = {
    terrain: this.terrain,
    asphalt: this.asphalt,
    'lane-paint': this.lanePaint,
    'crosswalk-paint': this.lanePaint,
    'tactile-paving': this.tactilePaving,
    'curb-concrete': this.refugeIsland,
    'traffic-calming': this.trafficCalming,
    water: this.water,
    park: this.park,
    'park-lawn': this.park,
    'park-path': this.refugeIsland,
    'park-planting': this.treeCanopy,
    'park-sports': this.signPanelBlue,
    'park-seating': this.streetFurnitureWood,
    'park-water-feature': this.water,
    'park-shade': this.streetFurnitureMetal,
    'green-stormwater': this.roofGreen,
    'green-stormwater-planting': this.treeCanopy,
    'green-stormwater-permeable': this.plazaHardscape,
    'green-stormwater-curb-cut': this.refugeIsland,
    plaza: this.plazaHardscape,
    'plaza-zone': this.plazaHardscape,
    waterfront: this.waterfrontEdge,
    'waterfront-edge': this.waterfrontEdge,
    'waterfront-open-space': this.waterfrontEdge,
    building: this.building,
    brick: this.brick,
    civic: this.building,
    'civic-anchor': this.building,
    'community-anchor': this.plazaHardscape,
    'culture-anchor': this.storefrontSign,
    'government-anchor': this.building,
    'emergency-service-anchor': this.building,
    'emergency-equipment': this.storefrontSign,
    roof: this.rooftop,
    solar: this.roofSolarPanel,
    'green-roof': this.roofGreen,
    terrace: this.roofTerrace,
    metal: this.metal,
    'storefront-window': this.storefrontGlass,
    'storefront-glass': this.storefrontGlass,
    'storefront-awning': this.storefrontAwning,
    'storefront-sign': this.storefrontSign,
    'entrance-door': this.entranceDoor,
    'night-window': this.windowGlow,
    'window-glow': this.windowGlow,
    'tree-trunk': this.treeTrunk,
    bark: this.treeTrunk,
    'tree-canopy': this.treeCanopy,
    foliage: this.treeCanopy,
    'street-light': this.streetLightPole,
    'street-light-glow': this.streetLightGlow,
    'street-light-illumination': this.streetLightIllumination,
    'street-light-dynamic-receiver': this.streetLightDynamicReceiver,
    'street-light-cone': this.streetLightCone,
    'street-furniture': this.streetFurnitureMetal,
    bench: this.streetFurnitureWood,
    bin: this.streetFurnitureAccent,
    'bike-rack': this.streetFurnitureMetal,
    bollard: this.streetFurnitureMetal,
    'bus-shelter': this.shelterGlass,
    kiosk: this.streetFurnitureAccent,
    railing: this.streetFurnitureMetal,
    signage: this.signPanelWhite,
    'regulatory-sign': this.signPanelWhite,
    'street-name-sign': this.signPanelGreen,
    'wayfinding-sign': this.signPanelBlue,
    transit: this.transitStop,
    'bus-stop': this.transitStop,
    vehicle: this.vehicleBody[0],
    'vehicle-body': this.vehicleBody[0],
    'lane-marking': this.lanePaint,
    'zebra-crossing': this.lanePaint,
    'stop-bar': this.lanePaint,
    'turn-arrow': this.lanePaint,
    'refuge-island': this.refugeIsland
  };

  private readonly materialByFallbackName: Readonly<Record<string, THREE.Material>> = {
    terrain: this.terrain,
    asphalt: this.asphalt,
    lanePaint: this.lanePaint,
    tactilePaving: this.tactilePaving,
    refugeIsland: this.refugeIsland,
    trafficCalming: this.trafficCalming,
    park: this.park,
    'park-lawn': this.park,
    'park-path': this.refugeIsland,
    'park-planting': this.treeCanopy,
    'park-sports': this.signPanelBlue,
    'park-seating': this.streetFurnitureWood,
    'park-water-feature': this.water,
    'park-shade': this.streetFurnitureMetal,
    'green-stormwater': this.roofGreen,
    'green-stormwater-planting': this.treeCanopy,
    'green-stormwater-permeable': this.plazaHardscape,
    'green-stormwater-curb-cut': this.refugeIsland,
    plazaHardscape: this.plazaHardscape,
    concrete: this.concrete,
    brick: this.brick,
    metal: this.metal,
    utility: this.utility,
    'utility-node': this.utility,
    'utility-edge': this.utility,
    overlay: this.overlay,
    treeTrunk: this.treeTrunk,
    treeCanopy: this.treeCanopy,
    treeTrunkInstanced: this.treeTrunkInstanced,
    treeCanopyInstanced: this.treeCanopyInstanced,
    understoryFoliage: this.understoryFoliage,
    water: this.water,
    building: this.building,
    rooftop: this.rooftop,
    roofSolarPanel: this.roofSolarPanel,
    roofGreen: this.roofGreen,
    roofTerrace: this.roofTerrace,
    windowGlow: this.windowGlow,
    storefrontGlass: this.storefrontGlass,
    facadeFrame: this.facadeFrame,
    facadeBalcony: this.facadeBalcony,
    storefrontAwning: this.storefrontAwning,
    storefrontSign: this.storefrontSign,
    entranceDoor: this.entranceDoor,
    streetLightPole: this.streetLightPole,
    streetLightGlow: this.streetLightGlow,
    streetLightIllumination: this.streetLightIllumination,
    streetLightDynamicReceiver: this.streetLightDynamicReceiver,
    streetLightCone: this.streetLightCone,
    streetFurnitureMetal: this.streetFurnitureMetal,
    streetFurnitureWood: this.streetFurnitureWood,
    streetFurnitureAccent: this.streetFurnitureAccent,
    shelterGlass: this.shelterGlass,
    waterfrontEdge: this.waterfrontEdge,
    signPanelWhite: this.signPanelWhite,
    signPanelGreen: this.signPanelGreen,
    signPanelBlue: this.signPanelBlue,
    transitStop: this.transitStop,
    vehicleBody: this.vehicleBody[0]
  };

  /**
   * 0 = full day, 1 = full night. Drives lit building windows, vehicle light
   * brightness, the window glow overlays, and street light effect sprites
   * (which must be invisible while the sun is up).
   */
  setNightFactor(factor: number): void {
    const night = THREE.MathUtils.clamp(factor, 0, 1);

    this.nightFactor = night;
    this.buildingWindowUniforms.uCityNight.value = night;
    this.windowGlow.opacity = night * 0.88;
    this.windowGlow.visible = night > 0.01;
    this.vehicleHeadlight.emissiveIntensity = 0.9 + night * 3.4;
    this.vehicleTaillight.emissiveIntensity = 0.8 + night * 2.6;
    this.taxiSign.emissiveIntensity = 0.7 + night * 2.2;
    this.streetLightGlow.opacity = night * 0.85;
    this.streetLightIllumination.opacity = night * 0.08;
    this.streetLightDynamicReceiver.opacity = night * 0.12;
    this.streetLightCone.opacity = night * this.weatherConeOpacity * 0.45;
  }

  applyWeatherPreset(preset: WeatherPreset): void {
    const wetness = preset.surfaceWetness;
    this.asphalt.color.lerpColors(new THREE.Color(0x22282d), new THREE.Color(0x171c21), wetness);
    this.asphalt.roughness = 0.88 - wetness * 0.18;
    this.plazaHardscape.color.lerpColors(new THREE.Color(0xc8c0ad), new THREE.Color(0xaeb0aa), wetness * 0.55);
    this.plazaHardscape.roughness = 0.8 - wetness * 0.1;
    this.water.color.lerpColors(new THREE.Color(0x2c6f86), new THREE.Color(0x24596d), preset.cloudCover * 0.45);
    this.water.roughness = 0.28 + preset.precipitationIntensity * 0.18;
    this.water.opacity = 0.82 + Math.min(preset.precipitationIntensity * 0.08, 0.1);
    this.storefrontGlass.roughness = 0.2 + wetness * 0.08;

    const fogScattering = THREE.MathUtils.clamp(1.0 - preset.visibilityMeters / 10000, 0, 1);
    const rainScattering = preset.precipitationIntensity * 0.28;
    const totalScattering = Math.min(0.6, fogScattering + rainScattering);
    this.weatherConeOpacity = 0.14 + totalScattering * 0.25;
    this.streetLightCone.opacity = this.nightFactor * this.weatherConeOpacity;
  }

  getMaterialForZone(zoneId: string, fallbackMaterial?: string): THREE.Material {
    return this.materialByZone[zoneId] ?? this.getFallbackMaterial(fallbackMaterial);
  }

  getFallbackMaterial(fallbackMaterial?: string): THREE.Material {
    return (fallbackMaterial && this.materialByFallbackName[fallbackMaterial]) || this.overlay;
  }

  getBuildingMassMaterials(): THREE.Material[] {
    return [
      this.building,
      this.building,
      this.rooftop,
      this.building,
      this.building,
      this.building
    ];
  }

  getBuildingColor(building: BuildingPlan): THREE.Color {
    const hash = hashString(`${building.id}:${building.facadeGrammar.materialPaletteId}:${building.typology.kind}`);
    const palette = getBuildingPalette(building);
    const color = new THREE.Color(palette[hash % palette.length]);
    const heightLift = Math.min(building.heightMeters / 180, 0.14);
    const hueShift = normalizedHash(hash, 7) * 0.028;
    const saturationShift = normalizedHash(hash, 13) * 0.08;
    const lightnessShift = normalizedHash(hash, 19) * 0.1 + heightLift;

    color.offsetHSL(hueShift, saturationShift, lightnessShift);

    // Pull saturation toward neutral; raw palette tints read as plastic toys.
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    color.setHSL(hsl.h, hsl.s * 0.72, hsl.l);
    return color;
  }

  dispose(): void {
    this.terrain.dispose();
    this.asphalt.dispose();
    this.lanePaint.dispose();
    this.tactilePaving.dispose();
    this.refugeIsland.dispose();
    this.trafficCalming.dispose();
    this.park.dispose();
    this.plazaHardscape.dispose();
    this.concrete.dispose();
    this.brick.dispose();
    this.metal.dispose();
    this.utility.dispose();
    this.overlay.dispose();
    this.treeTrunk.dispose();
    this.treeCanopy.dispose();
    this.treeTrunkInstanced.dispose();
    this.treeCanopyInstanced.dispose();
    this.understoryFoliage.dispose();
    this.water.dispose();
    this.buildingFacadeTexture.dispose();
    this.buildingFacadeBumpTexture.dispose();
    this.roofTexture.dispose();
    this.building.dispose();
    this.rooftop.dispose();
    this.roofSolarPanel.dispose();
    this.roofGreen.dispose();
    this.roofTerrace.dispose();
    this.windowGlow.dispose();
    this.storefrontGlass.dispose();
    this.facadeFrame.dispose();
    this.facadeBalcony.dispose();
    this.storefrontAwning.dispose();
    this.storefrontSign.dispose();
    this.entranceDoor.dispose();
    this.streetLightPole.dispose();
    this.streetLightGlow.dispose();
    this.streetLightIllumination.dispose();
    this.streetLightDynamicReceiver.dispose();
    this.streetLightCone.dispose();
    this.streetFurnitureMetal.dispose();
    this.streetFurnitureWood.dispose();
    this.streetFurnitureAccent.dispose();
    this.shelterGlass.dispose();
    this.waterfrontEdge.dispose();
    this.signPanelWhite.dispose();
    this.signPanelGreen.dispose();
    this.signPanelBlue.dispose();
    this.transitStop.dispose();

    for (const material of this.vehicleBody) {
      material.dispose();
    }

    for (const material of this.vehiclePaint) {
      material.dispose();
    }

    this.taxiPaint.dispose();
    this.vehicleGlass.dispose();
    this.vehicleTire.dispose();
    this.vehicleWheelHub.dispose();
    this.vehicleTrim.dispose();
    this.vehicleHeadlight.dispose();
    this.vehicleTaillight.dispose();
    this.taxiSign.dispose();
    this.terrainTexture.dispose();
  }

  /**
   * Procedural window grid computed in world space so windows keep a constant
   * ~2.5m x 3.1m rhythm on every instanced building mass regardless of its
   * scale. Windows render as dark glass by day and a random subset emits warm
   * light at night (uCityNight).
   */
  private setupBuildingWindowShader(material: THREE.MeshStandardMaterial): void {
    const uniforms = this.buildingWindowUniforms;

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uCityNight = uniforms.uCityNight;
      shader.uniforms.uCityWindowGlow = uniforms.uCityWindowGlow;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vCityWorldPos;
         varying vec3 vCityNormal;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         #ifdef USE_INSTANCING
           vCityWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
           vCityNormal = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
         #else
           vCityWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
           vCityNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
         #endif`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vCityWorldPos;
         varying vec3 vCityNormal;
         uniform float uCityNight;
         uniform float uCityWindowGlow;

         float cityHash(vec3 p) {
           return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
         }`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float cityWindowMask = 0.0;
         vec3 cityWindowEmit = vec3(0.0);
         {
           vec3 cityN = normalize(vCityNormal);
           if (abs(cityN.y) < 0.5) {
             bool cityUseX = abs(cityN.x) > abs(cityN.z);
             float facadeU = cityUseX ? vCityWorldPos.z : vCityWorldPos.x;
             float planeCoord = cityUseX ? vCityWorldPos.x : vCityWorldPos.z;
             vec2 cityCell = vec2(floor(facadeU / 2.5), floor(vCityWorldPos.y / 3.1));
             vec2 cityUv = vec2(fract(facadeU / 2.5), fract(vCityWorldPos.y / 3.1));
             // Fade the window grid out when cells shrink below a few pixels,
             // otherwise distant facades alias into glittering noise.
             float cityDetailFade = 1.0 - smoothstep(0.12, 0.45, fwidth(facadeU / 2.5) + fwidth(vCityWorldPos.y / 3.1));
             float facadeSeed = floor(planeCoord * 3.0) + (cityUseX ? 31.0 : 57.0);
             float storefront = 1.0 - step(3.6, vCityWorldPos.y);

             float upperWindow = step(0.26, cityUv.x) * step(cityUv.x, 0.74)
               * step(0.34, cityUv.y) * step(cityUv.y, 0.8)
               * (1.0 - storefront) * cityDetailFade;
             float storefrontGlass = storefront
               * step(0.1, cityUv.x) * step(cityUv.x, 0.9)
               * step(0.5, vCityWorldPos.y) * (1.0 - step(3.0, vCityWorldPos.y))
               * cityDetailFade;

             vec3 glassTint = mix(vec3(0.18, 0.23, 0.29), vec3(0.34, 0.42, 0.5), cityHash(vec3(cityCell, 4.7)));
             diffuseColor.rgb = mix(diffuseColor.rgb, glassTint, upperWindow);
             diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.08, 0.1), storefrontGlass);
             diffuseColor.rgb *= mix(1.0, 0.6, storefront * (1.0 - storefrontGlass));

             float litSeed = cityHash(vec3(cityCell, facadeSeed));
             float litShare = 0.14 + 0.18 * cityHash(vec3(facadeSeed, cityCell.y, 9.3));
             float upperLit = upperWindow * step(litSeed, litShare) * uCityNight;
             float storefrontLit = storefrontGlass * step(cityHash(vec3(cityCell, 8.2)), 0.3) * uCityNight;

             vec3 warm = mix(vec3(1.0, 0.6, 0.3), vec3(1.0, 0.87, 0.64), cityHash(vec3(cityCell, facadeSeed + 2.0)));
             cityWindowMask = max(upperWindow, storefrontGlass);
             cityWindowEmit = warm * max(upperLit, storefrontLit);
             // Distant facades: smooth aggregate glow instead of aliased windows.
             cityWindowEmit += vec3(1.0, 0.78, 0.5) * litShare * (1.0 - cityDetailFade) * (1.0 - storefront) * 1.05 * uCityNight;
           }
         }`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         roughnessFactor = mix(roughnessFactor, 0.22, cityWindowMask);`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         totalEmissiveRadiance += cityWindowEmit * uCityWindowGlow;`
      );
    };
  }

  private setupClippingShader(material: THREE.Material): void {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         attribute vec4 aClipPlane;
         varying vec4 vClipPlane;
         varying vec3 vClipWorldPosition;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vClipPlane = aClipPlane;
         #ifdef USE_INSTANCING
           vClipWorldPosition = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
         #else
           vClipWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
         #endif`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         varying vec4 vClipPlane;
         varying vec3 vClipWorldPosition;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `void main() {
         if (vClipPlane.w > 0.5) {
           if (vClipWorldPosition.x * vClipPlane.x + vClipWorldPosition.z * vClipPlane.y + vClipPlane.z > 0.0) {
             discard;
           }
         }`
      );
    };
  }

}

function createVehiclePaint(color: THREE.ColorRepresentation): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.32,
    metalness: 0.12,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18
  });
}

function createTerrainTexture(): THREE.DataTexture {
  const size = 256;
  const texture = createDataTexture(size, size, (x, y) => {
    const coarse = signedNoise(x >> 4, y >> 4, 5);
    const medium = signedNoise(x >> 2, y >> 2, 23);
    const grain = signedNoise(x, y, 71);
    const blend = coarse * 0.55 + medium * 0.3 + grain * 0.15;

    // Two-tone grass: deep green with drier olive patches.
    const r = 72 + blend * 14 + Math.max(0, coarse) * 16;
    const g = 92 + blend * 16 + Math.max(0, coarse) * 10;
    const b = 58 + blend * 9;

    return [r, g, b, 255];
  });

  texture.name = 'ProceduralTerrainAlbedo';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(64, 64);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createFacadeTexture(): THREE.DataTexture {
  const texture = createDataTexture(FACADE_TEXTURE_WIDTH, FACADE_TEXTURE_HEIGHT, (x, y) => {
    const cellWidth = 32;
    const cellHeight = 32;
    const column = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);
    const inColumn = x % cellWidth;
    const inRow = y % cellHeight;
    const noise = signedNoise(x, y, 11) * 10;
    const panelJoint = inColumn < 2 || inRow < 2;
    const mullion = inColumn === 15 || inColumn === 16;
    const window = inColumn >= 7 && inColumn <= 24 && inRow >= 8 && inRow <= 24;

    if (window) {
      const lit = hashGrid(column, row, 43) % 7 === 0;
      const highlight = inColumn < 10 || inRow < 11 ? 14 : 0;

      return lit
        ? [204 + highlight, 172 + highlight, 112 + highlight, 255]
        : [52 + highlight, 82 + highlight, 94 + highlight, 255];
    }

    if (mullion) {
      return [112 + noise, 117 + noise, 116 + noise, 255];
    }

    if (panelJoint) {
      return [154 + noise, 150 + noise, 142 + noise, 255];
    }

    return [214 + noise, 208 + noise, 194 + noise, 255];
  });

  texture.name = 'ProceduralBuildingFacadeAlbedo';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createFacadeBumpTexture(): THREE.DataTexture {
  const texture = createDataTexture(FACADE_TEXTURE_WIDTH, FACADE_TEXTURE_HEIGHT, (x, y) => {
    const cellWidth = 32;
    const cellHeight = 32;
    const inColumn = x % cellWidth;
    const inRow = y % cellHeight;
    const recessedWindow = inColumn >= 7 && inColumn <= 24 && inRow >= 8 && inRow <= 24;
    const raisedFrame = inColumn === 6 || inColumn === 25 || inRow === 7 || inRow === 25;
    const panelJoint = inColumn < 2 || inRow < 2;
    const value = recessedWindow ? 76 : raisedFrame ? 190 : panelJoint ? 106 : 142 + signedNoise(x, y, 97) * 8;

    return [value, value, value, 255];
  });

  texture.name = 'ProceduralBuildingFacadeBump';
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createRoofTexture(): THREE.DataTexture {
  const texture = createDataTexture(ROOF_TEXTURE_SIZE, ROOF_TEXTURE_SIZE, (x, y) => {
    const seam = x % 42 < 2 || y % 38 < 2;
    const hatch = (x + y) % 17 === 0;
    const equipmentPad = isInRect(x, y, 38, 44, 44, 30) || isInRect(x, y, 152, 134, 54, 38);
    const drain = isInRect(x, y, 109, 204, 8, 8) || isInRect(x, y, 214, 74, 8, 8);
    const noise = signedNoise(x, y, 29) * 12;

    if (equipmentPad) {
      return [112 + noise, 118 + noise, 118 + noise, 255];
    }
    if (drain) {
      return [66, 72, 72, 255];
    }
    if (seam) {
      return [124 + noise, 121 + noise, 113 + noise, 255];
    }
    if (hatch) {
      return [160 + noise, 157 + noise, 148 + noise, 255];
    }

    return [145 + noise, 142 + noise, 133 + noise, 255];
  });

  texture.name = 'ProceduralBuildingRoofAlbedo';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createDataTexture(
  width: number,
  height: number,
  sampler: (x: number, y: number) => readonly [number, number, number, number]
): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const [r, g, b, a] = sampler(x, y);

      data[offset] = clampByte(r);
      data[offset + 1] = clampByte(g);
      data[offset + 2] = clampByte(b);
      data[offset + 3] = clampByte(a);
    }
  }

  return new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
}

function getBuildingPalette(building: BuildingPlan): readonly THREE.ColorRepresentation[] {
  if (building.typology.kind === 'industrial' || building.typology.kind === 'warehouse') {
    return [0x879397, 0x6e8186, 0x978f80, 0x7e878b, 0x75665d, 0xa79f91];
  }

  if (building.typology.kind === 'civic' || building.district === 'civic') {
    return [0xc8bea7, 0xb1a78d, 0xd3d0c2, 0xaeb9b1, 0xc0b8a8, 0xd0c7b1];
  }

  if (building.typology.kind === 'mixed-use' || building.typology.kind === 'retail' || building.typology.kind === 'hospitality') {
    return [0xb6785f, 0xc29b73, 0x8da1a9, 0xd0c5ae, 0x9d8f7c, 0xa65f54, 0xb7b9aa];
  }

  switch (building.district) {
    case 'downtown':
      return [0xaeb8bf, 0x8fa2ab, 0xc8c2b6, 0x7f929d, 0xb6a893, 0xa9b3a8, 0x8f8880];
    case 'residential':
      return [0xd0c2a7, 0xc49f80, 0xb9856f, 0xd4d0bf, 0xb1bdad, 0xaeb7c9, 0xe0d0b8];
    case 'industrial':
      return [0x879397, 0x6e8186, 0x978f80, 0x7e878b, 0x75665d, 0xa79f91];
    case 'waterfront':
      return [0x9db9bf, 0xb8c8c1, 0xd1c9b5, 0x88a2ad, 0xb7b7ad, 0xd7d4c4];
  }
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function hashGrid(x: number, y: number, salt: number): number {
  let hash = Math.imul(x + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y + salt, 0xc2b2ae35);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x27d4eb2d);
  hash ^= hash >>> 15;
  return hash >>> 0;
}

function signedNoise(x: number, y: number, salt: number): number {
  return (hashGrid(x, y, salt) / 0xffffffff) * 2 - 1;
}

function normalizedHash(hash: number, shift: number): number {
  return (((hash >>> shift) & 0xff) / 255) * 2 - 1;
}

function isInRect(x: number, y: number, originX: number, originY: number, width: number, height: number): boolean {
  return x >= originX && x < originX + width && y >= originY && y < originY + height;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
