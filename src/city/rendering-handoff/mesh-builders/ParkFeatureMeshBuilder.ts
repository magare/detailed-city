import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { ParkFeature } from '../../../types/city';
import { hashString } from '../../../utils/random';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';
import { withWhiteVertexColors } from './instancedColorGeometry';

interface UnderstoryInstance {
  readonly feature: ParkFeature;
  readonly center: { readonly x: number; readonly z: number };
  readonly radius: number;
  readonly height: number;
  readonly color: THREE.Color;
}

export class ParkFeatureMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(features: readonly ParkFeature[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ParkFeatures';

    this.addFeatureBatch(group, features, 'lawn', 'ParkFeatureLawnInstances', 'park-lawn', 0.18);
    this.addFeatureBatch(group, features, 'path', 'ParkFeaturePathInstances', 'park-path', 0.24);
    this.addFeatureBatch(group, features, 'planting', 'ParkFeaturePlantingInstances', 'park-planting', 0.34);
    this.addFeatureBatch(group, features, 'sports', 'ParkFeatureSportsInstances', 'park-sports', 0.28);
    this.addFeatureBatch(group, features, 'seating', 'ParkFeatureSeatingInstances', 'park-seating', 0.38);
    this.addFeatureBatch(group, features, 'water-feature', 'ParkFeatureWaterInstances', 'park-water-feature', 0.2);
    this.addFeatureBatch(group, features, 'shade', 'ParkFeatureShadeInstances', 'park-shade', 1.6);
    this.addGrassTufts(group, features);
    this.addShrubClusters(group, features);

    return group;
  }

  private addFeatureBatch(
    group: THREE.Group,
    features: readonly ParkFeature[],
    featureKind: ParkFeature['featureKind'],
    name: string,
    materialZone: string,
    heightMeters: number
  ): void {
    const items = features.filter((feature) => feature.featureKind === featureKind);

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

  private addGrassTufts(group: THREE.Group, features: readonly ParkFeature[]): void {
    const instances = features
      .filter((feature) => feature.featureKind === 'lawn')
      .flatMap((feature) => createGrassInstances(feature));

    if (instances.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      withWhiteVertexColors(new THREE.ConeGeometry(1, 1, 5)),
      this.materials.understoryFoliage,
      instances.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'ParkFeatureGrassTuftInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    instances.forEach((instance, index) => {
      matrix.compose(
        new THREE.Vector3(instance.center.x, 0.3 + instance.height / 2, instance.center.z),
        rotation,
        new THREE.Vector3(instance.radius, instance.height, instance.radius)
      );
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, instance.color);
    });
    finishVegetationMesh(mesh, instances, this.metadataByObjectId);
    group.add(mesh);
  }

  private addShrubClusters(group: THREE.Group, features: readonly ParkFeature[]): void {
    const instances = features
      .filter((feature) => feature.featureKind === 'planting' || feature.featureKind === 'shade')
      .flatMap((feature) => createShrubInstances(feature));

    if (instances.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      withWhiteVertexColors(new THREE.DodecahedronGeometry(1, 0)),
      this.materials.understoryFoliage,
      instances.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'ParkFeatureShrubInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    instances.forEach((instance, index) => {
      matrix.compose(
        new THREE.Vector3(instance.center.x, 0.32 + instance.height, instance.center.z),
        rotation,
        new THREE.Vector3(instance.radius, instance.height, instance.radius * 0.82)
      );
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, instance.color);
    });
    finishVegetationMesh(mesh, instances, this.metadataByObjectId);
    group.add(mesh);
  }
}

function createGrassInstances(feature: ParkFeature): UnderstoryInstance[] {
  const count = Math.min(130, Math.max(18, Math.floor((feature.size.x * feature.size.z) / 46)));

  return Array.from({ length: count }, (_, index) => {
    const tone = normalizedHash(`${feature.id}:${index}:tone`);
    const color = new THREE.Color(tone > 0.68 ? 0x8da94f : tone > 0.36 ? 0x5f8c4a : 0x4f7a3e);
    color.offsetHSL(0, -0.03, (normalizedHash(`${feature.id}:${index}:light`) - 0.58) * 0.1);

    return {
      feature,
      center: createFeaturePoint(feature, index, 0.86),
      radius: 0.12 + normalizedHash(`${feature.id}:${index}:radius`) * 0.2,
      height: 0.28 + normalizedHash(`${feature.id}:${index}:height`) * 0.38,
      color
    };
  });
}

function createShrubInstances(feature: ParkFeature): UnderstoryInstance[] {
  const density = feature.featureKind === 'shade' ? 78 : 16;
  const count = Math.min(52, Math.max(feature.featureKind === 'shade' ? 5 : 12, Math.floor((feature.size.x * feature.size.z) / density)));

  return Array.from({ length: count }, (_, index) => {
    const flowering = feature.featureKind === 'planting' && normalizedHash(`${feature.id}:${index}:flower`) > 0.72;
    const color = new THREE.Color(flowering ? 0x849f4d : 0x4f8746);
    color.offsetHSL(
      (normalizedHash(`${feature.id}:${index}:hue`) - 0.5) * 0.045,
      (normalizedHash(`${feature.id}:${index}:sat`) - 0.58) * 0.14,
      (normalizedHash(`${feature.id}:${index}:light`) - 0.6) * 0.12
    );

    return {
      feature,
      center: createFeaturePoint(feature, index, 0.78),
      radius: 0.32 + normalizedHash(`${feature.id}:${index}:radius`) * 0.58,
      height: 0.24 + normalizedHash(`${feature.id}:${index}:height`) * 0.42,
      color
    };
  });
}

function createFeaturePoint(
  feature: ParkFeature,
  index: number,
  usableRatio: number
): { readonly x: number; readonly z: number } {
  return {
    x: roundMeters(feature.center.x + (normalizedHash(`${feature.id}:${index}:x`) - 0.5) * feature.size.x * usableRatio),
    z: roundMeters(feature.center.z + (normalizedHash(`${feature.id}:${index}:z`) - 0.5) * feature.size.z * usableRatio)
  };
}

function finishVegetationMesh(
  mesh: THREE.InstancedMesh,
  instances: readonly UnderstoryInstance[],
  metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
): void {
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor!.needsUpdate = true;
  attachCityPickingInstanceMetadata(
    mesh,
    instances.map((instance) => metadataByObjectId[instance.feature.id] ?? createCityPickingMetadata(instance.feature))
  );
}

function normalizedHash(key: string): number {
  return hashString(key) / 0xffffffff;
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
