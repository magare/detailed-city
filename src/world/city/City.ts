import * as THREE from 'three';
import { TrafficMeshBuilder, type TrafficVehicle } from '../../city/rendering-handoff/mesh-builders/TrafficMeshBuilder';
import { CityGenerator } from '../../generation/CityGenerator';
import { TrafficLaneGenerator } from '../../generation/traffic/TrafficLaneGenerator';
import { MaterialLibrary } from '../../rendering/materials/MaterialLibrary';
import type {
  BuildingPlan,
  CityConfig,
  GeneratedCity,
  ParkPatch,
  RoadSegment,
  TreePlanting,
  Updatable,
  Waterway
} from '../../types/city';
import { disposeObject3D } from '../../utils/dispose';

export class City implements Updatable {
  readonly group = new THREE.Group();
  private readonly generated: GeneratedCity;
  private readonly vehicles: TrafficVehicle[] = [];

  constructor(
    config: CityConfig,
    private readonly materials: MaterialLibrary
  ) {
    this.group.name = 'DetailedCity';
    this.generated = new CityGenerator(config).generate();
    this.build(this.generated);
  }

  update(deltaSeconds: number): void {
    for (const vehicle of this.vehicles) {
      if (vehicle.axis === 'x') {
        vehicle.mesh.position.x += vehicle.direction * vehicle.speed * deltaSeconds;

        if (vehicle.mesh.position.x > vehicle.max) {
          vehicle.mesh.position.x = vehicle.min;
        } else if (vehicle.mesh.position.x < vehicle.min) {
          vehicle.mesh.position.x = vehicle.max;
        }
      } else {
        vehicle.mesh.position.z += vehicle.direction * vehicle.speed * deltaSeconds;

        if (vehicle.mesh.position.z > vehicle.max) {
          vehicle.mesh.position.z = vehicle.min;
        } else if (vehicle.mesh.position.z < vehicle.min) {
          vehicle.mesh.position.z = vehicle.max;
        }
      }
    }
  }

  dispose(): void {
    disposeObject3D(this.group);
  }

  private build(generated: GeneratedCity): void {
    this.addTerrain(generated);
    this.addWaterways(generated.waterways);
    this.addRoads(generated.roads);
    this.addParks(generated.parks);
    this.addTreePlantings(generated.trees);
    this.addBuildings(generated.buildings);
    this.addTraffic(generated.roads);
  }

  private addTerrain(generated: GeneratedCity): void {
    const size = generated.bounds.span * 1.32;
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, this.materials.terrain);
    mesh.name = 'GroundPlane';
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  private addRoads(roads: RoadSegment[]): void {
    for (const road of roads) {
      const geometry =
        road.orientation === 'vertical'
          ? new THREE.BoxGeometry(road.width, 0.08, road.length)
          : new THREE.BoxGeometry(road.length, 0.08, road.width);
      const mesh = new THREE.Mesh(geometry, this.materials.asphalt);
      mesh.name = road.id;
      mesh.position.set(road.center.x, 0.04, road.center.z);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  private addWaterways(waterways: Waterway[]): void {
    for (const waterway of waterways) {
      const geometry = new THREE.BoxGeometry(waterway.length, 0.06, waterway.width);
      const mesh = new THREE.Mesh(geometry, this.materials.water);
      mesh.name = waterway.id;
      mesh.position.set(waterway.center.x, 0.08, waterway.center.z);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  private addParks(parks: ParkPatch[]): void {
    for (const park of parks) {
      const geometry = new THREE.BoxGeometry(park.size.x, 0.1, park.size.z);
      const mesh = new THREE.Mesh(geometry, this.materials.park);
      mesh.name = park.id;
      mesh.position.set(park.center.x, 0.11, park.center.z);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  private addBuildings(buildingPlans: BuildingPlan[]): void {
    if (buildingPlans.length === 0) {
      return;
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const buildings = new THREE.InstancedMesh(geometry, this.materials.building, buildingPlans.length);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    buildings.name = 'BuildingInstances';
    buildings.castShadow = true;
    buildings.receiveShadow = true;

    buildingPlans.forEach((building, index) => {
      matrix.compose(
        new THREE.Vector3(building.center.x, building.heightMeters / 2, building.center.z),
        rotation,
        new THREE.Vector3(building.size.x, building.heightMeters, building.size.z)
      );
      buildings.setMatrixAt(index, matrix);
      buildings.setColorAt(index, this.materials.getBuildingColor(building.district, building.heightMeters));
    });

    buildings.instanceMatrix.needsUpdate = true;
    if (buildings.instanceColor) {
      buildings.instanceColor.needsUpdate = true;
    }
    this.group.add(buildings);
    this.addRooftopDetails(buildingPlans);
  }

  private addRooftopDetails(buildingPlans: BuildingPlan[]): void {
    const detailedBuildings = buildingPlans.filter((building) => building.roofStyle !== 'flat');

    if (detailedBuildings.length === 0) {
      return;
    }

    const roofMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.rooftop,
      detailedBuildings.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    detailedBuildings.forEach((building, index) => {
      const isAntenna = building.roofStyle === 'antenna';
      const scale = isAntenna
        ? new THREE.Vector3(0.55, 10, 0.55)
        : new THREE.Vector3(Math.max(2.2, building.size.x * 0.25), 1.4, Math.max(2.2, building.size.z * 0.25));
      const y = building.heightMeters + scale.y / 2;

      matrix.compose(new THREE.Vector3(building.center.x, y, building.center.z), rotation, scale);
      roofMesh.setMatrixAt(index, matrix);
    });

    roofMesh.name = 'RooftopDetails';
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    roofMesh.instanceMatrix.needsUpdate = true;
    this.group.add(roofMesh);
  }

  private addTreePlantings(trees: TreePlanting[]): void {
    if (trees.length === 0) {
      return;
    }

    const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.45, 1, 6), this.materials.treeTrunk, trees.length);
    const canopyMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), this.materials.treeCanopy, trees.length);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    trees.forEach((tree, index) => {
      const trunkHeight = tree.height * 0.38;
      const canopyHeight = tree.height * 0.62;
      const canopyRadius = tree.canopyDiameter / 2;

      matrix.compose(
        new THREE.Vector3(tree.center.x, trunkHeight / 2, tree.center.z),
        rotation,
        new THREE.Vector3(1, trunkHeight, 1)
      );
      trunkMesh.setMatrixAt(index, matrix);

      matrix.compose(
        new THREE.Vector3(tree.center.x, trunkHeight + canopyHeight / 2, tree.center.z),
        rotation,
        new THREE.Vector3(canopyRadius, canopyHeight, canopyRadius)
      );
      canopyMesh.setMatrixAt(index, matrix);
    });

    trunkMesh.name = 'TreeTrunkInstances';
    canopyMesh.name = 'TreeCanopyInstances';
    trunkMesh.castShadow = true;
    canopyMesh.castShadow = true;
    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    this.group.add(trunkMesh, canopyMesh);
  }

  private addTraffic(roads: RoadSegment[]): void {
    const trafficPlan = new TrafficLaneGenerator().create(roads);
    const traffic = new TrafficMeshBuilder(this.materials).build(trafficPlan);
    this.vehicles.push(...traffic.vehicles);
    this.group.add(traffic.markings, traffic.vehicleGroup);
  }
}
