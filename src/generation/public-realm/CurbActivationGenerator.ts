import type {
  CurbActivationContract,
  CurbActivationKind,
  CurbActivationSeason,
  CurbZoneContract,
  PermitInspectionRecordContract
} from '../../city/data-contracts/cityContracts';
import type { RoadSegment } from '../../types/city';
import { rectanglePolygon } from '../../utils/geometry';

export interface CurbActivationGeneratorInput {
  readonly curbZones: readonly CurbZoneContract[];
  readonly roads: readonly RoadSegment[];
  readonly permitInspectionRecords: readonly PermitInspectionRecordContract[];
}

const ACTIVATION_LIMIT = 16;
const ACTIVATION_KINDS: readonly CurbActivationKind[] = [
  'parklet',
  'outdoor-dining',
  'temporary-seating-deck',
  'interim-plaza'
];
const SEASONS: readonly CurbActivationSeason[] = ['spring', 'summer', 'autumn', 'year-round'];

export class CurbActivationGenerator {
  create(input: CurbActivationGeneratorInput): CurbActivationContract[] {
    const roadsById = new Map(input.roads.map((road) => [road.id, road]));
    const permitRecords = input.permitInspectionRecords
      .filter((record) =>
        (record.recordKind === 'development-permit' || record.recordKind === 'approval') &&
        (record.status === 'approved' || record.status === 'closed') &&
        record.compliance.passed
      )
      .sort((first, second) => first.id.localeCompare(second.id));

    if (permitRecords.length === 0) {
      return [];
    }

    return input.curbZones
      .filter(isEligibleCurbZone)
      .sort(compareCurbZones)
      .slice(0, ACTIVATION_LIMIT)
      .map((curbZone, index) => {
        const road = roadsById.get(curbZone.roadId);
        const activationKind = ACTIVATION_KINDS[index % ACTIVATION_KINDS.length];
        const permit = permitRecords[index % permitRecords.length];

        return createCurbActivation(curbZone, road, activationKind, permit, index);
      });
  }
}

function createCurbActivation(
  curbZone: CurbZoneContract,
  road: RoadSegment | undefined,
  activationKind: CurbActivationKind,
  permit: PermitInspectionRecordContract,
  index: number
): CurbActivationContract {
  const insetMeters = 1.2;
  const startMeters = roundMeters(curbZone.startMeters + insetMeters);
  const endMeters = roundMeters(Math.min(curbZone.endMeters - insetMeters, startMeters + getTargetLengthMeters(activationKind)));
  const lengthMeters = roundMeters(endMeters - startMeters);
  const widthMeters = roundMeters(Math.min(2.2, curbZone.widthMeters - 0.2));
  const size = road?.orientation === 'horizontal'
    ? { x: lengthMeters, z: widthMeters }
    : { x: widthMeters, z: lengthMeters };
  const season = SEASONS[index % SEASONS.length];
  const activeFromDay = getSeasonStartDay(season);
  const activeToDay = getSeasonEndDay(season);

  return {
    id: `curb-activation-${activationKind}-${curbZone.id}`,
    kind: 'curb-activation',
    ownerDomain: 'public-realm',
    parentId: curbZone.id,
    lod: activationKind === 'outdoor-dining' ? 'lod4' : 'lod3',
    activationKind,
    status: season === 'year-round' ? 'active' : 'seasonal',
    curbZoneId: curbZone.id,
    permitInspectionRecordId: permit.id,
    roadId: curbZone.roadId,
    sidewalkId: curbZone.sidewalkId,
    side: curbZone.side,
    startMeters,
    endMeters,
    lengthMeters,
    widthMeters,
    center: curbZone.center,
    boundary: rectanglePolygon(curbZone.center, size),
    seatingCapacity: getSeatingCapacity(activationKind, lengthMeters),
    protection: {
      barrierKind: getBarrierKind(activationKind),
      barrierCount: Math.max(4, Math.ceil(lengthMeters / 2.5)),
      reflectiveMarkers: true
    },
    clearances: {
      accessiblePathMeters: 2.4,
      emergencyAccess: curbZone.management.fireLaneClearance,
      transitStopClearance: curbZone.management.transitStopClearance,
      drainageInletClearance: true
    },
    seasonality: {
      season,
      activeFromDay,
      activeToDay,
      removalDay: Math.min(365, activeToDay + 7),
      removableWithinHours: activationKind === 'interim-plaza' ? 48 : 24
    },
    assetBindingId: 'binding:curb-activation:platform',
    tags: {
      activationKind,
      curbZoneId: curbZone.id,
      permitInspectionRecordId: permit.id,
      season,
      corridorRoadId: curbZone.roadId
    }
  };
}

function isEligibleCurbZone(curbZone: CurbZoneContract): boolean {
  return (
    curbZone.managementContext === 'detailed-street' &&
    curbZone.lengthMeters >= 18 &&
    (curbZone.curbUse === 'parking' || curbZone.curbUse === 'ride-hail' || curbZone.curbUse === 'loading') &&
    curbZone.management.fireLaneClearance &&
    curbZone.management.transitStopClearance
  );
}

function compareCurbZones(first: CurbZoneContract, second: CurbZoneContract): number {
  if (first.roadId !== second.roadId) {
    return first.roadId.localeCompare(second.roadId);
  }
  if (first.side !== second.side) {
    return first.side.localeCompare(second.side);
  }
  return first.startMeters - second.startMeters;
}

function getTargetLengthMeters(kind: CurbActivationKind): number {
  switch (kind) {
    case 'parklet':
      return 9.6;
    case 'outdoor-dining':
      return 12;
    case 'temporary-seating-deck':
      return 10.8;
    case 'interim-plaza':
      return 14.4;
  }
}

function getSeatingCapacity(kind: CurbActivationKind, lengthMeters: number): number {
  const baseCapacity = Math.round(lengthMeters * 1.7);
  return kind === 'outdoor-dining' ? baseCapacity + 8 : kind === 'interim-plaza' ? baseCapacity + 12 : baseCapacity;
}

function getBarrierKind(kind: CurbActivationKind): CurbActivationContract['protection']['barrierKind'] {
  switch (kind) {
    case 'parklet':
      return 'planter-buffer';
    case 'outdoor-dining':
      return 'rail-buffer';
    case 'temporary-seating-deck':
      return 'wheel-stop';
    case 'interim-plaza':
      return 'flex-post';
  }
}

function getSeasonStartDay(season: CurbActivationSeason): number {
  switch (season) {
    case 'spring':
      return 70;
    case 'summer':
      return 150;
    case 'autumn':
      return 240;
    case 'winter':
      return 330;
    case 'year-round':
      return 1;
  }
}

function getSeasonEndDay(season: CurbActivationSeason): number {
  switch (season) {
    case 'spring':
      return 150;
    case 'summer':
      return 240;
    case 'autumn':
      return 315;
    case 'winter':
      return 365;
    case 'year-round':
      return 365;
  }
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}
