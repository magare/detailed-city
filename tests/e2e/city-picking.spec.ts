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
  const buildingEntrance = city.buildingEntrances[0];
  const addressPoint = city.addressPoints[0];
  const accessControl = city.accessControls.find((control) => control.roadIds.length > 0) ?? city.accessControls[0];
  const namedPlace = city.namedPlaces.find((place) => place.placeKind === 'street') ?? city.namedPlaces[0];
  const gazetteerEntry = city.gazetteerEntries[0];
  const parcel = city.parcels.find((candidate) => candidate.id === building.parcelId);
  const activeFrontage = city.activeFrontages[0];
  const streetLight = city.streetLights[0];
  const streetFurniture = city.streetFurniture[0];
  const publicAmenity = city.publicAmenities[0];
  const trafficCalmingDevice = city.trafficCalmingDevices[0];
  const zebraCrossing = traffic.markings.find((marking) => marking.markingType === 'zebra-crossing-stripe');

  expect(catalog.pickableObjectIds).toHaveLength(
      city.roads.length +
      city.buildings.length +
      city.civicAnchors.length +
      city.communityAnchors.length +
      city.cultureAnchors.length +
      city.governmentAnchors.length +
      city.buildingEntrances.length +
      city.addressPoints.length +
      city.accessControls.length +
      city.namedPlaces.length +
      city.gazetteerEntries.length +
      city.activeFrontages.length +
      city.parks.length +
      city.parkFeatures.length +
      city.plazaZones.length +
      city.curbActivations.length +
      city.publicAmenities.length +
      city.waterways.length +
      city.waterfrontEdges.length +
      city.waterfrontOpenSpaces.length +
      city.trees.length +
      city.streetLights.length +
      city.streetFurniture.length +
      city.transitStops.length +
      city.transitRoutes.length +
      city.trafficCalmingDevices.length +
      traffic.markings.length +
      traffic.vehicles.length
  );
  expect(catalog.countsByKind['road-segment']).toBe(city.roads.length);
  expect(catalog.countsByKind.building).toBe(city.buildings.length);
  expect(catalog.countsByKind['building-entrance']).toBe(city.buildingEntrances.length);
  expect(catalog.countsByKind['address-point']).toBe(city.addressPoints.length);
  expect(catalog.countsByKind['access-control']).toBe(city.accessControls.length);
  expect(catalog.countsByKind['named-place']).toBe(city.namedPlaces.length);
  expect(catalog.countsByKind['gazetteer-entry']).toBe(city.gazetteerEntries.length);
  expect(catalog.countsByKind['civic-anchor']).toBe(city.civicAnchors.length);
  expect(catalog.countsByKind['community-anchor']).toBe(city.communityAnchors.length);
  expect(catalog.countsByKind['culture-anchor']).toBe(city.cultureAnchors.length);
  expect(catalog.countsByKind['government-anchor']).toBe(city.governmentAnchors.length);
  expect(catalog.countsByKind.facade).toBe(city.activeFrontages.length);
  expect(catalog.countsByKind['street-light']).toBe(city.streetLights.length);
  expect(catalog.countsByKind['street-furniture']).toBe(city.streetFurniture.length);
  expect(catalog.countsByKind['public-amenity']).toBe(city.publicAmenities.length);
  expect(catalog.countsByKind['transit-stop']).toBe(city.transitStops.length);
  expect(catalog.countsByKind['transit-route']).toBe(city.transitRoutes.length);
  expect(catalog.countsByKind['park-feature']).toBe(city.parkFeatures.length);
  expect(catalog.countsByKind['plaza-zone']).toBe(city.plazaZones.length);
  expect(catalog.countsByKind['curb-activation']).toBe(city.curbActivations.length);
  expect(catalog.countsByKind['traffic-calming-device']).toBe(city.trafficCalmingDevices.length);
  expect(catalog.countsByKind['waterfront-edge']).toBe(city.waterfrontEdges.length);
  expect(catalog.countsByKind['waterfront-open-space']).toBe(city.waterfrontOpenSpaces.length);
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
  expect(catalog.metadataByObjectId[buildingEntrance.id]).toMatchObject({
    objectId: buildingEntrance.id,
    kind: 'building-entrance',
    ownerDomain: 'buildings',
    parentId: buildingEntrance.buildingId,
    lod: buildingEntrance.lod,
    references: {
      buildingId: buildingEntrance.buildingId,
      parcelId: buildingEntrance.parcelId,
      roadId: buildingEntrance.roadId,
      sidewalkId: buildingEntrance.sidewalkId
    }
  });
  expect(catalog.metadataByObjectId[addressPoint.id]).toMatchObject({
    objectId: addressPoint.id,
    kind: 'address-point',
    ownerDomain: 'buildings',
    parentId: addressPoint.buildingId,
    lod: addressPoint.lod,
    references: {
      buildingId: addressPoint.buildingId,
      parcelId: addressPoint.parcelId,
      roadId: addressPoint.roadId
    }
  });
  expect(catalog.metadataByObjectId[accessControl.id]).toMatchObject({
    objectId: accessControl.id,
    kind: 'access-control',
    ownerDomain: 'land',
    parentId: accessControl.parentId,
    lod: accessControl.lod,
    references: {
      roadId: accessControl.roadIds[0],
      sidewalkId: accessControl.sidewalkIds[0],
      crossingId: accessControl.crossingIds[0],
      transitStopId: accessControl.transitStopIds[0]
    }
  });
  expect(catalog.metadataByObjectId[namedPlace.id]).toMatchObject({
    objectId: namedPlace.id,
    kind: 'named-place',
    ownerDomain: 'land',
    parentId: namedPlace.parentId,
    references: {
      roadId: namedPlace.sourceObjectId
    }
  });
  expect(catalog.metadataByObjectId[gazetteerEntry.id]).toMatchObject({
    objectId: gazetteerEntry.id,
    kind: 'gazetteer-entry',
    ownerDomain: 'data-contracts',
    parentId: gazetteerEntry.parentId,
    references: {
      addressPointId: gazetteerEntry.addressPointId
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
  expect(catalog.metadataByObjectId[publicAmenity.id]).toMatchObject({
    objectId: publicAmenity.id,
    kind: 'public-amenity',
    ownerDomain: 'public-realm',
    parentId: publicAmenity.parentId,
    lod: publicAmenity.lod,
    references: {
      roadId: publicAmenity.roadId,
      sidewalkId: publicAmenity.sidewalkId,
      serviceAccessCorridorId: publicAmenity.serviceAccessCorridorId
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
  expect(catalog.metadataByObjectId[city.curbActivations[0].id]).toMatchObject({
    objectId: city.curbActivations[0].id,
    kind: 'curb-activation',
    ownerDomain: 'public-realm',
    parentId: city.curbActivations[0].curbZoneId,
    references: {
      roadId: city.curbActivations[0].roadId,
      sidewalkId: city.curbActivations[0].sidewalkId,
      curbZoneId: city.curbActivations[0].curbZoneId
    }
  });
  expect(catalog.metadataByObjectId[city.waterfrontOpenSpaces[0].id]).toMatchObject({
    objectId: city.waterfrontOpenSpaces[0].id,
    kind: 'waterfront-open-space',
    ownerDomain: 'public-realm',
    parentId: city.waterfrontOpenSpaces[0].waterfrontEdgeId,
    references: {
      waterfrontEdgeId: city.waterfrontOpenSpaces[0].waterfrontEdgeId,
      waterwayId: city.waterfrontOpenSpaces[0].waterwayId
    }
  });
  expect(catalog.metadataByObjectId[city.civicAnchors[0].id]).toMatchObject({
    objectId: city.civicAnchors[0].id,
    kind: 'civic-anchor',
    ownerDomain: 'civic',
    parentId: city.civicAnchors[0].buildingId,
    references: {
      buildingId: city.civicAnchors[0].buildingId,
      parcelId: city.civicAnchors[0].parcelId,
      blockId: city.civicAnchors[0].blockId,
      districtId: city.civicAnchors[0].districtId
    }
  });
  expect(catalog.metadataByObjectId[city.governmentAnchors[0].id]).toMatchObject({
    objectId: city.governmentAnchors[0].id,
    kind: 'government-anchor',
    ownerDomain: 'civic',
    parentId: city.governmentAnchors[0].civicAnchorId,
    references: {
      civicAnchorId: city.governmentAnchors[0].civicAnchorId,
      buildingId: city.governmentAnchors[0].buildingId,
      districtId: city.governmentAnchors[0].districtId
    }
  });
  expect(catalog.metadataByObjectId[city.cultureAnchors[0].id]).toMatchObject({
    objectId: city.cultureAnchors[0].id,
    kind: 'culture-anchor',
    ownerDomain: 'civic',
    parentId: city.cultureAnchors[0].civicAnchorId,
    references: {
      civicAnchorId: city.cultureAnchors[0].civicAnchorId,
      buildingId: city.cultureAnchors[0].buildingId,
      districtId: city.cultureAnchors[0].districtId
    }
  });
  expect(catalog.metadataByObjectId[city.communityAnchors[0].id]).toMatchObject({
    objectId: city.communityAnchors[0].id,
    kind: 'community-anchor',
    ownerDomain: 'civic',
    parentId: city.communityAnchors[0].civicAnchorId,
    references: {
      civicAnchorId: city.communityAnchors[0].civicAnchorId,
      buildingId: city.communityAnchors[0].buildingId,
      districtId: city.communityAnchors[0].districtId
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
    const curbActivationInstances = cityScene.group.getObjectByName('CurbActivationParkletInstances');
    const publicAmenityInstances = cityScene.group.getObjectByName('PublicAmenityFountainInstances');
    const accessControlInstances = cityScene.group.getObjectByName('AccessControlMetalBarrierInstances');
    const firstMetalAccessControl = city.accessControls.find((control) => control.controlKind !== 'wall');
    const firstParklet = city.curbActivations.find((activation) => activation.activationKind === 'parklet');

    expect(roadMesh).toBeTruthy();
    expect(buildingInstances).toBeTruthy();
    expect(activeFrontageWindowInstances).toBeTruthy();
    expect(laneDashInstances).toBeTruthy();
    expect(zebraCrossingInstances).toBeTruthy();
    expect(benchSeatInstances).toBeTruthy();
    expect(curbActivationInstances).toBeTruthy();
    expect(publicAmenityInstances).toBeTruthy();
    expect(accessControlInstances).toBeTruthy();
    expect(firstZebraCrossing).toBeTruthy();
    expect(firstMetalAccessControl).toBeTruthy();
    expect(firstParklet).toBeTruthy();

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
    const curbActivationPick = cityScene.resolvePickingMetadata([
      {
        object: curbActivationInstances as THREE.Object3D,
        instanceId: 0,
        distance: 4,
        point: new THREE.Vector3()
      } as THREE.Intersection
    ]);
    const publicAmenityPick = cityScene.resolvePickingMetadata([
      {
        object: publicAmenityInstances as THREE.Object3D,
        instanceId: 0,
        distance: 4,
        point: new THREE.Vector3()
      } as THREE.Intersection
    ]);
    const accessControlPick = cityScene.resolvePickingMetadata([
      {
        object: accessControlInstances as THREE.Object3D,
        instanceId: 0,
        distance: 4,
        point: new THREE.Vector3()
      } as THREE.Intersection
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
    expect(curbActivationPick).toMatchObject({
      objectId: firstParklet?.id,
      kind: 'curb-activation',
      ownerDomain: 'public-realm',
      parentId: firstParklet?.curbZoneId,
      instanceId: 0,
      sceneLayerId: 'public-realm',
      references: {
        roadId: firstParklet?.roadId,
        sidewalkId: firstParklet?.sidewalkId,
        curbZoneId: firstParklet?.curbZoneId
      }
    });
    expect(publicAmenityPick).toMatchObject({
      objectId: city.publicAmenities[0].id,
      kind: 'public-amenity',
      ownerDomain: 'public-realm',
      parentId: city.publicAmenities[0].parentId,
      instanceId: 0,
      sceneLayerId: 'public-realm',
      references: {
        roadId: city.publicAmenities[0].roadId,
        sidewalkId: city.publicAmenities[0].sidewalkId,
        serviceAccessCorridorId: city.publicAmenities[0].serviceAccessCorridorId
      }
    });
    expect(accessControlPick).toMatchObject({
      objectId: firstMetalAccessControl?.id,
      kind: 'access-control',
      ownerDomain: 'land',
      parentId: firstMetalAccessControl?.parentId,
      instanceId: 0,
      sceneLayerId: 'networks'
    });
  } finally {
    cityScene.dispose();
    materials.dispose();
  }
});

test('browser raycast picking returns city object metadata', async ({ page }) => {
  await page.goto('/?testMode=fast');
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
