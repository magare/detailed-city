import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { StreetLight } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class StreetLightMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(streetLights: readonly StreetLight[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StreetLights';

    if (streetLights.length === 0) {
      return group;
    }

    const poleMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 8),
      this.materials.getMaterialForZone('street-light', 'streetLightPole'),
      streetLights.length
    );
    const fixtureMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('street-light', 'streetLightPole'),
      streetLights.length
    );
    const glowMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      this.materials.getMaterialForZone('street-light-glow', 'streetLightGlow'),
      streetLights.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const metadata = streetLights.map(
      (streetLight) => this.metadataByObjectId[streetLight.id] ?? createCityPickingMetadata(streetLight)
    );

    streetLights.forEach((streetLight, index) => {
      matrix.compose(
        new THREE.Vector3(streetLight.position.x, streetLight.heightMeters / 2, streetLight.position.z),
        rotation,
        new THREE.Vector3(streetLight.poleRadiusMeters, streetLight.heightMeters, streetLight.poleRadiusMeters)
      );
      poleMesh.setMatrixAt(index, matrix);

      matrix.compose(
        new THREE.Vector3(streetLight.position.x, streetLight.heightMeters, streetLight.position.z),
        rotation,
        new THREE.Vector3(streetLight.armLengthMeters, 0.18, streetLight.fixtureLengthMeters)
      );
      fixtureMesh.setMatrixAt(index, matrix);

      matrix.compose(
        new THREE.Vector3(streetLight.position.x, streetLight.heightMeters - 0.18, streetLight.position.z),
        rotation,
        new THREE.Vector3(
          0.32 + streetLight.nightLighting.emissiveIntensity * 0.16,
          0.32 + streetLight.nightLighting.emissiveIntensity * 0.16,
          0.32 + streetLight.nightLighting.emissiveIntensity * 0.16
        )
      );
      glowMesh.setMatrixAt(index, matrix);
    });

    poleMesh.name = 'StreetLightPoleInstances';
    fixtureMesh.name = 'StreetLightFixtureInstances';
    glowMesh.name = 'StreetLightGlowInstances';
    poleMesh.castShadow = true;
    fixtureMesh.castShadow = true;
    poleMesh.receiveShadow = true;
    fixtureMesh.receiveShadow = true;
    poleMesh.instanceMatrix.needsUpdate = true;
    fixtureMesh.instanceMatrix.needsUpdate = true;
    glowMesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(poleMesh, metadata);
    attachCityPickingInstanceMetadata(fixtureMesh, metadata);
    attachCityPickingInstanceMetadata(glowMesh, metadata);
    group.add(poleMesh, fixtureMesh, glowMesh);

    return group;
  }
}
