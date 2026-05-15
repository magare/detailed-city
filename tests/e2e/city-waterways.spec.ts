import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('waterway expansion is deterministic and exposes edges, channels, crossings, docks, and outfalls', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const runtimeIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const overlays = createCityOverlayDatasets(firstCity, runtimeIndex);
  const waterway = firstCity.waterways.find((candidate) => candidate.id === 'south-river');

  expect(waterway).toBeDefined();
  expect(firstCity.waterways.map((candidate) => candidate.id)).toEqual(
    secondCity.waterways.map((candidate) => candidate.id)
  );
  expect(waterway).toMatchObject({
    id: 'south-river',
    kind: 'waterway',
    ownerDomain: 'land',
    waterwayKind: 'river',
    flowDirection: 'eastbound'
  });
  expect(waterway?.edgeSegments).toHaveLength(8);
  expect(waterway?.channels.map((channel) => channel.channelKind)).toEqual([
    'main-channel',
    'canal',
    'drainage-channel'
  ]);
  expect(waterway?.crossingRefs).toHaveLength(13);
  expect(waterway?.crossingRefs.filter((crossing) => crossing.crossingKind === 'bridge')).toHaveLength(5);
  expect(waterway?.culverts).toHaveLength(8);
  expect(waterway?.docks).toHaveLength(3);
  expect(waterway?.outfalls).toHaveLength(4);
  expect(waterway?.edgeSegments.find((edge) => edge.id === 'south-river-edge-north-1')).toMatchObject({
    side: 'north',
    edgeKind: 'promenade',
    publicAccess: true,
    connectedSegmentIds: ['south-river-edge-north-0', 'south-river-edge-north-2']
  });
  expect(waterway?.docks[1]).toMatchObject({
    id: 'south-river-dock-1',
    use: 'ferry',
    edgeSegmentId: expect.stringContaining('south-river-edge-north')
  });
  expect(firstCity.validation.issues.filter((issue) => issue.category === 'land')).toEqual([]);
  expect(diagnostics.waterwayNetwork).toMatchObject({
    total: 1,
    edgeSegments: 8,
    continuousEdgeWaterways: 1,
    channels: 3,
    crossings: 13,
    bridges: 5,
    culverts: 8,
    docks: 3,
    outfalls: 4,
    navigableChannels: 2
  });
  expect(overlays.find((overlay) => overlay.id === 'waterways')?.featureCount).toBe(40);
  expect(overlays.find((overlay) => overlay.id === 'waterways')?.features[0]).toMatchObject({
    id: 'overlay:waterways:south-river',
    objectId: 'south-river',
    objectKind: 'waterway',
    ownerDomain: 'land',
    geometry: { type: 'polygon' },
    metadata: {
      waterwayKind: 'river',
      edgeSegments: 8,
      channels: 3,
      crossings: 13,
      culverts: 8,
      docks: 3,
      outfalls: 4
    }
  });
});

test('waterway validation catches disconnected edges and missing crossing, culvert, dock, and outfall references', () => {
  const city = new CityGenerator(cityConfig).generate();
  const waterway = city.waterways[0];
  const invalidWaterway = {
    ...waterway,
    edgeSegments: waterway.edgeSegments.map((edge) =>
      edge.id === 'south-river-edge-north-1' ? { ...edge, connectedSegmentIds: [] } : edge
    ),
    crossingRefs: waterway.crossingRefs.map((crossing, index) =>
      index === 0 ? { ...crossing, roadId: 'road-v-999', clearanceMeters: 0 } : crossing
    ),
    culverts: waterway.culverts.map((culvert, index) =>
      index === 0 ? { ...culvert, inletEdgeSegmentId: 'south-river-edge-missing', outfallIds: ['missing-outfall'] } : culvert
    ),
    docks: waterway.docks.map((dock, index) =>
      index === 0 ? { ...dock, edgeSegmentId: 'south-river-edge-missing', accessRoadId: 'road-v-999' } : dock
    ),
    outfalls: waterway.outfalls.map((outfall, index) =>
      index === 0 ? { ...outfall, edgeSegmentId: 'south-river-edge-missing', receivingWaterwayId: 'missing-waterway' } : outfall
    )
  };
  const invalidCity = {
    ...city,
    waterways: [invalidWaterway]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'waterway-disconnected-north-edge-south-river', category: 'land' }),
      expect.objectContaining({
        id: 'waterway-missing-crossing-road-south-river-crossing-road-v-0-road-v-999-south-river',
        category: 'land'
      }),
      expect.objectContaining({
        id: 'waterway-invalid-crossing-clearance-south-river-crossing-road-v-0-south-river',
        category: 'land'
      }),
      expect.objectContaining({
        id: 'waterway-missing-culvert-edge-south-river-culvert-0-south-river-edge-missing-south-river',
        category: 'land'
      }),
      expect.objectContaining({
        id: 'waterway-missing-dock-edge-south-river-dock-0-south-river-edge-missing-south-river',
        category: 'land'
      }),
      expect.objectContaining({
        id: 'waterway-missing-outfall-waterway-south-river-outfall-0-missing-waterway-south-river',
        category: 'land'
      })
    ])
  );
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}
