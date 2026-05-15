import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { PublicAmenity } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export class PublicAmenityMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(publicAmenities: readonly PublicAmenity[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'PublicAmenities';

    this.addPublicToilets(group, filterAmenities(publicAmenities, 'public-toilet'));
    this.addDrinkingFountains(group, filterAmenities(publicAmenities, 'drinking-fountain'));
    this.addShadeStructures(group, filterAmenities(publicAmenities, 'shade-structure'));
    this.addMistingCoolingPoints(group, filterAmenities(publicAmenities, 'misting-cooling-point'));
    this.addChargingPoints(group, filterAmenities(publicAmenities, 'charging-point'));
    this.addClocks(group, filterAmenities(publicAmenities, 'clock'));
    this.addInformationKiosks(group, filterAmenities(publicAmenities, 'information-kiosk'));
    this.addRepairStands(group, filterAmenities(publicAmenities, 'repair-stand'));

    return group;
  }

  private addPublicToilets(group: THREE.Group, amenities: readonly PublicAmenity[]): void {
    if (amenities.length === 0) {
      return;
    }

    const mesh = this.createBoxMesh('PublicAmenityToiletInstances', amenities, 'street-furniture');
    setAmenityBoxInstances(mesh, amenities);
    finishInstancedMesh(mesh, amenities, this.metadataByObjectId);
    group.add(mesh);
  }

  private addDrinkingFountains(group: THREE.Group, amenities: readonly PublicAmenity[]): void {
    if (amenities.length === 0) {
      return;
    }

    const mesh = this.createCylinderMesh('PublicAmenityFountainInstances', amenities, 'water', 12);
    setAmenityCylinderInstances(mesh, amenities);
    finishInstancedMesh(mesh, amenities, this.metadataByObjectId);
    group.add(mesh);
  }

  private addShadeStructures(group: THREE.Group, amenities: readonly PublicAmenity[]): void {
    if (amenities.length === 0) {
      return;
    }

    const canopyMesh = this.createBoxMesh('PublicAmenityShadeCanopyInstances', amenities, 'park-shade');
    const postMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
      this.materials.getMaterialForZone('street-furniture', 'streetFurnitureMetal'),
      amenities.length * 4
    );
    const matrix = new THREE.Matrix4();
    const postItems: PublicAmenity[] = [];

    postMesh.name = 'PublicAmenityShadePostInstances';
    postMesh.castShadow = true;
    postMesh.receiveShadow = true;

    amenities.forEach((amenity, index) => {
      setAmenityMatrix(
        matrix,
        amenity,
        amenity.dimensions.heightMeters,
        new THREE.Vector3(amenity.dimensions.widthMeters, 0.18, amenity.dimensions.lengthMeters)
      );
      canopyMesh.setMatrixAt(index, matrix);

      const halfWidth = amenity.dimensions.widthMeters / 2 - 0.24;
      const halfLength = amenity.dimensions.lengthMeters / 2 - 0.24;
      const offsets = [
        [-halfWidth, -halfLength],
        [-halfWidth, halfLength],
        [halfWidth, -halfLength],
        [halfWidth, halfLength]
      ] as const;

      offsets.forEach(([across, along], postIndex) => {
        setAmenityMatrix(
          matrix,
          amenity,
          amenity.dimensions.heightMeters / 2,
          new THREE.Vector3(0.12, amenity.dimensions.heightMeters, 0.12),
          across,
          along
        );
        postMesh.setMatrixAt(index * 4 + postIndex, matrix);
        postItems.push(amenity);
      });
    });

    finishInstancedMesh(canopyMesh, amenities, this.metadataByObjectId);
    finishInstancedMesh(postMesh, postItems, this.metadataByObjectId);
    group.add(canopyMesh, postMesh);
  }

  private addMistingCoolingPoints(group: THREE.Group, amenities: readonly PublicAmenity[]): void {
    if (amenities.length === 0) {
      return;
    }

    const postMesh = this.createCylinderMesh('PublicAmenityMistingPostInstances', amenities, 'water', 10);
    const headMesh = this.createBoxMesh('PublicAmenityMistingHeadInstances', amenities, 'water');
    const matrix = new THREE.Matrix4();

    setAmenityCylinderInstances(postMesh, amenities, 0.36);
    amenities.forEach((amenity, index) => {
      setAmenityMatrix(
        matrix,
        amenity,
        amenity.dimensions.heightMeters - 0.12,
        new THREE.Vector3(amenity.dimensions.widthMeters, 0.18, amenity.dimensions.widthMeters)
      );
      headMesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(postMesh, amenities, this.metadataByObjectId);
    finishInstancedMesh(headMesh, amenities, this.metadataByObjectId);
    group.add(postMesh, headMesh);
  }

  private addChargingPoints(group: THREE.Group, amenities: readonly PublicAmenity[]): void {
    if (amenities.length === 0) {
      return;
    }

    const mesh = this.createBoxMesh('PublicAmenityChargingPointInstances', amenities, 'kiosk');
    setAmenityBoxInstances(mesh, amenities);
    finishInstancedMesh(mesh, amenities, this.metadataByObjectId);
    group.add(mesh);
  }

  private addClocks(group: THREE.Group, amenities: readonly PublicAmenity[]): void {
    if (amenities.length === 0) {
      return;
    }

    const postMesh = this.createCylinderMesh('PublicAmenityClockPostInstances', amenities, 'street-furniture', 10);
    const faceMesh = this.createBoxMesh('PublicAmenityClockFaceInstances', amenities, 'kiosk');
    const matrix = new THREE.Matrix4();

    setAmenityCylinderInstances(postMesh, amenities, 0.28);
    amenities.forEach((amenity, index) => {
      setAmenityMatrix(
        matrix,
        amenity,
        amenity.dimensions.heightMeters - 0.35,
        new THREE.Vector3(0.12, 0.64, 0.64)
      );
      faceMesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(postMesh, amenities, this.metadataByObjectId);
    finishInstancedMesh(faceMesh, amenities, this.metadataByObjectId);
    group.add(postMesh, faceMesh);
  }

  private addInformationKiosks(group: THREE.Group, amenities: readonly PublicAmenity[]): void {
    if (amenities.length === 0) {
      return;
    }

    const bodyMesh = this.createBoxMesh('PublicAmenityInformationKioskInstances', amenities, 'kiosk');
    setAmenityBoxInstances(bodyMesh, amenities);
    finishInstancedMesh(bodyMesh, amenities, this.metadataByObjectId);
    group.add(bodyMesh);
  }

  private addRepairStands(group: THREE.Group, amenities: readonly PublicAmenity[]): void {
    if (amenities.length === 0) {
      return;
    }

    const postMesh = this.createCylinderMesh('PublicAmenityRepairStandPostInstances', amenities, 'bike-rack', 8);
    const toolMesh = this.createBoxMesh('PublicAmenityRepairStandToolArmInstances', amenities, 'bike-rack');
    const matrix = new THREE.Matrix4();

    setAmenityCylinderInstances(postMesh, amenities, 0.32);
    amenities.forEach((amenity, index) => {
      setAmenityMatrix(
        matrix,
        amenity,
        amenity.dimensions.heightMeters - 0.36,
        new THREE.Vector3(amenity.dimensions.widthMeters, 0.12, 0.18)
      );
      toolMesh.setMatrixAt(index, matrix);
    });
    finishInstancedMesh(postMesh, amenities, this.metadataByObjectId);
    finishInstancedMesh(toolMesh, amenities, this.metadataByObjectId);
    group.add(postMesh, toolMesh);
  }

  private createBoxMesh(
    name: string,
    amenities: readonly PublicAmenity[],
    materialZone: string
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone(materialZone),
      amenities.length
    );
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createCylinderMesh(
    name: string,
    amenities: readonly PublicAmenity[],
    materialZone: string,
    radialSegments: number
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, radialSegments),
      this.materials.getMaterialForZone(materialZone),
      amenities.length
    );
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

function setAmenityBoxInstances(mesh: THREE.InstancedMesh, amenities: readonly PublicAmenity[]): void {
  const matrix = new THREE.Matrix4();

  amenities.forEach((amenity, index) => {
    setAmenityMatrix(
      matrix,
      amenity,
      amenity.dimensions.heightMeters / 2,
      new THREE.Vector3(amenity.dimensions.widthMeters, amenity.dimensions.heightMeters, amenity.dimensions.lengthMeters)
    );
    mesh.setMatrixAt(index, matrix);
  });
}

function setAmenityCylinderInstances(
  mesh: THREE.InstancedMesh,
  amenities: readonly PublicAmenity[],
  widthScale = 1
): void {
  const matrix = new THREE.Matrix4();

  amenities.forEach((amenity, index) => {
    setAmenityMatrix(
      matrix,
      amenity,
      amenity.dimensions.heightMeters / 2,
      new THREE.Vector3(
        amenity.dimensions.widthMeters * widthScale,
        amenity.dimensions.heightMeters,
        amenity.dimensions.widthMeters * widthScale
      )
    );
    mesh.setMatrixAt(index, matrix);
  });
}

function setAmenityMatrix(
  matrix: THREE.Matrix4,
  amenity: PublicAmenity,
  y: number,
  scale: THREE.Vector3,
  localAcrossMeters = 0,
  localAlongMeters = 0
): void {
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, amenity.orientationRadians, 0));
  const offset = rotateLocalOffset(amenity.orientationRadians, localAcrossMeters, localAlongMeters);

  matrix.compose(
    new THREE.Vector3(amenity.position.x + offset.x, y, amenity.position.z + offset.z),
    rotation,
    scale
  );
}

function rotateLocalOffset(
  orientationRadians: number,
  localAcrossMeters: number,
  localAlongMeters: number
): { readonly x: number; readonly z: number } {
  const cos = Math.cos(orientationRadians);
  const sin = Math.sin(orientationRadians);

  return {
    x: localAcrossMeters * cos + localAlongMeters * sin,
    z: -localAcrossMeters * sin + localAlongMeters * cos
  };
}

function finishInstancedMesh(
  mesh: THREE.InstancedMesh,
  amenities: readonly PublicAmenity[],
  metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
): void {
  mesh.instanceMatrix.needsUpdate = true;
  attachCityPickingInstanceMetadata(
    mesh,
    amenities.map((amenity) => metadataByObjectId[amenity.id] ?? createCityPickingMetadata(amenity))
  );
}

function filterAmenities(
  amenities: readonly PublicAmenity[],
  amenityKind: PublicAmenity['amenityKind']
): PublicAmenity[] {
  return amenities.filter((amenity) => amenity.amenityKind === amenityKind);
}
