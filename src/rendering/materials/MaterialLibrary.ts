import * as THREE from 'three';
import type { MaterialZoneId } from '../../city/rendering-handoff/material-zones/materialZoneDefinitions';
import type { DistrictKind, WeatherPreset } from '../../types/city';

export class MaterialLibrary {
  readonly terrain = new THREE.MeshStandardMaterial({
    color: 0x4c6845,
    roughness: 0.92
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
    roughness: 0.62,
    metalness: 0.08,
    vertexColors: true
  });

  readonly rooftop = new THREE.MeshStandardMaterial({
    color: 0x6f7376,
    roughness: 0.78,
    metalness: 0.12
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
    opacity: 0.72
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
    overlay: this.overlay,
    treeTrunk: this.treeTrunk,
    treeCanopy: this.treeCanopy,
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
  }

  getMaterialForZone(zoneId: string, fallbackMaterial?: string): THREE.Material {
    return this.materialByZone[zoneId] ?? this.getFallbackMaterial(fallbackMaterial);
  }

  getFallbackMaterial(fallbackMaterial?: string): THREE.Material {
    return (fallbackMaterial && this.materialByFallbackName[fallbackMaterial]) || this.overlay;
  }

  getBuildingColor(district: DistrictKind, height: number): THREE.Color {
    const color = new THREE.Color(this.baseDistrictColor(district));
    const lift = Math.min(height / 140, 0.32);
    color.offsetHSL(0, -0.04, lift);
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
    this.water.dispose();
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
  }

  private baseDistrictColor(district: DistrictKind): THREE.ColorRepresentation {
    switch (district) {
      case 'downtown':
        return 0xaeb8bf;
      case 'residential':
        return 0xc0b8a8;
      case 'industrial':
        return 0x8f989b;
      case 'waterfront':
        return 0xa6bdc4;
      case 'civic':
        return 0xb9b09a;
    }
  }
}
