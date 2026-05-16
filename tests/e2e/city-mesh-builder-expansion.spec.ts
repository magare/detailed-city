import { expect, test } from '@playwright/test';
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
