import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { GreenStormwaterFeature } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class GreenStormwaterMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(features: readonly GreenStormwaterFeature[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'GreenStormwaterFeatures';

    this.addFeatureBatch(group, features, ['rain-garden', 'bioswale', 'flow-through-planter', 'pervious-strip', 'tree-trench'], 'GreenStormwaterPlantingInstances', 'green-stormwater-planting', 0.22);
    this.addFeatureBatch(group, features, ['permeable-pavement'], 'GreenStormwaterPermeablePavingInstances', 'green-stormwater-permeable', 0.08);
    this.addFeatureBatch(group, features, ['curb-cut'], 'GreenStormwaterCurbCutInstances', 'green-stormwater-curb-cut', 0.1);
    this.addCurbCutMarkers(group, features.filter((feature) => feature.featureKind === 'curb-cut'));

    return group;
  }

  private addFeatureBatch(
    group: THREE.Group,
    features: readonly GreenStormwaterFeature[],
    featureKinds: readonly GreenStormwaterFeature['featureKind'][],
    name: string,
    materialZone: string,
    heightMeters: number
  ): void {
    const items = features.filter((feature) => featureKinds.includes(feature.featureKind));

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
    mesh.receiveShadow = true;
    items.forEach((feature, index) => {
      matrix.compose(
        new THREE.Vector3(feature.center.x, heightMeters / 2 + 0.08, feature.center.z),
        rotation,
        new THREE.Vector3(feature.size.x, heightMeters, feature.size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, items, this.metadataByObjectId);
    group.add(mesh);
  }

  private addCurbCutMarkers(group: THREE.Group, curbCuts: readonly GreenStormwaterFeature[]): void {
    if (curbCuts.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('water'),
      curbCuts.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'GreenStormwaterCurbCutFlowMarkers';
    curbCuts.forEach((feature, index) => {
      matrix.compose(
        new THREE.Vector3(feature.center.x, 0.18, feature.center.z),
        rotation,
        new THREE.Vector3(Math.max(0.2, feature.size.x * 0.55), 0.08, Math.max(0.2, feature.size.z * 0.55))
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, curbCuts, this.metadataByObjectId);
    group.add(mesh);
  }
}

function finishInstancedMesh(
  mesh: THREE.InstancedMesh,
  items: readonly GreenStormwaterFeature[],
  metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
): void {
  mesh.instanceMatrix.needsUpdate = true;
  attachCityPickingInstanceMetadata(
    mesh,
    items.map((item) => metadataByObjectId[item.id] ?? createCityPickingMetadata(item))
  );
}
