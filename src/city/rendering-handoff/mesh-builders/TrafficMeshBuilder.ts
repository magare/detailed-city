import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { LaneMarkingPlan, TrafficPlan } from '../../../types/city';
import { initializeTrafficVehicleRuntimeState, type TrafficVehicleRuntimeState } from '../../data-contracts/trafficRuntimeState';
import {
  attachCityPickingInstanceMetadata,
  attachCityPickingMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export interface TrafficVehicle {
  mesh: THREE.Mesh;
  axis: 'x' | 'z';
  direction: 1 | -1;
  min: number;
  max: number;
  centerCoordinate: number;
  fixedCoordinate: number;
  stopZoneOffsetsMeters: readonly number[];
  stopDurationSeconds: number;
  stopLookAheadMeters: number;
  accelerationMetersPerSecondSq: number;
  brakingMetersPerSecondSq: number;
  stopToleranceMeters: number;
  speedLimitMetersPerSecond: number;
  runtime: TrafficVehicleRuntimeState;
}

export interface TrafficLayer {
  markings: THREE.Group;
  vehicleGroup: THREE.Group;
  vehicles: TrafficVehicle[];
}

export class TrafficMeshBuilder {
  constructor(private readonly materials: MaterialLibrary) {}

  build(plan: TrafficPlan, metadataByObjectId: Readonly<Record<string, CityPickingMetadata>> = {}): TrafficLayer {
    const vehicles = this.createVehicles(plan, metadataByObjectId);

    return {
      markings: this.createLaneMarkings(plan, metadataByObjectId),
      vehicleGroup: vehicles.group,
      vehicles: vehicles.vehicles
    };
  }

  private createLaneMarkings(
    plan: TrafficPlan,
    metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'LaneMarkings';

    group.add(
      this.createPaintPlaneInstances(
        'LaneDashInstances',
        filterMarkings(plan.markings, 'lane-dash'),
        'lane-paint',
        metadataByObjectId
      ),
      this.createPaintPlaneInstances(
        'ZebraCrossingStripeInstances',
        filterMarkings(plan.markings, 'zebra-crossing-stripe'),
        'crosswalk-paint',
        metadataByObjectId
      ),
      this.createPaintPlaneInstances(
        'StopBarInstances',
        filterMarkings(plan.markings, 'stop-bar'),
        'lane-paint',
        metadataByObjectId
      ),
      this.createPaintPlaneInstances(
        'TactilePavingInstances',
        filterMarkings(plan.markings, 'tactile-paving'),
        'tactile-paving',
        metadataByObjectId
      ),
      this.createTurnArrowInstances(filterMarkings(plan.markings, 'turn-arrow'), metadataByObjectId),
      this.createRefugeIslandInstances(filterMarkings(plan.markings, 'refuge-island'), metadataByObjectId)
    );

    return group;
  }

  private createPaintPlaneInstances(
    name: string,
    markings: readonly LaneMarkingPlan[],
    materialZone: string,
    metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      this.materials.getMaterialForZone(materialZone),
      markings.length
    );
    const matrix = new THREE.Matrix4();

    mesh.name = name;
    markings.forEach((marking, index) => {
      matrix.compose(
        new THREE.Vector3(marking.center.x, 0.106, marking.center.z),
        getMarkingPlaneRotation(marking),
        new THREE.Vector3(marking.size.x, marking.size.z, 1)
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishMarkingInstances(mesh, markings, metadataByObjectId);
    return mesh;
  }

  private createTurnArrowInstances(
    markings: readonly LaneMarkingPlan[],
    metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      createTurnArrowGeometry(),
      this.materials.getMaterialForZone('lane-paint', 'lanePaint'),
      markings.length
    );
    const matrix = new THREE.Matrix4();

    mesh.name = 'TurnArrowInstances';
    markings.forEach((marking, index) => {
      matrix.compose(
        new THREE.Vector3(marking.center.x, 0.108, marking.center.z),
        getMarkingPlaneRotation(marking),
        new THREE.Vector3(marking.size.x, marking.size.z, 1)
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishMarkingInstances(mesh, markings, metadataByObjectId);
    return mesh;
  }

  private createRefugeIslandInstances(
    markings: readonly LaneMarkingPlan[],
    metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('curb-concrete', 'refugeIsland'),
      markings.length
    );
    const matrix = new THREE.Matrix4();

    mesh.name = 'RefugeIslandInstances';
    markings.forEach((marking, index) => {
      matrix.compose(
        new THREE.Vector3(marking.center.x, 0.18, marking.center.z),
        getMarkingBoxRotation(marking),
        new THREE.Vector3(marking.size.x, 0.18, marking.size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });
    finishMarkingInstances(mesh, markings, metadataByObjectId);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createVehicles(
    plan: TrafficPlan,
    metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ): { group: THREE.Group; vehicles: TrafficVehicle[] } {
    const group = new THREE.Group();
    group.name = 'TrafficVehicles';

    const vehicles: TrafficVehicle[] = [];

    plan.vehicles.forEach((vehiclePlan, index) => {
      const geometry = new THREE.BoxGeometry(vehiclePlan.size.x, vehiclePlan.dimensions.heightMeters, vehiclePlan.size.z);
      const material = this.materials.vehicleBody[index % this.materials.vehicleBody.length];
      const mesh = new THREE.Mesh(geometry, material);

      mesh.name = vehiclePlan.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(vehiclePlan.position.x, vehiclePlan.dimensions.heightMeters / 2, vehiclePlan.position.z);
      attachCityPickingMetadata(mesh, metadataByObjectId[vehiclePlan.id] ?? createCityPickingMetadata(vehiclePlan));

      group.add(mesh);
      vehicles.push({
        mesh,
        axis: vehiclePlan.axis,
        direction: vehiclePlan.direction,
        min: vehiclePlan.min,
        max: vehiclePlan.max,
        centerCoordinate: vehiclePlan.axis === 'x' ? vehiclePlan.position.x - vehiclePlan.routeOffsetMeters : vehiclePlan.position.z - vehiclePlan.routeOffsetMeters,
        fixedCoordinate: vehiclePlan.axis === 'x' ? vehiclePlan.position.z : vehiclePlan.position.x,
        stopZoneOffsetsMeters: vehiclePlan.stopBehavior.stopZoneOffsetsMeters,
        stopDurationSeconds: vehiclePlan.stopBehavior.stopDurationSeconds,
        stopLookAheadMeters: vehiclePlan.stopBehavior.stopLookAheadMeters,
        accelerationMetersPerSecondSq: vehiclePlan.dynamics.accelerationMetersPerSecondSq,
        brakingMetersPerSecondSq: vehiclePlan.dynamics.brakingMetersPerSecondSq,
        stopToleranceMeters: vehiclePlan.dynamics.stopToleranceMeters,
        speedLimitMetersPerSecond: vehiclePlan.speedLimitKph / 3.6,
        runtime: initializeTrafficVehicleRuntimeState(vehiclePlan)
      });
    });

    return { group, vehicles };
  }
}

function filterMarkings(
  markings: readonly LaneMarkingPlan[],
  markingType: LaneMarkingPlan['markingType']
): LaneMarkingPlan[] {
  return markings.filter((marking) => marking.markingType === markingType);
}

function getMarkingPlaneRotation(marking: LaneMarkingPlan): THREE.Quaternion {
  return marking.orientation === 'vertical'
    ? new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
    : new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2));
}

function getMarkingBoxRotation(marking: LaneMarkingPlan): THREE.Quaternion {
  return marking.orientation === 'vertical'
    ? new THREE.Quaternion()
    : new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
}

function createTurnArrowGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape();

  shape.moveTo(0, 0.56);
  shape.lineTo(0.42, 0.1);
  shape.lineTo(0.16, 0.1);
  shape.lineTo(0.16, -0.56);
  shape.lineTo(-0.16, -0.56);
  shape.lineTo(-0.16, 0.1);
  shape.lineTo(-0.42, 0.1);
  shape.lineTo(0, 0.56);

  return new THREE.ShapeGeometry(shape);
}

function finishMarkingInstances(
  mesh: THREE.InstancedMesh,
  markings: readonly LaneMarkingPlan[],
  metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
): void {
  attachCityPickingInstanceMetadata(
    mesh,
    markings.map((marking) => metadataByObjectId[marking.id] ?? createCityPickingMetadata(marking))
  );
  mesh.instanceMatrix.needsUpdate = true;
}
