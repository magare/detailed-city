import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { CurbActivation } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class CurbActivationMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(activations: readonly CurbActivation[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CurbActivations';

    this.addActivationBatch(group, activations, 'parklet', 'CurbActivationParkletInstances', 'park-seating', 0.2);
    this.addActivationBatch(group, activations, 'outdoor-dining', 'CurbActivationDiningInstances', 'plaza', 0.18);
    this.addActivationBatch(group, activations, 'temporary-seating-deck', 'CurbActivationDeckInstances', 'bench', 0.24);
    this.addActivationBatch(group, activations, 'interim-plaza', 'CurbActivationInterimPlazaInstances', 'storefront-awning', 0.16);
    this.addBarrierMarkers(group, activations);

    return group;
  }

  private addActivationBatch(
    group: THREE.Group,
    activations: readonly CurbActivation[],
    activationKind: CurbActivation['activationKind'],
    name: string,
    materialZone: string,
    heightMeters: number
  ): void {
    const items = activations.filter((activation) => activation.activationKind === activationKind);

    if (items.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone(materialZone),
      items.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    items.forEach((activation, index) => {
      const size = getBoundarySize(activation);
      matrix.compose(
        new THREE.Vector3(activation.center.x, heightMeters / 2 + 0.16, activation.center.z),
        rotation,
        new THREE.Vector3(size.x, heightMeters, size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, items, this.metadataByObjectId);
    group.add(mesh);
  }

  private addBarrierMarkers(group: THREE.Group, activations: readonly CurbActivation[]): void {
    if (activations.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('railing'),
      activations.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'CurbActivationBarrierInstances';
    mesh.castShadow = true;
    activations.forEach((activation, index) => {
      const size = getBoundarySize(activation);
      matrix.compose(
        new THREE.Vector3(activation.center.x, 0.62, activation.center.z),
        rotation,
        new THREE.Vector3(Math.max(0.18, size.x), 0.72, 0.12)
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, activations, this.metadataByObjectId);
    group.add(mesh);
  }
}

function getBoundarySize(activation: CurbActivation): { readonly x: number; readonly z: number } {
  const xs = activation.boundary.map((point) => point.x);
  const zs = activation.boundary.map((point) => point.z);

  return {
    x: Math.max(0.2, Math.max(...xs) - Math.min(...xs)),
    z: Math.max(0.2, Math.max(...zs) - Math.min(...zs))
  };
}

function finishInstancedMesh(
  mesh: THREE.InstancedMesh,
  items: readonly CurbActivation[],
  metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
): void {
  mesh.instanceMatrix.needsUpdate = true;
  attachCityPickingInstanceMetadata(
    mesh,
    items.map((item) => metadataByObjectId[item.id] ?? createCityPickingMetadata(item))
  );
}
