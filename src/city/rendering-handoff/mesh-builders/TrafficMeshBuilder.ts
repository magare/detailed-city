import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { LaneMarkingPlan, TrafficPlan, TrafficVehiclePlan } from '../../../types/city';
import { initializeTrafficVehicleRuntimeState, type TrafficVehicleRuntimeState } from '../../data-contracts/trafficRuntimeState';
import {
  attachCityPickingInstanceMetadata,
  attachCityPickingMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

export interface TrafficVehicle {
  mesh: THREE.Object3D;
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
      const metadata = metadataByObjectId[vehiclePlan.id] ?? createCityPickingMetadata(vehiclePlan);
      const mesh = buildVehicleModel(vehiclePlan, index, this.materials, metadata);

      mesh.position.set(vehiclePlan.position.x, 0, vehiclePlan.position.z);

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

const BOXY_VEHICLE_CLASSES: ReadonlySet<string> = new Set([
  'van',
  'bus',
  'delivery-truck',
  'heavy-truck',
  'service-vehicle'
]);

/**
 * Builds a multi-part vehicle model. Local space: +Z is forward, origin sits
 * on the road surface. The whole group is rotated to face the travel
 * direction; the traffic simulation only translates it afterwards.
 */
function buildVehicleModel(
  plan: TrafficVehiclePlan,
  index: number,
  materials: MaterialLibrary,
  metadata: CityPickingMetadata
): THREE.Group {
  const group = new THREE.Group();
  const length = plan.dimensions.lengthMeters;
  const width = plan.dimensions.widthMeters;
  const height = plan.dimensions.heightMeters;
  const isTaxi = plan.vehicleClass === 'taxi';
  const isBoxy = BOXY_VEHICLE_CLASSES.has(plan.vehicleClass);
  const paint = isTaxi ? materials.taxiPaint : materials.vehiclePaint[index % materials.vehiclePaint.length];

  group.name = plan.id;
  attachCityPickingMetadata(group, metadata);

  const addPart = (
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number
  ): THREE.Mesh => {
    const part = new THREE.Mesh(geometry, material);

    part.name = `${plan.id}:${name}`;
    part.position.set(x, y, z);
    part.castShadow = true;
    part.receiveShadow = true;
    attachCityPickingMetadata(part, metadata);
    group.add(part);
    return part;
  };

  const wheelRadius = THREE.MathUtils.clamp(height * 0.16, 0.24, 0.42);
  const clearance = wheelRadius * 0.65;

  if (isBoxy) {
    const cargoLength = length * 0.72;
    const cabLength = length * 0.24;
    const cargoMaterial = plan.vehicleClass === 'delivery-truck' ? materials.vehiclePaint[2] : paint;

    addPart(
      'cargo',
      new THREE.BoxGeometry(width, height - clearance, cargoLength),
      cargoMaterial,
      0,
      clearance + (height - clearance) / 2,
      -(length / 2 - cargoLength / 2)
    );
    addPart(
      'cab',
      new THREE.BoxGeometry(width * 0.96, height * 0.74 - clearance, cabLength),
      paint,
      0,
      clearance + (height * 0.74 - clearance) / 2,
      length / 2 - cabLength / 2
    );
    addPart(
      'windshield',
      new THREE.BoxGeometry(width * 0.8, height * 0.24, 0.06),
      materials.vehicleGlass,
      0,
      height * 0.56,
      length / 2 + 0.01
    );
  } else {
    const bodyTop = height * 0.6;
    const cabinLength = length * 0.5;

    addPart(
      'body',
      new THREE.BoxGeometry(width, bodyTop - clearance, length),
      paint,
      0,
      clearance + (bodyTop - clearance) / 2,
      0
    );
    addPart(
      'cabin',
      new THREE.BoxGeometry(width * 0.86, height - bodyTop - 0.05, cabinLength),
      materials.vehicleGlass,
      0,
      bodyTop + (height - bodyTop - 0.05) / 2,
      -length * 0.06
    );
    addPart(
      'roof',
      new THREE.BoxGeometry(width * 0.82, 0.06, cabinLength * 0.9),
      paint,
      0,
      height - 0.03,
      -length * 0.06
    );

    if (isTaxi) {
      addPart('taxi-sign', new THREE.BoxGeometry(0.52, 0.16, 0.14), materials.taxiSign, 0, height + 0.08, -length * 0.06);
    }
  }

  const lightY = isBoxy ? height * 0.34 : height * 0.42;
  const lightX = width / 2 - 0.28;

  for (const side of [-1, 1]) {
    addPart(
      `headlight-${side}`,
      new THREE.BoxGeometry(0.3, 0.13, 0.07),
      materials.vehicleHeadlight,
      side * lightX,
      lightY,
      length / 2 + 0.02
    );
    addPart(
      `taillight-${side}`,
      new THREE.BoxGeometry(0.32, 0.12, 0.06),
      materials.vehicleTaillight,
      side * lightX,
      lightY,
      -length / 2 - 0.02
    );
  }

  addPart(
    'bumper-front',
    new THREE.BoxGeometry(width + 0.06, 0.16, 0.16),
    materials.vehicleTrim,
    0,
    clearance + 0.1,
    length / 2 - 0.02
  );
  addPart(
    'bumper-rear',
    new THREE.BoxGeometry(width + 0.06, 0.16, 0.16),
    materials.vehicleTrim,
    0,
    clearance + 0.1,
    -length / 2 + 0.02
  );

  const tireGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.24, 14);
  tireGeometry.rotateZ(Math.PI / 2);
  const hubGeometry = new THREE.CylinderGeometry(wheelRadius * 0.45, wheelRadius * 0.45, 0.26, 10);
  hubGeometry.rotateZ(Math.PI / 2);
  const wheelZ = length / 2 - Math.max(0.6, length * 0.18);
  const wheelX = width / 2 - 0.1;

  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      addPart(`tire-${sideX}-${sideZ}`, tireGeometry, materials.vehicleTire, sideX * wheelX, wheelRadius, sideZ * wheelZ);
      addPart(`hub-${sideX}-${sideZ}`, hubGeometry, materials.vehicleWheelHub, sideX * wheelX, wheelRadius, sideZ * wheelZ);
    }
  }

  group.rotation.y =
    plan.axis === 'x' ? (plan.direction === 1 ? Math.PI / 2 : -Math.PI / 2) : plan.direction === 1 ? 0 : Math.PI;

  return group;
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
