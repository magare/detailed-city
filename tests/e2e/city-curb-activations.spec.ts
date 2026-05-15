import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityPickingMetadataCatalog } from '../../src/city/rendering-handoff/picking/pickingMetadata';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';
import type { GeneratedCity } from '../../src/types/city';

test('curb activations are deterministic, permitted, inspectable, and pickable', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const runtimeObjectIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, runtimeObjectIndex);
  const picking = createCityPickingMetadataCatalog(firstCity, traffic, runtimeObjectIndex);
  const permitsById = new Map(firstCity.permitInspectionRecords.map((record) => [record.id, record]));
  const curbZonesById = new Map(firstCity.curbZones.map((zone) => [zone.id, zone]));
  const firstActivation = firstCity.curbActivations[0];

  expect(firstCity.curbActivations.map(getCurbActivationSignature)).toEqual(
    secondCity.curbActivations.map(getCurbActivationSignature)
  );
  expect(firstCity.validation.passed).toBe(true);
  expect(firstCity.curbActivations).toHaveLength(16);
  expect(firstCity.objectIndex.countsByKind['curb-activation']).toBe(16);
  expect(firstCity.curbActivations.every((activation) => activation.ownerDomain === 'public-realm')).toBe(true);
  expect(firstCity.curbActivations.every((activation) => activation.parentId === activation.curbZoneId)).toBe(true);
  expect(firstCity.curbActivations.every((activation) => permitsById.get(activation.permitInspectionRecordId)?.compliance.passed)).toBe(true);
  expect(firstCity.curbActivations.every((activation) => curbZonesById.get(activation.curbZoneId)?.curbUse !== 'emergency')).toBe(true);
  expect(diagnostics.curbActivations).toMatchObject({
    total: 16,
    parklets: 4,
    outdoorDining: 4,
    temporarySeatingDecks: 4,
    interimPlazas: 4,
    seasonalActivations: 12,
    totalSeats: 392,
    barrierCount: 80,
    permittedActivations: 16,
    removableWithin24Hours: 12
  });
  expect(overlays.find((overlay) => overlay.id === 'curb-activations')?.featureCount).toBe(16);
  expect(picking.countsByKind['curb-activation']).toBe(16);
  expect(picking.metadataByObjectId[firstActivation.id]).toMatchObject({
    objectId: firstActivation.id,
    kind: 'curb-activation',
    ownerDomain: 'public-realm',
    parentId: firstActivation.curbZoneId,
    lod: firstActivation.lod,
    references: {
      roadId: firstActivation.roadId,
      sidewalkId: firstActivation.sidewalkId,
      curbZoneId: firstActivation.curbZoneId
    }
  });
});

test('curb activation validation catches unsafe curbs, permits, clearances, geometry, and bindings', () => {
  const city = new CityGenerator(cityConfig).generate();
  const activation = city.curbActivations[0];
  const curbZone = city.curbZones.find((zone) => zone.id === activation.curbZoneId);

  expect(curbZone).toBeDefined();

  const invalidActivation = {
    ...activation,
    endMeters: curbZone!.endMeters + 8,
    permitInspectionRecordId: 'missing-permit',
    clearances: {
      ...activation.clearances,
      accessiblePathMeters: 1.2,
      emergencyAccess: false,
      transitStopClearance: false,
      drainageInletClearance: false
    },
    protection: {
      ...activation.protection,
      barrierCount: 1,
      reflectiveMarkers: false
    },
    seatingCapacity: 0,
    seasonality: {
      ...activation.seasonality,
      activeToDay: activation.seasonality.activeFromDay - 1,
      removalDay: activation.seasonality.activeFromDay - 2,
      removableWithinHours: 0
    },
    assetBindingId: 'missing-curb-activation-binding'
  };
  const invalidCurbZone = {
    ...curbZone!,
    curbUse: 'bus-stop' as const,
    management: {
      ...curbZone!.management,
      fireLaneClearance: false,
      transitStopClearance: false
    }
  };
  const invalidCity = {
    ...city,
    curbZones: city.curbZones.map((zone) => (zone.id === invalidCurbZone.id ? invalidCurbZone : zone)),
    curbActivations: [
      invalidActivation,
      ...city.curbActivations.filter((candidate) => candidate.id !== activation.id)
    ]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: `curb-activation-unsafe-curb-use-${activation.id}`,
        category: 'graph',
        objectId: activation.id
      }),
      expect.objectContaining({
        id: `curb-activation-invalid-geometry-${activation.id}`,
        category: 'geometry',
        objectId: activation.id
      }),
      expect.objectContaining({
        id: `curb-activation-invalid-permit-${activation.id}`,
        category: 'graph',
        objectId: activation.id
      }),
      expect.objectContaining({
        id: `curb-activation-blocked-clearance-${activation.id}`,
        category: 'graph',
        objectId: activation.id
      }),
      expect.objectContaining({
        id: `curb-activation-invalid-protection-${activation.id}`,
        category: 'graph',
        objectId: activation.id
      }),
      expect.objectContaining({
        id: `curb-activation-invalid-seasonality-${activation.id}`,
        category: 'graph',
        objectId: activation.id
      }),
      expect.objectContaining({
        id: `curb-activation-invalid-binding-${activation.id}`,
        category: 'asset',
        objectId: activation.id
      })
    ])
  );
});

test('curb activation diagnostics, overlay, and render instances are visible in browser surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => {
    const names: string[] = [];
    const cityApp = window.cityApp as unknown as { city?: { group: { traverse(callback: (object: { name: string }) => void): void } } };

    cityApp.city?.group.traverse((object) => {
      if (object.name.includes('CurbActivation')) {
        names.push(object.name);
      }
    });

    return {
      validationPassed: window.cityDiagnostics?.validation.passed,
      curbActivations: window.cityDiagnostics?.curbActivations,
      curbActivationObjects: window.cityDiagnostics?.objectCounts.curbActivations,
      overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'curb-activations')?.featureCount,
      renderedNames: names,
      panelText: document.body.innerText
    };
  });

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.curbActivations?.total).toBe(16);
  expect(diagnostics.curbActivations?.parklets).toBe(4);
  expect(diagnostics.curbActivations?.outdoorDining).toBe(4);
  expect(diagnostics.curbActivations?.totalSeats).toBe(392);
  expect(diagnostics.curbActivationObjects).toBe(16);
  expect(diagnostics.overlayFeatures).toBe(16);
  expect(diagnostics.renderedNames).toEqual(
    expect.arrayContaining([
      'CurbActivations',
      'CurbActivationParkletInstances',
      'CurbActivationDiningInstances',
      'CurbActivationDeckInstances',
      'CurbActivationInterimPlazaInstances',
      'CurbActivationBarrierInstances'
    ])
  );
  expect(diagnostics.panelText).toContain('Curb Activation');
  expect(diagnostics.panelText).toContain('16 active, 4 parklets, 392 seats');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function getCurbActivationSignature(activation: GeneratedCity['curbActivations'][number]): readonly unknown[] {
  return [
    activation.id,
    activation.activationKind,
    activation.status,
    activation.curbZoneId,
    activation.permitInspectionRecordId,
    activation.roadId,
    activation.sidewalkId,
    activation.side,
    activation.startMeters,
    activation.endMeters,
    activation.lengthMeters,
    activation.widthMeters,
    activation.center.x,
    activation.center.z,
    activation.seatingCapacity,
    activation.protection.barrierKind,
    activation.protection.barrierCount,
    activation.clearances.accessiblePathMeters,
    activation.clearances.emergencyAccess,
    activation.clearances.transitStopClearance,
    activation.clearances.drainageInletClearance,
    activation.seasonality.season,
    activation.seasonality.activeFromDay,
    activation.seasonality.activeToDay,
    activation.seasonality.removalDay,
    activation.seasonality.removableWithinHours,
    activation.assetBindingId
  ];
}
