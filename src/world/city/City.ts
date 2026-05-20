import * as THREE from 'three';
import { AccessControlMeshBuilder } from '../../city/rendering-handoff/mesh-builders/AccessControlMeshBuilder';
import { ActiveFrontageMeshBuilder } from '../../city/rendering-handoff/mesh-builders/ActiveFrontageMeshBuilder';
import { BuildingFacadeMeshBuilder } from '../../city/rendering-handoff/mesh-builders/BuildingFacadeMeshBuilder';
import { BuildingMassMeshBuilder } from '../../city/rendering-handoff/mesh-builders/BuildingMassMeshBuilder';
import { BuildingRoofMeshBuilder } from '../../city/rendering-handoff/mesh-builders/BuildingRoofMeshBuilder';
import { CurbActivationMeshBuilder } from '../../city/rendering-handoff/mesh-builders/CurbActivationMeshBuilder';
import { EmergencyEquipmentMeshBuilder } from '../../city/rendering-handoff/mesh-builders/EmergencyEquipmentMeshBuilder';
import { GreenStormwaterMeshBuilder } from '../../city/rendering-handoff/mesh-builders/GreenStormwaterMeshBuilder';
import { IndustrialFacilityMeshBuilder } from '../../city/rendering-handoff/mesh-builders/IndustrialFacilityMeshBuilder';
import { ParkFeatureMeshBuilder } from '../../city/rendering-handoff/mesh-builders/ParkFeatureMeshBuilder';
import { ParkSurfaceMeshBuilder } from '../../city/rendering-handoff/mesh-builders/ParkSurfaceMeshBuilder';
import { PlazaZoneMeshBuilder } from '../../city/rendering-handoff/mesh-builders/PlazaZoneMeshBuilder';
import { PublicAmenityMeshBuilder } from '../../city/rendering-handoff/mesh-builders/PublicAmenityMeshBuilder';
import { RoadMeshBuilder } from '../../city/rendering-handoff/mesh-builders/RoadMeshBuilder';
import { StreetFurnitureMeshBuilder } from '../../city/rendering-handoff/mesh-builders/StreetFurnitureMeshBuilder';
import { StreetLightMeshBuilder } from '../../city/rendering-handoff/mesh-builders/StreetLightMeshBuilder';
import { TerrainMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TerrainMeshBuilder';
import { TrafficCalmingMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TrafficCalmingMeshBuilder';
import { TrafficMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TrafficMeshBuilder';
import { TrafficSimulationSystem } from '../../systems/traffic/TrafficSimulationSystem';
import { TransitMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TransitMeshBuilder';
import { TreePlantingMeshBuilder } from '../../city/rendering-handoff/mesh-builders/TreePlantingMeshBuilder';
import { WaterwayMeshBuilder } from '../../city/rendering-handoff/mesh-builders/WaterwayMeshBuilder';
import { WaterTransportAccessMeshBuilder } from '../../city/rendering-handoff/mesh-builders/WaterTransportAccessMeshBuilder';
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
  EmergencyEquipment,
  GeneratedCity,
  PublicAmenity,
  StreetFurniture,
  StreetLight,
  TrafficCalmingDevice,
  WaterTransportAccess,
  TrafficPlan,
  Updatable
} from '../../types/city';
import { disposeObject3D } from '../../utils/dispose';

export interface CityRuntimeOptions {
  readonly streetLightDynamicLightLimit?: number;
  readonly streetLightShadowCastingLightLimit?: number;
}

export interface StreetLightRuntimeState {
  readonly enabled: boolean;
  readonly dynamicLightCount: number;
  readonly shadowCastingLightCount: number;
  readonly illuminationPoolCount: number;
}

export class City implements Updatable {
  readonly group = new THREE.Group();
  readonly layerGroups: Readonly<Record<CitySceneLayerId, THREE.Group>>;
  readonly pickingCatalog: CityPickingCatalog;
  private readonly trafficSimulation: TrafficSimulationSystem = new TrafficSimulationSystem();
  private streetLightGroup: THREE.Group | undefined;
  private streetLightsEnabled = true;

  constructor(
    generated: GeneratedCity,
    trafficPlan: TrafficPlan,
    private readonly materials: MaterialLibrary,
    private readonly runtimeOptions: CityRuntimeOptions = {}
  ) {
    this.group.name = 'DetailedCity';
    this.layerGroups = this.createLayerGroups();
    this.pickingCatalog = createCityPickingMetadataCatalog(generated, trafficPlan, generated.objectIndex);
    this.build(generated, trafficPlan);
  }

  update(deltaSeconds: number): void {
    this.trafficSimulation.update(deltaSeconds);
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

  getStreetLightRuntimeState(): StreetLightRuntimeState {
    const runtime = this.streetLightGroup?.userData.streetLightRuntime as
      | Partial<Omit<StreetLightRuntimeState, 'enabled'>>
      | undefined;

    return {
      enabled: this.streetLightsEnabled,
      dynamicLightCount: Number(runtime?.dynamicLightCount ?? 0),
      shadowCastingLightCount: Number(runtime?.shadowCastingLightCount ?? 0),
      illuminationPoolCount: Number(runtime?.illuminationPoolCount ?? 0)
    };
  }

  setStreetLightsEnabled(enabled: boolean): void {
    this.streetLightsEnabled = enabled;
    this.setStreetLightObjectVisibility('StreetLightGlowInstances', enabled);
    this.setStreetLightObjectVisibility('StreetLightIlluminancePoolInstances', enabled);
    this.setStreetLightObjectVisibility('StreetLightDynamicLights', enabled);
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
    this.addPublicAmenities(generated.publicAmenities);
    this.addEmergencyEquipment(generated.emergencyEquipment);
    this.addWaterTransportAccess(generated.waterTransportAccess);
    this.addTrafficCalmingDevices(generated.trafficCalmingDevices);
    this.addAccessControls(generated);
    this.addTransit(generated);
    this.addBuildings(generated);
    this.addIndustrialFacilities(generated);
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

  private addIndustrialFacilities(generated: GeneratedCity): void {
    const group = new IndustrialFacilityMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.industrialFacilities);

    this.layerGroups.buildings.add(group);
  }

  private addBuildingFacades(generated: GeneratedCity): void {
    const texturedBuildingIds = new Set(generated.buildings.map((building) => building.id));
    const facadeGroup = new BuildingFacadeMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(generated.buildings, texturedBuildingIds);

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
      this.pickingCatalog.metadataByObjectId,
      {
        dynamicLightLimit: this.runtimeOptions.streetLightDynamicLightLimit,
        shadowCastingLightLimit: this.runtimeOptions.streetLightShadowCastingLightLimit
      }
    ).build(streetLights);

    this.streetLightGroup = streetLightGroup;
    this.layerGroups['public-realm'].add(streetLightGroup);
  }

  private addStreetFurniture(streetFurniture: readonly StreetFurniture[]): void {
    const streetFurnitureGroup = new StreetFurnitureMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(streetFurniture);

    this.layerGroups['public-realm'].add(streetFurnitureGroup);
  }

  private addPublicAmenities(publicAmenities: readonly PublicAmenity[]): void {
    const publicAmenityGroup = new PublicAmenityMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(publicAmenities);

    this.layerGroups['public-realm'].add(publicAmenityGroup);
  }

  private addEmergencyEquipment(emergencyEquipment: readonly EmergencyEquipment[]): void {
    const group = new EmergencyEquipmentMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(emergencyEquipment);

    this.layerGroups['public-realm'].add(group);
  }

  private addWaterTransportAccess(waterTransportAccess: readonly WaterTransportAccess[]): void {
    const group = new WaterTransportAccessMeshBuilder(
      this.materials,
      this.pickingCatalog.metadataByObjectId
    ).build(waterTransportAccess);

    this.layerGroups.networks.add(group);
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
    this.trafficSimulation.addVehicles(traffic.vehicles);
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

  private setStreetLightObjectVisibility(name: string, visible: boolean): void {
    const object = this.streetLightGroup?.getObjectByName(name);

    if (object) {
      object.visible = visible;
    }
  }
}
