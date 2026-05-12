import { expect, test } from '@playwright/test';
import * as THREE from 'three';
import { createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { createCityPickingMetadataCatalog } from '../../src/city/rendering-handoff/picking/pickingMetadata';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import { MaterialLibrary } from '../../src/rendering/materials/MaterialLibrary';
import { City } from '../../src/world/city/City';

test('picking catalog exposes deterministic object metadata and inherited references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const runtimeObjectIndex = createGeneratedRuntimeObjectIndex(city, traffic);
  const catalog = createCityPickingMetadataCatalog(city, traffic, runtimeObjectIndex);
  const building = city.buildings[0];
  const parcel = city.parcels.find((candidate) => candidate.id === building.parcelId);
  const activeFrontage = city.activeFrontages[0];
  const streetLight = city.streetLights[0];
  const streetFurniture = city.streetFurniture[0];
  const trafficCalmingDevice = city.trafficCalmingDevices[0];
  const zebraCrossing = traffic.markings.find((marking) => marking.markingType === 'zebra-crossing-stripe');

  expect(catalog.pickableObjectIds).toHaveLength(
    city.roads.length +
      city.buildings.length +
      city.activeFrontages.length +
      city.parks.length +
      city.parkFeatures.length +
      city.plazaZones.length +
      city.waterways.length +
      city.waterfrontEdges.length +
      city.trees.length +
      city.streetLights.length +
      city.streetFurniture.length +
      city.trafficCalmingDevices.length +
      traffic.markings.length +
      traffic.vehicles.length
  );
  expect(catalog.countsByKind['road-segment']).toBe(city.roads.length);
  expect(catalog.countsByKind.building).toBe(city.buildings.length);
  expect(catalog.countsByKind.facade).toBe(city.activeFrontages.length);
  expect(catalog.countsByKind['street-light']).toBe(city.streetLights.length);
  expect(catalog.countsByKind['street-furniture']).toBe(city.streetFurniture.length);
  expect(catalog.countsByKind['park-feature']).toBe(city.parkFeatures.length);
  expect(catalog.countsByKind['plaza-zone']).toBe(city.plazaZones.length);
  expect(catalog.countsByKind['traffic-calming-device']).toBe(city.trafficCalmingDevices.length);
  expect(catalog.countsByKind['waterfront-edge']).toBe(city.waterfrontEdges.length);
  expect(catalog.countsByKind['lane-marking']).toBe(traffic.markings.length);
  expect(zebraCrossing).toBeTruthy();
  expect(catalog.metadataByObjectId[building.id]).toMatchObject({
    objectId: building.id,
    kind: 'building',
    ownerDomain: 'buildings',
    parentId: building.parcelId,
    lod: building.lod,
    references: {
      buildingId: building.id,
      parcelId: building.parcelId,
      blockId: parcel?.blockId,
      districtId: parcel?.districtId
    }
  });
  expect(catalog.metadataByObjectId[streetLight.id]).toMatchObject({
    objectId: streetLight.id,
    kind: 'street-light',
    ownerDomain: 'public-realm',
    parentId: streetLight.sidewalkId,
    lod: streetLight.lod,
    references: {
      roadId: streetLight.roadId,
      sidewalkId: streetLight.sidewalkId,
      sliceId: streetLight.sliceId,
      curbZoneId: streetLight.curbZoneId
    }
  });
  expect(catalog.metadataByObjectId[trafficCalmingDevice.id]).toMatchObject({
    objectId: trafficCalmingDevice.id,
    kind: 'traffic-calming-device',
    ownerDomain: 'mobility',
    parentId: trafficCalmingDevice.roadId,
    references: {
      roadId: trafficCalmingDevice.roadId,
      sliceId: trafficCalmingDevice.sliceId
    }
  });
  expect(catalog.metadataByObjectId[activeFrontage.id]).toMatchObject({
    objectId: activeFrontage.id,
    kind: 'facade',
    ownerDomain: 'buildings',
    parentId: activeFrontage.buildingId,
    lod: activeFrontage.lod,
    references: {
      buildingId: activeFrontage.buildingId,
      parcelId: activeFrontage.parcelId,
      roadId: activeFrontage.roadId,
      sidewalkId: activeFrontage.sidewalkId,
      sliceId: activeFrontage.sliceId
    }
  });
  expect(catalog.metadataByObjectId[streetFurniture.id]).toMatchObject({
    objectId: streetFurniture.id,
    kind: 'street-furniture',
    ownerDomain: 'public-realm',
    parentId: streetFurniture.sidewalkId,
    lod: streetFurniture.lod,
    references: {
      roadId: streetFurniture.roadId,
      sidewalkId: streetFurniture.sidewalkId,
      sliceId: streetFurniture.sliceId,
      curbZoneId: streetFurniture.curbZoneId
    }
  });
  expect(catalog.metadataByObjectId[city.waterfrontEdges[0].id]).toMatchObject({
    objectId: city.waterfrontEdges[0].id,
    kind: 'waterfront-edge',
    ownerDomain: 'land',
    parentId: city.waterfrontEdges[0].waterwayId,
    references: {
      waterfrontEdgeId: city.waterfrontEdges[0].id
    }
  });
  expect(catalog.metadataByObjectId[zebraCrossing?.id ?? '']).toMatchObject({
    objectId: zebraCrossing?.id,
    kind: 'lane-marking',
    ownerDomain: 'mobility',
    parentId: zebraCrossing?.crossingId,
    references: {
      roadId: zebraCrossing?.roadId,
      crossingId: zebraCrossing?.crossingId,
      intersectionId: zebraCrossing?.intersectionId
    }
  });
});

test('scene picking metadata resolves regular meshes and instanced meshes', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const materials = new MaterialLibrary();
  const cityScene = new City(city, traffic, materials);

  try {
    const road = city.roads[0];
    const firstZebraCrossing = traffic.markings.find((marking) => marking.markingType === 'zebra-crossing-stripe');
    const roadMesh = cityScene.group.getObjectByName(road.id);
    const buildingInstances = cityScene.group.getObjectByName('BuildingInstances');
    const activeFrontageWindowInstances = cityScene.group.getObjectByName('ActiveFrontageStorefrontWindowInstances');
    const laneDashInstances = cityScene.group.getObjectByName('LaneDashInstances');
    const zebraCrossingInstances = cityScene.group.getObjectByName('ZebraCrossingStripeInstances');
    const benchSeatInstances = cityScene.group.getObjectByName('StreetFurnitureBenchSeatInstances');

    expect(roadMesh).toBeTruthy();
    expect(buildingInstances).toBeTruthy();
    expect(activeFrontageWindowInstances).toBeTruthy();
    expect(laneDashInstances).toBeTruthy();
    expect(zebraCrossingInstances).toBeTruthy();
    expect(benchSeatInstances).toBeTruthy();
    expect(firstZebraCrossing).toBeTruthy();

    const roadPick = cityScene.resolvePickingMetadata([
      { object: roadMesh as THREE.Object3D, distance: 3, point: new THREE.Vector3() } as THREE.Intersection
    ]);
    const buildingPick = cityScene.resolvePickingMetadata([
      { object: buildingInstances as THREE.Object3D, instanceId: 0, distance: 7, point: new THREE.Vector3() } as THREE.Intersection
    ]);
    const laneMarkingPick = cityScene.resolvePickingMetadata([
      { object: laneDashInstances as THREE.Object3D, instanceId: 0, distance: 4, point: new THREE.Vector3() } as THREE.Intersection
    ]);
    const activeFrontagePick = cityScene.resolvePickingMetadata([
      {
        object: activeFrontageWindowInstances as THREE.Object3D,
        instanceId: 0,
        distance: 6,
        point: new THREE.Vector3()
      } as THREE.Intersection
    ]);
    const zebraCrossingPick = cityScene.resolvePickingMetadata([
      { object: zebraCrossingInstances as THREE.Object3D, instanceId: 0, distance: 5, point: new THREE.Vector3() } as THREE.Intersection
    ]);
    const streetFurniturePick = cityScene.resolvePickingMetadata([
      { object: benchSeatInstances as THREE.Object3D, instanceId: 0, distance: 4, point: new THREE.Vector3() } as THREE.Intersection
    ]);

    expect(roadPick).toMatchObject({
      objectId: road.id,
      kind: 'road-segment',
      ownerDomain: 'mobility',
      lod: road.lod,
      sceneLayerId: 'networks',
      references: {
        roadId: road.id
      }
    });
    expect(buildingPick).toMatchObject({
      objectId: city.buildings[0].id,
      kind: 'building',
      ownerDomain: 'buildings',
      instanceId: 0,
      sceneLayerId: 'buildings',
      references: {
        buildingId: city.buildings[0].id,
        parcelId: city.buildings[0].parcelId
      }
    });
    expect(laneMarkingPick).toMatchObject({
      objectId: traffic.markings[0].id,
      kind: 'lane-marking',
      ownerDomain: 'mobility',
      parentId: traffic.markings[0].roadId,
      instanceId: 0,
      sceneLayerId: 'networks',
      references: {
        roadId: traffic.markings[0].roadId
      }
    });
    expect(activeFrontagePick).toMatchObject({
      objectId: city.activeFrontages[0].id,
      kind: 'facade',
      ownerDomain: 'buildings',
      parentId: city.activeFrontages[0].buildingId,
      instanceId: 0,
      sceneLayerId: 'buildings',
      references: {
        buildingId: city.activeFrontages[0].buildingId,
        parcelId: city.activeFrontages[0].parcelId,
        roadId: city.activeFrontages[0].roadId,
        sidewalkId: city.activeFrontages[0].sidewalkId
      }
    });
    expect(zebraCrossingPick).toMatchObject({
      objectId: firstZebraCrossing?.id,
      kind: 'lane-marking',
      ownerDomain: 'mobility',
      parentId: firstZebraCrossing?.crossingId,
      instanceId: 0,
      sceneLayerId: 'networks',
      references: {
        roadId: firstZebraCrossing?.roadId,
        crossingId: firstZebraCrossing?.crossingId,
        intersectionId: firstZebraCrossing?.intersectionId
      }
    });
    expect(streetFurniturePick).toMatchObject({
      objectId: city.streetFurniture[0].id,
      kind: 'street-furniture',
      ownerDomain: 'public-realm',
      parentId: city.streetFurniture[0].sidewalkId,
      instanceId: 0,
      sceneLayerId: 'public-realm',
      references: {
        roadId: city.streetFurniture[0].roadId,
        sidewalkId: city.streetFurniture[0].sidewalkId,
        curbZoneId: city.streetFurniture[0].curbZoneId
      }
    });
  } finally {
    cityScene.dispose();
    materials.dispose();
  }
});

test('browser raycast picking returns city object metadata', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const pick = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const app = window.cityApp;

    if (!canvas || !app) {
      return undefined;
    }

    const rect = canvas.getBoundingClientRect();
    const samplePoints = [
      [0.5, 0.5],
      [0.45, 0.58],
      [0.55, 0.58],
      [0.35, 0.62],
      [0.65, 0.62],
      [0.5, 0.7]
    ];

    for (const [x, y] of samplePoints) {
      const result = app.pickCityObjectAtClientPoint(rect.left + rect.width * x, rect.top + rect.height * y);

      if (result) {
        return result;
      }
    }

    return undefined;
  });

  expect(pick).toEqual(
    expect.objectContaining({
      objectId: expect.any(String),
      kind: expect.any(String),
      ownerDomain: expect.any(String),
      lod: expect.stringMatching(/^lod[0-4]$/),
      renderObjectName: expect.any(String),
      references: expect.any(Object)
    })
  );
});
