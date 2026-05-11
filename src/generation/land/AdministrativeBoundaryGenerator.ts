import type { CityId, Point2D } from '../../city/data-contracts/cityContracts';
import type { AdministrativeBoundaryPlan, BlockPlan, CityBounds, DistrictPlan, Parcel } from '../../types/city';
import { getPolygonBounds, isPointInsidePolygon, rectanglePolygon } from '../../utils/geometry';

export interface AdministrativeBoundaryInput {
  readonly bounds: CityBounds;
  readonly districts: readonly DistrictPlan[];
  readonly blocks: readonly BlockPlan[];
  readonly parcels: readonly Parcel[];
}

export interface AdministrativeBoundaryOutput {
  readonly administrativeBoundaries: AdministrativeBoundaryPlan[];
  readonly blocks: BlockPlan[];
  readonly parcels: Parcel[];
}

export class AdministrativeBoundaryGenerator {
  create(input: AdministrativeBoundaryInput): AdministrativeBoundaryOutput {
    const administrativeBoundaries = [
      this.createCityLimit(input.bounds),
      ...this.createWards(input.bounds),
      ...this.createNeighborhoods(input.districts),
      ...this.createServiceAreas(input.bounds),
      ...this.createOwnershipZones(input.bounds),
      ...this.createJurisdictionOverlays(input.bounds)
    ].map((boundary) => this.withMembership(boundary, input.blocks, input.parcels));

    return {
      administrativeBoundaries,
      blocks: input.blocks.map((block) => this.withBlockBoundaryMembership(block, administrativeBoundaries)),
      parcels: input.parcels.map((parcel) => this.withParcelBoundaryMembership(parcel, administrativeBoundaries))
    };
  }

  private createCityLimit(bounds: CityBounds): AdministrativeBoundaryPlan {
    return this.createBoundary({
      id: 'administrative-boundary-city-limit',
      name: 'City Limit',
      boundaryKind: 'city-limit',
      authority: 'city-government',
      jurisdictionLevel: 'city',
      ownershipClass: 'mixed',
      serviceTypes: ['planning', 'public-works', 'emergency', 'parks', 'utilities'],
      boundary: rectanglePolygon({ x: 0, z: 0 }, { x: bounds.span, z: bounds.span })
    });
  }

  private createWards(bounds: CityBounds): AdministrativeBoundaryPlan[] {
    const wardSize = { x: bounds.span / 2, z: bounds.span / 2 };
    const halfOffset = bounds.span / 4;

    return [
      ['southwest', { x: -halfOffset, z: -halfOffset }],
      ['southeast', { x: halfOffset, z: -halfOffset }],
      ['northwest', { x: -halfOffset, z: halfOffset }],
      ['northeast', { x: halfOffset, z: halfOffset }]
    ].map(([suffix, center]) =>
      this.createBoundary({
        id: `administrative-boundary-ward-${suffix}`,
        name: `Ward ${suffix}`,
        boundaryKind: 'ward',
        authority: 'city-government',
        jurisdictionLevel: 'ward',
        ownershipClass: 'mixed',
        serviceTypes: ['planning', 'public-works', 'emergency'],
        parentId: 'administrative-boundary-city-limit',
        boundary: rectanglePolygon(center as Point2D, wardSize)
      })
    );
  }

  private createNeighborhoods(districts: readonly DistrictPlan[]): AdministrativeBoundaryPlan[] {
    return districts.map((district) =>
      this.createBoundary({
        id: `administrative-boundary-neighborhood-${district.district}`,
        name: `${district.name ?? district.id} Neighborhood`,
        boundaryKind: 'neighborhood',
        authority: 'planning-department',
        jurisdictionLevel: 'district',
        ownershipClass: 'mixed',
        serviceTypes: ['planning', 'parks'],
        parentId: 'administrative-boundary-city-limit',
        districtIds: [district.id],
        boundary: district.boundary
      })
    );
  }

  private createServiceAreas(bounds: CityBounds): AdministrativeBoundaryPlan[] {
    return [
      this.createBoundary({
        id: 'administrative-boundary-service-emergency-core',
        name: 'Emergency Core Service Area',
        boundaryKind: 'service-area',
        authority: 'public-works',
        jurisdictionLevel: 'service',
        ownershipClass: 'public',
        serviceTypes: ['emergency', 'public-works'],
        parentId: 'administrative-boundary-city-limit',
        boundary: rectanglePolygon({ x: 0, z: 0 }, { x: bounds.span * 0.56, z: bounds.span * 0.56 })
      }),
      this.createBoundary({
        id: 'administrative-boundary-service-waterfront',
        name: 'Waterfront Service Area',
        boundaryKind: 'service-area',
        authority: 'parks-department',
        jurisdictionLevel: 'service',
        ownershipClass: 'public',
        serviceTypes: ['parks', 'public-works', 'emergency'],
        parentId: 'administrative-boundary-city-limit',
        boundary: rectanglePolygon({ x: 0, z: -bounds.span * 0.32 }, { x: bounds.span, z: bounds.span * 0.36 })
      }),
      this.createBoundary({
        id: 'administrative-boundary-service-utilities-east',
        name: 'East Utilities Service Area',
        boundaryKind: 'service-area',
        authority: 'public-works',
        jurisdictionLevel: 'service',
        ownershipClass: 'mixed',
        serviceTypes: ['utilities', 'public-works'],
        parentId: 'administrative-boundary-city-limit',
        boundary: rectanglePolygon({ x: bounds.span * 0.25, z: bounds.span * 0.18 }, { x: bounds.span * 0.5, z: bounds.span * 0.64 })
      })
    ];
  }

  private createOwnershipZones(bounds: CityBounds): AdministrativeBoundaryPlan[] {
    return [
      this.createBoundary({
        id: 'administrative-boundary-ownership-public-realm',
        name: 'Public Realm Ownership Zone',
        boundaryKind: 'ownership-zone',
        authority: 'parks-department',
        jurisdictionLevel: 'ownership',
        ownershipClass: 'public',
        serviceTypes: ['parks', 'planning'],
        parentId: 'administrative-boundary-city-limit',
        boundary: rectanglePolygon({ x: -bounds.span * 0.18, z: -bounds.span * 0.18 }, { x: bounds.span * 0.5, z: bounds.span * 0.58 })
      }),
      this.createBoundary({
        id: 'administrative-boundary-ownership-civic-campus',
        name: 'Civic Campus Ownership Zone',
        boundaryKind: 'ownership-zone',
        authority: 'city-government',
        jurisdictionLevel: 'ownership',
        ownershipClass: 'public',
        serviceTypes: ['planning', 'public-works'],
        parentId: 'administrative-boundary-city-limit',
        boundary: rectanglePolygon({ x: -bounds.span * 0.3, z: bounds.span * 0.25 }, { x: bounds.span * 0.38, z: bounds.span * 0.46 })
      }),
      this.createBoundary({
        id: 'administrative-boundary-ownership-logistics-private',
        name: 'Private Logistics Ownership Zone',
        boundaryKind: 'ownership-zone',
        authority: 'private-owner',
        jurisdictionLevel: 'ownership',
        ownershipClass: 'private',
        serviceTypes: ['utilities'],
        parentId: 'administrative-boundary-city-limit',
        boundary: rectanglePolygon({ x: bounds.span * 0.3, z: bounds.span * 0.24 }, { x: bounds.span * 0.4, z: bounds.span * 0.46 })
      })
    ];
  }

  private createJurisdictionOverlays(bounds: CityBounds): AdministrativeBoundaryPlan[] {
    return [
      this.createBoundary({
        id: 'administrative-boundary-jurisdiction-downtown-review',
        name: 'Downtown Design Review Overlay',
        boundaryKind: 'jurisdiction-overlay',
        authority: 'planning-department',
        jurisdictionLevel: 'overlay',
        ownershipClass: 'mixed',
        serviceTypes: ['planning'],
        parentId: 'administrative-boundary-city-limit',
        boundary: rectanglePolygon({ x: 0, z: bounds.span * 0.05 }, { x: bounds.span * 0.44, z: bounds.span * 0.48 })
      }),
      this.createBoundary({
        id: 'administrative-boundary-jurisdiction-waterfront-resilience',
        name: 'Waterfront Resilience Overlay',
        boundaryKind: 'jurisdiction-overlay',
        authority: 'port-authority',
        jurisdictionLevel: 'overlay',
        ownershipClass: 'mixed',
        serviceTypes: ['planning', 'public-works', 'emergency'],
        parentId: 'administrative-boundary-city-limit',
        boundary: rectanglePolygon({ x: 0, z: -bounds.span * 0.35 }, { x: bounds.span, z: bounds.span * 0.32 })
      })
    ];
  }

  private withMembership(
    boundary: AdministrativeBoundaryPlan,
    blocks: readonly BlockPlan[],
    parcels: readonly Parcel[]
  ): AdministrativeBoundaryPlan {
    const boundaryBlockIds = blocks
      .filter((block) => isPointInsidePolygon(block.center, boundary.boundary))
      .map((block) => block.id);
    const boundaryParcelIds = parcels
      .filter((parcel) => isPointInsidePolygon(parcel.center, boundary.boundary))
      .map((parcel) => parcel.id);
    const districtIds = new Set(boundary.districtIds);

    for (const block of blocks) {
      if (boundaryBlockIds.includes(block.id)) {
        districtIds.add(block.districtId);
      }
    }

    return {
      ...boundary,
      districtIds: [...districtIds].sort(),
      blockIds: boundaryBlockIds,
      parcelIds: boundaryParcelIds
    };
  }

  private withBlockBoundaryMembership(
    block: BlockPlan,
    boundaries: readonly AdministrativeBoundaryPlan[]
  ): BlockPlan {
    const administrativeBoundaryIds = this.getBoundaryIdsForPoint(block.center, boundaries);

    return {
      ...block,
      administrativeBoundaryIds,
      wardId: this.requireBoundaryId(administrativeBoundaryIds, boundaries, 'ward', block.id),
      neighborhoodId: this.requireBoundaryId(administrativeBoundaryIds, boundaries, 'neighborhood', block.id)
    };
  }

  private withParcelBoundaryMembership(parcel: Parcel, boundaries: readonly AdministrativeBoundaryPlan[]): Parcel {
    const administrativeBoundaryIds = this.getBoundaryIdsForPoint(parcel.center, boundaries);

    return {
      ...parcel,
      administrativeBoundaryIds,
      wardId: this.requireBoundaryId(administrativeBoundaryIds, boundaries, 'ward', parcel.id),
      neighborhoodId: this.requireBoundaryId(administrativeBoundaryIds, boundaries, 'neighborhood', parcel.id)
    };
  }

  private getBoundaryIdsForPoint(point: Point2D, boundaries: readonly AdministrativeBoundaryPlan[]): CityId[] {
    return boundaries
      .filter((boundary) => isPointInsidePolygon(point, boundary.boundary))
      .map((boundary) => boundary.id)
      .sort();
  }

  private requireBoundaryId(
    boundaryIds: readonly CityId[],
    boundaries: readonly AdministrativeBoundaryPlan[],
    boundaryKind: AdministrativeBoundaryPlan['boundaryKind'],
    objectId: CityId
  ): CityId {
    const boundaryId = boundaryIds.find((candidateId) => {
      const boundary = boundaries.find((candidate) => candidate.id === candidateId);
      return boundary?.boundaryKind === boundaryKind;
    });

    if (!boundaryId) {
      throw new Error(`Missing ${boundaryKind} boundary membership for ${objectId}.`);
    }

    return boundaryId;
  }

  private createBoundary(
    input: Omit<
      AdministrativeBoundaryPlan,
      'kind' | 'ownerDomain' | 'lod' | 'center' | 'districtIds' | 'blockIds' | 'parcelIds'
    > & {
      readonly districtIds?: readonly CityId[];
    }
  ): AdministrativeBoundaryPlan {
    const bounds = getPolygonBounds(input.boundary);

    return {
      ...input,
      kind: 'administrative-boundary',
      ownerDomain: 'land',
      lod: 'lod0',
      center: { x: (bounds.minX + bounds.maxX) / 2, z: (bounds.minZ + bounds.maxZ) / 2 },
      districtIds: input.districtIds ?? [],
      blockIds: [],
      parcelIds: []
    };
  }
}
