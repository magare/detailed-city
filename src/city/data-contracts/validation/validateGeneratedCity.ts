import type {
  AssetDefinition,
  AssetFormat,
  CityId,
  CityObjectKind,
  ConstraintKind,
  GeospatialFrame,
  HazardMitigationKind,
  IntersectionControlType,
  LaneRole,
  Point2D,
  Point3D,
  Polygon2D,
  RenderBinding,
  StreetProfile,
  TravelMode,
  ValidationIssue,
  ValidationResult
} from '../cityContracts';
import {
  CITY_ADMINISTRATIVE_BOUNDARY_KINDS,
  CITY_CONSTRAINT_KINDS,
  CITY_HAZARD_ZONE_KINDS,
  CITY_LOD_TIERS,
  CITY_METRIC_KINDS,
  CITY_RESILIENCE_GOAL_KINDS,
  DEFAULT_STREET_PROFILES
} from '../cityContracts';
import { hasCityObject } from '../cityObjectIndex';
import { CITY_OBJECT_KIND_REGISTRY_ENTRIES, validateCityObjectRegistryIdentity } from '../cityObjectRegistry';
import { validateCityLodPolicy } from '../lodPolicy';
import { validateSourceMetadata } from '../sourceMetadata';
import type { GeneratedCity } from '../../../types/city';
import { getPolygonBounds, isPointInsidePolygon, polygonsIntersect } from '../../../utils/geometry';

type GeneratedCityForValidation = Pick<
  GeneratedCity,
  | 'assetBindings'
  | 'assetCatalog'
  | 'activeFrontages'
  | 'administrativeBoundaries'
  | 'blocks'
  | 'buildings'
  | 'cityMetrics'
  | 'constraints'
  | 'crossings'
  | 'curbZones'
  | 'districts'
  | 'geospatial'
  | 'hazardZones'
  | 'intersections'
  | 'lodPolicy'
  | 'objectIndex'
  | 'parcels'
  | 'parks'
  | 'resilienceGoals'
  | 'roads'
  | 'sidewalkGraph'
  | 'streetFurniture'
  | 'streetLights'
  | 'trees'
  | 'verticalSlices'
  | 'waterfrontEdges'
  | 'waterways'
  | 'zoningDistricts'
>;

type ValidationBlock = GeneratedCityForValidation['blocks'][number];
type ValidationAdministrativeBoundary = GeneratedCityForValidation['administrativeBoundaries'][number];
type ValidationCityMetric = GeneratedCityForValidation['cityMetrics'][number];
type ValidationConstraint = GeneratedCityForValidation['constraints'][number];
type ValidationDistrict = GeneratedCityForValidation['districts'][number];
type ValidationHazardZone = GeneratedCityForValidation['hazardZones'][number];
type ValidationResilienceGoal = GeneratedCityForValidation['resilienceGoals'][number];
type ValidationWaterfrontEdge = GeneratedCityForValidation['waterfrontEdges'][number];
type ValidationWaterway = GeneratedCityForValidation['waterways'][number];
type ValidationZoningDistrict = GeneratedCityForValidation['zoningDistricts'][number];

const REQUIRED_RENDER_BINDING_IDS = [
  'binding:terrain:ground',
  'binding:road:asphalt',
  'binding:water:river',
  'binding:park:grass',
  'binding:building:massing',
  'binding:building:roof-detail',
  'binding:tree:trunk',
  'binding:tree:canopy',
  'binding:street-light:pole-fixture',
  'binding:street-furniture:bench',
  'binding:street-furniture:bin',
  'binding:street-furniture:bike-rack',
  'binding:street-furniture:bollard',
  'binding:street-furniture:bus-shelter',
  'binding:street-furniture:kiosk',
  'binding:street-furniture:regulatory-sign',
  'binding:street-furniture:street-name-sign',
  'binding:street-furniture:wayfinding-sign',
  'binding:road:lane-marking',
  'binding:road:zebra-crossing',
  'binding:road:stop-bar',
  'binding:road:turn-arrow',
  'binding:road:tactile-paving',
  'binding:road:refuge-island',
  'binding:facade:storefront-window',
  'binding:facade:awning',
  'binding:facade:sign',
  'binding:facade:entrance-door',
  'binding:facade:night-window',
  'binding:waterfront:edge',
  'binding:vehicle:traffic-car'
] as const;

const REQUIRED_RENDERABLE_OBJECT_KINDS = [
  'road-segment',
  'waterway',
  'park',
  'building',
  'facade',
  'tree-planting',
  'street-light',
  'street-furniture',
  'lane-marking',
  'waterfront-edge',
  'traffic-vehicle'
] as const satisfies readonly CityObjectKind[];

const ASSET_FORMATS = ['glb', 'gltf', 'png', 'jpg', 'webp', 'ktx2', 'hdr', 'exr', 'procedural'] as const satisfies readonly AssetFormat[];
const TRAVEL_MODES = ['vehicle', 'bus', 'bike', 'freight', 'emergency'] as const satisfies readonly TravelMode[];
const LANE_ROLES = ['general', 'bus-only', 'turn-pocket', 'reversible', 'service'] as const satisfies readonly LaneRole[];
const ASSET_CATEGORIES = [
  'building',
  'effect',
  'icon',
  'nature',
  'road',
  'street-prop',
  'texture',
  'transit',
  'utility',
  'vehicle'
] as const satisfies readonly AssetDefinition['category'][];
const BINARY_ASSET_EXTENSIONS: Readonly<Record<Exclude<AssetFormat, 'procedural'>, readonly string[]>> = {
  glb: ['.glb'],
  gltf: ['.gltf'],
  png: ['.png'],
  jpg: ['.jpg', '.jpeg'],
  webp: ['.webp'],
  ktx2: ['.ktx2'],
  hdr: ['.hdr'],
  exr: ['.exr']
};

export function validateGeneratedCity(city: GeneratedCityForValidation): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const duplicateId of city.objectIndex.duplicateIds) {
    issues.push({
      id: `duplicate-id-${duplicateId}`,
      severity: 'error',
      category: 'identifier',
      objectId: duplicateId,
      message: `Duplicate city object id: ${duplicateId}.`
    });
  }

  for (const object of city.objectIndex.objects) {
    issues.push(
      ...validateCityObjectRegistryIdentity(object, {
        getParentKind: (parentId) => city.objectIndex.objectsById[parentId]?.kind
      }),
      ...validateSourceMetadata(object, {
        requireLicense: object.kind === 'asset',
        requireReviewStatus: true
      })
    );

    if (object.parentId && !hasObjectId(city, object.parentId)) {
      issues.push({
        id: `missing-parent-${object.id}-${object.parentId}`,
        severity: 'error',
        category: 'identifier',
        objectId: object.id,
        ...createIssueFocus(
          getObjectAffectedPoint(object),
          `Create parent ${object.parentId} before indexing ${object.id}, or update ${object.id}.parentId to an existing allowed parent.`
        ),
        message: `City object ${object.id} references missing parent ${object.parentId}.`
      });
    }
  }
  validateGeospatialFrame(city.geospatial, issues);
  issues.push(...validateCityLodPolicy(city.lodPolicy, city.objectIndex.objects));
  validateGeneratedCoordinates(city, issues);
  validateAssetCatalog(city.assetCatalog, issues);
  validateRenderBindings(city.assetCatalog, city.assetBindings, issues);
  validateAdministrativeBoundaries(city, issues);
  validateCityMetrics(city, issues);
  validateZoningDistricts(city, issues);
  validateWaterways(city, issues);
  validateWaterfrontEdges(city, issues);
  validateHazardZones(city, issues);
  const streetProfilesById: ReadonlyMap<string, StreetProfile> = new Map(
    DEFAULT_STREET_PROFILES.map((profile) => [profile.id, profile])
  );

  for (const road of city.roads) {
    if (road.length <= 0 || road.width <= 0 || road.laneCount <= 0 || road.widthMeters <= 0) {
      issues.push({
        id: `invalid-road-${road.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: road.id,
        ...createIssueFocus(road.center, 'Regenerate the road with positive length, width, widthMeters, and lane count.'),
        message: 'Road segments must have positive length, width, widthMeters, and lane count.'
      });
    }

    if (road.lanes.length !== road.laneCount) {
      issues.push({
        id: `lane-count-mismatch-${road.id}`,
        severity: 'error',
        category: 'graph',
        objectId: road.id,
        ...createIssueFocus(road.center, 'Regenerate road lanes so laneCount matches the lane array length.'),
        message: `Road declares ${road.laneCount} lanes but generated ${road.lanes.length}.`
      });
    }

    const profile = streetProfilesById.get(road.streetProfileId);
    if (!profile) {
      issues.push({
        id: `unknown-road-street-profile-${road.id}`,
        severity: 'error',
        category: 'graph',
        objectId: road.id,
        ...createIssueFocus(road.center, 'Assign the road to one of the registered street profiles.'),
        message: `Road ${road.id} references unknown street profile ${road.streetProfileId}.`
      });
    } else {
      if (
        road.hierarchy !== profile.hierarchy ||
        road.laneCount !== profile.vehicleLanes ||
        road.designSpeedKph !== profile.designSpeedKph
      ) {
        issues.push({
          id: `road-profile-policy-mismatch-${road.id}`,
          severity: 'error',
          category: 'graph',
          objectId: road.id,
          ...createIssueFocus(road.center, 'Regenerate the road from its street profile policy.'),
          message: `Road ${road.id} must match street profile ${profile.id} hierarchy, lane count, and speed policy.`
        });
      }

      if (
        road.rightOfWayWidthMeters < road.widthMeters - 0.001 ||
        road.rightOfWayWidthMeters !== profile.totalWidthMeters ||
        road.transitEligible !== (profile.transitLane || profile.hierarchy === 'transit-corridor')
      ) {
        issues.push({
          id: `road-right-of-way-policy-mismatch-${road.id}`,
          severity: 'error',
          category: 'geometry',
          objectId: road.id,
          ...createIssueFocus(road.center, 'Regenerate the road right-of-way and transit eligibility from its street profile.'),
          message: `Road ${road.id} right-of-way or transit eligibility does not match street profile ${profile.id}.`
        });
      }
    }

    if (!road.corridorId || !road.corridorName || !road.continuityGroupId) {
      issues.push({
        id: `missing-road-corridor-${road.id}`,
        severity: 'error',
        category: 'graph',
        objectId: road.id,
        ...createIssueFocus(road.center, 'Assign corridor identity, display name, and continuity group to the road.'),
        message: `Road ${road.id} must belong to a named corridor and continuity group.`
      });
    }

    const totalLaneWidth = road.lanes.reduce((sum, lane) => sum + lane.widthMeters, 0);
    if (totalLaneWidth > road.widthMeters + 0.001) {
      issues.push({
        id: `lanes-over-road-width-${road.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: road.id,
        ...createIssueFocus(road.center, 'Reduce lane widths or increase road width so lanes fit inside the carriageway.'),
        message: `Road lane widths total ${totalLaneWidth.toFixed(1)}m but road width is ${road.widthMeters.toFixed(1)}m.`
      });
    }

    for (const lane of road.lanes) {
      if (lane.roadSegmentId !== road.id || lane.parentId !== road.id || lane.widthMeters <= 0) {
        issues.push({
          id: `invalid-lane-${lane.id}`,
          severity: 'error',
          category: 'graph',
          objectId: lane.id,
          ...createIssueFocus(road.center, 'Attach the lane to its parent road and assign a positive lane width.'),
          message: 'Lane must reference its parent road and have a positive width.'
        });
      }

      if (
        lane.laneIndex < 0 ||
        !LANE_ROLES.includes(lane.laneRole) ||
        lane.allowedModes.length === 0 ||
        lane.turnMovements.length === 0 ||
        !lane.continuityGroupId
      ) {
        issues.push({
          id: `invalid-lane-policy-${lane.id}`,
          severity: 'error',
          category: 'graph',
          objectId: lane.id,
          ...createIssueFocus(road.center, 'Regenerate lane role, allowed modes, turn movements, and continuity metadata.'),
          message: 'Lane must expose lane-level role, allowed modes, turn movements, and continuity metadata.'
        });
      }

      const allowedModes = new Set(lane.allowedModes);
      const restrictedModes = new Set(lane.restrictedModes);
      if (
        lane.allowedModes.some((mode) => !TRAVEL_MODES.includes(mode)) ||
        lane.restrictedModes.some((mode) => !TRAVEL_MODES.includes(mode)) ||
        lane.allowedModes.some((mode) => restrictedModes.has(mode)) ||
        TRAVEL_MODES.some((mode) => !allowedModes.has(mode) && !restrictedModes.has(mode))
      ) {
        issues.push({
          id: `invalid-lane-mode-policy-${lane.id}`,
          severity: 'error',
          category: 'graph',
          objectId: lane.id,
          ...createIssueFocus(road.center, 'Declare every travel mode as either allowed or restricted, without overlap.'),
          message: 'Lane allowed and restricted travel modes must be complete and non-overlapping.'
        });
      }

      if (lane.laneRole === 'bus-only' && (lane.allowedModes.includes('vehicle') || !lane.allowedModes.includes('bus'))) {
        issues.push({
          id: `invalid-bus-lane-policy-${lane.id}`,
          severity: 'error',
          category: 'graph',
          objectId: lane.id,
          ...createIssueFocus(road.center, 'Bus-only lanes must allow bus/emergency access and restrict regular vehicles.'),
          message: 'Bus-only lane policy must restrict regular vehicles and allow bus access.'
        });
      }

      if (lane.laneRole === 'reversible' && !lane.reversible) {
        issues.push({
          id: `invalid-reversible-lane-policy-${lane.id}`,
          severity: 'error',
          category: 'graph',
          objectId: lane.id,
          ...createIssueFocus(road.center, 'Mark reversible lane roles with reversible=true.'),
          message: 'Reversible lanes must set reversible=true.'
        });
      }
    }

    if (road.transitEligible && !road.lanes.some((lane) => lane.allowedModes.includes('bus'))) {
      issues.push({
        id: `missing-bus-eligible-lane-${road.id}`,
        severity: 'error',
        category: 'graph',
        objectId: road.id,
        ...createIssueFocus(road.center, 'Transit-eligible roads must include at least one bus-capable lane.'),
        message: `Transit-eligible road ${road.id} must include at least one bus-capable lane.`
      });
    }

    for (const sidewalk of road.sidewalks) {
      if (sidewalk.roadSegmentId !== road.id || sidewalk.parentId !== road.id || sidewalk.clearWidthMeters <= 0) {
        issues.push({
          id: `invalid-sidewalk-${sidewalk.id}`,
          severity: 'error',
          category: 'graph',
          objectId: sidewalk.id,
          ...createIssueFocus(road.center, 'Attach the sidewalk to its parent road and assign a positive clear width.'),
          message: 'Sidewalk must reference its parent road and have a positive clear width.'
        });
      }
    }
  }

  const roadsById = new Map(city.roads.map((road) => [road.id, road]));
  for (const intersection of city.intersections) {
    if (!isFiniteNumber(intersection.center.x) || !isFiniteNumber(intersection.center.z)) {
      issues.push({
        id: `invalid-intersection-center-${intersection.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: intersection.id,
        ...createIssueFocus(
          getFinitePoint(intersection.center),
          'Regenerate the intersection center from finite connected road coordinates.'
        ),
        message: 'Intersection center must use finite local x/z coordinates.'
      });
    }

    if (intersection.connectedRoadIds.length < 2) {
      issues.push({
        id: `intersection-road-count-${intersection.id}`,
        severity: 'error',
        category: 'graph',
        objectId: intersection.id,
        ...createIssueFocus(intersection.center, 'Connect the intersection to at least two valid road segments.'),
        message: 'Intersection must connect at least two road segments.'
      });
    }

    for (const roadId of intersection.connectedRoadIds) {
      if (!hasObjectId(city, roadId)) {
        issues.push({
          id: `missing-intersection-road-${intersection.id}-${roadId}`,
          severity: 'error',
          category: 'identifier',
          objectId: intersection.id,
          ...createIssueFocus(
            intersection.center,
            `Create road ${roadId} before validating ${intersection.id}, or remove the stale connectedRoadIds entry.`
          ),
          message: `Intersection references missing road ${roadId}.`
        });
      }
    }

    if (!isSignalExpectationCompatible(intersection.signalExpectation, intersection.controlType)) {
      issues.push({
        id: `intersection-control-mismatch-${intersection.id}`,
        severity: 'error',
        category: 'graph',
        objectId: intersection.id,
        ...createIssueFocus(intersection.center, 'Regenerate intersection behavior from connected road hierarchy.'),
        message: `Intersection ${intersection.id} control type must match its signal expectation.`
      });
    }

    const approachRoadIds = new Set(intersection.approachRules.map((rule) => rule.roadId));
    for (const roadId of intersection.connectedRoadIds) {
      if (!approachRoadIds.has(roadId)) {
        issues.push({
          id: `missing-intersection-approach-rule-${intersection.id}-${roadId}`,
          severity: 'error',
          category: 'graph',
          objectId: intersection.id,
          ...createIssueFocus(intersection.center, 'Create one approach rule for every connected road.'),
          message: `Intersection ${intersection.id} is missing an approach rule for ${roadId}.`
        });
      }
    }

    for (const rule of intersection.approachRules) {
      if (!intersection.connectedRoadIds.includes(rule.roadId) || !isApproachControlCompatible(intersection.controlType, rule.control)) {
        issues.push({
          id: `invalid-intersection-approach-rule-${intersection.id}-${rule.roadId}`,
          severity: 'error',
          category: 'graph',
          objectId: intersection.id,
          ...createIssueFocus(intersection.center, 'Align approach controls with the intersection control type and connected roads.'),
          message: `Intersection ${intersection.id} has an invalid approach rule for ${rule.roadId}.`
        });
      }
    }

    if (intersection.turnConstraints.length === 0 || intersection.conflictPoints.length === 0) {
      issues.push({
        id: `missing-intersection-behavior-${intersection.id}`,
        severity: 'error',
        category: 'graph',
        objectId: intersection.id,
        ...createIssueFocus(intersection.center, 'Generate turn constraints and conflict points for this intersection.'),
        message: `Intersection ${intersection.id} must expose turn constraints and conflict points.`
      });
    }

    for (const turnConstraint of intersection.turnConstraints) {
      if (
        !intersection.connectedRoadIds.includes(turnConstraint.fromRoadId) ||
        !intersection.connectedRoadIds.includes(turnConstraint.toRoadId) ||
        turnConstraint.fromRoadId === turnConstraint.toRoadId ||
        turnConstraint.allowedMovements.length === 0
      ) {
        issues.push({
          id: `invalid-intersection-turn-constraint-${intersection.id}-${turnConstraint.fromRoadId}-${turnConstraint.toRoadId}`,
          severity: 'error',
          category: 'graph',
          objectId: intersection.id,
          ...createIssueFocus(intersection.center, 'Reference connected roads and at least one allowed turn movement.'),
          message: `Intersection ${intersection.id} has an invalid turn constraint.`
        });
      }
    }

    for (const conflictPoint of intersection.conflictPoints) {
      if (!conflictPoint.id || !isFiniteNumber(conflictPoint.point.x) || !isFiniteNumber(conflictPoint.point.z)) {
        issues.push({
          id: `invalid-intersection-conflict-point-${intersection.id}-${conflictPoint.id || 'missing'}`,
          severity: 'error',
          category: 'geometry',
          objectId: intersection.id,
          ...createIssueFocus(intersection.center, 'Generate stable conflict point IDs and finite local coordinates.'),
          message: `Intersection ${intersection.id} has an invalid conflict point.`
        });
      }
    }

    const visibilityRoadIds = new Set(intersection.visibilitySplays.map((splay) => splay.roadId));
    for (const roadId of intersection.connectedRoadIds) {
      if (!visibilityRoadIds.has(roadId)) {
        issues.push({
          id: `missing-intersection-visibility-splay-${intersection.id}-${roadId}`,
          severity: 'error',
          category: 'graph',
          objectId: intersection.id,
          ...createIssueFocus(intersection.center, 'Generate visibility splays for every connected approach.'),
          message: `Intersection ${intersection.id} is missing visibility data for ${roadId}.`
        });
      }
    }

    for (const splay of intersection.visibilitySplays) {
      const road = roadsById.get(splay.roadId);
      if (!road || splay.distanceMeters <= 0 || splay.clearSightTriangleMeters <= 0) {
        issues.push({
          id: `invalid-intersection-visibility-splay-${intersection.id}-${splay.roadId}`,
          severity: 'error',
          category: 'geometry',
          objectId: intersection.id,
          ...createIssueFocus(intersection.center, 'Use a connected road and positive sight-distance dimensions.'),
          message: `Intersection ${intersection.id} has invalid visibility splay data.`
        });
      }
    }

    if (intersection.cornerRadiusMeters <= 0) {
      issues.push({
        id: `invalid-intersection-corner-radius-${intersection.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: intersection.id,
        ...createIssueFocus(intersection.center, 'Assign a positive corner radius from the street hierarchy mix.'),
        message: `Intersection ${intersection.id} must have a positive corner radius.`
      });
    }

    if (intersection.hierarchyMix.length === 0) {
      issues.push({
        id: `missing-intersection-hierarchy-${intersection.id}`,
        severity: 'error',
        category: 'graph',
        objectId: intersection.id,
        ...createIssueFocus(intersection.center, 'Populate hierarchyMix from the connected road hierarchy values.'),
        message: 'Intersection must record the hierarchy mix of connected roads.'
      });
    }
  }

  const intersectionsById = new Map(city.intersections.map((intersection) => [intersection.id, intersection]));
  const slicesById = new Map(city.verticalSlices.map((slice) => [slice.id, slice]));
  const curbZonesById = new Map(city.curbZones.map((curbZone) => [curbZone.id, curbZone]));
  const assetBindingsById = new Map(city.assetBindings.map((binding) => [binding.id, binding]));
  const sidewalkGraphNodeIds = new Set(city.sidewalkGraph.nodes.map((node) => node.id));
  const crossingGraphEdgeIds = new Set(
    city.sidewalkGraph.edges
      .filter((edge) => edge.mode === 'crossing' && edge.crossingId)
      .map((edge) => edge.crossingId)
  );

  for (const crossing of city.crossings) {
    const intersection = intersectionsById.get(crossing.intersectionId);

    if (!intersection || crossing.parentId !== crossing.intersectionId) {
      issues.push({
        id: `invalid-crossing-intersection-${crossing.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: crossing.id,
        message: `Crossing must reference existing parent intersection ${crossing.intersectionId}.`
      });
    }

    if (!hasObjectId(city, crossing.roadId)) {
      issues.push({
        id: `missing-crossing-road-${crossing.id}-${crossing.roadId}`,
        severity: 'error',
        category: 'identifier',
        objectId: crossing.id,
        message: `Crossing references missing road ${crossing.roadId}.`
      });
    }

    if (intersection && !intersection.connectedRoadIds.includes(crossing.roadId)) {
      issues.push({
        id: `crossing-road-not-at-intersection-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Crossing road ${crossing.roadId} must be connected to intersection ${intersection.id}.`
      });
    }

    for (const sidewalkId of crossing.connectedSidewalkIds) {
      if (!hasObjectId(city, sidewalkId)) {
        issues.push({
          id: `missing-crossing-sidewalk-${crossing.id}-${sidewalkId}`,
          severity: 'error',
          category: 'identifier',
          objectId: crossing.id,
          message: `Crossing references missing sidewalk ${sidewalkId}.`
        });
      }
    }

    if (crossing.widthMeters <= 0 || crossing.lengthMeters <= 0) {
      issues.push({
        id: `invalid-crossing-dimensions-${crossing.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: crossing.id,
        message: 'Crossing width and length must be positive.'
      });
    }

    if (!crossingGraphEdgeIds.has(crossing.id)) {
      issues.push({
        id: `disconnected-crossing-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Crossing ${crossing.id} must have a crossing-mode sidewalk graph edge.`
      });
    }
  }

  for (const slice of city.verticalSlices) {
    const corridorRoad = roadsById.get(slice.corridorRoadId);

    if (!corridorRoad || slice.parentId !== slice.corridorRoadId) {
      issues.push({
        id: `invalid-detailed-street-corridor-${slice.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: slice.id,
        message: `Detailed street slice must reference existing parent corridor road ${slice.corridorRoadId}.`
      });
    }

    if (slice.streetProfileId !== 'main-street' && slice.streetProfileId !== 'grand-avenue') {
      issues.push({
        id: `invalid-detailed-street-profile-${slice.id}`,
        severity: 'error',
        category: 'graph',
        objectId: slice.id,
        message: 'Detailed street slice must target a main-street or grand-avenue corridor.'
      });
    }

    if (!isFiniteNumber(slice.cameraTarget.x) || !isFiniteNumber(slice.cameraTarget.y) || !isFiniteNumber(slice.cameraTarget.z)) {
      issues.push({
        id: `invalid-detailed-street-camera-target-${slice.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: slice.id,
        message: 'Detailed street slice camera target must use finite local x/y/z coordinates.'
      });
    }

    if (!isFiniteNumber(slice.cameraPosition.x) || !isFiniteNumber(slice.cameraPosition.y) || !isFiniteNumber(slice.cameraPosition.z)) {
      issues.push({
        id: `invalid-detailed-street-camera-position-${slice.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: slice.id,
        message: 'Detailed street slice camera position must use finite local x/y/z coordinates.'
      });
    }

    validateSliceReferences(city, slice.id, 'road', slice.roadIds, issues);
    validateSliceReferences(city, slice.id, 'cross-street road', slice.crossStreetRoadIds, issues);
    validateSliceReferences(city, slice.id, 'sidewalk', slice.sidewalkIds, issues);
    validateSliceReferences(city, slice.id, 'intersection', slice.intersectionIds, issues);
    validateSliceReferences(city, slice.id, 'crossing', slice.crossingIds, issues);
    validateSliceReferences(city, slice.id, 'curb zone', slice.curbZoneIds, issues);
    validateSliceReferences(city, slice.id, 'sidewalk graph node', slice.sidewalkGraphNodeIds, issues);
    validateSliceReferences(city, slice.id, 'sidewalk graph edge', slice.sidewalkGraphEdgeIds, issues);
    validateSliceReferences(city, slice.id, 'frontage parcel', slice.parcelIds, issues);
    validateSliceReferences(city, slice.id, 'frontage building', slice.buildingIds, issues);

    for (const objectId of [
      ...slice.roadIds,
      ...slice.sidewalkIds,
      ...slice.intersectionIds,
      ...slice.crossingIds,
      ...slice.curbZoneIds,
      ...slice.sidewalkGraphNodeIds,
      ...slice.sidewalkGraphEdgeIds,
      ...slice.parcelIds,
      ...slice.buildingIds
    ]) {
      const object = city.objectIndex.objectsById[objectId];

      if (object && object.tags?.detailedStreetSliceId !== slice.id) {
        issues.push({
          id: `missing-slice-tag-${slice.id}-${objectId}`,
          severity: 'error',
          category: 'identifier',
          objectId,
          message: `Detailed street slice object ${objectId} must be tagged with slice ${slice.id}.`
        });
      }
    }

    if (slice.roadIds.length === 0 || slice.sidewalkIds.length === 0 || slice.intersectionIds.length === 0) {
      issues.push({
        id: `empty-detailed-street-slice-${slice.id}`,
        severity: 'error',
        category: 'graph',
        objectId: slice.id,
        message: 'Detailed street slice must include at least one road, sidewalk, and intersection.'
      });
    }
  }

  const curbZonesBySidewalk = new Map<string, typeof city.curbZones>();

  for (const curbZone of city.curbZones) {
    const slice = slicesById.get(curbZone.sliceId);
    const road = roadsById.get(curbZone.roadId);
    const sidewalk = city.objectIndex.objectsById[curbZone.sidewalkId];

    if (!slice) {
      issues.push({
        id: `missing-curb-zone-slice-${curbZone.id}-${curbZone.sliceId}`,
        severity: 'error',
        category: 'identifier',
        objectId: curbZone.id,
        message: `Curb zone references missing detailed street slice ${curbZone.sliceId}.`
      });
    }

    if (!road) {
      issues.push({
        id: `missing-curb-zone-road-${curbZone.id}-${curbZone.roadId}`,
        severity: 'error',
        category: 'identifier',
        objectId: curbZone.id,
        message: `Curb zone references missing road ${curbZone.roadId}.`
      });
    }

    if (!sidewalk || sidewalk.kind !== 'sidewalk' || curbZone.parentId !== curbZone.sidewalkId) {
      issues.push({
        id: `invalid-curb-zone-sidewalk-${curbZone.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: curbZone.id,
        message: `Curb zone must attach to parent sidewalk ${curbZone.sidewalkId}.`
      });
    }

    if (sidewalk && sidewalk.kind === 'sidewalk' && sidewalk.roadSegmentId !== curbZone.roadId) {
      issues.push({
        id: `curb-zone-sidewalk-road-mismatch-${curbZone.id}`,
        severity: 'error',
        category: 'graph',
        objectId: curbZone.id,
        message: `Curb zone sidewalk ${curbZone.sidewalkId} must belong to road ${curbZone.roadId}.`
      });
    }

    if (
      curbZone.startMeters < 0 ||
      curbZone.endMeters <= curbZone.startMeters ||
      curbZone.lengthMeters <= 0 ||
      curbZone.widthMeters <= 0 ||
      (road && curbZone.endMeters > road.length + 0.001)
    ) {
      issues.push({
        id: `invalid-curb-zone-range-${curbZone.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: curbZone.id,
        message: 'Curb zone must have a positive range, length, width, and stay inside its parent road.'
      });
    }

    if (!isFiniteNumber(curbZone.center.x) || !isFiniteNumber(curbZone.center.z)) {
      issues.push({
        id: `invalid-curb-zone-center-${curbZone.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: curbZone.id,
        message: 'Curb zone center must use finite local x/z coordinates.'
      });
    }

    if (curbZone.tags?.detailedStreetSliceId !== curbZone.sliceId) {
      issues.push({
        id: `missing-curb-zone-slice-tag-${curbZone.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: curbZone.id,
        message: `Curb zone ${curbZone.id} must be tagged with slice ${curbZone.sliceId}.`
      });
    }

    if (slice && road && curbZone.curbUse === 'loading') {
      for (const intersectionId of slice.intersectionIds) {
        const intersection = intersectionsById.get(intersectionId);
        const crossingOffset = intersection ? getRoadOffsetMeters(road, intersection.center) : undefined;

        if (
          crossingOffset !== undefined &&
          rangesOverlap(
            curbZone.startMeters,
            curbZone.endMeters,
            crossingOffset - curbZone.crossingClearanceMeters,
            crossingOffset + curbZone.crossingClearanceMeters
          )
        ) {
          issues.push({
            id: `curb-zone-blocks-crossing-${curbZone.id}-${intersectionId}`,
            severity: 'error',
            category: 'graph',
            objectId: curbZone.id,
            message: `Loading curb zone ${curbZone.id} overlaps crossing clearance at ${intersectionId}.`
          });
        }
      }
    }

    curbZonesBySidewalk.set(curbZone.sidewalkId, [...(curbZonesBySidewalk.get(curbZone.sidewalkId) ?? []), curbZone]);
  }

  for (const [sidewalkId, curbZones] of curbZonesBySidewalk) {
    const sortedCurbZones = [...curbZones].sort((a, b) => a.startMeters - b.startMeters);

    for (let index = 1; index < sortedCurbZones.length; index += 1) {
      const previous = sortedCurbZones[index - 1];
      const current = sortedCurbZones[index];

      if (current.startMeters < previous.endMeters - 0.001) {
        issues.push({
          id: `curb-zone-overlap-${sidewalkId}-${previous.id}-${current.id}`,
          severity: 'error',
          category: 'graph',
          objectId: current.id,
          message: `Curb zones ${previous.id} and ${current.id} overlap on sidewalk ${sidewalkId}.`
        });
      }
    }
  }

  for (const node of city.sidewalkGraph.nodes) {
    if (!hasObjectId(city, node.intersectionId) || node.parentId !== node.intersectionId) {
      issues.push({
        id: `invalid-sidewalk-node-intersection-${node.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: node.id,
        message: `Sidewalk graph node must reference parent intersection ${node.intersectionId}.`
      });
    }

    if (!hasObjectId(city, node.sidewalkId)) {
      issues.push({
        id: `missing-sidewalk-node-sidewalk-${node.id}-${node.sidewalkId}`,
        severity: 'error',
        category: 'identifier',
        objectId: node.id,
        message: `Sidewalk graph node references missing sidewalk ${node.sidewalkId}.`
      });
    }

    if (!isFiniteNumber(node.position.x) || !isFiniteNumber(node.position.z)) {
      issues.push({
        id: `invalid-sidewalk-node-position-${node.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: node.id,
        message: 'Sidewalk graph node position must use finite local x/z coordinates.'
      });
    }
  }

  for (const edge of city.sidewalkGraph.edges) {
    if (!sidewalkGraphNodeIds.has(edge.fromNodeId) || !sidewalkGraphNodeIds.has(edge.toNodeId)) {
      issues.push({
        id: `missing-sidewalk-edge-node-${edge.id}`,
        severity: 'error',
        category: 'graph',
        objectId: edge.id,
        message: 'Sidewalk graph edge must reference existing from/to nodes.'
      });
    }

    if (edge.lengthMeters <= 0) {
      issues.push({
        id: `invalid-sidewalk-edge-length-${edge.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: edge.id,
        message: 'Sidewalk graph edge length must be positive.'
      });
    }

    if (edge.mode === 'crossing' && (!edge.crossingId || edge.parentId !== edge.crossingId || !hasObjectId(city, edge.crossingId))) {
      issues.push({
        id: `invalid-crossing-edge-${edge.id}`,
        severity: 'error',
        category: 'graph',
        objectId: edge.id,
        message: 'Crossing graph edge must reference an existing parent crossing.'
      });
    }

    if (edge.mode === 'sidewalk' && (!edge.sidewalkId || edge.parentId !== edge.sidewalkId || !hasObjectId(city, edge.sidewalkId))) {
      issues.push({
        id: `invalid-sidewalk-edge-${edge.id}`,
        severity: 'error',
        category: 'graph',
        objectId: edge.id,
        message: 'Sidewalk graph edge must reference an existing parent sidewalk.'
      });
    }
  }

  for (const district of city.districts) {
    if (district.boundary.length < 4 || district.primaryUses.length === 0 || district.allowedStreetProfiles.length === 0) {
      issues.push({
        id: `invalid-district-${district.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: district.id,
        message: 'Districts must have a boundary, primary uses, and allowed street profiles.'
      });
    }

    validateDistrictCharacter(district, city.districts, issues);
  }

  validateDistrictTransitions(city.blocks, city.districts, issues);
  const parcelsByBlockId = new Map<string, GeneratedCityForValidation['parcels'][number][]>();
  for (const parcel of city.parcels) {
    const blockParcels = parcelsByBlockId.get(parcel.blockId) ?? [];
    blockParcels.push(parcel);
    parcelsByBlockId.set(parcel.blockId, blockParcels);
  }

  for (const block of city.blocks) {
    if (!hasObjectId(city, block.districtId) || block.parentId !== block.districtId) {
      issues.push({
        id: `invalid-block-district-${block.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: block.id,
        message: `Block must reference an existing parent district ${block.districtId}.`
      });
    }

    if (block.size.x <= 0 || block.size.z <= 0 || block.boundary.length < 4) {
      issues.push({
        id: `invalid-block-geometry-${block.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: block.id,
        message: 'Blocks must have positive dimensions and a valid boundary seed.'
      });
    }

    validateBlockModel(block, parcelsByBlockId.get(block.id) ?? [], roadsById, issues);
  }

  for (const streetLight of city.streetLights) {
    const slice = slicesById.get(streetLight.sliceId);
    const road = roadsById.get(streetLight.roadId);
    const sidewalk = city.objectIndex.objectsById[streetLight.sidewalkId];
    const curbZone = curbZonesById.get(streetLight.curbZoneId);

    if (!slice) {
      issues.push({
        id: `missing-street-light-slice-${streetLight.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetLight.id,
        message: `Street light ${streetLight.id} must reference a detailed street slice.`
      });
    }

    if (!road) {
      issues.push({
        id: `missing-street-light-road-${streetLight.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetLight.id,
        message: `Street light ${streetLight.id} must reference an existing road.`
      });
    }

    if (!sidewalk || sidewalk.kind !== 'sidewalk' || streetLight.parentId !== streetLight.sidewalkId) {
      issues.push({
        id: `missing-street-light-sidewalk-${streetLight.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetLight.id,
        message: `Street light ${streetLight.id} must attach to parent sidewalk ${streetLight.sidewalkId}.`
      });
    }

    if (sidewalk && sidewalk.kind === 'sidewalk' && sidewalk.roadSegmentId !== streetLight.roadId) {
      issues.push({
        id: `street-light-sidewalk-road-mismatch-${streetLight.id}`,
        severity: 'error',
        category: 'graph',
        objectId: streetLight.id,
        message: `Street light sidewalk ${streetLight.sidewalkId} must belong to road ${streetLight.roadId}.`
      });
    }

    if (!curbZone || curbZone.curbUse === 'no-stopping') {
      issues.push({
        id: `invalid-street-light-curb-zone-${streetLight.id}`,
        severity: 'error',
        category: 'graph',
        objectId: streetLight.id,
        message: `Street light ${streetLight.id} must reference an active curb zone.`
      });
    }

    if (
      !isFiniteNumber(streetLight.position.x) ||
      !isFiniteNumber(streetLight.position.z) ||
      streetLight.heightMeters <= 0 ||
      streetLight.poleRadiusMeters <= 0 ||
      streetLight.armLengthMeters <= 0 ||
      streetLight.fixtureLengthMeters <= 0 ||
      streetLight.coverageRadiusMeters <= 0
    ) {
      issues.push({
        id: `invalid-street-light-geometry-${streetLight.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: streetLight.id,
        message: 'Street light must have finite position and positive pole, fixture, arm, and coverage dimensions.'
      });
    }

    if (streetLight.colorTemperatureKelvin < 2200 || streetLight.colorTemperatureKelvin > 5000) {
      issues.push({
        id: `invalid-street-light-color-temperature-${streetLight.id}`,
        severity: 'warning',
        category: 'utility-coverage',
        objectId: streetLight.id,
        message: 'Street light color temperature should stay within a warm public-realm range.'
      });
    }

    if (!streetLight.powerCircuitId) {
      issues.push({
        id: `missing-street-light-power-circuit-${streetLight.id}`,
        severity: 'warning',
        category: 'utility-coverage',
        objectId: streetLight.id,
        message: 'Street light should carry a power circuit placeholder for future utilities integration.'
      });
    }

    if (streetLight.tags?.detailedStreetSliceId !== streetLight.sliceId) {
      issues.push({
        id: `missing-street-light-slice-tag-${streetLight.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetLight.id,
        message: `Street light ${streetLight.id} must be tagged with slice ${streetLight.sliceId}.`
      });
    }
  }

  for (const streetFurniture of city.streetFurniture) {
    const slice = slicesById.get(streetFurniture.sliceId);
    const road = roadsById.get(streetFurniture.roadId);
    const sidewalk = city.objectIndex.objectsById[streetFurniture.sidewalkId];
    const curbZone = curbZonesById.get(streetFurniture.curbZoneId);
    const binding = assetBindingsById.get(streetFurniture.assetBindingId);
    const sidewalkFurnishingZone =
      sidewalk && sidewalk.kind === 'sidewalk' ? sidewalk.furnishingZoneMeters : undefined;
    const objectStartMeters = streetFurniture.alongRoadMeters - streetFurniture.clearanceEnvelope.lengthMeters / 2;
    const objectEndMeters = streetFurniture.alongRoadMeters + streetFurniture.clearanceEnvelope.lengthMeters / 2;

    if (!slice) {
      issues.push({
        id: `missing-street-furniture-slice-${streetFurniture.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must reference a detailed street slice.`
      });
    }

    if (!road) {
      issues.push({
        id: `missing-street-furniture-road-${streetFurniture.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must reference an existing road.`
      });
    }

    if (!sidewalk || sidewalk.kind !== 'sidewalk' || streetFurniture.parentId !== streetFurniture.sidewalkId) {
      issues.push({
        id: `missing-street-furniture-sidewalk-${streetFurniture.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must attach to parent sidewalk ${streetFurniture.sidewalkId}.`
      });
    }

    if (sidewalk && sidewalk.kind === 'sidewalk' && sidewalk.roadSegmentId !== streetFurniture.roadId) {
      issues.push({
        id: `street-furniture-sidewalk-road-mismatch-${streetFurniture.id}`,
        severity: 'error',
        category: 'graph',
        objectId: streetFurniture.id,
        message: `Street furniture sidewalk ${streetFurniture.sidewalkId} must belong to road ${streetFurniture.roadId}.`
      });
    }

    if (!curbZone || curbZone.curbUse === 'no-stopping') {
      issues.push({
        id: `invalid-street-furniture-curb-zone-${streetFurniture.id}`,
        severity: 'error',
        category: 'graph',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must reference an active curb zone.`
      });
    } else if (
      curbZone.sliceId !== streetFurniture.sliceId ||
      curbZone.roadId !== streetFurniture.roadId ||
      curbZone.sidewalkId !== streetFurniture.sidewalkId
    ) {
      issues.push({
        id: `street-furniture-curb-zone-mismatch-${streetFurniture.id}`,
        severity: 'error',
        category: 'graph',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must match its curb zone slice, road, and sidewalk.`
      });
    }

    if (
      !isFiniteNumber(streetFurniture.position.x) ||
      !isFiniteNumber(streetFurniture.position.z) ||
      !isFiniteNumber(streetFurniture.alongRoadMeters) ||
      !isFiniteNumber(streetFurniture.offsetFromRoadEdgeMeters) ||
      !isFiniteNumber(streetFurniture.orientationRadians) ||
      streetFurniture.dimensions.widthMeters <= 0 ||
      streetFurniture.dimensions.lengthMeters <= 0 ||
      streetFurniture.dimensions.heightMeters <= 0 ||
      streetFurniture.clearanceEnvelope.widthMeters <= 0 ||
      streetFurniture.clearanceEnvelope.lengthMeters <= 0
    ) {
      issues.push({
        id: `invalid-street-furniture-geometry-${streetFurniture.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: streetFurniture.id,
        message: 'Street furniture must have finite placement and positive dimensions and clearance envelope.'
      });
    }

    if (!binding || binding.objectKind !== 'street-furniture') {
      issues.push({
        id: `invalid-street-furniture-asset-binding-${streetFurniture.id}`,
        severity: 'error',
        category: 'asset',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must reference a street-furniture render binding.`
      });
    }

    if (
      sidewalkFurnishingZone !== undefined &&
      streetFurniture.placementZone === 'furnishing-zone' &&
      (streetFurniture.offsetFromRoadEdgeMeters - streetFurniture.clearanceEnvelope.widthMeters / 2 < -0.001 ||
        streetFurniture.offsetFromRoadEdgeMeters + streetFurniture.clearanceEnvelope.widthMeters / 2 >
          sidewalkFurnishingZone + 0.001)
    ) {
      issues.push({
        id: `street-furniture-blocks-clear-path-${streetFurniture.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must fit inside furnishing zone ${sidewalkFurnishingZone.toFixed(1)}m.`
      });
    }

    if (
      curbZone &&
      (objectStartMeters < curbZone.startMeters - 0.001 || objectEndMeters > curbZone.endMeters + 0.001)
    ) {
      issues.push({
        id: `street-furniture-outside-curb-zone-${streetFurniture.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} clearance envelope must stay inside its curb zone.`
      });
    }

    if (slice && road && curbZone) {
      for (const intersectionId of slice.intersectionIds) {
        const intersection = intersectionsById.get(intersectionId);
        const crossingOffset = intersection ? getRoadOffsetMeters(road, intersection.center) : undefined;

        if (
          crossingOffset !== undefined &&
          rangesOverlap(
            objectStartMeters,
            objectEndMeters,
            crossingOffset - curbZone.crossingClearanceMeters,
            crossingOffset + curbZone.crossingClearanceMeters
          )
        ) {
          issues.push({
            id: `street-furniture-overlaps-crossing-clearance-${streetFurniture.id}-${intersectionId}`,
            severity: 'error',
            category: 'graph',
            objectId: streetFurniture.id,
            message: `Street furniture ${streetFurniture.id} overlaps crossing clearance at ${intersectionId}.`
          });
        }
      }
    }

    if (streetFurniture.furnitureType === 'bus-shelter' && curbZone?.curbUse !== 'bus-stop') {
      issues.push({
        id: `bus-shelter-without-bus-stop-${streetFurniture.id}`,
        severity: 'error',
        category: 'graph',
        objectId: streetFurniture.id,
        message: `Bus shelter ${streetFurniture.id} must be placed on a bus-stop curb zone.`
      });
    }

    if (isSignFurnitureType(streetFurniture.furnitureType) && !streetFurniture.signFace) {
      issues.push({
        id: `missing-street-furniture-sign-face-${streetFurniture.id}`,
        severity: 'error',
        category: 'asset',
        objectId: streetFurniture.id,
        message: `Sign furniture ${streetFurniture.id} must expose sign-face metadata.`
      });
    }

    if (streetFurniture.tags?.detailedStreetSliceId !== streetFurniture.sliceId) {
      issues.push({
        id: `missing-street-furniture-slice-tag-${streetFurniture.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must be tagged with slice ${streetFurniture.sliceId}.`
      });
    }
  }

  const parcelsById = new Map(city.parcels.map((parcel) => [parcel.id, parcel]));
  const blocksById = new Map(city.blocks.map((block) => [block.id, block]));
  const zoningById = new Map(city.zoningDistricts.map((zoning) => [zoning.id, zoning]));

  for (const parcel of city.parcels) {
    if (!hasObjectId(city, parcel.districtId) || !hasObjectId(city, parcel.blockId)) {
      issues.push({
        id: `invalid-parcel-relationships-${parcel.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: parcel.id,
        message: `Parcel must reference existing district ${parcel.districtId} and block ${parcel.blockId}.`
      });
    }

    if (
      parcel.size.x <= 0 ||
      parcel.size.z <= 0 ||
      parcel.maxHeightMeters <= 0 ||
      parcel.maxCoverageRatio <= 0 ||
      parcel.maxCoverageRatio > 1
    ) {
      issues.push({
        id: `invalid-parcel-${parcel.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: parcel.id,
        message: 'Parcels must have positive width, depth, max height, and a coverage ratio from 0 to 1.'
      });
    }

    if (parcel.frontageRoadIds.length === 0) {
      issues.push({
        id: `missing-frontage-${parcel.id}`,
        severity: 'error',
        category: 'graph',
        objectId: parcel.id,
        message: 'Parcel must expose at least one frontage road.'
      });
    }

    for (const frontageRoadId of parcel.frontageRoadIds) {
      if (!hasObjectId(city, frontageRoadId)) {
        issues.push({
          id: `missing-frontage-road-${parcel.id}-${frontageRoadId}`,
          severity: 'error',
          category: 'identifier',
          objectId: parcel.id,
          message: `Parcel references missing frontage road ${frontageRoadId}.`
        });
      }
    }

    if (parcel.allowedUses.length === 0) {
      issues.push({
        id: `missing-allowed-uses-${parcel.id}`,
        severity: 'error',
        category: 'zoning',
        objectId: parcel.id,
        message: 'Parcel must carry at least one allowed land use.'
      });
    }

    const zoning = zoningById.get(parcel.zoningDistrictId);
    if (!zoning) {
      issues.push({
        id: `missing-parcel-zoning-${parcel.id}-${toIssueIdToken(parcel.zoningDistrictId)}`,
        severity: 'error',
        category: 'zoning',
        objectId: parcel.id,
        ...createIssueFocus(parcel.center, `Assign ${parcel.id} to an existing zoning district.`),
        message: `Parcel ${parcel.id} references missing zoning district ${parcel.zoningDistrictId}.`
      });
    } else {
      validateParcelZoning(parcel, zoning, issues);
    }

    validateParcelModel(parcel, blocksById.get(parcel.blockId), city.constraints, roadsById, issues);
  }

  for (const building of city.buildings) {
    const parcel = parcelsById.get(building.parcelId);

    if (!parcel) {
      issues.push({
        id: `missing-building-parcel-${building.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: building.id,
        message: `Building references missing parcel ${building.parcelId}.`
      });
      continue;
    }

    if (building.size.x <= 0 || building.size.z <= 0 || building.heightMeters <= 0 || building.floorCount <= 0) {
      issues.push({
        id: `invalid-building-${building.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: building.id,
        message: 'Buildings must have positive footprint, height, and floor count.'
      });
    }

    if (building.zoningDistrictId !== parcel.zoningDistrictId || !zoningById.has(building.zoningDistrictId)) {
      issues.push({
        id: `invalid-building-zoning-${building.id}`,
        severity: 'error',
        category: 'zoning',
        objectId: building.id,
        message: `Building ${building.id} must resolve the same zoning district as parcel ${parcel.id}.`
      });
    }

    if (building.size.x > parcel.size.x || building.size.z > parcel.size.z) {
      issues.push({
        id: `building-over-parcel-${building.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: building.id,
        message: 'Building footprint must fit inside its parcel envelope.'
      });
    }

    if (!isPolygonWithinPolygonBounds(building.footprint, parcel.fit.buildableEnvelope)) {
      issues.push({
        id: `building-outside-parcel-envelope-${building.id}`,
        severity: 'error',
        category: 'zoning',
        objectId: building.id,
        affectedBoundary: building.footprint,
        suggestedFix: `Resize or move ${building.id} so it fits inside ${parcel.fit.buildableEnvelopeId}.`,
        message: `Building footprint must fit inside parcel buildable envelope ${parcel.fit.buildableEnvelopeId}.`
      });
    }

    const coverageRatio = (building.size.x * building.size.z) / (parcel.size.x * parcel.size.z);
    const maxCoverageRatio = Math.min(parcel.maxCoverageRatio, parcel.zoning.maxCoverageRatio);
    if (coverageRatio > maxCoverageRatio + 0.001) {
      issues.push({
        id: `coverage-over-zoning-${building.id}`,
        severity: 'error',
        category: 'zoning',
        objectId: building.id,
        message: `Building coverage ${coverageRatio.toFixed(2)} exceeds parcel max coverage ${maxCoverageRatio.toFixed(2)}.`
      });
    }

    const floorAreaRatio = (building.size.x * building.size.z * building.floorCount) / (parcel.size.x * parcel.size.z);
    if (floorAreaRatio > parcel.zoning.maxFloorAreaRatio + 0.001) {
      issues.push({
        id: `floor-area-ratio-over-zoning-${building.id}`,
        severity: 'error',
        category: 'zoning',
        objectId: building.id,
        message: `Building FAR ${floorAreaRatio.toFixed(2)} exceeds parcel zoning FAR ${parcel.zoning.maxFloorAreaRatio.toFixed(2)}.`
      });
    }

    const maxHeightMeters = Math.min(parcel.maxHeightMeters, parcel.zoning.maxHeightMeters);
    if (building.heightMeters > maxHeightMeters) {
      issues.push({
        id: `height-over-zoning-${building.id}`,
        severity: 'warning',
        category: 'zoning',
        objectId: building.id,
        message: `Building height ${building.heightMeters.toFixed(1)}m exceeds max height ${maxHeightMeters.toFixed(1)}m.`
      });
    }

    if (!parcel.frontageRoadIds.includes(building.primaryFrontageRoadId) || !hasObjectId(city, building.primaryFrontageRoadId)) {
      issues.push({
        id: `invalid-building-primary-frontage-${building.id}`,
        severity: 'error',
        category: 'graph',
        objectId: building.id,
        message: `Building primary frontage road ${building.primaryFrontageRoadId} must resolve through parcel ${parcel.id}.`
      });
    }

    if (!isBuildingFrontageSide(building.primaryFrontageSide)) {
      issues.push({
        id: `invalid-building-frontage-side-${building.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: building.id,
        message: 'Building primary frontage side must be one of north, east, south, or west.'
      });
    }

    if (hasActiveFrontageUse(building.uses) && building.publicEntranceIds.length === 0) {
      issues.push({
        id: `missing-active-building-public-entrance-${building.id}`,
        severity: 'error',
        category: 'graph',
        objectId: building.id,
        message: 'Buildings with retail, hospitality, or mixed-use activity must expose at least one public entrance.'
      });
    }

    for (const entranceId of building.publicEntranceIds) {
      if (!building.entranceIds.includes(entranceId)) {
        issues.push({
          id: `invalid-building-public-entrance-${building.id}-${entranceId}`,
          severity: 'error',
          category: 'identifier',
          objectId: building.id,
          message: `Building public entrance ${entranceId} must be listed in entranceIds.`
        });
      }
    }

    for (const use of building.uses) {
      if (!parcel.allowedUses.includes(use) || !parcel.zoning.allowedUses.includes(use)) {
        issues.push({
          id: `use-over-zoning-${building.id}-${use}`,
          severity: 'error',
          category: 'zoning',
          objectId: building.id,
          message: `Building use ${use} is not allowed by parcel ${parcel.id}.`
        });
      }
    }
  }

  validateConstraints(city, issues, { parcelsById, roadsById });
  validateHazardZoneConflicts(city, issues);
  validateResilienceGoals(city, issues, { roadsById });

  const activeFrontageBuildingIds = new Set(city.activeFrontages.map((frontage) => frontage.buildingId));

  for (const slice of city.verticalSlices) {
    for (const buildingId of slice.buildingIds) {
      const building = city.buildings.find((candidate) => candidate.id === buildingId);
      const parcel = building ? parcelsById.get(building.parcelId) : undefined;

      if (
        building &&
        parcel &&
        parcel.frontageRoadIds.includes(slice.corridorRoadId) &&
        hasActiveFrontageUse(building.uses) &&
        !activeFrontageBuildingIds.has(building.id)
      ) {
        issues.push({
          id: `missing-active-frontage-${building.id}-${slice.id}`,
          severity: 'error',
          category: 'graph',
          objectId: building.id,
          message: `Detailed street active-use building ${building.id} must expose an active frontage facade.`
        });
      }
    }
  }

  for (const activeFrontage of city.activeFrontages) {
    validateActiveFrontage(activeFrontage, city, issues, {
      assetBindingsById,
      parcelsById,
      roadsById,
      slicesById
    });
  }

  for (const tree of city.trees) {
    if (tree.plantingContext === 'park' && (!tree.parkId || !hasObjectId(city, tree.parkId) || tree.parentId !== tree.parkId)) {
      issues.push({
        id: `missing-tree-parent-${tree.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: tree.id,
        message: `Park tree planting must reference parent park ${tree.parkId}.`
      });
    }

    if (tree.plantingContext === 'street') {
      const road = tree.roadId ? roadsById.get(tree.roadId) : undefined;
      const sidewalk = tree.sidewalkId ? city.objectIndex.objectsById[tree.sidewalkId] : undefined;
      const curbZone = tree.curbZoneId ? curbZonesById.get(tree.curbZoneId) : undefined;
      const sidewalkFurnishingZone =
        sidewalk && sidewalk.kind === 'sidewalk' ? sidewalk.furnishingZoneMeters : undefined;

      if (!tree.sliceId || !slicesById.has(tree.sliceId)) {
        issues.push({
          id: `missing-street-tree-slice-${tree.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: tree.id,
          message: `Street tree ${tree.id} must reference a detailed street slice.`
        });
      }

      if (!road || !tree.roadId) {
        issues.push({
          id: `missing-street-tree-road-${tree.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: tree.id,
          message: `Street tree ${tree.id} must reference an existing road.`
        });
      }

      if (!sidewalk || sidewalk.kind !== 'sidewalk' || tree.parentId !== tree.sidewalkId) {
        issues.push({
          id: `missing-street-tree-sidewalk-${tree.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: tree.id,
          message: `Street tree ${tree.id} must attach to parent sidewalk ${tree.sidewalkId}.`
        });
      }

      if (sidewalk && sidewalk.kind === 'sidewalk' && tree.roadId && sidewalk.roadSegmentId !== tree.roadId) {
        issues.push({
          id: `street-tree-sidewalk-road-mismatch-${tree.id}`,
          severity: 'error',
          category: 'graph',
          objectId: tree.id,
          message: `Street tree sidewalk ${tree.sidewalkId} must belong to road ${tree.roadId}.`
        });
      }

      if (!curbZone || curbZone.curbUse === 'no-stopping') {
        issues.push({
          id: `invalid-street-tree-curb-zone-${tree.id}`,
          severity: 'error',
          category: 'graph',
          objectId: tree.id,
          message: `Street tree ${tree.id} must reference an active curb zone.`
        });
      }

      if (!tree.treePit || tree.treePit.widthMeters <= 0 || tree.treePit.lengthMeters <= 0) {
        issues.push({
          id: `invalid-street-tree-pit-${tree.id}`,
          severity: 'error',
          category: 'geometry',
          objectId: tree.id,
          message: 'Street tree must include positive tree pit dimensions.'
        });
      }

      if (
        sidewalkFurnishingZone !== undefined &&
        (tree.offsetFromRoadEdgeMeters === undefined ||
          tree.offsetFromRoadEdgeMeters > sidewalkFurnishingZone + 0.001 ||
          (tree.treePit?.widthMeters ?? 0) > sidewalkFurnishingZone + 0.001)
      ) {
        issues.push({
          id: `street-tree-outside-furnishing-zone-${tree.id}`,
          severity: 'error',
          category: 'geometry',
          objectId: tree.id,
          message: `Street tree ${tree.id} must fit inside sidewalk furnishing zone ${sidewalkFurnishingZone.toFixed(1)}m.`
        });
      }

      if (tree.tags?.detailedStreetSliceId !== tree.sliceId) {
        issues.push({
          id: `missing-street-tree-slice-tag-${tree.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: tree.id,
          message: `Street tree ${tree.id} must be tagged with slice ${tree.sliceId}.`
        });
      }
    }
  }

  return {
    passed: issues.every((issue) => issue.severity !== 'error'),
    issues
  };
}

function hasObjectId(city: GeneratedCityForValidation, id: string): boolean {
  return hasCityObject(city.objectIndex, id);
}

function isPolygonWithinPolygonBounds(inner: Polygon2D, outer: Polygon2D, tolerance = 0.001): boolean {
  if (inner.length === 0 || outer.length === 0) {
    return false;
  }

  const innerBounds = getPolygonBounds(inner);
  const outerBounds = getPolygonBounds(outer);

  return (
    innerBounds.minX >= outerBounds.minX - tolerance &&
    innerBounds.maxX <= outerBounds.maxX + tolerance &&
    innerBounds.minZ >= outerBounds.minZ - tolerance &&
    innerBounds.maxZ <= outerBounds.maxZ + tolerance
  );
}

function validateBlockModel(
  block: ValidationBlock,
  parcels: readonly GeneratedCityForValidation['parcels'][number][],
  roadsById: ReadonlyMap<string, GeneratedCityForValidation['roads'][number]>,
  issues: ValidationIssue[]
): void {
  if (block.buildableEnvelope.id !== `${block.id}-buildable-envelope`) {
    issues.push({
      id: `invalid-block-envelope-id-${block.id}`,
      severity: 'error',
      category: 'land',
      objectId: block.id,
      ...createIssueFocus(block.center, `Set ${block.id}.buildableEnvelope.id to ${block.id}-buildable-envelope.`),
      message: `Block ${block.id} must expose a stable buildable envelope ID.`
    });
  }

  if (
    block.buildableEnvelope.boundary.length < 4 ||
    block.buildableEnvelope.minSetbackMeters < 0 ||
    block.buildableEnvelope.maxCoverageRatio <= 0 ||
    block.buildableEnvelope.maxCoverageRatio > 1
  ) {
    issues.push({
      id: `invalid-block-envelope-${block.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: block.id,
      ...createIssueFocus(block.center, 'Regenerate the block buildable envelope with a valid boundary, setback, and coverage ratio.'),
      message: `Block ${block.id} must expose a valid buildable envelope.`
    });
  }

  if (!isPolygonWithinPolygonBounds(block.buildableEnvelope.boundary, block.boundary)) {
    issues.push({
      id: `block-envelope-outside-boundary-${block.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: block.id,
      affectedBoundary: block.buildableEnvelope.boundary,
      suggestedFix: `Regenerate ${block.id}.buildableEnvelope inside the block boundary.`,
      message: `Block ${block.id} buildable envelope must stay inside the block boundary.`
    });
  }

  const frontageSides = new Set(block.frontageClasses.map((frontage) => frontage.side));
  if (block.frontageClasses.length !== 4 || frontageSides.size !== 4) {
    issues.push({
      id: `invalid-block-frontage-classes-${block.id}`,
      severity: 'error',
      category: 'land',
      objectId: block.id,
      ...createIssueFocus(block.center, 'Generate one west, east, south, and north frontage class for the block.'),
      message: `Block ${block.id} must expose exactly four side frontage classes.`
    });
  }

  for (const frontage of block.frontageClasses) {
    if (!roadsById.has(frontage.roadId) || frontage.lengthMeters <= 0) {
      issues.push({
        id: `invalid-block-frontage-${block.id}-${frontage.side}`,
        severity: 'error',
        category: 'graph',
        objectId: block.id,
        ...createIssueFocus(block.center, `Attach ${block.id} ${frontage.side} frontage to an existing road with positive length.`),
        message: `Block ${block.id} frontage ${frontage.side} must reference an existing road and positive length.`
      });
    }
  }

  if (block.internalAccess.mode === 'none' && block.internalAccess.accessIds.length > 0) {
    issues.push({
      id: `invalid-block-internal-access-none-${block.id}`,
      severity: 'error',
      category: 'land',
      objectId: block.id,
      ...createIssueFocus(block.center, `Clear internal access IDs for ${block.id} or set an active access mode.`),
      message: `Block ${block.id} cannot list internal access IDs when mode is none.`
    });
  }

  if (block.internalAccess.mode !== 'none' && block.alleys.length === 0) {
    issues.push({
      id: `missing-block-internal-access-${block.id}`,
      severity: 'error',
      category: 'land',
      objectId: block.id,
      ...createIssueFocus(block.center, `Generate alley or passage records for ${block.id}.`),
      message: `Block ${block.id} must expose alley or passage records for its internal access mode.`
    });
  }

  const alleyIds = new Set(block.alleys.map((alley) => alley.id));
  for (const accessId of block.internalAccess.accessIds) {
    if (!alleyIds.has(accessId)) {
      issues.push({
        id: `missing-block-access-reference-${block.id}-${toIssueIdToken(accessId)}`,
        severity: 'error',
        category: 'identifier',
        objectId: block.id,
        ...createIssueFocus(block.center, `Make ${accessId} an alley on ${block.id}, or remove it from internalAccess.accessIds.`),
        message: `Block ${block.id} references missing internal access ${accessId}.`
      });
    }
  }

  for (const alley of block.alleys) {
    const hasMissingRoad = alley.connectedRoadIds.some((roadId) => !roadsById.has(roadId));
    const hasInvalidPoint = alley.centerline.some((point) => !isFiniteNumber(point.x) || !isFiniteNumber(point.z));

    if (alley.widthMeters <= 0 || alley.connectedRoadIds.length < 2 || hasMissingRoad || hasInvalidPoint) {
      issues.push({
        id: `invalid-block-alley-${toIssueIdToken(alley.id)}`,
        severity: 'error',
        category: 'graph',
        objectId: block.id,
        ...createIssueFocus(block.center, `Regenerate ${alley.id} with positive width, finite centerline, and valid road connections.`),
        message: `Block internal access ${alley.id} must connect at least two existing roads with finite geometry.`
      });
    }
  }

  if (
    block.subdivisionConstraints.preferredLotSplit <= 0 ||
    block.subdivisionConstraints.maxParcelCount < parcels.length ||
    block.subdivisionConstraints.minParcelWidthMeters <= 0 ||
    block.subdivisionConstraints.minParcelDepthMeters <= 0
  ) {
    issues.push({
      id: `invalid-block-subdivision-${block.id}`,
      severity: 'error',
      category: 'land',
      objectId: block.id,
      ...createIssueFocus(block.center, 'Regenerate block subdivision constraints so generated parcels fit within declared limits.'),
      message: `Block ${block.id} subdivision constraints must cover generated parcels and positive parcel dimensions.`
    });
  }

  if (
    block.permeabilityMetrics.score < 0 ||
    block.permeabilityMetrics.score > 1 ||
    block.permeabilityMetrics.throughAccessCount !== block.alleys.length ||
    block.permeabilityMetrics.frontageContinuityRatio < 0 ||
    block.permeabilityMetrics.frontageContinuityRatio > 1 ||
    block.permeabilityMetrics.averageParcelFrontageMeters <= 0
  ) {
    issues.push({
      id: `invalid-block-permeability-metrics-${block.id}`,
      severity: 'error',
      category: 'land',
      objectId: block.id,
      ...createIssueFocus(block.center, 'Recompute block permeability metrics from frontage and internal access data.'),
      message: `Block ${block.id} must expose normalized permeability metrics.`
    });
  }

  for (const parcel of parcels) {
    if (parcel.blockBuildableEnvelopeId !== block.buildableEnvelope.id) {
      issues.push({
        id: `invalid-parcel-block-envelope-${parcel.id}`,
        severity: 'error',
        category: 'land',
        objectId: parcel.id,
        ...createIssueFocus(parcel.center, `Set ${parcel.id}.blockBuildableEnvelopeId to ${block.buildableEnvelope.id}.`),
        message: `Parcel ${parcel.id} must reference its parent block buildable envelope.`
      });
    }

    if (!isPolygonWithinPolygonBounds(parcel.boundary, block.buildableEnvelope.boundary)) {
      issues.push({
        id: `parcel-outside-block-envelope-${parcel.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: parcel.id,
        affectedBoundary: parcel.boundary,
        suggestedFix: `Regenerate ${parcel.id} from ${block.id}'s buildable envelope.`,
        message: `Parcel ${parcel.id} must fit inside parent block ${block.id}'s buildable envelope.`
      });
    }
  }
}

function validateParcelModel(
  parcel: GeneratedCityForValidation['parcels'][number],
  block: ValidationBlock | undefined,
  constraints: readonly ValidationConstraint[],
  roadsById: ReadonlyMap<string, GeneratedCityForValidation['roads'][number]>,
  issues: ValidationIssue[]
): void {
  const setbackValues = [parcel.setbacks.frontMeters, parcel.setbacks.sideMeters, parcel.setbacks.rearMeters];
  if (setbackValues.some((value) => value < 0 || !Number.isFinite(value))) {
    issues.push({
      id: `invalid-parcel-setbacks-${parcel.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Regenerate ${parcel.id} with finite non-negative front, side, and rear setbacks.`),
      message: `Parcel ${parcel.id} must expose valid setback controls.`
    });
  }

  if (parcel.fit.buildableEnvelopeId !== `${parcel.id}-buildable-envelope`) {
    issues.push({
      id: `invalid-parcel-envelope-id-${parcel.id}`,
      severity: 'error',
      category: 'land',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Set ${parcel.id}.fit.buildableEnvelopeId to ${parcel.id}-buildable-envelope.`),
      message: `Parcel ${parcel.id} must expose a stable buildable envelope ID.`
    });
  }

  if (
    parcel.fit.buildableEnvelope.length < 4 ||
    parcel.fit.buildableAreaSqM <= 0 ||
    parcel.fit.minBuildableWidthMeters <= 0 ||
    parcel.fit.minBuildableDepthMeters <= 0 ||
    !isFiniteNumber(parcel.fit.preferredBuildingCenter.x) ||
    !isFiniteNumber(parcel.fit.preferredBuildingCenter.z)
  ) {
    issues.push({
      id: `invalid-parcel-fit-${parcel.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Regenerate ${parcel.id}.fit from parcel dimensions and setbacks.`),
      message: `Parcel ${parcel.id} must expose a valid fit helper and buildable area.`
    });
  }

  if (!isPolygonWithinPolygonBounds(parcel.fit.buildableEnvelope, parcel.boundary)) {
    issues.push({
      id: `parcel-envelope-outside-boundary-${parcel.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: parcel.id,
      affectedBoundary: parcel.fit.buildableEnvelope,
      suggestedFix: `Regenerate ${parcel.id}.fit.buildableEnvelope inside the parcel boundary.`,
      message: `Parcel ${parcel.id} buildable envelope must stay inside the parcel boundary.`
    });
  }

  if (block && parcel.blockBuildableEnvelopeId !== block.buildableEnvelope.id) {
    issues.push({
      id: `invalid-parcel-block-envelope-${parcel.id}`,
      severity: 'error',
      category: 'land',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Set ${parcel.id}.blockBuildableEnvelopeId to ${block.buildableEnvelope.id}.`),
      message: `Parcel ${parcel.id} must reference parent block buildable envelope ${block.buildableEnvelope.id}.`
    });
  }

  if (
    parcel.lotSplit.splitGrid.length !== 2 ||
    parcel.lotSplit.lotIndex.length !== 2 ||
    parcel.lotSplit.splitGrid.some((value) => value <= 0) ||
    parcel.lotSplit.lotIndex[0] < 0 ||
    parcel.lotSplit.lotIndex[1] < 0 ||
    parcel.lotSplit.lotIndex[0] >= parcel.lotSplit.splitGrid[0] ||
    parcel.lotSplit.lotIndex[1] >= parcel.lotSplit.splitGrid[1]
  ) {
    issues.push({
      id: `invalid-parcel-lot-split-${parcel.id}`,
      severity: 'error',
      category: 'land',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Regenerate ${parcel.id}.lotSplit with valid split grid and lot index.`),
      message: `Parcel ${parcel.id} must expose valid lot split metadata.`
    });
  }

  if (
    parcel.developmentRights.maxFloorAreaRatio <= 0 ||
    parcel.developmentRights.maxFloorAreaSqM <= 0 ||
    parcel.developmentRights.maxCoverageRatio <= 0 ||
    parcel.developmentRights.maxCoverageRatio > 1 ||
    parcel.developmentRights.maxHeightMeters <= 0 ||
    parcel.developmentRights.maxCoverageRatio !== parcel.maxCoverageRatio ||
    parcel.developmentRights.maxHeightMeters !== parcel.maxHeightMeters
  ) {
    issues.push({
      id: `invalid-parcel-development-rights-${parcel.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Synchronize ${parcel.id}.developmentRights with parcel zoning limits.`),
      message: `Parcel ${parcel.id} must expose coherent development rights.`
    });
  }

  if (parcel.frontagePriority.length === 0) {
    issues.push({
      id: `missing-parcel-frontage-priority-${parcel.id}`,
      severity: 'error',
      category: 'graph',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Create frontage priority entries for ${parcel.id}'s frontage roads.`),
      message: `Parcel ${parcel.id} must rank its frontage roads.`
    });
  }

  const frontagePriorityRoads = new Set(parcel.frontagePriority.map((frontage) => frontage.roadId));
  for (const frontageRoadId of parcel.frontageRoadIds) {
    if (!frontagePriorityRoads.has(frontageRoadId)) {
      issues.push({
        id: `missing-parcel-frontage-priority-road-${parcel.id}-${frontageRoadId}`,
        severity: 'error',
        category: 'graph',
        objectId: parcel.id,
        ...createIssueFocus(parcel.center, `Add ${frontageRoadId} to ${parcel.id}.frontagePriority.`),
        message: `Parcel ${parcel.id} frontage priority must include frontage road ${frontageRoadId}.`
      });
    }
  }

  for (const frontage of parcel.frontagePriority) {
    if (!roadsById.has(frontage.roadId)) {
      issues.push({
        id: `invalid-parcel-frontage-priority-road-${parcel.id}-${frontage.roadId}`,
        severity: 'error',
        category: 'identifier',
        objectId: parcel.id,
        ...createIssueFocus(parcel.center, `Attach ${parcel.id} frontage priority to an existing road.`),
        message: `Parcel ${parcel.id} frontage priority references missing road ${frontage.roadId}.`
      });
    }
  }

  const constraintIds = new Set(constraints.map((constraint) => constraint.id));
  for (const constraintId of parcel.parcelConstraintIds) {
    if (!constraintIds.has(constraintId)) {
      issues.push({
        id: `missing-parcel-constraint-${parcel.id}-${toIssueIdToken(constraintId)}`,
        severity: 'error',
        category: 'land',
        objectId: parcel.id,
        ...createIssueFocus(parcel.center, `Remove ${constraintId} from ${parcel.id} or generate the referenced constraint.`),
        message: `Parcel ${parcel.id} references missing parcel constraint ${constraintId}.`
      });
    }
  }
}

function validateZoningDistricts(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const districtsById = new Map(city.districts.map((district) => [district.id, district]));
  const blocksById = new Map(city.blocks.map((block) => [block.id, block]));
  const parcelsById = new Map(city.parcels.map((parcel) => [parcel.id, parcel]));
  const constraintsById = new Map(city.constraints.map((constraint) => [constraint.id, constraint]));

  for (const zoning of city.zoningDistricts) {
    if (!districtsById.has(zoning.districtId) || zoning.parentId !== zoning.districtId) {
      issues.push({
        id: `invalid-zoning-district-parent-${zoning.id}`,
        severity: 'error',
        category: 'zoning',
        objectId: zoning.id,
        message: `Zoning district ${zoning.id} must be parented to existing district ${zoning.districtId}.`
      });
    }

    if (zoning.boundary.length < 4) {
      issues.push({
        id: `invalid-zoning-boundary-${zoning.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: zoning.id,
        message: `Zoning district ${zoning.id} must expose a polygon boundary.`
      });
    }

    validateZoningControls(zoning.id, zoning.controls, issues, zoning);

    for (const blockId of zoning.blockIds) {
      const block = blocksById.get(blockId);
      if (!block || block.districtId !== zoning.districtId) {
        issues.push({
          id: `invalid-zoning-block-reference-${zoning.id}-${toIssueIdToken(blockId)}`,
          severity: 'error',
          category: 'zoning',
          objectId: zoning.id,
          message: `Zoning district ${zoning.id} references block ${blockId} outside its district.`
        });
      }
    }

    for (const parcelId of zoning.parcelIds) {
      const parcel = parcelsById.get(parcelId);
      if (!parcel || parcel.zoningDistrictId !== zoning.id) {
        issues.push({
          id: `invalid-zoning-parcel-reference-${zoning.id}-${toIssueIdToken(parcelId)}`,
          severity: 'error',
          category: 'zoning',
          objectId: zoning.id,
          message: `Zoning district ${zoning.id} references parcel ${parcelId} that does not point back to the zoning district.`
        });
      }
    }

    for (const constraintId of zoning.overlayConstraintIds) {
      if (!constraintsById.has(constraintId)) {
        issues.push({
          id: `invalid-zoning-overlay-constraint-${zoning.id}-${toIssueIdToken(constraintId)}`,
          severity: 'error',
          category: 'zoning',
          objectId: zoning.id,
          message: `Zoning district ${zoning.id} references missing overlay constraint ${constraintId}.`
        });
      }
    }
  }
}

function validateParcelZoning(
  parcel: GeneratedCityForValidation['parcels'][number],
  zoning: ValidationZoningDistrict,
  issues: ValidationIssue[]
): void {
  validateZoningControls(parcel.id, parcel.zoning, issues, zoning);

  if (
    parcel.zoning.zoningDistrictId !== zoning.id ||
    parcel.zoning.zoningCode !== zoning.zoningCode ||
    parcel.zoning.maxHeightMeters !== parcel.maxHeightMeters ||
    parcel.zoning.maxCoverageRatio !== parcel.maxCoverageRatio ||
    parcel.zoning.maxFloorAreaRatio !== parcel.developmentRights.maxFloorAreaRatio ||
    !sameStringSet(parcel.zoning.allowedUses, parcel.allowedUses)
  ) {
    issues.push({
      id: `parcel-zoning-mismatch-${parcel.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Synchronize ${parcel.id} zoning controls with ${zoning.id}.`),
      message: `Parcel ${parcel.id} must carry a zoning snapshot that matches ${zoning.id}.`
    });
  }

  if (parcel.zoning.bufferMeters > Math.max(parcel.size.x, parcel.size.z)) {
    issues.push({
      id: `zoning-buffer-over-parcel-${parcel.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Reduce ${parcel.id} zoning buffer or merge the lot before building.`),
      message: `Parcel ${parcel.id} zoning buffer leaves no buildable depth.`
    });
  }

  const requiredPriority = parcel.zoning.frontageRules.requiredPriority;
  if (
    requiredPriority !== 'any' &&
    !parcel.frontagePriority.some((frontage) => frontage.priority === requiredPriority)
  ) {
    issues.push({
      id: `zoning-frontage-priority-missing-${parcel.id}-${requiredPriority}`,
      severity: 'error',
      category: 'zoning',
      objectId: parcel.id,
      ...createIssueFocus(parcel.center, `Assign ${parcel.id} a ${requiredPriority} frontage or relax the zoning frontage rule.`),
      message: `Parcel ${parcel.id} does not satisfy required ${requiredPriority} zoning frontage.`
    });
  }
}

function validateZoningControls(
  objectId: string,
  controls: ValidationZoningDistrict['controls'],
  issues: ValidationIssue[],
  zoning: ValidationZoningDistrict
): void {
  const setbackValues = [
    controls.minimumSetbacks.frontMeters,
    controls.minimumSetbacks.sideMeters,
    controls.minimumSetbacks.rearMeters
  ];

  if (
    controls.zoningDistrictId !== zoning.id ||
    controls.allowedUses.length === 0 ||
    controls.maxHeightMeters <= 0 ||
    controls.maxFloorAreaRatio <= 0 ||
    controls.maxCoverageRatio <= 0 ||
    controls.maxCoverageRatio > 1 ||
    controls.bufferMeters < 0 ||
    controls.density.targetFloorAreaRatio <= 0 ||
    setbackValues.some((value) => value < 0 || !Number.isFinite(value))
  ) {
    issues.push({
      id: `invalid-zoning-controls-${toIssueIdToken(objectId)}`,
      severity: 'error',
      category: 'zoning',
      objectId,
      message: `Zoning controls for ${objectId} must define allowed uses, height, FAR, coverage, setbacks, buffers, and density targets.`
    });
  }
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function validateAdministrativeBoundaries(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const boundaryKinds = new Set<ValidationAdministrativeBoundary['boundaryKind']>();
  const boundariesById = new Map(city.administrativeBoundaries.map((boundary) => [boundary.id, boundary]));

  for (const boundary of city.administrativeBoundaries) {
    boundaryKinds.add(boundary.boundaryKind);

    if (!(CITY_ADMINISTRATIVE_BOUNDARY_KINDS as readonly string[]).includes(boundary.boundaryKind)) {
      issues.push(createAdministrativeBoundaryIssue(boundary, 'invalid-kind', `Administrative boundary ${boundary.id} has unknown kind ${boundary.boundaryKind}.`));
    }

    if (boundary.boundary.length < 4) {
      issues.push(createAdministrativeBoundaryIssue(boundary, 'invalid-boundary', `Administrative boundary ${boundary.id} must expose a polygon boundary with at least four points.`));
    }

    if (!Number.isFinite(boundary.center.x) || !Number.isFinite(boundary.center.z)) {
      issues.push(createAdministrativeBoundaryIssue(boundary, 'invalid-center', `Administrative boundary ${boundary.id} must expose a finite center point.`));
    }

    if (boundary.boundaryKind !== 'city-limit' && !boundary.parentId) {
      issues.push(createAdministrativeBoundaryIssue(boundary, 'missing-parent', `Administrative boundary ${boundary.id} must be parented to the city limit or a containing boundary.`));
    }

    for (const districtId of boundary.districtIds) {
      const district = city.objectIndex.objectsById[districtId];

      if (!district || district.kind !== 'district') {
        issues.push(createAdministrativeBoundaryIssue(boundary, `missing-district-${toIssueIdToken(districtId)}`, `Administrative boundary ${boundary.id} references missing district ${districtId}.`));
      }
    }

    for (const blockId of boundary.blockIds) {
      const block = city.objectIndex.objectsById[blockId];

      if (!block || block.kind !== 'block') {
        issues.push(createAdministrativeBoundaryIssue(boundary, `missing-block-${toIssueIdToken(blockId)}`, `Administrative boundary ${boundary.id} references missing block ${blockId}.`));
      }
    }

    for (const parcelId of boundary.parcelIds) {
      const parcel = city.objectIndex.objectsById[parcelId];

      if (!parcel || parcel.kind !== 'parcel') {
        issues.push(createAdministrativeBoundaryIssue(boundary, `missing-parcel-${toIssueIdToken(parcelId)}`, `Administrative boundary ${boundary.id} references missing parcel ${parcelId}.`));
      }
    }
  }

  for (const requiredKind of CITY_ADMINISTRATIVE_BOUNDARY_KINDS) {
    if (!boundaryKinds.has(requiredKind)) {
      issues.push({
        id: `missing-administrative-boundary-${requiredKind}`,
        severity: 'error',
        category: 'land',
        objectId: `administrative-boundary-${requiredKind}`,
        message: `Administrative boundary kind ${requiredKind} must exist.`
      });
    }
  }

  for (const block of city.blocks) {
    validateLandObjectBoundaryMembership(block, block.center, boundariesById, issues);
  }

  for (const parcel of city.parcels) {
    validateLandObjectBoundaryMembership(parcel, parcel.center, boundariesById, issues);
  }
}

function validateLandObjectBoundaryMembership(
  object: ValidationBlock | GeneratedCityForValidation['parcels'][number],
  point: Point2D,
  boundariesById: ReadonlyMap<string, ValidationAdministrativeBoundary>,
  issues: ValidationIssue[]
): void {
  if (object.administrativeBoundaryIds.length === 0) {
    issues.push({
      id: `missing-administrative-boundaries-${object.id}`,
      severity: 'error',
      category: 'land',
      objectId: object.id,
      affectedPoint: point,
      suggestedFix: `Assign ${object.id} to city-limit, ward, neighborhood, and applicable service or jurisdiction boundaries.`,
      message: `${object.kind} ${object.id} must belong to at least one administrative boundary.`
    });
  }

  validateRequiredBoundaryReference(object, point, boundariesById, object.wardId, 'ward', issues);
  validateRequiredBoundaryReference(object, point, boundariesById, object.neighborhoodId, 'neighborhood', issues);

  for (const boundaryId of object.administrativeBoundaryIds) {
    const boundary = boundariesById.get(boundaryId);

    if (!boundary) {
      issues.push({
        id: `missing-administrative-boundary-reference-${toIssueIdToken(boundaryId)}-${object.id}`,
        severity: 'error',
        category: 'land',
        objectId: object.id,
        affectedPoint: point,
        suggestedFix: `Remove ${boundaryId} from ${object.id} or generate the referenced administrative boundary.`,
        message: `${object.kind} ${object.id} references missing administrative boundary ${boundaryId}.`
      });
      continue;
    }

    if (!isPointInsidePolygon(point, boundary.boundary)) {
      issues.push({
        id: `administrative-boundary-membership-outside-${toIssueIdToken(boundaryId)}-${object.id}`,
        severity: 'error',
        category: 'land',
        objectId: object.id,
        affectedPoint: point,
        affectedBoundary: boundary.boundary,
        suggestedFix: `Recompute administrative memberships for ${object.id} from its center point.`,
        message: `${object.kind} ${object.id} is assigned to ${boundaryId} but its center is outside the boundary.`
      });
    }
  }
}

function validateRequiredBoundaryReference(
  object: ValidationBlock | GeneratedCityForValidation['parcels'][number],
  point: Point2D,
  boundariesById: ReadonlyMap<string, ValidationAdministrativeBoundary>,
  boundaryId: string,
  boundaryKind: ValidationAdministrativeBoundary['boundaryKind'],
  issues: ValidationIssue[]
): void {
  const boundary = boundariesById.get(boundaryId);

  if (!boundary || boundary.boundaryKind !== boundaryKind || !object.administrativeBoundaryIds.includes(boundaryId)) {
    issues.push({
      id: `invalid-${boundaryKind}-membership-${object.id}`,
      severity: 'error',
      category: 'land',
      objectId: object.id,
      affectedPoint: point,
      suggestedFix: `Regenerate ${object.id} ${boundaryKind} membership from administrative boundary overlays.`,
      message: `${object.kind} ${object.id} must reference an existing ${boundaryKind} in administrativeBoundaryIds.`
    });
  }
}

function createAdministrativeBoundaryIssue(
  boundary: ValidationAdministrativeBoundary,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `administrative-boundary-${issueIdSuffix}-${toIssueIdToken(boundary.id)}`,
    severity: 'error',
    category: 'land',
    objectId: boundary.id,
    affectedPoint: boundary.center,
    affectedBoundary: boundary.boundary,
    suggestedFix: `Regenerate ${boundary.id} from deterministic land administrative boundary rules.`,
    message
  };
}

function validateGeospatialFrame(geospatial: GeospatialFrame, issues: ValidationIssue[]): void {
  if (geospatial.unit !== 'meter' || geospatial.coordinateSystem !== 'local-xz') {
    issues.push({
      id: 'invalid-geospatial-frame-units',
      severity: 'error',
      category: 'geometry',
      message: 'Geospatial frame must use local x/z meter coordinates.'
    });
  }

  if (
    geospatial.axisMapping.x !== 'local-east-west' ||
    geospatial.axisMapping.y !== 'local-up' ||
    geospatial.axisMapping.z !== 'local-north-south'
  ) {
    issues.push({
      id: 'invalid-geospatial-axis-mapping',
      severity: 'error',
      category: 'geometry',
      message: 'Geospatial axis mapping must keep x/z horizontal and y vertical.'
    });
  }

  if (
    !isFiniteNumber(geospatial.origin.x) ||
    !isFiniteNumber(geospatial.origin.y) ||
    !isFiniteNumber(geospatial.origin.z)
  ) {
    issues.push({
      id: 'invalid-geospatial-origin',
      severity: 'error',
      category: 'geometry',
      message: 'Geospatial origin must use finite local x/y/z meter coordinates.'
    });
  }

  if (
    geospatial.heightDatum.id !== 'local-ground-plane' ||
    geospatial.heightDatum.verticalUnit !== 'meter' ||
    !isFiniteNumber(geospatial.heightDatum.groundElevationMeters) ||
    !isFiniteNumber(geospatial.heightDatum.minElevationMeters) ||
    !isFiniteNumber(geospatial.heightDatum.maxElevationMeters) ||
    geospatial.heightDatum.minElevationMeters >= geospatial.heightDatum.maxElevationMeters
  ) {
    issues.push({
      id: 'invalid-geospatial-height-datum',
      severity: 'error',
      category: 'geometry',
      message: 'Height datum must define a local meter ground plane with finite min/max elevations.'
    });
  }

  if (
    geospatial.precision.coordinatePrecisionMeters <= 0 ||
    geospatial.precision.horizontalToleranceMeters < geospatial.precision.coordinatePrecisionMeters ||
    geospatial.precision.verticalToleranceMeters < geospatial.precision.coordinatePrecisionMeters
  ) {
    issues.push({
      id: 'invalid-geospatial-precision',
      severity: 'error',
      category: 'geometry',
      message: 'Geospatial precision and tolerances must be positive meter values.'
    });
  }

  if (
    !isFiniteNumber(geospatial.localBounds.minX) ||
    !isFiniteNumber(geospatial.localBounds.maxX) ||
    !isFiniteNumber(geospatial.localBounds.minZ) ||
    !isFiniteNumber(geospatial.localBounds.maxZ) ||
    geospatial.localBounds.minX >= geospatial.localBounds.maxX ||
    geospatial.localBounds.minZ >= geospatial.localBounds.maxZ
  ) {
    issues.push({
      id: 'invalid-geospatial-local-bounds',
      severity: 'error',
      category: 'geometry',
      message: 'Local coordinate bounds must be finite and increasing on x and z.'
    });
  }

  if (geospatial.importProjection.expectedUnit !== 'meter' || geospatial.importProjection.supportedAuthorities.length === 0) {
    issues.push({
      id: 'invalid-geospatial-import-projection',
      severity: 'error',
      category: 'geometry',
      message: 'Import projection metadata must declare meter units and at least one supported authority.'
    });
  }
}

function validateGeneratedCoordinates(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  for (const district of city.districts) {
    validatePolygon2D(city.geospatial, district.id, 'boundary', district.boundary, issues);
  }

  for (const administrativeBoundary of city.administrativeBoundaries) {
    validatePoint2D(city.geospatial, administrativeBoundary.id, 'center', administrativeBoundary.center, issues);
    validatePolygon2D(city.geospatial, administrativeBoundary.id, 'boundary', administrativeBoundary.boundary, issues);
  }

  for (const constraint of city.constraints) {
    validatePolygon2D(city.geospatial, constraint.id, 'boundary', constraint.boundary, issues);
  }

  for (const goal of city.resilienceGoals) {
    validatePoint2D(city.geospatial, goal.id, 'focusPoint', goal.focusPoint, issues);

    if (goal.focusBoundary) {
      validatePolygon2D(city.geospatial, goal.id, 'focusBoundary', goal.focusBoundary, issues);
    }
  }

  for (const metric of city.cityMetrics) {
    validatePoint2D(city.geospatial, metric.id, 'focusPoint', metric.focusPoint, issues);
  }

  for (const block of city.blocks) {
    validatePoint2D(city.geospatial, block.id, 'center', block.center, issues);
    validatePolygon2D(city.geospatial, block.id, 'boundary', block.boundary, issues);
  }

  for (const road of city.roads) {
    validatePoint2D(city.geospatial, road.id, 'center', road.center, issues);
    validatePolyline2D(city.geospatial, road.id, 'centerline', road.centerline, issues);
  }

  for (const intersection of city.intersections) {
    validatePoint2D(city.geospatial, intersection.id, 'center', intersection.center, issues);
  }

  for (const crossing of city.crossings) {
    validatePoint2D(city.geospatial, crossing.id, 'center', crossing.center, issues);
  }

  for (const curbZone of city.curbZones) {
    validatePoint2D(city.geospatial, curbZone.id, 'center', curbZone.center, issues);
  }

  for (const node of city.sidewalkGraph.nodes) {
    validatePoint2D(city.geospatial, node.id, 'position', node.position, issues);
  }

  for (const parcel of city.parcels) {
    validatePoint2D(city.geospatial, parcel.id, 'center', parcel.center, issues);
    validatePolygon2D(city.geospatial, parcel.id, 'boundary', parcel.boundary, issues);
  }

  for (const building of city.buildings) {
    validatePoint2D(city.geospatial, building.id, 'center', building.center, issues);
    validatePolygon2D(city.geospatial, building.id, 'footprint', building.footprint, issues);
    validateHeightValue(city.geospatial, building.id, 'heightMeters', building.heightMeters, issues);
  }

  for (const activeFrontage of city.activeFrontages) {
    validatePoint2D(city.geospatial, activeFrontage.id, 'position', activeFrontage.position, issues);
    validateHeightValue(city.geospatial, activeFrontage.id, 'heightMeters', activeFrontage.heightMeters, issues);
  }

  for (const slice of city.verticalSlices) {
    validatePoint3D(city.geospatial, slice.id, 'cameraTarget', slice.cameraTarget, issues);
    validatePoint3D(city.geospatial, slice.id, 'cameraPosition', slice.cameraPosition, issues);
  }

  for (const park of city.parks) {
    validatePoint2D(city.geospatial, park.id, 'center', park.center, issues);
    validatePolygon2D(city.geospatial, park.id, 'boundary', park.boundary, issues);
  }

  for (const waterway of city.waterways) {
    validatePoint2D(city.geospatial, waterway.id, 'center', waterway.center, issues);
    validatePolygon2D(city.geospatial, waterway.id, 'boundary', waterway.boundary, issues);
    for (const edgeSegment of waterway.edgeSegments) {
      validatePolyline2D(city.geospatial, waterway.id, `${edgeSegment.id}-centerline`, edgeSegment.centerline, issues);
    }
    for (const channel of waterway.channels) {
      validatePolyline2D(city.geospatial, waterway.id, `${channel.id}-centerline`, channel.centerline, issues);
    }
    for (const crossing of waterway.crossingRefs) {
      validatePoint2D(city.geospatial, waterway.id, `${crossing.id}-center`, crossing.center, issues);
    }
    for (const culvert of waterway.culverts) {
      validatePoint2D(city.geospatial, waterway.id, `${culvert.id}-center`, culvert.center, issues);
    }
    for (const dock of waterway.docks) {
      validatePoint2D(city.geospatial, waterway.id, `${dock.id}-center`, dock.center, issues);
    }
    for (const outfall of waterway.outfalls) {
      validatePoint2D(city.geospatial, waterway.id, `${outfall.id}-center`, outfall.center, issues);
    }
  }

  for (const waterfrontEdge of city.waterfrontEdges) {
    validatePoint2D(city.geospatial, waterfrontEdge.id, 'center', waterfrontEdge.center, issues);
    validatePolygon2D(city.geospatial, waterfrontEdge.id, 'boundary', waterfrontEdge.boundary, issues);
    validatePolyline2D(city.geospatial, waterfrontEdge.id, 'centerline', waterfrontEdge.centerline, issues);
    if (waterfrontEdge.publicAccessPoint) {
      validatePoint2D(city.geospatial, waterfrontEdge.id, 'publicAccessPoint', waterfrontEdge.publicAccessPoint, issues);
    }
    validateHeightValue(city.geospatial, waterfrontEdge.id, 'elevationMeters', waterfrontEdge.elevationMeters, issues);
    if (waterfrontEdge.floodProtection.crestElevationMeters !== undefined) {
      validateHeightValue(
        city.geospatial,
        waterfrontEdge.id,
        'floodProtection.crestElevationMeters',
        waterfrontEdge.floodProtection.crestElevationMeters,
        issues
      );
    }
  }

  for (const hazardZone of city.hazardZones) {
    validatePoint2D(city.geospatial, hazardZone.id, 'focusPoint', hazardZone.focusPoint, issues);
    validatePolygon2D(city.geospatial, hazardZone.id, 'boundary', hazardZone.boundary, issues);
  }

  for (const tree of city.trees) {
    validatePoint2D(city.geospatial, tree.id, 'center', tree.center, issues);
    validateHeightValue(city.geospatial, tree.id, 'height', tree.height, issues);
  }

  for (const streetLight of city.streetLights) {
    validatePoint2D(city.geospatial, streetLight.id, 'position', streetLight.position, issues);
    validateHeightValue(city.geospatial, streetLight.id, 'heightMeters', streetLight.heightMeters, issues);
  }

  for (const streetFurniture of city.streetFurniture) {
    validatePoint2D(city.geospatial, streetFurniture.id, 'position', streetFurniture.position, issues);
    validateHeightValue(city.geospatial, streetFurniture.id, 'heightMeters', streetFurniture.dimensions.heightMeters, issues);
  }
}

function validateDistrictCharacter(
  district: ValidationDistrict,
  districts: readonly ValidationDistrict[],
  issues: ValidationIssue[]
): void {
  const [minHeight, maxHeight] = district.heightRangeMeters;

  if (!isFiniteNumber(minHeight) || !isFiniteNumber(maxHeight) || minHeight <= 0 || maxHeight < minHeight) {
    issues.push({
      id: `invalid-district-height-range-${district.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: district.id,
      message: `District ${district.id} must define a positive increasing height range.`
    });
  }

  const useMix = Array.isArray(district.useMix) ? district.useMix : [];
  const useMixTotal = useMix.reduce((sum, rule) => sum + rule.share, 0);
  const useMixUses = new Set(useMix.map((rule) => rule.use));
  const hasInvalidUseMixRule =
    useMix.length === 0 ||
    useMix.some((rule) => !isFiniteNumber(rule.share) || rule.share <= 0 || rule.share > 1) ||
    useMixUses.size !== useMix.length ||
    useMixTotal < 0.98 ||
    useMixTotal > 1.02;

  if (hasInvalidUseMixRule) {
    issues.push({
      id: `invalid-district-use-mix-${district.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: district.id,
      message: `District ${district.id} use mix must contain unique positive shares totaling 1.0.`
    });
  }

  for (const primaryUse of district.primaryUses) {
    if (!useMixUses.has(primaryUse)) {
      issues.push({
        id: `district-primary-use-not-in-mix-${district.id}-${primaryUse}`,
        severity: 'error',
        category: 'zoning',
        objectId: district.id,
        message: `District ${district.id} primary use ${primaryUse} must be represented in the use mix.`
      });
    }
  }

  const streetProfileIds = new Set<string>(DEFAULT_STREET_PROFILES.map((profile) => profile.id));
  for (const profileId of district.allowedStreetProfiles) {
    if (!streetProfileIds.has(profileId)) {
      issues.push({
        id: `invalid-district-street-profile-${district.id}-${profileId}`,
        severity: 'error',
        category: 'zoning',
        objectId: district.id,
        message: `District ${district.id} references unknown street profile ${profileId}.`
      });
    }
  }

  const gradient = district.densityGradient;
  if (
    !gradient ||
    !gradient.centerId ||
    !isFiniteNumber(gradient.coreIntensity) ||
    !isFiniteNumber(gradient.edgeIntensity) ||
    gradient.coreIntensity < 0 ||
    gradient.coreIntensity > 1 ||
    gradient.edgeIntensity < 0 ||
    gradient.edgeIntensity > 1 ||
    !isFiniteNumber(gradient.heightMultiplierAtCore) ||
    !isFiniteNumber(gradient.heightMultiplierAtEdge) ||
    gradient.heightMultiplierAtCore <= 0 ||
    gradient.heightMultiplierAtEdge <= 0
  ) {
    issues.push({
      id: `invalid-district-density-gradient-${district.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: district.id,
      message: `District ${district.id} density gradient must reference a center and finite positive multipliers.`
    });
  }

  const landmarkTargets = Array.isArray(district.landmarkTargets) ? district.landmarkTargets : [];
  if (landmarkTargets.length === 0) {
    issues.push({
      id: `invalid-district-landmark-target-${district.id}-missing`,
      severity: 'error',
      category: 'zoning',
      objectId: district.id,
      message: `District ${district.id} must define at least one landmark target.`
    });
  }

  for (const target of landmarkTargets) {
    if (!target.id || !isFiniteNumber(target.targetCount) || target.targetCount <= 0) {
      issues.push({
        id: `invalid-district-landmark-target-${district.id}-${target.id || 'missing'}`,
        severity: 'error',
        category: 'zoning',
        objectId: district.id,
        message: `District ${district.id} landmark targets must have stable ids and positive target counts.`
      });
    }
  }

  const districtIds = new Set(districts.map((candidate) => candidate.id));
  const transitionBuffers = Array.isArray(district.transitionBuffers) ? district.transitionBuffers : [];
  if (transitionBuffers.length === 0) {
    issues.push({
      id: `invalid-district-transition-buffer-${district.id}-missing`,
      severity: 'error',
      category: 'graph',
      objectId: district.id,
      message: `District ${district.id} must define transition buffers to adjacent district types.`
    });
  }

  for (const buffer of transitionBuffers) {
    if (
      buffer.adjacentDistrictId === district.id ||
      !districtIds.has(buffer.adjacentDistrictId) ||
      !isFiniteNumber(buffer.widthBlocks) ||
      buffer.widthBlocks <= 0
    ) {
      issues.push({
        id: `invalid-district-transition-buffer-${district.id}-${buffer.adjacentDistrictId}`,
        severity: 'error',
        category: 'graph',
        objectId: district.id,
        message: `District ${district.id} transition buffers must reference another generated district with positive width.`
      });
    }
  }

  if (
    !district.styleHints ||
    !district.styleHints.materialPalette ||
    !district.styleHints.publicRealmCharacter ||
    !Array.isArray(district.styleHints.preferredMaterialZones) ||
    district.styleHints.preferredMaterialZones.length === 0
  ) {
    issues.push({
      id: `invalid-district-style-hints-${district.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: district.id,
      message: `District ${district.id} style hints must expose a palette, public realm character, and material zones.`
    });
  }
}

function validateDistrictTransitions(
  blocks: readonly ValidationBlock[],
  districts: readonly ValidationDistrict[],
  issues: ValidationIssue[]
): void {
  const districtsById = new Map(districts.map((district) => [district.id, district]));
  const blocksByGrid = new Map(blocks.map((block) => [`${block.grid.x}:${block.grid.z}`, block]));

  for (const block of blocks) {
    for (const neighbor of getRightAndNorthNeighbors(block, blocksByGrid)) {
      if (block.districtId === neighbor.districtId) {
        continue;
      }

      const district = districtsById.get(block.districtId);
      const neighborDistrict = districtsById.get(neighbor.districtId);

      if (
        !district ||
        !neighborDistrict ||
        !hasDistrictTransitionBuffer(district, neighborDistrict.id) ||
        !hasDistrictTransitionBuffer(neighborDistrict, district.id)
      ) {
        issues.push({
          id: `illegal-district-transition-${block.id}-${neighbor.id}`,
          severity: 'error',
          category: 'zoning',
          objectId: block.id,
          ...createIssueFocus(
            block.center,
            `Add reciprocal transition buffers between ${block.districtId} and ${neighbor.districtId}, or change adjacent block district assignments.`
          ),
          message: `Blocks ${block.id} and ${neighbor.id} create an illegal transition between ${block.districtId} and ${neighbor.districtId}.`
        });
      }
    }
  }
}

function getRightAndNorthNeighbors(
  block: ValidationBlock,
  blocksByGrid: ReadonlyMap<string, ValidationBlock>
): readonly ValidationBlock[] {
  return [
    blocksByGrid.get(`${block.grid.x + 1}:${block.grid.z}`),
    blocksByGrid.get(`${block.grid.x}:${block.grid.z + 1}`)
  ].filter((neighbor): neighbor is ValidationBlock => neighbor !== undefined);
}

function hasDistrictTransitionBuffer(district: ValidationDistrict, adjacentDistrictId: string): boolean {
  return Array.isArray(district.transitionBuffers)
    ? district.transitionBuffers.some((buffer) => buffer.adjacentDistrictId === adjacentDistrictId)
    : false;
}

interface ConstraintValidationContext {
  readonly parcelsById: ReadonlyMap<string, GeneratedCityForValidation['parcels'][number]>;
  readonly roadsById: ReadonlyMap<string, GeneratedCityForValidation['roads'][number]>;
}

function validateConstraints(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  context: ConstraintValidationContext
): void {
  const knownObjectKinds = new Set(CITY_OBJECT_KIND_REGISTRY_ENTRIES.map((entry) => entry.kind));

  for (const constraint of city.constraints) {
    validateConstraintShapeAndKinds(constraint, issues, knownObjectKinds);
    validateConstraintReferences(city, constraint, issues);
    validateConstraintMetrics(constraint, issues);
    validateConstraintObjectExclusions(city, constraint, issues);
    validateConstraintSetbacks(city, constraint, issues, context);
    validateConstraintRoadClearances(constraint, issues, context);
    validateConstraintHeightLimit(city, constraint, issues);
  }
}

interface ResilienceGoalValidationContext {
  readonly roadsById: ReadonlyMap<string, GeneratedCityForValidation['roads'][number]>;
}

function validateResilienceGoals(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  context: ResilienceGoalValidationContext
): void {
  for (const goal of city.resilienceGoals) {
    validateResilienceGoalShape(goal, issues);
    validateResilienceGoalReferences(city, goal, issues);
    validateResilienceGoalCoverage(goal, issues);
    validateResilienceRouteReadiness(goal, issues, context);
  }
}

function validateResilienceGoalShape(goal: ValidationResilienceGoal, issues: ValidationIssue[]): void {
  if (!(CITY_RESILIENCE_GOAL_KINDS as readonly string[]).includes(goal.goalKind)) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        `invalid-goal-kind-${toIssueIdToken(goal.goalKind)}`,
        `Resilience goal ${goal.id} uses unknown kind ${goal.goalKind}.`,
        'Use one of the registered resilience goal kinds before generating the city.'
      )
    );
  }

  if (goal.target.minimumCount <= 0 || !Number.isInteger(goal.target.minimumCount)) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'invalid-target-minimum',
        `Resilience goal ${goal.id} must use a positive integer target minimum.`,
        'Regenerate the goal target with a positive minimumCount value.'
      )
    );
  }

  const expectedMetric = getExpectedResilienceMetric(goal.goalKind);
  if (goal.target.metric !== expectedMetric) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'metric-kind-mismatch',
        `Resilience goal ${goal.id} uses metric ${goal.target.metric} for ${goal.goalKind}.`,
        `Use ${expectedMetric} for ${goal.goalKind} goals.`
      )
    );
  }

  if (goal.target.unit !== 'count') {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'invalid-target-unit',
        `Resilience goal ${goal.id} uses unsupported target unit ${goal.target.unit}.`,
        'Use count-based targets until the metric model card adds richer units.'
      )
    );
  }

  if (goal.targetDistrictIds.length === 0) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'missing-target-districts',
        `Resilience goal ${goal.id} must target at least one district.`,
        'Attach the goal to the district IDs that later emergency or flood cards should evaluate.'
      )
    );
  }

  if (!isFiniteNumber(goal.focusPoint.x) || !isFiniteNumber(goal.focusPoint.z)) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'invalid-focus-point',
        `Resilience goal ${goal.id} must expose a finite focus point.`,
        'Regenerate the goal focus from a known road, open space, waterway, or normalized zone.'
      )
    );
  }

  if (!goal.focusBoundary || goal.focusBoundary.length < 4) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'invalid-focus-boundary',
        `Resilience goal ${goal.id} must expose a focus boundary with at least four points.`,
        'Regenerate the resilience focus boundary from deterministic blueprint geometry.'
      )
    );
  }

  if (!Number.isInteger(goal.recoveryPriority) || goal.recoveryPriority <= 0) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'invalid-recovery-priority',
        `Resilience goal ${goal.id} must use a positive integer recovery priority.`,
        'Assign a stable positive recoveryPriority for recovery ordering.'
      )
    );
  }

  if (goal.goalKind === 'climate-adaptation' && goal.adaptationActions.length === 0) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'missing-adaptation-actions',
        `Climate adaptation goal ${goal.id} must list adaptation actions.`,
        'Add explicit adaptation actions so future climate intervention cards can compare baseline and adapted scenarios.'
      )
    );
  }

  if (goal.goalKind === 'continuity' && goal.continuityTargets.length === 0) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'missing-continuity-targets',
        `Continuity goal ${goal.id} must list continuity targets.`,
        'Add continuityTargets so operations and utility cards can evaluate service continuity.'
      )
    );
  }
}

function validateResilienceGoalReferences(
  city: GeneratedCityForValidation,
  goal: ValidationResilienceGoal,
  issues: ValidationIssue[]
): void {
  for (const targetDistrictId of goal.targetDistrictIds) {
    validateResilienceObjectReference(city, goal, targetDistrictId, 'district', 'target-district', issues);
  }

  for (const requiredObjectId of goal.requiredObjectIds) {
    validateResilienceObjectReference(city, goal, requiredObjectId, undefined, 'required-reference', issues);
  }

  for (const relatedObjectId of goal.relatedObjectIds) {
    validateResilienceObjectReference(city, goal, relatedObjectId, undefined, 'related-reference', issues);
  }

  for (const routeRoadId of goal.routeRoadIds) {
    validateResilienceObjectReference(city, goal, routeRoadId, 'road-segment', 'route-road', issues);
  }

  for (const shelterObjectId of goal.shelterObjectIds) {
    const object = city.objectIndex.objectsById[shelterObjectId];

    if (!object) {
      issues.push(
        createResilienceGoalIssue(
          goal,
          `missing-shelter-object-${toIssueIdToken(shelterObjectId)}`,
          `Resilience goal ${goal.id} references missing shelter candidate ${shelterObjectId}.`,
          `Create shelter candidate ${shelterObjectId}, or remove it from ${goal.id}.shelterObjectIds.`
        )
      );
    } else {
      const shelterKind = object.kind as CityObjectKind;

      if (shelterKind === 'park' || shelterKind === 'building' || shelterKind === 'civic-anchor') {
        continue;
      }

      issues.push(
        createResilienceGoalIssue(
          goal,
          `invalid-shelter-kind-${toIssueIdToken(shelterObjectId)}`,
          `Resilience goal ${goal.id} shelter candidate ${shelterObjectId} is ${object.kind}.`,
          'Shelter candidates must currently be parks, buildings, or future civic anchors.'
        )
      );
    }
  }

  for (const constraintId of goal.coveredConstraintIds) {
    validateResilienceObjectReference(city, goal, constraintId, 'constraint', 'covered-constraint', issues);
  }
}

function validateResilienceObjectReference(
  city: GeneratedCityForValidation,
  goal: ValidationResilienceGoal,
  objectId: string,
  expectedKind: CityObjectKind | undefined,
  referenceKind: string,
  issues: ValidationIssue[]
): void {
  const object = city.objectIndex.objectsById[objectId];

  if (!object) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        `missing-${referenceKind}-${toIssueIdToken(objectId)}`,
        `Resilience goal ${goal.id} references missing ${referenceKind} ${objectId}.`,
        `Create ${objectId} before generating ${goal.id}, or remove the stale ${referenceKind}.`
      )
    );
    return;
  }

  if (expectedKind && object.kind !== expectedKind) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        `invalid-${referenceKind}-kind-${toIssueIdToken(objectId)}`,
        `Resilience goal ${goal.id} expected ${objectId} to be ${expectedKind}, found ${object.kind}.`,
        `Update ${goal.id}.${referenceKind} references so they point to ${expectedKind} objects.`
      )
    );
  }
}

function validateResilienceGoalCoverage(goal: ValidationResilienceGoal, issues: ValidationIssue[]): void {
  const coverageCount = getResilienceCoverageCount(goal);

  if (coverageCount < goal.target.minimumCount) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'coverage-gap',
        `Resilience goal ${goal.id} has coverage ${coverageCount}, below target ${goal.target.minimumCount}.`,
        `Add ${goal.target.metric} references or lower the explicit target for ${goal.id}.`
      )
    );
  }
}

function validateResilienceRouteReadiness(
  goal: ValidationResilienceGoal,
  issues: ValidationIssue[],
  context: ResilienceGoalValidationContext
): void {
  if (
    goal.goalKind !== 'redundancy' &&
    goal.goalKind !== 'evacuation-route' &&
    goal.goalKind !== 'emergency-access'
  ) {
    return;
  }

  if (goal.routeRoadIds.length === 0) {
    issues.push(
      createResilienceGoalIssue(
        goal,
        'missing-route-roads',
        `Resilience goal ${goal.id} must identify route roads.`,
        'Add routeRoadIds so later routing and emergency cards can consume this goal.'
      )
    );
    return;
  }

  for (const roadId of goal.routeRoadIds) {
    const road = context.roadsById.get(roadId);

    if (!road) {
      continue;
    }

    if (!road.lanes.some((lane) => lane.allowedModes.includes('emergency'))) {
      issues.push(
        createResilienceGoalIssue(
          goal,
          `route-road-without-emergency-mode-${toIssueIdToken(road.id)}`,
          `Resilience route road ${road.id} has no emergency-capable lane.`,
          `Add emergency mode to at least one lane on ${road.id}.`
        )
      );
    }
  }
}

function getExpectedResilienceMetric(goalKind: ValidationResilienceGoal['goalKind']): ValidationResilienceGoal['target']['metric'] {
  switch (goalKind) {
    case 'redundancy':
      return 'redundant-corridor-count';
    case 'climate-adaptation':
      return 'adaptation-constraint-count';
    case 'evacuation-route':
      return 'evacuation-route-count';
    case 'emergency-access':
      return 'emergency-access-corridor-count';
    case 'continuity':
      return 'continuity-system-count';
    case 'shelter':
      return 'shelter-candidate-count';
    case 'recovery-priority':
      return 'recovery-anchor-count';
    default:
      return 'recovery-anchor-count';
  }
}

function getResilienceCoverageCount(goal: ValidationResilienceGoal): number {
  switch (goal.target.metric) {
    case 'adaptation-constraint-count':
      return goal.coveredConstraintIds.length;
    case 'continuity-system-count':
      return goal.continuityTargets.length;
    case 'emergency-access-corridor-count':
    case 'evacuation-route-count':
    case 'redundant-corridor-count':
      return goal.routeRoadIds.length;
    case 'recovery-anchor-count':
      return new Set([...goal.relatedObjectIds, ...goal.shelterObjectIds]).size;
    case 'shelter-candidate-count':
      return goal.shelterObjectIds.length;
    default:
      return 0;
  }
}

function createResilienceGoalIssue(
  goal: ValidationResilienceGoal,
  issueIdSuffix: string,
  message: string,
  suggestedFix: string
): ValidationIssue {
  return {
    id: `resilience-${issueIdSuffix}-${toIssueIdToken(goal.id)}`,
    severity: 'error',
    category: 'resilience',
    objectId: goal.id,
    affectedPoint: goal.focusPoint,
    affectedBoundary: goal.focusBoundary,
    suggestedFix,
    message
  };
}

function validateCityMetrics(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const metricKinds = new Set<ValidationCityMetric['metricKind']>();

  for (const metric of city.cityMetrics) {
    metricKinds.add(metric.metricKind);
    validateCityMetricShape(metric, issues);
    validateCityMetricReferences(city, metric, issues);
  }

  for (const requiredKind of CITY_METRIC_KINDS) {
    if (!metricKinds.has(requiredKind)) {
      issues.push({
        id: `missing-city-metric-${requiredKind}`,
        severity: 'error',
        category: 'metrics',
        objectId: `city-metric-${requiredKind}`,
        message: `City metric ${requiredKind} must be computed after generation.`
      });
    }
  }
}

function validateWaterways(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const waterwayIds = new Set(city.waterways.map((waterway) => waterway.id));

  for (const waterway of city.waterways) {
    const edgeSegmentIds = new Set<string>();

    if (waterway.length <= 0 || waterway.width <= 0) {
      issues.push(createWaterwayIssue(waterway, 'invalid-dimensions', 'Waterways must have positive length and width.'));
    }

    if (waterway.edgeSegments.length === 0) {
      issues.push(createWaterwayIssue(waterway, 'missing-edge-segments', 'Waterways must expose edge segments for continuity checks.'));
    }

    for (const edgeSegment of waterway.edgeSegments) {
      if (edgeSegmentIds.has(edgeSegment.id)) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `duplicate-edge-${toIssueIdToken(edgeSegment.id)}`,
            `Waterway edge segment ${edgeSegment.id} is duplicated.`
          )
        );
      }
      edgeSegmentIds.add(edgeSegment.id);

      if (edgeSegment.lengthMeters <= 0 || edgeSegment.centerline.length < 2) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `invalid-edge-${toIssueIdToken(edgeSegment.id)}`,
            `Waterway edge segment ${edgeSegment.id} must have positive length and a centerline.`
          )
        );
      }

      for (const connectedSegmentId of edgeSegment.connectedSegmentIds) {
        if (!waterway.edgeSegments.some((candidate) => candidate.id === connectedSegmentId)) {
          issues.push(
            createWaterwayIssue(
              waterway,
              `missing-edge-connection-${toIssueIdToken(edgeSegment.id)}-${toIssueIdToken(connectedSegmentId)}`,
              `Waterway edge segment ${edgeSegment.id} references missing connected segment ${connectedSegmentId}.`
            )
          );
        }
      }

      for (const districtId of edgeSegment.districtIds) {
        if (!hasObjectId(city, districtId)) {
          issues.push(
            createWaterwayIssue(
              waterway,
              `missing-edge-district-${toIssueIdToken(edgeSegment.id)}-${toIssueIdToken(districtId)}`,
              `Waterway edge segment ${edgeSegment.id} references missing district ${districtId}.`
            )
          );
        }
      }
    }

    for (const side of ['north', 'south'] as const) {
      if (!isWaterwayEdgeSideConnected(waterway, side)) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `disconnected-${side}-edge`,
            `Waterway ${waterway.id} must have a continuous ${side} edge segment chain.`
          )
        );
      }
    }

    for (const channel of waterway.channels) {
      if (channel.widthMeters <= 0 || channel.centerline.length < 2) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `invalid-channel-${toIssueIdToken(channel.id)}`,
            `Waterway channel ${channel.id} must have positive width and a centerline.`
          )
        );
      }

      for (const edgeSegmentId of channel.connectsToEdgeSegmentIds) {
        validateWaterwayEdgeReference(waterway, edgeSegmentIds, channel.id, edgeSegmentId, 'channel', issues);
      }
    }

    for (const crossing of waterway.crossingRefs) {
      if (!hasObjectId(city, crossing.roadId)) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `missing-crossing-road-${toIssueIdToken(crossing.id)}-${toIssueIdToken(crossing.roadId)}`,
            `Waterway crossing ${crossing.id} references missing road ${crossing.roadId}.`
          )
        );
      }
      if (crossing.clearanceMeters <= 0) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `invalid-crossing-clearance-${toIssueIdToken(crossing.id)}`,
            `Waterway crossing ${crossing.id} must have positive clearance.`
          )
        );
      }
      for (const edgeSegmentId of crossing.edgeSegmentIds) {
        validateWaterwayEdgeReference(waterway, edgeSegmentIds, crossing.id, edgeSegmentId, 'crossing', issues);
      }
    }

    for (const culvert of waterway.culverts) {
      if (!hasObjectId(city, culvert.roadId)) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `missing-culvert-road-${toIssueIdToken(culvert.id)}-${toIssueIdToken(culvert.roadId)}`,
            `Waterway culvert ${culvert.id} references missing road ${culvert.roadId}.`
          )
        );
      }
      if (culvert.diameterMeters <= 0) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `invalid-culvert-diameter-${toIssueIdToken(culvert.id)}`,
            `Waterway culvert ${culvert.id} must have positive diameter.`
          )
        );
      }
      validateWaterwayEdgeReference(waterway, edgeSegmentIds, culvert.id, culvert.inletEdgeSegmentId, 'culvert', issues);
      validateWaterwayEdgeReference(waterway, edgeSegmentIds, culvert.id, culvert.outletEdgeSegmentId, 'culvert', issues);
      for (const outfallId of culvert.outfallIds) {
        if (!waterway.outfalls.some((outfall) => outfall.id === outfallId)) {
          issues.push(
            createWaterwayIssue(
              waterway,
              `missing-culvert-outfall-${toIssueIdToken(culvert.id)}-${toIssueIdToken(outfallId)}`,
              `Waterway culvert ${culvert.id} references missing outfall ${outfallId}.`
            )
          );
        }
      }
    }

    for (const dock of waterway.docks) {
      validateWaterwayEdgeReference(waterway, edgeSegmentIds, dock.id, dock.edgeSegmentId, 'dock', issues);
      if (dock.lengthMeters <= 0 || dock.widthMeters <= 0) {
        issues.push(createWaterwayIssue(waterway, `invalid-dock-${toIssueIdToken(dock.id)}`, `Waterway dock ${dock.id} must have positive dimensions.`));
      }
      if (dock.accessRoadId && !hasObjectId(city, dock.accessRoadId)) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `missing-dock-road-${toIssueIdToken(dock.id)}-${toIssueIdToken(dock.accessRoadId)}`,
            `Waterway dock ${dock.id} references missing access road ${dock.accessRoadId}.`
          )
        );
      }
    }

    for (const outfall of waterway.outfalls) {
      validateWaterwayEdgeReference(waterway, edgeSegmentIds, outfall.id, outfall.edgeSegmentId, 'outfall', issues);
      if (!waterwayIds.has(outfall.receivingWaterwayId)) {
        issues.push(
          createWaterwayIssue(
            waterway,
            `missing-outfall-waterway-${toIssueIdToken(outfall.id)}-${toIssueIdToken(outfall.receivingWaterwayId)}`,
            `Waterway outfall ${outfall.id} references missing receiving waterway ${outfall.receivingWaterwayId}.`
          )
        );
      }
      if (outfall.diameterMeters <= 0) {
        issues.push(createWaterwayIssue(waterway, `invalid-outfall-${toIssueIdToken(outfall.id)}`, `Waterway outfall ${outfall.id} must have positive diameter.`));
      }
    }
  }
}

function validateWaterwayEdgeReference(
  waterway: ValidationWaterway,
  edgeSegmentIds: ReadonlySet<string>,
  componentId: string,
  edgeSegmentId: string,
  componentKind: string,
  issues: ValidationIssue[]
): void {
  if (!edgeSegmentIds.has(edgeSegmentId)) {
    issues.push(
      createWaterwayIssue(
        waterway,
        `missing-${componentKind}-edge-${toIssueIdToken(componentId)}-${toIssueIdToken(edgeSegmentId)}`,
        `Waterway ${componentKind} ${componentId} references missing edge segment ${edgeSegmentId}.`
      )
    );
  }
}

function isWaterwayEdgeSideConnected(waterway: ValidationWaterway, side: 'north' | 'south'): boolean {
  const sideSegments = waterway.edgeSegments.filter((segment) => segment.side === side);

  if (sideSegments.length === 0) {
    return false;
  }

  const sideSegmentIds = new Set(sideSegments.map((segment) => segment.id));
  const visited = new Set<string>();
  const queue = [sideSegments[0].id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const segment = sideSegments.find((candidate) => candidate.id === currentId);

    if (!segment || visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);
    for (const connectedSegmentId of segment.connectedSegmentIds) {
      if (sideSegmentIds.has(connectedSegmentId) && !visited.has(connectedSegmentId)) {
        queue.push(connectedSegmentId);
      }
    }
  }

  return visited.size === sideSegments.length;
}

function createWaterwayIssue(
  waterway: ValidationWaterway,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `waterway-${issueIdSuffix}-${toIssueIdToken(waterway.id)}`,
    severity: 'error',
    category: 'land',
    objectId: waterway.id,
    ...createIssueFocus(waterway.center, `Regenerate ${waterway.id} waterway edges, crossings, docks, culverts, and outfalls from current road and land data.`),
    message
  };
}

function validateWaterfrontEdges(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  for (const edge of city.waterfrontEdges) {
    const waterway = city.waterways.find((candidate) => candidate.id === edge.waterwayId);

    if (!waterway || edge.parentId !== edge.waterwayId) {
      issues.push(
        createWaterfrontIssue(
          edge,
          'missing-waterway',
          `Waterfront edge ${edge.id} must be parented to existing waterway ${edge.waterwayId}.`
        )
      );
      continue;
    }

    if (edge.lengthMeters <= 0 || edge.widthMeters <= 0) {
      issues.push(
        createWaterfrontIssue(edge, 'invalid-dimensions', `Waterfront edge ${edge.id} must have positive length and width.`)
      );
    }

    if (edge.publicAccess && !edge.publicAccessPoint) {
      issues.push(
        createWaterfrontIssue(
          edge,
          'missing-public-access-point',
          `Public waterfront edge ${edge.id} must expose a public access point.`
        )
      );
    }

    if (!edge.publicAccess && edge.waterfrontKind === 'public-access') {
      issues.push(
        createWaterfrontIssue(edge, 'inaccessible-public-access', `Waterfront public access edge ${edge.id} must be public.`)
      );
    }

    if (edge.waterfrontKind === 'flood-wall' && edge.floodProtection.kind !== 'flood-wall') {
      issues.push(
        createWaterfrontIssue(edge, 'missing-flood-wall-protection', `Flood wall edge ${edge.id} must expose flood-wall protection.`)
      );
    }

    if (edge.waterfrontKind !== 'flood-wall' && edge.floodProtection.kind === 'flood-wall') {
      issues.push(
        createWaterfrontIssue(edge, 'unexpected-flood-wall-protection', `Only flood wall edges should expose flood-wall protection.`)
      );
    }

    if (edge.waterwayEdgeSegmentId && !waterway.edgeSegments.some((segment) => segment.id === edge.waterwayEdgeSegmentId)) {
      issues.push(
        createWaterfrontIssue(
          edge,
          `missing-waterway-edge-${toIssueIdToken(edge.waterwayEdgeSegmentId)}`,
          `Waterfront edge ${edge.id} references missing waterway edge segment ${edge.waterwayEdgeSegmentId}.`
        )
      );
    }

    if (edge.dockId && !waterway.docks.some((dock) => dock.id === edge.dockId)) {
      issues.push(
        createWaterfrontIssue(
          edge,
          `missing-dock-${toIssueIdToken(edge.dockId)}`,
          `Waterfront edge ${edge.id} references missing dock ${edge.dockId}.`
        )
      );
    }

    for (const publicRealmId of edge.connectedPublicRealmIds) {
      if (!hasObjectId(city, publicRealmId)) {
        issues.push(
          createWaterfrontIssue(
            edge,
            `missing-public-realm-${toIssueIdToken(publicRealmId)}`,
            `Waterfront edge ${edge.id} references missing public realm object ${publicRealmId}.`
          )
        );
      }
    }

    for (const roadId of edge.connectedRoadIds) {
      const road = city.objectIndex.objectsById[roadId];

      if (!road || road.kind !== 'road-segment') {
        issues.push(
          createWaterfrontIssue(
            edge,
            `missing-road-${toIssueIdToken(roadId)}`,
            `Waterfront edge ${edge.id} references missing road ${roadId}.`
          )
        );
      }
    }

    for (const componentId of edge.connectedWaterwayComponentIds) {
      if (!hasWaterwayComponent(waterway, componentId)) {
        issues.push(
          createWaterfrontIssue(
            edge,
            `missing-water-component-${toIssueIdToken(componentId)}`,
            `Waterfront edge ${edge.id} references missing waterway component ${componentId}.`
          )
        );
      }
    }
  }
}

function hasWaterwayComponent(waterway: ValidationWaterway, componentId: string): boolean {
  return (
    waterway.id === componentId ||
    waterway.edgeSegments.some((segment) => segment.id === componentId) ||
    waterway.channels.some((channel) => channel.id === componentId) ||
    waterway.crossingRefs.some((crossing) => crossing.id === componentId) ||
    waterway.culverts.some((culvert) => culvert.id === componentId) ||
    waterway.docks.some((dock) => dock.id === componentId) ||
    waterway.outfalls.some((outfall) => outfall.id === componentId)
  );
}

function createWaterfrontIssue(
  edge: ValidationWaterfrontEdge,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `waterfront-${issueIdSuffix}-${toIssueIdToken(edge.id)}`,
    severity: 'error',
    category: 'land',
    objectId: edge.id,
    ...createIssueFocus(
      edge.center,
      `Regenerate ${edge.id} from current waterway edge, dock, public realm, and road references.`
    ),
    message
  };
}

const VALID_HAZARD_MITIGATION_KINDS = [
  'access-control',
  'cooling-canopy',
  'flood-proofing',
  'remediation',
  'setback',
  'slope-stabilization'
] as const satisfies readonly HazardMitigationKind[];

function validateHazardZones(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const knownObjectKinds = new Set(CITY_OBJECT_KIND_REGISTRY_ENTRIES.map((entry) => entry.kind));

  for (const hazard of city.hazardZones) {
    if (!(CITY_HAZARD_ZONE_KINDS as readonly string[]).includes(hazard.hazardKind)) {
      issues.push(createHazardIssue(hazard, 'invalid-kind', `Hazard zone ${hazard.id} uses unknown kind ${hazard.hazardKind}.`));
    }

    if (hazard.boundary.length < 4) {
      issues.push(createHazardIssue(hazard, 'invalid-boundary', `Hazard zone ${hazard.id} must expose a polygon boundary with at least four points.`));
    }

    if (hazard.affectedObjectKinds.length === 0) {
      issues.push(createHazardIssue(hazard, 'missing-affected-kinds', `Hazard zone ${hazard.id} must declare affected object kinds.`));
    }

    for (const objectKind of [...hazard.affectedObjectKinds, ...hazard.prohibitedObjectKinds]) {
      if (!knownObjectKinds.has(objectKind)) {
        issues.push(
          createHazardIssue(
            hazard,
            `unknown-object-kind-${toIssueIdToken(objectKind)}`,
            `Hazard zone ${hazard.id} references unknown object kind ${objectKind}.`
          )
        );
      }
    }

    for (const prohibitedObjectKind of hazard.prohibitedObjectKinds) {
      if (!hazard.affectedObjectKinds.includes(prohibitedObjectKind)) {
        issues.push(
          createHazardIssue(
            hazard,
            `unaffected-prohibited-kind-${toIssueIdToken(prohibitedObjectKind)}`,
            `Hazard zone ${hazard.id} prohibits ${prohibitedObjectKind} without listing it as affected.`
          )
        );
      }
    }

    for (const mitigationKind of hazard.mitigationKinds) {
      if (!(VALID_HAZARD_MITIGATION_KINDS as readonly string[]).includes(mitigationKind)) {
        issues.push(
          createHazardIssue(
            hazard,
            `invalid-mitigation-${toIssueIdToken(mitigationKind)}`,
            `Hazard zone ${hazard.id} uses unknown mitigation ${mitigationKind}.`
          )
        );
      }
    }

    if (hazard.requiresMitigation && hazard.mitigationKinds.length === 0) {
      issues.push(createHazardIssue(hazard, 'missing-mitigation', `Hazard zone ${hazard.id} requires mitigation but lists no mitigation kinds.`));
    }

    validateHazardReferences(city, hazard, issues);
  }
}

function validateHazardReferences(
  city: GeneratedCityForValidation,
  hazard: ValidationHazardZone,
  issues: ValidationIssue[]
): void {
  for (const constraintId of hazard.relatedConstraintIds) {
    validateHazardReference(city, hazard, constraintId, 'constraint', issues);
  }

  for (const waterwayId of hazard.relatedWaterwayIds) {
    validateHazardReference(city, hazard, waterwayId, 'waterway', issues);
  }

  for (const zoningDistrictId of hazard.relatedZoningDistrictIds) {
    validateHazardReference(city, hazard, zoningDistrictId, 'zoning-district', issues);
  }

  for (const roadId of hazard.relatedRoadIds) {
    validateHazardReference(city, hazard, roadId, 'road-segment', issues);
  }
}

function validateHazardReference(
  city: GeneratedCityForValidation,
  hazard: ValidationHazardZone,
  objectId: CityId,
  expectedKind: CityObjectKind,
  issues: ValidationIssue[]
): void {
  const object = city.objectIndex.objectsById[objectId];

  if (!object || object.kind !== expectedKind) {
    issues.push(
      createHazardIssue(
        hazard,
        `missing-${expectedKind}-${toIssueIdToken(objectId)}`,
        `Hazard zone ${hazard.id} references missing ${expectedKind} ${objectId}.`
      )
    );
  }
}

function validateHazardZoneConflicts(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  for (const hazard of city.hazardZones) {
    if (hazard.prohibitedObjectKinds.includes('parcel')) {
      for (const parcel of city.parcels) {
        if (isPointInsidePolygon(parcel.center, hazard.boundary)) {
          issues.push(createHazardConflictIssue(hazard, parcel.id, parcel.center, parcel.boundary));
        }
      }
    }

    if (hazard.prohibitedObjectKinds.includes('building')) {
      for (const building of city.buildings) {
        if (isPointInsidePolygon(building.center, hazard.boundary) || polygonsIntersect(building.footprint, hazard.boundary)) {
          issues.push(createHazardConflictIssue(hazard, building.id, building.center, building.footprint));
        }
      }
    }
  }
}

function createHazardConflictIssue(
  hazard: ValidationHazardZone,
  targetObjectId: CityId,
  affectedPoint: Point2D,
  affectedBoundary: Polygon2D
): ValidationIssue {
  return {
    id: `hazard-conflict-${toIssueIdToken(hazard.id)}-${toIssueIdToken(targetObjectId)}`,
    severity: 'error',
    category: 'land',
    objectId: hazard.id,
    affectedPoint,
    affectedBoundary,
    suggestedFix: `Move ${targetObjectId} outside ${hazard.name ?? hazard.id}, reduce the hazard boundary, or remove ${targetObjectId}'s kind from prohibitedObjectKinds.`,
    message: `${targetObjectId} is inside prohibited hazard zone ${hazard.id}.`
  };
}

function createHazardIssue(
  hazard: ValidationHazardZone,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `hazard-${issueIdSuffix}-${toIssueIdToken(hazard.id)}`,
    severity: 'error',
    category: 'land',
    objectId: hazard.id,
    affectedBoundary: hazard.boundary,
    ...createIssueFocus(hazard.focusPoint, `Regenerate ${hazard.id} from current land, zoning, waterway, and constraint data.`),
    message
  };
}

function validateCityMetricShape(metric: ValidationCityMetric, issues: ValidationIssue[]): void {
  if (!(CITY_METRIC_KINDS as readonly string[]).includes(metric.metricKind)) {
    issues.push(createCityMetricIssue(metric, 'invalid-kind', `City metric ${metric.id} has unknown kind ${metric.metricKind}.`));
  }

  if (!Number.isFinite(metric.value) || metric.value < 0) {
    issues.push(createCityMetricIssue(metric, 'invalid-value', `City metric ${metric.id} must have a finite non-negative value.`));
  }

  if (!Number.isFinite(metric.focusPoint.x) || !Number.isFinite(metric.focusPoint.z)) {
    issues.push(createCityMetricIssue(metric, 'invalid-focus-point', `City metric ${metric.id} must expose a finite focus point.`));
  }

  if (metric.target.min === undefined && metric.target.max === undefined) {
    issues.push(createCityMetricIssue(metric, 'missing-target', `City metric ${metric.id} must define a min or max target.`));
  }

  if (
    (metric.target.min !== undefined && !Number.isFinite(metric.target.min)) ||
    (metric.target.max !== undefined && !Number.isFinite(metric.target.max))
  ) {
    issues.push(createCityMetricIssue(metric, 'invalid-target', `City metric ${metric.id} has an invalid target bound.`));
  }

  if (metric.status === 'pass' && metric.target.min !== undefined && metric.value < metric.target.min) {
    issues.push(createCityMetricIssue(metric, 'status-target-mismatch', `City metric ${metric.id} is passing below its minimum target.`));
  }

  if (metric.status === 'pass' && metric.target.max !== undefined && metric.value > metric.target.max) {
    issues.push(createCityMetricIssue(metric, 'status-target-mismatch', `City metric ${metric.id} is passing above its maximum target.`));
  }

  if (metric.computedFromObjectIds.length === 0) {
    issues.push(createCityMetricIssue(metric, 'missing-inputs', `City metric ${metric.id} must list computedFromObjectIds.`));
  }
}

function validateCityMetricReferences(
  city: GeneratedCityForValidation,
  metric: ValidationCityMetric,
  issues: ValidationIssue[]
): void {
  for (const objectId of metric.computedFromObjectIds) {
    if (!hasObjectId(city, objectId)) {
      issues.push(
        createCityMetricIssue(
          metric,
          `missing-input-${toIssueIdToken(objectId)}`,
          `City metric ${metric.id} references missing input object ${objectId}.`
        )
      );
    }
  }

  for (const metricId of metric.relatedMetricIds) {
    const relatedMetric = city.objectIndex.objectsById[metricId];

    if (!relatedMetric || relatedMetric.kind !== 'city-metric') {
      issues.push(
        createCityMetricIssue(
          metric,
          `missing-related-metric-${toIssueIdToken(metricId)}`,
          `City metric ${metric.id} references missing related metric ${metricId}.`
        )
      );
    }
  }
}

function createCityMetricIssue(metric: ValidationCityMetric, issueIdSuffix: string, message: string): ValidationIssue {
  return {
    id: `city-metric-${issueIdSuffix}-${toIssueIdToken(metric.id)}`,
    severity: 'error',
    category: 'metrics',
    objectId: metric.id,
    affectedPoint: metric.focusPoint,
    suggestedFix: `Regenerate ${metric.id} from current city domain data and metric targets.`,
    message
  };
}

function validateConstraintShapeAndKinds(
  constraint: ValidationConstraint,
  issues: ValidationIssue[],
  knownObjectKinds: ReadonlySet<CityObjectKind>
): void {
  if (!(CITY_CONSTRAINT_KINDS as readonly string[]).includes(constraint.constraintKind)) {
    issues.push(
      createConstraintIssue(
        constraint,
        `invalid-constraint-kind-${toIssueIdToken(constraint.constraintKind)}`,
        'zoning',
        `Constraint ${constraint.id} uses unknown kind ${constraint.constraintKind}.`,
        'Use one of the registered constraint kinds before generating the city.'
      )
    );
  }

  if (constraint.boundary.length < 4) {
    issues.push(
      createConstraintIssue(
        constraint,
        'invalid-boundary',
        'geometry',
        `Constraint ${constraint.id} must expose a polygon boundary with at least four points.`,
        'Regenerate the constraint boundary from a public-space, waterway, road corridor, or city-boundary source.'
      )
    );
  }

  if (constraint.affectedObjectKinds.length === 0) {
    issues.push(
      createConstraintIssue(
        constraint,
        'missing-affected-kinds',
        'zoning',
        `Constraint ${constraint.id} must declare which city object kinds it affects.`,
        'Add affected object kinds so validators and overlays can explain the constraint surface.'
      )
    );
  }

  for (const objectKind of [...constraint.affectedObjectKinds, ...constraint.prohibitedObjectKinds]) {
    if (!knownObjectKinds.has(objectKind)) {
      issues.push(
        createConstraintIssue(
          constraint,
          `unknown-object-kind-${toIssueIdToken(objectKind)}`,
          'identifier',
          `Constraint ${constraint.id} references unknown object kind ${objectKind}.`,
          'Register the object kind or remove it from the constraint rule.'
        )
      );
    }
  }

  for (const prohibitedObjectKind of constraint.prohibitedObjectKinds) {
    if (!constraint.affectedObjectKinds.includes(prohibitedObjectKind)) {
      issues.push(
        createConstraintIssue(
          constraint,
          `prohibited-kind-not-affected-${toIssueIdToken(prohibitedObjectKind)}`,
          'zoning',
          `Constraint ${constraint.id} prohibits ${prohibitedObjectKind} without listing it as affected.`,
          'Include prohibited object kinds in affectedObjectKinds so conflict reporting stays inspectable.'
        )
      );
    }
  }
}

function validateConstraintReferences(
  city: GeneratedCityForValidation,
  constraint: ValidationConstraint,
  issues: ValidationIssue[]
): void {
  for (const requiredObjectId of constraint.requiredObjectIds) {
    if (!hasObjectId(city, requiredObjectId)) {
      issues.push(
        createConstraintIssue(
          constraint,
          `missing-required-reference-${toIssueIdToken(requiredObjectId)}`,
          'identifier',
          `Constraint ${constraint.id} requires missing city object ${requiredObjectId}.`,
          `Create ${requiredObjectId} before generating ${constraint.id}, or remove the stale required reference.`
        )
      );
    }
  }

  for (const relatedObjectId of constraint.relatedObjectIds) {
    if (!hasObjectId(city, relatedObjectId)) {
      issues.push(
        createConstraintIssue(
          constraint,
          `missing-related-reference-${toIssueIdToken(relatedObjectId)}`,
          'identifier',
          `Constraint ${constraint.id} relates to missing city object ${relatedObjectId}.`,
          `Create ${relatedObjectId} before generating ${constraint.id}, or remove the stale related reference.`
        )
      );
    }
  }
}

function validateConstraintMetrics(constraint: ValidationConstraint, issues: ValidationIssue[]): void {
  for (const [metricName, metricValue] of [
    ['minSetbackMeters', constraint.minSetbackMeters],
    ['minClearanceMeters', constraint.minClearanceMeters],
    ['maxHeightMeters', constraint.maxHeightMeters]
  ] as const) {
    if (metricValue !== undefined && (!isFiniteNumber(metricValue) || metricValue <= 0)) {
      issues.push(
        createConstraintIssue(
          constraint,
          `invalid-${metricName}`,
          'zoning',
          `Constraint ${constraint.id} must use a positive finite ${metricName} value.`,
          `Regenerate ${constraint.id}.${metricName} as a positive meter value.`
        )
      );
    }
  }

  if (constraint.constraintKind === 'setback' && constraint.minSetbackMeters === undefined) {
    issues.push(
      createConstraintIssue(
        constraint,
        'missing-setback-distance',
        'zoning',
        `Setback constraint ${constraint.id} must define minSetbackMeters.`,
        'Add a minimum setback distance so building footprints can be validated against parcels.'
      )
    );
  }

  if (requiresClearanceMetric(constraint.constraintKind) && constraint.minClearanceMeters === undefined) {
    issues.push(
      createConstraintIssue(
        constraint,
        'missing-clearance-distance',
        'zoning',
        `Clearance constraint ${constraint.id} must define minClearanceMeters.`,
        'Add a minimum clearance distance so protected road corridors can be validated.'
      )
    );
  }
}

function validateConstraintObjectExclusions(
  city: GeneratedCityForValidation,
  constraint: ValidationConstraint,
  issues: ValidationIssue[]
): void {
  if (constraint.prohibitedObjectKinds.includes('parcel')) {
    for (const parcel of city.parcels) {
      if (isPointInsidePolygon(parcel.center, constraint.boundary)) {
        issues.push(
          createConstraintConflictIssue(
            constraint,
            parcel.id,
            parcel.center,
            parcel.boundary,
            `Parcel ${parcel.id} is inside prohibited constraint ${constraint.id}.`,
            `Regenerate parcel ${parcel.id} outside ${constraint.name ?? constraint.id}, or change the constraint boundary.`
          )
        );
      }
    }
  }

  if (constraint.prohibitedObjectKinds.includes('building')) {
    for (const building of city.buildings) {
      if (isPointInsidePolygon(building.center, constraint.boundary)) {
        issues.push(
          createConstraintConflictIssue(
            constraint,
            building.id,
            building.center,
            building.footprint,
            `Building ${building.id} is inside prohibited constraint ${constraint.id}.`,
            `Regenerate building ${building.id} outside ${constraint.name ?? constraint.id}, or change the constraint boundary.`
          )
        );
      }
    }
  }
}

function validateConstraintSetbacks(
  city: GeneratedCityForValidation,
  constraint: ValidationConstraint,
  issues: ValidationIssue[],
  context: ConstraintValidationContext
): void {
  if (constraint.minSetbackMeters === undefined) {
    return;
  }

  for (const building of city.buildings) {
    const parcel = context.parcelsById.get(building.parcelId);

    if (!parcel || !isPointInsidePolygon(building.center, constraint.boundary)) {
      continue;
    }

    const parcelBounds = getPolygonBounds(parcel.boundary);
    const buildingBounds = getPolygonBounds(building.footprint);
    const minSetback = Math.min(
      buildingBounds.minX - parcelBounds.minX,
      parcelBounds.maxX - buildingBounds.maxX,
      buildingBounds.minZ - parcelBounds.minZ,
      parcelBounds.maxZ - buildingBounds.maxZ
    );

    if (minSetback < constraint.minSetbackMeters - 0.001) {
      issues.push(
        createConstraintConflictIssue(
          constraint,
          building.id,
          building.center,
          building.footprint,
          `Building ${building.id} setback ${minSetback.toFixed(2)}m violates ${constraint.id}.`,
          `Shrink or move ${building.id} so every footprint edge is at least ${constraint.minSetbackMeters.toFixed(2)}m inside parcel ${parcel.id}.`
        )
      );
    }
  }
}

function validateConstraintRoadClearances(
  constraint: ValidationConstraint,
  issues: ValidationIssue[],
  context: ConstraintValidationContext
): void {
  if (constraint.minClearanceMeters === undefined) {
    return;
  }

  for (const roadId of getConstraintRoadIds(constraint, context.roadsById)) {
    const road = context.roadsById.get(roadId);

    if (!road) {
      continue;
    }

    if (road.widthMeters < constraint.minClearanceMeters - 0.001) {
      issues.push(
        createConstraintConflictIssue(
          constraint,
          road.id,
          road.center,
          constraint.boundary,
          `Road ${road.id} clearance ${road.widthMeters.toFixed(1)}m violates ${constraint.id}.`,
          `Widen ${road.id} to at least ${constraint.minClearanceMeters.toFixed(1)}m or relax the constraint.`
        )
      );
    }

    if (
      constraint.constraintKind === 'emergency-access-corridor' &&
      !road.lanes.some((lane) => lane.allowedModes.includes('emergency'))
    ) {
      issues.push(
        createConstraintConflictIssue(
          constraint,
          road.id,
          road.center,
          constraint.boundary,
          `Road ${road.id} has no lane allowing emergency access for ${constraint.id}.`,
          `Add emergency mode to at least one lane on ${road.id}.`
        )
      );
    }
  }
}

function validateConstraintHeightLimit(
  city: GeneratedCityForValidation,
  constraint: ValidationConstraint,
  issues: ValidationIssue[]
): void {
  if (constraint.maxHeightMeters === undefined || !constraint.affectedObjectKinds.includes('building')) {
    return;
  }

  for (const building of city.buildings) {
    if (
      building.heightMeters > constraint.maxHeightMeters + 0.001 &&
      (isPointInsidePolygon(building.center, constraint.boundary) ||
        polygonsIntersect(building.footprint, constraint.boundary))
    ) {
      issues.push(
        createConstraintConflictIssue(
          constraint,
          building.id,
          building.center,
          building.footprint,
          `Building ${building.id} height ${building.heightMeters.toFixed(1)}m violates ${constraint.id}.`,
          `Lower ${building.id} to ${constraint.maxHeightMeters.toFixed(1)}m or move it out of the constraint boundary.`
        )
      );
    }
  }
}

function getConstraintRoadIds(
  constraint: ValidationConstraint,
  roadsById: ReadonlyMap<string, GeneratedCityForValidation['roads'][number]>
): string[] {
  return [...new Set([...constraint.requiredObjectIds, ...constraint.relatedObjectIds])].filter((objectId) =>
    roadsById.has(objectId)
  );
}

function requiresClearanceMetric(constraintKind: ConstraintKind): boolean {
  return (
    constraintKind === 'clearance' ||
    constraintKind === 'emergency-access-corridor' ||
    constraintKind === 'protected-corridor'
  );
}

function createConstraintConflictIssue(
  constraint: ValidationConstraint,
  targetObjectId: string,
  affectedPoint: Point2D,
  affectedBoundary: Polygon2D,
  message: string,
  suggestedFix: string
): ValidationIssue {
  return {
    id: `constraint-conflict-${toIssueIdToken(constraint.id)}-${toIssueIdToken(targetObjectId)}`,
    severity: 'error',
    category: 'zoning',
    objectId: constraint.id,
    affectedPoint,
    affectedBoundary,
    suggestedFix,
    message
  };
}

function createConstraintIssue(
  constraint: ValidationConstraint,
  issueIdSuffix: string,
  category: ValidationIssue['category'],
  message: string,
  suggestedFix: string
): ValidationIssue {
  return {
    id: `constraint-${issueIdSuffix}-${toIssueIdToken(constraint.id)}`,
    severity: 'error',
    category,
    objectId: constraint.id,
    affectedBoundary: constraint.boundary,
    suggestedFix,
    message
  };
}

function validatePolyline2D(
  geospatial: GeospatialFrame,
  objectId: string,
  label: string,
  points: readonly Point2D[],
  issues: ValidationIssue[]
): void {
  points.forEach((point, index) => validatePoint2D(geospatial, objectId, `${label}-${index}`, point, issues));
}

function validatePolygon2D(
  geospatial: GeospatialFrame,
  objectId: string,
  label: string,
  points: readonly Point2D[],
  issues: ValidationIssue[]
): void {
  points.forEach((point, index) => validatePoint2D(geospatial, objectId, `${label}-${index}`, point, issues, points));
}

function validatePoint2D(
  geospatial: GeospatialFrame,
  objectId: string,
  label: string,
  point: Point2D,
  issues: ValidationIssue[],
  affectedBoundary?: Polygon2D
): void {
  validateHorizontalCoordinate(geospatial, objectId, label, 'x', point.x, point, issues, affectedBoundary);
  validateHorizontalCoordinate(geospatial, objectId, label, 'z', point.z, point, issues, affectedBoundary);
}

function validatePoint3D(
  geospatial: GeospatialFrame,
  objectId: string,
  label: string,
  point: Point3D,
  issues: ValidationIssue[]
): void {
  validatePoint2D(geospatial, objectId, label, point, issues);
  validateHeightValue(geospatial, objectId, `${label}-y`, point.y, issues);
}

function validateHorizontalCoordinate(
  geospatial: GeospatialFrame,
  objectId: string,
  label: string,
  axis: 'x' | 'z',
  value: number,
  point: Point2D,
  issues: ValidationIssue[],
  affectedBoundary?: Polygon2D
): void {
  if (!isFiniteNumber(value)) {
    issues.push({
      id: `non-finite-coordinate-${toIssueIdToken(objectId)}-${label}-${axis}`,
      severity: 'error',
      category: 'geometry',
      objectId,
      suggestedFix: `Regenerate ${objectId}.${label}.${axis} as a finite local meter coordinate before validation.`,
      ...(affectedBoundary ? { affectedBoundary } : {}),
      message: `Coordinate ${label}.${axis} for ${objectId} must be a finite local meter value.`
    });
    return;
  }

  const min = axis === 'x' ? geospatial.localBounds.minX : geospatial.localBounds.minZ;
  const max = axis === 'x' ? geospatial.localBounds.maxX : geospatial.localBounds.maxZ;
  const tolerance = geospatial.precision.horizontalToleranceMeters;

  if (value < min - tolerance || value > max + tolerance) {
    issues.push({
      id: `coordinate-out-of-bounds-${toIssueIdToken(objectId)}-${label}-${axis}`,
      severity: 'error',
      category: 'geometry',
      objectId,
      ...createIssueFocus(
        getFinitePoint(point),
        `Project or clamp ${objectId}.${label}.${axis} into local ${axis} bounds ${min}..${max}m before it becomes city data.`
      ),
      ...(affectedBoundary ? { affectedBoundary } : {}),
      message: `Coordinate ${label}.${axis} for ${objectId} is outside local ${axis} bounds ${min}..${max}m plus ${tolerance}m tolerance.`
    });
  }
}

function validateHeightValue(
  geospatial: GeospatialFrame,
  objectId: string,
  label: string,
  value: number,
  issues: ValidationIssue[]
): void {
  if (!isFiniteNumber(value)) {
    issues.push({
      id: `non-finite-height-${toIssueIdToken(objectId)}-${label}`,
      severity: 'error',
      category: 'geometry',
      objectId,
      suggestedFix: `Regenerate ${objectId}.${label} as a finite height in local meters.`,
      message: `Height ${label} for ${objectId} must be a finite local meter value.`
    });
    return;
  }

  const { minElevationMeters, maxElevationMeters } = geospatial.heightDatum;
  const tolerance = geospatial.precision.verticalToleranceMeters;

  if (value < minElevationMeters - tolerance || value > maxElevationMeters + tolerance) {
    issues.push({
      id: `height-out-of-datum-${toIssueIdToken(objectId)}-${label}`,
      severity: 'error',
      category: 'geometry',
      objectId,
      suggestedFix: `Clamp or regenerate ${objectId}.${label} inside the local datum range ${minElevationMeters}..${maxElevationMeters}m.`,
      message: `Height ${label} for ${objectId} is outside datum range ${minElevationMeters}..${maxElevationMeters}m plus ${tolerance}m tolerance.`
    });
  }
}

function validateSliceReferences(
  city: GeneratedCityForValidation,
  sliceId: string,
  label: string,
  objectIds: readonly string[],
  issues: ValidationIssue[]
): void {
  for (const objectId of objectIds) {
    if (!hasObjectId(city, objectId)) {
      issues.push({
        id: `missing-detailed-street-${label.replaceAll(' ', '-')}-${sliceId}-${objectId}`,
        severity: 'error',
        category: 'identifier',
        objectId: sliceId,
        ...createIssueFocus(
          getObjectAffectedPoint(city.objectIndex.objectsById[sliceId]),
          `Create referenced ${label} ${objectId} before validating slice ${sliceId}, or remove the stale slice reference.`
        ),
        message: `Detailed street slice ${sliceId} references missing ${label} ${objectId}.`
      });
    }
  }
}

function getRoadOffsetMeters(
  road: GeneratedCityForValidation['roads'][number],
  point: { x: number; z: number }
): number {
  const coordinate = road.orientation === 'vertical' ? point.z - road.center.z : point.x - road.center.x;

  return coordinate + road.length / 2;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB - 0.001 && startB < endA - 0.001;
}

function isSignFurnitureType(
  furnitureType: GeneratedCityForValidation['streetFurniture'][number]['furnitureType']
): boolean {
  return (
    furnitureType === 'regulatory-sign' ||
    furnitureType === 'street-name-sign' ||
    furnitureType === 'wayfinding-sign'
  );
}

interface ActiveFrontageValidationContext {
  readonly assetBindingsById: ReadonlyMap<string, RenderBinding>;
  readonly parcelsById: ReadonlyMap<string, GeneratedCityForValidation['parcels'][number]>;
  readonly roadsById: ReadonlyMap<string, GeneratedCityForValidation['roads'][number]>;
  readonly slicesById: ReadonlyMap<string, GeneratedCityForValidation['verticalSlices'][number]>;
}

function validateActiveFrontage(
  activeFrontage: GeneratedCityForValidation['activeFrontages'][number],
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  context: ActiveFrontageValidationContext
): void {
  const slice = context.slicesById.get(activeFrontage.sliceId);
  const road = context.roadsById.get(activeFrontage.roadId);
  const parcel = context.parcelsById.get(activeFrontage.parcelId);
  const building = city.buildings.find((candidate) => candidate.id === activeFrontage.buildingId);
  const sidewalk = city.objectIndex.objectsById[activeFrontage.sidewalkId];

  if (!slice) {
    issues.push({
      id: `missing-active-frontage-slice-${activeFrontage.id}`,
      severity: 'error',
      category: 'identifier',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} must reference a detailed street slice.`
    });
  }

  if (!road) {
    issues.push({
      id: `missing-active-frontage-road-${activeFrontage.id}`,
      severity: 'error',
      category: 'identifier',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} must reference an existing road.`
    });
  }

  if (!building || activeFrontage.parentId !== activeFrontage.buildingId) {
    issues.push({
      id: `missing-active-frontage-building-${activeFrontage.id}`,
      severity: 'error',
      category: 'identifier',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} must attach to parent building ${activeFrontage.buildingId}.`
    });
  }

  if (!parcel) {
    issues.push({
      id: `missing-active-frontage-parcel-${activeFrontage.id}`,
      severity: 'error',
      category: 'identifier',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} must reference an existing parcel.`
    });
  }

  if (building && parcel && building.parcelId !== parcel.id) {
    issues.push({
      id: `active-frontage-building-parcel-mismatch-${activeFrontage.id}`,
      severity: 'error',
      category: 'graph',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} building and parcel references must match.`
    });
  }

  if (slice && activeFrontage.roadId !== slice.corridorRoadId) {
    issues.push({
      id: `active-frontage-outside-corridor-${activeFrontage.id}`,
      severity: 'error',
      category: 'graph',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} must face detailed corridor road ${slice.corridorRoadId}.`
    });
  }

  if (parcel && !parcel.frontageRoadIds.includes(activeFrontage.roadId)) {
    issues.push({
      id: `active-frontage-missing-parcel-frontage-${activeFrontage.id}`,
      severity: 'error',
      category: 'graph',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} road must be listed on parcel frontage roads.`
    });
  }

  if (!sidewalk || sidewalk.kind !== 'sidewalk') {
    issues.push({
      id: `missing-active-frontage-sidewalk-${activeFrontage.id}`,
      severity: 'error',
      category: 'identifier',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} must reference a corridor sidewalk.`
    });
  } else if (sidewalk.roadSegmentId !== activeFrontage.roadId) {
    issues.push({
      id: `active-frontage-sidewalk-road-mismatch-${activeFrontage.id}`,
      severity: 'error',
      category: 'graph',
      objectId: activeFrontage.id,
      message: `Active frontage sidewalk ${activeFrontage.sidewalkId} must belong to road ${activeFrontage.roadId}.`
    });
  }

  if (!isBuildingFrontageSide(activeFrontage.frontageSide)) {
    issues.push({
      id: `invalid-active-frontage-side-${activeFrontage.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: activeFrontage.id,
      message: 'Active frontage side must be one of north, east, south, or west.'
    });
  }

  if (!hasActiveFrontageUse(activeFrontage.activeUses) || (building && !hasActiveFrontageUse(building.uses))) {
    issues.push({
      id: `invalid-active-frontage-use-${activeFrontage.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: activeFrontage.id,
      message: 'Active frontage must represent retail, hospitality, or mixed-use activity.'
    });
  }

  const hasValidPublicEntrance =
    building &&
    activeFrontage.publicEntranceIds.some(
      (entranceId) => building.entranceIds.includes(entranceId) && building.publicEntranceIds.includes(entranceId)
    );

  if (!hasValidPublicEntrance) {
    issues.push({
      id: `missing-active-frontage-public-entrance-${activeFrontage.id}`,
      severity: 'error',
      category: 'graph',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} must reference at least one building public entrance.`
    });
  }

  if (
    !isFiniteNumber(activeFrontage.position.x) ||
    !isFiniteNumber(activeFrontage.position.z) ||
    !isFiniteNumber(activeFrontage.facingDirectionRadians) ||
    activeFrontage.widthMeters <= 0 ||
    activeFrontage.heightMeters <= 0 ||
    activeFrontage.groundFloorHeightMeters <= 0
  ) {
    issues.push({
      id: `invalid-active-frontage-geometry-${activeFrontage.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: activeFrontage.id,
      message: 'Active frontage must have finite placement and positive storefront dimensions.'
    });
  }

  if (
    activeFrontage.storefront.displayWindowCount <= 0 ||
    activeFrontage.storefront.transparencyRatio <= 0 ||
    activeFrontage.storefront.transparencyRatio > 1 ||
    !activeFrontage.storefront.signTextCode ||
    (activeFrontage.storefront.awning.enabled && activeFrontage.storefront.awning.depthMeters <= 0) ||
    (activeFrontage.storefront.nightWindows.enabledByDefault &&
      (activeFrontage.storefront.nightWindows.litWindowCount <= 0 ||
        activeFrontage.storefront.nightWindows.emissiveIntensity <= 0))
  ) {
    issues.push({
      id: `invalid-active-frontage-storefront-${activeFrontage.id}`,
      severity: 'error',
      category: 'asset',
      objectId: activeFrontage.id,
      message: 'Active frontage storefront metadata must include windows, sign text, awning, and night-window values.'
    });
  }

  for (const bindingId of Object.values(activeFrontage.assetBindingIds)) {
    const binding = context.assetBindingsById.get(bindingId);

    if (!binding || binding.objectKind !== 'facade') {
      issues.push({
        id: `invalid-active-frontage-asset-binding-${activeFrontage.id}-${bindingId}`,
        severity: 'error',
        category: 'asset',
        objectId: activeFrontage.id,
        message: `Active frontage ${activeFrontage.id} must reference facade render binding ${bindingId}.`
      });
    }
  }

  if (activeFrontage.tags?.detailedStreetSliceId !== activeFrontage.sliceId) {
    issues.push({
      id: `missing-active-frontage-slice-tag-${activeFrontage.id}`,
      severity: 'error',
      category: 'identifier',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} must be tagged with slice ${activeFrontage.sliceId}.`
    });
  }
}

function hasActiveFrontageUse(uses: readonly string[]): boolean {
  return uses.some((use) => use === 'hospitality' || use === 'mixed-use' || use === 'retail');
}

function isBuildingFrontageSide(value: string): boolean {
  return value === 'north' || value === 'east' || value === 'south' || value === 'west';
}

function createIssueFocus(
  affectedPoint: Point2D | undefined,
  suggestedFix: string
): Pick<ValidationIssue, 'affectedPoint' | 'suggestedFix'> {
  return affectedPoint ? { affectedPoint, suggestedFix } : { suggestedFix };
}

function isSignalExpectationCompatible(
  signalExpectation: GeneratedCity['intersections'][number]['signalExpectation'],
  controlType: IntersectionControlType
): boolean {
  switch (signalExpectation) {
    case 'signalized':
      return controlType === 'traffic-signal';
    case 'stop-controlled':
      return controlType === 'all-way-stop' || controlType === 'minor-stop';
    case 'uncontrolled':
      return controlType === 'uncontrolled' || controlType === 'yield';
  }
}

function isApproachControlCompatible(
  controlType: IntersectionControlType,
  approachControl: GeneratedCity['intersections'][number]['approachRules'][number]['control']
): boolean {
  switch (controlType) {
    case 'traffic-signal':
      return approachControl === 'signal';
    case 'all-way-stop':
      return approachControl === 'stop';
    case 'minor-stop':
      return approachControl === 'stop' || approachControl === 'uncontrolled';
    case 'yield':
      return approachControl === 'yield' || approachControl === 'uncontrolled';
    case 'uncontrolled':
      return approachControl === 'uncontrolled';
  }
}

function getObjectAffectedPoint(object: unknown): Point2D | undefined {
  if (!isRecord(object)) {
    return undefined;
  }

  return (
    getFinitePoint(object.center) ??
    getFinitePoint(object.position) ??
    getFinitePoint(object.focusPoint) ??
    getFirstFinitePoint(object.centerline) ??
    getFirstFinitePoint(object.boundary) ??
    getFirstFinitePoint(object.focusBoundary) ??
    getFirstFinitePoint(object.footprint)
  );
}

function getFirstFinitePoint(value: unknown): Point2D | undefined {
  return Array.isArray(value) ? getFinitePoint(value[0]) : undefined;
}

function getFinitePoint(value: unknown): Point2D | undefined {
  if (!isRecord(value) || typeof value.x !== 'number' || typeof value.z !== 'number') {
    return undefined;
  }

  return isFiniteNumber(value.x) && isFiniteNumber(value.z) ? { x: value.x, z: value.z } : undefined;
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toIssueIdToken(value: string): string {
  return value.replace(/[^a-zA-Z0-9:-]+/g, '-').replace(/^-+|-+$/g, '') || 'empty';
}

function isAssetCategory(value: unknown): value is AssetDefinition['category'] {
  return typeof value === 'string' && (ASSET_CATEGORIES as readonly string[]).includes(value);
}

function isAssetFormat(value: unknown): value is AssetFormat {
  return typeof value === 'string' && (ASSET_FORMATS as readonly string[]).includes(value);
}

function isLodTier(value: unknown): boolean {
  return typeof value === 'string' && (CITY_LOD_TIERS as readonly string[]).includes(value);
}

function assetUrlMatchesFormat(url: string, format: Exclude<AssetFormat, 'procedural'>): boolean {
  const normalizedUrl = url.toLowerCase().split(/[?#]/)[0];

  return BINARY_ASSET_EXTENSIONS[format].some((extension) => normalizedUrl.endsWith(extension));
}

function validateAssetCatalog(assetCatalog: readonly AssetDefinition[], issues: ValidationIssue[]): void {
  const assetIds = new Set(assetCatalog.map((asset) => asset.id));
  const seenAssetIds = new Set<string>();

  for (const asset of assetCatalog) {
    if (seenAssetIds.has(asset.id)) {
      issues.push({
        id: `duplicate-asset-definition-${asset.id}`,
        severity: 'error',
        category: 'asset',
        objectId: asset.id,
        message: `Duplicate asset definition id: ${asset.id}.`
      });
    }
    seenAssetIds.add(asset.id);

    if (!isAssetCategory(asset.category)) {
      issues.push({
        id: `invalid-asset-category-${asset.id}-${toIssueIdToken(String(asset.category))}`,
        severity: 'error',
        category: 'asset',
        objectId: asset.id,
        message: `Asset ${asset.id} must use a supported asset category.`
      });
    }

    if (!isAssetFormat(asset.format)) {
      issues.push({
        id: `invalid-asset-format-${asset.id}-${toIssueIdToken(String(asset.format))}`,
        severity: 'error',
        category: 'asset',
        objectId: asset.id,
        message: `Asset ${asset.id} must use a supported asset format.`
      });
    }

    if (!Number.isFinite(asset.scaleMeters) || asset.scaleMeters <= 0) {
      issues.push({
        id: `invalid-asset-scale-${asset.id}`,
        severity: 'error',
        category: 'asset',
        objectId: asset.id,
        message: `Asset ${asset.id} must declare a positive meter scale.`
      });
    }

    if (Object.keys(asset.tags).length === 0) {
      issues.push({
        id: `missing-asset-tags-${asset.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: asset.id,
        message: `Asset ${asset.id} should declare semantic tags for binding selection.`
      });
    }

    if (!asset.tags.materialZone || typeof asset.tags.materialZone !== 'string') {
      issues.push({
        id: `missing-asset-material-zone-${asset.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: asset.id,
        message: `Asset ${asset.id} should declare a materialZone tag.`
      });
    }

    if (asset.format === 'procedural' && asset.tags.fallback !== true) {
      issues.push({
        id: `missing-procedural-fallback-tag-${asset.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: asset.id,
        message: `Procedural asset ${asset.id} should tag itself as a fallback.`
      });
    }

    if (asset.format !== 'procedural' && !asset.url) {
      issues.push({
        id: `missing-asset-url-${asset.id}`,
        severity: 'error',
        category: 'asset',
        objectId: asset.id,
        message: `Binary asset ${asset.id} must declare a public asset URL.`
      });
    }

    if (asset.format !== 'procedural' && asset.url && isAssetFormat(asset.format) && !assetUrlMatchesFormat(asset.url, asset.format)) {
      issues.push({
        id: `asset-url-format-mismatch-${asset.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: asset.id,
        message: `Asset ${asset.id} URL should match its declared ${asset.format} format.`
      });
    }

    if (asset.lodVariants) {
      for (const [tier, assetId] of Object.entries(asset.lodVariants)) {
        if (!isLodTier(tier)) {
          issues.push({
            id: `invalid-asset-lod-variant-tier-${asset.id}-${toIssueIdToken(tier)}`,
            severity: 'error',
            category: 'asset',
            objectId: asset.id,
            message: `Asset ${asset.id} references unsupported LOD variant tier ${tier}.`
          });
        }

        if (typeof assetId !== 'string' || !assetIds.has(assetId)) {
          issues.push({
            id: `missing-asset-lod-variant-${asset.id}-${toIssueIdToken(tier)}`,
            severity: 'warning',
            category: 'asset',
            objectId: asset.id,
            message: `Asset ${asset.id} LOD variant ${tier} should reference an existing asset.`
          });
        }
      }
    }

    if (!asset.license) {
      issues.push({
        id: `missing-asset-license-${asset.id}`,
        severity: 'warning',
        category: 'metadata',
        objectId: asset.id,
        message: `Asset ${asset.id} should declare top-level license metadata.`
      });
    }

    if (!asset.attribution) {
      issues.push({
        id: `missing-asset-attribution-${asset.id}`,
        severity: 'warning',
        category: 'metadata',
        objectId: asset.id,
        message: `Asset ${asset.id} should declare top-level attribution metadata.`
      });
    }
  }
}

function validateRenderBindings(
  assetCatalog: readonly AssetDefinition[],
  assetBindings: readonly RenderBinding[],
  issues: ValidationIssue[]
): void {
  const assetIds = new Set(assetCatalog.map((asset) => asset.id));
  const bindingIds = new Set<string>();
  const validObjectKinds = new Set(CITY_OBJECT_KIND_REGISTRY_ENTRIES.map((entry) => entry.kind));

  for (const binding of assetBindings) {
    if (bindingIds.has(binding.id)) {
      issues.push({
        id: `duplicate-render-binding-${binding.id}`,
        severity: 'error',
        category: 'asset',
        objectId: binding.id,
        message: `Duplicate render binding id: ${binding.id}.`
      });
    }
    bindingIds.add(binding.id);

    if (!validObjectKinds.has(binding.objectKind)) {
      issues.push({
        id: `invalid-render-binding-object-kind-${binding.id}`,
        severity: 'error',
        category: 'asset',
        objectId: binding.id,
        message: `Render binding ${binding.id} must target a registered city object kind.`
      });
    }

    if (!binding.semanticTag) {
      issues.push({
        id: `missing-render-binding-semantic-tag-${binding.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: binding.id,
        message: `Render binding ${binding.id} should declare a semantic tag.`
      });
    }

    if (!binding.materialZone) {
      issues.push({
        id: `missing-render-binding-material-zone-${binding.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: binding.id,
        message: `Render binding ${binding.id} should declare a material zone.`
      });
    }

    if (!binding.fallbackMaterial || !binding.fallbackGeometry) {
      issues.push({
        id: `missing-render-fallback-${binding.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: binding.id,
        message: `Render binding ${binding.id} must declare fallback material and geometry.`
      });
    }

    if (binding.assetId && !assetIds.has(binding.assetId)) {
      issues.push({
        id: `missing-render-binding-asset-${binding.id}`,
        severity: 'warning',
        category: 'asset',
        objectId: binding.id,
        message: `Render binding ${binding.id} references missing asset ${binding.assetId}.`
      });
    }
  }

  for (const requiredBindingId of REQUIRED_RENDER_BINDING_IDS) {
    if (!bindingIds.has(requiredBindingId)) {
      issues.push({
        id: `missing-render-binding-${requiredBindingId}`,
        severity: 'warning',
        category: 'asset',
        objectId: requiredBindingId,
        message: `Current city rendering is missing required fallback binding ${requiredBindingId}.`
      });
    }
  }

  for (const objectKind of REQUIRED_RENDERABLE_OBJECT_KINDS) {
    if (!assetBindings.some((binding) => binding.objectKind === objectKind)) {
      issues.push({
        id: `missing-renderable-kind-binding-${objectKind}`,
        severity: 'warning',
        category: 'asset',
        objectId: objectKind,
        message: `Renderable object kind ${objectKind} must have at least one render binding.`
      });
    }
  }
}
