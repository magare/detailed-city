import type { CityId, CityObjectKind, ConstraintKind, ConstraintPriority } from '../../data-contracts/cityContracts';

export type ConstraintGeometryRule =
  | { readonly source: 'city-bounds' }
  | { readonly source: 'public-space'; readonly publicSpaceId: CityId }
  | { readonly source: 'road-corridor'; readonly roadId: CityId; readonly extraWidthMeters?: number }
  | { readonly source: 'waterway-buffer'; readonly waterwayId: CityId; readonly bufferByBlock: number }
  | {
      readonly source: 'normalized-zone';
      readonly minX: number;
      readonly maxX: number;
      readonly minZ: number;
      readonly maxZ: number;
    };

export interface ConstraintRule {
  readonly id: CityId;
  readonly name: string;
  readonly constraintKind: ConstraintKind;
  readonly priority: ConstraintPriority;
  readonly description: string;
  readonly geometry: ConstraintGeometryRule;
  readonly affectedObjectKinds: readonly CityObjectKind[];
  readonly prohibitedObjectKinds: readonly CityObjectKind[];
  readonly requiredObjectIds: readonly CityId[];
  readonly relatedObjectIds: readonly CityId[];
  readonly minSetbackMeters?: number;
  readonly minClearanceMeters?: number;
  readonly maxHeightMeters?: number;
}

export const CITY_CONSTRAINT_RULES = [
  {
    id: 'constraint-setback-citywide',
    name: 'Citywide Parcel Setback',
    constraintKind: 'setback',
    priority: 'high',
    description: 'Generated buildings must retain a minimum footprint setback inside their parcel envelope.',
    geometry: { source: 'city-bounds' },
    affectedObjectKinds: ['parcel', 'building'],
    prohibitedObjectKinds: [],
    requiredObjectIds: [],
    relatedObjectIds: [],
    minSetbackMeters: 1
  },
  {
    id: 'constraint-protected-corridor-road-v-6',
    name: 'Grand Avenue Protected Corridor',
    constraintKind: 'protected-corridor',
    priority: 'critical',
    description: 'The detailed-street grand avenue must retain its high-capacity corridor width.',
    geometry: { source: 'road-corridor', roadId: 'road-v-6', extraWidthMeters: 3 },
    affectedObjectKinds: ['road-segment'],
    prohibitedObjectKinds: [],
    requiredObjectIds: ['road-v-6'],
    relatedObjectIds: ['road-v-6'],
    minClearanceMeters: 16
  },
  {
    id: 'constraint-easement-civic-access',
    name: 'Civic Campus Access Easement',
    constraintKind: 'easement',
    priority: 'medium',
    description: 'Civic open space must preserve a service and pedestrian access easement for later civic slice work.',
    geometry: { source: 'public-space', publicSpaceId: 'civic-plaza' },
    affectedObjectKinds: ['park', 'road-segment'],
    prohibitedObjectKinds: [],
    requiredObjectIds: ['civic-plaza'],
    relatedObjectIds: ['civic-plaza', 'road-v-3', 'road-h-9']
  },
  {
    id: 'constraint-clearance-road-h-6',
    name: 'Crosstown Arterial Clearance',
    constraintKind: 'clearance',
    priority: 'high',
    description: 'The main crosstown arterial must preserve enough clear carriageway for transit and freight.',
    geometry: { source: 'road-corridor', roadId: 'road-h-6', extraWidthMeters: 2 },
    affectedObjectKinds: ['road-segment'],
    prohibitedObjectKinds: [],
    requiredObjectIds: ['road-h-6'],
    relatedObjectIds: ['road-h-6'],
    minClearanceMeters: 16
  },
  {
    id: 'constraint-no-build-zone-central-park',
    name: 'Central Park No-Build Zone',
    constraintKind: 'no-build-zone',
    priority: 'critical',
    description: 'Central Park is protected open space and cannot contain generated parcels or buildings.',
    geometry: { source: 'public-space', publicSpaceId: 'central-park' },
    affectedObjectKinds: ['parcel', 'building', 'park'],
    prohibitedObjectKinds: ['parcel', 'building'],
    requiredObjectIds: ['central-park'],
    relatedObjectIds: ['central-park']
  },
  {
    id: 'constraint-no-build-zone-civic-plaza',
    name: 'Civic Plaza No-Build Zone',
    constraintKind: 'no-build-zone',
    priority: 'critical',
    description: 'Civic Plaza is protected open space and cannot contain generated parcels or buildings.',
    geometry: { source: 'public-space', publicSpaceId: 'civic-plaza' },
    affectedObjectKinds: ['parcel', 'building', 'park'],
    prohibitedObjectKinds: ['parcel', 'building'],
    requiredObjectIds: ['civic-plaza'],
    relatedObjectIds: ['civic-plaza']
  },
  {
    id: 'constraint-no-build-zone-riverside-green',
    name: 'Riverside Green No-Build Zone',
    constraintKind: 'no-build-zone',
    priority: 'critical',
    description: 'Riverside Green is protected open space and cannot contain generated parcels or buildings.',
    geometry: { source: 'public-space', publicSpaceId: 'riverside-green' },
    affectedObjectKinds: ['parcel', 'building', 'park'],
    prohibitedObjectKinds: ['parcel', 'building'],
    requiredObjectIds: ['riverside-green'],
    relatedObjectIds: ['riverside-green']
  },
  {
    id: 'constraint-hazard-buffer-south-river',
    name: 'South River Flood Hazard Buffer',
    constraintKind: 'hazard-buffer',
    priority: 'high',
    description: 'A flood hazard buffer keeps generated parcels and buildings out of the immediate river edge.',
    geometry: { source: 'waterway-buffer', waterwayId: 'south-river', bufferByBlock: 0.55 },
    affectedObjectKinds: ['parcel', 'building', 'waterway'],
    prohibitedObjectKinds: ['parcel', 'building'],
    requiredObjectIds: ['south-river'],
    relatedObjectIds: ['south-river']
  },
  {
    id: 'constraint-view-corridor-road-v-6',
    name: 'Grand Avenue View Corridor',
    constraintKind: 'view-corridor',
    priority: 'medium',
    description: 'The north-south grand avenue preserves a readable civic view corridor through the core.',
    geometry: { source: 'road-corridor', roadId: 'road-v-6', extraWidthMeters: 1 },
    affectedObjectKinds: ['road-segment', 'building'],
    prohibitedObjectKinds: [],
    requiredObjectIds: ['road-v-6'],
    relatedObjectIds: ['road-v-6']
  },
  {
    id: 'constraint-waterfront-buffer-south-river',
    name: 'South River Waterfront Buffer',
    constraintKind: 'waterfront-buffer',
    priority: 'critical',
    description: 'A continuous waterfront buffer preserves public access and prevents parcels from occupying the river edge.',
    geometry: { source: 'waterway-buffer', waterwayId: 'south-river', bufferByBlock: 0.55 },
    affectedObjectKinds: ['parcel', 'building', 'waterway'],
    prohibitedObjectKinds: ['parcel', 'building'],
    requiredObjectIds: ['south-river'],
    relatedObjectIds: ['south-river']
  },
  {
    id: 'constraint-emergency-access-road-v-6',
    name: 'Grand Avenue Emergency Access',
    constraintKind: 'emergency-access-corridor',
    priority: 'critical',
    description: 'The grand avenue must preserve emergency vehicle access through the detailed-street slice.',
    geometry: { source: 'road-corridor', roadId: 'road-v-6' },
    affectedObjectKinds: ['road-segment', 'lane'],
    prohibitedObjectKinds: [],
    requiredObjectIds: ['road-v-6'],
    relatedObjectIds: ['road-v-6'],
    minClearanceMeters: 4.5
  }
] as const satisfies readonly ConstraintRule[];
