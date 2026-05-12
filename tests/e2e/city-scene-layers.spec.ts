import { expect, test } from '@playwright/test';
import { createCitySceneLayerDiagnostics } from '../../src/city/rendering-handoff/scene-layers/sceneLayerDefinitions';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('scene layer diagnostics are deterministic and match current city data', () => {
  const city = new CityGenerator(cityConfig).generate();
  const traffic = new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
  const layers = createCitySceneLayerDiagnostics(city, traffic);
  const roofDetailCount = city.buildings.filter((building) => building.roofStyle !== 'flat').length;

  expect(layers.map((layer) => layer.id)).toEqual([
    'terrain',
    'networks',
    'buildings',
    'public-realm',
    'agents',
    'overlays'
  ]);
  expect(layers.map((layer) => layer.order)).toEqual([0, 1, 2, 3, 4, 5]);
  expect(layers.find((layer) => layer.id === 'terrain')?.objectCount).toBe(1 + city.waterways.length);
  expect(layers.find((layer) => layer.id === 'networks')?.objectCount).toBe(
    city.roads.length + city.trafficCalmingDevices.length + traffic.markings.length
  );
  expect(layers.find((layer) => layer.id === 'buildings')?.objectCount).toBe(
    city.buildings.length + roofDetailCount + city.activeFrontages.length
  );
  expect(layers.find((layer) => layer.id === 'public-realm')?.objectCount).toBe(
    city.parks.length +
      city.waterfrontEdges.length +
      city.trees.length +
      city.streetLights.length +
      city.streetFurniture.length
  );
  expect(layers.find((layer) => layer.id === 'agents')?.objectCount).toBe(traffic.vehicles.length);
  expect(layers.find((layer) => layer.id === 'overlays')?.objectCount).toBe(
    city.administrativeBoundaries.length +
      city.verticalSlices.length +
      city.cityMetrics.length +
      city.constraints.length +
      city.hazardZones.length +
      city.resilienceGoals.length +
      city.zoningDistricts.length
  );
});
