import * as THREE from 'three';
import type { DistrictKind } from '../../types/city';

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

  readonly vehicleBody = [
    new THREE.MeshStandardMaterial({ color: 0xbc3d36, roughness: 0.54 }),
    new THREE.MeshStandardMaterial({ color: 0xf0c14b, roughness: 0.52 }),
    new THREE.MeshStandardMaterial({ color: 0xd8dee8, roughness: 0.48 }),
    new THREE.MeshStandardMaterial({ color: 0x2e6a9e, roughness: 0.55 })
  ] as const;

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
    this.treeTrunk.dispose();
    this.treeCanopy.dispose();
    this.water.dispose();
    this.building.dispose();
    this.rooftop.dispose();
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
