import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { GreenStormwaterFeature } from '../../../types/city';
import { hashString } from '../../../utils/random';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';
import { withWhiteVertexColors } from './instancedColorGeometry';

interface StormwaterVegetationInstance {
  readonly feature: GreenStormwaterFeature;
  readonly center: { readonly x: number; readonly z: number };
  readonly radius: number;
  readonly height: number;
  readonly color: THREE.Color;
}

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
    this.addUnderstoryPlantings(group, features);
    this.addReedPlantings(group, features);

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

  private addUnderstoryPlantings(group: THREE.Group, features: readonly GreenStormwaterFeature[]): void {
    const instances = features
      .filter((feature) => feature.featureKind !== 'curb-cut' && feature.featureKind !== 'permeable-pavement')
      .flatMap((feature) => createStormwaterUnderstoryInstances(feature));

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

    mesh.name = 'GreenStormwaterUnderstoryInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    instances.forEach((instance, index) => {
      matrix.compose(
        new THREE.Vector3(instance.center.x, 0.22 + instance.height, instance.center.z),
        rotation,
        new THREE.Vector3(instance.radius, instance.height, instance.radius * 0.78)
      );
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, instance.color);
    });
    finishVegetationMesh(mesh, instances, this.metadataByObjectId);
    group.add(mesh);
  }

  private addReedPlantings(group: THREE.Group, features: readonly GreenStormwaterFeature[]): void {
    const instances = features
      .filter((feature) => feature.featureKind === 'bioswale' || feature.featureKind === 'rain-garden')
      .flatMap((feature) => createStormwaterReedInstances(feature));

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

    mesh.name = 'GreenStormwaterReedInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    instances.forEach((instance, index) => {
      matrix.compose(
        new THREE.Vector3(instance.center.x, 0.22 + instance.height / 2, instance.center.z),
        rotation,
        new THREE.Vector3(instance.radius, instance.height, instance.radius)
      );
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, instance.color);
    });
    finishVegetationMesh(mesh, instances, this.metadataByObjectId);
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

function createStormwaterUnderstoryInstances(feature: GreenStormwaterFeature): StormwaterVegetationInstance[] {
  const count = Math.min(22, Math.max(5, Math.floor((feature.size.x * feature.size.z) / 2.6)));

  return Array.from({ length: count }, (_, index) => {
    const flowering = feature.featureKind === 'rain-garden' && normalizedHash(`${feature.id}:${index}:flower`) > 0.66;
    const color = new THREE.Color(flowering ? 0x829d4d : 0x4d8645);
    color.offsetHSL(
      (normalizedHash(`${feature.id}:${index}:hue`) - 0.5) * 0.04,
      (normalizedHash(`${feature.id}:${index}:sat`) - 0.58) * 0.14,
      (normalizedHash(`${feature.id}:${index}:light`) - 0.6) * 0.12
    );

    return {
      feature,
      center: createFeaturePoint(feature, index, 0.82),
      radius: 0.18 + normalizedHash(`${feature.id}:${index}:radius`) * 0.28,
      height: 0.18 + normalizedHash(`${feature.id}:${index}:height`) * 0.28,
      color
    };
  });
}

function createStormwaterReedInstances(feature: GreenStormwaterFeature): StormwaterVegetationInstance[] {
  const count = Math.min(24, Math.max(6, Math.floor((feature.size.x * feature.size.z) / 2.4)));

  return Array.from({ length: count }, (_, index) => {
    const color = new THREE.Color(normalizedHash(`${feature.id}:${index}:tone`) > 0.5 ? 0x778d45 : 0x5c8241);

    return {
      feature,
      center: createFeaturePoint(feature, index + 41, 0.72),
      radius: 0.06 + normalizedHash(`${feature.id}:${index}:radius`) * 0.08,
      height: 0.42 + normalizedHash(`${feature.id}:${index}:height`) * 0.62,
      color
    };
  });
}

function createFeaturePoint(
  feature: GreenStormwaterFeature,
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
  instances: readonly StormwaterVegetationInstance[],
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
