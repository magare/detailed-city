import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { StreetFurniture } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class StreetFurnitureMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(streetFurniture: readonly StreetFurniture[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StreetFurniture';

    if (streetFurniture.length === 0) {
      return group;
    }

    this.addBenches(group, filterFurniture(streetFurniture, 'bench'));
    this.addBins(group, filterFurniture(streetFurniture, 'bin'));
    this.addBikeRacks(group, filterFurniture(streetFurniture, 'bike-rack'));
    this.addBollards(group, filterFurniture(streetFurniture, 'bollard'));
    this.addKiosks(group, filterFurniture(streetFurniture, 'kiosk'));
    this.addBusShelters(group, filterFurniture(streetFurniture, 'bus-shelter'));
    this.addSigns(group, streetFurniture.filter((item) => item.signFace));

    return group;
  }

  private addBenches(group: THREE.Group, benches: readonly StreetFurniture[]): void {
    if (benches.length === 0) {
      return;
    }

    const seatMesh = this.createBoxMesh('StreetFurnitureBenchSeatInstances', benches, this.materials.streetFurnitureWood);
    const backMesh = this.createBoxMesh('StreetFurnitureBenchBackInstances', benches, this.materials.streetFurnitureWood);
    const matrix = new THREE.Matrix4();

    benches.forEach((bench, index) => {
      setFurnitureMatrix(matrix, bench, 0.46, new THREE.Vector3(bench.dimensions.widthMeters, 0.16, bench.dimensions.lengthMeters));
      seatMesh.setMatrixAt(index, matrix);
      setFurnitureMatrix(
        matrix,
        bench,
        0.82,
        new THREE.Vector3(0.14, 0.72, bench.dimensions.lengthMeters),
        getSideOffset(bench, 0.32)
      );
      backMesh.setMatrixAt(index, matrix);
    });

    finishInstancedMesh(seatMesh, benches, this.metadataByObjectId);
    finishInstancedMesh(backMesh, benches, this.metadataByObjectId);
    group.add(seatMesh, backMesh);
  }

  private addBins(group: THREE.Group, bins: readonly StreetFurniture[]): void {
    if (bins.length === 0) {
      return;
    }

    const mesh = this.createCylinderMesh('StreetFurnitureBinInstances', bins, this.materials.streetFurnitureAccent, 8);
    group.add(mesh);
  }

  private addBikeRacks(group: THREE.Group, bikeRacks: readonly StreetFurniture[]): void {
    if (bikeRacks.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.TorusGeometry(0.5, 0.045, 6, 14),
      this.materials.streetFurnitureMetal,
      bikeRacks.length
    );
    const matrix = new THREE.Matrix4();

    mesh.name = 'StreetFurnitureBikeRackInstances';
    bikeRacks.forEach((bikeRack, index) => {
      setFurnitureMatrix(matrix, bikeRack, 0.62, new THREE.Vector3(0.86, 0.86, 0.86));
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, bikeRacks, this.metadataByObjectId);
    group.add(mesh);
  }

  private addBollards(group: THREE.Group, bollards: readonly StreetFurniture[]): void {
    if (bollards.length === 0) {
      return;
    }

    const mesh = this.createCylinderMesh('StreetFurnitureBollardInstances', bollards, this.materials.streetFurnitureMetal, 10);
    group.add(mesh);
  }

  private addKiosks(group: THREE.Group, kiosks: readonly StreetFurniture[]): void {
    if (kiosks.length === 0) {
      return;
    }

    const bodyMesh = this.createBoxMesh('StreetFurnitureKioskBodyInstances', kiosks, this.materials.streetFurnitureAccent);
    const roofMesh = this.createBoxMesh('StreetFurnitureKioskRoofInstances', kiosks, this.materials.streetFurnitureMetal);
    const matrix = new THREE.Matrix4();

    kiosks.forEach((kiosk, index) => {
      setFurnitureMatrix(
        matrix,
        kiosk,
        kiosk.dimensions.heightMeters / 2,
        new THREE.Vector3(kiosk.dimensions.widthMeters, kiosk.dimensions.heightMeters, kiosk.dimensions.lengthMeters)
      );
      bodyMesh.setMatrixAt(index, matrix);
      setFurnitureMatrix(
        matrix,
        kiosk,
        kiosk.dimensions.heightMeters + 0.1,
        new THREE.Vector3(kiosk.dimensions.widthMeters + 0.24, 0.2, kiosk.dimensions.lengthMeters + 0.28)
      );
      roofMesh.setMatrixAt(index, matrix);
    });

    finishInstancedMesh(bodyMesh, kiosks, this.metadataByObjectId);
    finishInstancedMesh(roofMesh, kiosks, this.metadataByObjectId);
    group.add(bodyMesh, roofMesh);
  }

  private addBusShelters(group: THREE.Group, shelters: readonly StreetFurniture[]): void {
    if (shelters.length === 0) {
      return;
    }

    const roofMesh = this.createBoxMesh('StreetFurnitureBusShelterRoofInstances', shelters, this.materials.streetFurnitureMetal);
    const glassMesh = this.createBoxMesh('StreetFurnitureBusShelterGlassInstances', shelters, this.materials.shelterGlass);
    const matrix = new THREE.Matrix4();

    shelters.forEach((shelter, index) => {
      setFurnitureMatrix(
        matrix,
        shelter,
        shelter.dimensions.heightMeters,
        new THREE.Vector3(shelter.dimensions.widthMeters, 0.16, shelter.dimensions.lengthMeters)
      );
      roofMesh.setMatrixAt(index, matrix);
      setFurnitureMatrix(
        matrix,
        shelter,
        shelter.dimensions.heightMeters * 0.48,
        new THREE.Vector3(0.08, shelter.dimensions.heightMeters * 0.76, shelter.dimensions.lengthMeters),
        getSideOffset(shelter, 0.54)
      );
      glassMesh.setMatrixAt(index, matrix);
    });

    finishInstancedMesh(roofMesh, shelters, this.metadataByObjectId);
    finishInstancedMesh(glassMesh, shelters, this.metadataByObjectId);
    group.add(roofMesh, glassMesh);
  }

  private addSigns(group: THREE.Group, signs: readonly StreetFurniture[]): void {
    if (signs.length === 0) {
      return;
    }

    const postMesh = this.createCylinderMesh('StreetFurnitureSignPostInstances', signs, this.materials.streetFurnitureMetal, 8);
    group.add(postMesh);
    this.addSignPanels(group, filterFurniture(signs, 'regulatory-sign'), 'StreetFurnitureRegulatorySignPanelInstances', this.materials.signPanelWhite);
    this.addSignPanels(group, filterFurniture(signs, 'street-name-sign'), 'StreetFurnitureStreetNameSignPanelInstances', this.materials.signPanelGreen);
    this.addSignPanels(group, filterFurniture(signs, 'wayfinding-sign'), 'StreetFurnitureWayfindingSignPanelInstances', this.materials.signPanelBlue);
  }

  private addSignPanels(
    group: THREE.Group,
    signs: readonly StreetFurniture[],
    name: string,
    material: THREE.Material
  ): void {
    if (signs.length === 0) {
      return;
    }

    const mesh = this.createBoxMesh(name, signs, material);
    const matrix = new THREE.Matrix4();

    signs.forEach((sign, index) => {
      setFurnitureMatrix(
        matrix,
        sign,
        sign.dimensions.heightMeters - 0.35,
        new THREE.Vector3(0.08, Math.min(0.72, sign.dimensions.heightMeters * 0.28), sign.dimensions.lengthMeters)
      );
      mesh.setMatrixAt(index, matrix);
    });

    finishInstancedMesh(mesh, signs, this.metadataByObjectId);
    group.add(mesh);
  }

  private createBoxMesh(
    name: string,
    items: readonly StreetFurniture[],
    material: THREE.Material
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, items.length);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createCylinderMesh(
    name: string,
    items: readonly StreetFurniture[],
    material: THREE.Material,
    radialSegments: number
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, radialSegments), material, items.length);
    const matrix = new THREE.Matrix4();

    mesh.name = name;
    items.forEach((item, index) => {
      setFurnitureMatrix(
        matrix,
        item,
        item.dimensions.heightMeters / 2,
        new THREE.Vector3(item.dimensions.widthMeters, item.dimensions.heightMeters, item.dimensions.widthMeters)
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(mesh, items, this.metadataByObjectId);
    return mesh;
  }
}

function setFurnitureMatrix(
  matrix: THREE.Matrix4,
  item: StreetFurniture,
  y: number,
  scale: THREE.Vector3,
  localAcrossMeters = 0,
  localAlongMeters = 0
): void {
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, item.orientationRadians, 0));
  const offset = rotateLocalOffset(item.orientationRadians, localAcrossMeters, localAlongMeters);

  matrix.compose(
    new THREE.Vector3(item.position.x + offset.x, y, item.position.z + offset.z),
    rotation,
    scale
  );
}

function rotateLocalOffset(
  orientationRadians: number,
  localAcrossMeters: number,
  localAlongMeters: number
): { x: number; z: number } {
  const cos = Math.cos(orientationRadians);
  const sin = Math.sin(orientationRadians);

  return {
    x: localAcrossMeters * cos + localAlongMeters * sin,
    z: -localAcrossMeters * sin + localAlongMeters * cos
  };
}

function getSideOffset(item: StreetFurniture, distanceMeters: number): number {
  return item.side === 'left' ? -distanceMeters : distanceMeters;
}

function finishInstancedMesh(
  mesh: THREE.InstancedMesh,
  items: readonly StreetFurniture[],
  metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
): void {
  mesh.instanceMatrix.needsUpdate = true;
  attachCityPickingInstanceMetadata(
    mesh,
    items.map((item) => metadataByObjectId[item.id] ?? createCityPickingMetadata(item))
  );
}

function filterFurniture(
  streetFurniture: readonly StreetFurniture[],
  furnitureType: StreetFurniture['furnitureType']
): StreetFurniture[] {
  return streetFurniture.filter((item) => item.furnitureType === furnitureType);
}
