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
    this.park.dispose();
    this.treeTrunk.dispose();
    this.treeCanopy.dispose();
    this.water.dispose();
    this.building.dispose();
    this.rooftop.dispose();
    this.windowGlow.dispose();

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
