import type { CityId, EmergencyEquipmentKind, Point2D } from '../../city/data-contracts/cityContracts';
import type {
  EmergencyEquipment,
  EmergencyServiceAnchor,
  NavigationGraphEdge,
  NavigationGraphNode,
  ParkPatch,
  PlazaZone,
  StreetFurniture,
  WaterfrontOpenSpace
} from '../../types/city';

export interface EmergencyEquipmentGeneratorInput {
  readonly emergencyServiceAnchors: readonly EmergencyServiceAnchor[];
  readonly navigationGraphNodes: readonly NavigationGraphNode[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
  readonly parks: readonly ParkPatch[];
  readonly plazaZones: readonly PlazaZone[];
  readonly waterfrontOpenSpaces: readonly WaterfrontOpenSpace[];
  readonly streetFurniture: readonly StreetFurniture[];
}

type PublicSpaceRef =
  | { readonly kind: 'park'; readonly id: CityId; readonly center: Point2D }
  | { readonly kind: 'plaza'; readonly id: CityId; readonly center: Point2D }
  | { readonly kind: 'waterfront'; readonly id: CityId; readonly center: Point2D };

interface EmergencyEquipmentTemplate {
  readonly equipmentKind: EmergencyEquipmentKind;
  readonly anchorKind: EmergencyServiceAnchor['anchorKind'];
  readonly name: string;
  readonly publicSpaceKind: PublicSpaceRef['kind'];
  readonly publicSpaceOffset: number;
  readonly centerOffset: Point2D;
  readonly radiusMeters: number;
  readonly deviceCount: number;
  readonly assemblyCapacityPeople: number;
  readonly audibleRadiusMeters: number;
  readonly batteryBackupHours: number;
}

const EMERGENCY_EQUIPMENT_TEMPLATES = [
  equipment('aed', 'fire-station', 'Central Station AED Cabinet', 'plaza', 0, { x: -3, z: 2 }, 520, 2, 0, 0, 48),
  equipment('aed', 'public-shelter', 'Shelter Lobby AED Cabinet', 'park', 0, { x: 4, z: -2 }, 520, 3, 0, 0, 72),
  equipment('emergency-phone', 'police-station', 'Civic Plaza Emergency Phone', 'plaza', 1, { x: 2, z: 3 }, 560, 1, 0, 0, 36),
  equipment('emergency-phone', 'staging-area', 'Waterfront Emergency Phone', 'waterfront', 0, { x: -2, z: 2 }, 620, 1, 0, 0, 36),
  equipment('siren', 'command-post', 'Incident Command Siren Mast', 'plaza', 2, { x: 0, z: 0 }, 900, 1, 0, 900, 96),
  equipment('siren', 'staging-area', 'Multi Agency Staging Siren Mast', 'park', 1, { x: 0, z: 0 }, 900, 1, 0, 850, 96),
  equipment('alarm', 'fire-station', 'Civic Alarm Beacon', 'plaza', 3, { x: 0, z: -2 }, 650, 2, 0, 420, 72),
  equipment('fire-alarm-box', 'fire-station', 'Fire Alarm Box North', 'plaza', 4, { x: -2, z: -1 }, 520, 1, 0, 0, 24),
  equipment('fire-alarm-box', 'ambulance-post', 'Fire Alarm Box South', 'park', 2, { x: 2, z: 1 }, 520, 1, 0, 0, 24),
  equipment('assembly-area', 'public-shelter', 'Shelter Assembly Area', 'park', 3, { x: 0, z: 0 }, 720, 0, 320, 0, 0),
  equipment('assembly-area', 'staging-area', 'Waterfront Assembly Area', 'waterfront', 1, { x: 0, z: 0 }, 760, 0, 220, 0, 0),
  equipment('assembly-area', 'command-post', 'Command Plaza Assembly Area', 'plaza', 5, { x: 0, z: 0 }, 720, 0, 180, 0, 0),
  equipment('lifeguard-station', 'staging-area', 'Promenade Lifeguard Station', 'waterfront', 2, { x: 1, z: -1 }, 620, 1, 0, 0, 24),
  equipment('shelter-signage', 'public-shelter', 'Public Shelter Direction Sign', 'plaza', 0, { x: 1, z: 1 }, 580, 1, 0, 0, 0)
] as const satisfies readonly EmergencyEquipmentTemplate[];

const REQUIRED_EQUIPMENT_KINDS: readonly EmergencyEquipmentKind[] = [
  'aed',
  'alarm',
  'assembly-area',
  'emergency-phone',
  'fire-alarm-box',
  'lifeguard-station',
  'shelter-signage',
  'siren'
];

export class EmergencyEquipmentGenerator {
  create(input: EmergencyEquipmentGeneratorInput): EmergencyEquipment[] {
    const anchorsByKind = new Map(input.emergencyServiceAnchors.map((anchor) => [anchor.anchorKind, anchor]));
    const publicSpaces = createPublicSpaceRefs(input);
    const shelterAnchor = input.emergencyServiceAnchors.find((anchor) => anchor.anchorKind === 'public-shelter')
      ?? input.emergencyServiceAnchors.find((anchor) => anchor.staging.shelterCapacityPeople > 0);
    const signIds = input.streetFurniture
      .filter((item) => item.signFace)
      .map((item) => item.id)
      .sort();

    if (input.emergencyServiceAnchors.length === 0 || publicSpaces.length === 0 || !shelterAnchor) {
      return [];
    }

    const baseEquipment = EMERGENCY_EQUIPMENT_TEMPLATES.map((template, index) => {
      const anchor = anchorsByKind.get(template.anchorKind) ?? input.emergencyServiceAnchors[index % input.emergencyServiceAnchors.length];
      const publicSpace = selectPublicSpace(publicSpaces, template.publicSpaceKind, template.publicSpaceOffset);
      const center = {
        x: roundMeters(publicSpace.center.x + template.centerOffset.x),
        z: roundMeters(publicSpace.center.z + template.centerOffset.z)
      };
      const access = createAccessRefs({
        center,
        anchor,
        navigationGraphNodes: input.navigationGraphNodes,
        navigationGraphEdges: input.navigationGraphEdges,
        signIds,
        signOffset: index
      });
      const id = `emergency-equipment-${template.equipmentKind}-${index + 1}`;

      return {
        id,
        kind: 'emergency-equipment',
        ownerDomain: 'civic',
        parentId: anchor.id,
        name: template.name,
        lod: 'lod4',
        tags: {
          emergencyEquipmentKind: template.equipmentKind,
          emergencyAnchorKind: anchor.anchorKind,
          renderBinding: 'emergency-equipment',
          publicSpaceKind: publicSpace.kind
        },
        equipmentKind: template.equipmentKind,
        emergencyServiceAnchorId: anchor.id,
        roadId: anchor.roadId,
        ...(publicSpace.kind === 'park' ? { parkId: publicSpace.id } : {}),
        ...(publicSpace.kind === 'plaza' ? { plazaZoneId: publicSpace.id } : {}),
        ...(publicSpace.kind === 'waterfront' ? { waterfrontOpenSpaceId: publicSpace.id } : {}),
        shelterAnchorId: shelterAnchor.id,
        signObjectId: template.equipmentKind === 'shelter-signage' ? access.signageObjectIds[0] : undefined,
        center,
        coverage: {
          radiusMeters: template.radiusMeters,
          coveredPublicSpaceIds: [] as CityId[],
          nearestShelterAnchorId: shelterAnchor.id,
          nearestAssemblyPointId: '',
          estimatedWalkMeters: 0,
          coverageScore: 0
        },
        capacity: {
          deviceCount: template.deviceCount,
          assemblyCapacityPeople: template.assemblyCapacityPeople,
          audibleRadiusMeters: template.audibleRadiusMeters,
          batteryBackupHours: template.batteryBackupHours
        },
        access,
        renderBindingId: 'binding:civic:emergency-equipment'
      } satisfies EmergencyEquipment;
    });

    const assemblyIds = baseEquipment.filter((item) => item.equipmentKind === 'assembly-area').map((item) => item.id);

    return baseEquipment.map((item) => {
      const nearestAssembly = getNearestEquipment(item.center, baseEquipment.filter((candidate) => candidate.equipmentKind === 'assembly-area'));
      const assignedPublicSpaceIds = publicSpaces
        .filter((space) => {
          const candidateSet = item.equipmentKind === 'assembly-area'
            ? baseEquipment.filter((candidate) => candidate.equipmentKind === 'assembly-area')
            : baseEquipment;
          return getNearestEquipment(space.center, candidateSet)?.id === item.id;
        })
        .map((space) => space.id);
      const nearestPublicSpace = [...publicSpaces]
        .map((space) => ({ space, distance: distance2D(item.center, space.center) }))
        .sort((first, second) => first.distance - second.distance || first.space.id.localeCompare(second.space.id))[0];
      const coveredPublicSpaceIds = assignedPublicSpaceIds.length > 0
        ? assignedPublicSpaceIds
        : nearestPublicSpace
          ? [nearestPublicSpace.space.id]
          : [];
      const nearestPublicSpaceDistance = Math.min(...publicSpaces.map((space) => distance2D(item.center, space.center)));
      const coverageScore = getCoverageScore(item, coveredPublicSpaceIds.length, publicSpaces.length);

      return {
        ...item,
        coverage: {
          ...item.coverage,
          coveredPublicSpaceIds,
          nearestAssemblyPointId: nearestAssembly?.id ?? assemblyIds[0] ?? item.id,
          estimatedWalkMeters: roundMeters(nearestPublicSpaceDistance),
          coverageScore
        },
        access: {
          ...item.access,
          visibleFromPublicSpaceIds: uniqueIds([...item.access.visibleFromPublicSpaceIds, ...coveredPublicSpaceIds])
        }
      };
    }).sort((first, second) => first.id.localeCompare(second.id));
  }
}

function equipment(
  equipmentKind: EmergencyEquipmentKind,
  anchorKind: EmergencyServiceAnchor['anchorKind'],
  name: string,
  publicSpaceKind: PublicSpaceRef['kind'],
  publicSpaceOffset: number,
  centerOffset: Point2D,
  radiusMeters: number,
  deviceCount: number,
  assemblyCapacityPeople: number,
  audibleRadiusMeters: number,
  batteryBackupHours: number
): EmergencyEquipmentTemplate {
  return {
    equipmentKind,
    anchorKind,
    name,
    publicSpaceKind,
    publicSpaceOffset,
    centerOffset,
    radiusMeters,
    deviceCount,
    assemblyCapacityPeople,
    audibleRadiusMeters,
    batteryBackupHours
  };
}

function createPublicSpaceRefs(input: EmergencyEquipmentGeneratorInput): PublicSpaceRef[] {
  return [
    ...input.parks.map((park) => ({ kind: 'park' as const, id: park.id, center: park.center })),
    ...input.plazaZones.map((plaza) => ({ kind: 'plaza' as const, id: plaza.id, center: plaza.center })),
    ...input.waterfrontOpenSpaces.map((space) => ({ kind: 'waterfront' as const, id: space.id, center: space.center }))
  ].sort((first, second) => first.id.localeCompare(second.id));
}

function selectPublicSpace(
  publicSpaces: readonly PublicSpaceRef[],
  kind: PublicSpaceRef['kind'],
  offset: number
): PublicSpaceRef {
  const spaces = publicSpaces.filter((space) => space.kind === kind);
  return spaces[offset % Math.max(1, spaces.length)] ?? publicSpaces[offset % publicSpaces.length];
}

function createAccessRefs(input: {
  readonly center: Point2D;
  readonly anchor: EmergencyServiceAnchor;
  readonly navigationGraphNodes: readonly NavigationGraphNode[];
  readonly navigationGraphEdges: readonly NavigationGraphEdge[];
  readonly signIds: readonly CityId[];
  readonly signOffset: number;
}): EmergencyEquipment['access'] {
  const navigationNodeIds = input.navigationGraphNodes
    .filter((node) => node.mode === 'emergency' || node.mode === 'pedestrian')
    .map((node) => ({ node, distance: distance2D(input.center, node.position) }))
    .sort((first, second) => first.distance - second.distance || first.node.id.localeCompare(second.node.id))
    .slice(0, 4)
    .map(({ node }) => node.id);
  const navigationEdgeIds = input.navigationGraphEdges
    .filter((edge) => edge.mode === 'emergency' || edge.mode === 'pedestrian')
    .filter((edge) => edge.roadIds.includes(input.anchor.roadId) || input.anchor.access.navigationEdgeIds.includes(edge.id))
    .slice(0, 4)
    .map((edge) => edge.id);

  return {
    navigationNodeIds,
    navigationEdgeIds,
    fireLaneCurbZoneIds: input.anchor.access.fireLaneCurbZoneIds.slice(0, 4),
    signageObjectIds: input.signIds.length > 0 ? [input.signIds[input.signOffset % input.signIds.length]] : [],
    visibleFromPublicSpaceIds: []
  };
}

function getNearestEquipment(center: Point2D, equipment: readonly EmergencyEquipment[]): EmergencyEquipment | undefined {
  return [...equipment]
    .map((item) => ({ item, distance: distance2D(center, item.center) }))
    .sort((first, second) => first.distance - second.distance || first.item.id.localeCompare(second.item.id))[0]?.item;
}

function getCoverageScore(item: EmergencyEquipment, coveredPublicSpaces: number, publicSpaceCount: number): number {
  const coverageFactor = coveredPublicSpaces / Math.max(1, publicSpaceCount);
  const capacityFactor = Math.min(1, (item.capacity.deviceCount + item.capacity.assemblyCapacityPeople / 120) / 4);
  const audibleFactor = Math.min(1, item.capacity.audibleRadiusMeters / 900);
  return Number(((coverageFactor * 0.52 + capacityFactor * 0.28 + audibleFactor * 0.2) * 100).toFixed(1));
}

function uniqueIds(ids: readonly CityId[]): CityId[] {
  return [...new Set(ids)].filter(Boolean).sort();
}

function distance2D(start: Point2D, end: Point2D): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}

function roundMeters(value: number): number {
  return Math.round(value * 100) / 100;
}

export const REQUIRED_EMERGENCY_EQUIPMENT_KINDS = REQUIRED_EQUIPMENT_KINDS;
