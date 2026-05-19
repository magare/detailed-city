import { expect, test } from '@playwright/test';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { City } from '../../src/world/city/City';
import { MaterialLibrary } from '../../src/rendering/materials/MaterialLibrary';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('city scene delegates core renderable systems to mesh builders', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(city);
  const materials = new MaterialLibrary();
  const cityScene = new City(city, traffic, materials);
  const objectNames = new Set<string>();

  cityScene.group.traverse((object) => objectNames.add(object.name));
  const buildingInstances = cityScene.group.getObjectByName('BuildingInstances') as THREE.InstancedMesh | undefined;
  const buildingFacadeWindows = cityScene.group.getObjectByName('BuildingFacadeWindowInstances') as THREE.InstancedMesh | undefined;

  expect([...objectNames]).toEqual(
    expect.arrayContaining([
      'SceneLayer:terrain',
      'SceneLayer:networks',
      'SceneLayer:buildings',
      'SceneLayer:public-realm',
      'GroundPlane',
      'RoadSegments',
      'Waterways',
      'ParkSurfaces',
      'WaterfrontEdges',
      'BuildingInstances',
      'TreePlantings',
      'TrafficCalmingDeviceInstances',
      'IndustrialFacilities',
      'BuildingRoofDetails',
      'BuildingFacadeModules',
      'ActiveFrontages',
      'StreetFurniture',
      'StreetLights',
      'TransitStopsAndRoutes',
      'LaneMarkings'
    ])
  );
  expect(cityScene.layerGroups.terrain.children.map((child) => child.name)).toEqual(
    expect.arrayContaining(['GroundPlane', 'Waterways'])
  );
  expect(cityScene.layerGroups.networks.children.map((child) => child.name)).toEqual(
    expect.arrayContaining(['RoadSegments', 'TrafficCalmingDeviceInstances', 'TransitStopsAndRoutes', 'LaneMarkings'])
  );
  expect(cityScene.layerGroups.buildings.children.map((child) => child.name)).toEqual(
    expect.arrayContaining(['BuildingInstances', 'BuildingRoofDetails', 'IndustrialFacilities', 'BuildingFacadeModules', 'ActiveFrontages'])
  );
  expect(cityScene.layerGroups['public-realm'].children.map((child) => child.name)).toEqual(
    expect.arrayContaining(['ParkSurfaces', 'ParkFeatures', 'PlazaZones', 'WaterfrontEdges', 'WaterfrontOpenSpaces', 'TreePlantings'])
  );
  expect(buildingInstances).toBeTruthy();
  expect(buildingFacadeWindows?.count).toBeGreaterThan(city.buildings.length);
  expect(getMaterialTextureNames(buildingInstances?.material)).toEqual(
    expect.arrayContaining(['ProceduralBuildingFacadeAlbedo', 'ProceduralBuildingRoofAlbedo'])
  );
  expect(countSampledBuildingColors(buildingInstances!, city.buildings.length)).toBeGreaterThan(8);
  expect(cityScene.pickingCatalog.pickableObjects.length).toBeGreaterThan(1700);

  cityScene.dispose();
  materials.dispose();
});

test('world city assembly no longer owns raw geometry construction', () => {
  const source = readFileSync(new URL('../../src/world/city/City.ts', import.meta.url), 'utf8');

  expect(source).not.toMatch(/new THREE\\.(BoxGeometry|PlaneGeometry|CylinderGeometry|ConeGeometry|InstancedMesh|Mesh)\\b/);
  expect(source).toContain('RoadMeshBuilder');
  expect(source).toContain('BuildingMassMeshBuilder');
  expect(source).toContain('IndustrialFacilityMeshBuilder');
  expect(source).toContain('TreePlantingMeshBuilder');
  expect(source).toContain('TrafficCalmingMeshBuilder');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}

function getMaterialTextureNames(material: THREE.Material | THREE.Material[] | undefined): string[] {
  const materials = Array.isArray(material) ? material : material ? [material] : [];

  return materials
    .map((candidate) => (candidate as THREE.MeshStandardMaterial).map?.name)
    .filter((name): name is string => Boolean(name));
}

function countSampledBuildingColors(mesh: THREE.InstancedMesh, buildingCount: number): number {
  const sampleCount = Math.min(buildingCount, 80);
  const color = new THREE.Color();
  const swatches = new Set<string>();

  for (let index = 0; index < sampleCount; index += 1) {
    mesh.getColorAt(index, color);
    swatches.add(color.getHexString());
  }

  return swatches.size;
}
