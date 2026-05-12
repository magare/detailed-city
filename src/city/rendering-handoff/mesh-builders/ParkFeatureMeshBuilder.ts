import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { ParkFeature } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class ParkFeatureMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(features: readonly ParkFeature[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ParkFeatures';

    this.addFeatureBatch(group, features, 'lawn', 'ParkFeatureLawnInstances', this.materials.park, 0.18);
    this.addFeatureBatch(group, features, 'path', 'ParkFeaturePathInstances', this.materials.refugeIsland, 0.24);
    this.addFeatureBatch(group, features, 'planting', 'ParkFeaturePlantingInstances', this.materials.treeCanopy, 0.34);
    this.addFeatureBatch(group, features, 'sports', 'ParkFeatureSportsInstances', this.materials.signPanelBlue, 0.28);
    this.addFeatureBatch(group, features, 'seating', 'ParkFeatureSeatingInstances', this.materials.streetFurnitureWood, 0.38);
    this.addFeatureBatch(group, features, 'water-feature', 'ParkFeatureWaterInstances', this.materials.water, 0.2);
    this.addFeatureBatch(group, features, 'shade', 'ParkFeatureShadeInstances', this.materials.streetFurnitureMetal, 1.6);

    return group;
  }

  private addFeatureBatch(
    group: THREE.Group,
    features: readonly ParkFeature[],
    featureKind: ParkFeature['featureKind'],
    name: string,
    material: THREE.Material,
    heightMeters: number
  ): void {
    const items = features.filter((feature) => feature.featureKind === featureKind);

    if (items.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, items.length);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = name;
    mesh.receiveShadow = true;
    mesh.castShadow = featureKind === 'shade';

    items.forEach((feature, index) => {
      matrix.compose(
        new THREE.Vector3(feature.center.x, heightMeters / 2 + 0.12, feature.center.z),
        rotation,
        new THREE.Vector3(feature.size.x, heightMeters, feature.size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(
      mesh,
      items.map((feature) => this.metadataByObjectId[feature.id] ?? createCityPickingMetadata(feature))
    );
    group.add(mesh);
  }
}
