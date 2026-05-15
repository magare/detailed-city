import * as THREE from 'three';
import { AccessControlMeshBuilder } from '../../city/rendering-handoff/mesh-builders/AccessControlMeshBuilder';
import { ActiveFrontageMeshBuilder } from '../../city/rendering-handoff/mesh-builders/ActiveFrontageMeshBuilder';
import { BuildingFacadeMeshBuilder } from '../../city/rendering-handoff/mesh-builders/BuildingFacadeMeshBuilder';
import { BuildingMassMeshBuilder } from '../../city/rendering-handoff/mesh-builders/BuildingMassMeshBuilder';
import { BuildingRoofMeshBuilder } from '../../city/rendering-handoff/mesh-builders/BuildingRoofMeshBuilder';
import { CurbActivationMeshBuilder } from '../../city/rendering-handoff/mesh-builders/CurbActivationMeshBuilder';
import { GreenStormwaterMeshBuilder } from '../../city/rendering-handoff/mesh-builders/GreenStormwaterMeshBuilder';
import { ParkFeatureMeshBuilder } from '../../city/rendering-handoff/mesh-builders/ParkFeatureMeshBuilder';
import { ParkSurfaceMeshBuilder } from '../../city/rendering-handoff/mesh-builders/ParkSurfaceMeshBuilder';
import { PlazaZoneMeshBuilder } from '../../city/rendering-handoff/mesh-builders/PlazaZoneMeshBuilder';
import { RoadMeshBuilder } from '../../city/rendering-handoff/mesh-builders/RoadMeshBuilder';
import { StreetFurnitureMeshBuilder } from '../../city/rendering-handoff/mesh-builders/StreetFurnitureMeshBuilder';
import { StreetLightMeshBuilder } from '../../city/rendering-handoff/mesh-builders/StreetLightMeshBuilder';
import { TerrainMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TerrainMeshBuilder';
import { TrafficCalmingMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TrafficCalmingMeshBuilder';
import { TrafficMeshBuilder, type TrafficVehicle } from '../../city/rendering-handoff/mesh-builders/TrafficMeshBuilder';
import { TransitMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TransitMeshBuilder';
import { TreePlantingMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TreePlantingMeshBuilder';
import { WaterwayMeshBuilder } from '../../city/rendering-handoff/mesh-builders/WaterwayMeshBuilder';
import { WaterfrontEdgeMeshBuilder } from '../../city/rendering-handoff/mesh-builders/WaterfrontEdgeMeshBuilder';
import { WaterfrontOpenSpaceMeshBuilder } from '../../city/rendering-handoff/mesh-builders/WaterfrontOpenSpaceMeshBuilder';
import {
  CITY_SCENE_LAYER_DEFINITIONS,
  type CitySceneLayerId,
  type CitySceneLayerRuntimeState
} from '../../city/rendering-handoff/scene-layers/sceneLayerDefinitions';
import {
  createCityPickingMetadataCatalog,
  resolveCityPickFromIntersections,
  type CityPickResult,
  type CityPickingCatalog
} from '../../city/rendering-handoff/picking/pickingMetadata';
import { MaterialLibrary } from '../../rendering/materials/MaterialLibrary';
import type {
  ActiveFrontage,
  GeneratedCity,
  StreetFurniture,
  StreetLight,
  TrafficCalmingDevice,
  TrafficPlan,
  Updatable
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

  getSceneLayerStates(): readonly CitySceneLayerRuntimeState[] {
    return CITY_SCENE_LAYER_DEFINITIONS.map((definition) => {
      const group = this.layerGroups[definition.id];

      return {
        ...definition,
        visible: group.visible,
        renderOrder: group.renderOrder
      };
    });
  }

  setSceneLayerVisible(layerId: CitySceneLayerId, visible: boolean): void {
    this.layerGroups[layerId].visible = visible;
  }

  setSceneLayerRenderOrder(layerId: CitySceneLayerId, renderOrder: number): void {
    const safeRenderOrder = Number.isFinite(renderOrder)
      ? Math.max(0, Math.min(99, Math.round(renderOrder)))
      : this.layerGroups[layerId].renderOrder;

    this.layerGroups[layerId].renderOrder = safeRenderOrder;
    this.layerGroups[layerId].userData.order = safeRenderOrder;
  }

  private build(generated: GeneratedCity, trafficPlan: TrafficPlan): void {
    this.addTerrain(generated);
    this.addWaterways(generated);
    this.addRoads(generated);
    this.addParks(generated);
    this.addParkFeatures(generated);
    this.addPlazaZones(generated);
    this.addCurbActivations(generated);
    this.addWaterfrontEdges(generated);
    this.addWaterfrontOpenSpaces(generated);
    this.addTreePlantings(generated);
    this.addGreenStormwaterFeatures(generated);
    this.addStreetLights(generated.streetLights);
    this.addStreetFurniture(generated.streetFurniture);
    this.addTrafficCalmingDevices(generated.trafficCalmingDevices);
    this.addAccessControls(generated);
    this.addTransit(generated);
    this.addBuildings(generated);
    this.addBuildingFacades(generated);
    this.addActiveFrontages(generated.activeFrontages);
    this.addTraffic(trafficPlan);
  }

  private addTerrain(generated: GeneratedCity): void {
    this.layerGroups.terrain.add(new TerrainMeshBuilder(this.materials).build(generated));
  }

  private addRoads(generated: GeneratedCity): void {
    this.layerGroups.networks.add(
      new RoadMeshBuilder(this.materials, this.pickingCatalog.metadataByObjectId).build(generated.roads)
    );
  }

  private addWaterways(generated: GeneratedCity): void {
    this.layerGroups.terrain.add(
      new WaterwayMeshBuilder(this.materials, this.pickingCatalog.metadataByObjectId).build(generated.waterways)
    );
  }

  private addParks(generated: GeneratedCity): void {
    this.layerGroups['public-realm'].add(
      new ParkSurfaceMeshBuilder(this.materials, this.pickingCatalog.metadataByObjectId).build(generated.parks)
    );
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

  private addCurbActivations(generated: GeneratedCity): void {
    const group = new CurbActivationMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.curbActivations);

    this.layerGroups['public-realm'].add(group);
  }

  private addWaterfrontEdges(generated: GeneratedCity): void {
    this.layerGroups['public-realm'].add(
      new WaterfrontEdgeMeshBuilder(this.materials, this.pickingCatalog.metadataByObjectId).build(generated.waterfrontEdges)
    );
  }

  private addWaterfrontOpenSpaces(generated: GeneratedCity): void {
    const group = new WaterfrontOpenSpaceMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.waterfrontOpenSpaces);

    this.layerGroups['public-realm'].add(group);
  }

  private addBuildings(generated: GeneratedCity): void {
    const buildingMasses = new BuildingMassMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.buildings);

    if (buildingMasses) {
      this.layerGroups.buildings.add(buildingMasses);
    }
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

  private addTreePlantings(generated: GeneratedCity): void {
    this.layerGroups['public-realm'].add(
      new TreePlantingMeshBuilder(this.materials, this.pickingCatalog.metadataByObjectId).build(generated.trees)
    );
  }

  private addGreenStormwaterFeatures(generated: GeneratedCity): void {
    this.layerGroups['public-realm'].add(
      new GreenStormwaterMeshBuilder(this.materials, this.pickingCatalog.metadataByObjectId).build(generated.greenStormwaterFeatures)
    );
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
    const mesh = new TrafficCalmingMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(devices);

    if (mesh) {
      this.layerGroups.networks.add(mesh);
    }
  }

  private addAccessControls(generated: GeneratedCity): void {
    const group = new AccessControlMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.accessControls);

    this.layerGroups.networks.add(group);
  }

  private addTraffic(trafficPlan: TrafficPlan): void {
    const traffic = new TrafficMeshBuilder(this.materials).build(trafficPlan, this.pickingCatalog.metadataByObjectId);
    this.vehicles.push(...traffic.vehicles);
    this.layerGroups.networks.add(traffic.markings);
    this.layerGroups.agents.add(traffic.vehicleGroup);
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
      group.renderOrder = definition.order;
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
