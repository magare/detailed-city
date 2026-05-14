import { expect, test } from '@playwright/test';
import { createGeneratedCityObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { validateTrafficPlan } from '../../src/city/data-contracts/validation/validateTrafficPlan';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('traffic calming devices are deterministic and reduce detailed-street speed policy', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const byKind = countByKind(firstCity.trafficCalmingDevices);
  const speedTable = firstCity.trafficCalmingDevices.find((device) => device.deviceKind === 'speed-table');
  const busBulb = firstCity.trafficCalmingDevices.find((device) => device.deviceKind === 'bus-bulb');
  const detailedStreetVehicle = traffic.vehicles.find((vehicle) => vehicle.roadId === 'road-v-6');

  expect(firstCity.trafficCalmingDevices.map((device) => device.id)).toEqual(
    secondCity.trafficCalmingDevices.map((device) => device.id)
  );
  expect(firstCity.trafficCalmingDevices).toHaveLength(12);
  expect(byKind).toEqual({
    'neighborhood-gateway': 2,
    'bus-bulb': 2,
    'curb-extension': 2,
    'speed-hump': 1,
    chicane: 1,
    'speed-table': 2,
    pinchpoint: 1,
    'speed-cushion': 1
  });
  expect(speedTable).toMatchObject({
    id: 'traffic-calming-road-v-6-speed-table-0',
    kind: 'traffic-calming-device',
    ownerDomain: 'mobility',
    parentId: 'road-v-6',
    roadId: 'road-v-6',
    deviceKind: 'speed-table',
    targetSpeedKph: 15,
    designSpeedKph: 40,
    emergencyVehicleClearanceMeters: 3.6,
    accessibleClearPathMeters: 2.1,
    assetBindingId: 'binding:road:traffic-calming'
  });
  expect(busBulb?.curbZoneIds[0]).toMatch(/^curb-zone-road-v-6-right-segment-\d+-bus-stop$/);
  expect(firstCity.objectIndex.objectsById[speedTable?.id ?? '']).toEqual(speedTable);
  expect(detailedStreetVehicle).toMatchObject({
    roadId: 'road-v-6',
    speedLimitKph: 15,
    speed: 2.58
  });
  expect(validateTraffic(firstCity, traffic).issues).toEqual([]);
  expect(firstCity.validation.issues.filter((issue) => issue.objectId === speedTable?.id)).toEqual([]);
});

test('validation rejects calming devices that block access or ignore road speed policy', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [firstDevice, ...remainingDevices] = city.trafficCalmingDevices;
  const invalidCity = {
    ...city,
    trafficCalmingDevices: [
      {
        ...firstDevice,
        targetSpeedKph: firstDevice.designSpeedKph,
        emergencyVehicleClearanceMeters: 2.4,
        accessibleClearPathMeters: 1.2,
        assetBindingId: 'binding:road:lane-marking'
      },
      ...remainingDevices
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: `invalid-traffic-calming-speed-policy-${firstDevice.id}`, category: 'graph' }),
      expect.objectContaining({ id: `traffic-calming-blocks-access-${firstDevice.id}`, category: 'graph' }),
      expect.objectContaining({ id: `invalid-traffic-calming-asset-binding-${firstDevice.id}`, category: 'asset' })
    ])
  );
});

test('browser diagnostics expose traffic calming counts', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    trafficValidationPassed: window.cityDiagnostics?.trafficValidation.passed,
    devices: window.cityDiagnostics?.trafficCalming.total,
    curbExtensions: window.cityDiagnostics?.trafficCalming.curbExtensions,
    busBulbs: window.cityDiagnostics?.trafficCalming.busBulbs,
    speedTables: window.cityDiagnostics?.trafficCalming.speedTables,
    minimumTargetSpeedKph: window.cityDiagnostics?.trafficCalming.minimumTargetSpeedKph,
    networkLayerObjects: window.cityDiagnostics?.sceneLayers.find((layer) => layer.id === 'networks')?.objectCount,
    debugText: document.querySelector('[data-city-debug-panel="true"]')?.textContent ?? ''
  }));

  expect(diagnostics).toMatchObject({
    validationPassed: true,
    trafficValidationPassed: true,
    devices: 12,
    curbExtensions: 2,
    busBulbs: 2,
    speedTables: 2,
    minimumTargetSpeedKph: 15,
    networkLayerObjects: 2230
  });
  expect(diagnostics.debugText).toContain('Calming');
  expect(diagnostics.debugText).toContain('12 devices, 2 curb, 15kph min');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices
  });
}

function validateTraffic(
  city: ReturnType<CityGenerator['generate']>,
  traffic: ReturnType<TrafficLaneGenerator['create']>
) {
  return validateTrafficPlan({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    trafficCalmingDevices: city.trafficCalmingDevices,
    assetBindings: city.assetBindings,
    traffic
  });
}

function countByKind(
  devices: ReturnType<CityGenerator['generate']>['trafficCalmingDevices']
): Record<string, number> {
  return devices.reduce<Record<string, number>>((counts, device) => {
    counts[device.deviceKind] = (counts[device.deviceKind] ?? 0) + 1;
    return counts;
  }, {});
}
