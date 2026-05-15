import type { CityObjectKind, CityId, Point2D } from '../../city/data-contracts/cityContracts';
import type {
  AddressPoint,
  AdministrativeBoundaryPlan,
  BuildingPlan,
  CivicAnchor,
  CommunityAnchor,
  CultureAnchor,
  DistrictPlan,
  GazetteerEntry,
  GovernmentAnchor,
  NamedPlace,
  Parcel,
  ParkPatch,
  RoadSegment,
  WaterfrontOpenSpace
} from '../../types/city';

export interface AddressingGazetteerInput {
  readonly addressPoints: readonly AddressPoint[];
  readonly administrativeBoundaries: readonly AdministrativeBoundaryPlan[];
  readonly districts: readonly DistrictPlan[];
  readonly parcels: readonly Parcel[];
  readonly buildings: readonly BuildingPlan[];
  readonly roads: readonly RoadSegment[];
  readonly parks: readonly ParkPatch[];
  readonly waterfrontOpenSpaces: readonly WaterfrontOpenSpace[];
  readonly civicAnchors: readonly CivicAnchor[];
  readonly communityAnchors: readonly CommunityAnchor[];
  readonly cultureAnchors: readonly CultureAnchor[];
  readonly governmentAnchors: readonly GovernmentAnchor[];
}

export interface AddressingGazetteerOutput {
  readonly addressPoints: AddressPoint[];
  readonly namedPlaces: NamedPlace[];
  readonly gazetteerEntries: GazetteerEntry[];
  readonly civicAnchors: CivicAnchor[];
  readonly communityAnchors: CommunityAnchor[];
  readonly cultureAnchors: CultureAnchor[];
  readonly governmentAnchors: GovernmentAnchor[];
}

export class AddressingGazetteerGenerator {
  create(input: AddressingGazetteerInput): AddressingGazetteerOutput {
    const boundariesById = new Map(input.administrativeBoundaries.map((boundary) => [boundary.id, boundary]));
    const parcelsById = new Map(input.parcels.map((parcel) => [parcel.id, parcel]));
    const buildingsById = new Map(input.buildings.map((building) => [building.id, building]));
    const roadsById = new Map(input.roads.map((road) => [road.id, road]));
    const namedPlaces = this.createNamedPlaces(input);
    const placeBySourceId = new Map(namedPlaces.map((place) => [place.sourceObjectId, place]));
    const placeIdsByBuildingId = this.collectPlaceIdsByBuilding(input, namedPlaces);
    const enrichedAddressPoints = input.addressPoints.map((addressPoint) => {
      const parcel = parcelsById.get(addressPoint.parcelId);
      const road = roadsById.get(addressPoint.roadId);
      const neighborhood = parcel?.neighborhoodId ? boundariesById.get(parcel.neighborhoodId) : undefined;
      const ward = parcel?.wardId ? boundariesById.get(parcel.wardId) : undefined;
      const building = buildingsById.get(addressPoint.buildingId);
      const unitRange = addressPoint.unitRange ?? (building && building.floorCount > 1 ? `1-${building.floorCount}` : undefined);
      const placeIds = [
        neighborhood ? placeBySourceId.get(neighborhood.id)?.id : undefined,
        ward ? placeBySourceId.get(ward.id)?.id : undefined,
        parcel ? placeBySourceId.get(parcel.districtId)?.id : undefined,
        road ? placeBySourceId.get(road.id)?.id : undefined,
        ...(placeIdsByBuildingId.get(addressPoint.buildingId) ?? [])
      ].filter((placeId): placeId is CityId => Boolean(placeId));

      return {
        ...addressPoint,
        unitRange,
        formattedAddress: formatAddress(addressPoint.buildingNumber, addressPoint.streetName, unitRange, neighborhood?.name, addressPoint.postalCode),
        administrativeBoundaryIds: parcel?.administrativeBoundaryIds ?? [],
        wardId: ward?.id,
        wardName: ward?.name,
        neighborhoodId: neighborhood?.id,
        neighborhoodName: neighborhood?.name,
        districtId: parcel?.districtId,
        placeIds,
        importTags: createAddressImportTags(addressPoint, unitRange)
      };
    });
    const enrichedAddressByBuildingId = new Map(enrichedAddressPoints.map((addressPoint) => [addressPoint.buildingId, addressPoint]));
    const civicAnchors = attachAnchorAddresses(input.civicAnchors, enrichedAddressByBuildingId);
    const communityAnchors = attachAnchorAddresses(input.communityAnchors, enrichedAddressByBuildingId);
    const cultureAnchors = attachAnchorAddresses(input.cultureAnchors, enrichedAddressByBuildingId);
    const governmentAnchors = attachAnchorAddresses(input.governmentAnchors, enrichedAddressByBuildingId);

    return {
      addressPoints: enrichedAddressPoints,
      namedPlaces: this.attachAddressMembership(namedPlaces, enrichedAddressPoints),
      gazetteerEntries: [
        ...enrichedAddressPoints.map((addressPoint) => createAddressGazetteerEntry(addressPoint)),
        ...this.attachAddressMembership(namedPlaces, enrichedAddressPoints).map((place) => createPlaceGazetteerEntry(place)),
        ...createAnchorGazetteerEntries([...civicAnchors, ...communityAnchors, ...cultureAnchors, ...governmentAnchors], enrichedAddressByBuildingId)
      ],
      civicAnchors,
      communityAnchors,
      cultureAnchors,
      governmentAnchors
    };
  }

  private createNamedPlaces(input: AddressingGazetteerInput): NamedPlace[] {
    const administrativePlaces = input.administrativeBoundaries
      .filter((boundary) => boundary.boundaryKind === 'neighborhood' || boundary.boundaryKind === 'ward')
      .map((boundary) =>
        createNamedPlace({
          placeKind: boundary.boundaryKind === 'ward' ? 'ward' : 'neighborhood',
          sourceObjectId: boundary.id,
          sourceObjectKind: 'administrative-boundary',
          parentId: boundary.id,
          name: boundary.name ?? titleFromId(boundary.id),
          center: boundary.center,
          boundary: boundary.boundary,
          administrativeBoundaryIds: [boundary.id],
          districtIds: boundary.districtIds,
          placeTags: [boundary.boundaryKind, boundary.authority]
        })
      );
    const districtPlaces = input.districts.map((district) =>
      createNamedPlace({
        placeKind: 'district',
        sourceObjectId: district.id,
        sourceObjectKind: 'district',
        parentId: district.id,
        name: district.name ?? titleFromId(district.id),
        center: getPolygonCenter(district.boundary),
        boundary: district.boundary,
        districtIds: [district.id],
        placeTags: ['district', district.district]
      })
    );
    const streetPlaces = input.roads.map((road) =>
      createNamedPlace({
        placeKind: 'street',
        sourceObjectId: road.id,
        sourceObjectKind: 'road-segment',
        parentId: road.id,
        name: road.corridorName,
        center: road.center,
        roadIds: [road.id],
        placeTags: ['street', road.hierarchy, road.streetProfileId]
      })
    );
    const parkPlaces = input.parks.map((park) =>
      createNamedPlace({
        placeKind: 'park',
        sourceObjectId: park.id,
        sourceObjectKind: 'park',
        parentId: park.id,
        name: park.name ?? titleFromId(park.id),
        center: park.center,
        boundary: park.boundary,
        placeTags: ['park']
      })
    );
    const waterfrontPlaces = input.waterfrontOpenSpaces.map((openSpace) =>
      createNamedPlace({
        placeKind: 'waterfront',
        sourceObjectId: openSpace.id,
        sourceObjectKind: 'waterfront-open-space',
        parentId: openSpace.id,
        name: openSpace.name ?? titleFromId(openSpace.id),
        center: openSpace.center,
        boundary: openSpace.boundary,
        placeTags: ['waterfront', openSpace.openSpaceKind]
      })
    );
    const civicPlaces = input.civicAnchors.map((anchor) =>
      createNamedPlace({
        placeKind: 'civic-anchor',
        sourceObjectId: anchor.id,
        sourceObjectKind: 'civic-anchor',
        parentId: anchor.id,
        name: anchor.name ?? titleFromId(anchor.id),
        center: anchor.center,
        administrativeBoundaryIds: anchor.administrativeBoundaryIds,
        districtIds: [anchor.districtId],
        buildingIds: [anchor.buildingId],
        placeTags: ['civic-anchor', anchor.serviceType]
      })
    );

    return [...administrativePlaces, ...districtPlaces, ...streetPlaces, ...parkPlaces, ...waterfrontPlaces, ...civicPlaces];
  }

  private attachAddressMembership(namedPlaces: readonly NamedPlace[], addressPoints: readonly AddressPoint[]): NamedPlace[] {
    return namedPlaces.map((place) => ({
      ...place,
      addressPointIds: addressPoints
        .filter(
          (addressPoint) =>
            addressPoint.placeIds?.includes(place.id) ||
            addressPoint.neighborhoodId === place.sourceObjectId ||
            addressPoint.wardId === place.sourceObjectId ||
            addressPoint.districtId === place.sourceObjectId ||
            addressPoint.roadId === place.sourceObjectId
        )
        .map((addressPoint) => addressPoint.id)
    }));
  }

  private collectPlaceIdsByBuilding(input: AddressingGazetteerInput, namedPlaces: readonly NamedPlace[]): Map<CityId, CityId[]> {
    const placeIdsBySourceId = new Map(namedPlaces.map((place) => [place.sourceObjectId, place.id]));
    const placeIdsByBuildingId = new Map<CityId, CityId[]>();

    for (const anchor of input.civicAnchors) {
      const placeId = placeIdsBySourceId.get(anchor.id);
      if (placeId) {
        placeIdsByBuildingId.set(anchor.buildingId, [...(placeIdsByBuildingId.get(anchor.buildingId) ?? []), placeId]);
      }
    }

    return placeIdsByBuildingId;
  }
}

function createNamedPlace(input: {
  readonly placeKind: NamedPlace['placeKind'];
  readonly sourceObjectId: CityId;
  readonly sourceObjectKind: CityObjectKind;
  readonly parentId: CityId;
  readonly name: string;
  readonly center: Point2D;
  readonly boundary?: NamedPlace['boundary'];
  readonly administrativeBoundaryIds?: readonly CityId[];
  readonly districtIds?: readonly CityId[];
  readonly roadIds?: readonly CityId[];
  readonly buildingIds?: readonly CityId[];
  readonly placeTags: readonly string[];
}): NamedPlace {
  return {
    id: `named-place-${input.placeKind}-${slugify(input.sourceObjectId)}`,
    kind: 'named-place',
    ownerDomain: 'land',
    parentId: input.parentId,
    lod: input.placeKind === 'district' ? 'lod1' : 'lod2',
    placeKind: input.placeKind,
    name: input.name,
    normalizedName: normalizeName(input.name),
    sourceObjectId: input.sourceObjectId,
    sourceObjectKind: input.sourceObjectKind,
    center: input.center,
    boundary: input.boundary,
    addressPointIds: [],
    administrativeBoundaryIds: input.administrativeBoundaryIds ?? [],
    districtIds: input.districtIds ?? [],
    roadIds: input.roadIds ?? [],
    buildingIds: input.buildingIds ?? [],
    placeTags: input.placeTags
  };
}

function createAddressGazetteerEntry(addressPoint: AddressPoint): GazetteerEntry {
  return {
    id: `gazetteer-entry-address-${slugify(addressPoint.id)}`,
    kind: 'gazetteer-entry',
    ownerDomain: 'data-contracts',
    parentId: addressPoint.id,
    lod: 'lod2',
    entryKind: 'address',
    displayName: addressPoint.formattedAddress ?? `${addressPoint.buildingNumber} ${addressPoint.streetName}`,
    normalizedName: normalizeName(addressPoint.formattedAddress ?? `${addressPoint.buildingNumber} ${addressPoint.streetName}`),
    searchTokens: tokenize([addressPoint.buildingNumber, addressPoint.streetName, addressPoint.unitRange, addressPoint.neighborhoodName, addressPoint.postalCode]),
    sourceObjectId: addressPoint.id,
    sourceObjectKind: 'address-point',
    position: addressPoint.position,
    reverseLookupRadiusMeters: 18,
    addressPointId: addressPoint.id,
    streetName: addressPoint.streetName,
    buildingNumber: addressPoint.buildingNumber,
    postalCode: addressPoint.postalCode,
    neighborhoodId: addressPoint.neighborhoodId,
    wardId: addressPoint.wardId,
    importTags: addressPoint.importTags
  };
}

function createPlaceGazetteerEntry(place: NamedPlace): GazetteerEntry {
  return {
    id: `gazetteer-entry-${place.placeKind === 'street' ? 'street' : 'place'}-${slugify(place.id)}`,
    kind: 'gazetteer-entry',
    ownerDomain: 'data-contracts',
    parentId: place.id,
    lod: 'lod2',
    entryKind: place.placeKind === 'street' ? 'street' : 'place',
    displayName: place.name,
    normalizedName: place.normalizedName,
    searchTokens: tokenize([place.name, place.placeKind, ...place.placeTags]),
    sourceObjectId: place.id,
    sourceObjectKind: 'named-place',
    position: place.center,
    reverseLookupRadiusMeters: place.placeKind === 'street' ? 32 : 75,
    placeId: place.id
  };
}

function createAnchorGazetteerEntries(
  anchors: readonly (CivicAnchor | CommunityAnchor | CultureAnchor | GovernmentAnchor)[],
  addressByBuildingId: ReadonlyMap<CityId, AddressPoint>
): GazetteerEntry[] {
  return anchors.map((anchor) => {
    const addressPoint = addressByBuildingId.get(anchor.buildingId);
    const displayName = `${anchor.name ?? titleFromId(anchor.id)}${addressPoint?.formattedAddress ? `, ${addressPoint.formattedAddress}` : ''}`;

    return {
      id: `gazetteer-entry-anchor-${slugify(anchor.id)}`,
      kind: 'gazetteer-entry',
      ownerDomain: 'data-contracts',
      parentId: anchor.id,
      lod: 'lod2',
      entryKind: 'anchor',
      displayName,
      normalizedName: normalizeName(displayName),
      searchTokens: tokenize([anchor.name, anchor.id, addressPoint?.streetName, addressPoint?.neighborhoodName, addressPoint?.postalCode]),
      sourceObjectId: anchor.id,
      sourceObjectKind: anchor.kind,
      position: anchor.center,
      reverseLookupRadiusMeters: 35,
      addressPointId: addressPoint?.id,
      streetName: addressPoint?.streetName,
      buildingNumber: addressPoint?.buildingNumber,
      postalCode: addressPoint?.postalCode,
      neighborhoodId: addressPoint?.neighborhoodId,
      wardId: addressPoint?.wardId,
      importTags: addressPoint?.importTags
    };
  });
}

function attachAnchorAddresses<Anchor extends CivicAnchor | CommunityAnchor | CultureAnchor | GovernmentAnchor>(
  anchors: readonly Anchor[],
  addressByBuildingId: ReadonlyMap<CityId, AddressPoint>
): Anchor[] {
  return anchors.map((anchor) => {
    const addressPoint = addressByBuildingId.get(anchor.buildingId);
    return addressPoint ? { ...anchor, addressPointIds: [addressPoint.id] } : anchor;
  });
}

function createAddressImportTags(addressPoint: AddressPoint, unitRange: string | undefined): Readonly<Record<string, string>> {
  return {
    'addr:housenumber': addressPoint.buildingNumber,
    'addr:street': addressPoint.streetName,
    'addr:postcode': addressPoint.postalCode,
    ...(unitRange ? { 'addr:unit': unitRange } : {})
  };
}

function formatAddress(
  buildingNumber: string,
  streetName: string,
  unitRange: string | undefined,
  neighborhoodName: string | undefined,
  postalCode: string
): string {
  return [unitRange ? `${buildingNumber} ${streetName} Unit ${unitRange}` : `${buildingNumber} ${streetName}`, neighborhoodName, postalCode]
    .filter(Boolean)
    .join(', ');
}

function getPolygonCenter(boundary: readonly Point2D[]): Point2D {
  const bounds = boundary.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minZ: Math.min(acc.minZ, point.z),
      maxZ: Math.max(acc.maxZ, point.z)
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
  );
  return {
    x: Number(((bounds.minX + bounds.maxX) / 2).toFixed(2)),
    z: Number(((bounds.minZ + bounds.maxZ) / 2).toFixed(2))
  };
}

function titleFromId(id: CityId): string {
  return id
    .replace(/^(administrative-boundary-|named-place-|civic-anchor-|community-anchor-|culture-anchor-|government-anchor-|waterfront-open-space-|park-)/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenize(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.flatMap((value) => (value ? normalizeName(value).split(' ').filter(Boolean) : [])))].sort();
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}
