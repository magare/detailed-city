import type { CadastreRecord, Parcel } from '../../types/city';
import { getPolygonBounds, rectanglePolygon } from '../../utils/geometry';

const OWNER_BY_DISTRICT: Record<Parcel['district'], { readonly id: string; readonly name: string; readonly tenure: CadastreRecord['tenure'] }> = {
  civic: { id: 'owner-civic-land-trust', name: 'Civic Land Trust', tenure: 'civic-trust' },
  downtown: { id: 'owner-central-development-corp', name: 'Central Development Corporation', tenure: 'private-freehold' },
  industrial: { id: 'owner-harbor-industrial-estate', name: 'Harbor Industrial Estate', tenure: 'leasehold' },
  residential: { id: 'owner-neighborhood-housing-coop', name: 'Neighborhood Housing Cooperative', tenure: 'private-freehold' },
  waterfront: { id: 'owner-waterfront-public-authority', name: 'Waterfront Public Authority', tenure: 'public-freehold' }
};

export class CadastreGenerator {
  create(parcels: readonly Parcel[]): CadastreRecord[] {
    return parcels.map((parcel) => {
      const owner = OWNER_BY_DISTRICT[parcel.district];
      const titleToken = parcel.id.replace('parcel-', '').replaceAll('-', '.');
      const easements = this.createEasements(parcel);

      return {
        id: parcel.cadastreRecordId,
        kind: 'cadastre-record',
        ownerDomain: 'land',
        parentId: parcel.id,
        lod: 'lod1',
        parcelId: parcel.id,
        districtId: parcel.districtId,
        blockId: parcel.blockId,
        tenure: owner.tenure,
        ownerEntityId: owner.id,
        ownerName: owner.name,
        legalDescription: `Lot ${titleToken} in ${parcel.blockId}, ${parcel.district} district`,
        titleReference: `TITLE-${titleToken}`,
        assessedLandValue: this.getAssessedLandValue(parcel),
        rights: [
          {
            rightKind: 'build',
            holderId: owner.id,
            transferable: parcel.developmentRights.transferable
          },
          {
            rightKind: 'access',
            holderId: owner.id,
            transferable: false
          },
          {
            rightKind: 'service',
            holderId: 'city-utility-access',
            transferable: false
          }
        ],
        easements,
        developmentRightStatus: parcel.developmentRights.status,
        permitReferenceIds: []
      };
    });
  }

  private createEasements(parcel: Parcel): CadastreRecord['easements'] {
    const bounds = getPolygonBounds(parcel.boundary);
    const widthMeters = parcel.district === 'industrial' ? 4 : 2;
    const serviceStripCenter = {
      x: parcel.center.x,
      z: bounds.minZ + widthMeters / 2
    };
    const easements: CadastreRecord['easements'][number][] = [
      {
        id: `${parcel.cadastreRecordId}-utility-easement`,
        easementKind: 'utility',
        beneficiaryId: 'city-utility-access',
        widthMeters,
        boundary: rectanglePolygon(serviceStripCenter, {
          x: Math.max(1, bounds.maxX - bounds.minX),
          z: widthMeters
        })
      }
    ];

    if (parcel.frontageRoadIds.length > 1) {
      easements.push({
        id: `${parcel.cadastreRecordId}-access-easement`,
        easementKind: 'access',
        beneficiaryId: parcel.frontageRoadIds[0],
        widthMeters: 3,
        boundary: rectanglePolygon(
          {
            x: bounds.minX + 1.5,
            z: parcel.center.z
          },
          {
            x: 3,
            z: Math.max(1, bounds.maxZ - bounds.minZ)
          }
        )
      });
    }

    return easements;
  }

  private getAssessedLandValue(parcel: Parcel): number {
    const districtMultiplier: Record<Parcel['district'], number> = {
      civic: 700,
      downtown: 1450,
      industrial: 640,
      residential: 820,
      waterfront: 1180
    };
    return Math.round(parcel.size.x * parcel.size.z * districtMultiplier[parcel.district]);
  }
}
