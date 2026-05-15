import { expect, test } from '@playwright/test';
import { createCityDiagnostics } from '../../src/app/cityDiagnostics';
import { createGeneratedCityObjectIndex, createGeneratedRuntimeObjectIndex } from '../../src/city/data-contracts/generatedCityObjectIndex';
import {
  createProceduralSeedJsonExport,
  mapAddressPointToOsmAddressTags,
  mapOsmAddressTagsToAddressFields
} from '../../src/city/data-contracts/import-export';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { renderConfig } from '../../src/config/renderConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';
import { TrafficLaneGenerator } from '../../src/generation/traffic/TrafficLaneGenerator';

test('addressing gazetteer is deterministic, indexed, diagnosed, and import mappable', () => {
  const firstCity = new CityGenerator(cityConfig).generate();
  const secondCity = new CityGenerator(cityConfig).generate();
  const traffic = createTraffic(firstCity);
  const runtimeObjectIndex = createGeneratedRuntimeObjectIndex(firstCity, traffic);
  const diagnostics = createCityDiagnostics(firstCity, traffic, renderConfig);
  const overlays = createCityOverlayDatasets(firstCity, runtimeObjectIndex);
  const exportArtifact = createProceduralSeedJsonExport(firstCity, { seed: cityConfig.seed, config: cityConfig });
  const firstAddress = firstCity.addressPoints[0];
  const mappedTags = mapAddressPointToOsmAddressTags(firstAddress);

  expect(firstCity.namedPlaces.map((place) => place.id)).toEqual(secondCity.namedPlaces.map((place) => place.id));
  expect(firstCity.gazetteerEntries.map((entry) => entry.id)).toEqual(
    secondCity.gazetteerEntries.map((entry) => entry.id)
  );
  expect(firstCity.validation.passed).toBe(true);
  expect(firstCity.objectIndex.countsByKind['named-place']).toBe(firstCity.namedPlaces.length);
  expect(firstCity.objectIndex.countsByKind['gazetteer-entry']).toBe(firstCity.gazetteerEntries.length);
  expect(firstCity.addressPoints.every((addressPoint) => Boolean(addressPoint.formattedAddress))).toBe(true);
  expect(firstCity.addressPoints.every((addressPoint) => (addressPoint.placeIds ?? []).length >= 4)).toBe(true);
  expect(firstCity.civicAnchors.every((anchor) => (anchor.addressPointIds ?? []).length > 0)).toBe(true);
  expect(firstCity.communityAnchors.every((anchor) => (anchor.addressPointIds ?? []).length > 0)).toBe(true);
  expect(firstCity.cultureAnchors.every((anchor) => (anchor.addressPointIds ?? []).length > 0)).toBe(true);
  expect(firstCity.governmentAnchors.every((anchor) => (anchor.addressPointIds ?? []).length > 0)).toBe(true);
  expect(firstCity.healthcareAnchors.every((anchor) => (anchor.addressPointIds ?? []).length > 0)).toBe(true);
  expect(countPlacesByKind(firstCity.namedPlaces)).toMatchObject({
    neighborhood: firstCity.administrativeBoundaries.filter((boundary) => boundary.boundaryKind === 'neighborhood').length,
    ward: firstCity.administrativeBoundaries.filter((boundary) => boundary.boundaryKind === 'ward').length,
    street: firstCity.roads.length,
    'civic-anchor': firstCity.civicAnchors.length
  });
  expect(countEntriesByKind(firstCity.gazetteerEntries)).toMatchObject({
    address: firstCity.addressPoints.length,
    anchor:
      firstCity.civicAnchors.length +
      firstCity.communityAnchors.length +
      firstCity.cultureAnchors.length +
      firstCity.governmentAnchors.length +
      firstCity.healthcareAnchors.length
  });
  expect(diagnostics.addressingGazetteer).toMatchObject({
    addressPoints: firstCity.addressPoints.length,
    formattedAddressPoints: firstCity.addressPoints.length,
    namedPlaces: firstCity.namedPlaces.length,
    gazetteerEntries: firstCity.gazetteerEntries.length,
    addressEntries: firstCity.addressPoints.length,
    reverseLookupEntries: firstCity.gazetteerEntries.length,
    importMappableAddresses: firstCity.addressPoints.length,
    civicAnchorsWithAddresses: firstCity.civicAnchors.length,
    healthcareAnchorsWithAddresses: firstCity.healthcareAnchors.length
  });
  expect(overlays.find((overlay) => overlay.id === 'addressing-gazetteer')?.featureCount).toBe(
    firstCity.namedPlaces.length + firstCity.gazetteerEntries.length
  );
  expect(exportArtifact.domainSectionCounts.namedPlaces).toBe(firstCity.namedPlaces.length);
  expect(exportArtifact.domainSectionCounts.gazetteerEntries).toBe(firstCity.gazetteerEntries.length);
  expect(exportArtifact.city.namedPlaces).toHaveLength(firstCity.namedPlaces.length);
  expect(exportArtifact.city.gazetteerEntries).toHaveLength(firstCity.gazetteerEntries.length);
  expect(mappedTags).toMatchObject({
    'addr:housenumber': firstAddress.buildingNumber,
    'addr:street': firstAddress.streetName,
    'addr:postcode': firstAddress.postalCode
  });
  expect(mapOsmAddressTagsToAddressFields(mappedTags)).toMatchObject({
    buildingNumber: firstAddress.buildingNumber,
    streetName: firstAddress.streetName,
    postalCode: firstAddress.postalCode
  });
});

test('addressing gazetteer validation catches missing context, broken place refs, and anchor address gaps', () => {
  const city = new CityGenerator(cityConfig).generate();
  const invalidAddress = {
    ...city.addressPoints[0],
    formattedAddress: undefined,
    placeIds: ['missing-place'],
    importTags: {}
  };
  const invalidCivicAnchor = {
    ...city.civicAnchors[0],
    addressPointIds: []
  };
  const invalidCity = {
    ...city,
    addressPoints: [invalidAddress, ...city.addressPoints.slice(1)],
    civicAnchors: [invalidCivicAnchor, ...city.civicAnchors.slice(1)]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });

  expect(validation.passed).toBe(false);
  expect(validation.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: expect.stringContaining('missing-gazetteer-context'),
        category: 'zoning',
        objectId: invalidAddress.id
      }),
      expect.objectContaining({
        id: expect.stringContaining('missing-import-tags'),
        category: 'zoning',
        objectId: invalidAddress.id
      }),
      expect.objectContaining({
        id: expect.stringContaining('missing-named-place-missing-place'),
        category: 'zoning',
        objectId: invalidAddress.id
      }),
      expect.objectContaining({
        id: `invalid-anchor-${invalidCivicAnchor.id}-missing-address`,
        category: 'land',
        objectId: invalidCivicAnchor.id
      })
    ])
  );
});

test('addressing gazetteer diagnostics are visible in browser debug surfaces', async ({ page }) => {
  await page.goto('/?testMode=fast');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  const diagnostics = await page.evaluate(() => ({
    validationPassed: window.cityDiagnostics?.validation.passed,
    namedPlaces: window.cityDiagnostics?.addressingGazetteer.namedPlaces,
    gazetteerEntries: window.cityDiagnostics?.addressingGazetteer.gazetteerEntries,
    reverseLookupEntries: window.cityDiagnostics?.addressingGazetteer.reverseLookupEntries,
    importMappableAddresses: window.cityDiagnostics?.addressingGazetteer.importMappableAddresses,
    overlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'addressing-gazetteer')
      ?.featureCount,
    panelText: document.body.innerText
  }));

  expect(diagnostics.validationPassed).toBe(true);
  expect(diagnostics.namedPlaces).toBeGreaterThan(0);
  expect(diagnostics.gazetteerEntries).toBeGreaterThan(diagnostics.namedPlaces ?? 0);
  expect(diagnostics.reverseLookupEntries).toBe(diagnostics.gazetteerEntries);
  expect(diagnostics.importMappableAddresses).toBe(583);
  expect(diagnostics.overlayFeatures).toBe((diagnostics.namedPlaces ?? 0) + (diagnostics.gazetteerEntries ?? 0));
  expect(diagnostics.panelText).toContain('Gazetteer');
});

function createTraffic(city: ReturnType<CityGenerator['generate']>) {
  return new TrafficLaneGenerator().create({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections
  });
}

function countPlacesByKind(places: ReturnType<CityGenerator['generate']>['namedPlaces']): Record<string, number> {
  return places.reduce<Record<string, number>>((counts, place) => {
    counts[place.placeKind] = (counts[place.placeKind] ?? 0) + 1;
    return counts;
  }, {});
}

function countEntriesByKind(entries: ReturnType<CityGenerator['generate']>['gazetteerEntries']): Record<string, number> {
  return entries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.entryKind] = (counts[entry.entryKind] ?? 0) + 1;
    return counts;
  }, {});
}
