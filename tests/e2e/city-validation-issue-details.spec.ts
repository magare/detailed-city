import { expect, test } from '@playwright/test';
import {
  createGeneratedCityObjectIndex,
  createGeneratedRuntimeObjectIndex
} from '../../src/city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../../src/city/data-contracts/validation/validateGeneratedCity';
import { createCityOverlayDatasets } from '../../src/city/rendering-handoff/overlays/overlayData';
import { cityConfig } from '../../src/config/cityConfig';
import { CityGenerator } from '../../src/generation/CityGenerator';

test('generated validation issues include affected points and suggested fixes when inferable', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [road, ...remainingRoads] = city.roads;
  const invalidRoad = {
    ...road,
    length: 0,
    width: 0,
    widthMeters: 0,
    laneCount: 0
  };
  const invalidCity = {
    ...city,
    roads: [invalidRoad, ...remainingRoads]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const issue = validation.issues.find((candidate) => candidate.id === `invalid-road-${road.id}`);

  expect(issue).toMatchObject({
    severity: 'error',
    category: 'geometry',
    objectId: road.id,
    affectedPoint: road.center,
    suggestedFix: expect.stringContaining('positive length')
  });
});

test('generated validation issues include affected boundaries when polygon coordinates are invalid', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [parcel, ...remainingParcels] = city.parcels;
  const invalidBoundary = [{ ...parcel.boundary[0], x: city.geospatial.localBounds.maxX + 100 }, ...parcel.boundary.slice(1)];
  const invalidParcel = {
    ...parcel,
    boundary: invalidBoundary
  };
  const invalidCity = {
    ...city,
    parcels: [invalidParcel, ...remainingParcels]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const issue = validation.issues.find(
    (candidate) => candidate.id === `coordinate-out-of-bounds-${parcel.id}-boundary-0-x`
  );

  expect(issue).toMatchObject({
    severity: 'error',
    category: 'geometry',
    objectId: parcel.id,
    affectedPoint: invalidBoundary[0],
    affectedBoundary: invalidBoundary,
    suggestedFix: expect.stringContaining('local x bounds')
  });
});

test('validation overlay features expose focus targets and remediation text', () => {
  const city = new CityGenerator(cityConfig).generate();
  const [road, ...remainingRoads] = city.roads;
  const invalidRoad = {
    ...road,
    length: 0,
    width: 0,
    widthMeters: 0,
    laneCount: 0
  };
  const invalidCity = {
    ...city,
    roads: [invalidRoad, ...remainingRoads]
  };
  const validation = validateGeneratedCity({
    ...invalidCity,
    objectIndex: createGeneratedCityObjectIndex(invalidCity)
  });
  const issue = validation.issues.find((candidate) => candidate.id === `invalid-road-${road.id}`);

  expect(issue).toBeDefined();

  const invalidCityWithValidation = {
    ...invalidCity,
    validation: {
      passed: false,
      issues: [issue!]
    }
  };
  const runtimeIndex = createGeneratedRuntimeObjectIndex(invalidCityWithValidation, { markings: [], vehicles: [] });
  const validationOverlay = createCityOverlayDatasets(invalidCityWithValidation, runtimeIndex).find(
    (overlay) => overlay.id === 'validation-issues'
  );

  expect(validationOverlay?.features[0]).toMatchObject({
    id: `overlay:validation-issues:invalid-road-${road.id}`,
    objectId: road.id,
    geometry: {
      type: 'point',
      point: road.center
    },
    focus: {
      objectId: road.id,
      point: road.center,
      suggestedFix: expect.stringContaining('positive length')
    },
    metadata: {
      validationIssueId: `invalid-road-${road.id}`,
      suggestedFix: expect.stringContaining('positive length'),
      focusObjectId: road.id
    }
  });
});
