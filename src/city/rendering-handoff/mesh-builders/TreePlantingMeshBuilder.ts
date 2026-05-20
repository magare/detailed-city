import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { TreePlanting } from '../../../types/city';
import { hashString } from '../../../utils/random';
import { attachCityPickingInstanceMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';
import { withWhiteVertexColors } from './instancedColorGeometry';

type TreeVisualClass = 'broad' | 'medium' | 'narrow' | 'palm';
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export class TreePlantingMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(trees: readonly TreePlanting[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TreePlantings';

    if (trees.length === 0) {
      return group;
    }

    this.addTrunks(group, trees);
    this.addTreePitGroundcover(group, trees);
    this.addCanopyBatch(group, trees, 'broad', 'TreeCanopyBroadInstances', createBroadCanopyGeometry());
    this.addCanopyBatch(group, trees, 'medium', 'TreeCanopyMediumInstances', createMediumCanopyGeometry());
    this.addCanopyBatch(group, trees, 'narrow', 'TreeCanopyNarrowInstances', createNarrowCanopyGeometry());
    this.addCanopyBatch(group, trees, 'palm', 'TreeCanopyPalmInstances', createPalmCrownGeometry());

    return group;
  }

  private addTrunks(group: THREE.Group, trees: readonly TreePlanting[]): void {
    const trunkMesh = new THREE.InstancedMesh(
      withWhiteVertexColors(new THREE.CylinderGeometry(1, 1, 1, 7)),
      this.materials.treeTrunkInstanced,
      trees.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    trunkMesh.name = 'TreeTrunkInstances';
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;

    trees.forEach((tree, index) => {
      const trunkHeight = getTrunkHeight(tree);
      const trunkRadius = getTrunkRadius(tree);

      matrix.compose(
        new THREE.Vector3(tree.center.x, trunkHeight / 2, tree.center.z),
        rotation,
        new THREE.Vector3(trunkRadius, trunkHeight, trunkRadius)
      );
      trunkMesh.setMatrixAt(index, matrix);
      trunkMesh.setColorAt(index, getTrunkColor(tree));
    });

    trunkMesh.instanceMatrix.needsUpdate = true;
    trunkMesh.instanceColor!.needsUpdate = true;
    attachCityPickingInstanceMetadata(trunkMesh, this.getMetadata(trees));
    group.add(trunkMesh);
  }

  private addTreePitGroundcover(group: THREE.Group, trees: readonly TreePlanting[]): void {
    const mesh = new THREE.InstancedMesh(
      withWhiteVertexColors(new THREE.CylinderGeometry(1, 1, 1, 10)),
      this.materials.understoryFoliage,
      trees.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = 'TreePitGroundcoverInstances';
    mesh.receiveShadow = true;
    trees.forEach((tree, index) => {
      const radius = Math.max(0.42, Math.min(1.45, tree.canopyDiameter * 0.16));
      const height = tree.plantingContext === 'park' ? 0.1 : 0.14;

      matrix.compose(
        new THREE.Vector3(tree.center.x, 0.1, tree.center.z),
        rotation,
        new THREE.Vector3(radius, height, radius)
      );
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, getGroundcoverColor(tree));
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
    attachCityPickingInstanceMetadata(mesh, this.getMetadata(trees));
    group.add(mesh);
  }

  private addCanopyBatch(
    group: THREE.Group,
    trees: readonly TreePlanting[],
    visualClass: TreeVisualClass,
    name: string,
    geometry: THREE.BufferGeometry
  ): void {
    const items = trees.filter((tree) => getVisualClass(tree) === visualClass);

    if (items.length === 0) {
      geometry.dispose();
      return;
    }

    const mesh = new THREE.InstancedMesh(geometry, this.materials.treeCanopyInstanced, items.length);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    items.forEach((tree, index) => {
      const trunkHeight = getTrunkHeight(tree);
      const canopyHeight = getCanopyHeight(tree, trunkHeight);
      const canopyRadius = tree.canopyDiameter / 2;
      const xScale = canopyRadius * (0.92 + normalizedHash(`${tree.id}:canopy-x`) * 0.18);
      const zScale = canopyRadius * (0.9 + normalizedHash(`${tree.id}:canopy-z`) * 0.2);
      const yScale = getCanopyYScale(tree, canopyHeight);

      rotation.setFromAxisAngle(Y_AXIS, normalizedHash(`${tree.id}:canopy-rotation`) * Math.PI * 2);
      matrix.compose(
        new THREE.Vector3(tree.center.x, trunkHeight + yScale, tree.center.z),
        rotation,
        new THREE.Vector3(xScale, yScale, zScale)
      );
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, getCanopyColor(tree));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor!.needsUpdate = true;
    attachCityPickingInstanceMetadata(mesh, this.getMetadata(items));
    group.add(mesh);
  }

  private getMetadata(trees: readonly TreePlanting[]): CityPickingMetadata[] {
    return trees.map((tree) => {
      const pickingMetadata = this.metadataByObjectId[tree.id];

      if (!pickingMetadata) {
        throw new Error(`Missing picking metadata for ${tree.id}.`);
      }

      return pickingMetadata;
    });
  }
}

function createBroadCanopyGeometry(): THREE.BufferGeometry {
  return withWhiteVertexColors(roughenCanopyGeometry(new THREE.SphereGeometry(1, 14, 9), 0.13, 0.04));
}

function createMediumCanopyGeometry(): THREE.BufferGeometry {
  return withWhiteVertexColors(roughenCanopyGeometry(new THREE.IcosahedronGeometry(1, 2), 0.16, 0.06));
}

function createNarrowCanopyGeometry(): THREE.BufferGeometry {
  return withWhiteVertexColors(roughenCanopyGeometry(new THREE.ConeGeometry(1, 1.6, 9, 3), 0.08, 0.02));
}

function roughenCanopyGeometry(
  geometry: THREE.BufferGeometry,
  radialStrength: number,
  verticalStrength: number
): THREE.BufferGeometry {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const lobe =
      1 +
      Math.sin(vertex.x * 5.3 + vertex.y * 2.7 + vertex.z * 1.9) * radialStrength +
      Math.cos(vertex.z * 4.7 - vertex.y * 3.1) * radialStrength * 0.58;
    const vertical = 1 + Math.sin((vertex.x - vertex.z) * 3.6) * verticalStrength;

    positions.setXYZ(index, vertex.x * lobe, vertex.y * vertical, vertex.z * lobe);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createPalmCrownGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const frondCount = 10;

  for (let index = 0; index < frondCount; index += 1) {
    const angle = (Math.PI * 2 * index) / frondCount;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const side = new THREE.Vector3(-direction.z, 0, direction.x);
    const base = direction.clone().multiplyScalar(0.12).setY(0.2);
    const mid = direction.clone().multiplyScalar(0.62 + (index % 3) * 0.05).setY(-0.02 - (index % 2) * 0.05);
    const tip = direction.clone().multiplyScalar(1.08 + (index % 4) * 0.04).setY(-0.26 - (index % 3) * 0.04);
    const baseWidth = 0.14;
    const midWidth = 0.24;

    pushTriangle(
      positions,
      base.clone().addScaledVector(side, -baseWidth),
      base.clone().addScaledVector(side, baseWidth),
      mid.clone().addScaledVector(side, midWidth)
    );
    pushTriangle(
      positions,
      base.clone().addScaledVector(side, -baseWidth),
      mid.clone().addScaledVector(side, midWidth),
      mid.clone().addScaledVector(side, -midWidth)
    );
    pushTriangle(
      positions,
      mid.clone().addScaledVector(side, -midWidth),
      mid.clone().addScaledVector(side, midWidth),
      tip
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return withWhiteVertexColors(geometry);
}

function pushTriangle(positions: number[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void {
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

function getVisualClass(tree: TreePlanting): TreeVisualClass {
  if (tree.species === 'palm' || tree.canopyClass === 'palm') {
    return 'palm';
  }

  if (tree.canopyClass === 'broad') {
    return 'broad';
  }

  if (tree.canopyClass === 'narrow') {
    return 'narrow';
  }

  return 'medium';
}

function getTrunkHeight(tree: TreePlanting): number {
  return tree.species === 'palm' ? tree.height * 0.72 : tree.height * 0.4;
}

function getCanopyHeight(tree: TreePlanting, trunkHeight: number): number {
  return Math.max(1.2, tree.height - trunkHeight);
}

function getTrunkRadius(tree: TreePlanting): number {
  const speciesScale = tree.species === 'palm' ? 0.048 : 0.064;
  return Math.max(0.16, Math.min(0.48, tree.canopyDiameter * speciesScale));
}

function getCanopyYScale(tree: TreePlanting, canopyHeight: number): number {
  if (tree.species === 'palm') {
    return Math.max(0.42, canopyHeight * 0.24);
  }

  if (tree.canopyClass === 'broad') {
    return canopyHeight * 0.43;
  }

  if (tree.canopyClass === 'narrow') {
    return canopyHeight;
  }

  return canopyHeight * 0.48;
}

function getTrunkColor(tree: TreePlanting): THREE.Color {
  const color = new THREE.Color(tree.species === 'palm' ? 0x6f543a : 0x573724);
  color.offsetHSL(0, 0, (normalizedHash(`${tree.id}:bark`) - 0.5) * 0.12);
  return color;
}

function getCanopyColor(tree: TreePlanting): THREE.Color {
  const base = tree.species === 'rain-tree'
    ? 0x3f7f43
    : tree.species === 'palm'
      ? 0x527f44
      : tree.species === 'jacaranda'
        ? 0x447f5d
        : 0x66823c;
  const color = new THREE.Color(base);

  color.offsetHSL(
    (normalizedHash(`${tree.id}:hue`) - 0.5) * 0.035,
    (normalizedHash(`${tree.id}:sat`) - 0.62) * 0.1,
    (normalizedHash(`${tree.id}:light`) - 0.62) * 0.12
  );
  return color;
}

function getGroundcoverColor(tree: TreePlanting): THREE.Color {
  const base = tree.plantingContext === 'park' ? 0x5f8a3e : tree.plantingForm === 'raised-planter' ? 0x4f8a46 : 0x477a3d;
  const color = new THREE.Color(base);
  color.offsetHSL(
    (normalizedHash(`${tree.id}:ground-hue`) - 0.5) * 0.03,
    (normalizedHash(`${tree.id}:ground-sat`) - 0.55) * 0.08,
    (normalizedHash(`${tree.id}:ground-light`) - 0.55) * 0.08
  );
  return color;
}

function normalizedHash(key: string): number {
  return hashString(key) / 0xffffffff;
}
