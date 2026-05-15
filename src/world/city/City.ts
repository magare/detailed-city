import * as THREE from 'three';
import { ActiveFrontageMeshBuilder } from '../../city/rendering-handoff/mesh-builders/ActiveFrontageMeshBuilder';
import { BuildingFacadeMeshBuilder } from '../../city/rendering-handoff/mesh-builders/BuildingFacadeMeshBuilder';
import { BuildingRoofMeshBuilder } from '../../city/rendering-handoff/mesh-builders/BuildingRoofMeshBuilder';
import { ParkFeatureMeshBuilder } from '../../city/rendering-handoff/mesh-builders/ParkFeatureMeshBuilder';
import { PlazaZoneMeshBuilder } from '../../city/rendering-handoff/mesh-builders/PlazaZoneMeshBuilder';
import { StreetFurnitureMeshBuilder } from '../../city/rendering-handoff/mesh-builders/StreetFurnitureMeshBuilder';
import { StreetLightMeshBuilder } from '../../city/rendering-handoff/mesh-builders/StreetLightMeshBuilder';
import { TrafficMeshBuilder, type TrafficVehicle } from '../../city/rendering-handoff/mesh-builders/TrafficMeshBuilder';
import { TransitMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TransitMeshBuilder';
import { WaterfrontOpenSpaceMeshBuilder } from '../../city/rendering-handoff/mesh-builders/WaterfrontOpenSpaceMeshBuilder';
import {
  CITY_SCENE_LAYER_DEFINITIONS,
  type CitySceneLayerId
} from '../../city/rendering-handoff/scene-layers/sceneLayerDefinitions';
import {
  attachCityPickingInstanceMetadata,
  attachCityPickingMetadata,
  createCityPickingMetadataCatalog,
  resolveCityPickFromIntersections,
  type CityPickResult,
  type CityPickingCatalog
} from '../../city/rendering-handoff/picking/pickingMetadata';
import { MaterialLibrary } from '../../rendering/materials/MaterialLibrary';
import type {
  ActiveFrontage,
  GeneratedCity,
  ParkPatch,
  RoadSegment,
  StreetFurniture,
  StreetLight,
  TrafficCalmingDevice,
  TrafficPlan,
  TreePlanting,
  Updatable,
  WaterfrontEdge,
  Waterway
} from '../../types/city';
import { disposeObject3D } from '../../utils/dispose';

export class City implements Updatable {
  readonly group = new THREE.Group();
  readonly layerGroups: Readonly<Record<CitySceneLayerId, THREE.Group>>;
  readonly pickingCatalog: CityPickingCatalog;
  private readonly vehicles: TrafficVehicle[] = [];

  constructor(
    generated: GeneratedCity,
    trafficPlan: TrafficPlan,
    private readonly materials: MaterialLibrary
  ) {
    this.group.name = 'DetailedCity';
    this.layerGroups = this.createLayerGroups();
    this.pickingCatalog = createCityPickingMetadataCatalog(generated, trafficPlan, generated.objectIndex);
    this.build(generated, trafficPlan);
  }

  update(deltaSeconds: number): void {
    for (const vehicle of this.vehicles) {
      updateTrafficVehicle(vehicle, deltaSeconds);
    }
  }

  dispose(): void {
    disposeObject3D(this.group);
  }

  resolvePickingMetadata(intersections: readonly THREE.Intersection[]): CityPickResult | undefined {
    return resolveCityPickFromIntersections(intersections);
  }

  private build(generated: GeneratedCity, trafficPlan: TrafficPlan): void {
    this.addTerrain(generated);
    this.addWaterways(generated.waterways);
    this.addRoads(generated.roads);
    this.addParks(generated.parks);
    this.addParkFeatures(generated);
    this.addPlazaZones(generated);
    this.addWaterfrontEdges(generated.waterfrontEdges);
    this.addWaterfrontOpenSpaces(generated);
    this.addTreePlantings(generated.trees);
    this.addStreetLights(generated.streetLights);
    this.addStreetFurniture(generated.streetFurniture);
    this.addTrafficCalmingDevices(generated.trafficCalmingDevices);
    this.addTransit(generated);
    this.addBuildings(generated);
    this.addBuildingFacades(generated);
    this.addActiveFrontages(generated.activeFrontages);
    this.addTraffic(trafficPlan);
  }

  private addTerrain(generated: GeneratedCity): void {
    const size = generated.bounds.span * 1.32;
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('terrain', 'terrain'));
    mesh.name = 'GroundPlane';
    mesh.receiveShadow = true;
    this.layerGroups.terrain.add(mesh);
  }

  private addRoads(roads: RoadSegment[]): void {
    for (const road of roads) {
      const geometry =
        road.orientation === 'vertical'
          ? new THREE.BoxGeometry(road.width, 0.08, road.length)
          : new THREE.BoxGeometry(road.length, 0.08, road.width);
      const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('asphalt', 'asphalt'));
      mesh.name = road.id;
      mesh.position.set(road.center.x, 0.04, road.center.z);
      mesh.receiveShadow = true;
      this.attachPickingMetadata(mesh, road.id);
      this.layerGroups.networks.add(mesh);
    }
  }

  private addWaterways(waterways: Waterway[]): void {
    for (const waterway of waterways) {
      const geometry = new THREE.BoxGeometry(waterway.length, 0.06, waterway.width);
      const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('water', 'water'));
      mesh.name = waterway.id;
      mesh.position.set(waterway.center.x, 0.08, waterway.center.z);
      mesh.receiveShadow = true;
      this.attachPickingMetadata(mesh, waterway.id);
      this.layerGroups.terrain.add(mesh);
    }
  }

  private addParks(parks: ParkPatch[]): void {
    for (const park of parks) {
      const geometry = new THREE.BoxGeometry(park.size.x, 0.1, park.size.z);
      const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('park', 'park'));
      mesh.name = park.id;
      mesh.position.set(park.center.x, 0.11, park.center.z);
      mesh.receiveShadow = true;
      this.attachPickingMetadata(mesh, park.id);
      this.layerGroups['public-realm'].add(mesh);
    }
  }

  private addParkFeatures(generated: GeneratedCity): void {
    const group = new ParkFeatureMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.parkFeatures);

    this.layerGroups['public-realm'].add(group);
  }

  private addPlazaZones(generated: GeneratedCity): void {
    const group = new PlazaZoneMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.plazaZones);

    this.layerGroups['public-realm'].add(group);
  }

  private addWaterfrontEdges(edges: WaterfrontEdge[]): void {
    for (const edge of edges) {
      const bounds = getBoundaryBounds(edge.boundary);
      const geometry = new THREE.BoxGeometry(
        Math.max(1, bounds.maxX - bounds.minX),
        edge.waterfrontKind === 'flood-wall' ? 1.6 : 0.16,
        Math.max(1, bounds.maxZ - bounds.minZ)
      );
      const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('waterfront', 'waterfrontEdge'));
      mesh.name = edge.id;
      mesh.position.set(edge.center.x, edge.waterfrontKind === 'flood-wall' ? 0.82 : 0.16, edge.center.z);
      mesh.receiveShadow = true;
      this.attachPickingMetadata(mesh, edge.id);
      this.layerGroups['public-realm'].add(mesh);
    }
  }

  private addWaterfrontOpenSpaces(generated: GeneratedCity): void {
    const group = new WaterfrontOpenSpaceMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.waterfrontOpenSpaces);

    this.layerGroups['public-realm'].add(group);
  }

  private addBuildings(generated: GeneratedCity): void {
    const buildingPlans = generated.buildings;

    if (buildingPlans.length === 0) {
      return;
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const buildings = new THREE.InstancedMesh(geometry, this.materials.getMaterialForZone('building', 'building'), buildingPlans.length);
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    buildings.name = 'BuildingInstances';
    buildings.castShadow = true;
    buildings.receiveShadow = true;
    this.attachInstancePickingMetadata(
      buildings,
      buildingPlans.map((building) => building.id)
    );

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
    this.layerGroups.buildings.add(buildings);
    this.addRooftopDetails(generated);
  }

  private addRooftopDetails(generated: GeneratedCity): void {
    const detailedBuildingIds = new Set(generated.verticalSlices.flatMap((slice) => slice.buildingIds));
    const roofGroup = new BuildingRoofMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.buildings, detailedBuildingIds);

    this.layerGroups.buildings.add(roofGroup);
  }

  private addBuildingFacades(generated: GeneratedCity): void {
    const detailedBuildingIds = new Set(generated.verticalSlices.flatMap((slice) => slice.buildingIds));
    const facadeGroup = new BuildingFacadeMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.buildings, detailedBuildingIds);

    this.layerGroups.buildings.add(facadeGroup);
  }

  private addActiveFrontages(activeFrontages: readonly ActiveFrontage[]): void {
    const activeFrontageGroup = new ActiveFrontageMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(activeFrontages);

    this.layerGroups.buildings.add(activeFrontageGroup);
  }

  private addTreePlantings(trees: TreePlanting[]): void {
    if (trees.length === 0) {
      return;
    }

    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.35, 0.45, 1, 6),
      this.materials.getMaterialForZone('tree-trunk', 'treeTrunk'),
      trees.length
    );
    const canopyMesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 1, 7),
      this.materials.getMaterialForZone('tree-canopy', 'treeCanopy'),
      trees.length
    );
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
    this.attachInstancePickingMetadata(
      trunkMesh,
      trees.map((tree) => tree.id)
    );
    this.attachInstancePickingMetadata(
      canopyMesh,
      trees.map((tree) => tree.id)
    );
    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.instanceMatrix.needsUpdate = true;
    this.layerGroups['public-realm'].add(trunkMesh, canopyMesh);
  }

  private addStreetLights(streetLights: readonly StreetLight[]): void {
    const streetLightGroup = new StreetLightMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(streetLights);

    this.layerGroups['public-realm'].add(streetLightGroup);
  }

  private addStreetFurniture(streetFurniture: readonly StreetFurniture[]): void {
    const streetFurnitureGroup = new StreetFurnitureMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(streetFurniture);

    this.layerGroups['public-realm'].add(streetFurnitureGroup);
  }

  private addTransit(generated: GeneratedCity): void {
    const transitGroup = new TransitMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.transitStops, generated.transitRoutes);

    this.layerGroups.networks.add(transitGroup);
  }

  private addTrafficCalmingDevices(devices: readonly TrafficCalmingDevice[]): void {
    if (devices.length === 0) {
      return;
    }

    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('traffic-calming', 'trafficCalming'),
      devices.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();

    devices.forEach((device, index) => {
      matrix.compose(
        new THREE.Vector3(device.center.x, 0.1 + device.heightMeters / 2, device.center.z),
        rotation,
        new THREE.Vector3(device.size.x, device.heightMeters, device.size.z)
      );
      mesh.setMatrixAt(index, matrix);
    });

    mesh.name = 'TrafficCalmingDeviceInstances';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.attachInstancePickingMetadata(
      mesh,
      devices.map((device) => device.id)
    );
    mesh.instanceMatrix.needsUpdate = true;
    this.layerGroups.networks.add(mesh);
  }

  private addTraffic(trafficPlan: TrafficPlan): void {
    const traffic = new TrafficMeshBuilder(this.materials).build(trafficPlan, this.pickingCatalog.metadataByObjectId);
    this.vehicles.push(...traffic.vehicles);
    this.layerGroups.networks.add(traffic.markings);
    this.layerGroups.agents.add(traffic.vehicleGroup);
  }

  private attachPickingMetadata(object: THREE.Object3D, objectId: string): void {
    const metadata = this.pickingCatalog.metadataByObjectId[objectId];

    if (metadata) {
      attachCityPickingMetadata(object, metadata);
    }
  }

  private attachInstancePickingMetadata(object: THREE.Object3D, objectIds: readonly string[]): void {
    const instances = objectIds.map((objectId) => {
      const metadata = this.pickingCatalog.metadataByObjectId[objectId];

      if (!metadata) {
        throw new Error(`Missing picking metadata for ${objectId}.`);
      }

      return metadata;
    });

    attachCityPickingInstanceMetadata(object, instances);
  }

  private createLayerGroups(): Record<CitySceneLayerId, THREE.Group> {
    const layerGroups = {} as Record<CitySceneLayerId, THREE.Group>;

    for (const definition of CITY_SCENE_LAYER_DEFINITIONS) {
      const group = new THREE.Group();
      group.name = `SceneLayer:${definition.id}`;
      group.visible = definition.defaultVisible;
      group.userData.sceneLayerId = definition.id;
      group.userData.sceneLayerName = definition.name;
      group.userData.ownerDomain = definition.ownerDomain;
      group.userData.order = definition.order;
      layerGroups[definition.id] = group;
      this.group.add(group);
    }

    return layerGroups;
  }
}

function updateTrafficVehicle(vehicle: TrafficVehicle, deltaSeconds: number): void {
  if (vehicle.stopTimerSeconds > 0) {
    vehicle.stopTimerSeconds = Math.max(0, vehicle.stopTimerSeconds - deltaSeconds);
    return;
  }

  const stopZoneIndex = getUpcomingStopZoneIndex(vehicle);

  if (stopZoneIndex !== undefined) {
    const stopOffset = vehicle.stopZoneOffsetsMeters[stopZoneIndex];
    vehicle.routeOffsetMeters = stopOffset - vehicle.direction * 1.8;
    vehicle.stopTimerSeconds = vehicle.stopDurationSeconds;
    vehicle.lastStopZoneIndex = stopZoneIndex;
    applyTrafficVehiclePosition(vehicle);
    return;
  }

  const previousStoppedOffset =
    vehicle.lastStopZoneIndex === undefined ? undefined : vehicle.stopZoneOffsetsMeters[vehicle.lastStopZoneIndex];

  if (
    previousStoppedOffset !== undefined &&
    (previousStoppedOffset - vehicle.routeOffsetMeters) * vehicle.direction < -vehicle.stopLookAheadMeters
  ) {
    vehicle.lastStopZoneIndex = undefined;
  }

  vehicle.routeOffsetMeters += vehicle.direction * vehicle.speed * deltaSeconds;

  if (vehicle.routeOffsetMeters > vehicle.max) {
    vehicle.routeOffsetMeters = vehicle.min;
    vehicle.lastStopZoneIndex = undefined;
  } else if (vehicle.routeOffsetMeters < vehicle.min) {
    vehicle.routeOffsetMeters = vehicle.max;
    vehicle.lastStopZoneIndex = undefined;
  }

  applyTrafficVehiclePosition(vehicle);
}

function getUpcomingStopZoneIndex(vehicle: TrafficVehicle): number | undefined {
  for (let index = 0; index < vehicle.stopZoneOffsetsMeters.length; index += 1) {
    if (vehicle.lastStopZoneIndex === index) {
      continue;
    }

    const stopOffset = vehicle.stopZoneOffsetsMeters[index];
    const distanceMeters = (stopOffset - vehicle.routeOffsetMeters) * vehicle.direction;

    if (distanceMeters >= 0 && distanceMeters <= vehicle.stopLookAheadMeters) {
      return index;
    }
  }

  return undefined;
}

function applyTrafficVehiclePosition(vehicle: TrafficVehicle): void {
  const routeCoordinate = vehicle.centerCoordinate + vehicle.routeOffsetMeters;

  if (vehicle.axis === 'x') {
    vehicle.mesh.position.x = routeCoordinate;
    vehicle.mesh.position.z = vehicle.fixedCoordinate;
  } else {
    vehicle.mesh.position.x = vehicle.fixedCoordinate;
    vehicle.mesh.position.z = routeCoordinate;
  }
}

function getBoundaryBounds(boundary: WaterfrontEdge['boundary']): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return {
    minX: Math.min(...boundary.map((point) => point.x)),
    maxX: Math.max(...boundary.map((point) => point.x)),
    minZ: Math.min(...boundary.map((point) => point.z)),
    maxZ: Math.max(...boundary.map((point) => point.z))
  };
}
