import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { TrafficPlan } from '../../../types/city';

export interface TrafficVehicle {
  mesh: THREE.Mesh;
  axis: 'x' | 'z';
  direction: 1 | -1;
  speed: number;
  min: number;
  max: number;
}

export interface TrafficLayer {
  markings: THREE.Group;
  vehicleGroup: THREE.Group;
  vehicles: TrafficVehicle[];
}

export class TrafficMeshBuilder {
  constructor(private readonly materials: MaterialLibrary) {}

  build(plan: TrafficPlan): TrafficLayer {
    const vehicles = this.createVehicles(plan);

    return {
      markings: this.createLaneMarkings(plan),
      vehicleGroup: vehicles.group,
      vehicles: vehicles.vehicles
    };
  }

  private createLaneMarkings(plan: TrafficPlan): THREE.Group {
    const group = new THREE.Group();
    group.name = 'LaneMarkings';

    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(geometry, this.materials.lanePaint, plan.markings.length);
    const matrix = new THREE.Matrix4();

    plan.markings.forEach((marking, index) => {
      const rotation =
        marking.orientation === 'vertical'
          ? new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
          : new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2));

      matrix.compose(
        new THREE.Vector3(marking.center.x, 0.105, marking.center.z),
        rotation,
        new THREE.Vector3(marking.size.x, marking.size.z, 1)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.name = 'LaneDashInstances';
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);

    return group;
  }

  private createVehicles(plan: TrafficPlan): { group: THREE.Group; vehicles: TrafficVehicle[] } {
    const group = new THREE.Group();
    group.name = 'TrafficVehicles';

    const vehicles: TrafficVehicle[] = [];

    plan.vehicles.forEach((vehicle, index) => {
      const geometry = new THREE.BoxGeometry(vehicle.size.x, 1.35, vehicle.size.z);
      const material = this.materials.vehicleBody[index % this.materials.vehicleBody.length];
      const mesh = new THREE.Mesh(geometry, material);

      mesh.name = vehicle.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(vehicle.position.x, 0.82, vehicle.position.z);

      group.add(mesh);
      vehicles.push({
        mesh,
        axis: vehicle.axis,
        direction: vehicle.direction,
        speed: vehicle.speed,
        min: vehicle.min,
        max: vehicle.max
      });
    });

    return { group, vehicles };
  }
}
