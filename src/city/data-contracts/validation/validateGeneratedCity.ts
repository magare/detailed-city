import type {
  AssetDefinition,
  AssetFormat,
  BuildingEntranceStrategy,
  AccessControlKind,
  AccessControlRuleKind,
  BuildingFacadeMaterialZone,
  BuildingFacadeRhythm,
  BuildingFootprintGrammarKind,
  BuildingFrontageSide,
  BuildingRoofDetailKind,
  BuildingRoofMaterialZone,
  BuildingRoofStyleKind,
  BuildingStructuralSystemKind,
  BuildingServiceAccessProfile,
  BuildingTypologyKind,
  CivicAnchorArrivalMode,
  CivicAnchorServiceType,
  CityId,
  CityObjectKind,
  CommunityAnchorKind,
  ConstraintKind,
  CultureAnchorKind,
  EducationAnchorKind,
  EmergencyResponseMode,
  EmergencyServiceAnchorKind,
  GeospatialFrame,
  GovernmentAnchorKind,
  HealthcareAnchorKind,
  HazardMitigationKind,
  IntersectionControlType,
  LaneRole,
  Point2D,
  Point3D,
  Polygon2D,
  RenderBinding,
  SolarGlareRisk,
  SolarShadingSampleKind,
  SoilGeologyKind,
  StreetProfile,
  TravelMode,
  UrbanHeatRiskLevel,
  UrbanHeatZoneKind,
  WaterTransportAccessKind,
  WaterTransportArrivalMode,
  ValidationIssue,
  ValidationResult,
  WeatherPrecipitationKind,
  WeatherPresetKind,
  WeatherSeason
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
import { CITY_BLUEPRINT } from '../../blueprint/cityBlueprint';
import { isMaterialZoneId } from '../../rendering-handoff/material-zones/materialZoneDefinitions';
import { getPolygonBounds, isPointInsidePolygon, polygonsIntersect } from '../../../utils/geometry';

type GeneratedCityForValidation = Pick<
  GeneratedCity,
  | 'assetBindings'
  | 'assetCatalog'
  | 'accessControls'
  | 'activeFrontages'
  | 'administrativeBoundaries'
  | 'bikeConflictZones'
  | 'bikeGraphEdges'
  | 'bikeGraphNodes'
  | 'bikeParking'
  | 'bikeSegments'
  | 'bikeSignals'
  | 'blocks'
  | 'buildings'
  | 'buildingEntrances'
  | 'buildingFireSafetyProfiles'
  | 'addressPoints'
  | 'namedPlaces'
  | 'gazetteerEntries'
  | 'greenStormwaterFeatures'
  | 'cadastreRecords'
  | 'assetInventoryRecords'
  | 'civicAnchors'
  | 'communityAnchors'
  | 'cultureAnchors'
  | 'educationAnchors'
  | 'governmentAnchors'
  | 'healthcareAnchors'
  | 'emergencyServiceAnchors'
  | 'waterTransportAccess'
  | 'cityMetrics'
  | 'developmentPhases'
  | 'weatherPresets'
  | 'solarShadingSamples'
  | 'urbanHeatZones'
  | 'utilityNodes'
  | 'utilityEdges'
  | 'serviceAccessCorridors'
  | 'constraints'
  | 'crossings'
  | 'curbActivations'
  | 'curbZones'
  | 'districts'
  | 'freightLoadingDocks'
  | 'freightRoutes'
  | 'geospatial'
  | 'hazardZones'
  | 'intersections'
  | 'navigationGraphEdges'
  | 'navigationGraphNodes'
  | 'navigationRoutes'
  | 'maintenanceOperations'
  | 'permitInspectionRecords'
  | 'publicAmenities'
  | 'lodPolicy'
  | 'objectIndex'
  | 'parcels'
  | 'parks'
  | 'parkFeatures'
  | 'plazaZones'
  | 'resilienceGoals'
  | 'roads'
  | 'sidewalkGraph'
  | 'serviceAlleys'
  | 'soilGeologyZones'
  | 'streetFurniture'
  | 'streetLights'
  | 'topographyZones'
  | 'trafficCalmingDevices'
  | 'transitRoutes'
  | 'transitStops'
  | 'trees'
  | 'verticalSlices'
  | 'waterfrontEdges'
  | 'waterfrontOpenSpaces'
  | 'waterways'
  | 'zoningDistricts'
>;

type ValidationBlock = GeneratedCityForValidation['blocks'][number];
type ValidationBuilding = GeneratedCityForValidation['buildings'][number];
type ValidationAccessControl = GeneratedCityForValidation['accessControls'][number];
type ValidationBuildingEntrance = GeneratedCityForValidation['buildingEntrances'][number];
type ValidationBuildingFireSafetyProfile = GeneratedCityForValidation['buildingFireSafetyProfiles'][number];
type ValidationAddressPoint = GeneratedCityForValidation['addressPoints'][number];
type ValidationNamedPlace = GeneratedCityForValidation['namedPlaces'][number];
type ValidationGazetteerEntry = GeneratedCityForValidation['gazetteerEntries'][number];
type ValidationCadastreRecord = GeneratedCityForValidation['cadastreRecords'][number];
type ValidationAssetInventoryRecord = GeneratedCityForValidation['assetInventoryRecords'][number];
type ValidationMaintenanceOperation = GeneratedCityForValidation['maintenanceOperations'][number];
type ValidationPermitInspectionRecord = GeneratedCityForValidation['permitInspectionRecords'][number];
type ValidationCivicAnchor = GeneratedCityForValidation['civicAnchors'][number];
type ValidationCommunityAnchor = GeneratedCityForValidation['communityAnchors'][number];
type ValidationCultureAnchor = GeneratedCityForValidation['cultureAnchors'][number];
type ValidationEducationAnchor = GeneratedCityForValidation['educationAnchors'][number];
type ValidationGovernmentAnchor = GeneratedCityForValidation['governmentAnchors'][number];
type ValidationHealthcareAnchor = GeneratedCityForValidation['healthcareAnchors'][number];
type ValidationEmergencyServiceAnchor = GeneratedCityForValidation['emergencyServiceAnchors'][number];
type ValidationWaterTransportAccess = GeneratedCityForValidation['waterTransportAccess'][number];
type ValidationParcel = GeneratedCityForValidation['parcels'][number];
type ValidationAdministrativeBoundary = GeneratedCityForValidation['administrativeBoundaries'][number];
type ValidationCityMetric = GeneratedCityForValidation['cityMetrics'][number];
type ValidationDevelopmentPhase = GeneratedCityForValidation['developmentPhases'][number];
type ValidationWeatherPreset = GeneratedCityForValidation['weatherPresets'][number];
type ValidationSolarShadingSample = GeneratedCityForValidation['solarShadingSamples'][number];
type ValidationUrbanHeatZone = GeneratedCityForValidation['urbanHeatZones'][number];
type ValidationUtilityNode = GeneratedCityForValidation['utilityNodes'][number];
type ValidationUtilityEdge = GeneratedCityForValidation['utilityEdges'][number];
type ValidationServiceAccessCorridor = GeneratedCityForValidation['serviceAccessCorridors'][number];
type ValidationGreenStormwaterFeature = GeneratedCityForValidation['greenStormwaterFeatures'][number];
type ValidationPark = GeneratedCityForValidation['parks'][number];
type ValidationParkFeature = GeneratedCityForValidation['parkFeatures'][number];
type ValidationPlazaZone = GeneratedCityForValidation['plazaZones'][number];
type ValidationConstraint = GeneratedCityForValidation['constraints'][number];
type ValidationDistrict = GeneratedCityForValidation['districts'][number];
type ValidationHazardZone = GeneratedCityForValidation['hazardZones'][number];
type ValidationTopographyZone = GeneratedCityForValidation['topographyZones'][number];
type ValidationSoilGeologyZone = GeneratedCityForValidation['soilGeologyZones'][number];
type ValidationResilienceGoal = GeneratedCityForValidation['resilienceGoals'][number];
type ValidationCrossing = GeneratedCityForValidation['crossings'][number];
type ValidationIntersection = GeneratedCityForValidation['intersections'][number];
type ValidationRoad = GeneratedCityForValidation['roads'][number];
type ValidationStreetLight = GeneratedCityForValidation['streetLights'][number];
type ValidationWaterfrontEdge = GeneratedCityForValidation['waterfrontEdges'][number];
type ValidationWaterfrontOpenSpace = GeneratedCityForValidation['waterfrontOpenSpaces'][number];
type ValidationWaterway = GeneratedCityForValidation['waterways'][number];
type ValidationZoningDistrict = GeneratedCityForValidation['zoningDistricts'][number];

const ASSET_INVENTORY_TARGET_KINDS = [
  'civic-anchor',
  'community-anchor',
  'culture-anchor',
  'education-anchor',
  'emergency-service-anchor',
  'government-anchor',
  'healthcare-anchor',
  'green-stormwater-feature',
  'park-feature',
  'plaza-zone',
  'street-furniture',
  'street-light',
  'utility-edge',
  'utility-node',
  'water-transport-access',
  'waterfront-open-space'
] as const satisfies readonly CityObjectKind[];

const STREET_LIGHT_RENDER_BINDING_ID = 'binding:street-light:pole-fixture';
const UTILITY_NODE_INVENTORY_RENDER_BINDING_ID = 'binding:utility:inventory-node';
const UTILITY_EDGE_INVENTORY_RENDER_BINDING_ID = 'binding:utility:inventory-edge';

const REQUIRED_RENDER_BINDING_IDS = [
  'binding:terrain:ground',
  'binding:road:asphalt',
  'binding:water:river',
  'binding:park:grass',
  'binding:park-feature:lawn',
  'binding:park-feature:path',
  'binding:park-feature:planting',
  'binding:park-feature:sports',
  'binding:park-feature:seating',
  'binding:park-feature:water-feature',
  'binding:park-feature:shade',
  'binding:green-stormwater:feature',
  'binding:plaza:zone',
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
  'binding:access-control:barrier',
  'binding:road:lane-marking',
  'binding:road:zebra-crossing',
  'binding:road:stop-bar',
  'binding:road:turn-arrow',
  'binding:road:tactile-paving',
  'binding:road:refuge-island',
  'binding:road:traffic-calming',
  'binding:transit:bus-stop',
  'binding:facade:storefront-window',
  'binding:facade:awning',
  'binding:facade:sign',
  'binding:facade:entrance-door',
  'binding:facade:night-window',
  'binding:civic:anchor',
  'binding:civic:community-anchor',
  'binding:civic:culture-anchor',
  'binding:civic:government-anchor',
  'binding:waterfront:edge',
  'binding:waterfront:open-space',
  'binding:water-transport:access',
  'binding:vehicle:traffic-car'
] as const;

const REQUIRED_RENDERABLE_OBJECT_KINDS = [
  'road-segment',
  'waterway',
  'park',
  'park-feature',
  'plaza-zone',
  'building',
  'civic-anchor',
  'community-anchor',
  'culture-anchor',
  'government-anchor',
  'facade',
  'tree-planting',
  'street-light',
  'street-furniture',
  'access-control',
  'lane-marking',
  'traffic-calming-device',
  'transit-stop',
  'water-transport-access',
  'waterfront-edge',
  'waterfront-open-space',
  'traffic-vehicle'
] as const satisfies readonly CityObjectKind[];

const ASSET_FORMATS = ['glb', 'gltf', 'png', 'jpg', 'webp', 'ktx2', 'hdr', 'exr', 'procedural'] as const satisfies readonly AssetFormat[];
const WATERFRONT_OPEN_SPACE_KINDS = [
  'boardwalk',
  'ecological-edge',
  'overlook',
  'pier-landing',
  'promenade',
  'water-access'
] as const;
const WATERFRONT_OPEN_SPACE_SURFACES = [
  'concrete-promenade',
  'ecological-planting',
  'stone-quay',
  'timber-boardwalk'
] as const;
const WATER_TRANSPORT_ACCESS_KINDS = [
  'emergency-helipad',
  'ferry-pier',
  'ferry-stop',
  'port-logistics-edge',
  'service-dock',
  'small-port'
] as const satisfies readonly WaterTransportAccessKind[];
const WATER_TRANSPORT_ARRIVAL_MODES = [
  'ferry',
  'freight-barge',
  'helicopter',
  'service-vessel',
  'water-taxi'
] as const satisfies readonly WaterTransportArrivalMode[];
const CIVIC_ANCHOR_SERVICE_TYPES = [
  'community',
  'culture',
  'education',
  'emergency',
  'government',
  'healthcare'
] as const satisfies readonly CivicAnchorServiceType[];
const CIVIC_ANCHOR_ARRIVAL_MODES = [
  'bike',
  'emergency',
  'pedestrian',
  'service',
  'transit',
  'vehicle'
] as const satisfies readonly CivicAnchorArrivalMode[];
const GOVERNMENT_ANCHOR_KINDS = [
  'administrative-office',
  'city-hall',
  'civic-plaza-interface',
  'court',
  'service-counter'
] as const satisfies readonly GovernmentAnchorKind[];
const EDUCATION_ANCHOR_KINDS = [
  'childcare',
  'learning-campus',
  'library',
  'school',
  'university'
] as const satisfies readonly EducationAnchorKind[];
const EMERGENCY_SERVICE_ANCHOR_KINDS = [
  'ambulance-post',
  'command-post',
  'fire-station',
  'police-station',
  'public-shelter',
  'staging-area'
] as const satisfies readonly EmergencyServiceAnchorKind[];
const EMERGENCY_RESPONSE_MODES = [
  'command',
  'fire',
  'medical',
  'multi-agency',
  'police',
  'shelter'
] as const satisfies readonly EmergencyResponseMode[];
const HEALTHCARE_ANCHOR_KINDS = [
  'ambulance-bay',
  'clinic',
  'hospital',
  'pharmacy',
  'urgent-care'
] as const satisfies readonly HealthcareAnchorKind[];
const ACCESS_CONTROL_KINDS = [
  'bollard-line',
  'checkpoint',
  'fence',
  'gate',
  'guardrail',
  'turnstile',
  'wall'
] as const satisfies readonly AccessControlKind[];
const ACCESS_CONTROL_RULE_KINDS = [
  'authorized-only',
  'emergency-only',
  'paid-access',
  'private-property',
  'public-pass-through',
  'service-only'
] as const satisfies readonly AccessControlRuleKind[];
const CULTURE_ANCHOR_KINDS = [
  'event-space',
  'gallery',
  'heritage-site',
  'museum',
  'theater',
  'venue'
] as const satisfies readonly CultureAnchorKind[];
const COMMUNITY_ANCHOR_KINDS = [
  'cemetery',
  'community-hall',
  'food-bank',
  'processional-space',
  'recreation-center',
  'shelter',
  'social-service',
  'worship-place'
] as const satisfies readonly CommunityAnchorKind[];
const WEATHER_PRESET_KINDS = ['clear', 'cloudy', 'rain', 'fog', 'monsoon'] as const satisfies readonly WeatherPresetKind[];
const WEATHER_SEASONS = ['spring', 'summer', 'monsoon', 'autumn', 'winter'] as const satisfies readonly WeatherSeason[];
const WEATHER_PRECIPITATION_KINDS = ['none', 'drizzle', 'rain', 'heavy-rain'] as const satisfies readonly WeatherPrecipitationKind[];
const SOLAR_SHADING_SAMPLE_KINDS = [
  'roof-solar',
  'plaza-comfort',
  'park-comfort',
  'waterfront-comfort'
] as const satisfies readonly SolarShadingSampleKind[];
const SOLAR_GLARE_RISKS = ['low', 'medium', 'high'] as const satisfies readonly SolarGlareRisk[];
const URBAN_HEAT_ZONE_KINDS = [
  'heat-island',
  'cool-roof',
  'canopy-cooling',
  'water-cooling',
  'public-route-risk'
] as const satisfies readonly UrbanHeatZoneKind[];
const URBAN_HEAT_RISK_LEVELS = ['low', 'moderate', 'high', 'critical'] as const satisfies readonly UrbanHeatRiskLevel[];
const TRAVEL_MODES = ['vehicle', 'bus', 'bike', 'freight', 'emergency'] as const satisfies readonly TravelMode[];
const LANE_ROLES = ['general', 'bus-only', 'turn-pocket', 'reversible', 'service'] as const satisfies readonly LaneRole[];
const BUILDING_TYPOLOGY_KINDS = [
  'residential',
  'office',
  'civic',
  'industrial',
  'mixed-use',
  'retail',
  'hospitality',
  'warehouse',
  'utility',
  'special-use'
] as const satisfies readonly BuildingTypologyKind[];
const BUILDING_ENTRANCE_STRATEGIES = [
  'public-lobby',
  'storefront',
  'campus-entry',
  'service-yard',
  'utility-access'
] as const satisfies readonly BuildingEntranceStrategy[];
const BUILDING_SERVICE_ACCESS_PROFILES = [
  'curb-loading',
  'internal-service',
  'yard-loading',
  'public-service',
  'utility-only'
] as const satisfies readonly BuildingServiceAccessProfile[];
const BUILDING_FOOTPRINT_GRAMMAR_KINDS = [
  'bar',
  'podium',
  'tower-on-podium',
  'courtyard',
  'warehouse-shed',
  'civic-block'
] as const satisfies readonly BuildingFootprintGrammarKind[];
const BUILDING_STRUCTURAL_SYSTEM_KINDS = [
  'load-bearing-wall',
  'reinforced-concrete-frame',
  'steel-frame',
  'concrete-core-outrigger',
  'long-span-steel',
  'civic-frame'
] as const satisfies readonly BuildingStructuralSystemKind[];
const BUILDING_FACADE_RHYTHMS = [
  'civic-formal',
  'fine-grain',
  'industrial-large-bay',
  'mid-rise-waterfront',
  'residential-regular',
  'tower-grid'
] as const satisfies readonly BuildingFacadeRhythm[];
const BUILDING_FACADE_MATERIAL_ZONES = [
  'balcony-rail',
  'brick',
  'concrete',
  'glass',
  'metal-panel',
  'plaster',
  'stone',
  'storefront-glass'
] as const satisfies readonly BuildingFacadeMaterialZone[];
const BUILDING_ROOF_STYLE_KINDS = [
  'flat',
  'mechanical',
  'green',
  'antenna',
  'terrace',
  'sawtooth',
  'civic-cornice'
] as const satisfies readonly BuildingRoofStyleKind[];
const BUILDING_ROOF_DETAIL_KINDS = [
  'mechanical-screen',
  'solar-array',
  'green-roof',
  'antenna',
  'terrace',
  'roof-access'
] as const satisfies readonly BuildingRoofDetailKind[];
const BUILDING_ROOF_MATERIAL_ZONES = [
  'roof',
  'solar',
  'green-roof',
  'metal',
  'terrace'
] as const satisfies readonly BuildingRoofMaterialZone[];
const SOIL_GEOLOGY_KINDS = [
  'alluvial-silt',
  'engineered-fill',
  'shallow-bedrock',
  'sandy-loam',
  'contaminated-fill',
  'waterfront-clay'
] as const satisfies readonly SoilGeologyKind[];
const FOUNDATION_SUITABILITY_KINDS = ['shallow-spread', 'mat-foundation', 'pile-foundation', 'restricted-remediation'] as const;
const TUNNEL_DIFFICULTY_KINDS = ['low', 'medium', 'high', 'restricted'] as const;
const DRAINAGE_ASSUMPTION_KINDS = ['free-draining', 'moderate-infiltration', 'poor-drainage', 'dewatering-required'] as const;
const GROUND_RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const CROSSING_LOCATIONS = ['intersection', 'midblock'] as const;
const CROSSWALK_TYPES = ['zebra', 'continental', 'raised-table'] as const;
const CROSSING_PRIORITIES = ['signal-protected', 'pedestrian-priority', 'yield-controlled', 'uncontrolled'] as const;
const MIN_ACCESSIBLE_CLEAR_PATH_METERS = 1.8;
const MAX_ACCESSIBLE_RUNNING_GRADE_PERCENT = 5;
const MAX_ACCESSIBLE_CROSS_SLOPE_PERCENT = 2;
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
  validateWeatherPresets(city.weatherPresets, issues);
  validateSolarShadingSamples(city, issues);
  validateUrbanHeatZones(city, issues);
  validateZoningDistricts(city, issues);
  validateWaterways(city, issues);
  validateWaterfrontEdges(city, issues);
  validateHazardZones(city, issues);
  validateTopographyZones(city, issues);
  validateSoilGeologyZones(city, issues);
  validateCadastreRecords(city, issues);
  validateUtilityBase(city, issues);
  validatePowerGrid(city, issues);
  validateWaterSupply(city, issues);
  validateWastewater(city, issues);
  validateStormwater(city, issues);
  validateTelecom(city, issues);
  validateThermalEnergy(city, issues);
  validateServiceAccessCorridors(city, issues);
  validateAccessControls(city, issues);
  validateBuildingEntrancesAndAddresses(city, issues);
  validateBuildingFireSafetyProfiles(city, issues);
  validateAddressingGazetteer(city, issues);
  validateDevelopmentPhases(city, issues);
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

    validateRoadGroundProfile(road, city.topographyZones, issues);

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

      if (
        sidewalk.frontageZoneMeters < 0 ||
        sidewalk.furnishingZoneMeters < 0 ||
        sidewalk.accessibleClearPathMeters < MIN_ACCESSIBLE_CLEAR_PATH_METERS ||
        sidewalk.accessibleClearPathMeters > sidewalk.clearWidthMeters + 0.001
      ) {
        issues.push({
          id: `invalid-sidewalk-clear-path-${sidewalk.id}`,
          severity: 'error',
          category: 'geometry',
          objectId: sidewalk.id,
          ...createIssueFocus(road.center, 'Keep frontage and furnishing zones outside a minimum 1.8m accessible clear path.'),
          message: `Sidewalk ${sidewalk.id} must preserve a minimum accessible clear path.`
        });
      }

      if (
        !sidewalk.accessibility.stepFree ||
        !sidewalk.accessibility.clearPathContinuous ||
        !sidewalk.accessibility.wheelchairPassable ||
        sidewalk.runningGradePercent > sidewalk.accessibility.maxRunningGradePercent + 0.001 ||
        sidewalk.crossSlopePercent > sidewalk.accessibility.maxCrossSlopePercent + 0.001 ||
        sidewalk.accessibility.maxRunningGradePercent > MAX_ACCESSIBLE_RUNNING_GRADE_PERCENT ||
        sidewalk.accessibility.maxCrossSlopePercent > MAX_ACCESSIBLE_CROSS_SLOPE_PERCENT
      ) {
        issues.push({
          id: `inaccessible-sidewalk-${sidewalk.id}`,
          severity: 'error',
          category: 'graph',
          objectId: sidewalk.id,
          ...createIssueFocus(road.center, 'Regenerate sidewalk accessibility metadata with step-free continuous routing and compliant grades.'),
          message: `Sidewalk ${sidewalk.id} must expose step-free continuous accessibility metadata.`
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
  const roadIntersectionIdsByRoad = new Map<CityId, CityId[]>();
  for (const intersection of city.intersections) {
    for (const roadId of intersection.connectedRoadIds) {
      roadIntersectionIdsByRoad.set(roadId, [...(roadIntersectionIdsByRoad.get(roadId) ?? []), intersection.id]);
    }
  }
  const slicesById = new Map(city.verticalSlices.map((slice) => [slice.id, slice]));
  const curbZonesById = new Map(city.curbZones.map((curbZone) => [curbZone.id, curbZone]));
  const parcelsByIdForMobility = new Map(city.parcels.map((parcel) => [parcel.id, parcel]));
  const buildingsByIdForMobility = new Map(city.buildings.map((building) => [building.id, building]));
  const freightRoutesById = new Map(city.freightRoutes.map((route) => [route.id, route]));
  const freightLoadingDocksById = new Map(city.freightLoadingDocks.map((dock) => [dock.id, dock]));
  const serviceAlleysById = new Map(city.serviceAlleys.map((alley) => [alley.id, alley]));
  const bikeSegmentsById = new Map(city.bikeSegments.map((segment) => [segment.id, segment]));
  const bikeGraphNodesById = new Map(city.bikeGraphNodes.map((node) => [node.id, node]));
  const bikeParkingById = new Map(city.bikeParking.map((parking) => [parking.id, parking]));
  const bikeConflictZonesById = new Map(city.bikeConflictZones.map((zone) => [zone.id, zone]));
  const navigationGraphNodesById = new Map(city.navigationGraphNodes.map((node) => [node.id, node]));
  const navigationGraphEdgesById = new Map(city.navigationGraphEdges.map((edge) => [edge.id, edge]));
  const accessControlsById = new Map(city.accessControls.map((control) => [control.id, control]));
  const assetBindingsById = new Map(city.assetBindings.map((binding) => [binding.id, binding]));
  validateAssetInventoryRecords(city, issues, assetBindingsById);
  validateMaintenanceOperations(city, issues);
  validatePermitInspectionRecords(city, issues);
  validateCurbActivations(city, issues, { roadsById, curbZonesById, assetBindingsById });
  validatePublicAmenities(city, issues, { roadsById, assetBindingsById });
  const transitRoutesById = new Map(city.transitRoutes.map((route) => [route.id, route]));
  const districtsById = new Map(city.districts.map((district) => [district.id, district]));
  const activeFrontagesById = new Map(city.activeFrontages.map((frontage) => [frontage.id, frontage]));
  const sidewalkGraphNodeIds = new Set(city.sidewalkGraph.nodes.map((node) => node.id));
  const crossingGraphEdgeIds = new Set(
    city.sidewalkGraph.edges
      .filter((edge) => edge.mode === 'crossing' && edge.crossingId)
      .map((edge) => edge.crossingId)
  );

  for (const crossing of city.crossings) {
    const road = roadsById.get(crossing.roadId);
    const intersection = crossing.intersectionId ? intersectionsById.get(crossing.intersectionId) : undefined;

    if (!road) {
      issues.push({
        id: `missing-crossing-road-${crossing.id}-${crossing.roadId}`,
        severity: 'error',
        category: 'identifier',
        objectId: crossing.id,
        message: `Crossing references missing road ${crossing.roadId}.`
      });
    }

    if (crossing.crossingLocation === 'intersection') {
      if (!crossing.intersectionId || !intersection || crossing.parentId !== crossing.intersectionId) {
        issues.push({
          id: `invalid-crossing-intersection-${crossing.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: crossing.id,
          message: `Intersection crossing must reference existing parent intersection ${crossing.intersectionId}.`
        });
      }
    } else if (crossing.parentId !== crossing.roadId || crossing.intersectionId !== undefined) {
      issues.push({
        id: `invalid-midblock-crossing-parent-${crossing.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: crossing.id,
        message: `Midblock crossing ${crossing.id} must be parented to road ${crossing.roadId} without an intersection reference.`
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

    validateCrossingDetails(crossing, road, intersection, issues);

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
    const isDetailedCurbZone = curbZone.managementContext === 'detailed-street';
    const isCitywideCurbZone = curbZone.managementContext === 'citywide';
    const slice = curbZone.sliceId ? slicesById.get(curbZone.sliceId) : undefined;
    const road = roadsById.get(curbZone.roadId);
    const sidewalk = city.objectIndex.objectsById[curbZone.sidewalkId];

    if (isDetailedCurbZone && !slice) {
      issues.push({
        id: `missing-curb-zone-slice-${curbZone.id}-${curbZone.sliceId ?? 'missing'}`,
        severity: 'error',
        category: 'identifier',
        objectId: curbZone.id,
        message: `Detailed curb zone must reference a detailed street slice.`
      });
    }

    if (!isDetailedCurbZone && !isCitywideCurbZone) {
      issues.push({
        id: `invalid-curb-zone-management-context-${curbZone.id}`,
        severity: 'error',
        category: 'config',
        objectId: curbZone.id,
        message: `Curb zone ${curbZone.id} must declare detailed-street or citywide management context.`
      });
    }

    if (isCitywideCurbZone && curbZone.sliceId) {
      issues.push({
        id: `citywide-curb-zone-has-slice-${curbZone.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: curbZone.id,
        message: `Citywide curb zone ${curbZone.id} must not be parented to a detailed street slice.`
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

    if (isDetailedCurbZone && curbZone.tags?.detailedStreetSliceId !== curbZone.sliceId) {
      issues.push({
        id: `missing-curb-zone-slice-tag-${curbZone.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: curbZone.id,
        message: `Curb zone ${curbZone.id} must be tagged with slice ${curbZone.sliceId}.`
      });
    }

    if (curbZone.curbUse === 'parking' && curbZone.management.disabledSpaces < 0) {
      issues.push({
        id: `invalid-curb-zone-disabled-spaces-${curbZone.id}`,
        severity: 'error',
        category: 'graph',
        objectId: curbZone.id,
        message: `Parking curb zone ${curbZone.id} must declare a non-negative disabled-space allocation.`
      });
    }

    if ((curbZone.curbUse === 'emergency' || curbZone.curbUse === 'no-stopping') && !curbZone.management.fireLaneClearance) {
      issues.push({
        id: `curb-zone-blocks-fire-lane-${curbZone.id}`,
        severity: 'error',
        category: 'graph',
        objectId: curbZone.id,
        message: `Emergency and no-stopping curb zones must preserve fire-lane clearance.`
      });
    }

    if (curbZone.curbUse === 'bus-stop' && !curbZone.management.transitStopClearance) {
      issues.push({
        id: `curb-zone-blocks-transit-stop-${curbZone.id}`,
        severity: 'error',
        category: 'graph',
        objectId: curbZone.id,
        message: `Bus-stop curb zones must preserve transit stop clearance.`
      });
    }

    if (curbZone.curbUse === 'loading' && !curbZone.management.loadingDockAccess) {
      issues.push({
        id: `curb-zone-missing-loading-access-${curbZone.id}`,
        severity: 'error',
        category: 'graph',
        objectId: curbZone.id,
        message: `Loading curb zone ${curbZone.id} must expose loading-dock access metadata.`
      });
    }

    if (road && curbZone.curbUse === 'loading') {
      const clearanceIntersectionIds = isDetailedCurbZone && slice ? slice.intersectionIds : roadIntersectionIdsByRoad.get(road.id) ?? [];
      for (const intersectionId of clearanceIntersectionIds) {
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

  for (const segment of city.bikeSegments) {
    const road = roadsById.get(segment.roadId);

    if (!road || segment.parentId !== segment.roadId) {
      issues.push({
        id: `invalid-bike-segment-road-${segment.id}`,
        severity: 'error',
        category: 'graph',
        objectId: segment.id,
        message: `Bike segment ${segment.id} must be parented to existing road ${segment.roadId}.`
      });
    }

    if (segment.startMeters < 0 || segment.endMeters <= segment.startMeters || segment.lengthMeters <= 0 || segment.widthMeters <= 0) {
      issues.push({
        id: `invalid-bike-segment-geometry-${segment.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: segment.id,
        message: `Bike segment ${segment.id} must expose positive range, length, and width.`
      });
    }

    if (segment.facilityKind !== 'shared-street' && !segment.protected && segment.conflictZoneIds.length === 0) {
      issues.push({
        id: `unmitigated-bike-segment-conflicts-${segment.id}`,
        severity: 'error',
        category: 'graph',
        objectId: segment.id,
        message: `Non-protected bike segment ${segment.id} must expose conflict-zone mitigation metadata.`
      });
    }

    for (const conflictId of segment.conflictZoneIds) {
      const conflict = bikeConflictZonesById.get(conflictId);
      if (!conflict || conflict.segmentId !== segment.id) {
        issues.push({
          id: `bike-segment-conflict-mismatch-${segment.id}-${conflictId}`,
          severity: 'error',
          category: 'graph',
          objectId: segment.id,
          message: `Bike segment ${segment.id} references missing or mismatched conflict zone ${conflictId}.`
        });
      }
    }

    for (const parkingId of segment.bikeParkingIds) {
      const parking = bikeParkingById.get(parkingId);
      if (!parking || parking.segmentId !== segment.id) {
        issues.push({
          id: `bike-segment-parking-mismatch-${segment.id}-${parkingId}`,
          severity: 'error',
          category: 'graph',
          objectId: segment.id,
          message: `Bike segment ${segment.id} references missing or mismatched parking ${parkingId}.`
        });
      }
    }
  }

  for (const node of city.bikeGraphNodes) {
    if (!bikeSegmentsById.has(node.segmentId) || node.parentId !== node.segmentId || !roadsById.has(node.roadId)) {
      issues.push({
        id: `invalid-bike-graph-node-${node.id}`,
        severity: 'error',
        category: 'graph',
        objectId: node.id,
        message: `Bike graph node ${node.id} must reference existing road and parent bike segment.`
      });
    }

    if (node.intersectionId && !intersectionsById.has(node.intersectionId)) {
      issues.push({
        id: `invalid-bike-graph-node-intersection-${node.id}-${node.intersectionId}`,
        severity: 'error',
        category: 'graph',
        objectId: node.id,
        message: `Bike graph node ${node.id} references missing intersection ${node.intersectionId}.`
      });
    }
  }

  for (const edge of city.bikeGraphEdges) {
    const fromNode = bikeGraphNodesById.get(edge.fromNodeId);
    const toNode = bikeGraphNodesById.get(edge.toNodeId);

    if (!bikeSegmentsById.has(edge.segmentId) || edge.parentId !== edge.segmentId || !fromNode || !toNode || edge.lengthMeters <= 0) {
      issues.push({
        id: `invalid-bike-graph-edge-${edge.id}`,
        severity: 'error',
        category: 'graph',
        objectId: edge.id,
        message: `Bike graph edge ${edge.id} must link existing bike graph nodes on a positive-length segment.`
      });
    }

    if (fromNode && toNode && (fromNode.segmentId !== edge.segmentId || toNode.segmentId !== edge.segmentId)) {
      issues.push({
        id: `bike-graph-edge-segment-mismatch-${edge.id}`,
        severity: 'error',
        category: 'graph',
        objectId: edge.id,
        message: `Bike graph edge ${edge.id} endpoints must belong to segment ${edge.segmentId}.`
      });
    }
  }

  for (const parking of city.bikeParking) {
    const furniture = parking.streetFurnitureId ? city.objectIndex.objectsById[parking.streetFurnitureId] : undefined;
    const sidewalk = city.objectIndex.objectsById[parking.sidewalkId];

    if (!bikeSegmentsById.has(parking.segmentId) || !roadsById.has(parking.roadId) || !sidewalk || sidewalk.kind !== 'sidewalk') {
      issues.push({
        id: `invalid-bike-parking-reference-${parking.id}`,
        severity: 'error',
        category: 'graph',
        objectId: parking.id,
        message: `Bike parking ${parking.id} must reference existing bike segment, road, and sidewalk.`
      });
    }

    if (parking.streetFurnitureId && (!furniture || furniture.kind !== 'street-furniture' || furniture.parentId !== parking.sidewalkId)) {
      issues.push({
        id: `invalid-bike-parking-furniture-${parking.id}`,
        severity: 'error',
        category: 'graph',
        objectId: parking.id,
        message: `Bike parking ${parking.id} must be derived from bike-rack street furniture on its sidewalk.`
      });
    }

    if (parking.capacity <= 0) {
      issues.push({
        id: `invalid-bike-parking-capacity-${parking.id}`,
        severity: 'error',
        category: 'graph',
        objectId: parking.id,
        message: `Bike parking ${parking.id} must expose positive capacity.`
      });
    }
  }

  for (const signal of city.bikeSignals) {
    if (!intersectionsById.has(signal.intersectionId) || signal.parentId !== signal.intersectionId || !bikeSegmentsById.has(signal.segmentId)) {
      issues.push({
        id: `invalid-bike-signal-reference-${signal.id}`,
        severity: 'error',
        category: 'graph',
        objectId: signal.id,
        message: `Bike signal ${signal.id} must attach to an intersection and bike segment.`
      });
    }

    if (signal.protectedPhaseSeconds <= 0 || signal.conflictZoneIds.length === 0) {
      issues.push({
        id: `invalid-bike-signal-phase-${signal.id}`,
        severity: 'error',
        category: 'graph',
        objectId: signal.id,
        message: `Bike signal ${signal.id} must expose positive protected phase timing and conflict links.`
      });
    }
  }

  for (const conflict of city.bikeConflictZones) {
    if (!bikeSegmentsById.has(conflict.segmentId) || conflict.parentId !== conflict.segmentId || !roadsById.has(conflict.roadId)) {
      issues.push({
        id: `invalid-bike-conflict-reference-${conflict.id}`,
        severity: 'error',
        category: 'graph',
        objectId: conflict.id,
        message: `Bike conflict ${conflict.id} must reference an existing road and parent bike segment.`
      });
    }

    if (conflict.severity === 'high' && conflict.mitigation === 'paint') {
      issues.push({
        id: `unsafe-bike-conflict-mitigation-${conflict.id}`,
        severity: 'error',
        category: 'graph',
        objectId: conflict.id,
        message: `High-severity bike conflict ${conflict.id} cannot rely on paint-only mitigation.`
      });
    }
  }

  for (const node of city.navigationGraphNodes) {
    const source = city.objectIndex.objectsById[node.sourceObjectId];

    if (!source || source.kind !== node.sourceObjectKind || node.parentId !== node.sourceObjectId) {
      issues.push({
        id: `invalid-navigation-node-source-${node.id}`,
        severity: 'error',
        category: 'graph',
        objectId: node.id,
        message: `Navigation graph node ${node.id} must reference and parent to source object ${node.sourceObjectId}.`
      });
    }

    if (node.roadId && !roadsById.has(node.roadId)) {
      issues.push({
        id: `invalid-navigation-node-road-${node.id}-${node.roadId}`,
        severity: 'error',
        category: 'graph',
        objectId: node.id,
        message: `Navigation graph node ${node.id} references missing road ${node.roadId}.`
      });
    }

    if (node.intersectionId && !intersectionsById.has(node.intersectionId)) {
      issues.push({
        id: `invalid-navigation-node-intersection-${node.id}-${node.intersectionId}`,
        severity: 'error',
        category: 'graph',
        objectId: node.id,
        message: `Navigation graph node ${node.id} references missing intersection ${node.intersectionId}.`
      });
    }

    for (const transferNodeId of node.transferNodeIds) {
      if (!navigationGraphNodesById.has(transferNodeId)) {
        issues.push({
          id: `invalid-navigation-node-transfer-${node.id}-${transferNodeId}`,
          severity: 'error',
          category: 'graph',
          objectId: node.id,
          message: `Navigation graph node ${node.id} references missing transfer node ${transferNodeId}.`
        });
      }
    }
  }

  for (const edge of city.navigationGraphEdges) {
    const source = city.objectIndex.objectsById[edge.sourceObjectId];
    const fromNode = navigationGraphNodesById.get(edge.fromNodeId);
    const toNode = navigationGraphNodesById.get(edge.toNodeId);

    if (!source || source.kind !== edge.sourceObjectKind || edge.parentId !== edge.sourceObjectId) {
      issues.push({
        id: `invalid-navigation-edge-source-${edge.id}`,
        severity: 'error',
        category: 'graph',
        objectId: edge.id,
        message: `Navigation graph edge ${edge.id} must reference and parent to source object ${edge.sourceObjectId}.`
      });
    }

    if (!fromNode || !toNode || fromNode.mode !== edge.mode || toNode.mode !== edge.mode || edge.lengthMeters <= 0 || edge.travelTimeSeconds <= 0) {
      issues.push({
        id: `invalid-navigation-edge-nodes-${edge.id}`,
        severity: 'error',
        category: 'graph',
        objectId: edge.id,
        message: `Navigation graph edge ${edge.id} must connect existing same-mode nodes with positive length and travel time.`
      });
    }

    for (const roadId of edge.roadIds) {
      if (!roadsById.has(roadId)) {
        issues.push({
          id: `invalid-navigation-edge-road-${edge.id}-${roadId}`,
          severity: 'error',
          category: 'graph',
          objectId: edge.id,
          message: `Navigation graph edge ${edge.id} references missing road ${roadId}.`
        });
      }
    }

    for (const laneId of edge.laneIds) {
      const lane = city.objectIndex.objectsById[laneId];
      if (!lane || lane.kind !== 'lane') {
        issues.push({
          id: `invalid-navigation-edge-lane-${edge.id}-${laneId}`,
          severity: 'error',
          category: 'graph',
          objectId: edge.id,
          message: `Navigation graph edge ${edge.id} references missing lane ${laneId}.`
        });
      }
    }

    for (const accessControlId of edge.accessControlIds ?? []) {
      const control = accessControlsById.get(accessControlId);
      if (!control || !control.navigationGraphEdgeIds.includes(edge.id)) {
        issues.push({
          id: `invalid-navigation-edge-access-control-${edge.id}-${accessControlId}`,
          severity: 'error',
          category: 'graph',
          objectId: edge.id,
          message: `Navigation graph edge ${edge.id} references missing or unlinked access control ${accessControlId}.`
        });
      }
      if (!edge.restrictions.some((restriction) => restriction === `access-control:${accessControlId}`)) {
        issues.push({
          id: `missing-navigation-edge-access-restriction-${edge.id}-${accessControlId}`,
          severity: 'error',
          category: 'graph',
          objectId: edge.id,
          message: `Navigation graph edge ${edge.id} must expose an access-control restriction for ${accessControlId}.`
        });
      }
    }
  }

  for (const route of city.navigationRoutes) {
    const fromNode = navigationGraphNodesById.get(route.fromNodeId);
    const toNode = navigationGraphNodesById.get(route.toNodeId);

    if (!fromNode || !toNode || fromNode.mode !== route.mode || toNode.mode !== route.mode) {
      issues.push({
        id: `invalid-navigation-route-endpoints-${route.id}`,
        severity: 'error',
        category: 'graph',
        objectId: route.id,
        message: `Navigation route ${route.id} must expose existing same-mode origin and destination nodes.`
      });
    }

    if (route.nodeIds.length < 2 || route.edgeIds.length === 0 || route.lengthMeters <= 0 || route.estimatedTravelTimeSeconds <= 0) {
      issues.push({
        id: `invalid-navigation-route-shape-${route.id}`,
        severity: 'error',
        category: 'graph',
        objectId: route.id,
        message: `Navigation route ${route.id} must expose route nodes, edges, positive length, and positive travel time.`
      });
    }

    for (const nodeId of route.nodeIds) {
      const node = navigationGraphNodesById.get(nodeId);
      if (!node || node.mode !== route.mode) {
        issues.push({
          id: `invalid-navigation-route-node-${route.id}-${nodeId}`,
          severity: 'error',
          category: 'graph',
          objectId: route.id,
          message: `Navigation route ${route.id} references missing or wrong-mode node ${nodeId}.`
        });
      }
    }

    for (const edgeId of route.edgeIds) {
      const edge = navigationGraphEdgesById.get(edgeId);
      if (!edge || edge.mode !== route.mode) {
        issues.push({
          id: `invalid-navigation-route-edge-${route.id}-${edgeId}`,
          severity: 'error',
          category: 'graph',
          objectId: route.id,
          message: `Navigation route ${route.id} references missing or wrong-mode edge ${edgeId}.`
        });
      }
    }
  }

  for (const dock of city.freightLoadingDocks) {
    const building = buildingsByIdForMobility.get(dock.buildingId);
    const parcel = parcelsByIdForMobility.get(dock.parcelId);
    const road = roadsById.get(dock.roadId);
    const curbZone = curbZonesById.get(dock.curbZoneId);
    const serviceAlley = dock.serviceAlleyId ? serviceAlleysById.get(dock.serviceAlleyId) : undefined;

    if (!building || dock.parentId !== dock.buildingId) {
      issues.push({
        id: `invalid-freight-dock-building-${dock.id}`,
        severity: 'error',
        category: 'graph',
        objectId: dock.id,
        message: `Freight loading dock ${dock.id} must be parented to existing building ${dock.buildingId}.`
      });
    }

    if (!parcel || building?.parcelId !== dock.parcelId || parcel.districtId !== dock.districtId) {
      issues.push({
        id: `invalid-freight-dock-parcel-${dock.id}`,
        severity: 'error',
        category: 'graph',
        objectId: dock.id,
        message: `Freight loading dock ${dock.id} must reference its building parcel and district.`
      });
    }

    if (!road || !road.lanes.some((lane) => lane.allowedModes.includes('freight'))) {
      issues.push({
        id: `invalid-freight-dock-road-${dock.id}`,
        severity: 'error',
        category: 'graph',
        objectId: dock.id,
        message: `Freight loading dock ${dock.id} must connect to a freight-capable road.`
      });
    }

    if (!curbZone || curbZone.curbUse !== 'loading' || !curbZone.management.loadingDockAccess || curbZone.roadId !== dock.roadId) {
      issues.push({
        id: `invalid-freight-dock-curb-zone-${dock.id}`,
        severity: 'error',
        category: 'graph',
        objectId: dock.id,
        message: `Freight loading dock ${dock.id} must attach to a loading curb zone on its road.`
      });
    }

    if (dock.serviceAlleyId && (!serviceAlley || !serviceAlley.loadingDockIds.includes(dock.id))) {
      issues.push({
        id: `invalid-freight-dock-service-alley-${dock.id}`,
        severity: 'error',
        category: 'graph',
        objectId: dock.id,
        message: `Freight loading dock ${dock.id} references missing or unlinked service alley ${dock.serviceAlleyId}.`
      });
    }

    if (!isFiniteNumber(dock.position.x) || !isFiniteNumber(dock.position.z) || dock.loadingBays <= 0 || dock.lastMileRadiusMeters <= 0) {
      issues.push({
        id: `invalid-freight-dock-geometry-${dock.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: dock.id,
        message: `Freight loading dock ${dock.id} must expose finite position, positive bays, and positive last-mile radius.`
      });
    }

    validateFreightDeliveryWindow(dock.id, dock.deliveryWindow, issues);

    if (dock.allowedVehicleClasses.length === 0 || dock.linkedRouteIds.length === 0) {
      issues.push({
        id: `invalid-freight-dock-routing-${dock.id}`,
        severity: 'error',
        category: 'graph',
        objectId: dock.id,
        message: `Freight loading dock ${dock.id} must declare vehicle classes and at least one linked freight route.`
      });
    }

    for (const routeId of dock.linkedRouteIds) {
      const route = freightRoutesById.get(routeId);

      if (!route || !route.loadingDockIds.includes(dock.id)) {
        issues.push({
          id: `freight-dock-route-mismatch-${dock.id}-${routeId}`,
          severity: 'error',
          category: 'graph',
          objectId: dock.id,
          message: `Freight dock ${dock.id} and route ${routeId} must reference each other.`
        });
      }
    }
  }

  for (const route of city.freightRoutes) {
    validateFreightDeliveryWindow(route.id, route.deliveryWindow, issues);

    if (route.roadIds.length === 0 || route.laneIds.length === 0 || route.loadingDockIds.length === 0 || route.polyline.length < 2) {
      issues.push({
        id: `invalid-freight-route-shape-${route.id}`,
        severity: 'error',
        category: 'graph',
        objectId: route.id,
        message: `Freight route ${route.id} must include roads, freight lanes, loading docks, and a polyline.`
      });
    }

    for (const roadId of route.roadIds) {
      const road = roadsById.get(roadId);

      if (!road || !road.lanes.some((lane) => lane.allowedModes.includes('freight'))) {
        issues.push({
          id: `invalid-freight-route-road-${route.id}-${roadId}`,
          severity: 'error',
          category: 'graph',
          objectId: route.id,
          message: `Freight route ${route.id} references missing or freight-restricted road ${roadId}.`
        });
      }
    }

    for (const laneId of route.laneIds) {
      const lane = city.objectIndex.objectsById[laneId];

      if (!lane || lane.kind !== 'lane' || !lane.allowedModes.includes('freight')) {
        issues.push({
          id: `invalid-freight-route-lane-${route.id}-${laneId}`,
          severity: 'error',
          category: 'graph',
          objectId: route.id,
          message: `Freight route ${route.id} references missing or freight-restricted lane ${laneId}.`
        });
      }
    }

    for (const dockId of route.loadingDockIds) {
      const dock = freightLoadingDocksById.get(dockId);

      if (!dock || !dock.linkedRouteIds.includes(route.id)) {
        issues.push({
          id: `freight-route-dock-mismatch-${route.id}-${dockId}`,
          severity: 'error',
          category: 'graph',
          objectId: route.id,
          message: `Freight route ${route.id} and dock ${dockId} must reference each other.`
        });
      }
    }

    if (
      route.truckRestriction.maxLengthMeters <= 0 ||
      route.truckRestriction.maxWeightTonnes <= 0 ||
      route.allowedVehicleClasses.length === 0 ||
      route.lastMileStopCount < route.loadingDockIds.length
    ) {
      issues.push({
        id: `invalid-freight-route-restriction-${route.id}`,
        severity: 'error',
        category: 'graph',
        objectId: route.id,
        message: `Freight route ${route.id} must expose positive truck restrictions, vehicle classes, and last-mile stop counts.`
      });
    }
  }

  for (const alley of city.serviceAlleys) {
    validateFreightDeliveryWindow(alley.id, alley.deliveryWindow, issues);

    if (!roadsById.has(alley.roadId) || alley.parentId !== alley.roadId || alley.centerline.length < 2 || alley.widthMeters <= 0) {
      issues.push({
        id: `invalid-service-alley-road-${alley.id}`,
        severity: 'error',
        category: 'graph',
        objectId: alley.id,
        message: `Service alley ${alley.id} must be parented to a road and expose a positive-width centerline.`
      });
    }

    for (const dockId of alley.loadingDockIds) {
      const dock = freightLoadingDocksById.get(dockId);

      if (!dock || dock.serviceAlleyId !== alley.id) {
        issues.push({
          id: `service-alley-dock-mismatch-${alley.id}-${dockId}`,
          severity: 'error',
          category: 'graph',
          objectId: alley.id,
          message: `Service alley ${alley.id} must only list loading docks that point back to it.`
        });
      }
    }
  }

  for (const device of city.trafficCalmingDevices) {
    const slice = slicesById.get(device.sliceId);
    const road = roadsById.get(device.roadId);
    const assetBinding = assetBindingsById.get(device.assetBindingId);

    if (!road || device.parentId !== device.roadId) {
      issues.push({
        id: `invalid-traffic-calming-road-${device.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: device.id,
        message: `Traffic calming device ${device.id} must reference parent road ${device.roadId}.`
      });
    }

    if (!slice || device.tags?.detailedStreetSliceId !== device.sliceId) {
      issues.push({
        id: `invalid-traffic-calming-slice-${device.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: device.id,
        message: `Traffic calming device ${device.id} must belong to a detailed street slice.`
      });
    }

    if (device.intersectionId && !intersectionsById.has(device.intersectionId)) {
      issues.push({
        id: `missing-traffic-calming-intersection-${device.id}-${device.intersectionId}`,
        severity: 'error',
        category: 'identifier',
        objectId: device.id,
        message: `Traffic calming device ${device.id} references missing intersection ${device.intersectionId}.`
      });
    }

    if (device.crossingId && !hasObjectId(city, device.crossingId)) {
      issues.push({
        id: `missing-traffic-calming-crossing-${device.id}-${device.crossingId}`,
        severity: 'error',
        category: 'identifier',
        objectId: device.id,
        message: `Traffic calming device ${device.id} references missing crossing ${device.crossingId}.`
      });
    }

    for (const curbZoneId of device.curbZoneIds) {
      if (!curbZonesById.has(curbZoneId)) {
        issues.push({
          id: `missing-traffic-calming-curb-zone-${device.id}-${curbZoneId}`,
          severity: 'error',
          category: 'identifier',
          objectId: device.id,
          message: `Traffic calming device ${device.id} references missing curb zone ${curbZoneId}.`
        });
      }
    }

    if (
      !isFiniteNumber(device.center.x) ||
      !isFiniteNumber(device.center.z) ||
      device.positionOnRoadMeters < 0 ||
      (road && device.positionOnRoadMeters > road.length + 0.001) ||
      device.size.x <= 0 ||
      device.size.z <= 0 ||
      device.heightMeters <= 0
    ) {
      issues.push({
        id: `invalid-traffic-calming-geometry-${device.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: device.id,
        message: 'Traffic calming devices must have finite center coordinates, positive dimensions, and stay inside the parent road.'
      });
    }

    if (road && (device.designSpeedKph !== road.designSpeedKph || device.targetSpeedKph >= road.designSpeedKph)) {
      issues.push({
        id: `invalid-traffic-calming-speed-policy-${device.id}`,
        severity: 'error',
        category: 'graph',
        objectId: device.id,
        message: `Traffic calming device ${device.id} must reduce design speed for road ${road.id}.`
      });
    }

    if (device.emergencyVehicleClearanceMeters < 3.5 || device.accessibleClearPathMeters < 1.8) {
      issues.push({
        id: `traffic-calming-blocks-access-${device.id}`,
        severity: 'error',
        category: 'graph',
        objectId: device.id,
        message: `Traffic calming device ${device.id} must preserve emergency clearance and accessible clear path.`
      });
    }

    if (!assetBinding || assetBinding.objectKind !== 'traffic-calming-device') {
      issues.push({
        id: `invalid-traffic-calming-asset-binding-${device.id}`,
        severity: 'error',
        category: 'asset',
        objectId: device.id,
        message: `Traffic calming device ${device.id} must reference a traffic-calming render binding.`
      });
    }
  }

  for (const node of city.sidewalkGraph.nodes) {
    if (node.intersectionId) {
      if (!hasObjectId(city, node.intersectionId) || node.parentId !== node.intersectionId) {
        issues.push({
          id: `invalid-sidewalk-node-intersection-${node.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: node.id,
          message: `Sidewalk graph node must reference parent intersection ${node.intersectionId}.`
        });
      }
    } else if (node.crossingId) {
      if (!hasObjectId(city, node.crossingId) || node.parentId !== node.crossingId) {
        issues.push({
          id: `invalid-sidewalk-node-crossing-${node.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: node.id,
          message: `Midblock sidewalk graph node must reference parent crossing ${node.crossingId}.`
        });
      }
    } else {
      issues.push({
        id: `invalid-sidewalk-node-anchor-${node.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: node.id,
        message: 'Sidewalk graph node must reference a parent intersection or crossing.'
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

    if (!node.accessible || !node.curbRampId || !node.tactileCueId) {
      issues.push({
        id: `inaccessible-sidewalk-node-${node.id}`,
        severity: 'error',
        category: 'graph',
        objectId: node.id,
        message: 'Sidewalk graph nodes must expose accessible curb-ramp and tactile-cue anchors.'
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

    if (
      !edge.accessible ||
      edge.minClearWidthMeters < MIN_ACCESSIBLE_CLEAR_PATH_METERS ||
      edge.maxGradePercent > MAX_ACCESSIBLE_RUNNING_GRADE_PERCENT
    ) {
      issues.push({
        id: `inaccessible-sidewalk-edge-${edge.id}`,
        severity: 'error',
        category: 'graph',
        objectId: edge.id,
        message: 'Sidewalk graph edges must preserve accessible clear width and running grade continuity.'
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

    if (edge.mode === 'crossing' && (!edge.hasCurbRampConnection || !edge.hasTactileCueConnection)) {
      issues.push({
        id: `inaccessible-crossing-edge-${edge.id}`,
        severity: 'error',
        category: 'graph',
        objectId: edge.id,
        message: 'Crossing graph edges must connect curb ramps and tactile cues on both sidewalk endpoints.'
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

  function validateCrossingDetails(
    crossing: ValidationCrossing,
    road: ValidationRoad | undefined,
    intersection: ValidationIntersection | undefined,
    targetIssues: ValidationIssue[]
  ): void {
    if (!includesValue(CROSSING_LOCATIONS, crossing.crossingLocation)) {
      targetIssues.push({
        id: `invalid-crossing-location-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Crossing ${crossing.id} must declare an intersection or midblock location.`
      });
    }

    if (!includesValue(CROSSWALK_TYPES, crossing.crosswalkType)) {
      targetIssues.push({
        id: `invalid-crosswalk-type-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Crossing ${crossing.id} must declare a supported crosswalk type.`
      });
    }

    if (!includesValue(CROSSING_PRIORITIES, crossing.priority)) {
      targetIssues.push({
        id: `invalid-crossing-priority-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Crossing ${crossing.id} must declare a supported crossing priority.`
      });
    }

    if (crossing.curbRamps.length !== 2 || crossing.curbRamps[0] !== 'left' || crossing.curbRamps[1] !== 'right') {
      targetIssues.push({
        id: `invalid-crossing-curb-ramps-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Crossing ${crossing.id} must connect both sidewalks with left and right curb ramps.`
      });
    }

    if (
      crossing.curbRampIds.length !== 2 ||
      crossing.tactileCueIds.length !== 2 ||
      new Set(crossing.curbRampIds).size !== 2 ||
      new Set(crossing.tactileCueIds).size !== 2
    ) {
      targetIssues.push({
        id: `invalid-crossing-accessibility-fixtures-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Crossing ${crossing.id} must expose stable curb-ramp and tactile-cue IDs for both sidewalk endpoints.`
      });
    }

    if (!crossing.tactileCues) {
      targetIssues.push({
        id: `missing-crossing-tactile-cues-${crossing.id}`,
        severity: 'error',
        category: 'asset',
        objectId: crossing.id,
        message: `Crossing ${crossing.id} must expose tactile cues.`
      });
    }

    if (crossing.crosswalkType === 'raised-table' && !crossing.raisedCrossing) {
      targetIssues.push({
        id: `raised-crosswalk-not-raised-${crossing.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: crossing.id,
        message: `Raised-table crossing ${crossing.id} must be marked as a raised crossing.`
      });
    }

    if (road) {
      const profile = streetProfilesById.get(road.streetProfileId);
      const expectedRefuge = Boolean(profile?.median);

      if (crossing.hasRefugeIsland !== expectedRefuge) {
        targetIssues.push({
          id: `crossing-refuge-profile-mismatch-${crossing.id}`,
          severity: 'error',
          category: 'graph',
          objectId: crossing.id,
          message: `Crossing ${crossing.id} refuge island flag must follow road profile ${road.streetProfileId}.`
        });
      }
    }

    if (crossing.signalized) {
      const signalPhase = crossing.signalPhase;

      if (
        crossing.priority !== 'signal-protected' ||
        !signalPhase ||
        signalPhase.walkSeconds <= 0 ||
        signalPhase.clearanceSeconds <= 0 ||
        signalPhase.leadingPedestrianIntervalSeconds < 0
      ) {
        targetIssues.push({
          id: `invalid-crossing-signal-phase-${crossing.id}`,
          severity: 'error',
          category: 'graph',
          objectId: crossing.id,
          message: `Signalized crossing ${crossing.id} must declare protected priority and positive pedestrian signal timing.`
        });
      }
    } else if (crossing.signalPhase) {
      targetIssues.push({
        id: `unsignalized-crossing-has-signal-phase-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Unsignalized crossing ${crossing.id} must not declare a pedestrian signal phase.`
      });
    }

    if (intersection && crossing.signalized !== (intersection.signalExpectation === 'signalized')) {
      targetIssues.push({
        id: `crossing-signal-intersection-mismatch-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Crossing ${crossing.id} signalization must match intersection ${intersection.id}.`
      });
    }

    if (
      crossing.crossingLocation === 'midblock' &&
      (crossing.priority !== 'pedestrian-priority' || !crossing.raisedCrossing || crossing.signalized)
    ) {
      targetIssues.push({
        id: `invalid-midblock-crossing-detail-${crossing.id}`,
        severity: 'error',
        category: 'graph',
        objectId: crossing.id,
        message: `Midblock crossing ${crossing.id} must be a raised pedestrian-priority unsignalized crossing.`
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
    const slice = streetLight.sliceId ? slicesById.get(streetLight.sliceId) : undefined;
    const road = roadsById.get(streetLight.roadId);
    const sidewalk = city.objectIndex.objectsById[streetLight.sidewalkId];
    const curbZone = streetLight.curbZoneId ? curbZonesById.get(streetLight.curbZoneId) : undefined;

    if (streetLight.placementContext === 'detailed-street' && !slice) {
      issues.push({
        id: `missing-street-light-slice-${streetLight.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetLight.id,
        message: `Street light ${streetLight.id} must reference a detailed street slice.`
      });
    }

    if (streetLight.placementContext === 'citywide-street' && streetLight.sliceId) {
      issues.push({
        id: `invalid-citywide-street-light-slice-${streetLight.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetLight.id,
        message: `Citywide street light ${streetLight.id} should not reference a detailed street slice.`
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

    if (streetLight.placementContext === 'detailed-street' && (!curbZone || curbZone.curbUse === 'no-stopping')) {
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
      !isFiniteNumber(streetLight.alongRoadMeters) ||
      !isFiniteNumber(streetLight.offsetFromRoadEdgeMeters) ||
      streetLight.heightMeters <= 0 ||
      streetLight.poleRadiusMeters <= 0 ||
      streetLight.armLengthMeters <= 0 ||
      streetLight.fixtureLengthMeters <= 0 ||
      streetLight.coverageRadiusMeters <= 0 ||
      streetLight.coverage.radiusMeters <= 0 ||
      streetLight.coverage.overlapScore < 0 ||
      streetLight.coverage.overlapScore > 1
    ) {
      issues.push({
        id: `invalid-street-light-geometry-${streetLight.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: streetLight.id,
        message: 'Street light must have finite position and positive pole, fixture, arm, and coverage dimensions.'
      });
    }

    if (
      streetLight.nightSafety.targetIlluminanceLux <= 0 ||
      streetLight.nightSafety.estimatedIlluminanceLux <= 0 ||
      streetLight.nightSafety.darkPathRisk === 'high' ||
      (streetLight.coverage.criticalPedestrianPath &&
        streetLight.nightSafety.estimatedIlluminanceLux < streetLight.nightSafety.targetIlluminanceLux)
    ) {
      issues.push({
        id: `dark-critical-street-light-path-${streetLight.id}`,
        severity: streetLight.coverage.criticalPedestrianPath ? 'error' : 'warning',
        category: 'utility-coverage',
        objectId: streetLight.id,
        ...createIssueFocus(streetLight.position, `Increase public lighting coverage near ${streetLight.id}.`),
        message: `Street light ${streetLight.id} must meet night-safety illuminance for its public path role.`
      });
    }

    if (!streetLight.glareControl.shielded || streetLight.glareControl.glareRating === 'high') {
      issues.push({
        id: `high-glare-street-light-${streetLight.id}`,
        severity: 'warning',
        category: 'utility-coverage',
        objectId: streetLight.id,
        ...createIssueFocus(streetLight.position, `Use a shielded cutoff fixture for ${streetLight.id}.`),
        message: `Street light ${streetLight.id} should use glare-controlled fixtures.`
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

    if (streetLight.placementContext === 'detailed-street' && streetLight.tags?.detailedStreetSliceId !== streetLight.sliceId) {
      issues.push({
        id: `missing-street-light-slice-tag-${streetLight.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetLight.id,
        message: `Street light ${streetLight.id} must be tagged with slice ${streetLight.sliceId}.`
      });
    }
  }
  validatePublicLightingCoverage(city.streetLights, roadsById, issues);

  for (const streetFurniture of city.streetFurniture) {
    const isDetailedStreetFurniture = streetFurniture.placementContext === 'detailed-street';
    const isCitywideStreetFurniture = streetFurniture.placementContext === 'citywide-street';
    const slice = streetFurniture.sliceId ? slicesById.get(streetFurniture.sliceId) : undefined;
    const road = roadsById.get(streetFurniture.roadId);
    const sidewalk = city.objectIndex.objectsById[streetFurniture.sidewalkId];
    const curbZone = streetFurniture.curbZoneId ? curbZonesById.get(streetFurniture.curbZoneId) : undefined;
    const binding = assetBindingsById.get(streetFurniture.assetBindingId);
    const sidewalkFurnishingZone =
      sidewalk && sidewalk.kind === 'sidewalk' ? sidewalk.furnishingZoneMeters : undefined;
    const objectStartMeters = streetFurniture.alongRoadMeters - streetFurniture.clearanceEnvelope.lengthMeters / 2;
    const objectEndMeters = streetFurniture.alongRoadMeters + streetFurniture.clearanceEnvelope.lengthMeters / 2;

    if (!isDetailedStreetFurniture && !isCitywideStreetFurniture) {
      issues.push({
        id: `invalid-street-furniture-placement-context-${streetFurniture.id}`,
        severity: 'error',
        category: 'config',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must declare a supported placement context.`
      });
    }

    if (isDetailedStreetFurniture && !slice) {
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

    if (isDetailedStreetFurniture && (!curbZone || curbZone.curbUse === 'no-stopping')) {
      issues.push({
        id: `invalid-street-furniture-curb-zone-${streetFurniture.id}`,
        severity: 'error',
        category: 'graph',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must reference an active curb zone.`
      });
    } else if (curbZone && (
      curbZone.sliceId !== streetFurniture.sliceId ||
      curbZone.roadId !== streetFurniture.roadId ||
      curbZone.sidewalkId !== streetFurniture.sidewalkId
    )) {
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
      streetFurniture.clearanceEnvelope.lengthMeters <= 0 ||
      streetFurniture.clearPathWidthMeters < 1.8 ||
      streetFurniture.crossingClearanceMeters <= 0 ||
      streetFurniture.visibilityClearanceMeters <= 0
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

    if (!curbZone && road && (objectStartMeters < -0.001 || objectEndMeters > road.length + 0.001)) {
      issues.push({
        id: `street-furniture-outside-road-segment-${streetFurniture.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: streetFurniture.id,
        message: `Citywide street furniture ${streetFurniture.id} clearance envelope must stay inside road ${road.id}.`
      });
    }

    if (road) {
      const roadIntersectionIds = new Set(
        isDetailedStreetFurniture && slice ? slice.intersectionIds : roadIntersectionIdsByRoad.get(road.id) ?? []
      );

      for (const intersectionId of roadIntersectionIds) {
        const intersection = intersectionsById.get(intersectionId);
        const crossingOffset = intersection ? getRoadOffsetMeters(road, intersection.center) : undefined;

        if (
          crossingOffset !== undefined &&
          rangesOverlap(
            objectStartMeters,
            objectEndMeters,
            crossingOffset - streetFurniture.crossingClearanceMeters,
            crossingOffset + streetFurniture.crossingClearanceMeters
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

    if (
      streetFurniture.furnitureType === 'bus-shelter' &&
      ((curbZone && curbZone.curbUse !== 'bus-stop') || (!curbZone && (!road?.transitEligible || !streetFurniture.transitStopId)))
    ) {
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

    if (streetFurniture.signFace) {
      validateStreetFurnitureSignFace(
        streetFurniture,
        transitRoutesById,
        districtsById,
        activeFrontagesById,
        roadsById,
        issues
      );
    }

    if (isDetailedStreetFurniture && streetFurniture.tags?.detailedStreetSliceId !== streetFurniture.sliceId) {
      issues.push({
        id: `missing-street-furniture-slice-tag-${streetFurniture.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetFurniture.id,
        message: `Street furniture ${streetFurniture.id} must be tagged with slice ${streetFurniture.sliceId}.`
      });
    }
  }

  validateGreenStormwaterFeatures(city, issues, {
    roadsById,
    assetBindingsById
  });

  validateTransitNetwork(city, issues, roadsById, assetBindingsById);
  const parcelsById = new Map(city.parcels.map((parcel) => [parcel.id, parcel]));
  const blocksById = new Map(city.blocks.map((block) => [block.id, block]));
  const zoningById = new Map(city.zoningDistricts.map((zoning) => [zoning.id, zoning]));
  const cadastreRecordsById = new Map(city.cadastreRecords.map((record) => [record.id, record]));

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

    const cadastreRecord = cadastreRecordsById.get(parcel.cadastreRecordId);
    if (!cadastreRecord || cadastreRecord.parcelId !== parcel.id) {
      issues.push({
        id: `missing-parcel-cadastre-record-${parcel.id}`,
        severity: 'error',
        category: 'land',
        objectId: parcel.id,
        ...createIssueFocus(parcel.center, `Generate cadastre-record-${parcel.id} and link ${parcel.id}.cadastreRecordId to it.`),
        message: `Parcel ${parcel.id} must reference a cadastre record that points back to the parcel.`
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

    validateBuildingTypology(building, issues);
    validateBuildingFootprintGrammar(building, parcel, issues);
    validateBuildingStructureShell(building, issues);
    validateBuildingFacadeGrammar(building, issues);
    validateBuildingRoofGrammar(building, issues);
  }

  validateBuildingTopography(city, issues);
  validateBuildingSoilGeology(city, issues);

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

  validateParkExpansion(city, issues, assetBindingsById);
  validatePlazaModel(city, issues, assetBindingsById);
  validateWaterfrontOpenSpaces(city, issues, assetBindingsById);
  validateCivicAnchors(city, issues, assetBindingsById);
  validateCommunityAnchors(city, issues, assetBindingsById);
  validateCultureAnchors(city, issues, assetBindingsById);
  validateGovernmentAnchors(city, issues, assetBindingsById);
  validateEducationAnchors(city, issues, assetBindingsById);
  validateHealthcareAnchors(city, issues, assetBindingsById);
  validateEmergencyServiceAnchors(city, issues, assetBindingsById);
  validateWaterTransportAccess(city, issues, assetBindingsById);

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

      const isDetailedStreetTree = tree.curbZoneId !== undefined || tree.tags?.detailedStreetSliceId !== undefined;

      if (isDetailedStreetTree && (!tree.sliceId || !slicesById.has(tree.sliceId))) {
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

      if (tree.curbZoneId && (!curbZone || curbZone.curbUse === 'no-stopping')) {
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

      if (isDetailedStreetTree && tree.tags?.detailedStreetSliceId !== tree.sliceId) {
        issues.push({
          id: `missing-street-tree-slice-tag-${tree.id}`,
          severity: 'error',
          category: 'identifier',
          objectId: tree.id,
          message: `Street tree ${tree.id} must be tagged with slice ${tree.sliceId}.`
        });
      }
    }

    validatePlantingModel(tree, issues);
  }

  return {
    passed: issues.every((issue) => issue.severity !== 'error'),
    issues
  };
}

function hasObjectId(city: GeneratedCityForValidation, id: string): boolean {
  return hasCityObject(city.objectIndex, id);
}

function validatePlantingModel(tree: GeneratedCityForValidation['trees'][number], issues: ValidationIssue[]): void {
  if (!['street-tree', 'park-grove', 'raised-planter'].includes(tree.plantingForm)) {
    issues.push({
      id: `invalid-tree-planting-form-${tree.id}`,
      severity: 'error',
      category: 'config',
      objectId: tree.id,
      message: `Tree ${tree.id} must declare a supported planting form.`
    });
  }

  if (tree.canopyDiameter <= 0 || tree.canopySpreadMeters <= 0 || Math.abs(tree.canopySpreadMeters - tree.canopyDiameter) > 0.001) {
    issues.push({
      id: `invalid-tree-canopy-${tree.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: tree.id,
      message: `Tree ${tree.id} must expose positive canopy diameter and matching canopy spread.`
    });
  }

  if (tree.soilVolumeCubicMeters <= 0) {
    issues.push({
      id: `invalid-tree-soil-volume-${tree.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: tree.id,
      message: `Tree ${tree.id} must expose positive soil volume.`
    });
  }

  if (!tree.greenCorridorId || !tree.greenCorridorRole) {
    issues.push({
      id: `missing-tree-green-corridor-${tree.id}`,
      severity: 'error',
      category: 'graph',
      objectId: tree.id,
      message: `Tree ${tree.id} must link to a green corridor.`
    });
  }

  if (tree.heatMitigationScore < 0 || tree.heatMitigationScore > 1 || tree.ecologyScore < 0 || tree.ecologyScore > 1) {
    issues.push({
      id: `invalid-tree-ecology-scores-${tree.id}`,
      severity: 'error',
      category: 'config',
      objectId: tree.id,
      message: `Tree ${tree.id} heat and ecology scores must be normalized.`
    });
  }
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

function getPolygonArea(polygon: Polygon2D): number {
  if (polygon.length < 3) {
    return 0;
  }

  let area = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    area += current.x * next.z - next.x * current.z;
  }

  return Math.abs(area) / 2;
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

function validateAssetInventoryRecords(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const assetIds = new Set(city.assetCatalog.map((asset) => asset.id));
  const targetObjects = city.objectIndex.objects.filter((object) =>
    ASSET_INVENTORY_TARGET_KINDS.includes(object.kind as (typeof ASSET_INVENTORY_TARGET_KINDS)[number])
  );
  const recordsByTargetId = new Map<CityId, ValidationAssetInventoryRecord[]>();

  for (const record of city.assetInventoryRecords) {
    recordsByTargetId.set(record.assetObjectId, [...(recordsByTargetId.get(record.assetObjectId) ?? []), record]);
  }

  for (const target of targetObjects) {
    if (!recordsByTargetId.has(target.id)) {
      issues.push({
        id: `missing-asset-inventory-record-${target.id}`,
        severity: 'error',
        category: 'asset',
        objectId: target.id,
        message: `Renderable ${target.kind} ${target.id} must have an operations asset inventory record.`
      });
    }
  }

  for (const [targetId, records] of recordsByTargetId) {
    if (records.length > 1) {
      for (const record of records) {
        issues.push(createAssetInventoryIssue(record, 'duplicate-target', `Asset ${targetId} must have exactly one inventory record.`));
      }
    }
  }

  for (const record of city.assetInventoryRecords) {
    const target = city.objectIndex.objectsById[record.assetObjectId];
    const binding = assetBindingsById.get(record.renderBindingId);

    if (!target) {
      issues.push(createAssetInventoryIssue(record, 'missing-target', `Inventory record ${record.id} references missing asset object ${record.assetObjectId}.`));
      continue;
    }

    if (record.parentId !== record.assetObjectId || record.assetObjectKind !== target.kind) {
      issues.push(createAssetInventoryIssue(record, 'target-mismatch', `Inventory record ${record.id} must be parented to and typed as ${target.id}.`));
    }

    if (!ASSET_INVENTORY_TARGET_KINDS.includes(target.kind as (typeof ASSET_INVENTORY_TARGET_KINDS)[number])) {
      issues.push(createAssetInventoryIssue(record, 'unsupported-target-kind', `Inventory record ${record.id} targets unsupported kind ${target.kind}.`));
    }

    const expectedBindingId = getInventoryTargetRenderBindingId(target);
    if (!expectedBindingId || record.renderBindingId !== expectedBindingId) {
      issues.push(createAssetInventoryIssue(record, 'render-binding-mismatch', `Inventory record ${record.id} must use the target asset render binding.`));
    }

    if (!binding || binding.objectKind !== target.kind) {
      issues.push(createAssetInventoryIssue(record, 'invalid-render-binding', `Inventory record ${record.id} must reference a render binding for ${target.kind}.`));
    } else if (binding.assetId !== record.renderAssetId || !assetIds.has(record.renderAssetId)) {
      issues.push(createAssetInventoryIssue(record, 'invalid-render-asset', `Inventory record ${record.id} must reference the render binding asset ${binding.assetId}.`));
    }

    if (
      record.ownerEntityId.length === 0 ||
      record.responsibleDepartmentId.length === 0 ||
      record.assetLookupKey.length === 0 ||
      record.source.sourceId.length === 0 ||
      record.source.generationStep.length === 0
    ) {
      issues.push(createAssetInventoryIssue(record, 'missing-lookup-ownership-source', `Inventory record ${record.id} must expose owner, department, lookup key, and source metadata.`));
    }

    if (
      record.lifecycle.installedYear > record.lifecycle.replacementYear ||
      record.lifecycle.expectedServiceLifeYears <= 0 ||
      record.replacementCost.amountUsd <= 0 ||
      record.condition.score < 0 ||
      record.condition.score > 100 ||
      record.condition.lastInspectionYear > record.condition.nextInspectionYear ||
      record.warranty.expiresYear < record.lifecycle.installedYear
    ) {
      issues.push(createAssetInventoryIssue(record, 'invalid-lifecycle-condition-cost', `Inventory record ${record.id} must expose coherent lifecycle, warranty, replacement cost, and condition values.`));
    }
  }
}

function getInventoryTargetRenderBindingId(target: { readonly kind: CityObjectKind }): CityId | undefined {
  if (target.kind === 'street-light') {
    return STREET_LIGHT_RENDER_BINDING_ID;
  }
  if (target.kind === 'utility-node') {
    return UTILITY_NODE_INVENTORY_RENDER_BINDING_ID;
  }
  if (target.kind === 'utility-edge') {
    return UTILITY_EDGE_INVENTORY_RENDER_BINDING_ID;
  }
  if ('assetBindingId' in target && typeof target.assetBindingId === 'string') {
    return target.assetBindingId;
  }
  if ('renderBindingId' in target && typeof target.renderBindingId === 'string') {
    return target.renderBindingId;
  }
  return undefined;
}

function createAssetInventoryIssue(
  record: ValidationAssetInventoryRecord,
  suffix: string,
  message: string
): ValidationIssue {
  return {
    id: `asset-inventory-${suffix}-${record.id}`,
    severity: 'error',
    category: 'asset',
    objectId: record.id,
    message
  };
}

function validateMaintenanceOperations(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[]
): void {
  const assetRecordsById = new Map(city.assetInventoryRecords.map((record) => [record.id, record]));
  const operationRoutesById = new Map(
    city.navigationRoutes.filter((route) => route.requestClass === 'operation').map((route) => [route.id, route])
  );
  const navigationEdgesById = new Map(city.navigationGraphEdges.map((edge) => [edge.id, edge]));
  const roadsById = new Map(city.roads.map((road) => [road.id, road]));
  const operationsByAssetRecordId = new Map<CityId, ValidationMaintenanceOperation[]>();

  for (const operation of city.maintenanceOperations) {
    operationsByAssetRecordId.set(operation.assetInventoryRecordId, [
      ...(operationsByAssetRecordId.get(operation.assetInventoryRecordId) ?? []),
      operation
    ]);
  }

  for (const record of city.assetInventoryRecords) {
    if (record.operationalStatus === 'maintenance-watch') {
      const hasQueueOperation = (operationsByAssetRecordId.get(record.id) ?? []).some((operation) =>
        operation.operationKind === 'repair' || operation.operationKind === 'replacement'
      );
      if (!hasQueueOperation) {
        issues.push({
          id: `missing-maintenance-operation-${record.id}`,
          severity: 'error',
          category: 'operations',
          objectId: record.id,
          message: `Maintenance-watch asset ${record.id} must have a repair or replacement operation.`
        });
      }
    }
  }

  for (const operation of city.maintenanceOperations) {
    const record = assetRecordsById.get(operation.assetInventoryRecordId);
    const route = operationRoutesById.get(operation.navigationRouteId);

    if (!record) {
      issues.push(createMaintenanceOperationIssue(operation, 'missing-asset-record', `Maintenance operation ${operation.id} references missing asset inventory record ${operation.assetInventoryRecordId}.`));
      continue;
    }

    if (
      operation.parentId !== record.id ||
      operation.assetObjectId !== record.assetObjectId ||
      operation.assetObjectKind !== record.assetObjectKind ||
      operation.responsibleDepartmentId !== record.responsibleDepartmentId
    ) {
      issues.push(createMaintenanceOperationIssue(operation, 'asset-mismatch', `Maintenance operation ${operation.id} must match its asset inventory target and department.`));
    }

    if (!route) {
      issues.push(createMaintenanceOperationIssue(operation, 'missing-operation-route', `Maintenance operation ${operation.id} must reference an operation navigation route.`));
    }

    if (
      operation.scheduledWindow.startDay < 0 ||
      operation.scheduledWindow.endDay < operation.scheduledWindow.startDay ||
      operation.repairQueue.sequence <= 0 ||
      operation.repairQueue.estimatedCrewHours <= 0 ||
      operation.conditionUpdate.fromScore < 0 ||
      operation.conditionUpdate.fromScore > 100 ||
      operation.conditionUpdate.projectedScore < operation.conditionUpdate.fromScore ||
      operation.conditionUpdate.projectedScore > 100 ||
      operation.replacement.estimatedCostUsd <= 0
    ) {
      issues.push(createMaintenanceOperationIssue(operation, 'invalid-schedule-queue-condition', `Maintenance operation ${operation.id} must expose coherent schedule, queue, cost, and condition update values.`));
    }

    for (const accessObjectId of operation.serviceAccessObjectIds) {
      if (!city.objectIndex.objectsById[accessObjectId]) {
        issues.push(createMaintenanceOperationIssue(operation, `missing-access-${accessObjectId}`, `Maintenance operation ${operation.id} references missing service access object ${accessObjectId}.`));
      }
    }

    if (operation.createsTemporaryClosure && operation.closureRoadIds.length === 0) {
      issues.push(createMaintenanceOperationIssue(operation, 'missing-closure-road', `Temporary maintenance operation ${operation.id} must close at least one road.`));
    }

    if (!operation.createsTemporaryClosure && (operation.closureRoadIds.length > 0 || operation.temporaryRestrictionIds.length > 0)) {
      issues.push(createMaintenanceOperationIssue(operation, 'unexpected-closure-data', `Non-closure maintenance operation ${operation.id} must not carry road closures.`));
    }

    for (const roadId of operation.closureRoadIds) {
      if (!roadsById.has(roadId)) {
        issues.push(createMaintenanceOperationIssue(operation, `missing-closure-road-${roadId}`, `Maintenance operation ${operation.id} closes missing road ${roadId}.`));
      }
    }

    for (const edgeId of operation.closureNavigationEdgeIds) {
      const edge = navigationEdgesById.get(edgeId);
      if (!edge) {
        issues.push(createMaintenanceOperationIssue(operation, `missing-closure-edge-${edgeId}`, `Maintenance operation ${operation.id} references missing closure navigation edge ${edgeId}.`));
      } else if (!edge.roadIds.some((roadId) => operation.closureRoadIds.includes(roadId))) {
        issues.push(createMaintenanceOperationIssue(operation, `closure-edge-road-mismatch-${edgeId}`, `Maintenance operation ${operation.id} closure edge ${edgeId} must reference a closed road.`));
      }
    }
  }
}

function createMaintenanceOperationIssue(
  operation: ValidationMaintenanceOperation,
  suffix: string,
  message: string
): ValidationIssue {
  return {
    id: `maintenance-operation-${suffix}-${operation.id}`,
    severity: 'error',
    category: 'operations',
    objectId: operation.id,
    message
  };
}

function validatePermitInspectionRecords(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[]
): void {
  const cadastreById = new Map(city.cadastreRecords.map((record) => [record.id, record]));
  const maintenanceById = new Map(city.maintenanceOperations.map((operation) => [operation.id, operation]));
  const permitsByMaintenanceId = new Map<CityId, ValidationPermitInspectionRecord[]>();

  for (const record of city.permitInspectionRecords) {
    if (record.maintenanceOperationId) {
      permitsByMaintenanceId.set(record.maintenanceOperationId, [
        ...(permitsByMaintenanceId.get(record.maintenanceOperationId) ?? []),
        record
      ]);
    }
  }

  for (const operation of city.maintenanceOperations) {
    if (operation.createsTemporaryClosure) {
      const hasClosurePermit = (permitsByMaintenanceId.get(operation.id) ?? []).some((record) =>
        record.recordKind === 'temporary-closure-permit' && record.status === 'active'
      );
      if (!hasClosurePermit) {
        issues.push({
          id: `missing-temporary-closure-permit-${operation.id}`,
          severity: 'error',
          category: 'operations',
          objectId: operation.id,
          message: `Temporary closure operation ${operation.id} must have an active permit-inspection record.`
        });
      }
    }
  }

  for (const record of city.permitInspectionRecords) {
    const cadastre = record.cadastreRecordId ? cadastreById.get(record.cadastreRecordId) : undefined;
    const operation = record.maintenanceOperationId ? maintenanceById.get(record.maintenanceOperationId) : undefined;

    if (record.parentId !== record.cadastreRecordId && record.parentId !== record.maintenanceOperationId) {
      issues.push(createPermitInspectionIssue(record, 'parent-mismatch', `Permit or inspection record ${record.id} must be parented to its cadastre or maintenance operation source.`));
    }

    if (record.cadastreRecordId && !cadastre) {
      issues.push(createPermitInspectionIssue(record, 'missing-cadastre-record', `Permit or inspection record ${record.id} references missing cadastre record ${record.cadastreRecordId}.`));
    }

    if (record.maintenanceOperationId && !operation) {
      issues.push(createPermitInspectionIssue(record, 'missing-maintenance-operation', `Permit or inspection record ${record.id} references missing maintenance operation ${record.maintenanceOperationId}.`));
    }

    if (cadastre && record.parcelId !== cadastre.parcelId) {
      issues.push(createPermitInspectionIssue(record, 'parcel-mismatch', `Permit or inspection record ${record.id} must mirror cadastre parcel ${cadastre.parcelId}.`));
    }

    if (record.validFromDay < record.submittedDay || record.validToDay < record.validFromDay) {
      issues.push(createPermitInspectionIssue(record, 'invalid-validity-window', `Permit or inspection record ${record.id} must expose a coherent submission and validity window.`));
    }

    const approvalMustBeComplete =
      record.approval.required && (record.status === 'approved' || record.status === 'active' || record.status === 'closed');
    if (approvalMustBeComplete && (!record.approval.approvedByDepartmentId || record.approval.approvalDay === undefined)) {
      issues.push(createPermitInspectionIssue(record, 'missing-approval', `Permit or inspection record ${record.id} requires approval metadata.`));
    }

    if (
      record.inspection.required &&
      (!record.inspection.inspectorDepartmentId || record.inspection.scheduledDay === undefined || record.inspection.passed === undefined)
    ) {
      issues.push(createPermitInspectionIssue(record, 'missing-inspection', `Permit or inspection record ${record.id} requires inspection metadata.`));
    }

    if (record.compliance.outstandingIssueCount < 0 || (record.compliance.passed && record.compliance.outstandingIssueCount > 0)) {
      issues.push(createPermitInspectionIssue(record, 'invalid-compliance', `Permit or inspection record ${record.id} has inconsistent compliance status.`));
    }

    if (record.recordKind === 'temporary-closure-permit') {
      if (!operation?.createsTemporaryClosure) {
        issues.push(createPermitInspectionIssue(record, 'non-closure-operation', `Temporary closure permit ${record.id} must reference a closure maintenance operation.`));
      }
      for (const roadId of record.closureRoadIds) {
        if (!city.objectIndex.objectsById[roadId]) {
          issues.push(createPermitInspectionIssue(record, `missing-closure-road-${roadId}`, `Temporary closure permit ${record.id} references missing closure road ${roadId}.`));
        }
      }
    }

    for (const objectId of record.relatedObjectIds) {
      if (!city.objectIndex.objectsById[objectId]) {
        issues.push(createPermitInspectionIssue(record, `missing-related-object-${objectId}`, `Permit or inspection record ${record.id} references missing related object ${objectId}.`));
      }
    }
  }
}

function createPermitInspectionIssue(
  record: ValidationPermitInspectionRecord,
  suffix: string,
  message: string
): ValidationIssue {
  return {
    id: `permit-inspection-${suffix}-${record.id}`,
    severity: 'error',
    category: 'operations',
    objectId: record.id,
    message
  };
}

function validateCurbActivations(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  context: {
    readonly roadsById: ReadonlyMap<CityId, GeneratedCityForValidation['roads'][number]>;
    readonly curbZonesById: ReadonlyMap<CityId, GeneratedCityForValidation['curbZones'][number]>;
    readonly assetBindingsById: ReadonlyMap<CityId, RenderBinding>;
  }
): void {
  const permitsById = new Map(city.permitInspectionRecords.map((record) => [record.id, record]));

  for (const activation of city.curbActivations) {
    const curbZone = context.curbZonesById.get(activation.curbZoneId);
    const road = context.roadsById.get(activation.roadId);
    const permit = permitsById.get(activation.permitInspectionRecordId);
    const binding = context.assetBindingsById.get(activation.assetBindingId);

    if (!curbZone || activation.parentId !== activation.curbZoneId) {
      issues.push(createCurbActivationIssue(activation, 'missing-curb-zone', `Curb activation ${activation.id} must be parented to existing curb zone ${activation.curbZoneId}.`));
      continue;
    }

    if (
      curbZone.curbUse === 'emergency' ||
      curbZone.curbUse === 'bus-stop' ||
      curbZone.curbUse === 'no-stopping' ||
      !curbZone.management.fireLaneClearance ||
      !curbZone.management.transitStopClearance
    ) {
      issues.push(createCurbActivationIssue(activation, 'unsafe-curb-use', `Curb activation ${activation.id} must preserve emergency, transit, and no-stopping curb clearances.`));
    }

    if (
      activation.roadId !== curbZone.roadId ||
      activation.sidewalkId !== curbZone.sidewalkId ||
      activation.side !== curbZone.side ||
      !road
    ) {
      issues.push(createCurbActivationIssue(activation, 'curb-context-mismatch', `Curb activation ${activation.id} must mirror its curb zone road, sidewalk, and side.`));
    }

    if (
      activation.startMeters < curbZone.startMeters ||
      activation.endMeters > curbZone.endMeters ||
      activation.endMeters <= activation.startMeters ||
      activation.lengthMeters <= 0 ||
      activation.widthMeters <= 0 ||
      activation.boundary.length < 4 ||
      !isFiniteNumber(activation.center.x) ||
      !isFiniteNumber(activation.center.z)
    ) {
      issues.push(createCurbActivationIssue(activation, 'invalid-geometry', `Curb activation ${activation.id} must stay inside its curb zone with finite positive geometry.`));
    }

    if (!permit || !permit.compliance.passed || !(permit.status === 'approved' || permit.status === 'closed' || permit.status === 'active')) {
      issues.push(createCurbActivationIssue(activation, 'invalid-permit', `Curb activation ${activation.id} must reference an approved or closed compliant permit/inspection record.`));
    }

    if (
      activation.clearances.accessiblePathMeters < 1.8 ||
      !activation.clearances.emergencyAccess ||
      !activation.clearances.transitStopClearance ||
      !activation.clearances.drainageInletClearance
    ) {
      issues.push(createCurbActivationIssue(activation, 'blocked-clearance', `Curb activation ${activation.id} must preserve accessible, emergency, transit, and drainage clearances.`));
    }

    if (
      activation.protection.barrierCount < 4 ||
      !activation.protection.reflectiveMarkers ||
      activation.seatingCapacity <= 0
    ) {
      issues.push(createCurbActivationIssue(activation, 'invalid-protection', `Curb activation ${activation.id} must expose barriers, reflectors, and usable seating capacity.`));
    }

    if (
      activation.seasonality.activeFromDay < 1 ||
      activation.seasonality.activeToDay < activation.seasonality.activeFromDay ||
      activation.seasonality.removalDay < activation.seasonality.activeToDay ||
      activation.seasonality.removableWithinHours <= 0
    ) {
      issues.push(createCurbActivationIssue(activation, 'invalid-seasonality', `Curb activation ${activation.id} must expose a coherent active season and removal window.`));
    }

    if (!binding || binding.objectKind !== 'curb-activation') {
      issues.push(createCurbActivationIssue(activation, 'invalid-binding', `Curb activation ${activation.id} must reference a curb-activation render binding.`));
    }
  }
}

function createCurbActivationIssue(
  activation: GeneratedCityForValidation['curbActivations'][number],
  suffix: string,
  message: string
): ValidationIssue {
  return {
    id: `curb-activation-${suffix}-${activation.id}`,
    severity: 'error',
    category: suffix === 'invalid-binding' ? 'asset' : suffix === 'invalid-geometry' ? 'geometry' : 'graph',
    objectId: activation.id,
    affectedBoundary: activation.boundary,
    message
  };
}

function validatePublicAmenities(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  context: {
    readonly roadsById: ReadonlyMap<CityId, GeneratedCityForValidation['roads'][number]>;
    readonly assetBindingsById: ReadonlyMap<CityId, RenderBinding>;
  }
): void {
  const serviceAccessById = new Map(city.serviceAccessCorridors.map((corridor) => [corridor.id, corridor]));

  for (const amenity of city.publicAmenities) {
    const binding = context.assetBindingsById.get(amenity.assetBindingId);

    if (!amenity.parentId || !city.objectIndex.objectsById[amenity.parentId]) {
      issues.push(createPublicAmenityIssue(amenity, 'missing-parent', `Public amenity ${amenity.id} must be parented to a sidewalk, plaza zone, or waterfront open space.`));
    }

    if (
      amenity.placementContext === 'detailed-street' ||
      amenity.placementContext === 'citywide-street'
    ) {
      if (!amenity.roadId || !context.roadsById.has(amenity.roadId) || !amenity.sidewalkId || !city.objectIndex.objectsById[amenity.sidewalkId]) {
        issues.push(createPublicAmenityIssue(amenity, 'missing-street-context', `Street public amenity ${amenity.id} must reference an existing road and sidewalk.`));
      }
    }

    if (amenity.placementContext === 'plaza' && (!amenity.plazaZoneId || !city.objectIndex.objectsById[amenity.plazaZoneId])) {
      issues.push(createPublicAmenityIssue(amenity, 'missing-plaza-context', `Plaza public amenity ${amenity.id} must reference an existing plaza zone.`));
    }

    if (
      amenity.placementContext === 'waterfront' &&
      (!amenity.waterfrontOpenSpaceId || !city.objectIndex.objectsById[amenity.waterfrontOpenSpaceId])
    ) {
      issues.push(createPublicAmenityIssue(amenity, 'missing-waterfront-context', `Waterfront public amenity ${amenity.id} must reference an existing waterfront open space.`));
    }

    if (
      !isFiniteNumber(amenity.position.x) ||
      !isFiniteNumber(amenity.position.z) ||
      amenity.boundary.length < 4 ||
      amenity.dimensions.widthMeters <= 0 ||
      amenity.dimensions.lengthMeters <= 0 ||
      amenity.dimensions.heightMeters <= 0 ||
      amenity.clearanceEnvelope.widthMeters < amenity.dimensions.widthMeters ||
      amenity.clearanceEnvelope.lengthMeters < amenity.dimensions.lengthMeters
    ) {
      issues.push(createPublicAmenityIssue(amenity, 'invalid-geometry', `Public amenity ${amenity.id} must expose finite positive dimensions, position, and clearance geometry.`));
    }

    if (amenity.accessiblePathMeters < 1.8 || amenity.capacityUsers <= 0 || amenity.comfort.expectedDailyUsers <= 0) {
      issues.push(createPublicAmenityIssue(amenity, 'inaccessible-or-empty', `Public amenity ${amenity.id} must preserve accessible clear path and usable capacity.`));
    }

    if (amenity.serviceAccess.required) {
      const serviceAccess = amenity.serviceAccessCorridorId ? serviceAccessById.get(amenity.serviceAccessCorridorId) : undefined;

      if (!serviceAccess || !amenity.serviceAccess.provided || amenity.serviceAccess.maintenanceAccessMeters > 420) {
        issues.push(createPublicAmenityIssue(amenity, 'missing-service-access', `Public amenity ${amenity.id} must reference nearby service access for inspection and restocking.`));
      }
    }

    if (
      (amenity.utilityRequirements.water || amenity.utilityRequirements.power || amenity.utilityRequirements.drainage) &&
      (!amenity.serviceAccess.provided || !amenity.serviceAccessCorridorId)
    ) {
      issues.push(createPublicAmenityIssue(amenity, 'unserved-utility', `Public amenity ${amenity.id} must expose service access for required water, power, or drainage.`));
    }

    if (amenity.amenityKind === 'public-toilet' && (!amenity.utilityRequirements.water || !amenity.utilityRequirements.drainage)) {
      issues.push(createPublicAmenityIssue(amenity, 'unserved-public-toilet', `Public toilet ${amenity.id} must require water and drainage service.`));
    }

    if (amenity.amenityKind === 'charging-point' && !amenity.utilityRequirements.power) {
      issues.push(createPublicAmenityIssue(amenity, 'unpowered-charging-point', `Charging point ${amenity.id} must require power service.`));
    }

    if (!binding || binding.objectKind !== 'public-amenity') {
      issues.push(createPublicAmenityIssue(amenity, 'invalid-binding', `Public amenity ${amenity.id} must reference a public-amenity render binding.`));
    }
  }
}

function createPublicAmenityIssue(
  amenity: GeneratedCityForValidation['publicAmenities'][number],
  suffix: string,
  message: string
): ValidationIssue {
  return {
    id: `public-amenity-${suffix}-${amenity.id}`,
    severity: 'error',
    category: suffix === 'invalid-binding' ? 'asset' : suffix === 'invalid-geometry' ? 'geometry' : 'graph',
    objectId: amenity.id,
    affectedBoundary: amenity.boundary,
    message
  };
}

function validateGreenStormwaterFeatures(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  context: {
    readonly roadsById: ReadonlyMap<string, ValidationRoad>;
    readonly assetBindingsById: ReadonlyMap<string, RenderBinding>;
  }
): void {
  const utilityNodesById = new Map(city.utilityNodes.map((node) => [node.id, node]));
  const utilityEdgesById = new Map(city.utilityEdges.map((edge) => [edge.id, edge]));
  const treesById = new Map(city.trees.map((tree) => [tree.id, tree]));

  if (city.roads.some((road) => road.stormwaterDrainage) && city.greenStormwaterFeatures.length === 0) {
    issues.push({
      id: 'missing-green-stormwater-features',
      severity: 'error',
      category: 'graph',
      message: 'Roads with stormwater drainage must expose visible green stormwater public-realm features.'
    });
  }

  for (const feature of city.greenStormwaterFeatures) {
    const road = context.roadsById.get(feature.roadId);
    const sidewalk = city.objectIndex.objectsById[feature.sidewalkId];
    const binding = context.assetBindingsById.get(feature.assetBindingId);

    if (!road || feature.parentId !== feature.roadId) {
      issues.push(createGreenStormwaterIssue(feature, 'missing-road-parent', `Green stormwater feature ${feature.id} must attach to generated road ${feature.roadId}.`, 'identifier'));
    }

    if (!sidewalk || sidewalk.kind !== 'sidewalk') {
      issues.push(createGreenStormwaterIssue(feature, 'missing-sidewalk', `Green stormwater feature ${feature.id} must reference a generated sidewalk.`, 'identifier'));
    } else if (road && sidewalk.roadSegmentId !== road.id) {
      issues.push(createGreenStormwaterIssue(feature, 'sidewalk-road-mismatch', `Green stormwater feature ${feature.id} sidewalk must belong to road ${road.id}.`, 'graph'));
    } else if (sidewalk.accessibleClearPathMeters < 1.8 || feature.clearPathMeters < 1.8) {
      issues.push(createGreenStormwaterIssue(feature, 'blocked-clear-path', `Green stormwater feature ${feature.id} must preserve at least 1.8m accessible clear path.`, 'geometry'));
    }

    if (!binding || binding.objectKind !== 'green-stormwater-feature') {
      issues.push(createGreenStormwaterIssue(feature, 'invalid-asset-binding', `Green stormwater feature ${feature.id} must reference a green stormwater render binding.`, 'asset'));
    }

    if (
      feature.size.x <= 0 ||
      feature.size.z <= 0 ||
      feature.boundary.length < 4 ||
      feature.storageVolumeCubicMeters <= 0 ||
      feature.treatmentVolumeCubicMeters <= 0 ||
      feature.designStormMmPerHour <= 0 ||
      feature.maintenanceAccessMeters < 1.8 ||
      feature.runoffCapturePercent < 0 ||
      feature.runoffCapturePercent > 100
    ) {
      issues.push(createGreenStormwaterIssue(feature, 'invalid-hydraulic-geometry', `Green stormwater feature ${feature.id} must expose positive geometry, treatment, and maintenance metrics.`, 'geometry'));
    }

    if (feature.utilityNodeIds.length === 0) {
      issues.push(createGreenStormwaterIssue(feature, 'missing-utility-nodes', `Green stormwater feature ${feature.id} must route to stormwater utility nodes.`, 'graph'));
    }
    for (const utilityNodeId of feature.utilityNodeIds) {
      const node = utilityNodesById.get(utilityNodeId);
      if (!node || node.utilityType !== 'stormwater') {
        issues.push(createGreenStormwaterIssue(feature, `invalid-utility-node-${toIssueIdToken(utilityNodeId)}`, `Green stormwater feature ${feature.id} references missing stormwater node ${utilityNodeId}.`, 'graph'));
      }
    }

    if (feature.runoffPathEdgeIds.length === 0) {
      issues.push(createGreenStormwaterIssue(feature, 'missing-runoff-edges', `Green stormwater feature ${feature.id} must reference a stormwater runoff path edge.`, 'graph'));
    }
    for (const edgeId of feature.runoffPathEdgeIds) {
      const edge = utilityEdgesById.get(edgeId);
      if (!edge || edge.utilityType !== 'stormwater' || edge.edgeRole !== 'runoff-path') {
        issues.push(createGreenStormwaterIssue(feature, `invalid-runoff-edge-${toIssueIdToken(edgeId)}`, `Green stormwater feature ${feature.id} references missing stormwater runoff edge ${edgeId}.`, 'graph'));
      }
    }

    if (feature.featureKind === 'tree-trench' && feature.treeIds.length === 0) {
      issues.push(createGreenStormwaterIssue(feature, 'missing-tree-trench-trees', `Tree trench ${feature.id} must link to street trees on the same road.`, 'graph'));
    }
    for (const treeId of feature.treeIds) {
      const tree = treesById.get(treeId);
      if (!tree || tree.roadId !== feature.roadId) {
        issues.push(createGreenStormwaterIssue(feature, `invalid-tree-reference-${toIssueIdToken(treeId)}`, `Green stormwater feature ${feature.id} references missing or unrelated tree ${treeId}.`, 'graph'));
      }
    }
  }
}

function createGreenStormwaterIssue(
  feature: ValidationGreenStormwaterFeature,
  suffix: string,
  message: string,
  category: ValidationIssue['category']
): ValidationIssue {
  return {
    id: `green-stormwater-${suffix}-${feature.id}`,
    severity: 'error',
    category,
    objectId: feature.id,
    ...createIssueFocus(feature.center, 'Regenerate green stormwater placement from road drainage, sidewalk clear paths, and stormwater utility references.'),
    message
  };
}

function validateTransitNetwork(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  roadsById: ReadonlyMap<string, ValidationRoad>,
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  for (const stop of city.transitStops) {
    const road = roadsById.get(stop.roadId);
    const sidewalk = city.objectIndex.objectsById[stop.sidewalkId];
    const binding = assetBindingsById.get(stop.assetBindingId);

    if (!road || !road.transitEligible) {
      issues.push({
        id: `invalid-transit-stop-road-${stop.id}`,
        severity: 'error',
        category: 'graph',
        objectId: stop.id,
        message: `Transit stop ${stop.id} must reference an existing transit-eligible road.`
      });
    }

    if (!sidewalk || sidewalk.kind !== 'sidewalk' || stop.parentId !== stop.sidewalkId) {
      issues.push({
        id: `invalid-transit-stop-sidewalk-${stop.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: stop.id,
        message: `Transit stop ${stop.id} must attach to parent sidewalk ${stop.sidewalkId}.`
      });
    }

    if (sidewalk && sidewalk.kind === 'sidewalk' && sidewalk.roadSegmentId !== stop.roadId) {
      issues.push({
        id: `transit-stop-sidewalk-road-mismatch-${stop.id}`,
        severity: 'error',
        category: 'graph',
        objectId: stop.id,
        message: `Transit stop ${stop.id} sidewalk must belong to road ${stop.roadId}.`
      });
    }

    if (
      !isFiniteNumber(stop.center.x) ||
      !isFiniteNumber(stop.center.z) ||
      stop.alongRoadMeters < 0 ||
      (road && stop.alongRoadMeters > road.length + 0.001) ||
      stop.platformLengthMeters <= 0 ||
      stop.passengerDemandSeed <= 0 ||
      stop.serviceHeadwayMinutes <= 0 ||
      !stop.accessible ||
      stop.routeIds.length === 0
    ) {
      issues.push({
        id: `invalid-transit-stop-service-${stop.id}`,
        severity: 'error',
        category: 'graph',
        objectId: stop.id,
        message: 'Transit stops must have finite placement, positive service metadata, accessibility, and at least one route.'
      });
    }

    if (!binding || binding.objectKind !== 'transit-stop') {
      issues.push({
        id: `invalid-transit-stop-asset-binding-${stop.id}`,
        severity: 'error',
        category: 'asset',
        objectId: stop.id,
        message: `Transit stop ${stop.id} must reference a transit-stop render binding.`
      });
    }
  }

  const transitStopsById = new Map(city.transitStops.map((stop) => [stop.id, stop]));
  for (const route of city.transitRoutes) {
    if (route.mode !== 'bus' || route.roadIds.length === 0 || route.stopIds.length < 2 || route.laneIds.length === 0 || route.headwayMinutes <= 0) {
      issues.push({
        id: `invalid-transit-route-service-${route.id}`,
        severity: 'error',
        category: 'graph',
        objectId: route.id,
        message: `Transit route ${route.id} must expose bus service, roads, at least two stops, bus-capable lanes, and a positive headway.`
      });
    }

    for (const roadId of route.roadIds) {
      const road = roadsById.get(roadId);
      if (!road || !road.transitEligible) {
        issues.push({
          id: `invalid-transit-route-road-${route.id}-${roadId}`,
          severity: 'error',
          category: 'graph',
          objectId: route.id,
          message: `Transit route ${route.id} references a missing or transit-ineligible road ${roadId}.`
        });
      }
    }

    for (const stopId of route.stopIds) {
      const stop = transitStopsById.get(stopId);
      if (!stop || !stop.routeIds.includes(route.id)) {
        issues.push({
          id: `invalid-transit-route-stop-${route.id}-${stopId}`,
          severity: 'error',
          category: 'identifier',
          objectId: route.id,
          message: `Transit route ${route.id} references stop ${stopId} without reciprocal route metadata.`
        });
      }
    }

    for (const laneId of route.laneIds) {
      const lane = city.objectIndex.objectsById[laneId];
      if (!lane || lane.kind !== 'lane' || !lane.allowedModes.includes('bus')) {
        issues.push({
          id: `invalid-transit-route-lane-${route.id}-${laneId}`,
          severity: 'error',
          category: 'graph',
          objectId: route.id,
          message: `Transit route ${route.id} must use bus-capable lane ${laneId}.`
        });
      }
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

  for (const topographyZone of city.topographyZones) {
    validatePoint2D(city.geospatial, topographyZone.id, 'center', topographyZone.center, issues);
    validatePolygon2D(city.geospatial, topographyZone.id, 'boundary', topographyZone.boundary, issues);
    validateHeightValue(city.geospatial, topographyZone.id, 'minElevationMeters', topographyZone.minElevationMeters, issues);
    validateHeightValue(city.geospatial, topographyZone.id, 'maxElevationMeters', topographyZone.maxElevationMeters, issues);
    validateHeightValue(
      city.geospatial,
      topographyZone.id,
      'averageElevationMeters',
      topographyZone.averageElevationMeters,
      issues
    );
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

function validateTopographyZones(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const roadIds = new Set(city.roads.map((road) => road.id));
  const buildingIds = new Set(city.buildings.map((building) => building.id));

  if (city.topographyZones.length === 0) {
    issues.push({
      id: 'missing-topography-zones',
      severity: 'error',
      category: 'land',
      message: 'Generated city must include topography zones before grade-aware mobility and building validation can run.'
    });
  }

  for (const zone of city.topographyZones) {
    if (
      zone.minElevationMeters > zone.averageElevationMeters ||
      zone.averageElevationMeters > zone.maxElevationMeters ||
      zone.maxElevationMeters < zone.minElevationMeters
    ) {
      issues.push(createTopographyIssue(zone, 'invalid-elevation-range', 'Topography zone elevation min, average, and max must be ordered.'));
    }

    if (!isFiniteNumber(zone.slopePercent) || zone.slopePercent < 0 || zone.slopePercent > 45) {
      issues.push(createTopographyIssue(zone, 'invalid-slope', 'Topography zone slope must be finite and below 45%.'));
    }

    if (!isFiniteNumber(zone.gradeLimitPercent) || zone.gradeLimitPercent <= 0 || zone.gradeLimitPercent > 20) {
      issues.push(createTopographyIssue(zone, 'invalid-grade-limit', 'Topography zone grade limit must be positive and realistic.'));
    }

    for (const roadId of zone.relatedRoadIds) {
      if (!roadIds.has(roadId)) {
        issues.push(createTopographyIssue(zone, `missing-road-${roadId}`, `Topography zone references missing road ${roadId}.`));
      }
    }

    for (const buildingId of zone.relatedBuildingIds) {
      if (!buildingIds.has(buildingId)) {
        issues.push(
          createTopographyIssue(zone, `missing-building-${buildingId}`, `Topography zone references missing building ${buildingId}.`)
        );
      }
    }
  }
}

function validateSoilGeologyZones(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const districtIds = new Set(city.districts.map((district) => district.id));
  const topographyZoneIds = new Set(city.topographyZones.map((zone) => zone.id));
  const hazardZoneIds = new Set(city.hazardZones.map((hazard) => hazard.id));
  const parcelIds = new Set(city.parcels.map((parcel) => parcel.id));
  const buildingIds = new Set(city.buildings.map((building) => building.id));

  if (city.soilGeologyZones.length === 0) {
    issues.push({
      id: 'missing-soil-geology-zones',
      severity: 'error',
      category: 'land',
      message: 'Generated city must include soil and geology zones before foundation, tunnel, drainage, and hazard checks can query ground conditions.'
    });
  }

  for (const zone of city.soilGeologyZones) {
    if (!(SOIL_GEOLOGY_KINDS as readonly string[]).includes(zone.soilKind)) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-soil-kind', `Soil geology zone ${zone.id} uses unknown soil kind ${zone.soilKind}.`));
    }

    if (zone.boundary.length < 4) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-boundary', `Soil geology zone ${zone.id} must expose a polygon boundary.`));
    }

    if (zone.districtIds.length === 0 || zone.districtIds.some((districtId) => !districtIds.has(districtId))) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-district-reference', `Soil geology zone ${zone.id} must reference existing districts.`));
    }

    if (zone.topographyZoneIds.length === 0 || zone.topographyZoneIds.some((zoneId) => !topographyZoneIds.has(zoneId))) {
      issues.push(
        createSoilGeologyIssue(zone, 'invalid-topography-reference', `Soil geology zone ${zone.id} must reference existing topography zones.`)
      );
    }

    if (zone.hazardZoneIds.some((hazardId) => !hazardZoneIds.has(hazardId))) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-hazard-reference', `Soil geology zone ${zone.id} references missing hazard zones.`));
    }

    if (zone.parcelIds.some((parcelId) => !parcelIds.has(parcelId))) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-parcel-reference', `Soil geology zone ${zone.id} references missing parcels.`));
    }

    if (zone.buildingIds.some((buildingId) => !buildingIds.has(buildingId))) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-building-reference', `Soil geology zone ${zone.id} references missing buildings.`));
    }

    if (!(FOUNDATION_SUITABILITY_KINDS as readonly string[]).includes(zone.foundationSuitability)) {
      issues.push(
        createSoilGeologyIssue(zone, 'invalid-foundation-suitability', `Soil geology zone ${zone.id} has invalid foundation suitability.`)
      );
    }

    if (!(TUNNEL_DIFFICULTY_KINDS as readonly string[]).includes(zone.tunnelDifficulty)) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-tunnel-difficulty', `Soil geology zone ${zone.id} has invalid tunnel difficulty.`));
    }

    if (!(DRAINAGE_ASSUMPTION_KINDS as readonly string[]).includes(zone.drainageAssumption)) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-drainage-assumption', `Soil geology zone ${zone.id} has invalid drainage assumptions.`));
    }

    if (
      !isFiniteNumber(zone.bearingCapacityKpa) ||
      zone.bearingCapacityKpa < 50 ||
      zone.bearingCapacityKpa > 800 ||
      !isFiniteNumber(zone.permeabilityMillimetersPerHour) ||
      zone.permeabilityMillimetersPerHour < 0 ||
      zone.permeabilityMillimetersPerHour > 250 ||
      !isFiniteNumber(zone.groundwaterDepthMeters) ||
      zone.groundwaterDepthMeters < 0 ||
      zone.groundwaterDepthMeters > 80
    ) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-ground-metrics', `Soil geology zone ${zone.id} has invalid ground metrics.`));
    }

    const riskLevels = [
      zone.settlementRisk,
      zone.groundRisk.overall,
      zone.groundRisk.flood,
      zone.groundRisk.slope,
      zone.groundRisk.liquefaction
    ];
    if (riskLevels.some((level) => !(GROUND_RISK_LEVELS as readonly string[]).includes(level))) {
      issues.push(createSoilGeologyIssue(zone, 'invalid-risk-level', `Soil geology zone ${zone.id} has invalid ground-risk metadata.`));
    }

    const contaminationHazardIds = city.hazardZones
      .filter((hazard) => hazard.hazardKind === 'contamination')
      .map((hazard) => hazard.id);
    const hasContaminationHazard = zone.contamination.hazardZoneIds.some((hazardId) => contaminationHazardIds.includes(hazardId));
    if (
      zone.contamination.hazardZoneIds.some((hazardId) => !hazardZoneIds.has(hazardId)) ||
      (zone.contamination.status !== 'clean' && !hasContaminationHazard) ||
      (zone.contamination.remediationRequired && zone.foundationSuitability !== 'restricted-remediation')
    ) {
      issues.push(
        createSoilGeologyIssue(zone, 'invalid-contamination-hint', `Soil geology zone ${zone.id} has inconsistent contamination metadata.`)
      );
    }
  }
}

function validateRoadGroundProfile(
  road: ValidationRoad,
  topographyZones: readonly ValidationTopographyZone[],
  issues: ValidationIssue[]
): void {
  const profile = road.groundProfile;
  const topographyZoneIds = new Set(topographyZones.map((zone) => zone.id));

  if (!profile) {
    issues.push({
      id: `missing-road-ground-profile-${road.id}`,
      severity: 'error',
      category: 'land',
      objectId: road.id,
      ...createIssueFocus(road.center, 'Sample road centerline endpoints against the generated topography model.'),
      message: `Road ${road.id} must carry a topography-derived ground profile.`
    });
    return;
  }

  if (
    !isFiniteNumber(profile.startElevationMeters) ||
    !isFiniteNumber(profile.endElevationMeters) ||
    !isFiniteNumber(profile.averageElevationMeters) ||
    profile.minElevationMeters > profile.averageElevationMeters ||
    profile.averageElevationMeters > profile.maxElevationMeters
  ) {
    issues.push({
      id: `invalid-road-ground-elevation-${road.id}`,
      severity: 'error',
      category: 'land',
      objectId: road.id,
      ...createIssueFocus(road.center, 'Regenerate road ground elevations from deterministic topography samples.'),
      message: `Road ${road.id} has an invalid ground elevation profile.`
    });
  }

  if (!isFiniteNumber(profile.maxGradePercent) || profile.maxGradePercent < 0 || profile.maxGradePercent > 12) {
    issues.push({
      id: `impossible-road-grade-${road.id}`,
      severity: 'error',
      category: 'land',
      objectId: road.id,
      ...createIssueFocus(road.center, 'Regrade the road or assign retaining/topography mitigation before routing.'),
      message: `Road ${road.id} grade ${profile.maxGradePercent}% exceeds the maximum supported generated road grade.`
    });
  }

  if (profile.topographyZoneIds.length === 0 || profile.topographyZoneIds.some((zoneId) => !topographyZoneIds.has(zoneId))) {
    issues.push({
      id: `invalid-road-topography-zone-reference-${road.id}`,
      severity: 'error',
      category: 'land',
      objectId: road.id,
      ...createIssueFocus(road.center, 'Reference existing topography zones from each road ground profile.'),
      message: `Road ${road.id} must reference existing topography zones.`
    });
  }
}

function validateCadastreRecords(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {

  const parcelsById = new Map(city.parcels.map((parcel) => [parcel.id, parcel]));
  const recordIdsByParcelId = new Map<string, string[]>();

  for (const record of city.cadastreRecords) {
    const parcel = parcelsById.get(record.parcelId);
    recordIdsByParcelId.set(record.parcelId, [...(recordIdsByParcelId.get(record.parcelId) ?? []), record.id]);

    if (!parcel || record.parentId !== record.parcelId) {
      issues.push(createCadastreIssue(record, 'invalid-parcel-reference', `Cadastre record ${record.id} must be parented to an existing parcel.`));
      continue;
    }

    if (
      record.id !== parcel.cadastreRecordId ||
      record.id !== `cadastre-record-${parcel.id}` ||
      record.districtId !== parcel.districtId ||
      record.blockId !== parcel.blockId ||
      record.developmentRightStatus !== parcel.developmentRights.status
    ) {
      issues.push(createCadastreIssue(record, 'parcel-mismatch', `Cadastre record ${record.id} must mirror parcel ${parcel.id} legal references and development-right status.`));
    }

    if (!record.ownerEntityId || !record.ownerName || !record.legalDescription || !record.titleReference) {
      issues.push(createCadastreIssue(record, 'missing-legal-fields', `Cadastre record ${record.id} must include owner, title, and legal description fields.`));
    }

    if (!Number.isFinite(record.assessedLandValue) || record.assessedLandValue <= 0) {
      issues.push(createCadastreIssue(record, 'invalid-assessed-value', `Cadastre record ${record.id} must include a positive assessed land value.`));
    }

    if (record.rights.length === 0 || !record.rights.some((right) => right.rightKind === 'build')) {
      issues.push(createCadastreIssue(record, 'missing-rights', `Cadastre record ${record.id} must include at least one build right.`));
    }

    const easementIds = new Set<string>();
    for (const easement of record.easements) {
      if (easementIds.has(easement.id)) {
        issues.push(createCadastreIssue(record, `duplicate-easement-${toIssueIdToken(easement.id)}`, `Cadastre record ${record.id} has duplicate easement ${easement.id}.`));
      }
      easementIds.add(easement.id);

      if (
        !easement.beneficiaryId ||
        easement.widthMeters <= 0 ||
        easement.boundary.length < 4 ||
        !isPolygonWithinPolygonBounds(easement.boundary, parcel.boundary)
      ) {
        issues.push(createCadastreIssue(record, `invalid-easement-${toIssueIdToken(easement.id)}`, `Cadastre easement ${easement.id} must have a beneficiary, positive width, and boundary inside parcel ${parcel.id}.`));
      }
    }
  }

  for (const parcel of city.parcels) {
    const recordIds = recordIdsByParcelId.get(parcel.id) ?? [];
    if (recordIds.length !== 1) {
      issues.push({
        id: `invalid-cadastre-record-count-${parcel.id}`,
        severity: 'error',
        category: 'land',
        objectId: parcel.id,
        ...createIssueFocus(parcel.center, `Generate exactly one cadastre record for ${parcel.id}.`),
        message: `Parcel ${parcel.id} must have exactly one cadastre record.`
      });
    }
  }
}

function createCadastreIssue(
  record: ValidationCadastreRecord,
  suffix: string,
  message: string
): ValidationIssue {
  return {
    id: `invalid-cadastre-${record.id}-${suffix}`,
    severity: 'error',
    category: 'land',
    objectId: record.id,
    message
  };
}

function validateUtilityBase(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const serviceAreasById = new Map(
    city.administrativeBoundaries
      .filter((boundary) => boundary.boundaryKind === 'service-area' && boundary.serviceTypes.includes('utilities'))
      .map((boundary) => [boundary.id, boundary])
  );
  const utilityNodesById = new Map(city.utilityNodes.map((node) => [node.id, node]));
  const utilityEdgeIds = new Set(city.utilityEdges.map((edge) => edge.id));
  const utilityTypes = new Set<string>();

  for (const node of city.utilityNodes) {
    utilityTypes.add(node.utilityType);

    if (!serviceAreasById.has(node.serviceArea.serviceAreaBoundaryId)) {
      issues.push(createUtilityNodeIssue(node, 'missing-service-area', `Utility node ${node.id} must reference a utilities service area.`));
    }

    if (node.capacity.value <= 0 || node.capacity.peakLoadFactor <= 0 || node.capacity.peakLoadFactor > 1) {
      issues.push(createUtilityNodeIssue(node, 'invalid-capacity', `Utility node ${node.id} must expose positive capacity and a peak load factor from 0 to 1.`));
    }

    if (!node.ownerEntityId || !node.outage.outageDomainId || !node.outage.isolationGroupId || !node.renderBindingId) {
      issues.push(createUtilityNodeIssue(node, 'missing-ownership-outage-rendering', `Utility node ${node.id} must include owner, outage, isolation, and render binding metadata.`));
    }

    if (
      node.accessPoint.clearAccessMeters <= 0 ||
      !hasObjectId(city, node.accessPoint.objectId) ||
      !isPointInsideUtilityServiceArea(node.accessPoint.position, serviceAreasById.get(node.serviceArea.serviceAreaBoundaryId))
    ) {
      issues.push(createUtilityNodeIssue(node, 'invalid-access-point', `Utility node ${node.id} must expose a reachable access point inside its service area.`));
    }

    for (const edgeId of node.connectedEdgeIds) {
      if (!utilityEdgeIds.has(edgeId)) {
        issues.push(createUtilityNodeIssue(node, `missing-connected-edge-${toIssueIdToken(edgeId)}`, `Utility node ${node.id} references missing connected edge ${edgeId}.`));
      }
    }

    for (const parcelId of node.serviceArea.parcelIds) {
      const parcel = city.objectIndex.objectsById[parcelId];
      if (!parcel || parcel.kind !== 'parcel') {
        issues.push(createUtilityNodeIssue(node, `missing-service-parcel-${toIssueIdToken(parcelId)}`, `Utility node ${node.id} service area references missing parcel ${parcelId}.`));
      }
    }

    for (const criticalObjectId of node.serviceArea.criticalObjectIds) {
      if (!hasObjectId(city, criticalObjectId)) {
        issues.push(createUtilityNodeIssue(node, `missing-critical-object-${toIssueIdToken(criticalObjectId)}`, `Utility node ${node.id} references missing critical service object ${criticalObjectId}.`));
      }
    }
  }

  for (const edge of city.utilityEdges) {
    const fromNode = utilityNodesById.get(edge.fromNodeId);
    const toNode = utilityNodesById.get(edge.toNodeId);

    if (!fromNode || !toNode) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-node-reference', `Utility edge ${edge.id} must connect two generated utility nodes.`));
      continue;
    }

    if (edge.utilityType !== fromNode.utilityType || edge.serviceAreaBoundaryId !== fromNode.serviceArea.serviceAreaBoundaryId) {
      issues.push(createUtilityEdgeIssue(edge, 'node-network-mismatch', `Utility edge ${edge.id} must match the source node utility type and service area.`));
    }

    if (edge.lengthMeters <= 0 || edge.centerline.length < 2) {
      issues.push(createUtilityEdgeIssue(edge, 'invalid-centerline', `Utility edge ${edge.id} must expose a positive-length centerline.`));
    }

    if (edge.capacity.value <= 0 || edge.capacity.peakLoadFactor <= 0 || edge.capacity.peakLoadFactor > 1) {
      issues.push(createUtilityEdgeIssue(edge, 'invalid-capacity', `Utility edge ${edge.id} must expose positive capacity and a peak load factor from 0 to 1.`));
    }

    if (!edge.accessPointIds.includes(edge.fromNodeId) || !edge.accessPointIds.includes(edge.toNodeId)) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-access-point-links', `Utility edge ${edge.id} must list both endpoint nodes as access points.`));
    }

    if (!edge.ownerEntityId || !edge.outageDomainId || !edge.renderBindingId) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-ownership-outage-rendering', `Utility edge ${edge.id} must include owner, outage, and render binding metadata.`));
    }
  }

  if (utilityTypes.size < 4) {
    issues.push({
      id: 'missing-utility-network-coverage',
      severity: 'error',
      category: 'utility-coverage',
      message: 'Utility base must seed multiple utility network types before specialized systems are generated.'
    });
  }
}

function createUtilityNodeIssue(node: ValidationUtilityNode, suffix: string, message: string): ValidationIssue {
  return {
    id: `invalid-utility-node-${node.id}-${suffix}`,
    severity: 'error',
    category: 'utility-coverage',
    objectId: node.id,
    affectedPoint: node.center,
    message
  };
}

function createUtilityEdgeIssue(edge: ValidationUtilityEdge, suffix: string, message: string): ValidationIssue {
  return {
    id: `invalid-utility-edge-${edge.id}-${suffix}`,
    severity: 'error',
    category: 'utility-coverage',
    objectId: edge.id,
    affectedPoint: edge.centerline[0],
    message
  };
}

function validateServiceAccessCorridors(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const corridorIds = new Set(city.serviceAccessCorridors.map((corridor) => corridor.id));
  const cadastreEasementIds = new Set(city.cadastreRecords.flatMap((record) => record.easements.map((easement) => easement.id)));

  if (city.serviceAccessCorridors.length === 0) {
    issues.push({
      id: 'missing-service-access-corridors',
      severity: 'error',
      category: 'utility-coverage',
      message: 'Service access corridors must expose maintenance paths, utility easements, vault access, and restricted access zones.'
    });
  }

  for (const corridor of city.serviceAccessCorridors) {
    if (
      corridor.boundary.length < 4 ||
      corridor.lengthMeters <= 0 ||
      corridor.widthMeters <= 0 ||
      corridor.clearAccessMeters <= 0 ||
      corridor.clearAccessMeters > corridor.widthMeters
    ) {
      issues.push(createServiceAccessCorridorIssue(corridor, 'invalid-geometry', `Service access corridor ${corridor.id} must expose usable boundary, length, width, and clear access dimensions.`));
    }

    if (
      corridor.utilityNodeIds.length === 0 &&
      corridor.utilityEdgeIds.length === 0 &&
      corridor.buildingIds.length === 0 &&
      corridor.parcelIds.length === 0 &&
      corridor.roadIds.length === 0
    ) {
      issues.push(createServiceAccessCorridorIssue(corridor, 'missing-object-links', `Service access corridor ${corridor.id} must link to at least one maintained city object.`));
    }

    validateServiceAccessReferences(city, issues, corridor, corridor.utilityNodeIds, 'utility-node', 'utility-node');
    validateServiceAccessReferences(city, issues, corridor, corridor.utilityEdgeIds, 'utility-edge', 'utility-edge');
    validateServiceAccessReferences(city, issues, corridor, corridor.buildingIds, 'building', 'building');
    validateServiceAccessReferences(city, issues, corridor, corridor.parcelIds, 'parcel', 'parcel');
    validateServiceAccessReferences(city, issues, corridor, corridor.cadastreRecordIds, 'cadastre-record', 'cadastre-record');
    validateServiceAccessReferences(city, issues, corridor, corridor.roadIds, 'road', 'road-segment');

    for (const easementId of corridor.cadastreEasementIds) {
      if (!cadastreEasementIds.has(easementId)) {
        issues.push(createServiceAccessCorridorIssue(corridor, `missing-easement-${toIssueIdToken(easementId)}`, `Service access corridor ${corridor.id} references missing cadastre easement ${easementId}.`));
      }
    }

    if (corridor.restricted && (corridor.restrictions.length === 0 || corridor.authorizedRoleIds.length === 0)) {
      issues.push(createServiceAccessCorridorIssue(corridor, 'missing-access-control', `Restricted service access corridor ${corridor.id} must declare restrictions and authorized roles.`));
    }

    if (
      !Number.isInteger(corridor.maintenanceWindow.startHour) ||
      !Number.isInteger(corridor.maintenanceWindow.endHour) ||
      corridor.maintenanceWindow.startHour < 0 ||
      corridor.maintenanceWindow.endHour > 23 ||
      corridor.maintenanceWindow.startHour >= corridor.maintenanceWindow.endHour ||
      corridor.maintenanceWindow.days.length === 0
    ) {
      issues.push(createServiceAccessCorridorIssue(corridor, 'invalid-maintenance-window', `Service access corridor ${corridor.id} must expose a bounded maintenance window and at least one operating day.`));
    }
  }

  for (const node of city.utilityNodes) {
    validateServiceAccessReferenceList(issues, node.serviceAccessCorridorIds, corridorIds, {
      missingId: `invalid-utility-node-${node.id}-missing-service-access-corridor`,
      invalidPrefix: `invalid-utility-node-${node.id}-missing-service-access-corridor`,
      objectId: node.id,
      point: node.center,
      missingMessage: `Utility node ${node.id} must expose at least one service access corridor.`,
      invalidMessage: (corridorId) => `Utility node ${node.id} references missing service access corridor ${corridorId}.`
    });
  }

  for (const edge of city.utilityEdges) {
    validateServiceAccessReferenceList(issues, edge.serviceAccessCorridorIds, corridorIds, {
      missingId: `invalid-utility-edge-${edge.id}-missing-service-access-corridor`,
      invalidPrefix: `invalid-utility-edge-${edge.id}-missing-service-access-corridor`,
      objectId: edge.id,
      point: edge.centerline[0],
      missingMessage: `Utility edge ${edge.id} must expose at least one service access corridor.`,
      invalidMessage: (corridorId) => `Utility edge ${edge.id} references missing service access corridor ${corridorId}.`
    });
  }

  for (const building of city.buildings) {
    validateServiceAccessReferenceList(issues, building.serviceAccessCorridorIds, corridorIds, {
      missingId: `invalid-building-${building.id}-missing-service-access-corridor`,
      invalidPrefix: `invalid-building-${building.id}-missing-service-access-corridor`,
      objectId: building.id,
      point: building.center,
      missingMessage: `Building ${building.id} must expose at least one service access corridor.`,
      invalidMessage: (corridorId) => `Building ${building.id} references missing service access corridor ${corridorId}.`
    });
  }
}

function validateServiceAccessReferences(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  corridor: ValidationServiceAccessCorridor,
  objectIds: readonly CityId[],
  suffixKind: string,
  expectedKind: CityObjectKind
): void {
  for (const objectId of objectIds) {
    const object = city.objectIndex.objectsById[objectId];
    if (!object || object.kind !== expectedKind) {
      issues.push(createServiceAccessCorridorIssue(corridor, `missing-${suffixKind}-${toIssueIdToken(objectId)}`, `Service access corridor ${corridor.id} references missing ${suffixKind} ${objectId}.`));
    }
  }
}

function validateServiceAccessReferenceList(
  issues: ValidationIssue[],
  references: readonly CityId[] | undefined,
  corridorIds: ReadonlySet<CityId>,
  options: {
    readonly missingId: string;
    readonly invalidPrefix: string;
    readonly objectId: CityId;
    readonly point: Point2D;
    readonly missingMessage: string;
    readonly invalidMessage: (corridorId: CityId) => string;
  }
): void {
  if (!references || references.length === 0) {
    issues.push({
      id: options.missingId,
      severity: 'error',
      category: 'utility-coverage',
      objectId: options.objectId,
      affectedPoint: options.point,
      message: options.missingMessage
    });
    return;
  }

  for (const corridorId of references) {
    if (!corridorIds.has(corridorId)) {
      issues.push({
        id: `${options.invalidPrefix}-${toIssueIdToken(corridorId)}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: options.objectId,
        affectedPoint: options.point,
        message: options.invalidMessage(corridorId)
      });
    }
  }
}

function createServiceAccessCorridorIssue(
  corridor: ValidationServiceAccessCorridor,
  suffix: string,
  message: string
): ValidationIssue {
  return {
    id: `invalid-service-access-corridor-${corridor.id}-${suffix}`,
    severity: 'error',
    category: 'utility-coverage',
    objectId: corridor.id,
    affectedBoundary: corridor.boundary,
    message
  };
}

function validateAccessControls(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const navigationEdgesById = new Map(city.navigationGraphEdges.map((edge) => [edge.id, edge]));
  const controlsByKind = countBy(city.accessControls, (control) => control.controlKind);
  const navigationControlledEdges = city.navigationGraphEdges.filter((edge) => (edge.accessControlIds ?? []).length > 0);

  if (city.accessControls.length === 0) {
    issues.push({
      id: 'missing-access-controls',
      severity: 'error',
      category: 'land',
      message: 'The city must expose barriers, gates, fences, bollards, turnstiles, and checkpoints as access-control objects.'
    });
  }

  for (const kind of ACCESS_CONTROL_KINDS) {
    if ((controlsByKind[kind] ?? 0) === 0) {
      issues.push({
        id: `missing-access-control-kind-${kind}`,
        severity: 'error',
        category: 'land',
        message: `Access control generation must include at least one ${kind}.`
      });
    }
  }

  if (navigationControlledEdges.length === 0) {
    issues.push({
      id: 'missing-access-controlled-navigation-edges',
      severity: 'error',
      category: 'graph',
      message: 'Access controls must annotate at least one navigation graph edge with access restrictions.'
    });
  }

  for (const control of city.accessControls) {
    if (!includesValue(ACCESS_CONTROL_KINDS, control.controlKind) || !includesValue(ACCESS_CONTROL_RULE_KINDS, control.ruleKind)) {
      issues.push(createAccessControlIssue(control, 'invalid-kind', `Access control ${control.id} uses an unknown control or rule kind.`));
    }

    if (
      control.centerline.length < 2 ||
      control.boundary.length < 4 ||
      control.heightMeters <= 0 ||
      control.widthMeters <= 0 ||
      control.clearanceMeters < 0
    ) {
      issues.push(createAccessControlIssue(control, 'invalid-geometry', `Access control ${control.id} must expose usable centerline, boundary, height, width, and clearance values.`));
    }

    const allowedModes = new Set(control.allowedModes);
    const restrictedModes = new Set(control.restrictedModes);
    if (
      control.allowedModes.length === 0 ||
      control.allowedModes.some((mode) => restrictedModes.has(mode)) ||
      control.restrictedModes.some((mode) => allowedModes.has(mode))
    ) {
      issues.push(createAccessControlIssue(control, 'invalid-mode-rules', `Access control ${control.id} must declare non-overlapping allowed and restricted navigation modes.`));
    }

    if (!control.publicAccess && control.authorizedRoleIds.length === 0) {
      issues.push(createAccessControlIssue(control, 'missing-authorized-roles', `Private or restricted access control ${control.id} must declare authorized roles.`));
    }

    if ((control.controlKind === 'gate' || control.controlKind === 'checkpoint') && control.serviceAccessCorridorIds.length === 0) {
      issues.push(createAccessControlIssue(control, 'missing-service-corridor', `Gate or checkpoint ${control.id} must link to a service access corridor.`));
    }

    if (control.controlKind === 'turnstile' && control.transitStopIds.length === 0) {
      issues.push(createAccessControlIssue(control, 'missing-transit-stop', `Turnstile ${control.id} must link to a transit stop.`));
    }

    validateAccessControlReferences(city, issues, control, control.controlledObjectIds, 'controlled-object');
    validateAccessControlReferences(city, issues, control, control.relatedConstraintIds, 'constraint', 'constraint');
    validateAccessControlReferences(city, issues, control, control.hazardZoneIds, 'hazard-zone', 'hazard-zone');
    validateAccessControlReferences(city, issues, control, control.serviceAccessCorridorIds, 'service-access-corridor', 'service-access-corridor');
    validateAccessControlReferences(city, issues, control, control.roadIds, 'road', 'road-segment');
    validateAccessControlReferences(city, issues, control, control.sidewalkIds, 'sidewalk', 'sidewalk');
    validateAccessControlReferences(city, issues, control, control.crossingIds, 'crossing', 'crossing');
    validateAccessControlReferences(city, issues, control, control.buildingEntranceIds, 'building-entrance', 'building-entrance');
    validateAccessControlReferences(city, issues, control, control.parcelIds, 'parcel', 'parcel');
    validateAccessControlReferences(city, issues, control, control.transitStopIds, 'transit-stop', 'transit-stop');

    for (const edgeId of control.navigationGraphEdgeIds) {
      const edge = navigationEdgesById.get(edgeId);
      if (!edge || !(edge.accessControlIds ?? []).includes(control.id)) {
        issues.push({
          id: `invalid-access-control-navigation-edge-${control.id}-${edgeId}`,
          severity: 'error',
          category: 'graph',
          objectId: control.id,
          affectedPoint: control.center,
          message: `Access control ${control.id} references missing or unlinked navigation edge ${edgeId}.`
        });
      }
    }
  }
}

function validateAccessControlReferences(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  control: ValidationAccessControl,
  objectIds: readonly CityId[],
  suffixKind: string,
  expectedKind?: CityObjectKind
): void {
  for (const objectId of objectIds) {
    const object = city.objectIndex.objectsById[objectId];
    if (!object || (expectedKind && object.kind !== expectedKind)) {
      issues.push(createAccessControlIssue(control, `missing-${suffixKind}-${toIssueIdToken(objectId)}`, `Access control ${control.id} references missing ${suffixKind} ${objectId}.`));
    }
  }
}

function createAccessControlIssue(
  control: ValidationAccessControl,
  suffix: string,
  message: string
): ValidationIssue {
  return {
    id: `invalid-access-control-${control.id}-${suffix}`,
    severity: 'error',
    category: 'land',
    objectId: control.id,
    affectedBoundary: control.boundary,
    message
  };
}

function validateBuildingEntrancesAndAddresses(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const entranceIds = new Set(city.buildingEntrances.map((entrance) => entrance.id));
  const addressPointIds = new Set(city.addressPoints.map((addressPoint) => addressPoint.id));
  const activeFrontageIds = new Set(city.activeFrontages.map((frontage) => frontage.id));
  const serviceAccessIds = new Set(city.serviceAccessCorridors.map((corridor) => corridor.id));
  const entrancesById = new Map(city.buildingEntrances.map((entrance) => [entrance.id, entrance]));

  if (city.buildingEntrances.length === 0 || city.addressPoints.length === 0) {
    issues.push({
      id: 'missing-building-entrance-address-objects',
      severity: 'error',
      category: 'zoning',
      message: 'Buildings must expose generated entrance and address point objects.'
    });
  }

  for (const entrance of city.buildingEntrances) {
    if (entrance.widthMeters <= 0 || entrance.door.clearWidthMeters <= 0) {
      issues.push(createBuildingEntranceIssue(entrance, 'invalid-door-geometry', `Building entrance ${entrance.id} must expose positive door and clear-width geometry.`));
    }
    validateEntranceReference(city, issues, entrance, entrance.buildingId, 'building', 'building');
    validateEntranceReference(city, issues, entrance, entrance.parcelId, 'parcel', 'parcel');
    validateEntranceReference(city, issues, entrance, entrance.roadId, 'road', 'road-segment');
    if (entrance.sidewalkId) {
      validateEntranceReference(city, issues, entrance, entrance.sidewalkId, 'sidewalk', 'sidewalk');
    }
    if (!addressPointIds.has(entrance.addressPointId)) {
      issues.push(createBuildingEntranceIssue(entrance, `missing-address-point-${toIssueIdToken(entrance.addressPointId)}`, `Building entrance ${entrance.id} references missing address point ${entrance.addressPointId}.`));
    }
    for (const frontageId of entrance.activeFrontageIds) {
      if (!activeFrontageIds.has(frontageId)) {
        issues.push(createBuildingEntranceIssue(entrance, `missing-active-frontage-${toIssueIdToken(frontageId)}`, `Building entrance ${entrance.id} references missing active frontage ${frontageId}.`));
      }
    }
    for (const corridorId of entrance.serviceAccessCorridorIds) {
      if (!serviceAccessIds.has(corridorId)) {
        issues.push(createBuildingEntranceIssue(entrance, `missing-service-access-corridor-${toIssueIdToken(corridorId)}`, `Building entrance ${entrance.id} references missing service access corridor ${corridorId}.`));
      }
    }
    if ((entrance.entranceKind === 'public-door' || entrance.entranceKind === 'lobby' || entrance.entranceKind === 'ramp') && (!entrance.accessible || !entrance.stepFree)) {
      issues.push(createBuildingEntranceIssue(entrance, 'public-entry-not-accessible', `Public building entrance ${entrance.id} must be accessible and step-free.`));
    }
    if (entrance.entranceKind === 'service-entry' && entrance.serviceAccessCorridorIds.length === 0) {
      issues.push(createBuildingEntranceIssue(entrance, 'missing-service-access', `Service entrance ${entrance.id} must link to service access corridors.`));
    }
    if (entrance.entranceKind === 'loading-door' && (!entrance.loading || entrance.loading.loadingBays <= 0 || entrance.serviceAccessCorridorIds.length === 0)) {
      issues.push(createBuildingEntranceIssue(entrance, 'invalid-loading-door', `Loading entrance ${entrance.id} must expose loading metadata and service access corridors.`));
    }
    if (entrance.entranceKind === 'ramp' && (!entrance.ramp || entrance.ramp.slopePercent <= 0 || entrance.ramp.slopePercent > 8.33)) {
      issues.push(createBuildingEntranceIssue(entrance, 'invalid-ramp', `Ramp entrance ${entrance.id} must expose a usable slope no steeper than 8.33%.`));
    }
    if (entrance.entranceKind === 'lobby' && (!entrance.lobby || entrance.lobby.areaSqM <= 0)) {
      issues.push(createBuildingEntranceIssue(entrance, 'invalid-lobby', `Lobby entrance ${entrance.id} must expose positive lobby area metadata.`));
    }
  }

  for (const addressPoint of city.addressPoints) {
    validateAddressReference(city, issues, addressPoint, addressPoint.buildingId, 'building', 'building');
    validateAddressReference(city, issues, addressPoint, addressPoint.parcelId, 'parcel', 'parcel');
    validateAddressReference(city, issues, addressPoint, addressPoint.roadId, 'road', 'road-segment');
    if (!addressPoint.streetName || !addressPoint.buildingNumber || !addressPoint.postalCode) {
      issues.push(createAddressPointIssue(addressPoint, 'missing-address-fields', `Address point ${addressPoint.id} must expose street name, building number, and postal code.`));
    }
    if (!addressPoint.formattedAddress || !addressPoint.neighborhoodId || !addressPoint.wardId || !addressPoint.districtId || !addressPoint.placeIds || addressPoint.placeIds.length === 0) {
      issues.push(createAddressPointIssue(addressPoint, 'missing-gazetteer-context', `Address point ${addressPoint.id} must expose formatted address, neighborhood, ward, district, and named place links.`));
    }
    if (!addressPoint.importTags?.['addr:housenumber'] || !addressPoint.importTags?.['addr:street'] || !addressPoint.importTags?.['addr:postcode']) {
      issues.push(createAddressPointIssue(addressPoint, 'missing-import-tags', `Address point ${addressPoint.id} must expose OSM-style address import tags.`));
    }
    if (addressPoint.entranceIds.length === 0) {
      issues.push(createAddressPointIssue(addressPoint, 'missing-entrances', `Address point ${addressPoint.id} must link to at least one entrance.`));
    }
    for (const entranceId of addressPoint.entranceIds) {
      if (!entranceIds.has(entranceId)) {
        issues.push(createAddressPointIssue(addressPoint, `missing-entrance-${toIssueIdToken(entranceId)}`, `Address point ${addressPoint.id} references missing entrance ${entranceId}.`));
      }
    }
    for (const frontageId of addressPoint.activeFrontageIds) {
      if (!activeFrontageIds.has(frontageId)) {
        issues.push(createAddressPointIssue(addressPoint, `missing-active-frontage-${toIssueIdToken(frontageId)}`, `Address point ${addressPoint.id} references missing active frontage ${frontageId}.`));
      }
    }
  }

  for (const building of city.buildings) {
    if (building.publicEntranceIds.length === 0 || !building.publicEntranceIds.some((entranceId) => entrancesById.get(entranceId)?.accessible)) {
      issues.push(createBuildingAccessIssue(building, 'missing-accessible-public-entrance', `Building ${building.id} must expose at least one accessible public entrance.`));
    }
    for (const entranceId of building.entranceIds) {
      if (!entranceIds.has(entranceId)) {
        issues.push(createBuildingAccessIssue(building, `missing-entrance-${toIssueIdToken(entranceId)}`, `Building ${building.id} references missing entrance ${entranceId}.`));
      }
    }
    if (!building.addressPointIds || building.addressPointIds.length === 0) {
      issues.push(createBuildingAccessIssue(building, 'missing-address-point', `Building ${building.id} must expose at least one address point.`));
    } else {
      for (const addressPointId of building.addressPointIds) {
        if (!addressPointIds.has(addressPointId)) {
          issues.push(createBuildingAccessIssue(building, `missing-address-point-${toIssueIdToken(addressPointId)}`, `Building ${building.id} references missing address point ${addressPointId}.`));
        }
      }
    }
    if ((building.typology.serviceAccess === 'curb-loading' || building.typology.serviceAccess === 'yard-loading') && (!building.loadingEntranceIds || building.loadingEntranceIds.length === 0)) {
      issues.push(createBuildingAccessIssue(building, 'missing-loading-entrance', `Loading/service building ${building.id} must expose a loading entrance.`));
    }
    if (!building.serviceEntranceIds || building.serviceEntranceIds.length === 0) {
      issues.push(createBuildingAccessIssue(building, 'missing-service-entrance', `Building ${building.id} must expose a service entrance.`));
    }
  }

  for (const frontage of city.activeFrontages) {
    for (const entranceId of frontage.publicEntranceIds) {
      const entrance = entrancesById.get(entranceId);
      if (!entrance || entrance.buildingId !== frontage.buildingId) {
        issues.push({
          id: `invalid-active-frontage-${frontage.id}-missing-public-entrance-${toIssueIdToken(entranceId)}`,
          severity: 'error',
          category: 'zoning',
          objectId: frontage.id,
          affectedPoint: frontage.position,
          message: `Active frontage ${frontage.id} references missing public entrance ${entranceId}.`
        });
      }
    }
  }
}

function validateEntranceReference(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  entrance: ValidationBuildingEntrance,
  objectId: CityId,
  suffixKind: string,
  expectedKind: CityObjectKind
): void {
  const object = city.objectIndex.objectsById[objectId];
  if (!object || object.kind !== expectedKind) {
    issues.push(createBuildingEntranceIssue(entrance, `missing-${suffixKind}-${toIssueIdToken(objectId)}`, `Building entrance ${entrance.id} references missing ${suffixKind} ${objectId}.`));
  }
}

function validateAddressReference(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  addressPoint: ValidationAddressPoint,
  objectId: CityId,
  suffixKind: string,
  expectedKind: CityObjectKind
): void {
  const object = city.objectIndex.objectsById[objectId];
  if (!object || object.kind !== expectedKind) {
    issues.push(createAddressPointIssue(addressPoint, `missing-${suffixKind}-${toIssueIdToken(objectId)}`, `Address point ${addressPoint.id} references missing ${suffixKind} ${objectId}.`));
  }
}

function createBuildingEntranceIssue(
  entrance: ValidationBuildingEntrance,
  suffix: string,
  message: string
): ValidationIssue {
  return {
    id: `invalid-building-entrance-${entrance.id}-${suffix}`,
    severity: 'error',
    category: 'zoning',
    objectId: entrance.id,
    affectedPoint: entrance.position,
    message
  };
}

function createAddressPointIssue(addressPoint: ValidationAddressPoint, suffix: string, message: string): ValidationIssue {
  return {
    id: `invalid-address-point-${addressPoint.id}-${suffix}`,
    severity: 'error',
    category: 'zoning',
    objectId: addressPoint.id,
    affectedPoint: addressPoint.position,
    message
  };
}

function createBuildingAccessIssue(building: ValidationBuilding, suffix: string, message: string): ValidationIssue {
  return {
    id: `invalid-building-${building.id}-${suffix}`,
    severity: 'error',
    category: 'zoning',
    objectId: building.id,
    affectedBoundary: building.footprint,
    message
  };
}

function validateBuildingFireSafetyProfiles(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const profilesByBuildingId = groupBy(city.buildingFireSafetyProfiles, (profile) => profile.buildingId);
  const entrancesById = new Map(city.buildingEntrances.map((entrance) => [entrance.id, entrance]));
  const utilityNodesById = new Map(city.utilityNodes.map((node) => [node.id, node]));
  const curbZonesById = new Map(city.curbZones.map((curbZone) => [curbZone.id, curbZone]));
  const serviceAccessIds = new Set(city.serviceAccessCorridors.map((corridor) => corridor.id));

  if (city.buildingFireSafetyProfiles.length === 0) {
    issues.push({
      id: 'missing-building-fire-safety-profiles',
      severity: 'error',
      category: 'utility-coverage',
      message: 'Buildings must expose fire-safety profiles for egress, hydrant reach, sprinklers, refuge, and emergency access.'
    });
  }

  for (const building of city.buildings) {
    const profiles = profilesByBuildingId.get(building.id) ?? [];

    if (profiles.length === 0) {
      issues.push(createBuildingAccessIssue(building, 'missing-fire-safety-profile', `Building ${building.id} must expose a fire-safety profile.`));
    }

    if (profiles.length > 1) {
      issues.push(createBuildingAccessIssue(building, 'duplicate-fire-safety-profile', `Building ${building.id} must expose exactly one fire-safety profile.`));
    }
  }

  for (const profile of city.buildingFireSafetyProfiles) {
    const building = city.buildings.find((candidate) => candidate.id === profile.buildingId);
    const hydrant = utilityNodesById.get(profile.hydrantNodeId);

    if (!building || profile.parentId !== profile.buildingId) {
      issues.push(createBuildingFireSafetyIssue(profile, 'missing-building', `Fire-safety profile ${profile.id} must reference its building as parent.`, 'zoning'));
      continue;
    }

    if (profile.parcelId !== building.parcelId || profile.roadId !== building.primaryFrontageRoadId) {
      issues.push(createBuildingFireSafetyIssue(profile, 'building-context-mismatch', `Fire-safety profile ${profile.id} must match the building parcel and frontage road.`, 'zoning', building));
    }

    if (!hydrant || hydrant.kind !== 'utility-node' || hydrant.waterSupply?.equipmentKind !== 'hydrant') {
      issues.push(createBuildingFireSafetyIssue(profile, 'missing-hydrant', `Fire-safety profile ${profile.id} references missing hydrant ${profile.hydrantNodeId}.`, 'utility-coverage', building));
    }

    if (
      profile.hydrantDistanceMeters <= 0 ||
      profile.hydrantReachMeters <= 0 ||
      profile.hydrantDistanceMeters > profile.hydrantReachMeters ||
      !profile.hydrantWithinReach ||
      !profile.emergencyAccess.hydrantReachProvided
    ) {
      issues.push(createBuildingFireSafetyIssue(profile, 'hydrant-reach-exceeded', `Fire-safety profile ${profile.id} must keep the assigned hydrant within declared emergency reach.`, 'utility-coverage', building));
    }

    if (!profile.fireLaneClearance || !profile.emergencyAccess.fireLaneProvided || profile.fireLaneCurbZoneIds.length === 0) {
      issues.push(createBuildingFireSafetyIssue(profile, 'missing-fire-lane', `Fire-safety profile ${profile.id} must link to at least one clear fire-lane curb zone.`, 'graph', building));
    }

    for (const curbZoneId of profile.fireLaneCurbZoneIds) {
      const curbZone = curbZonesById.get(curbZoneId);
      if (
        !curbZone ||
        !curbZone.management.fireLaneClearance ||
        (curbZone.curbUse !== 'emergency' && curbZone.curbUse !== 'no-stopping')
      ) {
        issues.push(createBuildingFireSafetyIssue(profile, `invalid-fire-lane-${toIssueIdToken(curbZoneId)}`, `Fire-safety profile ${profile.id} references invalid fire-lane curb zone ${curbZoneId}.`, 'graph', building));
      }
    }

    validateFireSafetyEntrances(city, issues, profile, building, entrancesById);

    for (const corridorId of profile.serviceAccessCorridorIds) {
      if (!serviceAccessIds.has(corridorId)) {
        issues.push(createBuildingFireSafetyIssue(profile, `missing-service-access-${toIssueIdToken(corridorId)}`, `Fire-safety profile ${profile.id} references missing service access corridor ${corridorId}.`, 'utility-coverage', building));
      }
    }

    if (!profile.emergencyAccess.serviceAccessProvided || profile.serviceAccessCorridorIds.length === 0) {
      issues.push(createBuildingFireSafetyIssue(profile, 'missing-emergency-service-access', `Fire-safety profile ${profile.id} must expose an emergency-capable service access route.`, 'utility-coverage', building));
    }

    if (profile.sprinkler.required) {
      const sprinklerNode = utilityNodesById.get(profile.sprinkler.waterServiceNodeId);
      if (
        !profile.sprinkler.provided ||
        !sprinklerNode ||
        sprinklerNode.kind !== 'utility-node' ||
        sprinklerNode.utilityType !== 'water' ||
        profile.sprinkler.estimatedFlowLitersPerSecond <= 0 ||
        !profile.sprinkler.pressureZoneId
      ) {
        issues.push(createBuildingFireSafetyIssue(profile, 'invalid-sprinkler-service', `Fire-safety profile ${profile.id} requires sprinkler service backed by a water utility node and pressure zone.`, 'utility-coverage', building));
      }
    }

    if ((profile.riskClass === 'mid-rise' || profile.riskClass === 'high-rise' || profile.riskClass === 'assembly') && profile.refugeAreas.length === 0) {
      issues.push(createBuildingFireSafetyIssue(profile, 'missing-refuge-area', `Fire-safety profile ${profile.id} must expose refuge areas for elevated or assembly risk.`, 'zoning', building));
    }

    for (const refugeArea of profile.refugeAreas) {
      if (refugeArea.level <= 0 || refugeArea.areaSqM <= 0 || refugeArea.capacityPersons <= 0) {
        issues.push(createBuildingFireSafetyIssue(profile, `invalid-refuge-${toIssueIdToken(refugeArea.id)}`, `Fire-safety profile ${profile.id} refuge area ${refugeArea.id} must expose level, area, and capacity.`, 'zoning', building));
      }
    }
  }
}

function validateFireSafetyEntrances(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  profile: ValidationBuildingFireSafetyProfile,
  building: ValidationBuilding,
  entrancesById: ReadonlyMap<CityId, ValidationBuildingEntrance>
): void {
  if (
    profile.egress.providedExitCount < profile.egress.requiredExitCount ||
    profile.egress.providedExitCount !== profile.egressEntranceIds.length ||
    profile.egress.totalExitWidthMeters <= 0 ||
    profile.egress.exitCapacityPersons <= 0 ||
    profile.egress.minExitSeparationMeters <= 0
  ) {
    issues.push(createBuildingFireSafetyIssue(profile, 'insufficient-egress', `Fire-safety profile ${profile.id} must provide enough separated exit capacity.`, 'graph', building));
  }

  if (profile.emergencyAccessEntranceIds.length === 0 || profile.emergencyAccess.maxAccessDistanceMeters <= 0) {
    issues.push(createBuildingFireSafetyIssue(profile, 'missing-emergency-access-entrance', `Fire-safety profile ${profile.id} must expose emergency access entrances and access distance.`, 'graph', building));
  }

  for (const entranceId of [...profile.egressEntranceIds, ...profile.emergencyAccessEntranceIds]) {
    const entrance = entrancesById.get(entranceId);
    if (!entrance || entrance.buildingId !== profile.buildingId) {
      issues.push(createBuildingFireSafetyIssue(profile, `missing-entrance-${toIssueIdToken(entranceId)}`, `Fire-safety profile ${profile.id} references missing building entrance ${entranceId}.`, 'graph', building));
    }
  }

  for (const entranceId of profile.egressEntranceIds) {
    const entrance = entrancesById.get(entranceId);
    if (entrance && (entrance.door.clearWidthMeters <= 0 || !city.objectIndex.objectsById[entrance.id])) {
      issues.push(createBuildingFireSafetyIssue(profile, `invalid-egress-entrance-${toIssueIdToken(entranceId)}`, `Fire-safety profile ${profile.id} references unusable egress entrance ${entranceId}.`, 'graph', building));
    }
  }
}

function createBuildingFireSafetyIssue(
  profile: ValidationBuildingFireSafetyProfile,
  suffix: string,
  message: string,
  category: ValidationIssue['category'],
  building?: ValidationBuilding
): ValidationIssue {
  return {
    id: `invalid-building-fire-safety-${profile.id}-${suffix}`,
    severity: 'error',
    category,
    objectId: profile.id,
    affectedBoundary: building?.footprint,
    message
  };
}

function validateAddressingGazetteer(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const namedPlaceIds = new Set(city.namedPlaces.map((place) => place.id));
  const gazetteerEntryIds = new Set(city.gazetteerEntries.map((entry) => entry.id));
  const addressPointIds = new Set(city.addressPoints.map((addressPoint) => addressPoint.id));
  const anchorAddressIds = new Set(city.civicAnchors.flatMap((anchor) => anchor.addressPointIds ?? []));

  if (city.namedPlaces.length === 0 || city.gazetteerEntries.length === 0) {
    issues.push({
      id: 'missing-addressing-gazetteer',
      severity: 'error',
      category: 'land',
      message: 'Addressing must expose named places and gazetteer entries.'
    });
  }

  for (const addressPoint of city.addressPoints) {
    for (const placeId of addressPoint.placeIds ?? []) {
      if (!namedPlaceIds.has(placeId)) {
        issues.push(createAddressPointIssue(addressPoint, `missing-named-place-${toIssueIdToken(placeId)}`, `Address point ${addressPoint.id} references missing named place ${placeId}.`));
      }
    }
    if (!city.gazetteerEntries.some((entry) => entry.addressPointId === addressPoint.id && entry.entryKind === 'address')) {
      issues.push(createAddressPointIssue(addressPoint, 'missing-gazetteer-entry', `Address point ${addressPoint.id} must have an address gazetteer entry.`));
    }
  }

  for (const place of city.namedPlaces) {
    validateGazetteerSourceReference(city, issues, place, place.sourceObjectId, place.sourceObjectKind);
    if (!place.name || !place.normalizedName || place.placeTags.length === 0) {
      issues.push(createNamedPlaceIssue(place, 'missing-name-or-tags', `Named place ${place.id} must expose searchable name and tags.`));
    }
    for (const addressPointId of place.addressPointIds) {
      if (!addressPointIds.has(addressPointId)) {
        issues.push(createNamedPlaceIssue(place, `missing-address-point-${toIssueIdToken(addressPointId)}`, `Named place ${place.id} references missing address point ${addressPointId}.`));
      }
    }
    if (!city.gazetteerEntries.some((entry) => entry.placeId === place.id)) {
      issues.push(createNamedPlaceIssue(place, 'missing-gazetteer-entry', `Named place ${place.id} must have a gazetteer entry.`));
    }
  }

  for (const entry of city.gazetteerEntries) {
    if (gazetteerEntryIds.size !== city.gazetteerEntries.length) {
      issues.push({
        id: 'duplicate-gazetteer-entry-ids',
        severity: 'error',
        category: 'land',
        message: 'Gazetteer entry IDs must be unique.'
      });
      break;
    }
    validateGazetteerSourceReference(city, issues, entry, entry.sourceObjectId, entry.sourceObjectKind);
    if (!entry.displayName || !entry.normalizedName || entry.searchTokens.length === 0 || entry.reverseLookupRadiusMeters <= 0) {
      issues.push(createGazetteerEntryIssue(entry, 'missing-search-or-reverse-lookup', `Gazetteer entry ${entry.id} must expose display/search text and positive reverse lookup radius.`));
    }
    if (entry.addressPointId && !addressPointIds.has(entry.addressPointId)) {
      issues.push(createGazetteerEntryIssue(entry, `missing-address-point-${toIssueIdToken(entry.addressPointId)}`, `Gazetteer entry ${entry.id} references missing address point ${entry.addressPointId}.`));
    }
    if (entry.placeId && !namedPlaceIds.has(entry.placeId)) {
      issues.push(createGazetteerEntryIssue(entry, `missing-place-${toIssueIdToken(entry.placeId)}`, `Gazetteer entry ${entry.id} references missing named place ${entry.placeId}.`));
    }
    if (entry.entryKind === 'address' && (!entry.importTags?.['addr:housenumber'] || !entry.importTags?.['addr:street'])) {
      issues.push(createGazetteerEntryIssue(entry, 'missing-address-import-tags', `Address gazetteer entry ${entry.id} must expose importable address tags.`));
    }
  }

  for (const anchor of [
    ...city.civicAnchors,
    ...city.communityAnchors,
    ...city.cultureAnchors,
    ...city.governmentAnchors,
    ...city.educationAnchors,
    ...city.healthcareAnchors
  ]) {
    if (!anchor.addressPointIds || anchor.addressPointIds.length === 0) {
      issues.push({
        id: `invalid-anchor-${anchor.id}-missing-address`,
        severity: 'error',
        category: 'land',
        objectId: anchor.id,
        affectedPoint: anchor.center,
        message: `Anchor ${anchor.id} must resolve to at least one stable address point.`
      });
    }
    for (const addressPointId of anchor.addressPointIds ?? []) {
      if (!addressPointIds.has(addressPointId)) {
        issues.push({
          id: `invalid-anchor-${anchor.id}-missing-address-${toIssueIdToken(addressPointId)}`,
          severity: 'error',
          category: 'land',
          objectId: anchor.id,
          affectedPoint: anchor.center,
          message: `Anchor ${anchor.id} references missing address point ${addressPointId}.`
        });
      }
    }
  }

  if (anchorAddressIds.size === 0) {
    issues.push({
      id: 'missing-civic-anchor-address-resolution',
      severity: 'error',
      category: 'land',
      message: 'Civic anchors must resolve to stable address points.'
    });
  }
}

function validateGazetteerSourceReference(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  object: ValidationNamedPlace | ValidationGazetteerEntry,
  sourceObjectId: CityId,
  sourceObjectKind: CityObjectKind
): void {
  const sourceObject = city.objectIndex.objectsById[sourceObjectId];
  if (!sourceObject || sourceObject.kind !== sourceObjectKind) {
    const issue = object.kind === 'named-place'
      ? createNamedPlaceIssue(object, `missing-source-${toIssueIdToken(sourceObjectId)}`, `Named place ${object.id} references missing ${sourceObjectKind} source ${sourceObjectId}.`)
      : createGazetteerEntryIssue(object, `missing-source-${toIssueIdToken(sourceObjectId)}`, `Gazetteer entry ${object.id} references missing ${sourceObjectKind} source ${sourceObjectId}.`);
    issues.push(issue);
  }
}

function createNamedPlaceIssue(place: ValidationNamedPlace, suffix: string, message: string): ValidationIssue {
  return {
    id: `invalid-named-place-${place.id}-${suffix}`,
    severity: 'error',
    category: 'land',
    objectId: place.id,
    affectedPoint: place.center,
    affectedBoundary: place.boundary,
    message
  };
}

function createGazetteerEntryIssue(entry: ValidationGazetteerEntry, suffix: string, message: string): ValidationIssue {
  return {
    id: `invalid-gazetteer-entry-${entry.id}-${suffix}`,
    severity: 'error',
    category: 'land',
    objectId: entry.id,
    affectedPoint: entry.position,
    message
  };
}

function validatePowerGrid(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const powerNodes = city.utilityNodes.filter((node) => node.utilityType === 'power');
  const powerEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'power');
  const powerNodesById = new Map(powerNodes.map((node) => [node.id, node]));
  const powerEdgesById = new Map(powerEdges.map((edge) => [edge.id, edge]));
  const circuitIds = new Set<string>();
  const equipmentKinds = new Set(powerNodes.map((node) => node.powerGrid?.equipmentKind).filter(Boolean));
  const streetLightCircuitNode = powerNodes.find((node) => node.powerGrid?.equipmentKind === 'street-light-circuit');

  for (const node of powerNodes) {
    if (!node.powerGrid) {
      issues.push(createUtilityNodeIssue(node, 'missing-power-grid-metadata', `Power node ${node.id} must expose power grid metadata.`));
      continue;
    }
    circuitIds.add(node.powerGrid.circuitId);
    if (node.powerGrid.voltageKv <= 0 || node.capacity.unit !== 'kva') {
      issues.push(createUtilityNodeIssue(node, 'invalid-power-capacity', `Power node ${node.id} must expose positive kVA capacity and voltage.`));
    }
    if (node.powerGrid.servedObjectIds.length === 0 && node.powerGrid.equipmentKind !== 'switchgear') {
      issues.push(createUtilityNodeIssue(node, 'missing-served-objects', `Power node ${node.id} must list served equipment or service objects.`));
    }
    if (node.powerGrid.backupSupplyId && !powerNodesById.has(node.powerGrid.backupSupplyId)) {
      issues.push(createUtilityNodeIssue(node, 'missing-backup-supply', `Power node ${node.id} references missing backup supply ${node.powerGrid.backupSupplyId}.`));
    }
  }

  for (const edge of powerEdges) {
    if (!edge.powerGrid) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-power-grid-metadata', `Power edge ${edge.id} must expose power grid metadata.`));
      continue;
    }
    circuitIds.add(edge.powerGrid.circuitId);
    const fromNode = powerNodesById.get(edge.fromNodeId);
    const toNode = powerNodesById.get(edge.toNodeId);
    if (!fromNode || !toNode) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-power-node-reference', `Power edge ${edge.id} must connect generated power nodes.`));
      continue;
    }
    if (edge.powerGrid.voltageKv <= 0 || edge.capacity.unit !== 'kva') {
      issues.push(createUtilityEdgeIssue(edge, 'invalid-power-capacity', `Power edge ${edge.id} must expose positive kVA capacity and voltage.`));
    }
    if (
      edge.powerGrid.fromEquipmentKind !== fromNode.powerGrid?.equipmentKind ||
      edge.powerGrid.toEquipmentKind !== toNode.powerGrid?.equipmentKind
    ) {
      issues.push(createUtilityEdgeIssue(edge, 'equipment-kind-mismatch', `Power edge ${edge.id} equipment metadata must match endpoint nodes.`));
    }
  }

  const requiredPowerEquipmentKinds = ['substation', 'switchgear', 'transformer', 'meter', 'street-light-circuit', 'backup-supply'] as const;
  for (const requiredKind of requiredPowerEquipmentKinds) {
    if (!equipmentKinds.has(requiredKind)) {
      issues.push({
        id: `missing-power-equipment-${requiredKind}`,
        severity: 'error',
        category: 'utility-coverage',
        message: `Power grid must include ${requiredKind} equipment.`
      });
    }
  }

  for (const streetLight of city.streetLights) {
    if (!streetLight.powerCircuitId || !circuitIds.has(streetLight.powerCircuitId)) {
      issues.push({
        id: `unserved-street-light-power-${streetLight.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: streetLight.id,
        ...createIssueFocus(streetLight.position, `Assign ${streetLight.id} to a generated street-light power circuit.`),
        message: `Street light ${streetLight.id} must reference a generated power circuit.`
      });
    }
    if (streetLightCircuitNode && !streetLightCircuitNode.powerGrid?.servedObjectIds.includes(streetLight.id)) {
      issues.push({
        id: `street-light-not-served-by-power-circuit-${streetLight.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: streetLight.id,
        ...createIssueFocus(streetLight.position, `Add ${streetLight.id} to the street-light circuit served object list.`),
        message: `Street light ${streetLight.id} must be listed by the street-light circuit node.`
      });
    }
  }

  for (const building of city.buildings) {
    const powerService = building.powerService;
    if (!powerService) {
      issues.push({
        id: `missing-building-power-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Attach ${building.id} to generated power service metadata.`),
        message: `Building ${building.id} must reference generated power service.`
      });
      continue;
    }
    if (
      !powerNodesById.has(powerService.serviceNodeId) ||
      !powerNodesById.has(powerService.transformerNodeId) ||
      !powerEdgesById.has(powerService.serviceLateralEdgeId) ||
      !circuitIds.has(powerService.circuitId) ||
      powerService.estimatedPeakKva <= 0
    ) {
      issues.push({
        id: `invalid-building-power-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Regenerate power service references for ${building.id}.`),
        message: `Building ${building.id} must reference valid power nodes, lateral edge, circuit, and positive demand.`
      });
    }
  }
}

function validateWaterSupply(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const waterNodes = city.utilityNodes.filter((node) => node.utilityType === 'water');
  const waterEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'water');
  const waterNodesById = new Map(waterNodes.map((node) => [node.id, node]));
  const waterEdgesById = new Map(waterEdges.map((edge) => [edge.id, edge]));
  const pressureZoneIds = new Set<string>();
  const equipmentKinds = new Set(waterNodes.map((node) => node.waterSupply?.equipmentKind).filter(Boolean));
  const hydrantNodes = waterNodes.filter((node) => node.waterSupply?.equipmentKind === 'hydrant');

  for (const node of waterNodes) {
    if (!node.waterSupply) {
      issues.push(createUtilityNodeIssue(node, 'missing-water-supply-metadata', `Water node ${node.id} must expose water supply metadata.`));
      continue;
    }
    pressureZoneIds.add(node.waterSupply.pressureZoneId);
    if (node.capacity.unit !== 'liters-per-second' || node.capacity.value <= 0) {
      issues.push(createUtilityNodeIssue(node, 'invalid-water-capacity', `Water node ${node.id} must expose positive liters-per-second capacity.`));
    }
    if (
      node.waterSupply.pressureMinKpa <= 0 ||
      node.waterSupply.pressureMaxKpa <= node.waterSupply.pressureMinKpa ||
      node.waterSupply.pressureMaxKpa > 1000
    ) {
      issues.push(createUtilityNodeIssue(node, 'invalid-water-pressure', `Water node ${node.id} must expose a valid water pressure range.`));
    }
    if (node.waterSupply.servedObjectIds.length === 0 && node.waterSupply.equipmentKind !== 'valve') {
      issues.push(createUtilityNodeIssue(node, 'missing-served-objects', `Water node ${node.id} must list served equipment or service objects.`));
    }
    if (node.waterSupply.equipmentKind === 'hydrant' && (!node.waterSupply.hydrantReachMeters || node.waterSupply.hydrantReachMeters <= 0)) {
      issues.push(createUtilityNodeIssue(node, 'invalid-hydrant-reach', `Hydrant node ${node.id} must expose positive hydrant reach.`));
    }
    if (node.waterSupply.equipmentKind === 'tank' && (!node.waterSupply.storageVolumeCubicMeters || node.waterSupply.storageVolumeCubicMeters <= 0)) {
      issues.push(createUtilityNodeIssue(node, 'invalid-tank-storage', `Tank node ${node.id} must expose positive storage volume.`));
    }
  }

  for (const edge of waterEdges) {
    if (!edge.waterSupply) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-water-supply-metadata', `Water edge ${edge.id} must expose water supply metadata.`));
      continue;
    }
    pressureZoneIds.add(edge.waterSupply.pressureZoneId);
    const fromNode = waterNodesById.get(edge.fromNodeId);
    const toNode = waterNodesById.get(edge.toNodeId);
    if (!fromNode || !toNode) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-water-node-reference', `Water edge ${edge.id} must connect generated water nodes.`));
      continue;
    }
    if (edge.capacity.unit !== 'liters-per-second' || edge.capacity.value <= 0 || edge.waterSupply.pipeDiameterMm <= 0) {
      issues.push(createUtilityEdgeIssue(edge, 'invalid-water-capacity', `Water edge ${edge.id} must expose positive capacity and pipe diameter.`));
    }
    if (
      edge.waterSupply.fromEquipmentKind !== fromNode.waterSupply?.equipmentKind ||
      edge.waterSupply.toEquipmentKind !== toNode.waterSupply?.equipmentKind
    ) {
      issues.push(createUtilityEdgeIssue(edge, 'equipment-kind-mismatch', `Water edge ${edge.id} equipment metadata must match endpoint nodes.`));
    }
  }

  const requiredWaterEquipmentKinds = ['valve', 'pump', 'tank', 'pressure-zone', 'hydrant', 'meter'] as const;
  for (const requiredKind of requiredWaterEquipmentKinds) {
    if (!equipmentKinds.has(requiredKind)) {
      issues.push({
        id: `missing-water-equipment-${requiredKind}`,
        severity: 'error',
        category: 'utility-coverage',
        message: `Water supply must include ${requiredKind} equipment.`
      });
    }
  }

  if (hydrantNodes.length === 0) {
    issues.push({
      id: 'missing-water-hydrant-coverage',
      severity: 'error',
      category: 'utility-coverage',
      message: 'Water supply must include hydrants before fire response can query hydrant reach.'
    });
  }

  for (const building of city.buildings) {
    const waterService = building.waterService;
    if (!waterService) {
      issues.push({
        id: `missing-building-water-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Attach ${building.id} to generated water service metadata.`),
        message: `Building ${building.id} must reference generated water service.`
      });
      continue;
    }
    const hydrant = waterNodesById.get(waterService.nearestHydrantNodeId);
    if (
      !waterNodesById.has(waterService.serviceNodeId) ||
      !waterEdgesById.has(waterService.serviceLateralEdgeId) ||
      !pressureZoneIds.has(waterService.pressureZoneId) ||
      !hydrant ||
      hydrant.waterSupply?.equipmentKind !== 'hydrant' ||
      waterService.estimatedPeakLitersPerSecond <= 0
    ) {
      issues.push({
        id: `invalid-building-water-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Regenerate water service references for ${building.id}.`),
        message: `Building ${building.id} must reference valid water service, pressure zone, hydrant, lateral edge, and positive demand.`
      });
    }
  }
}

function validateWastewater(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const wastewaterNodes = city.utilityNodes.filter((node) => node.utilityType === 'wastewater');
  const wastewaterEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'wastewater');
  const wastewaterNodesById = new Map(wastewaterNodes.map((node) => [node.id, node]));
  const wastewaterEdgesById = new Map(wastewaterEdges.map((edge) => [edge.id, edge]));
  const waterwayIds = new Set(city.waterways.map((waterway) => waterway.id));
  const sewerBasinIds = new Set<string>();
  const equipmentKinds = new Set(wastewaterNodes.map((node) => node.wastewater?.equipmentKind).filter(Boolean));
  const manholeNodes = wastewaterNodes.filter((node) => node.wastewater?.equipmentKind === 'manhole');
  const outfallNodes = wastewaterNodes.filter((node) => node.wastewater?.equipmentKind === 'outfall');

  for (const node of wastewaterNodes) {
    if (!node.wastewater) {
      issues.push(createUtilityNodeIssue(node, 'missing-wastewater-metadata', `Wastewater node ${node.id} must expose wastewater metadata.`));
      continue;
    }
    sewerBasinIds.add(node.wastewater.sewerBasinId);
    if (node.capacity.unit !== 'liters-per-second' || node.capacity.value <= 0) {
      issues.push(createUtilityNodeIssue(node, 'invalid-wastewater-capacity', `Wastewater node ${node.id} must expose positive liters-per-second capacity.`));
    }
    if (node.wastewater.rimElevationMeters <= node.wastewater.invertElevationMeters) {
      issues.push(createUtilityNodeIssue(node, 'invalid-wastewater-elevation', `Wastewater node ${node.id} must keep rim elevation above invert elevation.`));
    }
    if (node.wastewater.servedObjectIds.length === 0 && node.wastewater.equipmentKind !== 'manhole') {
      issues.push(createUtilityNodeIssue(node, 'missing-served-objects', `Wastewater node ${node.id} must list served equipment or service objects.`));
    }
    if (
      node.wastewater.equipmentKind === 'lift-station' &&
      (!node.wastewater.wetWellVolumeCubicMeters || node.wastewater.wetWellVolumeCubicMeters <= 0)
    ) {
      issues.push(createUtilityNodeIssue(node, 'invalid-wet-well-volume', `Lift station ${node.id} must expose positive wet-well volume.`));
    }
    if (
      node.wastewater.equipmentKind === 'outfall' &&
      (!node.wastewater.receivingWaterwayId || !waterwayIds.has(node.wastewater.receivingWaterwayId))
    ) {
      issues.push(createUtilityNodeIssue(node, 'missing-receiving-waterway', `Wastewater outfall ${node.id} must reference a generated receiving waterway.`));
    }
  }

  for (const edge of wastewaterEdges) {
    if (!edge.wastewater) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-wastewater-metadata', `Wastewater edge ${edge.id} must expose wastewater metadata.`));
      continue;
    }
    sewerBasinIds.add(edge.wastewater.sewerBasinId);
    const fromNode = wastewaterNodesById.get(edge.fromNodeId);
    const toNode = wastewaterNodesById.get(edge.toNodeId);
    if (!fromNode || !toNode) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-wastewater-node-reference', `Wastewater edge ${edge.id} must connect generated wastewater nodes.`));
      continue;
    }
    if (
      edge.capacity.unit !== 'liters-per-second' ||
      edge.capacity.value <= 0 ||
      edge.wastewater.pipeDiameterMm <= 0 ||
      edge.wastewater.slopePercent <= 0 ||
      edge.wastewater.capacityReservePercent <= 0
    ) {
      issues.push(createUtilityEdgeIssue(edge, 'invalid-wastewater-capacity', `Wastewater edge ${edge.id} must expose positive capacity, slope, reserve, and pipe diameter.`));
    }
    if (
      edge.wastewater.fromEquipmentKind !== fromNode.wastewater?.equipmentKind ||
      edge.wastewater.toEquipmentKind !== toNode.wastewater?.equipmentKind
    ) {
      issues.push(createUtilityEdgeIssue(edge, 'equipment-kind-mismatch', `Wastewater edge ${edge.id} equipment metadata must match endpoint nodes.`));
    }
    if (edge.wastewater.receivingWaterwayId && !waterwayIds.has(edge.wastewater.receivingWaterwayId)) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-receiving-waterway', `Wastewater edge ${edge.id} references missing receiving waterway.`));
    }
  }

  const requiredWastewaterEquipmentKinds = ['lift-station', 'manhole', 'outfall', 'service-connection', 'treatment-plant'] as const;
  for (const requiredKind of requiredWastewaterEquipmentKinds) {
    if (!equipmentKinds.has(requiredKind)) {
      issues.push({
        id: `missing-wastewater-equipment-${requiredKind}`,
        severity: 'error',
        category: 'utility-coverage',
        message: `Wastewater network must include ${requiredKind} equipment.`
      });
    }
  }

  if (manholeNodes.length === 0 || outfallNodes.length === 0) {
    issues.push({
      id: 'missing-wastewater-collection-coverage',
      severity: 'error',
      category: 'utility-coverage',
      message: 'Wastewater network must include manholes and outfalls before service and environmental checks can run.'
    });
  }

  for (const building of city.buildings) {
    const wastewaterService = building.wastewaterService;
    if (!wastewaterService) {
      issues.push({
        id: `missing-building-wastewater-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Attach ${building.id} to generated wastewater service metadata.`),
        message: `Building ${building.id} must reference generated wastewater service.`
      });
      continue;
    }
    const manhole = wastewaterNodesById.get(wastewaterService.nearestManholeNodeId);
    if (
      !wastewaterNodesById.has(wastewaterService.serviceNodeId) ||
      !wastewaterEdgesById.has(wastewaterService.serviceLateralEdgeId) ||
      !sewerBasinIds.has(wastewaterService.sewerBasinId) ||
      !manhole ||
      manhole.wastewater?.equipmentKind !== 'manhole' ||
      wastewaterService.estimatedPeakLitersPerSecond <= 0
    ) {
      issues.push({
        id: `invalid-building-wastewater-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Regenerate wastewater service references for ${building.id}.`),
        message: `Building ${building.id} must reference valid wastewater service, sewer basin, manhole, lateral edge, and positive demand.`
      });
    }
  }
}

function validateStormwater(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const stormwaterNodes = city.utilityNodes.filter((node) => node.utilityType === 'stormwater');
  const stormwaterEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'stormwater');
  const stormwaterNodesById = new Map(stormwaterNodes.map((node) => [node.id, node]));
  const stormwaterEdgesById = new Map(stormwaterEdges.map((edge) => [edge.id, edge]));
  const roadIds = new Set(city.roads.map((road) => road.id));
  const waterwayIds = new Set(city.waterways.map((waterway) => waterway.id));
  const hazardZoneIds = new Set(city.hazardZones.map((hazard) => hazard.id));
  const catchmentIds = new Set<string>();
  const equipmentKinds = new Set(stormwaterNodes.map((node) => node.stormwater?.equipmentKind).filter(Boolean));
  const inletNodes = stormwaterNodes.filter((node) => node.stormwater?.equipmentKind === 'inlet');
  const outfallNodes = stormwaterNodes.filter((node) => node.stormwater?.equipmentKind === 'outfall');

  for (const node of stormwaterNodes) {
    if (!node.stormwater) {
      issues.push(createUtilityNodeIssue(node, 'missing-stormwater-metadata', `Stormwater node ${node.id} must expose stormwater metadata.`));
      continue;
    }
    catchmentIds.add(node.stormwater.drainageCatchmentId);
    if (node.capacity.unit !== 'liters-per-second' || node.capacity.value <= 0 || node.stormwater.designStormMmPerHour <= 0) {
      issues.push(createUtilityNodeIssue(node, 'invalid-stormwater-capacity', `Stormwater node ${node.id} must expose positive liters-per-second capacity and design storm intensity.`));
    }
    if (node.stormwater.runoffCoefficient < 0 || node.stormwater.runoffCoefficient > 1 || node.stormwater.imperviousAreaSquareMeters < 0) {
      issues.push(createUtilityNodeIssue(node, 'invalid-runoff-model', `Stormwater node ${node.id} must expose a valid runoff coefficient and impervious area.`));
    }
    if (node.stormwater.servedRoadIds.length === 0 && node.stormwater.equipmentKind !== 'outfall') {
      issues.push(createUtilityNodeIssue(node, 'missing-served-roads', `Stormwater node ${node.id} must list served roads.`));
    }
    for (const roadId of node.stormwater.servedRoadIds) {
      if (!roadIds.has(roadId)) {
        issues.push(createUtilityNodeIssue(node, `missing-served-road-${toIssueIdToken(roadId)}`, `Stormwater node ${node.id} references missing served road ${roadId}.`));
      }
    }
    for (const hazardZoneId of node.stormwater.servedHazardZoneIds) {
      if (!hazardZoneIds.has(hazardZoneId)) {
        issues.push(createUtilityNodeIssue(node, `missing-served-hazard-${toIssueIdToken(hazardZoneId)}`, `Stormwater node ${node.id} references missing hazard zone ${hazardZoneId}.`));
      }
    }
    if (
      (node.stormwater.equipmentKind === 'bioswale' ||
        node.stormwater.equipmentKind === 'detention-basin' ||
        node.stormwater.equipmentKind === 'pervious-area') &&
      (!node.stormwater.storageVolumeCubicMeters || node.stormwater.storageVolumeCubicMeters <= 0)
    ) {
      issues.push(createUtilityNodeIssue(node, 'invalid-storage-volume', `Stormwater storage/treatment node ${node.id} must expose positive storage volume.`));
    }
    if (
      (node.stormwater.equipmentKind === 'outfall' || node.stormwater.equipmentKind === 'culvert') &&
      (!node.stormwater.receivingWaterwayId || !waterwayIds.has(node.stormwater.receivingWaterwayId))
    ) {
      issues.push(createUtilityNodeIssue(node, 'missing-receiving-waterway', `Stormwater ${node.stormwater.equipmentKind} ${node.id} must reference a generated receiving waterway.`));
    }
  }

  for (const edge of stormwaterEdges) {
    if (!edge.stormwater) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-stormwater-metadata', `Stormwater edge ${edge.id} must expose stormwater metadata.`));
      continue;
    }
    catchmentIds.add(edge.stormwater.drainageCatchmentId);
    const fromNode = stormwaterNodesById.get(edge.fromNodeId);
    const toNode = stormwaterNodesById.get(edge.toNodeId);
    if (!fromNode || !toNode) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-stormwater-node-reference', `Stormwater edge ${edge.id} must connect generated stormwater nodes.`));
      continue;
    }
    if (
      edge.capacity.unit !== 'liters-per-second' ||
      edge.capacity.value <= 0 ||
      edge.stormwater.designStormMmPerHour <= 0 ||
      edge.stormwater.slopePercent <= 0 ||
      edge.stormwater.capacityReservePercent <= 0
    ) {
      issues.push(createUtilityEdgeIssue(edge, 'invalid-stormwater-capacity', `Stormwater edge ${edge.id} must expose positive capacity, design storm, slope, and reserve.`));
    }
    if (edge.stormwater.conveyanceKind !== 'surface-flow' && (!edge.stormwater.pipeDiameterMm || edge.stormwater.pipeDiameterMm <= 0)) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-pipe-diameter', `Pipe and culvert stormwater edge ${edge.id} must expose positive pipe diameter.`));
    }
    if (edge.stormwater.conveyanceKind === 'surface-flow' && (!edge.stormwater.channelWidthMeters || edge.stormwater.channelWidthMeters <= 0)) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-channel-width', `Surface-flow stormwater edge ${edge.id} must expose positive channel width.`));
    }
    if (
      edge.stormwater.fromEquipmentKind !== fromNode.stormwater?.equipmentKind ||
      edge.stormwater.toEquipmentKind !== toNode.stormwater?.equipmentKind
    ) {
      issues.push(createUtilityEdgeIssue(edge, 'equipment-kind-mismatch', `Stormwater edge ${edge.id} equipment metadata must match endpoint nodes.`));
    }
    if (edge.stormwater.receivingWaterwayId && !waterwayIds.has(edge.stormwater.receivingWaterwayId)) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-receiving-waterway', `Stormwater edge ${edge.id} references missing receiving waterway.`));
    }
  }

  const requiredStormwaterEquipmentKinds = ['bioswale', 'culvert', 'detention-basin', 'drain', 'inlet', 'outfall', 'pervious-area'] as const;
  for (const requiredKind of requiredStormwaterEquipmentKinds) {
    if (!equipmentKinds.has(requiredKind)) {
      issues.push({
        id: `missing-stormwater-equipment-${requiredKind}`,
        severity: 'error',
        category: 'utility-coverage',
        message: `Stormwater network must include ${requiredKind} equipment.`
      });
    }
  }

  if (inletNodes.length === 0 || outfallNodes.length === 0) {
    issues.push({
      id: 'missing-stormwater-drainage-coverage',
      severity: 'error',
      category: 'utility-coverage',
      message: 'Stormwater network must include inlets and outfalls before street drainage and flood checks can run.'
    });
  }

  for (const road of city.roads) {
    const drainage = road.stormwaterDrainage;
    if (!drainage) {
      issues.push({
        id: `missing-road-stormwater-drainage-${road.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: road.id,
        ...createIssueFocus(road.center, `Attach ${road.id} to generated stormwater drainage metadata.`),
        message: `Road ${road.id} must reference stormwater drainage, low point, inlet, detention, and outfall metadata.`
      });
      continue;
    }
    const lowPointNode = stormwaterNodesById.get(drainage.lowPointNodeId);
    const detentionNode = stormwaterNodesById.get(drainage.detentionNodeId);
    const outfallNode = stormwaterNodesById.get(drainage.outfallNodeId);
    const hasValidInlets = drainage.inletNodeIds.length > 0 && drainage.inletNodeIds.every((nodeId) => stormwaterNodesById.get(nodeId)?.stormwater?.equipmentKind === 'inlet');
    const hasValidRunoffEdges = drainage.runoffPathEdgeIds.length > 0 && drainage.runoffPathEdgeIds.every((edgeId) => stormwaterEdgesById.has(edgeId));
    const hasValidPerviousAreas =
      drainage.perviousAreaNodeIds.length > 0 &&
      drainage.perviousAreaNodeIds.every((nodeId) => {
        const equipmentKind = stormwaterNodesById.get(nodeId)?.stormwater?.equipmentKind;
        return equipmentKind === 'pervious-area' || equipmentKind === 'bioswale';
      });
    const hasValidHazards = drainage.floodHazardZoneIds.every((hazardZoneId) => hazardZoneIds.has(hazardZoneId));
    if (
      !catchmentIds.has(drainage.drainageCatchmentId) ||
      !hasValidInlets ||
      !hasValidRunoffEdges ||
      lowPointNode?.stormwater?.equipmentKind !== 'inlet' ||
      detentionNode?.stormwater?.equipmentKind !== 'detention-basin' ||
      outfallNode?.stormwater?.equipmentKind !== 'outfall' ||
      !hasValidPerviousAreas ||
      !hasValidHazards ||
      drainage.designStormMmPerHour <= 0 ||
      drainage.imperviousAreaSquareMeters <= 0 ||
      drainage.runoffCoefficient < 0 ||
      drainage.runoffCoefficient > 1
    ) {
      issues.push({
        id: `invalid-road-stormwater-drainage-${road.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: road.id,
        ...createIssueFocus(road.center, `Regenerate stormwater drainage references for ${road.id}.`),
        message: `Road ${road.id} must reference valid stormwater inlets, runoff paths, low point, detention, pervious area, hazard, and outfall metadata.`
      });
    }
  }
}

function validateTelecom(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const telecomNodes = city.utilityNodes.filter((node) => node.utilityType === 'telecom');
  const telecomEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'telecom');
  const telecomNodesById = new Map(telecomNodes.map((node) => [node.id, node]));
  const telecomEdgesById = new Map(telecomEdges.map((edge) => [edge.id, edge]));
  const equipmentKinds = new Set(telecomNodes.map((node) => node.telecom?.equipmentKind).filter(Boolean));
  const networkZoneIds = new Set<string>();
  const coverageAssumptionIds = new Set<string>();

  for (const node of telecomNodes) {
    if (!node.telecom) {
      issues.push(createUtilityNodeIssue(node, 'missing-telecom-metadata', `Telecom node ${node.id} must expose telecom metadata.`));
      continue;
    }
    networkZoneIds.add(node.telecom.networkZoneId);
    coverageAssumptionIds.add(node.telecom.coverageAssumptionId);
    if (node.capacity.unit !== 'mbps' || node.capacity.value <= 0 || node.telecom.bandwidthMbps <= 0) {
      issues.push(createUtilityNodeIssue(node, 'invalid-telecom-capacity', `Telecom node ${node.id} must expose positive Mbps capacity.`));
    }
    if (!node.telecom.networkZoneId || !node.telecom.coverageAssumptionId) {
      issues.push(createUtilityNodeIssue(node, 'missing-telecom-zone', `Telecom node ${node.id} must expose network zone and coverage assumption IDs.`));
    }
    if (node.telecom.servedObjectIds.length === 0 && node.telecom.equipmentKind !== 'duct-bank') {
      issues.push(createUtilityNodeIssue(node, 'missing-served-objects', `Telecom node ${node.id} must list served buildings, roads, or equipment.`));
    }
    for (const objectId of node.telecom.servedObjectIds) {
      if (!hasObjectId(city, objectId) && !objectId.startsWith('telecom-')) {
        issues.push(createUtilityNodeIssue(node, `missing-served-object-${toIssueIdToken(objectId)}`, `Telecom node ${node.id} references missing served object ${objectId}.`));
      }
    }
    if (
      (node.telecom.equipmentKind === 'antenna' || node.telecom.equipmentKind === 'cell-site') &&
      (!node.telecom.coverageRadiusMeters || node.telecom.coverageRadiusMeters <= 0)
    ) {
      issues.push(createUtilityNodeIssue(node, 'missing-wireless-coverage', `Telecom ${node.telecom.equipmentKind} ${node.id} must expose a positive coverage radius.`));
    }
    if (node.telecom.equipmentKind === 'antenna' && (!node.telecom.frequencyBandGhz || node.telecom.frequencyBandGhz <= 0)) {
      issues.push(createUtilityNodeIssue(node, 'missing-frequency-band', `Telecom antenna ${node.id} must expose a positive frequency band.`));
    }
    if (node.telecom.backhaulNodeId && !telecomNodesById.has(node.telecom.backhaulNodeId)) {
      issues.push(createUtilityNodeIssue(node, 'missing-backhaul-node', `Telecom node ${node.id} references missing backhaul node ${node.telecom.backhaulNodeId}.`));
    }
  }

  for (const edge of telecomEdges) {
    if (!edge.telecom) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-telecom-metadata', `Telecom edge ${edge.id} must expose telecom metadata.`));
      continue;
    }
    coverageAssumptionIds.add(edge.telecom.coverageAssumptionId);
    const fromNode = telecomNodesById.get(edge.fromNodeId);
    const toNode = telecomNodesById.get(edge.toNodeId);
    if (!fromNode || !toNode) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-telecom-node-reference', `Telecom edge ${edge.id} must connect generated telecom nodes.`));
      continue;
    }
    if (edge.capacity.unit !== 'mbps' || edge.capacity.value <= 0 || edge.telecom.bandwidthMbps <= 0 || edge.telecom.latencyMs <= 0) {
      issues.push(createUtilityEdgeIssue(edge, 'invalid-telecom-capacity', `Telecom edge ${edge.id} must expose positive Mbps capacity and latency.`));
    }
    if (
      edge.telecom.fromEquipmentKind !== fromNode.telecom?.equipmentKind ||
      edge.telecom.toEquipmentKind !== toNode.telecom?.equipmentKind
    ) {
      issues.push(createUtilityEdgeIssue(edge, 'equipment-kind-mismatch', `Telecom edge ${edge.id} equipment metadata must match endpoint nodes.`));
    }
    if (edge.telecom.medium === 'fiber' && (!edge.telecom.fiberStrandCount || edge.telecom.fiberStrandCount <= 0)) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-fiber-strands', `Fiber telecom edge ${edge.id} must expose a positive fiber strand count.`));
    }
    if (edge.telecom.medium !== 'wireless' && (!edge.telecom.ductCount || edge.telecom.ductCount <= 0)) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-duct-count', `Wired telecom edge ${edge.id} must expose a positive duct count.`));
    }
  }

  const requiredTelecomEquipmentKinds = ['fiber-hub', 'cabinet', 'duct-bank', 'cell-site', 'antenna'] as const;
  for (const requiredKind of requiredTelecomEquipmentKinds) {
    if (!equipmentKinds.has(requiredKind)) {
      issues.push({
        id: `missing-telecom-equipment-${requiredKind}`,
        severity: 'error',
        category: 'utility-coverage',
        message: `Telecom network must include ${requiredKind} equipment.`
      });
    }
  }

  if (networkZoneIds.size === 0 || coverageAssumptionIds.size === 0 || telecomEdges.length === 0) {
    issues.push({
      id: 'missing-telecom-coverage',
      severity: 'error',
      category: 'utility-coverage',
      message: 'Telecom network must expose network zones, coverage assumptions, and route edges.'
    });
  }

  for (const building of city.buildings) {
    const telecomService = building.telecomService;
    if (!telecomService) {
      issues.push({
        id: `missing-building-telecom-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Attach ${building.id} to generated telecom service metadata.`),
        message: `Building ${building.id} must reference generated telecom service.`
      });
      continue;
    }
    const serviceNode = telecomNodesById.get(telecomService.serviceNodeId);
    const coverageNode = telecomNodesById.get(telecomService.coverageNodeId);
    if (
      !serviceNode ||
      !telecomEdgesById.has(telecomService.serviceDropEdgeId) ||
      !networkZoneIds.has(telecomService.networkZoneId) ||
      !coverageNode ||
      (coverageNode.telecom?.equipmentKind !== 'antenna' && coverageNode.telecom?.equipmentKind !== 'cell-site') ||
      telecomService.estimatedPeakMbps <= 0
    ) {
      issues.push({
        id: `invalid-building-telecom-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Regenerate telecom service references for ${building.id}.`),
        message: `Building ${building.id} must reference valid telecom service, coverage, network zone, and positive bandwidth demand.`
      });
    }
    if (isCriticalFacilityBuilding(building) && telecomService.redundancyTier === 'none') {
      issues.push({
        id: `critical-building-uncovered-telecom-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Assign redundant telecom service to critical facility ${building.id}.`),
        message: `Critical facility ${building.id} must have redundant telecom coverage.`
      });
    }
  }
}

function validateThermalEnergy(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const thermalNodes = city.utilityNodes.filter((node) => node.utilityType === 'district-energy' || node.utilityType === 'gas');
  const thermalEdges = city.utilityEdges.filter((edge) => edge.utilityType === 'district-energy' || edge.utilityType === 'gas');
  const thermalNodesById = new Map(thermalNodes.map((node) => [node.id, node]));
  const thermalEdgesById = new Map(thermalEdges.map((edge) => [edge.id, edge]));
  const equipmentKinds = new Set(thermalNodes.map((node) => node.thermalEnergy?.equipmentKind).filter(Boolean));
  const thermalLoopIds = new Set<string>();
  const outageDomainIds = new Set<string>();

  for (const node of thermalNodes) {
    outageDomainIds.add(node.outage.outageDomainId);
    if (!node.thermalEnergy) {
      issues.push(createUtilityNodeIssue(node, 'missing-thermal-energy-metadata', `Thermal utility node ${node.id} must expose gas or district energy metadata.`));
      continue;
    }
    thermalLoopIds.add(node.thermalEnergy.thermalLoopId);
    if (
      node.thermalEnergy.capacityKwThermal <= 0 ||
      node.capacity.value <= 0 ||
      (node.utilityType === 'gas' && node.capacity.unit !== 'kj-per-hour') ||
      (node.utilityType === 'district-energy' && node.capacity.unit !== 'kw-thermal')
    ) {
      issues.push(createUtilityNodeIssue(node, 'invalid-thermal-capacity', `Thermal utility node ${node.id} must expose positive thermal capacity in the expected unit.`));
    }
    if (!node.thermalEnergy.serviceAreaId || node.thermalEnergy.serviceAreaId !== node.serviceArea.serviceAreaBoundaryId) {
      issues.push(createUtilityNodeIssue(node, 'missing-thermal-service-area', `Thermal utility node ${node.id} must reference its utility service area.`));
    }
    if (node.thermalEnergy.servedObjectIds.length === 0 && node.thermalEnergy.equipmentKind !== 'gas-valve') {
      issues.push(createUtilityNodeIssue(node, 'missing-served-objects', `Thermal utility node ${node.id} must list served buildings, loops, or equipment.`));
    }
    for (const objectId of node.thermalEnergy.servedObjectIds) {
      if (!hasObjectId(city, objectId) && !objectId.startsWith('thermal-') && !objectId.startsWith('gas-')) {
        issues.push(createUtilityNodeIssue(node, `missing-served-object-${toIssueIdToken(objectId)}`, `Thermal utility node ${node.id} references missing served object ${objectId}.`));
      }
    }
    if (node.thermalEnergy.plantRoomBuildingId && !hasObjectId(city, node.thermalEnergy.plantRoomBuildingId)) {
      issues.push(createUtilityNodeIssue(node, 'missing-plant-room-building', `Thermal utility node ${node.id} references missing plant room building ${node.thermalEnergy.plantRoomBuildingId}.`));
    }
    if (node.thermalEnergy.medium === 'gas') {
      if (!node.thermalEnergy.pressureKpa || node.thermalEnergy.pressureKpa <= 0) {
        issues.push(createUtilityNodeIssue(node, 'invalid-gas-pressure', `Gas utility node ${node.id} must expose positive pressure.`));
      }
    } else if (
      node.thermalEnergy.supplyTemperatureC === undefined ||
      node.thermalEnergy.returnTemperatureC === undefined ||
      node.thermalEnergy.supplyTemperatureC === node.thermalEnergy.returnTemperatureC ||
      !node.thermalEnergy.pressureKpa ||
      node.thermalEnergy.pressureKpa <= 0
    ) {
      issues.push(createUtilityNodeIssue(node, 'invalid-thermal-operating-state', `District energy node ${node.id} must expose temperature and pressure assumptions.`));
    }
    if (
      node.thermalEnergy.equipmentKind === 'thermal-storage' &&
      (!node.thermalEnergy.thermalStorageMwh || node.thermalEnergy.thermalStorageMwh <= 0)
    ) {
      issues.push(createUtilityNodeIssue(node, 'invalid-thermal-storage', `Thermal storage node ${node.id} must expose positive storage capacity.`));
    }
  }

  for (const edge of thermalEdges) {
    outageDomainIds.add(edge.outageDomainId);
    if (!edge.thermalEnergy) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-thermal-energy-metadata', `Thermal utility edge ${edge.id} must expose gas or district energy metadata.`));
      continue;
    }
    thermalLoopIds.add(edge.thermalEnergy.loopId);
    const fromNode = thermalNodesById.get(edge.fromNodeId);
    const toNode = thermalNodesById.get(edge.toNodeId);
    if (!fromNode || !toNode) {
      issues.push(createUtilityEdgeIssue(edge, 'missing-thermal-node-reference', `Thermal utility edge ${edge.id} must connect generated thermal utility nodes.`));
      continue;
    }
    if (
      edge.thermalEnergy.capacityKwThermal <= 0 ||
      edge.thermalEnergy.pipeDiameterMm <= 0 ||
      edge.thermalEnergy.maxPressureKpa <= 0 ||
      edge.capacity.value <= 0 ||
      (edge.utilityType === 'gas' && edge.capacity.unit !== 'kj-per-hour') ||
      (edge.utilityType === 'district-energy' && edge.capacity.unit !== 'kw-thermal')
    ) {
      issues.push(createUtilityEdgeIssue(edge, 'invalid-thermal-capacity', `Thermal utility edge ${edge.id} must expose positive capacity, pressure, and pipe size.`));
    }
    if (
      edge.thermalEnergy.fromEquipmentKind !== fromNode.thermalEnergy?.equipmentKind ||
      edge.thermalEnergy.toEquipmentKind !== toNode.thermalEnergy?.equipmentKind
    ) {
      issues.push(createUtilityEdgeIssue(edge, 'equipment-kind-mismatch', `Thermal utility edge ${edge.id} equipment metadata must match endpoint nodes.`));
    }
    if (edge.thermalEnergy.medium !== 'gas' && (!edge.thermalEnergy.insulated || !edge.thermalEnergy.designDeltaTC || edge.thermalEnergy.designDeltaTC <= 0)) {
      issues.push(createUtilityEdgeIssue(edge, 'invalid-thermal-loop-assumptions', `District energy edge ${edge.id} must expose insulation and temperature delta assumptions.`));
    }
  }

  const requiredThermalEquipmentKinds = [
    'gas-regulator',
    'gas-valve',
    'gas-meter',
    'district-energy-plant',
    'boiler',
    'chilled-water-plant',
    'thermal-storage',
    'heat-exchanger'
  ] as const;
  for (const requiredKind of requiredThermalEquipmentKinds) {
    if (!equipmentKinds.has(requiredKind)) {
      issues.push({
        id: `missing-thermal-equipment-${requiredKind}`,
        severity: 'error',
        category: 'utility-coverage',
        message: `Gas and district energy network must include ${requiredKind} equipment.`
      });
    }
  }

  if (thermalLoopIds.size === 0 || thermalEdges.length === 0 || outageDomainIds.size === 0) {
    issues.push({
      id: 'missing-thermal-service-coverage',
      severity: 'error',
      category: 'utility-coverage',
      message: 'Gas and district energy network must expose thermal loops, outage domains, and route edges.'
    });
  }

  for (const building of city.buildings) {
    const thermalService = building.thermalService;
    if (!thermalService) {
      issues.push({
        id: `missing-building-thermal-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Attach ${building.id} to generated thermal service metadata.`),
        message: `Building ${building.id} must reference generated gas and district energy service.`
      });
      continue;
    }
    const serviceNode = thermalNodesById.get(thermalService.serviceNodeId);
    const heatExchanger = thermalNodesById.get(thermalService.heatExchangerNodeId);
    const gasServiceNode = thermalNodesById.get(thermalService.gasServiceNodeId);
    if (
      !serviceNode ||
      !heatExchanger ||
      heatExchanger.thermalEnergy?.equipmentKind !== 'heat-exchanger' ||
      !gasServiceNode ||
      gasServiceNode.thermalEnergy?.equipmentKind !== 'gas-meter' ||
      !thermalEdgesById.has(thermalService.serviceLateralEdgeId) ||
      !thermalLoopIds.has(thermalService.thermalLoopId) ||
      !outageDomainIds.has(thermalService.outageDomainId) ||
      thermalService.serviceModes.length === 0 ||
      thermalService.estimatedPeakKwThermal <= 0 ||
      thermalService.estimatedPeakGasKjPerHour <= 0
    ) {
      issues.push({
        id: `invalid-building-thermal-service-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Regenerate thermal service references for ${building.id}.`),
        message: `Building ${building.id} must reference valid thermal service nodes, gas meter, loop, outage domain, lateral edge, and positive demand.`
      });
    }
    if (isCriticalFacilityBuilding(building) && !serviceNode?.thermalEnergy?.backupFuelAvailable) {
      issues.push({
        id: `critical-building-thermal-backup-missing-${building.id}`,
        severity: 'error',
        category: 'utility-coverage',
        objectId: building.id,
        ...createIssueFocus(getObjectAffectedPoint(building), `Assign backup thermal service to critical facility ${building.id}.`),
        message: `Critical facility ${building.id} must have backup-capable thermal service.`
      });
    }
  }
}

function isPointInsideUtilityServiceArea(
  point: Point2D,
  serviceArea: ValidationAdministrativeBoundary | undefined
): boolean {
  return serviceArea ? isPointInsidePolygon(point, serviceArea.boundary) : false;
}

function validateBuildingTopography(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const topographyZoneIds = new Set(city.topographyZones.map((zone) => zone.id));

  for (const building of city.buildings) {
    const groundElevationMeters = building.groundElevationMeters;
    const finishedFloorElevationMeters = building.finishedFloorElevationMeters;
    const maxFootprintGradePercent = building.maxFootprintGradePercent;

    if (
      typeof groundElevationMeters !== 'number' ||
      typeof finishedFloorElevationMeters !== 'number' ||
      typeof maxFootprintGradePercent !== 'number' ||
      !isFiniteNumber(groundElevationMeters) ||
      !isFiniteNumber(finishedFloorElevationMeters) ||
      !isFiniteNumber(maxFootprintGradePercent)
    ) {
      issues.push({
        id: `missing-building-ground-profile-${building.id}`,
        severity: 'error',
        category: 'land',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Sample building footprint against deterministic topography before massing validation.'),
        message: `Building ${building.id} must carry ground elevation, finished floor elevation, and footprint grade.`
      });
      continue;
    }

    if (finishedFloorElevationMeters < groundElevationMeters) {
      issues.push({
        id: `invalid-building-finished-floor-elevation-${building.id}`,
        severity: 'error',
        category: 'land',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Raise the finished floor above the sampled ground elevation.'),
        message: `Building ${building.id} finished floor cannot be below ground elevation.`
      });
    }

    if (maxFootprintGradePercent > 14 || building.buildabilityFromLandform === 'restricted') {
      issues.push({
        id: `impossible-building-footprint-grade-${building.id}`,
        severity: 'error',
        category: 'land',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Move the building footprint or add a retaining/buildability mitigation before construction.'),
        message: `Building ${building.id} is on a restricted or too-steep landform.`
      });
    }

    if (!building.topographyZoneIds?.length || building.topographyZoneIds.some((zoneId) => !topographyZoneIds.has(zoneId))) {
      issues.push({
        id: `invalid-building-topography-zone-reference-${building.id}`,
        severity: 'error',
        category: 'land',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Reference existing topography zones from each building ground profile.'),
        message: `Building ${building.id} must reference existing topography zones.`
      });
    }
  }
}

function validateBuildingSoilGeology(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const soilGeologyZoneIds = new Set(city.soilGeologyZones.map((zone) => zone.id));

  for (const parcel of city.parcels) {
    if (!parcel.soilGeologyZoneIds?.length || parcel.soilGeologyZoneIds.some((zoneId) => !soilGeologyZoneIds.has(zoneId))) {
      issues.push({
        id: `invalid-parcel-soil-geology-zone-reference-${parcel.id}`,
        severity: 'error',
        category: 'land',
        objectId: parcel.id,
        ...createIssueFocus(parcel.center, 'Attach each parcel to an existing soil geology zone for foundation and drainage queries.'),
        message: `Parcel ${parcel.id} must reference existing soil geology zones.`
      });
    }
  }

  for (const building of city.buildings) {
    if (!building.soilGeologyZoneIds?.length || building.soilGeologyZoneIds.some((zoneId) => !soilGeologyZoneIds.has(zoneId))) {
      issues.push({
        id: `invalid-building-soil-geology-zone-reference-${building.id}`,
        severity: 'error',
        category: 'land',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Attach each building to an existing soil geology zone for foundation suitability queries.'),
        message: `Building ${building.id} must reference existing soil geology zones.`
      });
    }
  }
}

function validateParkExpansion(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const featuresByParkId = new Map<string, ValidationParkFeature[]>();

  for (const feature of city.parkFeatures) {
    const features = featuresByParkId.get(feature.parkId) ?? [];
    features.push(feature);
    featuresByParkId.set(feature.parkId, features);
    validateParkFeature(city, feature, issues, assetBindingsById);
  }

  for (const park of city.parks) {
    const features = featuresByParkId.get(park.id) ?? [];
    const featureIds = new Set(features.map((feature) => feature.id));
    const featureKinds = new Set(features.map((feature) => feature.featureKind));

    if (park.connectedSidewalkIds.length === 0) {
      issues.push(createParkIssue(park, 'missing-sidewalk-connection', 'Park must expose at least one sidewalk connection.'));
    }

    for (const sidewalkId of park.connectedSidewalkIds) {
      const sidewalk = city.objectIndex.objectsById[sidewalkId];

      if (!sidewalk || sidewalk.kind !== 'sidewalk') {
        issues.push(createParkIssue(park, `missing-sidewalk-${sidewalkId}`, `Park references missing sidewalk connection ${sidewalkId}.`));
      }
    }

    for (const featureId of [...park.programZoneIds, ...park.pathFeatureIds]) {
      if (!featureIds.has(featureId)) {
        issues.push(createParkIssue(park, `missing-feature-${featureId}`, `Park references missing feature ${featureId}.`));
      }
    }

    for (const requiredKind of ['lawn', 'path', 'planting', 'seating'] as const) {
      if (!featureKinds.has(requiredKind)) {
        issues.push(createParkIssue(park, `missing-${requiredKind}`, `Park must include a ${requiredKind} feature.`));
      }
    }

    if (!features.some((feature) => feature.programKind === 'active-recreation' || feature.programKind === 'civic-gathering')) {
      issues.push(createParkIssue(park, 'missing-active-program', 'Park must include an active recreation or civic gathering program zone.'));
    }
  }
}

function validateParkFeature(
  city: GeneratedCityForValidation,
  feature: ValidationParkFeature,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const park = city.parks.find((candidate) => candidate.id === feature.parkId);

  if (!park || feature.parentId !== feature.parkId) {
    issues.push({
      id: `park-feature-missing-parent-${feature.id}`,
      severity: 'error',
      category: 'identifier',
      objectId: feature.id,
      message: `Park feature ${feature.id} must reference parent park ${feature.parkId}.`
    });
    return;
  }

  if (!isPointInsidePolygon(feature.center, park.boundary)) {
    issues.push({
      id: `park-feature-outside-park-${feature.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: feature.id,
      affectedPoint: feature.center,
      affectedBoundary: park.boundary,
      suggestedFix: 'Regenerate park features from the park boundary so every program zone remains inside its parent park.',
      message: `Park feature ${feature.id} center must be inside parent park ${park.id}.`
    });
  }

  if (feature.size.x <= 0 || feature.size.z <= 0) {
    issues.push({
      id: `park-feature-invalid-size-${feature.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: feature.id,
      message: `Park feature ${feature.id} must have positive x/z dimensions.`
    });
  }

  if (feature.accessible && feature.connectedSidewalkIds.length === 0) {
    issues.push({
      id: `park-feature-missing-access-${feature.id}`,
      severity: 'error',
      category: 'graph',
      objectId: feature.id,
      message: `Accessible park feature ${feature.id} must connect to at least one sidewalk.`
    });
  }

  for (const sidewalkId of feature.connectedSidewalkIds) {
    const sidewalk = city.objectIndex.objectsById[sidewalkId];

    if (!sidewalk || sidewalk.kind !== 'sidewalk') {
      issues.push({
        id: `park-feature-missing-sidewalk-${feature.id}-${sidewalkId}`,
        severity: 'error',
        category: 'graph',
        objectId: feature.id,
        message: `Park feature ${feature.id} references missing sidewalk ${sidewalkId}.`
      });
    }
  }

  const binding = assetBindingsById.get(feature.assetBindingId);

  if (!binding || binding.objectKind !== 'park-feature') {
    issues.push({
      id: `park-feature-missing-binding-${feature.id}`,
      severity: 'error',
      category: 'asset',
      objectId: feature.id,
      message: `Park feature ${feature.id} must reference a park-feature render binding.`
    });
  }
}

function createParkIssue(park: ValidationPark, issueIdSuffix: string, message: string): ValidationIssue {
  return {
    id: `park-${issueIdSuffix}-${park.id}`,
    severity: 'error',
    category: 'graph',
    objectId: park.id,
    affectedPoint: park.center,
    affectedBoundary: park.boundary,
    suggestedFix: 'Regenerate park expansion from public-space and sidewalk rules so paths, program zones, and access links stay coherent.',
    message
  };
}

function validatePlazaModel(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const zonesByPlazaId = new Map<string, ValidationPlazaZone[]>();

  for (const zone of city.plazaZones) {
    const zones = zonesByPlazaId.get(zone.plazaId) ?? [];
    zones.push(zone);
    zonesByPlazaId.set(zone.plazaId, zones);
    validatePlazaZone(city, zone, issues, assetBindingsById);
  }

  const civicPlazaZones = zonesByPlazaId.get('civic-plaza') ?? [];
  const civicPlaza = city.parks.find((park) => park.id === 'civic-plaza');
  const civicZoneKinds = new Set(civicPlazaZones.map((zone) => zone.zoneKind));

  if (civicPlaza && civicPlazaZones.length === 0) {
    issues.push(createPlazaIssue(civicPlaza, 'missing-zones', 'Civic Plaza must expose semantic plaza zones.'));
  }

  for (const requiredKind of ['hardscape', 'event', 'active-edge', 'seating', 'shade', 'paving'] as const) {
    if (civicPlaza && !civicZoneKinds.has(requiredKind)) {
      issues.push(createPlazaIssue(civicPlaza, `missing-${requiredKind}`, `Civic Plaza must include a ${requiredKind} zone.`));
    }
  }

  if (civicPlaza && !civicPlazaZones.some((zone) => zone.eventCapacityPeople >= 40)) {
    issues.push(createPlazaIssue(civicPlaza, 'missing-event-capacity', 'Civic Plaza must include usable event capacity.'));
  }
}

function validatePlazaZone(
  city: GeneratedCityForValidation,
  zone: ValidationPlazaZone,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const plaza = city.parks.find((candidate) => candidate.id === zone.plazaId);

  if (!plaza || zone.parentId !== zone.plazaId) {
    issues.push({
      id: `plaza-zone-missing-parent-${zone.id}`,
      severity: 'error',
      category: 'identifier',
      objectId: zone.id,
      message: `Plaza zone ${zone.id} must reference parent plaza ${zone.plazaId}.`
    });
    return;
  }

  if (!isPointInsidePolygon(zone.center, plaza.boundary)) {
    issues.push({
      id: `plaza-zone-outside-plaza-${zone.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: zone.id,
      affectedPoint: zone.center,
      affectedBoundary: plaza.boundary,
      suggestedFix: 'Regenerate plaza zones from the protected civic plaza boundary.',
      message: `Plaza zone ${zone.id} center must remain inside parent plaza ${plaza.id}.`
    });
  }

  if (zone.size.x <= 0 || zone.size.z <= 0 || zone.capacityPeople <= 0 || zone.shadeCoveragePercent < 0 || zone.shadeCoveragePercent > 100) {
    issues.push({
      id: `plaza-zone-invalid-metrics-${zone.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: zone.id,
      message: `Plaza zone ${zone.id} must have positive dimensions/capacity and bounded shade coverage.`
    });
  }

  if (zone.connectedSidewalkIds.length === 0) {
    issues.push({
      id: `plaza-zone-missing-sidewalk-access-${zone.id}`,
      severity: 'error',
      category: 'graph',
      objectId: zone.id,
      message: `Plaza zone ${zone.id} must connect to at least one sidewalk.`
    });
  }

  for (const sidewalkId of zone.connectedSidewalkIds) {
    const sidewalk = city.objectIndex.objectsById[sidewalkId];

    if (!sidewalk || sidewalk.kind !== 'sidewalk') {
      issues.push({
        id: `plaza-zone-missing-sidewalk-${zone.id}-${sidewalkId}`,
        severity: 'error',
        category: 'graph',
        objectId: zone.id,
        message: `Plaza zone ${zone.id} references missing sidewalk ${sidewalkId}.`
      });
    }
  }

  for (const frontageId of zone.activeFrontageIds) {
    const activeFrontage = city.objectIndex.objectsById[frontageId];

    if (!activeFrontage || activeFrontage.kind !== 'facade') {
      issues.push({
        id: `plaza-zone-missing-active-frontage-${zone.id}-${frontageId}`,
        severity: 'error',
        category: 'graph',
        objectId: zone.id,
        message: `Plaza zone ${zone.id} references missing active frontage ${frontageId}.`
      });
    }
  }

  if ((zone.zoneKind === 'active-edge' || zone.zoneKind === 'event') && zone.activeFrontageIds.length === 0) {
    issues.push({
      id: `plaza-zone-missing-active-edge-${zone.id}`,
      severity: 'error',
      category: 'graph',
      objectId: zone.id,
      message: `Plaza zone ${zone.id} must link to active frontage context.`
    });
  }

  if (zone.zoneKind === 'event' && zone.eventCapacityPeople <= 0) {
    issues.push({
      id: `plaza-zone-missing-event-capacity-${zone.id}`,
      severity: 'error',
      category: 'graph',
      objectId: zone.id,
      message: `Event plaza zone ${zone.id} must expose event capacity.`
    });
  }

  for (const featureId of zone.parkFeatureIds) {
    const feature = city.objectIndex.objectsById[featureId];

    if (!feature || feature.kind !== 'park-feature') {
      issues.push({
        id: `plaza-zone-missing-park-feature-${zone.id}-${featureId}`,
        severity: 'error',
        category: 'graph',
        objectId: zone.id,
        message: `Plaza zone ${zone.id} references missing park feature ${featureId}.`
      });
    }
  }

  const binding = assetBindingsById.get(zone.assetBindingId);

  if (!binding || binding.objectKind !== 'plaza-zone') {
    issues.push({
      id: `plaza-zone-missing-binding-${zone.id}`,
      severity: 'error',
      category: 'asset',
      objectId: zone.id,
      message: `Plaza zone ${zone.id} must reference a plaza-zone render binding.`
    });
  }
}

function createPlazaIssue(plaza: ValidationPark, issueIdSuffix: string, message: string): ValidationIssue {
  return {
    id: `plaza-${issueIdSuffix}-${plaza.id}`,
    severity: 'error',
    category: 'graph',
    objectId: plaza.id,
    affectedPoint: plaza.center,
    affectedBoundary: plaza.boundary,
    suggestedFix: 'Regenerate plaza zones from the civic plaza public-realm rules.',
    message
  };
}

function validateDevelopmentPhases(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  if (city.developmentPhases.length === 0) {
    issues.push({
      id: 'development-phase-missing',
      severity: 'error',
      category: 'metadata',
      message: 'Generated city must expose at least one development phase for operations and simulation staging.'
    });
    return;
  }

  const sequenceIds = new Map<number, string>();
  const masterPlanGrowthBoundaryIds = new Set(CITY_BLUEPRINT.masterPlan.growthBoundaries.map((boundary) => boundary.id));
  let activePhases = 0;

  for (const phase of city.developmentPhases) {
    if (phase.status === 'active') {
      activePhases += 1;
    }

    if (!Number.isInteger(phase.sequence) || phase.sequence < 0) {
      issues.push(createDevelopmentPhaseIssue(phase, 'invalid-sequence', 'Development phase sequence must be a non-negative integer.'));
    } else if (sequenceIds.has(phase.sequence)) {
      issues.push(
        createDevelopmentPhaseIssue(
          phase,
          `duplicate-sequence-${phase.sequence}`,
          `Development phase sequence ${phase.sequence} is already used by ${sequenceIds.get(phase.sequence)}.`
        )
      );
    } else {
      sequenceIds.set(phase.sequence, phase.id);
    }

    if (phase.targetYear < phase.startYear) {
      issues.push(createDevelopmentPhaseIssue(phase, 'invalid-year-range', 'Development phase target year must not precede its start year.'));
    }

    for (const dependencyId of phase.unlocksAfterPhaseIds) {
      const dependency = city.developmentPhases.find((candidate) => candidate.id === dependencyId);

      if (!dependency) {
        issues.push(
          createDevelopmentPhaseIssue(
            phase,
            `missing-unlock-dependency-${dependencyId}`,
            `Development phase ${phase.id} references missing dependency phase ${dependencyId}.`
          )
        );
      } else if (dependency.sequence >= phase.sequence) {
        issues.push(
          createDevelopmentPhaseIssue(
            phase,
            `invalid-unlock-order-${dependencyId}`,
            `Development phase ${phase.id} must unlock after an earlier phase; ${dependencyId} is not earlier.`
          )
        );
      }
    }

    validateDevelopmentPhaseObjectReferences(city, phase, phase.unlocksObjectIds, undefined, 'unlock-object', issues);
    validateDevelopmentPhaseObjectReferences(city, phase, phase.temporaryRoadIds, 'road-segment', 'temporary-road', issues);
    validateDevelopmentPhaseObjectReferences(city, phase, phase.closureRoadIds, 'road-segment', 'closure-road', issues);
    validateDevelopmentPhaseObjectReferences(city, phase, phase.temporaryParkIds, 'park', 'temporary-park', issues);

    for (const boundaryId of phase.masterPlanGrowthBoundaryIds) {
      if (!masterPlanGrowthBoundaryIds.has(boundaryId)) {
        issues.push(
          createDevelopmentPhaseIssue(
            phase,
            `missing-growth-boundary-${boundaryId}`,
            `Development phase ${phase.id} references missing master-plan growth boundary ${boundaryId}.`
          )
        );
      }
    }

    if (
      phase.phaseKind === 'temporary-condition' &&
      phase.temporaryRoadIds.length + phase.temporaryParkIds.length + phase.closureRoadIds.length === 0
    ) {
      issues.push(
        createDevelopmentPhaseIssue(
          phase,
          'missing-temporary-assets',
          'Temporary-condition phase must expose temporary roads, temporary parks, or closure roads.'
        )
      );
    }

    if (phase.phaseKind === 'future-expansion' && phase.masterPlanGrowthBoundaryIds.length === 0) {
      issues.push(
        createDevelopmentPhaseIssue(
          phase,
          'missing-growth-boundary-reference',
          'Future-expansion phase must reference at least one master-plan growth boundary.'
        )
      );
    }
  }

  if (activePhases !== 1) {
    issues.push({
      id: 'development-phase-invalid-active-count',
      severity: 'error',
      category: 'metadata',
      message: `Generated city must expose exactly one active development phase, found ${activePhases}.`
    });
  }

  if (!sequenceIds.has(0)) {
    issues.push({
      id: 'development-phase-missing-sequence-zero',
      severity: 'error',
      category: 'metadata',
      message: 'Development phases must include sequence 0 as the baseline phase.'
    });
  }
}

function validateDevelopmentPhaseObjectReferences(
  city: GeneratedCityForValidation,
  phase: ValidationDevelopmentPhase,
  objectIds: readonly string[],
  expectedKind: CityObjectKind | undefined,
  relation: string,
  issues: ValidationIssue[]
): void {
  for (const objectId of objectIds) {
    const object = city.objectIndex.objectsById[objectId];

    if (!object) {
      issues.push(
        createDevelopmentPhaseIssue(
          phase,
          `missing-${relation}-${objectId}`,
          `Development phase ${phase.id} references missing ${relation} ${objectId}.`
        )
      );
      continue;
    }

    if (expectedKind && object.kind !== expectedKind) {
      issues.push(
        createDevelopmentPhaseIssue(
          phase,
          `invalid-${relation}-${objectId}`,
          `Development phase ${phase.id} ${relation} ${objectId} must be a ${expectedKind}.`
        )
      );
    }
  }
}

function createDevelopmentPhaseIssue(
  phase: ValidationDevelopmentPhase,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `development-phase-${issueIdSuffix}-${phase.id}`,
    severity: 'error',
    category: 'metadata',
    objectId: phase.id,
    affectedPoint: phase.focusPoint,
    affectedBoundary: phase.boundary,
    suggestedFix: 'Regenerate phasing from blueprint rules so dependencies, closures, temporary assets, and growth-boundary references are coherent.',
    message
  };
}

function validateBuildingTypology(building: ValidationBuilding, issues: ValidationIssue[]): void {
  const typology = building.typology;

  if (!typology) {
    issues.push({
      id: `missing-building-typology-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, `Assign ${building.id} a typology derived from its zoning and primary use.`),
      message: `Building ${building.id} must carry a typology contract.`
    });
    return;
  }

  if (
    !typology.typologyId ||
    !BUILDING_TYPOLOGY_KINDS.includes(typology.kind) ||
    typology.typologyId !== `building-typology-${typology.kind}`
  ) {
    issues.push({
      id: `invalid-building-typology-kind-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Use a registered building typology kind and stable building-typology-* id.'),
      message: `Building ${building.id} has an invalid typology kind or id.`
    });
  }

  if (!building.uses.includes(typology.primaryUse) || typology.defaultUses.some((use) => !building.uses.includes(use))) {
    issues.push({
      id: `invalid-building-typology-uses-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Regenerate typology defaults from the building uses selected by zoning.'),
      message: `Building ${building.id} typology uses must match the generated building uses.`
    });
  }

  const [minHeightMeters, maxHeightMeters] = typology.heightRangeMeters;
  if (
    minHeightMeters <= 0 ||
    maxHeightMeters < minHeightMeters ||
    building.heightMeters < minHeightMeters - 0.001 ||
    building.heightMeters > maxHeightMeters + 0.001
  ) {
    issues.push({
      id: `building-height-outside-typology-${building.id}`,
      severity: 'warning',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Select a typology height range that contains the generated building height.'),
      message: `Building ${building.id} height must fit its ${typology.kind} typology range.`
    });
  }

  if (typology.typicalFloorHeightMeters <= 0) {
    issues.push({
      id: `invalid-building-typology-floor-height-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Use a positive typical floor height for typology-derived floor counts.'),
      message: `Building ${building.id} typology must define a positive typical floor height.`
    });
  }

  if (building.facadeGrammarId !== typology.facadeGrammarId || building.roofGrammarId !== typology.roofGrammarId) {
    issues.push({
      id: `building-grammar-mismatch-typology-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Use typology facade and roof grammar IDs on the building contract.'),
      message: `Building ${building.id} facade and roof grammar IDs must come from its typology defaults.`
    });
  }

  if (
    !BUILDING_ENTRANCE_STRATEGIES.includes(typology.entranceStrategy) ||
    !BUILDING_SERVICE_ACCESS_PROFILES.includes(typology.serviceAccess) ||
    !typology.scheduleProfileId
  ) {
    issues.push({
      id: `invalid-building-typology-defaults-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Set typology entrance, service, and schedule defaults from the typology rule table.'),
      message: `Building ${building.id} typology must define entrance, service, and schedule defaults.`
    });
  }
}

function validateBuildingFootprintGrammar(
  building: ValidationBuilding,
  parcel: ValidationParcel,
  issues: ValidationIssue[]
): void {
  const grammar = building.footprintGrammar;

  if (!grammar) {
    issues.push({
      id: `missing-building-footprint-grammar-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, `Generate a footprint grammar for ${building.id} before rendering massing.`),
      message: `Building ${building.id} must carry a footprint grammar contract.`
    });
    return;
  }

  if (
    grammar.grammarId !== `${building.id}-footprint-grammar` ||
    !BUILDING_FOOTPRINT_GRAMMAR_KINDS.includes(grammar.kind)
  ) {
    issues.push({
      id: `invalid-building-footprint-grammar-kind-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Use a stable building-owned footprint grammar id and registered grammar kind.'),
      message: `Building ${building.id} has an invalid footprint grammar kind or id.`
    });
  }

  if (
    grammar.parcelFitEnvelopeId !== parcel.fit.buildableEnvelopeId ||
    !isPolygonWithinPolygonBounds(grammar.buildableEnvelope, parcel.boundary) ||
    !isPolygonWithinPolygonBounds(building.footprint, grammar.buildableEnvelope)
  ) {
    issues.push({
      id: `building-footprint-envelope-mismatch-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      affectedBoundary: building.footprint,
      suggestedFix: `Regenerate ${building.id}.footprintGrammar from ${parcel.id}.fit before massing.`,
      message: `Building ${building.id} footprint grammar must reference the parcel fit envelope and contain the footprint.`
    });
  }

  const footprintAreaSqM = Number(getPolygonArea(building.footprint).toFixed(2));
  const expectedGroundCoverage = Number((footprintAreaSqM / (parcel.size.x * parcel.size.z)).toFixed(4));
  const envelopeBounds = getPolygonBounds(parcel.fit.buildableEnvelope);
  const envelopeAreaSqM = (envelopeBounds.maxX - envelopeBounds.minX) * (envelopeBounds.maxZ - envelopeBounds.minZ);
  const expectedEnvelopeCoverage = Number((footprintAreaSqM / envelopeAreaSqM).toFixed(4));

  if (
    grammar.footprintAreaSqM <= 0 ||
    Math.abs(grammar.footprintAreaSqM - footprintAreaSqM) > 0.01 ||
    Math.abs(grammar.groundCoverageRatio - expectedGroundCoverage) > 0.0001 ||
    Math.abs(grammar.envelopeCoverageRatio - expectedEnvelopeCoverage) > 0.0001
  ) {
    issues.push({
      id: `building-footprint-coverage-mismatch-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Recompute footprint area and coverage from the generated footprint polygon.'),
      message: `Building ${building.id} footprint grammar area and coverage ratios must match its footprint.`
    });
  }

  const expectedOffset = {
    x: Number((building.center.x - parcel.fit.preferredBuildingCenter.x).toFixed(2)),
    z: Number((building.center.z - parcel.fit.preferredBuildingCenter.z).toFixed(2))
  };
  if (
    Math.abs(grammar.placementOffsetMeters.x - expectedOffset.x) > 0.01 ||
    Math.abs(grammar.placementOffsetMeters.z - expectedOffset.z) > 0.01
  ) {
    issues.push({
      id: `building-footprint-offset-mismatch-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Store the footprint center offset from the parcel preferred building center.'),
      message: `Building ${building.id} footprint grammar offset must match its generated center.`
    });
  }

  const grammarConstraintIds = [...grammar.constraintIds].sort();
  const parcelConstraintIds = [...parcel.parcelConstraintIds].sort();
  if (grammarConstraintIds.join('|') !== parcelConstraintIds.join('|')) {
    issues.push({
      id: `building-footprint-constraint-mismatch-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Copy parcel constraint ids into the footprint grammar after constraint filtering.'),
      message: `Building ${building.id} footprint grammar must reference the same constraints as parcel ${parcel.id}.`
    });
  }

  if (grammar.kind === 'tower-on-podium' && (!grammar.podium || !grammar.tower)) {
    issues.push({
      id: `missing-building-tower-podium-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Generate podium and tower floor-plate metadata for tower-on-podium footprints.'),
      message: `Building ${building.id} tower-on-podium grammar must expose podium and tower metadata.`
    });
  }

  if (grammar.kind === 'courtyard' && !grammar.courtyard) {
    issues.push({
      id: `missing-building-courtyard-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Generate courtyard void metadata for courtyard footprint grammar.'),
      message: `Building ${building.id} courtyard grammar must expose courtyard metadata.`
    });
  }

  if (grammar.hazardConstrained && grammar.constraintIds.length === 0) {
    issues.push({
      id: `building-footprint-hazard-without-constraint-${building.id}`,
      severity: 'error',
      category: 'zoning',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Link hazard-constrained footprint grammar to the parcel constraint ids.'),
      message: `Building ${building.id} hazard-constrained footprint must reference constraint ids.`
    });
  }
}

function validateBuildingStructureShell(building: ValidationBuilding, issues: ValidationIssue[]): void {
  const shell = building.structureShell;

  if (!shell) {
    issues.push({
      id: `missing-building-structure-shell-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      ...createIssueFocus(building.center, `Generate structure and shell grammar for ${building.id}.`),
      message: `Building ${building.id} must carry a structure shell contract.`
    });
    return;
  }

  if (
    shell.grammarId !== `${building.id}-structure-shell` ||
    !BUILDING_STRUCTURAL_SYSTEM_KINDS.includes(shell.structuralSystem)
  ) {
    issues.push({
      id: `invalid-building-structure-shell-kind-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Use a stable building-owned structure shell id and registered structural system.'),
      message: `Building ${building.id} has an invalid structure shell grammar id or structural system.`
    });
  }

  if (
    shell.massing.floorCount !== building.floorCount ||
    shell.floorPlates.length !== building.floorCount ||
    Math.abs(shell.massing.totalHeightMeters - building.heightMeters) > 0.01 ||
    Math.abs(shell.massing.roofElevationMeters - building.heightMeters) > 0.01 ||
    shell.massing.typicalFloorHeightMeters <= 0
  ) {
    issues.push({
      id: `building-structure-massing-mismatch-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Regenerate massing summary from building height and floor count.'),
      message: `Building ${building.id} structure shell massing must match building height and floor count.`
    });
  }

  const transferLevels = new Set(shell.transferLevels);
  for (let index = 0; index < shell.floorPlates.length; index += 1) {
    const floorPlate = shell.floorPlates[index];
    const expectedLevel = index + 1;
    const expectedElevation = Number((index * shell.massing.typicalFloorHeightMeters).toFixed(2));
    const computedArea = Number(getPolygonArea(floorPlate.footprint).toFixed(2));

    if (
      floorPlate.level !== expectedLevel ||
      floorPlate.structuralGridId !== shell.structuralGrid.gridId ||
      Math.abs(floorPlate.elevationMeters - expectedElevation) > 0.01 ||
      floorPlate.floorHeightMeters <= 0 ||
      Math.abs(floorPlate.areaSqM - computedArea) > 0.01 ||
      !building.uses.includes(floorPlate.use) ||
      floorPlate.isTransferLevel !== transferLevels.has(floorPlate.level) ||
      !isPolygonWithinPolygonBounds(floorPlate.footprint, building.footprint)
    ) {
      issues.push({
        id: `building-floor-plate-mismatch-${building.id}-${floorPlate.level}`,
        severity: 'error',
        category: 'geometry',
        objectId: building.id,
        affectedBoundary: floorPlate.footprint,
        suggestedFix: `Regenerate ${building.id}.structureShell.floorPlates from the footprint grammar and building uses.`,
        message: `Building ${building.id} floor plate ${floorPlate.level} must match shell massing, grid, use, and footprint bounds.`
      });
      break;
    }
  }

  if (
    shell.core.coreId !== `${building.id}-core` ||
    shell.core.areaSqM <= 0 ||
    shell.core.servesLevels[0] !== 1 ||
    shell.core.servesLevels[1] !== building.floorCount ||
    shell.core.egressStairCount < 1 ||
    shell.core.elevatorBankCount < 0 ||
    !isPolygonWithinPolygonBounds(shell.core.footprint, building.footprint)
  ) {
    issues.push({
      id: `building-core-mismatch-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      affectedBoundary: shell.core.footprint,
      suggestedFix: `Place ${building.id}.structureShell.core inside the generated building footprint and serve all levels.`,
      message: `Building ${building.id} core must be inside the footprint and serve all floor levels.`
    });
  }

  if (
    shell.structuralGrid.gridId !== `${building.id}-structural-grid` ||
    shell.structuralGrid.baySpacingMeters.x <= 0 ||
    shell.structuralGrid.baySpacingMeters.z <= 0 ||
    shell.structuralGrid.columnLineCount.x < 2 ||
    shell.structuralGrid.columnLineCount.z < 2 ||
    shell.structuralGrid.primarySpanMeters <= 0
  ) {
    issues.push({
      id: `building-structural-grid-mismatch-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Generate a positive structural grid with at least two column lines per axis.'),
      message: `Building ${building.id} structural grid must expose usable bay spacing and column lines.`
    });
  }

  const invalidTransferLevel = shell.transferLevels.some((level) => level < 1 || level > building.floorCount);
  if (
    invalidTransferLevel ||
    (building.footprintGrammar.kind === 'tower-on-podium' && shell.transferLevels.length === 0) ||
    (shell.loadBearingAssumptions.longSpan !== (shell.structuralSystem === 'long-span-steel')) ||
    !shell.loadBearingAssumptions.gravitySystem ||
    !shell.loadBearingAssumptions.lateralSystem ||
    !shell.loadBearingAssumptions.foundationHint ||
    shell.loadBearingAssumptions.liveLoadKpa <= 0
  ) {
    issues.push({
      id: `building-load-bearing-assumption-mismatch-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Regenerate transfer levels and load-bearing assumptions from the structural system.'),
      message: `Building ${building.id} structure shell must expose valid transfer levels and load-bearing assumptions.`
    });
  }
}

function validateBuildingFacadeGrammar(building: ValidationBuilding, issues: ValidationIssue[]): void {
  const grammar = building.facadeGrammar;

  if (!grammar) {
    issues.push({
      id: `missing-building-facade-grammar-${building.id}`,
      severity: 'error',
      category: 'asset',
      objectId: building.id,
      ...createIssueFocus(building.center, `Generate facade grammar for ${building.id} before rendering facade modules.`),
      message: `Building ${building.id} must carry a facade grammar contract.`
    });
    return;
  }

  if (
    grammar.grammarId !== `${building.id}-facade-grammar` ||
    grammar.templateId !== building.facadeGrammarId ||
    grammar.sourceStructureShellId !== building.structureShell.grammarId ||
    !BUILDING_FACADE_RHYTHMS.includes(grammar.rhythm)
  ) {
    issues.push({
      id: `invalid-building-facade-grammar-kind-${building.id}`,
      severity: 'error',
      category: 'asset',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Use a stable building-owned facade grammar id, template id, and source shell id.'),
      message: `Building ${building.id} has an invalid facade grammar id, template, rhythm, or shell reference.`
    });
  }

  if (
    grammar.floorGrid.floorCount !== building.floorCount ||
    Math.abs(grammar.floorGrid.typicalFloorHeightMeters - building.structureShell.massing.typicalFloorHeightMeters) > 0.01 ||
    grammar.floorGrid.expressedFloorLevels.length === 0 ||
    grammar.floorGrid.expressedFloorLevels.some((level) => level < 1 || level > building.floorCount) ||
    grammar.baySpacingMeters <= 0
  ) {
    issues.push({
      id: `building-facade-floor-grid-mismatch-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Regenerate facade floor grid from the structure shell floor plates.'),
      message: `Building ${building.id} facade grammar floor grid must match structure shell floors.`
    });
  }

  const expectedSides = new Set<BuildingFrontageSide>(['north', 'east', 'south', 'west']);
  const seenSides = new Set<BuildingFrontageSide>();
  let primaryStorefrontFound = false;

  for (const side of grammar.sides) {
    const expectedWidth = side.side === 'north' || side.side === 'south' ? building.size.x : building.size.z;
    seenSides.add(side.side);

    if (
      !isBuildingFrontageSide(side.side) ||
      side.widthMeters <= 0 ||
      Math.abs(side.widthMeters - expectedWidth) > 0.01 ||
      Math.abs(side.heightMeters - building.heightMeters) > 0.01 ||
      side.bayCount < 1 ||
      side.baySpacingMeters <= 0 ||
      Math.abs(side.baySpacingMeters - side.widthMeters / side.bayCount) > 0.02 ||
      side.floorLevels.some((level) => !grammar.floorGrid.expressedFloorLevels.includes(level)) ||
      !CITY_LOD_TIERS.includes(side.renderLod)
    ) {
      issues.push({
        id: `building-facade-side-mismatch-${building.id}-${side.side}`,
        severity: 'error',
        category: 'geometry',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Regenerate facade side dimensions, bay counts, and LOD tier from building size.'),
        message: `Building ${building.id} facade side ${side.side} must match building dimensions and floor grid.`
      });
      continue;
    }

    if (
      side.windowModule.widthMeters <= 0 ||
      side.windowModule.heightMeters <= 0 ||
      side.windowModule.sillHeightMeters < 0 ||
      side.windowModule.transparencyRatio <= 0 ||
      side.windowModule.transparencyRatio > 1
    ) {
      issues.push({
        id: `building-facade-window-module-mismatch-${building.id}-${side.side}`,
        severity: 'error',
        category: 'asset',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Set positive facade window module dimensions and a valid transparency ratio.'),
        message: `Building ${building.id} facade side ${side.side} must expose usable window modules.`
      });
    }

    if (
      side.balconyModule.enabled &&
      (side.balconyModule.startLevel < 2 ||
        side.balconyModule.startLevel > building.floorCount ||
        side.balconyModule.everyNFloors < 1 ||
        side.balconyModule.widthMeters <= 0 ||
        side.balconyModule.depthMeters <= 0)
    ) {
      issues.push({
        id: `building-facade-balcony-module-mismatch-${building.id}-${side.side}`,
        severity: 'error',
        category: 'asset',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Set balcony levels and dimensions inside the facade floor grid.'),
        message: `Building ${building.id} facade side ${side.side} balcony module is invalid.`
      });
    }

    if (side.materialZones.length === 0 || side.materialZones.some((zone) => !BUILDING_FACADE_MATERIAL_ZONES.includes(zone))) {
      issues.push({
        id: `building-facade-material-zone-mismatch-${building.id}-${side.side}`,
        severity: 'error',
        category: 'asset',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Use registered facade material zones for all facade sides.'),
        message: `Building ${building.id} facade side ${side.side} must expose registered material zones.`
      });
    }

    if (side.storefrontModule.enabled) {
      primaryStorefrontFound = primaryStorefrontFound || side.side === building.primaryFrontageSide;
      if (
        side.side !== building.primaryFrontageSide ||
        side.storefrontModule.roadId !== building.primaryFrontageRoadId ||
        side.storefrontModule.bayCount < 1 ||
        !side.storefrontModule.signAtlasSlot ||
        !side.storefrontModule.awningAtlasSlot ||
        !hasActiveFrontageUse(building.uses)
      ) {
        issues.push({
          id: `building-facade-storefront-module-mismatch-${building.id}-${side.side}`,
          severity: 'error',
          category: 'asset',
          objectId: building.id,
          ...createIssueFocus(building.center, 'Attach storefront modules only to active-use primary frontage sides.'),
          message: `Building ${building.id} storefront facade module must match its active-use primary frontage.`
        });
      }
    }
  }

  if (
    grammar.sides.length !== expectedSides.size ||
    [...expectedSides].some((side) => !seenSides.has(side)) ||
    !grammar.atlasSlots.wall ||
    !grammar.atlasSlots.window ||
    !grammar.atlasSlots.frame ||
    (hasActiveFrontageUse(building.uses) && !primaryStorefrontFound)
  ) {
    issues.push({
      id: `building-facade-grammar-completeness-${building.id}`,
      severity: 'error',
      category: 'asset',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Generate all four facade sides, required atlas slots, and active storefront modules.'),
      message: `Building ${building.id} facade grammar must cover all sides, atlas slots, and active-use storefront modules.`
    });
  }
}

function validateBuildingRoofGrammar(building: ValidationBuilding, issues: ValidationIssue[]): void {
  const grammar = building.roofGrammar;

  if (!grammar) {
    issues.push({
      id: `missing-building-roof-grammar-${building.id}`,
      severity: 'error',
      category: 'asset',
      objectId: building.id,
      ...createIssueFocus(building.center, `Generate roof grammar for ${building.id} before rendering rooftop details.`),
      message: `Building ${building.id} must carry a roof grammar contract.`
    });
    return;
  }

  if (
    grammar.grammarId !== `${building.id}-roof-grammar` ||
    grammar.templateId !== building.roofGrammarId ||
    grammar.sourceStructureShellId !== building.structureShell.grammarId ||
    !BUILDING_ROOF_STYLE_KINDS.includes(grammar.roofStyle)
  ) {
    issues.push({
      id: `invalid-building-roof-grammar-kind-${building.id}`,
      severity: 'error',
      category: 'asset',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Use a stable building-owned roof grammar id, template id, and source shell id.'),
      message: `Building ${building.id} has an invalid roof grammar id, template, style, or shell reference.`
    });
  }

  const expectedRoofArea = Number(getPolygonArea(grammar.roofPlane.footprint).toFixed(2));
  if (
    grammar.roofPlane.areaSqM <= 0 ||
    Math.abs(grammar.roofPlane.areaSqM - expectedRoofArea) > 0.01 ||
    Math.abs(grammar.roofPlane.elevationMeters - building.structureShell.massing.roofElevationMeters) > 0.01 ||
    grammar.roofPlane.usableAreaSqM < 0 ||
    grammar.roofPlane.usableAreaSqM > grammar.roofPlane.areaSqM ||
    grammar.roofPlane.parapetHeightMeters < 0 ||
    grammar.roofPlane.drainageSlopePercent <= 0 ||
    !isPolygonWithinPolygonBounds(grammar.roofPlane.footprint, building.footprint)
  ) {
    issues.push({
      id: `building-roof-plane-mismatch-${building.id}`,
      severity: 'error',
      category: 'geometry',
      objectId: building.id,
      affectedBoundary: grammar.roofPlane.footprint,
      suggestedFix: `Regenerate ${building.id}.roofGrammar.roofPlane from its top structure shell floor plate.`,
      message: `Building ${building.id} roof plane must match structure shell elevation and footprint bounds.`
    });
  }

  const detailIds = new Set<string>();
  const roofBounds = getPolygonBounds(grammar.roofPlane.footprint);
  const exemptionIds = new Set(grammar.heightExemptions.map((exemption) => exemption.detailId));

  for (const detail of grammar.details) {
    const detailCenter = {
      x: building.center.x + detail.centerOffsetMeters.x,
      z: building.center.z + detail.centerOffsetMeters.z
    };
    const detailBounds = {
      minX: detailCenter.x - detail.sizeMeters.x / 2,
      maxX: detailCenter.x + detail.sizeMeters.x / 2,
      minZ: detailCenter.z - detail.sizeMeters.z / 2,
      maxZ: detailCenter.z + detail.sizeMeters.z / 2
    };
    const detailInsideRoof =
      detailBounds.minX >= roofBounds.minX - 0.001 &&
      detailBounds.maxX <= roofBounds.maxX + 0.001 &&
      detailBounds.minZ >= roofBounds.minZ - 0.001 &&
      detailBounds.maxZ <= roofBounds.maxZ + 0.001;

    if (
      detailIds.has(detail.detailId) ||
      !BUILDING_ROOF_DETAIL_KINDS.includes(detail.detailKind) ||
      !BUILDING_ROOF_MATERIAL_ZONES.includes(detail.materialZone) ||
      detail.assetBindingId !== 'binding:building:roof-detail' ||
      detail.sizeMeters.x <= 0 ||
      detail.sizeMeters.y <= 0 ||
      detail.sizeMeters.z <= 0 ||
      Math.abs(detail.baseElevationMeters - grammar.roofPlane.elevationMeters) > 0.01 ||
      detail.topElevationMeters < detail.baseElevationMeters ||
      !detailInsideRoof
    ) {
      issues.push({
        id: `building-roof-detail-mismatch-${building.id}-${toIssueIdToken(detail.detailId)}`,
        severity: 'error',
        category: 'asset',
        objectId: building.id,
        ...createIssueFocus(detailCenter, 'Place rooftop equipment inside the roof plane with positive dimensions and registered material zones.'),
        message: `Building ${building.id} rooftop detail ${detail.detailId} must be valid and inside the roof plane.`
      });
    }

    if (detail.heightExempt && !exemptionIds.has(detail.detailId)) {
      issues.push({
        id: `building-roof-height-exemption-mismatch-${building.id}-${toIssueIdToken(detail.detailId)}`,
        severity: 'error',
        category: 'zoning',
        objectId: building.id,
        ...createIssueFocus(detailCenter, 'Declare height exemptions for rooftop equipment that extends above zoning height.'),
        message: `Building ${building.id} rooftop detail ${detail.detailId} is marked exempt without an exemption record.`
      });
    }

    detailIds.add(detail.detailId);
  }

  if (!grammar.details.some((detail) => detail.detailKind === 'roof-access') || !grammar.roofAccess.hasStairBulkhead) {
    issues.push({
      id: `building-roof-access-mismatch-${building.id}`,
      severity: 'error',
      category: 'asset',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Add a roof-access bulkhead detail and reference it from roof access metadata.'),
      message: `Building ${building.id} roof grammar must expose rooftop access.`
    });
  }

  if (
    grammar.solar.panelCount < 0 ||
    grammar.solar.arrayAreaSqM < 0 ||
    grammar.solar.tiltDegrees < 0 ||
    grammar.solar.tiltDegrees > 45 ||
    grammar.solar.detailIds.some((detailId) => !detailIds.has(detailId)) ||
    (grammar.solar.panelCount > 0 && !grammar.details.some((detail) => detail.detailKind === 'solar-array'))
  ) {
    issues.push({
      id: `building-roof-solar-mismatch-${building.id}`,
      severity: 'error',
      category: 'asset',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Keep solar panel counts, area, tilt, and detail references consistent.'),
      message: `Building ${building.id} roof solar metadata must match solar array details.`
    });
  }

  if (
    grammar.greenRoof.coverageRatio < 0 ||
    grammar.greenRoof.coverageRatio > 1 ||
    grammar.greenRoof.areaSqM < 0 ||
    grammar.greenRoof.soilDepthMeters < 0 ||
    (grammar.greenRoof.enabled && (!grammar.greenRoof.detailId || !detailIds.has(grammar.greenRoof.detailId)))
  ) {
    issues.push({
      id: `building-roof-green-roof-mismatch-${building.id}`,
      severity: 'error',
      category: 'asset',
      objectId: building.id,
      ...createIssueFocus(building.center, 'Keep green roof coverage and detail references inside the roof plane.'),
      message: `Building ${building.id} green roof metadata must match its rooftop detail.`
    });
  }

  for (const exemption of grammar.heightExemptions) {
    const detail = grammar.details.find((candidate) => candidate.detailId === exemption.detailId);
    if (
      !detail ||
      !detail.heightExempt ||
      !exemption.allowed ||
      exemption.exemptHeightMeters <= 0 ||
      exemption.exemptHeightMeters > 12 ||
      exemption.zoningLimitMeters <= 0 ||
      (detail.detailKind === 'terrace' || detail.detailKind === 'solar-array' || detail.detailKind === 'green-roof')
    ) {
      issues.push({
        id: `building-roof-height-exemption-invalid-${building.id}-${toIssueIdToken(exemption.detailId)}`,
        severity: 'error',
        category: 'zoning',
        objectId: building.id,
        ...createIssueFocus(building.center, 'Only mechanical screens, antennas, and access bulkheads can receive bounded height exemptions.'),
        message: `Building ${building.id} roof height exemption ${exemption.detailId} is invalid.`
      });
    }
  }
}

function createTopographyIssue(zone: ValidationTopographyZone, suffix: string, message: string): ValidationIssue {
  return {
    id: `topography-${suffix}-${toIssueIdToken(zone.id)}`,
    severity: 'error',
    category: 'land',
    objectId: zone.id,
    affectedPoint: zone.center,
    affectedBoundary: zone.boundary,
    suggestedFix: `Regenerate ${zone.id} from deterministic land topography rules.`,
    message
  };
}

function createSoilGeologyIssue(zone: ValidationSoilGeologyZone, suffix: string, message: string): ValidationIssue {
  return {
    id: `soil-geology-${suffix}-${toIssueIdToken(zone.id)}`,
    severity: 'error',
    category: 'land',
    objectId: zone.id,
    affectedPoint: zone.center,
    affectedBoundary: zone.boundary,
    suggestedFix: `Regenerate ${zone.id} from deterministic land soil and geology rules.`,
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

  for (const phase of city.developmentPhases) {
    validatePoint2D(city.geospatial, phase.id, 'focusPoint', phase.focusPoint, issues);
    validatePolygon2D(city.geospatial, phase.id, 'boundary', phase.boundary, issues);
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

  for (const segment of city.bikeSegments) {
    validatePolyline2D(city.geospatial, segment.id, 'centerline', segment.centerline, issues);
  }

  for (const node of city.bikeGraphNodes) {
    validatePoint2D(city.geospatial, node.id, 'position', node.position, issues);
  }

  for (const parking of city.bikeParking) {
    validatePoint2D(city.geospatial, parking.id, 'position', parking.position, issues);
  }

  for (const signal of city.bikeSignals) {
    validatePoint2D(city.geospatial, signal.id, 'position', signal.position, issues);
  }

  for (const conflict of city.bikeConflictZones) {
    validatePoint2D(city.geospatial, conflict.id, 'position', conflict.position, issues);
  }

  for (const dock of city.freightLoadingDocks) {
    validatePoint2D(city.geospatial, dock.id, 'position', dock.position, issues);
    validateHeightValue(city.geospatial, dock.id, 'dockHeightMeters', dock.dockHeightMeters, issues);
  }

  for (const route of city.freightRoutes) {
    validatePolyline2D(city.geospatial, route.id, 'polyline', route.polyline, issues);
  }

  for (const alley of city.serviceAlleys) {
    validatePolyline2D(city.geospatial, alley.id, 'centerline', alley.centerline, issues);
  }

  for (const utilityNode of city.utilityNodes) {
    validatePoint2D(city.geospatial, utilityNode.id, 'center', utilityNode.center, issues);
    validatePoint2D(city.geospatial, utilityNode.id, 'accessPoint.position', utilityNode.accessPoint.position, issues);
  }

  for (const utilityEdge of city.utilityEdges) {
    validatePolyline2D(city.geospatial, utilityEdge.id, 'centerline', utilityEdge.centerline, issues);
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

  for (const anchor of city.civicAnchors) {
    validatePoint2D(city.geospatial, anchor.id, 'center', anchor.center, issues);
  }

  for (const anchor of city.communityAnchors) {
    validatePoint2D(city.geospatial, anchor.id, 'center', anchor.center, issues);
  }

  for (const anchor of city.cultureAnchors) {
    validatePoint2D(city.geospatial, anchor.id, 'center', anchor.center, issues);
  }

  for (const anchor of city.governmentAnchors) {
    validatePoint2D(city.geospatial, anchor.id, 'center', anchor.center, issues);
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

  for (const feature of city.parkFeatures) {
    validatePoint2D(city.geospatial, feature.id, 'center', feature.center, issues);
    validatePolygon2D(city.geospatial, feature.id, 'boundary', feature.boundary, issues);
  }

  for (const plazaZone of city.plazaZones) {
    validatePoint2D(city.geospatial, plazaZone.id, 'center', plazaZone.center, issues);
    validatePolygon2D(city.geospatial, plazaZone.id, 'boundary', plazaZone.boundary, issues);
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

  for (const openSpace of city.waterfrontOpenSpaces) {
    validatePoint2D(city.geospatial, openSpace.id, 'center', openSpace.center, issues);
    validatePolygon2D(city.geospatial, openSpace.id, 'boundary', openSpace.boundary, issues);
    if (openSpace.waterAccessPoint) {
      validatePoint2D(city.geospatial, openSpace.id, 'waterAccessPoint', openSpace.waterAccessPoint, issues);
    }
    validateHeightValue(city.geospatial, openSpace.id, 'elevationMeters', openSpace.elevationMeters, issues);
  }

  for (const hazardZone of city.hazardZones) {
    validatePoint2D(city.geospatial, hazardZone.id, 'focusPoint', hazardZone.focusPoint, issues);
    validatePolygon2D(city.geospatial, hazardZone.id, 'boundary', hazardZone.boundary, issues);
  }

  for (const soilGeologyZone of city.soilGeologyZones) {
    validatePoint2D(city.geospatial, soilGeologyZone.id, 'center', soilGeologyZone.center, issues);
    validatePolygon2D(city.geospatial, soilGeologyZone.id, 'boundary', soilGeologyZone.boundary, issues);
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

      if (shelterKind === 'park' || shelterKind === 'building' || shelterKind === 'civic-anchor' || shelterKind === 'community-anchor') {
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

function validateWeatherPresets(weatherPresets: readonly ValidationWeatherPreset[], issues: ValidationIssue[]): void {
  const presetKinds = new Set<WeatherPresetKind>();
  const activePresets = weatherPresets.filter((preset) => preset.active);

  if (weatherPresets.length === 0) {
    issues.push({
      id: 'missing-weather-presets',
      severity: 'error',
      category: 'environment',
      message: 'Climate and weather generation must expose deterministic weather presets.'
    });
  }

  if (activePresets.length !== 1) {
    issues.push({
      id: 'invalid-active-weather-preset-count',
      severity: 'error',
      category: 'environment',
      objectId: activePresets[0]?.id,
      message: 'Exactly one weather preset must be active for deterministic rendering and simulation state.'
    });
  }

  for (const preset of weatherPresets) {
    if (!WEATHER_PRESET_KINDS.includes(preset.presetKind)) {
      issues.push(createWeatherPresetIssue(preset, 'invalid-kind', `Weather preset ${preset.id} uses unsupported kind ${preset.presetKind}.`));
    } else {
      presetKinds.add(preset.presetKind);
    }

    if (!WEATHER_SEASONS.includes(preset.season)) {
      issues.push(createWeatherPresetIssue(preset, 'invalid-season', `Weather preset ${preset.id} uses unsupported season ${preset.season}.`));
    }

    if (!WEATHER_PRECIPITATION_KINDS.includes(preset.precipitation)) {
      issues.push(createWeatherPresetIssue(preset, 'invalid-precipitation', `Weather preset ${preset.id} uses unsupported precipitation ${preset.precipitation}.`));
    }

    if (
      !isUnitInterval(preset.cloudCover) ||
      !isUnitInterval(preset.precipitationIntensity) ||
      !isUnitInterval(preset.surfaceWetness) ||
      !isUnitInterval(preset.puddleCoverage) ||
      !isUnitInterval(preset.humidity)
    ) {
      issues.push(createWeatherPresetIssue(preset, 'invalid-normalized-values', `Weather preset ${preset.id} must keep cloud, precipitation, wetness, puddle, and humidity values in 0..1.`));
    }

    if (
      preset.visibilityMeters < 450 ||
      preset.rendering.fogDensity > 0.006 ||
      preset.rendering.skyOpacity > 0.6
    ) {
      issues.push(createWeatherPresetIssue(preset, 'visibility-hides-city', `Weather preset ${preset.id} must preserve enough visibility to inspect the city.`));
    }

    if (
      !isFiniteNumber(preset.temperatureCelsius) ||
      !isFiniteNumber(preset.windSpeedKph) ||
      preset.windSpeedKph < 0 ||
      preset.transitionSeconds <= 0 ||
      preset.rendering.sunIntensity < 0 ||
      preset.rendering.hemisphereIntensity < 0 ||
      preset.rendering.fillIntensity < 0 ||
      preset.rendering.exposure <= 0 ||
      preset.simulationHooks.trafficSpeedMultiplier <= 0 ||
      preset.simulationHooks.trafficSpeedMultiplier > 1.2
    ) {
      issues.push(createWeatherPresetIssue(preset, 'invalid-runtime-values', `Weather preset ${preset.id} has invalid rendering or simulation values.`));
    }

    if (preset.precipitation === 'none' && (preset.precipitationIntensity > 0 || preset.puddleCoverage > 0.05)) {
      issues.push(createWeatherPresetIssue(preset, 'dry-preset-has-rain-effects', `Dry weather preset ${preset.id} must not expose rain or large puddle coverage.`));
    }

    if ((preset.precipitation === 'rain' || preset.precipitation === 'heavy-rain') && preset.surfaceWetness < 0.5) {
      issues.push(createWeatherPresetIssue(preset, 'rain-without-wetness', `Rain weather preset ${preset.id} must expose wet surface hooks.`));
    }
  }

  for (const requiredKind of WEATHER_PRESET_KINDS) {
    if (!presetKinds.has(requiredKind)) {
      issues.push({
        id: `missing-weather-preset-${requiredKind}`,
        severity: 'error',
        category: 'environment',
        objectId: `weather-preset-${requiredKind}`,
        message: `Weather presets must include ${requiredKind}.`
      });
    }
  }
}

function createWeatherPresetIssue(
  preset: ValidationWeatherPreset,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `weather-preset-${issueIdSuffix}-${toIssueIdToken(preset.id)}`,
    severity: 'error',
    category: 'environment',
    objectId: preset.id,
    suggestedFix: `Regenerate ${preset.id} from climate/weather preset rules.`,
    message
  };
}

function validateSolarShadingSamples(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const sampleKinds = new Set<SolarShadingSampleKind>();
  const weatherPresetIds = new Set(city.weatherPresets.map((preset) => preset.id));

  if (city.solarShadingSamples.length === 0) {
    issues.push({
      id: 'missing-solar-shading-samples',
      severity: 'error',
      category: 'environment',
      message: 'Solar and shading generation must expose deterministic analysis samples.'
    });
  }

  for (const sample of city.solarShadingSamples) {
    if (!SOLAR_SHADING_SAMPLE_KINDS.includes(sample.sampleKind)) {
      issues.push(createSolarShadingIssue(sample, 'invalid-kind', `Solar shading sample ${sample.id} uses unsupported kind ${sample.sampleKind}.`));
    } else {
      sampleKinds.add(sample.sampleKind);
    }

    if (!SOLAR_GLARE_RISKS.includes(sample.glareRisk)) {
      issues.push(createSolarShadingIssue(sample, 'invalid-glare-risk', `Solar shading sample ${sample.id} uses unsupported glare risk ${sample.glareRisk}.`));
    }

    if (!hasObjectId(city, sample.parentObjectId)) {
      issues.push(createSolarShadingIssue(sample, 'missing-parent-object', `Solar shading sample ${sample.id} references missing parent object ${sample.parentObjectId}.`));
    }

    if (!weatherPresetIds.has(sample.weatherPresetId)) {
      issues.push(createSolarShadingIssue(sample, 'missing-weather-preset', `Solar shading sample ${sample.id} references missing weather preset ${sample.weatherPresetId}.`));
    }

    if (
      sample.analysisRadiusMeters <= 0 ||
      sample.daylightHours <= 0 ||
      sample.daylightHours > 24 ||
      sample.peakSunHour < 0 ||
      sample.peakSunHour > 23 ||
      !isUnitInterval(sample.shadeCoverageRatio) ||
      !isUnitInterval(sample.comfortScore) ||
      !isUnitInterval(sample.roofSuitabilityScore) ||
      sample.solarPotentialKwhPerDay < 0 ||
      sample.sunPath.length < 3
    ) {
      issues.push(createSolarShadingIssue(sample, 'invalid-values', `Solar shading sample ${sample.id} must keep daylight, shade, comfort, and solar values in supported ranges.`));
    }

    for (const pathSample of sample.sunPath) {
      if (
        pathSample.hour < 0 ||
        pathSample.hour > 23 ||
        pathSample.altitudeDegrees < 0 ||
        pathSample.altitudeDegrees > 90 ||
        pathSample.azimuthDegrees < 0 ||
        pathSample.azimuthDegrees > 360 ||
        pathSample.shadowLengthMultiplier < 0 ||
        pathSample.irradianceWattsPerSqM < 0 ||
        pathSample.irradianceWattsPerSqM > 1100
      ) {
        issues.push(createSolarShadingIssue(sample, 'invalid-sun-path', `Solar shading sample ${sample.id} has an invalid sun path sample.`));
        break;
      }
    }

    validateSolarShadingReferences(city, sample, issues);
  }

  for (const requiredKind of SOLAR_SHADING_SAMPLE_KINDS) {
    if (!sampleKinds.has(requiredKind)) {
      issues.push({
        id: `missing-solar-shading-sample-${requiredKind}`,
        severity: 'error',
        category: 'environment',
        objectId: `solar-shading-${requiredKind}-0`,
        message: `Solar and shading samples must include ${requiredKind}.`
      });
    }
  }
}

function validateSolarShadingReferences(
  city: GeneratedCityForValidation,
  sample: ValidationSolarShadingSample,
  issues: ValidationIssue[]
): void {
  const references = sample.references;

  if (sample.sampleKind === 'roof-solar') {
    if (!references.buildingId || !hasObjectId(city, references.buildingId)) {
      issues.push(createSolarShadingIssue(sample, 'missing-building-reference', `Roof solar sample ${sample.id} must reference an existing building.`));
    }

    for (const detailId of references.roofDetailIds ?? []) {
      if (!city.buildings.some((building) => building.roofGrammar.details.some((detail) => detail.detailId === detailId))) {
        issues.push(createSolarShadingIssue(sample, 'missing-roof-detail-reference', `Roof solar sample ${sample.id} references missing roof detail ${detailId}.`));
      }
    }

    if (sample.solarPotentialKwhPerDay <= 0 || sample.roofSuitabilityScore <= 0) {
      issues.push(createSolarShadingIssue(sample, 'invalid-roof-solar-potential', `Roof solar sample ${sample.id} must expose positive solar potential and suitability.`));
    }
  }

  if (sample.sampleKind === 'plaza-comfort' && (!references.plazaZoneId || !hasObjectId(city, references.plazaZoneId))) {
    issues.push(createSolarShadingIssue(sample, 'missing-plaza-reference', `Plaza comfort sample ${sample.id} must reference an existing plaza zone.`));
  }

  if (sample.sampleKind === 'park-comfort' && (!references.parkId || !hasObjectId(city, references.parkId))) {
    issues.push(createSolarShadingIssue(sample, 'missing-park-reference', `Park comfort sample ${sample.id} must reference an existing park.`));
  }

  if (
    sample.sampleKind === 'waterfront-comfort' &&
    (!references.waterfrontOpenSpaceId || !hasObjectId(city, references.waterfrontOpenSpaceId))
  ) {
    issues.push(createSolarShadingIssue(sample, 'missing-waterfront-reference', `Waterfront comfort sample ${sample.id} must reference an existing waterfront open space.`));
  }

  for (const featureId of references.parkFeatureIds ?? []) {
    if (!hasObjectId(city, featureId)) {
      issues.push(createSolarShadingIssue(sample, 'missing-feature-reference', `Solar shading sample ${sample.id} references missing park feature ${featureId}.`));
    }
  }

  for (const treeId of references.shadeTreeIds ?? []) {
    if (!hasObjectId(city, treeId)) {
      issues.push(createSolarShadingIssue(sample, 'missing-tree-reference', `Solar shading sample ${sample.id} references missing shade tree ${treeId}.`));
    }
  }
}

function createSolarShadingIssue(
  sample: ValidationSolarShadingSample,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `solar-shading-${issueIdSuffix}-${toIssueIdToken(sample.id)}`,
    severity: 'error',
    category: 'environment',
    objectId: sample.id,
    suggestedFix: `Regenerate ${sample.id} from solar and shading rules.`,
    ...createIssueFocus(sample.center, `Review solar and shading sample ${sample.id}.`),
    message
  };
}

function validateUrbanHeatZones(city: GeneratedCityForValidation, issues: ValidationIssue[]): void {
  const zoneKinds = new Set<UrbanHeatZoneKind>();
  const weatherPresetIds = new Set(city.weatherPresets.map((preset) => preset.id));

  if (city.urbanHeatZones.length === 0) {
    issues.push({
      id: 'missing-urban-heat-zones',
      severity: 'error',
      category: 'environment',
      message: 'Urban heat generation must expose deterministic heat-risk and cooling zones.'
    });
  }

  for (const zone of city.urbanHeatZones) {
    if (!URBAN_HEAT_ZONE_KINDS.includes(zone.zoneKind)) {
      issues.push(createUrbanHeatIssue(zone, 'invalid-kind', `Urban heat zone ${zone.id} uses unsupported kind ${zone.zoneKind}.`));
    } else {
      zoneKinds.add(zone.zoneKind);
    }

    if (!URBAN_HEAT_RISK_LEVELS.includes(zone.riskLevel)) {
      issues.push(createUrbanHeatIssue(zone, 'invalid-risk-level', `Urban heat zone ${zone.id} uses unsupported risk level ${zone.riskLevel}.`));
    }

    if (!hasObjectId(city, zone.parentObjectId)) {
      issues.push(createUrbanHeatIssue(zone, 'missing-parent-object', `Urban heat zone ${zone.id} references missing parent object ${zone.parentObjectId}.`));
    }

    if (!weatherPresetIds.has(zone.weatherPresetId)) {
      issues.push(createUrbanHeatIssue(zone, 'missing-weather-preset', `Urban heat zone ${zone.id} references missing weather preset ${zone.weatherPresetId}.`));
    }

    if (
      zone.boundary.length < 4 ||
      !isUnitInterval(zone.surfaceAlbedo) ||
      !isUnitInterval(zone.shadeCoverageRatio) ||
      !isUnitInterval(zone.treeCanopyCoolingScore) ||
      !isUnitInterval(zone.waterCoolingScore) ||
      !isUnitInterval(zone.coolRoofCoverageRatio) ||
      !isUnitInterval(zone.mitigationEffectScore) ||
      !isUnitInterval(zone.heatRiskScore) ||
      !isUnitInterval(zone.routeExposureScore) ||
      zone.daytimeTemperatureDeltaCelsius < -5 ||
      zone.daytimeTemperatureDeltaCelsius > 12 ||
      zone.nightTemperatureDeltaCelsius < -5 ||
      zone.nightTemperatureDeltaCelsius > 10
    ) {
      issues.push(createUrbanHeatIssue(zone, 'invalid-values', `Urban heat zone ${zone.id} must keep heat, albedo, cooling, and risk values in supported ranges.`));
    }

    validateUrbanHeatReferences(city, zone, issues);

    if (
      zone.zoneKind === 'public-route-risk' &&
      zone.routeExposureScore >= 0.72 &&
      (zone.references.roadIds?.length ?? 0) === 0
    ) {
      issues.push(createUrbanHeatIssue(zone, 'missing-high-risk-route', `High-risk public route heat zone ${zone.id} must reference at least one route road.`));
    }

    if (zone.zoneKind === 'public-route-risk' && zone.heatRiskScore >= 0.7 && zone.mitigationEffectScore < 0.2) {
      issues.push(createUrbanHeatIssue(zone, 'unmitigated-public-route-risk', `High-risk public route heat zone ${zone.id} must expose shade, tree, water, or roof mitigation.`));
    }
  }

  for (const requiredKind of URBAN_HEAT_ZONE_KINDS) {
    if (!zoneKinds.has(requiredKind)) {
      issues.push({
        id: `missing-urban-heat-zone-${requiredKind}`,
        severity: 'error',
        category: 'environment',
        objectId: `urban-heat-${requiredKind}-0`,
        message: `Urban heat zones must include ${requiredKind}.`
      });
    }
  }
}

function validateUrbanHeatReferences(
  city: GeneratedCityForValidation,
  zone: ValidationUrbanHeatZone,
  issues: ValidationIssue[]
): void {
  const references = zone.references;

  if (zone.zoneKind === 'heat-island' && (!references.districtId || !hasObjectId(city, references.districtId))) {
    issues.push(createUrbanHeatIssue(zone, 'missing-district-reference', `Heat island zone ${zone.id} must reference an existing district.`));
  }

  if (zone.zoneKind === 'cool-roof' && (references.buildingIds?.length ?? 0) === 0) {
    issues.push(createUrbanHeatIssue(zone, 'missing-building-reference', `Cool roof zone ${zone.id} must reference at least one building.`));
  }

  if (zone.zoneKind === 'canopy-cooling' && (references.treeIds?.length ?? 0) === 0) {
    issues.push(createUrbanHeatIssue(zone, 'missing-tree-reference', `Canopy cooling zone ${zone.id} must reference tree plantings.`));
  }

  if (
    zone.zoneKind === 'water-cooling' &&
    (!references.waterfrontOpenSpaceId || !hasObjectId(city, references.waterfrontOpenSpaceId))
  ) {
    issues.push(createUrbanHeatIssue(zone, 'missing-waterfront-reference', `Water cooling zone ${zone.id} must reference an existing waterfront open space.`));
  }

  for (const buildingId of references.buildingIds ?? []) {
    if (!hasObjectId(city, buildingId)) {
      issues.push(createUrbanHeatIssue(zone, 'missing-building-reference', `Urban heat zone ${zone.id} references missing building ${buildingId}.`));
    }
  }

  for (const roadId of references.roadIds ?? []) {
    if (!hasObjectId(city, roadId)) {
      issues.push(createUrbanHeatIssue(zone, 'missing-road-reference', `Urban heat zone ${zone.id} references missing road ${roadId}.`));
    }
  }

  for (const treeId of references.treeIds ?? []) {
    if (!hasObjectId(city, treeId)) {
      issues.push(createUrbanHeatIssue(zone, 'missing-tree-reference', `Urban heat zone ${zone.id} references missing tree ${treeId}.`));
    }
  }

  for (const sampleId of references.solarShadingSampleIds ?? []) {
    if (!hasObjectId(city, sampleId)) {
      issues.push(createUrbanHeatIssue(zone, 'missing-solar-reference', `Urban heat zone ${zone.id} references missing solar shading sample ${sampleId}.`));
    }
  }

  for (const hazardId of references.hazardZoneIds ?? []) {
    if (!hasObjectId(city, hazardId)) {
      issues.push(createUrbanHeatIssue(zone, 'missing-hazard-reference', `Urban heat zone ${zone.id} references missing hazard zone ${hazardId}.`));
    }
  }
}

function createUrbanHeatIssue(
  zone: ValidationUrbanHeatZone,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `urban-heat-${issueIdSuffix}-${toIssueIdToken(zone.id)}`,
    severity: 'error',
    category: 'environment',
    objectId: zone.id,
    suggestedFix: `Regenerate ${zone.id} from urban heat layer rules.`,
    ...createIssueFocus(zone.center, `Review urban heat zone ${zone.id}.`),
    message
  };
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

function validateWaterfrontOpenSpaces(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const spacesByEdgeId = new Map<CityId, ValidationWaterfrontOpenSpace[]>();

  for (const openSpace of city.waterfrontOpenSpaces) {
    const edge = city.waterfrontEdges.find((candidate) => candidate.id === openSpace.waterfrontEdgeId);
    const binding = assetBindingsById.get(openSpace.assetBindingId);
    spacesByEdgeId.set(openSpace.waterfrontEdgeId, [...(spacesByEdgeId.get(openSpace.waterfrontEdgeId) ?? []), openSpace]);

    if (!edge || openSpace.parentId !== openSpace.waterfrontEdgeId) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'missing-waterfront-edge',
          `Waterfront open space ${openSpace.id} must be parented to existing waterfront edge ${openSpace.waterfrontEdgeId}.`
        )
      );
      continue;
    }

    if (openSpace.waterwayId !== edge.waterwayId) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'waterway-mismatch',
          `Waterfront open space ${openSpace.id} must use parent edge waterway ${edge.waterwayId}.`
        )
      );
    }

    if (!WATERFRONT_OPEN_SPACE_KINDS.includes(openSpace.openSpaceKind)) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'invalid-kind',
          `Waterfront open space ${openSpace.id} must declare a supported open-space kind.`
        )
      );
    }

    if (!WATERFRONT_OPEN_SPACE_SURFACES.includes(openSpace.surface)) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'invalid-surface',
          `Waterfront open space ${openSpace.id} must declare a supported surface.`
        )
      );
    }

    if (openSpace.lengthMeters <= 0 || openSpace.widthMeters <= 0) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'invalid-dimensions',
          `Waterfront open space ${openSpace.id} must have positive length and width.`
        )
      );
    }

    if (openSpace.publicAccess && !openSpace.accessible) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'public-not-accessible',
          `Public waterfront open space ${openSpace.id} must be accessible.`
        )
      );
    }

    if ((openSpace.openSpaceKind === 'water-access' || openSpace.openSpaceKind === 'pier-landing') && !openSpace.waterAccessPoint) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'missing-water-access',
          `Waterfront open space ${openSpace.id} must expose a water access point.`
        )
      );
    }

    if (openSpace.openSpaceKind !== 'ecological-edge' && openSpace.seatingCapacity <= 0) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'missing-seating',
          `Usable waterfront open space ${openSpace.id} must expose seating capacity.`
        )
      );
    }

    if (openSpace.openSpaceKind !== 'ecological-edge' && openSpace.railingLengthMeters <= 0) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'missing-railing',
          `Usable waterfront open space ${openSpace.id} must expose railing length.`
        )
      );
    }

    if (
      openSpace.comfort.shadeCoverageRatio < 0 ||
      openSpace.comfort.shadeCoverageRatio > 1 ||
      openSpace.comfort.ecologyScore < 0 ||
      openSpace.comfort.ecologyScore > 1 ||
      openSpace.comfort.eventCapacityPeople < 0
    ) {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'invalid-comfort',
          `Waterfront open space ${openSpace.id} comfort metrics must be bounded and non-negative.`
        )
      );
    }

    if (!binding || binding.objectKind !== 'waterfront-open-space') {
      issues.push(
        createWaterfrontOpenSpaceIssue(
          openSpace,
          'missing-render-binding',
          `Waterfront open space ${openSpace.id} must reference a waterfront-open-space render binding.`
        )
      );
    }

    for (const roadId of openSpace.connectedRoadIds) {
      const road = city.objectIndex.objectsById[roadId];
      if (!road || road.kind !== 'road-segment') {
        issues.push(
          createWaterfrontOpenSpaceIssue(
            openSpace,
            `missing-road-${toIssueIdToken(roadId)}`,
            `Waterfront open space ${openSpace.id} references missing road ${roadId}.`
          )
        );
      }
    }

    for (const parkId of openSpace.connectedParkIds) {
      const park = city.objectIndex.objectsById[parkId];
      if (!park || park.kind !== 'park') {
        issues.push(
          createWaterfrontOpenSpaceIssue(
            openSpace,
            `missing-park-${toIssueIdToken(parkId)}`,
            `Waterfront open space ${openSpace.id} references missing park ${parkId}.`
          )
        );
      }
    }

    for (const furnitureId of openSpace.nearbyFurnitureIds) {
      const furniture = city.objectIndex.objectsById[furnitureId];
      if (!furniture || furniture.kind !== 'street-furniture') {
        issues.push(
          createWaterfrontOpenSpaceIssue(
            openSpace,
            `missing-furniture-${toIssueIdToken(furnitureId)}`,
            `Waterfront open space ${openSpace.id} references missing street furniture ${furnitureId}.`
          )
        );
      }
    }

    for (const treeId of openSpace.shadeTreeIds) {
      const tree = city.objectIndex.objectsById[treeId];
      if (!tree || tree.kind !== 'tree-planting') {
        issues.push(
          createWaterfrontOpenSpaceIssue(
            openSpace,
            `missing-tree-${toIssueIdToken(treeId)}`,
            `Waterfront open space ${openSpace.id} references missing shade tree ${treeId}.`
          )
        );
      }
    }
  }

  for (const edge of city.waterfrontEdges) {
    if ((edge.publicAccess || edge.waterfrontKind === 'ecological-edge') && !spacesByEdgeId.has(edge.id)) {
      issues.push(
        createWaterfrontIssue(
          edge,
          'missing-open-space',
          `Waterfront edge ${edge.id} must have a matching public-realm waterfront open space.`
        )
      );
    }
  }
}

function createWaterfrontOpenSpaceIssue(
  openSpace: ValidationWaterfrontOpenSpace,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `waterfront-open-space-${issueIdSuffix}-${toIssueIdToken(openSpace.id)}`,
    severity: 'error',
    category: 'land',
    objectId: openSpace.id,
    ...createIssueFocus(
      openSpace.center,
      `Regenerate ${openSpace.id} from current waterfront edge, public realm, tree, and furniture references.`
    ),
    message
  };
}

function validateCivicAnchors(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const anchorsByService = new Map<CivicAnchorServiceType, ValidationCivicAnchor[]>();
  const civicBuildings = city.buildings.filter((building) => building.typology.kind === 'civic');

  for (const anchor of city.civicAnchors) {
    const building = city.buildings.find((candidate) => candidate.id === anchor.buildingId);
    const parcel = city.parcels.find((candidate) => candidate.id === anchor.parcelId);
    const district = city.districts.find((candidate) => candidate.id === anchor.districtId);
    const serviceArea = city.administrativeBoundaries.find((candidate) => candidate.id === anchor.serviceAreaBoundaryId);
    const binding = assetBindingsById.get(anchor.renderBindingId);

    if (CIVIC_ANCHOR_SERVICE_TYPES.includes(anchor.serviceType)) {
      anchorsByService.set(anchor.serviceType, [...(anchorsByService.get(anchor.serviceType) ?? []), anchor]);
    } else {
      issues.push(createCivicAnchorIssue(anchor, 'invalid-service-type', `Civic anchor ${anchor.id} must declare a supported service type.`));
    }

    if (!building || anchor.parentId !== anchor.buildingId || building.kind !== 'building') {
      issues.push(createCivicAnchorIssue(anchor, 'missing-building', `Civic anchor ${anchor.id} must be parented to building ${anchor.buildingId}.`));
      continue;
    }

    if (building.typology.kind !== 'civic') {
      issues.push(createCivicAnchorIssue(anchor, 'non-civic-building', `Civic anchor ${anchor.id} must attach to a civic building typology.`));
    }

    if (!parcel || parcel.id !== building.parcelId || parcel.blockId !== anchor.blockId) {
      issues.push(createCivicAnchorIssue(anchor, 'parcel-block-mismatch', `Civic anchor ${anchor.id} must reference its building parcel and block.`));
    }

    if (!district || (parcel && parcel.districtId !== district.id)) {
      issues.push(createCivicAnchorIssue(anchor, 'district-mismatch', `Civic anchor ${anchor.id} must reference the district of its parcel.`));
    }

    if (!serviceArea || serviceArea.boundaryKind !== 'service-area') {
      issues.push(createCivicAnchorIssue(anchor, 'missing-service-area', `Civic anchor ${anchor.id} must reference an administrative service-area boundary.`));
    }

    if (anchor.administrativeBoundaryIds.length === 0) {
      issues.push(createCivicAnchorIssue(anchor, 'missing-boundary-membership', `Civic anchor ${anchor.id} must expose administrative boundary memberships.`));
    }

    for (const boundaryId of anchor.administrativeBoundaryIds) {
      if (!city.administrativeBoundaries.some((boundary) => boundary.id === boundaryId)) {
        issues.push(createCivicAnchorIssue(anchor, `missing-boundary-${toIssueIdToken(boundaryId)}`, `Civic anchor ${anchor.id} references missing boundary ${boundaryId}.`));
      }
    }

    if (
      anchor.catchment.radiusMeters <= 0 ||
      anchor.catchment.populationCapacity <= 0 ||
      anchor.catchment.serviceAreaSqM <= 0 ||
      anchor.catchment.targetDistrictIds.length === 0
    ) {
      issues.push(createCivicAnchorIssue(anchor, 'invalid-catchment', `Civic anchor ${anchor.id} must define positive catchment radius, capacity, service area, and target districts.`));
    }

    for (const districtId of anchor.catchment.targetDistrictIds) {
      if (!city.districts.some((candidate) => candidate.id === districtId)) {
        issues.push(createCivicAnchorIssue(anchor, `missing-target-district-${toIssueIdToken(districtId)}`, `Civic anchor ${anchor.id} references missing catchment target district ${districtId}.`));
      }
    }

    if (anchor.capacity.dailyVisitors <= 0 || anchor.capacity.staff <= 0) {
      issues.push(createCivicAnchorIssue(anchor, 'invalid-capacity', `Civic anchor ${anchor.id} must define positive visitor and staff capacity.`));
    }

    if (anchor.arrivalModes.length === 0 || anchor.arrivalModes.some((mode) => !CIVIC_ANCHOR_ARRIVAL_MODES.includes(mode))) {
      issues.push(createCivicAnchorIssue(anchor, 'invalid-arrival-modes', `Civic anchor ${anchor.id} must expose supported arrival modes.`));
    }

    if (anchor.serviceType === 'emergency' && !anchor.arrivalModes.includes('emergency')) {
      issues.push(createCivicAnchorIssue(anchor, 'missing-emergency-arrival', `Emergency civic anchor ${anchor.id} must expose emergency arrival mode.`));
    }

    if (anchor.publicEntranceIds.length === 0 || anchor.publicEntranceIds.some((entranceId) => !building.publicEntranceIds.includes(entranceId))) {
      issues.push(createCivicAnchorIssue(anchor, 'invalid-public-entrances', `Civic anchor ${anchor.id} must reuse public entrances from its building.`));
    }

    if (anchor.serviceEntranceIds.length === 0) {
      issues.push(createCivicAnchorIssue(anchor, 'missing-service-entrances', `Civic anchor ${anchor.id} must expose service entrance identifiers.`));
    }

    if (
      anchor.schedule.scheduleProfileId.length === 0 ||
      anchor.schedule.openHour < 0 ||
      anchor.schedule.closeHour > 24 ||
      anchor.schedule.openHour >= anchor.schedule.closeHour
    ) {
      issues.push(createCivicAnchorIssue(anchor, 'invalid-schedule', `Civic anchor ${anchor.id} must define a valid schedule profile and open/close hours.`));
    }

    if ((anchor.serviceType === 'emergency' || anchor.serviceType === 'healthcare') && !anchor.schedule.emergencyAccess) {
      issues.push(createCivicAnchorIssue(anchor, 'missing-emergency-access', `Emergency and healthcare civic anchor ${anchor.id} must keep emergency access enabled.`));
    }

    if (!binding || binding.objectKind !== 'civic-anchor') {
      issues.push(createCivicAnchorIssue(anchor, 'missing-render-binding', `Civic anchor ${anchor.id} must reference a civic-anchor render binding.`));
    }
  }

  if (civicBuildings.length > 0 && city.civicAnchors.length === 0) {
    issues.push({
      id: 'missing-civic-anchor-base-contracts',
      severity: 'error',
      category: 'zoning',
      objectId: civicBuildings[0].id,
      ...createIssueFocus(civicBuildings[0].center, 'Generate civic anchors from civic building typology and administrative service areas.'),
      message: 'Civic buildings must expose civic anchor base contracts.'
    });
  }

  for (const serviceType of ['community', 'culture', 'education', 'emergency', 'government', 'healthcare'] as const satisfies readonly CivicAnchorServiceType[]) {
    if (!anchorsByService.has(serviceType)) {
      issues.push({
        id: `missing-civic-anchor-service-${serviceType}`,
        severity: 'error',
        category: 'zoning',
        ...createIssueFocus(civicBuildings[0]?.center, `Create a ${serviceType} civic anchor from an existing civic building.`),
        message: `Civic anchor base contracts must include a ${serviceType} service type.`
      });
    }
  }
}

function createCivicAnchorIssue(
  anchor: ValidationCivicAnchor,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `civic-anchor-${issueIdSuffix}-${toIssueIdToken(anchor.id)}`,
    severity: 'error',
    category: 'zoning',
    objectId: anchor.id,
    ...createIssueFocus(anchor.center, `Regenerate ${anchor.id} from current civic buildings and administrative service areas.`),
    message
  };
}

function validateCommunityAnchors(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const anchorsByKind = new Map<CommunityAnchorKind, ValidationCommunityAnchor[]>();
  const communityBaseAnchor = city.civicAnchors.find((anchor) => anchor.serviceType === 'community');

  for (const anchor of city.communityAnchors) {
    const civicAnchor = city.civicAnchors.find((candidate) => candidate.id === anchor.civicAnchorId);
    const building = city.buildings.find((candidate) => candidate.id === anchor.buildingId);
    const district = city.districts.find((candidate) => candidate.id === anchor.districtId);
    const binding = assetBindingsById.get(anchor.renderBindingId);

    if (COMMUNITY_ANCHOR_KINDS.includes(anchor.anchorKind)) {
      anchorsByKind.set(anchor.anchorKind, [...(anchorsByKind.get(anchor.anchorKind) ?? []), anchor]);
    } else {
      issues.push(createCommunityAnchorIssue(anchor, 'invalid-kind', `Community anchor ${anchor.id} must declare a supported community anchor kind.`));
    }

    if (!civicAnchor || civicAnchor.serviceType !== 'community' || anchor.parentId !== anchor.civicAnchorId) {
      issues.push(createCommunityAnchorIssue(anchor, 'missing-civic-anchor', `Community anchor ${anchor.id} must be parented to a community civic anchor.`));
    }

    if (!building || (civicAnchor && building.id !== civicAnchor.buildingId)) {
      issues.push(createCommunityAnchorIssue(anchor, 'building-mismatch', `Community anchor ${anchor.id} must reuse the community civic anchor building.`));
    }

    if (!district || (civicAnchor && district.id !== civicAnchor.districtId)) {
      issues.push(createCommunityAnchorIssue(anchor, 'district-mismatch', `Community anchor ${anchor.id} must stay in the community civic anchor district.`));
    }

    if (anchor.plazaZoneIds.length === 0) {
      issues.push(createCommunityAnchorIssue(anchor, 'missing-plaza-relationship', `Community anchor ${anchor.id} must link to civic plaza zones.`));
    }

    for (const plazaZoneId of anchor.plazaZoneIds) {
      const plazaZone = city.plazaZones.find((zone) => zone.id === plazaZoneId);

      if (!plazaZone || plazaZone.plazaId !== 'civic-plaza') {
        issues.push(createCommunityAnchorIssue(anchor, `missing-plaza-zone-${toIssueIdToken(plazaZoneId)}`, `Community anchor ${anchor.id} references missing civic plaza zone ${plazaZoneId}.`));
      }
    }

    if (
      anchor.serviceProgram.length === 0 ||
      anchor.dailyVisitors <= 0 ||
      anchor.staffCapacity <= 0 ||
      anchor.eventCapacityPeople < 0 ||
      anchor.socialServiceCapacityPeople < 0 ||
      anchor.shelterCapacityPeople < 0 ||
      anchor.communityCoverageScore <= 0 ||
      anchor.scheduleProfileId.length === 0
    ) {
      issues.push(createCommunityAnchorIssue(anchor, 'invalid-capacity', `Community anchor ${anchor.id} must expose positive community demand, coverage, schedule, and staffing metrics.`));
    }

    if ((anchor.anchorKind === 'community-hall' || anchor.anchorKind === 'processional-space' || anchor.anchorKind === 'worship-place') && !anchor.crowdEventReady) {
      issues.push(createCommunityAnchorIssue(anchor, 'missing-crowd-event-readiness', `Gathering-oriented community anchors must expose event/crowd readiness.`));
    }

    if (anchor.anchorKind === 'food-bank' && !anchor.foodDistribution) {
      issues.push(createCommunityAnchorIssue(anchor, 'missing-food-distribution', `Food bank community anchors must expose food distribution operations.`));
    }

    if (anchor.anchorKind === 'shelter' && anchor.shelterCapacityPeople === 0) {
      issues.push(createCommunityAnchorIssue(anchor, 'missing-shelter-capacity', `Shelter community anchors must expose shelter capacity.`));
    }

    if (anchor.anchorKind === 'cemetery' && anchor.cemeteryCapacityPlots === 0) {
      issues.push(createCommunityAnchorIssue(anchor, 'missing-cemetery-capacity', `Cemetery community anchors must expose cemetery plot capacity.`));
    }

    if (!binding || binding.objectKind !== 'community-anchor') {
      issues.push(createCommunityAnchorIssue(anchor, 'missing-render-binding', `Community anchor ${anchor.id} must reference a community-anchor render binding.`));
    }
  }

  if (communityBaseAnchor && city.communityAnchors.length === 0) {
    issues.push({
      id: 'missing-community-anchors',
      severity: 'error',
      category: 'zoning',
      objectId: communityBaseAnchor.id,
      ...createIssueFocus(communityBaseAnchor.center, 'Generate community anchors from the community civic anchor and civic plaza zones.'),
      message: 'Community civic anchors must expose worship, cemetery, processional, social service, recreation, food bank, shelter, and community hall hooks.'
    });
  }

  for (const anchorKind of COMMUNITY_ANCHOR_KINDS) {
    if (!anchorsByKind.has(anchorKind)) {
      issues.push({
        id: `missing-community-anchor-${anchorKind}`,
        severity: 'error',
        category: 'zoning',
        objectId: communityBaseAnchor?.id,
        ...createIssueFocus(communityBaseAnchor?.center, `Create the ${anchorKind} community anchor from the community civic anchor.`),
        message: `Community anchors must include ${anchorKind}.`
      });
    }
  }
}

function createCommunityAnchorIssue(
  anchor: ValidationCommunityAnchor,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `community-anchor-${issueIdSuffix}-${toIssueIdToken(anchor.id)}`,
    severity: 'error',
    category: 'zoning',
    objectId: anchor.id,
    ...createIssueFocus(anchor.center, `Regenerate ${anchor.id} from the community civic anchor and civic plaza zones.`),
    message
  };
}

function validateCultureAnchors(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const anchorsByKind = new Map<CultureAnchorKind, ValidationCultureAnchor[]>();
  const cultureBaseAnchor = city.civicAnchors.find((anchor) => anchor.serviceType === 'culture');

  for (const anchor of city.cultureAnchors) {
    const civicAnchor = city.civicAnchors.find((candidate) => candidate.id === anchor.civicAnchorId);
    const building = city.buildings.find((candidate) => candidate.id === anchor.buildingId);
    const district = city.districts.find((candidate) => candidate.id === anchor.districtId);
    const binding = assetBindingsById.get(anchor.renderBindingId);

    if (CULTURE_ANCHOR_KINDS.includes(anchor.anchorKind)) {
      anchorsByKind.set(anchor.anchorKind, [...(anchorsByKind.get(anchor.anchorKind) ?? []), anchor]);
    } else {
      issues.push(createCultureAnchorIssue(anchor, 'invalid-kind', `Culture anchor ${anchor.id} must declare a supported culture anchor kind.`));
    }

    if (!civicAnchor || civicAnchor.serviceType !== 'culture' || anchor.parentId !== anchor.civicAnchorId) {
      issues.push(createCultureAnchorIssue(anchor, 'missing-civic-anchor', `Culture anchor ${anchor.id} must be parented to a culture civic anchor.`));
    }

    if (!building || (civicAnchor && building.id !== civicAnchor.buildingId)) {
      issues.push(createCultureAnchorIssue(anchor, 'building-mismatch', `Culture anchor ${anchor.id} must reuse the culture civic anchor building.`));
    }

    if (!district || (civicAnchor && district.id !== civicAnchor.districtId)) {
      issues.push(createCultureAnchorIssue(anchor, 'district-mismatch', `Culture anchor ${anchor.id} must stay in the culture civic anchor district.`));
    }

    if (anchor.plazaZoneIds.length === 0) {
      issues.push(createCultureAnchorIssue(anchor, 'missing-plaza-relationship', `Culture anchor ${anchor.id} must link to civic plaza zones.`));
    }

    for (const plazaZoneId of anchor.plazaZoneIds) {
      const plazaZone = city.plazaZones.find((zone) => zone.id === plazaZoneId);

      if (!plazaZone || plazaZone.plazaId !== 'civic-plaza') {
        issues.push(createCultureAnchorIssue(anchor, `missing-plaza-zone-${toIssueIdToken(plazaZoneId)}`, `Culture anchor ${anchor.id} references missing civic plaza zone ${plazaZoneId}.`));
      }
    }

    if (
      anchor.culturalProgram.length === 0 ||
      anchor.culturalFootfallDaily <= 0 ||
      anchor.staffCapacity <= 0 ||
      anchor.eventCapacityPeople < 0 ||
      anchor.tourismAttractionScore <= 0 ||
      anchor.scheduleProfileId.length === 0
    ) {
      issues.push(createCultureAnchorIssue(anchor, 'invalid-capacity', `Culture anchor ${anchor.id} must expose positive cultural demand, tourism, schedule, and staffing metrics.`));
    }

    if ((anchor.anchorKind === 'event-space' || anchor.anchorKind === 'theater') && !anchor.eveningActivity) {
      issues.push(createCultureAnchorIssue(anchor, 'missing-evening-activity', `Event space and theater culture anchors must expose evening activity.`));
    }

    if (anchor.anchorKind === 'event-space' && anchor.eventCapacityPeople === 0) {
      issues.push(createCultureAnchorIssue(anchor, 'missing-event-capacity', `Event space culture anchors must expose event capacity.`));
    }

    if (anchor.anchorKind === 'heritage-site' && !anchor.heritageProtected) {
      issues.push(createCultureAnchorIssue(anchor, 'missing-heritage-protection', `Heritage site culture anchors must expose heritage protection.`));
    }

    if (!binding || binding.objectKind !== 'culture-anchor') {
      issues.push(createCultureAnchorIssue(anchor, 'missing-render-binding', `Culture anchor ${anchor.id} must reference a culture-anchor render binding.`));
    }
  }

  if (cultureBaseAnchor && city.cultureAnchors.length === 0) {
    issues.push({
      id: 'missing-culture-anchors',
      severity: 'error',
      category: 'zoning',
      objectId: cultureBaseAnchor.id,
      ...createIssueFocus(cultureBaseAnchor.center, 'Generate culture anchors from the culture civic anchor and civic plaza zones.'),
      message: 'Culture civic anchors must expose museums, theaters, galleries, venues, heritage sites, event spaces, tourism hooks, and evening activity.'
    });
  }

  for (const anchorKind of CULTURE_ANCHOR_KINDS) {
    if (!anchorsByKind.has(anchorKind)) {
      issues.push({
        id: `missing-culture-anchor-${anchorKind}`,
        severity: 'error',
        category: 'zoning',
        objectId: cultureBaseAnchor?.id,
        ...createIssueFocus(cultureBaseAnchor?.center, `Create the ${anchorKind} culture anchor from the culture civic anchor.`),
        message: `Culture anchors must include ${anchorKind}.`
      });
    }
  }
}

function createCultureAnchorIssue(
  anchor: ValidationCultureAnchor,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `culture-anchor-${issueIdSuffix}-${toIssueIdToken(anchor.id)}`,
    severity: 'error',
    category: 'zoning',
    objectId: anchor.id,
    ...createIssueFocus(anchor.center, `Regenerate ${anchor.id} from the culture civic anchor and civic plaza zones.`),
    message
  };
}

function validateGovernmentAnchors(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const anchorsByKind = new Map<GovernmentAnchorKind, ValidationGovernmentAnchor[]>();
  const governmentBaseAnchor = city.civicAnchors.find((anchor) => anchor.serviceType === 'government');

  for (const anchor of city.governmentAnchors) {
    const civicAnchor = city.civicAnchors.find((candidate) => candidate.id === anchor.civicAnchorId);
    const building = city.buildings.find((candidate) => candidate.id === anchor.buildingId);
    const district = city.districts.find((candidate) => candidate.id === anchor.districtId);
    const binding = assetBindingsById.get(anchor.renderBindingId);

    if (GOVERNMENT_ANCHOR_KINDS.includes(anchor.anchorKind)) {
      anchorsByKind.set(anchor.anchorKind, [...(anchorsByKind.get(anchor.anchorKind) ?? []), anchor]);
    } else {
      issues.push(createGovernmentAnchorIssue(anchor, 'invalid-kind', `Government anchor ${anchor.id} must declare a supported government anchor kind.`));
    }

    if (!civicAnchor || civicAnchor.serviceType !== 'government' || anchor.parentId !== anchor.civicAnchorId) {
      issues.push(createGovernmentAnchorIssue(anchor, 'missing-civic-anchor', `Government anchor ${anchor.id} must be parented to a government civic anchor.`));
    }

    if (!building || (civicAnchor && building.id !== civicAnchor.buildingId)) {
      issues.push(createGovernmentAnchorIssue(anchor, 'building-mismatch', `Government anchor ${anchor.id} must reuse the government civic anchor building.`));
    }

    if (!district || (civicAnchor && district.id !== civicAnchor.districtId)) {
      issues.push(createGovernmentAnchorIssue(anchor, 'district-mismatch', `Government anchor ${anchor.id} must stay in the government civic anchor district.`));
    }

    if (anchor.plazaZoneIds.length === 0) {
      issues.push(createGovernmentAnchorIssue(anchor, 'missing-plaza-relationship', `Government anchor ${anchor.id} must link to civic plaza zones.`));
    }

    for (const plazaZoneId of anchor.plazaZoneIds) {
      const plazaZone = city.plazaZones.find((zone) => zone.id === plazaZoneId);

      if (!plazaZone || plazaZone.plazaId !== 'civic-plaza') {
        issues.push(createGovernmentAnchorIssue(anchor, `missing-plaza-zone-${toIssueIdToken(plazaZoneId)}`, `Government anchor ${anchor.id} references missing civic plaza zone ${plazaZoneId}.`));
      }
    }

    if (
      anchor.publicAdministrationRole.length === 0 ||
      anchor.serviceCounterCount < 0 ||
      anchor.dailyVisitors <= 0 ||
      anchor.staffCapacity <= 0 ||
      anchor.queueCapacityPeople < 0 ||
      anchor.ceremonialCapacityPeople < 0 ||
      anchor.scheduleProfileId.length === 0
    ) {
      issues.push(createGovernmentAnchorIssue(anchor, 'invalid-capacity', `Government anchor ${anchor.id} must expose positive public-administration demand and staffing metrics.`));
    }

    if (!anchor.publicAccess) {
      issues.push(createGovernmentAnchorIssue(anchor, 'missing-public-access', `Government anchor ${anchor.id} must expose public access.`));
    }

    if ((anchor.anchorKind === 'city-hall' || anchor.anchorKind === 'court') && !anchor.securityScreening) {
      issues.push(createGovernmentAnchorIssue(anchor, 'missing-security-screening', `City hall and court anchors must expose security screening.`));
    }

    if (anchor.anchorKind === 'service-counter' && anchor.serviceCounterCount === 0) {
      issues.push(createGovernmentAnchorIssue(anchor, 'missing-service-counters', `Service counter anchors must expose service counter capacity.`));
    }

    if (anchor.anchorKind === 'civic-plaza-interface' && anchor.ceremonialCapacityPeople === 0) {
      issues.push(createGovernmentAnchorIssue(anchor, 'missing-ceremonial-capacity', `Civic plaza interface anchors must expose ceremonial/event capacity.`));
    }

    if (!binding || binding.objectKind !== 'government-anchor') {
      issues.push(createGovernmentAnchorIssue(anchor, 'missing-render-binding', `Government anchor ${anchor.id} must reference a government-anchor render binding.`));
    }
  }

  if (governmentBaseAnchor && city.governmentAnchors.length === 0) {
    issues.push({
      id: 'missing-government-anchors',
      severity: 'error',
      category: 'zoning',
      objectId: governmentBaseAnchor.id,
      ...createIssueFocus(governmentBaseAnchor.center, 'Generate government anchors from the government civic anchor and civic plaza zones.'),
      message: 'Government civic anchors must expose city hall, administration, courts, service counters, and civic plaza relationships.'
    });
  }

  for (const anchorKind of GOVERNMENT_ANCHOR_KINDS) {
    if (!anchorsByKind.has(anchorKind)) {
      issues.push({
        id: `missing-government-anchor-${anchorKind}`,
        severity: 'error',
        category: 'zoning',
        objectId: governmentBaseAnchor?.id,
        ...createIssueFocus(governmentBaseAnchor?.center, `Create the ${anchorKind} government anchor from the government civic anchor.`),
        message: `Government anchors must include ${anchorKind}.`
      });
    }
  }
}

function createGovernmentAnchorIssue(
  anchor: ValidationGovernmentAnchor,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `government-anchor-${issueIdSuffix}-${toIssueIdToken(anchor.id)}`,
    severity: 'error',
    category: 'zoning',
    objectId: anchor.id,
    ...createIssueFocus(anchor.center, `Regenerate ${anchor.id} from the government civic anchor and civic plaza zones.`),
    message
  };
}

function validateEducationAnchors(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const anchorsByKind = new Map<EducationAnchorKind, ValidationEducationAnchor[]>();
  const educationBaseAnchor = city.civicAnchors.find((anchor) => anchor.serviceType === 'education');
  const roadsById = new Map(city.roads.map((road) => [road.id, road]));
  const districtsById = new Map(city.districts.map((district) => [district.id, district]));
  const navigationNodesById = new Map(city.navigationGraphNodes.map((node) => [node.id, node]));
  const navigationEdgesById = new Map(city.navigationGraphEdges.map((edge) => [edge.id, edge]));
  const curbZonesById = new Map(city.curbZones.map((zone) => [zone.id, zone]));
  const transitStopsById = new Map(city.transitStops.map((stop) => [stop.id, stop]));
  const bikeParkingById = new Map(city.bikeParking.map((parking) => [parking.id, parking]));
  const parkFeaturesById = new Map(city.parkFeatures.map((feature) => [feature.id, feature]));

  for (const anchor of city.educationAnchors) {
    const civicAnchor = city.civicAnchors.find((candidate) => candidate.id === anchor.civicAnchorId);
    const building = city.buildings.find((candidate) => candidate.id === anchor.buildingId);
    const parcel = city.parcels.find((candidate) => candidate.id === anchor.parcelId);
    const serviceArea = city.administrativeBoundaries.find((candidate) => candidate.id === anchor.serviceAreaBoundaryId);
    const binding = assetBindingsById.get(anchor.renderBindingId);

    if (EDUCATION_ANCHOR_KINDS.includes(anchor.anchorKind)) {
      anchorsByKind.set(anchor.anchorKind, [...(anchorsByKind.get(anchor.anchorKind) ?? []), anchor]);
    } else {
      issues.push(createEducationAnchorIssue(anchor, 'invalid-kind', `Education anchor ${anchor.id} must declare a supported education anchor kind.`));
    }

    if (!civicAnchor || civicAnchor.serviceType !== 'education' || anchor.parentId !== anchor.civicAnchorId) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-education-civic-anchor', `Education anchor ${anchor.id} must be parented to the education civic anchor.`));
    }

    if (!building || building.kind !== 'building' || building.parcelId !== anchor.parcelId) {
      issues.push(createEducationAnchorIssue(anchor, 'building-parcel-mismatch', `Education anchor ${anchor.id} must reference an existing building and its parcel.`));
    }

    if (!parcel || parcel.id !== anchor.parcelId) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-parcel', `Education anchor ${anchor.id} must reference an existing parcel.`));
    }

    if (!districtsById.has(anchor.districtId) || (civicAnchor && civicAnchor.districtId !== anchor.districtId)) {
      issues.push(createEducationAnchorIssue(anchor, 'district-mismatch', `Education anchor ${anchor.id} must stay in the education civic anchor district.`));
    }

    if (!roadsById.has(anchor.roadId)) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-road', `Education anchor ${anchor.id} must reference an existing drop-off/frontage road.`));
    }

    if (!serviceArea || serviceArea.boundaryKind !== 'service-area' || !serviceArea.serviceTypes.includes('public-works')) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-education-service-area', `Education anchor ${anchor.id} must reference an education service-area boundary.`));
    }

    if (
      anchor.capacity.studentCapacity <= 0 ||
      anchor.capacity.classroomCount < 0 ||
      anchor.capacity.librarySeats < 0 ||
      anchor.capacity.childcareSlots < 0 ||
      anchor.capacity.lectureHallSeats < 0 ||
      anchor.capacity.staffCapacity <= 0 ||
      anchor.access.dailyLearners <= 0 ||
      anchor.access.dropOffTrips < 0 ||
      anchor.scheduleProfileId.length === 0
    ) {
      issues.push(createEducationAnchorIssue(anchor, 'invalid-capacity', `Education anchor ${anchor.id} must expose positive learner, staffing, and schedule metrics.`));
    }

    if (
      anchor.coverage.radiusMeters <= 0 ||
      anchor.coverage.targetDistrictIds.length === 0 ||
      anchor.coverage.coveredNavigationNodeIds.length === 0 ||
      anchor.coverage.coveredNavigationEdgeIds.length === 0 ||
      anchor.coverage.educationAccessScore <= 0 ||
      anchor.coverage.estimatedDropOffWalkMeters <= 0
    ) {
      issues.push(createEducationAnchorIssue(anchor, 'invalid-education-coverage', `Education anchor ${anchor.id} must expose coverage, access score, and drop-off walk metrics.`));
    }

    for (const districtId of anchor.coverage.targetDistrictIds) {
      if (!districtsById.has(districtId)) {
        issues.push(createEducationAnchorIssue(anchor, `missing-target-district-${toIssueIdToken(districtId)}`, `Education anchor ${anchor.id} references missing target district ${districtId}.`));
      }
    }

    for (const nodeId of anchor.coverage.coveredNavigationNodeIds) {
      if (!navigationNodesById.has(nodeId)) {
        issues.push(createEducationAnchorIssue(anchor, `missing-navigation-node-${toIssueIdToken(nodeId)}`, `Education anchor ${anchor.id} references missing navigation node ${nodeId}.`));
      }
    }

    for (const edgeId of anchor.coverage.coveredNavigationEdgeIds) {
      if (!navigationEdgesById.has(edgeId)) {
        issues.push(createEducationAnchorIssue(anchor, `missing-navigation-edge-${toIssueIdToken(edgeId)}`, `Education anchor ${anchor.id} references missing navigation edge ${edgeId}.`));
      }
    }

    for (const entranceId of anchor.access.publicEntranceIds) {
      if (!building?.publicEntranceIds.includes(entranceId)) {
        issues.push(createEducationAnchorIssue(anchor, `missing-public-entrance-${toIssueIdToken(entranceId)}`, `Education anchor ${anchor.id} references missing public entrance ${entranceId}.`));
      }
    }

    for (const entranceId of anchor.access.serviceEntranceIds) {
      if (!(building?.serviceEntranceIds ?? []).includes(entranceId)) {
        issues.push(createEducationAnchorIssue(anchor, `missing-service-entrance-${toIssueIdToken(entranceId)}`, `Education anchor ${anchor.id} references missing service entrance ${entranceId}.`));
      }
    }

    for (const curbZoneId of anchor.access.dropOffCurbZoneIds) {
      const curbZone = curbZonesById.get(curbZoneId);
      if (!curbZone || (curbZone.curbUse !== 'ride-hail' && curbZone.curbUse !== 'loading' && curbZone.curbUse !== 'parking')) {
        issues.push(createEducationAnchorIssue(anchor, `missing-drop-off-zone-${toIssueIdToken(curbZoneId)}`, `Education anchor ${anchor.id} references missing or unsuitable drop-off curb zone ${curbZoneId}.`));
      }
    }

    for (const transitStopId of anchor.access.transitStopIds) {
      if (!transitStopsById.has(transitStopId)) {
        issues.push(createEducationAnchorIssue(anchor, `missing-transit-stop-${toIssueIdToken(transitStopId)}`, `Education anchor ${anchor.id} references missing transit stop ${transitStopId}.`));
      }
    }

    for (const bikeParkingId of anchor.access.bikeParkingIds) {
      if (!bikeParkingById.has(bikeParkingId)) {
        issues.push(createEducationAnchorIssue(anchor, `missing-bike-parking-${toIssueIdToken(bikeParkingId)}`, `Education anchor ${anchor.id} references missing bike parking ${bikeParkingId}.`));
      }
    }

    for (const playgroundFeatureId of anchor.access.playgroundFeatureIds) {
      const parkFeature = parkFeaturesById.get(playgroundFeatureId);
      if (!parkFeature || (parkFeature.programKind !== 'active-recreation' && parkFeature.surface !== 'play-surface')) {
        issues.push(createEducationAnchorIssue(anchor, `missing-playground-feature-${toIssueIdToken(playgroundFeatureId)}`, `Education anchor ${anchor.id} references missing playground or active recreation feature ${playgroundFeatureId}.`));
      }
    }

    for (const nodeId of anchor.access.accessibleNavigationNodeIds) {
      const node = navigationNodesById.get(nodeId);
      if (!node || node.mode !== 'pedestrian') {
        issues.push(createEducationAnchorIssue(anchor, `missing-accessible-navigation-node-${toIssueIdToken(nodeId)}`, `Education anchor ${anchor.id} must link to pedestrian navigation nodes.`));
      }
    }

    for (const edgeId of anchor.access.accessibleNavigationEdgeIds) {
      const edge = navigationEdgesById.get(edgeId);
      if (!edge || edge.mode !== 'pedestrian') {
        issues.push(createEducationAnchorIssue(anchor, `missing-accessible-navigation-edge-${toIssueIdToken(edgeId)}`, `Education anchor ${anchor.id} must link to pedestrian navigation edges.`));
      }
    }

    if (anchor.acceptsDropOff && (anchor.access.dropOffTrips <= 0 || anchor.access.dropOffCurbZoneIds.length === 0)) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-drop-off-access', `Drop-off accepting education anchor ${anchor.id} must expose curb zones and drop-off demand.`));
    }

    if (anchor.anchorKind === 'school' && (anchor.capacity.classroomCount <= 0 || anchor.access.playgroundFeatureIds.length === 0)) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-school-learning-access', `School anchor ${anchor.id} must expose classroom and playground access.`));
    }

    if (anchor.anchorKind === 'library' && (anchor.capacity.librarySeats <= 0 || !anchor.publicLearningAccess)) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-library-public-access', `Library anchor ${anchor.id} must expose public learning seats.`));
    }

    if (anchor.anchorKind === 'university' && anchor.capacity.lectureHallSeats <= 0) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-university-lecture-capacity', `University anchor ${anchor.id} must expose lecture hall capacity.`));
    }

    if (anchor.anchorKind === 'childcare' && anchor.capacity.childcareSlots <= 0) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-childcare-slots', `Childcare anchor ${anchor.id} must expose childcare slots.`));
    }

    if (anchor.anchorKind === 'learning-campus' && (anchor.capacity.classroomCount <= 0 || anchor.capacity.lectureHallSeats <= 0)) {
      issues.push(createEducationAnchorIssue(anchor, 'missing-learning-campus-capacity', `Learning campus anchor ${anchor.id} must expose classroom and lecture capacity.`));
    }

    if (!binding || binding.objectKind !== 'education-anchor') {
      issues.push(createEducationAnchorIssue(anchor, 'missing-render-binding', `Education anchor ${anchor.id} must reference an education-anchor render binding.`));
    }
  }

  if (educationBaseAnchor && city.educationAnchors.length === 0) {
    issues.push({
      id: 'missing-education-anchors',
      severity: 'error',
      category: 'zoning',
      objectId: educationBaseAnchor.id,
      ...createIssueFocus(educationBaseAnchor.center, 'Generate education anchors from the education civic anchor, curbs, parks, and navigation graph.'),
      message: 'Education civic anchors must expose school, library, university, childcare, and learning campus access hooks.'
    });
  }

  for (const anchorKind of EDUCATION_ANCHOR_KINDS) {
    if (!anchorsByKind.has(anchorKind)) {
      issues.push({
        id: `missing-education-anchor-${anchorKind}`,
        severity: 'error',
        category: 'zoning',
        objectId: educationBaseAnchor?.id,
        ...createIssueFocus(educationBaseAnchor?.center, `Create the ${anchorKind} education anchor from the education civic anchor.`),
        message: `Education anchors must include ${anchorKind}.`
      });
    }
  }
}

function createEducationAnchorIssue(
  anchor: ValidationEducationAnchor,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `education-anchor-${issueIdSuffix}-${toIssueIdToken(anchor.id)}`,
    severity: 'error',
    category: 'zoning',
    objectId: anchor.id,
    ...createIssueFocus(anchor.center, `Regenerate ${anchor.id} from education civic, curb, park, and navigation data.`),
    message
  };
}

function validateHealthcareAnchors(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const anchorsByKind = new Map<HealthcareAnchorKind, ValidationHealthcareAnchor[]>();
  const healthcareBaseAnchor = city.civicAnchors.find((anchor) => anchor.serviceType === 'healthcare');
  const roadsById = new Map(city.roads.map((road) => [road.id, road]));
  const districtsById = new Map(city.districts.map((district) => [district.id, district]));
  const navigationNodesById = new Map(city.navigationGraphNodes.map((node) => [node.id, node]));
  const navigationEdgesById = new Map(city.navigationGraphEdges.map((edge) => [edge.id, edge]));
  const transitStopsById = new Map(city.transitStops.map((stop) => [stop.id, stop]));

  for (const anchor of city.healthcareAnchors) {
    const civicAnchor = city.civicAnchors.find((candidate) => candidate.id === anchor.civicAnchorId);
    const building = city.buildings.find((candidate) => candidate.id === anchor.buildingId);
    const parcel = city.parcels.find((candidate) => candidate.id === anchor.parcelId);
    const serviceArea = city.administrativeBoundaries.find((candidate) => candidate.id === anchor.serviceAreaBoundaryId);
    const binding = assetBindingsById.get(anchor.renderBindingId);

    if (HEALTHCARE_ANCHOR_KINDS.includes(anchor.anchorKind)) {
      anchorsByKind.set(anchor.anchorKind, [...(anchorsByKind.get(anchor.anchorKind) ?? []), anchor]);
    } else {
      issues.push(createHealthcareAnchorIssue(anchor, 'invalid-kind', `Healthcare anchor ${anchor.id} must declare a supported healthcare anchor kind.`));
    }

    if (!civicAnchor || civicAnchor.serviceType !== 'healthcare' || anchor.parentId !== anchor.civicAnchorId) {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-healthcare-civic-anchor', `Healthcare anchor ${anchor.id} must be parented to the healthcare civic anchor.`));
    }

    if (!building || building.kind !== 'building' || building.parcelId !== anchor.parcelId) {
      issues.push(createHealthcareAnchorIssue(anchor, 'building-parcel-mismatch', `Healthcare anchor ${anchor.id} must reference an existing building and its parcel.`));
    }

    if (!parcel || parcel.id !== anchor.parcelId) {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-parcel', `Healthcare anchor ${anchor.id} must reference an existing parcel.`));
    }

    if (!districtsById.has(anchor.districtId) || (civicAnchor && civicAnchor.districtId !== anchor.districtId)) {
      issues.push(createHealthcareAnchorIssue(anchor, 'district-mismatch', `Healthcare anchor ${anchor.id} must stay in the healthcare civic anchor district.`));
    }

    if (!roadsById.has(anchor.roadId)) {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-road', `Healthcare anchor ${anchor.id} must reference an existing patient arrival road.`));
    }

    if (!serviceArea || serviceArea.boundaryKind !== 'service-area' || !serviceArea.serviceTypes.includes('emergency')) {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-healthcare-service-area', `Healthcare anchor ${anchor.id} must reference an emergency-capable service-area boundary.`));
    }

    if (
      anchor.capacity.bedCapacity < 0 ||
      anchor.capacity.examRooms < 0 ||
      anchor.capacity.pharmacyCounters < 0 ||
      anchor.capacity.urgentCareBays < 0 ||
      anchor.capacity.ambulanceBays < 0 ||
      anchor.capacity.staffCapacity <= 0 ||
      anchor.arrivals.dailyPatients <= 0 ||
      anchor.arrivals.appointmentShare < 0 ||
      anchor.arrivals.appointmentShare > 1 ||
      anchor.arrivals.emergencyArrivalShare < 0 ||
      anchor.arrivals.emergencyArrivalShare > 1 ||
      anchor.scheduleProfileId.length === 0
    ) {
      issues.push(createHealthcareAnchorIssue(anchor, 'invalid-capacity', `Healthcare anchor ${anchor.id} must expose non-negative care capacity plus positive patient, staffing, and schedule metrics.`));
    }

    if (
      anchor.coverage.radiusMeters <= 0 ||
      anchor.coverage.targetDistrictIds.length === 0 ||
      anchor.coverage.coveredNavigationNodeIds.length === 0 ||
      anchor.coverage.coveredNavigationEdgeIds.length === 0 ||
      anchor.coverage.estimatedAmbulanceResponseSeconds <= 0 ||
      anchor.coverage.coverageScore <= 0
    ) {
      issues.push(createHealthcareAnchorIssue(anchor, 'invalid-healthcare-coverage', `Healthcare anchor ${anchor.id} must expose coverage, route hooks, response time, and coverage score.`));
    }

    for (const districtId of anchor.coverage.targetDistrictIds) {
      if (!districtsById.has(districtId)) {
        issues.push(createHealthcareAnchorIssue(anchor, `missing-target-district-${toIssueIdToken(districtId)}`, `Healthcare anchor ${anchor.id} references missing target district ${districtId}.`));
      }
    }

    for (const nodeId of anchor.coverage.coveredNavigationNodeIds) {
      if (!navigationNodesById.has(nodeId)) {
        issues.push(createHealthcareAnchorIssue(anchor, `missing-navigation-node-${toIssueIdToken(nodeId)}`, `Healthcare anchor ${anchor.id} references missing navigation node ${nodeId}.`));
      }
    }

    for (const edgeId of anchor.coverage.coveredNavigationEdgeIds) {
      if (!navigationEdgesById.has(edgeId)) {
        issues.push(createHealthcareAnchorIssue(anchor, `missing-navigation-edge-${toIssueIdToken(edgeId)}`, `Healthcare anchor ${anchor.id} references missing navigation edge ${edgeId}.`));
      }
    }

    for (const entranceId of anchor.arrivals.publicEntranceIds) {
      if (!building?.publicEntranceIds.includes(entranceId)) {
        issues.push(createHealthcareAnchorIssue(anchor, `missing-public-entrance-${toIssueIdToken(entranceId)}`, `Healthcare anchor ${anchor.id} references missing public entrance ${entranceId}.`));
      }
    }

    for (const entranceId of anchor.arrivals.serviceEntranceIds) {
      if (!(building?.serviceEntranceIds ?? []).includes(entranceId)) {
        issues.push(createHealthcareAnchorIssue(anchor, `missing-service-entrance-${toIssueIdToken(entranceId)}`, `Healthcare anchor ${anchor.id} references missing service entrance ${entranceId}.`));
      }
    }

    for (const transitStopId of anchor.arrivals.transitStopIds) {
      if (!transitStopsById.has(transitStopId)) {
        issues.push(createHealthcareAnchorIssue(anchor, `missing-transit-stop-${toIssueIdToken(transitStopId)}`, `Healthcare anchor ${anchor.id} references missing transit stop ${transitStopId}.`));
      }
    }

    for (const roadId of anchor.arrivals.ambulanceAccessRoadIds) {
      if (!roadsById.has(roadId)) {
        issues.push(createHealthcareAnchorIssue(anchor, `missing-ambulance-road-${toIssueIdToken(roadId)}`, `Healthcare anchor ${anchor.id} references missing ambulance access road ${roadId}.`));
      }
    }

    if (anchor.acceptsAmbulance) {
      if (anchor.capacity.ambulanceBays <= 0 || anchor.arrivals.ambulanceNavigationNodeIds.length === 0 || anchor.arrivals.ambulanceNavigationEdgeIds.length === 0) {
        issues.push(createHealthcareAnchorIssue(anchor, 'missing-ambulance-access', `Ambulance-accepting healthcare anchor ${anchor.id} must expose ambulance bays and emergency route hooks.`));
      }

      for (const nodeId of anchor.arrivals.ambulanceNavigationNodeIds) {
        const node = navigationNodesById.get(nodeId);
        if (!node || node.mode !== 'emergency') {
          issues.push(createHealthcareAnchorIssue(anchor, `missing-ambulance-navigation-node-${toIssueIdToken(nodeId)}`, `Healthcare anchor ${anchor.id} must route ambulances through emergency navigation nodes.`));
        }
      }

      for (const edgeId of anchor.arrivals.ambulanceNavigationEdgeIds) {
        const edge = navigationEdgesById.get(edgeId);
        if (!edge || edge.mode !== 'emergency') {
          issues.push(createHealthcareAnchorIssue(anchor, `missing-ambulance-navigation-edge-${toIssueIdToken(edgeId)}`, `Healthcare anchor ${anchor.id} must route ambulances through emergency navigation edges.`));
        }
      }
    }

    if (anchor.anchorKind === 'hospital' && (!anchor.emergencyDepartment || anchor.capacity.bedCapacity <= 0)) {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-hospital-care-capacity', `Hospital anchor ${anchor.id} must expose inpatient beds and an emergency department.`));
    }

    if (anchor.anchorKind === 'urgent-care' && anchor.capacity.urgentCareBays <= 0) {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-urgent-care-bays', `Urgent care anchor ${anchor.id} must expose urgent care bay capacity.`));
    }

    if (anchor.anchorKind === 'pharmacy' && anchor.capacity.pharmacyCounters <= 0) {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-pharmacy-counters', `Pharmacy anchor ${anchor.id} must expose pharmacy counter capacity.`));
    }

    if (anchor.anchorKind === 'clinic' && anchor.capacity.examRooms <= 0) {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-clinic-exam-rooms', `Clinic anchor ${anchor.id} must expose exam room capacity.`));
    }

    if (anchor.anchorKind === 'ambulance-bay' && anchor.capacity.ambulanceBays <= 0) {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-ambulance-bays', `Ambulance bay anchor ${anchor.id} must expose ambulance bay capacity.`));
    }

    if (!binding || binding.objectKind !== 'healthcare-anchor') {
      issues.push(createHealthcareAnchorIssue(anchor, 'missing-render-binding', `Healthcare anchor ${anchor.id} must reference a healthcare-anchor render binding.`));
    }
  }

  if (healthcareBaseAnchor && city.healthcareAnchors.length === 0) {
    issues.push({
      id: 'missing-healthcare-anchors',
      severity: 'error',
      category: 'zoning',
      objectId: healthcareBaseAnchor.id,
      ...createIssueFocus(healthcareBaseAnchor.center, 'Generate healthcare anchors from the healthcare civic anchor and navigation graph.'),
      message: 'Healthcare civic anchors must expose hospital, clinic, pharmacy, urgent care, and ambulance access hooks.'
    });
  }

  for (const anchorKind of HEALTHCARE_ANCHOR_KINDS) {
    if (!anchorsByKind.has(anchorKind)) {
      issues.push({
        id: `missing-healthcare-anchor-${anchorKind}`,
        severity: 'error',
        category: 'zoning',
        objectId: healthcareBaseAnchor?.id,
        ...createIssueFocus(healthcareBaseAnchor?.center, `Create the ${anchorKind} healthcare anchor from the healthcare civic anchor.`),
        message: `Healthcare anchors must include ${anchorKind}.`
      });
    }
  }
}

function createHealthcareAnchorIssue(
  anchor: ValidationHealthcareAnchor,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `healthcare-anchor-${issueIdSuffix}-${toIssueIdToken(anchor.id)}`,
    severity: 'error',
    category: 'zoning',
    objectId: anchor.id,
    ...createIssueFocus(anchor.center, `Regenerate ${anchor.id} from healthcare civic and navigation graph data.`),
    message
  };
}

function validateEmergencyServiceAnchors(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const anchorsByKind = new Map<EmergencyServiceAnchorKind, ValidationEmergencyServiceAnchor[]>();
  const emergencyBaseAnchor = city.civicAnchors.find((anchor) => anchor.serviceType === 'emergency');
  const districtsById = new Set(city.districts.map((district) => district.id));
  const roadsById = new Set(city.roads.map((road) => road.id));
  const fireSafetyProfilesById = new Map(city.buildingFireSafetyProfiles.map((profile) => [profile.id, profile]));
  const navigationNodesById = new Map(city.navigationGraphNodes.map((node) => [node.id, node]));
  const navigationEdgesById = new Map(city.navigationGraphEdges.map((edge) => [edge.id, edge]));
  const curbZonesById = new Map(city.curbZones.map((curbZone) => [curbZone.id, curbZone]));
  const serviceAccessCorridorsById = new Set(city.serviceAccessCorridors.map((corridor) => corridor.id));
  const hydrantsById = new Set(
    city.utilityNodes.filter((node) => node.waterSupply?.equipmentKind === 'hydrant').map((node) => node.id)
  );

  for (const anchor of city.emergencyServiceAnchors) {
    const civicAnchor = city.civicAnchors.find((candidate) => candidate.id === anchor.civicAnchorId);
    const building = city.buildings.find((candidate) => candidate.id === anchor.buildingId);
    const parcel = city.parcels.find((candidate) => candidate.id === anchor.parcelId);
    const serviceArea = city.administrativeBoundaries.find((candidate) => candidate.id === anchor.serviceAreaBoundaryId);
    const binding = assetBindingsById.get(anchor.renderBindingId);

    if (EMERGENCY_SERVICE_ANCHOR_KINDS.includes(anchor.anchorKind)) {
      anchorsByKind.set(anchor.anchorKind, [...(anchorsByKind.get(anchor.anchorKind) ?? []), anchor]);
    } else {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'invalid-kind', `Emergency service anchor ${anchor.id} must declare a supported emergency service kind.`));
    }

    if (!EMERGENCY_RESPONSE_MODES.includes(anchor.responseMode)) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'invalid-response-mode', `Emergency service anchor ${anchor.id} must declare a supported response mode.`));
    }

    if (!civicAnchor || civicAnchor.serviceType !== 'emergency' || anchor.parentId !== anchor.civicAnchorId) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'missing-emergency-civic-anchor', `Emergency service anchor ${anchor.id} must be parented to the emergency civic anchor.`));
    }

    if (!building || building.kind !== 'building' || building.parcelId !== anchor.parcelId) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'building-parcel-mismatch', `Emergency service anchor ${anchor.id} must reference an existing building and its parcel.`));
    }

    if (!parcel || parcel.id !== anchor.parcelId) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'missing-parcel', `Emergency service anchor ${anchor.id} must reference an existing parcel.`));
    }

    if (!districtsById.has(anchor.districtId)) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'missing-district', `Emergency service anchor ${anchor.id} must reference an existing district.`));
    }

    if (!roadsById.has(anchor.roadId)) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'missing-road', `Emergency service anchor ${anchor.id} must reference an existing dispatch road.`));
    }

    if (!serviceArea || serviceArea.boundaryKind !== 'service-area' || !serviceArea.serviceTypes.includes('emergency')) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'missing-emergency-service-area', `Emergency service anchor ${anchor.id} must reference an emergency service-area boundary.`));
    }

    if (
      anchor.dispatch.unitCapacity <= 0 ||
      anchor.dispatch.responderCapacity <= 0 ||
      anchor.dispatch.vehiclesAvailable <= 0 ||
      anchor.dispatch.stagingBays <= 0 ||
      anchor.dispatch.dispatchPriority <= 0 ||
      !anchor.dispatch.operates24h
    ) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'invalid-dispatch-capacity', `Emergency service anchor ${anchor.id} must expose 24h dispatch units, responders, vehicles, staging bays, and priority.`));
    }

    if (
      anchor.coverage.radiusMeters <= 0 ||
      anchor.coverage.targetDistrictIds.length === 0 ||
      anchor.coverage.coveredRoadIds.length === 0 ||
      anchor.coverage.coveredBuildingFireSafetyProfileIds.length === 0 ||
      anchor.coverage.estimatedResponseSeconds <= 0 ||
      anchor.coverage.coverageScore <= 0
    ) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'invalid-response-coverage', `Emergency service anchor ${anchor.id} must expose dispatch coverage, target districts, roads, fire-safety profiles, response time, and score.`));
    }

    for (const districtId of anchor.coverage.targetDistrictIds) {
      if (!districtsById.has(districtId)) {
        issues.push(createEmergencyServiceAnchorIssue(anchor, `missing-target-district-${toIssueIdToken(districtId)}`, `Emergency service anchor ${anchor.id} references missing target district ${districtId}.`));
      }
    }

    for (const roadId of anchor.coverage.coveredRoadIds) {
      if (!roadsById.has(roadId)) {
        issues.push(createEmergencyServiceAnchorIssue(anchor, `missing-covered-road-${toIssueIdToken(roadId)}`, `Emergency service anchor ${anchor.id} references missing covered road ${roadId}.`));
      }
    }

    for (const profileId of anchor.coverage.coveredBuildingFireSafetyProfileIds) {
      const profile = fireSafetyProfilesById.get(profileId);
      if (!profile) {
        issues.push(createEmergencyServiceAnchorIssue(anchor, `missing-fire-safety-profile-${toIssueIdToken(profileId)}`, `Emergency service anchor ${anchor.id} references missing fire-safety profile ${profileId}.`));
      } else if (!profile.hydrantWithinReach || !profile.fireLaneClearance || !profile.emergencyAccess.serviceAccessProvided) {
        issues.push(createEmergencyServiceAnchorIssue(anchor, `unserviceable-fire-safety-profile-${toIssueIdToken(profileId)}`, `Emergency service anchor ${anchor.id} may only cover profiles with hydrant, fire-lane, and service access.`));
      }
    }

    for (const nodeId of anchor.access.navigationNodeIds) {
      const node = navigationNodesById.get(nodeId);
      if (!node || node.mode !== 'emergency') {
        issues.push(createEmergencyServiceAnchorIssue(anchor, `missing-emergency-navigation-node-${toIssueIdToken(nodeId)}`, `Emergency service anchor ${anchor.id} references missing emergency navigation node ${nodeId}.`));
      }
    }

    for (const edgeId of anchor.access.navigationEdgeIds) {
      const edge = navigationEdgesById.get(edgeId);
      if (!edge || edge.mode !== 'emergency') {
        issues.push(createEmergencyServiceAnchorIssue(anchor, `missing-emergency-navigation-edge-${toIssueIdToken(edgeId)}`, `Emergency service anchor ${anchor.id} references missing emergency navigation edge ${edgeId}.`));
      }
    }

    for (const curbZoneId of anchor.access.fireLaneCurbZoneIds) {
      const curbZone = curbZonesById.get(curbZoneId);
      if (!curbZone || !curbZone.management.fireLaneClearance) {
        issues.push(createEmergencyServiceAnchorIssue(anchor, `missing-fire-lane-${toIssueIdToken(curbZoneId)}`, `Emergency service anchor ${anchor.id} references missing fire-lane curb zone ${curbZoneId}.`));
      }
    }

    for (const corridorId of anchor.access.serviceAccessCorridorIds) {
      if (!serviceAccessCorridorsById.has(corridorId)) {
        issues.push(createEmergencyServiceAnchorIssue(anchor, `missing-service-access-${toIssueIdToken(corridorId)}`, `Emergency service anchor ${anchor.id} references missing service access corridor ${corridorId}.`));
      }
    }

    for (const hydrantId of anchor.access.hydrantNodeIds) {
      if (!hydrantsById.has(hydrantId)) {
        issues.push(createEmergencyServiceAnchorIssue(anchor, `missing-hydrant-${toIssueIdToken(hydrantId)}`, `Emergency service anchor ${anchor.id} references missing hydrant ${hydrantId}.`));
      }
    }

    if (anchor.anchorKind === 'public-shelter' && anchor.staging.shelterCapacityPeople <= 0) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'missing-shelter-capacity', `Public shelter anchor ${anchor.id} must expose shelter capacity.`));
    }

    if (anchor.anchorKind === 'ambulance-post' && anchor.staging.ambulanceBays <= 0) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'missing-ambulance-bays', `Ambulance post ${anchor.id} must expose ambulance bay capacity.`));
    }

    if ((anchor.anchorKind === 'command-post' || anchor.anchorKind === 'staging-area') && !anchor.staging.commandPostReady) {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'missing-command-readiness', `Command and staging anchors must be command-post ready.`));
    }

    if (!binding || binding.objectKind !== 'emergency-service-anchor') {
      issues.push(createEmergencyServiceAnchorIssue(anchor, 'missing-render-binding', `Emergency service anchor ${anchor.id} must reference an emergency-service-anchor render binding.`));
    }
  }

  if (emergencyBaseAnchor && city.emergencyServiceAnchors.length === 0) {
    issues.push({
      id: 'missing-emergency-service-anchors',
      severity: 'error',
      category: 'zoning',
      objectId: emergencyBaseAnchor.id,
      ...createIssueFocus(emergencyBaseAnchor.center, 'Generate emergency service anchors from the emergency civic anchor and emergency navigation graph.'),
      message: 'Emergency civic anchors must expose fire, police, ambulance, shelter, command, and staging anchors.'
    });
  }

  for (const anchorKind of EMERGENCY_SERVICE_ANCHOR_KINDS) {
    if (!anchorsByKind.has(anchorKind)) {
      issues.push({
        id: `missing-emergency-service-anchor-${anchorKind}`,
        severity: 'error',
        category: 'zoning',
        objectId: emergencyBaseAnchor?.id,
        ...createIssueFocus(emergencyBaseAnchor?.center, `Create the ${anchorKind} emergency service anchor from the emergency civic anchor.`),
        message: `Emergency service anchors must include ${anchorKind}.`
      });
    }
  }
}

function createEmergencyServiceAnchorIssue(
  anchor: ValidationEmergencyServiceAnchor,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `emergency-service-anchor-${issueIdSuffix}-${toIssueIdToken(anchor.id)}`,
    severity: 'error',
    category: 'zoning',
    objectId: anchor.id,
    ...createIssueFocus(anchor.center, `Regenerate ${anchor.id} from emergency civic, fire-safety, and navigation graph data.`),
    message
  };
}

function validateWaterTransportAccess(
  city: GeneratedCityForValidation,
  issues: ValidationIssue[],
  assetBindingsById: ReadonlyMap<string, RenderBinding>
): void {
  const accessByKind = new Map<WaterTransportAccessKind, ValidationWaterTransportAccess[]>();
  const waterwaysById = new Map(city.waterways.map((waterway) => [waterway.id, waterway]));
  const waterfrontEdgesById = new Map(city.waterfrontEdges.map((edge) => [edge.id, edge]));
  const waterfrontOpenSpacesById = new Map(city.waterfrontOpenSpaces.map((openSpace) => [openSpace.id, openSpace]));
  const emergencyAnchorsById = new Map(city.emergencyServiceAnchors.map((anchor) => [anchor.id, anchor]));
  const freightRoutesById = new Map(city.freightRoutes.map((route) => [route.id, route]));
  const navigationNodesById = new Map(city.navigationGraphNodes.map((node) => [node.id, node]));
  const navigationEdgesById = new Map(city.navigationGraphEdges.map((edge) => [edge.id, edge]));
  const roadIds = new Set(city.roads.map((road) => road.id));

  for (const access of city.waterTransportAccess) {
    const binding = assetBindingsById.get(access.renderBindingId);
    const waterway = access.waterwayId ? waterwaysById.get(access.waterwayId) : undefined;
    const waterfrontEdge = access.waterfrontEdgeId ? waterfrontEdgesById.get(access.waterfrontEdgeId) : undefined;
    const waterfrontOpenSpace = access.waterfrontOpenSpaceId
      ? waterfrontOpenSpacesById.get(access.waterfrontOpenSpaceId)
      : undefined;
    const emergencyAnchor = access.emergencyServiceAnchorId
      ? emergencyAnchorsById.get(access.emergencyServiceAnchorId)
      : undefined;
    const freightRoute = access.freightRouteId ? freightRoutesById.get(access.freightRouteId) : undefined;

    if (WATER_TRANSPORT_ACCESS_KINDS.includes(access.accessKind)) {
      accessByKind.set(access.accessKind, [...(accessByKind.get(access.accessKind) ?? []), access]);
    } else {
      issues.push(createWaterTransportAccessIssue(access, 'invalid-kind', `Water transport access ${access.id} must declare a supported access kind.`));
    }

    if (!WATER_TRANSPORT_ARRIVAL_MODES.includes(access.arrivalMode)) {
      issues.push(createWaterTransportAccessIssue(access, 'invalid-arrival-mode', `Water transport access ${access.id} must declare a supported arrival mode.`));
    }

    if (access.boundary.length < 4 || !isFiniteNumber(access.center.x) || !isFiniteNumber(access.center.z)) {
      issues.push(createWaterTransportAccessIssue(access, 'invalid-geometry', `Water transport access ${access.id} must expose finite center and boundary geometry.`));
    }

    if (
      access.capacity.berths <= 0 ||
      access.capacity.passengersPerHour < 0 ||
      access.capacity.cargoTonnesPerDay < 0 ||
      access.capacity.emergencySlotsPerHour < 0
    ) {
      issues.push(createWaterTransportAccessIssue(access, 'invalid-capacity', `Water transport access ${access.id} must expose non-negative passenger, cargo, and emergency capacity plus positive berths.`));
    }

    if (access.constraints.maxApproachGradePercent <= 0 || access.constraints.requiredClearanceMeters === undefined || access.constraints.requiredClearanceMeters <= 0) {
      issues.push(createWaterTransportAccessIssue(access, 'invalid-arrival-constraints', `Water transport access ${access.id} must expose positive approach grade and clearance constraints.`));
    }

    if (access.accessKind === 'emergency-helipad') {
      if (!emergencyAnchor || access.parentId !== emergencyAnchor.id || access.arrivalMode !== 'helicopter') {
        issues.push(createWaterTransportAccessIssue(access, 'invalid-helipad-anchor', `Emergency helipad ${access.id} must be parented to an emergency service anchor and use helicopter arrival.`));
      }
      if (!access.constraints.emergencyPriority || (access.constraints.requiredClearanceMeters ?? 0) < 18) {
        issues.push(createWaterTransportAccessIssue(access, 'invalid-helipad-constraints', `Emergency helipad ${access.id} must expose emergency priority and at least 18m clearance.`));
      }
    } else {
      if (!waterway || !access.waterwayId) {
        issues.push(createWaterTransportAccessIssue(access, 'missing-waterway', `Water transport access ${access.id} must reference a generated waterway.`));
      }
      if ((access.constraints.maxVesselLengthMeters ?? 0) <= 0 || (access.constraints.minChannelWidthMeters ?? 0) <= 0) {
        issues.push(createWaterTransportAccessIssue(access, 'invalid-vessel-constraints', `Water transport access ${access.id} must expose max vessel length and minimum channel width.`));
      }
      if (!access.dockId || !waterway?.docks.some((dock) => dock.id === access.dockId)) {
        issues.push(createWaterTransportAccessIssue(access, 'missing-dock', `Water transport access ${access.id} must reference an existing waterway dock.`));
      }
    }

    if (access.waterfrontEdgeId && !waterfrontEdge) {
      issues.push(createWaterTransportAccessIssue(access, 'missing-waterfront-edge', `Water transport access ${access.id} references missing waterfront edge ${access.waterfrontEdgeId}.`));
    }

    if (access.waterfrontOpenSpaceId && !waterfrontOpenSpace) {
      issues.push(createWaterTransportAccessIssue(access, 'missing-waterfront-open-space', `Water transport access ${access.id} references missing waterfront open space ${access.waterfrontOpenSpaceId}.`));
    }

    if ((access.accessKind === 'small-port' || access.accessKind === 'port-logistics-edge') && !freightRoute) {
      issues.push(createWaterTransportAccessIssue(access, 'missing-freight-route', `Port access ${access.id} must reference a freight route.`));
    }

    if (access.roadId && !roadIds.has(access.roadId)) {
      issues.push(createWaterTransportAccessIssue(access, 'missing-road', `Water transport access ${access.id} references missing road ${access.roadId}.`));
    }

    if (access.routing.navigationNodeIds.length === 0 || access.routing.navigationEdgeIds.length === 0) {
      issues.push(createWaterTransportAccessIssue(access, 'missing-navigation-routing', `Water transport access ${access.id} must expose navigation nodes and edges for routing.`));
    }

    for (const nodeId of access.routing.navigationNodeIds) {
      const node = navigationNodesById.get(nodeId);
      if (!node) {
        issues.push(createWaterTransportAccessIssue(access, `missing-navigation-node-${toIssueIdToken(nodeId)}`, `Water transport access ${access.id} references missing navigation node ${nodeId}.`));
      } else if (access.accessKind === 'emergency-helipad' && node.mode !== 'emergency') {
        issues.push(createWaterTransportAccessIssue(access, `non-emergency-helipad-node-${toIssueIdToken(nodeId)}`, `Emergency helipad ${access.id} may only route through emergency navigation nodes.`));
      }
    }

    for (const edgeId of access.routing.navigationEdgeIds) {
      const edge = navigationEdgesById.get(edgeId);
      if (!edge) {
        issues.push(createWaterTransportAccessIssue(access, `missing-navigation-edge-${toIssueIdToken(edgeId)}`, `Water transport access ${access.id} references missing navigation edge ${edgeId}.`));
      } else if (access.accessKind === 'emergency-helipad' && edge.mode !== 'emergency') {
        issues.push(createWaterTransportAccessIssue(access, `non-emergency-helipad-edge-${toIssueIdToken(edgeId)}`, `Emergency helipad ${access.id} may only route through emergency navigation edges.`));
      }
    }

    for (const roadId of access.routing.connectedRoadIds) {
      if (!roadIds.has(roadId)) {
        issues.push(createWaterTransportAccessIssue(access, `missing-connected-road-${toIssueIdToken(roadId)}`, `Water transport access ${access.id} references missing connected road ${roadId}.`));
      }
    }

    if (waterway) {
      for (const componentId of access.routing.connectedWaterwayComponentIds) {
        if (!hasWaterwayComponent(waterway, componentId)) {
          issues.push(createWaterTransportAccessIssue(access, `missing-waterway-component-${toIssueIdToken(componentId)}`, `Water transport access ${access.id} references missing waterway component ${componentId}.`));
        }
      }
    }

    for (const transferObjectId of access.routing.transferObjectIds) {
      if (!hasObjectId(city, transferObjectId)) {
        issues.push(createWaterTransportAccessIssue(access, `missing-transfer-object-${toIssueIdToken(transferObjectId)}`, `Water transport access ${access.id} references missing transfer object ${transferObjectId}.`));
      }
    }

    if (!binding || binding.objectKind !== 'water-transport-access') {
      issues.push(createWaterTransportAccessIssue(access, 'missing-render-binding', `Water transport access ${access.id} must reference a water-transport-access render binding.`));
    }
  }

  if (city.waterways.length > 0 && city.emergencyServiceAnchors.length > 0 && city.waterTransportAccess.length === 0) {
    issues.push({
      id: 'missing-water-transport-access',
      severity: 'error',
      category: 'graph',
      ...createIssueFocus(city.waterways[0].center, 'Generate ferry, port, service dock, and emergency helipad access from waterways and emergency anchors.'),
      message: 'Waterfront and emergency access must expose water transport access objects.'
    });
  }

  for (const accessKind of WATER_TRANSPORT_ACCESS_KINDS) {
    if (!accessByKind.has(accessKind)) {
      issues.push({
        id: `missing-water-transport-access-${accessKind}`,
        severity: 'error',
        category: 'graph',
        ...createIssueFocus(city.waterways[0]?.center, `Create ${accessKind} water transport access.`),
        message: `Water transport access must include ${accessKind}.`
      });
    }
  }
}

function createWaterTransportAccessIssue(
  access: ValidationWaterTransportAccess,
  issueIdSuffix: string,
  message: string
): ValidationIssue {
  return {
    id: `water-transport-access-${issueIdSuffix}-${toIssueIdToken(access.id)}`,
    severity: 'error',
    category: 'graph',
    objectId: access.id,
    ...createIssueFocus(access.center, `Regenerate ${access.id} from waterway, waterfront, freight, emergency, and navigation data.`),
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

function validateStreetFurnitureSignFace(
  streetFurniture: GeneratedCityForValidation['streetFurniture'][number],
  transitRoutesById: ReadonlyMap<string, GeneratedCityForValidation['transitRoutes'][number]>,
  districtsById: ReadonlyMap<string, GeneratedCityForValidation['districts'][number]>,
  activeFrontagesById: ReadonlyMap<string, GeneratedCityForValidation['activeFrontages'][number]>,
  roadsById: ReadonlyMap<string, ValidationRoad>,
  issues: ValidationIssue[]
): void {
  const signFace = streetFurniture.signFace;

  if (!signFace) {
    return;
  }

  if (streetFurniture.lod !== 'lod4' || signFace.readableLod !== 'lod4') {
    issues.push({
      id: `non-readable-sign-lod-${streetFurniture.id}`,
      severity: 'error',
      category: 'lod',
      objectId: streetFurniture.id,
      message: `Readable sign ${streetFurniture.id} must use LOD4 object and sign-face metadata.`
    });
  }

  if (signFace.textCode.trim().length === 0 || signFace.destinationObjectIds.length === 0) {
    issues.push({
      id: `incomplete-sign-face-${streetFurniture.id}`,
      severity: 'error',
      category: 'asset',
      objectId: streetFurniture.id,
      message: `Sign ${streetFurniture.id} must declare readable text and at least one destination object.`
    });
  }

  if (signFace.signRole === 'regulatory' && !signFace.regulatoryRule) {
    issues.push({
      id: `missing-regulatory-sign-rule-${streetFurniture.id}`,
      severity: 'error',
      category: 'graph',
      objectId: streetFurniture.id,
      message: `Regulatory sign ${streetFurniture.id} must declare the rule it communicates.`
    });
  }

  if (signFace.signRole === 'street-name' && !signFace.destinationObjectIds.includes(streetFurniture.roadId)) {
    issues.push({
      id: `street-name-sign-missing-road-${streetFurniture.id}`,
      severity: 'error',
      category: 'graph',
      objectId: streetFurniture.id,
      message: `Street-name sign ${streetFurniture.id} must bind to its road destination.`
    });
  }

  if (
    signFace.signRole === 'wayfinding' &&
    signFace.routeIds.length === 0 &&
    signFace.districtIds.length === 0 &&
    signFace.activeFrontageIds.length === 0
  ) {
    issues.push({
      id: `wayfinding-sign-without-destinations-${streetFurniture.id}`,
      severity: 'error',
      category: 'graph',
      objectId: streetFurniture.id,
      message: `Wayfinding sign ${streetFurniture.id} must bind to route, district, or frontage destinations.`
    });
  }

  for (const routeId of signFace.routeIds) {
    const route = transitRoutesById.get(routeId);

    if (!route || !route.roadIds.includes(streetFurniture.roadId)) {
      issues.push({
        id: `invalid-sign-route-reference-${streetFurniture.id}-${routeId}`,
        severity: 'error',
        category: 'graph',
        objectId: streetFurniture.id,
        message: `Sign ${streetFurniture.id} references missing or unrelated route ${routeId}.`
      });
    }
  }

  for (const districtId of signFace.districtIds) {
    if (!districtsById.has(districtId)) {
      issues.push({
        id: `invalid-sign-district-reference-${streetFurniture.id}-${districtId}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetFurniture.id,
        message: `Sign ${streetFurniture.id} references missing district ${districtId}.`
      });
    }
  }

  for (const frontageId of signFace.activeFrontageIds) {
    const frontage = activeFrontagesById.get(frontageId);

    if (!frontage || frontage.roadId !== streetFurniture.roadId) {
      issues.push({
        id: `invalid-sign-frontage-reference-${streetFurniture.id}-${frontageId}`,
        severity: 'error',
        category: 'graph',
        objectId: streetFurniture.id,
        message: `Sign ${streetFurniture.id} references missing or unrelated active frontage ${frontageId}.`
      });
    }
  }

  for (const destinationObjectId of signFace.destinationObjectIds) {
    if (
      destinationObjectId !== streetFurniture.roadId &&
      !transitRoutesById.has(destinationObjectId) &&
      !districtsById.has(destinationObjectId) &&
      !activeFrontagesById.has(destinationObjectId) &&
      !roadsById.has(destinationObjectId)
    ) {
      issues.push({
        id: `invalid-sign-destination-${streetFurniture.id}-${destinationObjectId}`,
        severity: 'error',
        category: 'identifier',
        objectId: streetFurniture.id,
        message: `Sign ${streetFurniture.id} references missing destination ${destinationObjectId}.`
      });
    }
  }
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

  const facadeSide = building?.facadeGrammar.sides.find((side) => side.side === activeFrontage.frontageSide);
  if (
    building &&
    (!facadeSide ||
      !facadeSide.storefrontModule.enabled ||
      facadeSide.storefrontModule.roadId !== activeFrontage.roadId ||
      facadeSide.storefrontModule.bayCount <= 0)
  ) {
    issues.push({
      id: `active-frontage-facade-grammar-mismatch-${activeFrontage.id}`,
      severity: 'error',
      category: 'asset',
      objectId: activeFrontage.id,
      message: `Active frontage ${activeFrontage.id} must match a storefront module in ${building.id} facade grammar.`
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

function isUnitInterval(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
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
    } else if (!isMaterialZoneId(asset.tags.materialZone)) {
      issues.push({
        id: `invalid-asset-material-zone-${asset.id}-${toIssueIdToken(asset.tags.materialZone)}`,
        severity: 'error',
        category: 'asset',
        objectId: asset.id,
        message: `Asset ${asset.id} references unregistered material zone ${asset.tags.materialZone}.`
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
    } else if (!isMaterialZoneId(binding.materialZone)) {
      issues.push({
        id: `invalid-render-binding-material-zone-${binding.id}-${toIssueIdToken(binding.materialZone)}`,
        severity: 'error',
        category: 'asset',
        objectId: binding.id,
        message: `Render binding ${binding.id} references unregistered material zone ${binding.materialZone}.`
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

function includesValue<T extends string>(values: readonly T[], value: string): value is T {
  return values.includes(value as T);
}

function validatePublicLightingCoverage(
  streetLights: readonly ValidationStreetLight[],
  roadsById: ReadonlyMap<string, ValidationRoad>,
  issues: ValidationIssue[]
): void {
  const lightsByRoadSide = new Map<string, ValidationStreetLight[]>();

  for (const streetLight of streetLights) {
    const key = `${streetLight.roadId}:${streetLight.side}`;
    lightsByRoadSide.set(key, [...(lightsByRoadSide.get(key) ?? []), streetLight]);
  }

  for (const road of roadsById.values()) {
    if (!isCriticalPublicLightingRoad(road)) {
      continue;
    }

    for (const sidewalk of road.sidewalks) {
      const side = sidewalk.id.endsWith('left') ? 'left' : 'right';
      const lights = (lightsByRoadSide.get(`${road.id}:${side}`) ?? [])
        .slice()
        .sort((left, right) => left.alongRoadMeters - right.alongRoadMeters);

      if (lights.length === 0) {
        issues.push({
          id: `missing-public-lighting-${road.id}-${side}`,
          severity: 'error',
          category: 'utility-coverage',
          objectId: road.id,
          message: `Critical public route ${road.id} must have ${side} sidewalk lighting coverage.`
        });
        continue;
      }

      const maxGapMeters = getMaxPublicLightingGapMeters(road);
      const firstGap = lights[0].alongRoadMeters;
      const lastGap = road.length - lights[lights.length - 1].alongRoadMeters;
      const internalGap = lights.reduce((maxGap, light, index) => {
        const previous = lights[index - 1];
        return previous ? Math.max(maxGap, light.alongRoadMeters - previous.alongRoadMeters) : maxGap;
      }, 0);
      const darkGapMeters = Math.max(firstGap, internalGap, lastGap);

      if (darkGapMeters > maxGapMeters) {
        issues.push({
          id: `dark-public-lighting-gap-${road.id}-${side}`,
          severity: 'error',
          category: 'utility-coverage',
          objectId: road.id,
          message: `Critical public route ${road.id} has a ${Math.round(darkGapMeters)}m lighting gap on the ${side} sidewalk.`
        });
      }
    }
  }
}

function isCriticalPublicLightingRoad(road: ValidationRoad): boolean {
  return road.transitEligible || road.hierarchy === 'arterial' || road.hierarchy === 'collector' || road.hierarchy === 'promenade';
}

function getMaxPublicLightingGapMeters(road: ValidationRoad): number {
  if (road.hierarchy === 'arterial' || road.hierarchy === 'transit-corridor') {
    return 64;
  }

  if (road.hierarchy === 'collector' || road.hierarchy === 'promenade') {
    return 72;
  }

  return 90;
}

function countBy<T, K extends string>(values: readonly T[], getKey: (value: T) => K): Partial<Record<K, number>> {
  return values.reduce<Partial<Record<K, number>>>((counts, value) => {
    const key = getKey(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function groupBy<T, K extends string>(values: readonly T[], getKey: (value: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const value of values) {
    const key = getKey(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }

  return groups;
}

function validateFreightDeliveryWindow(
  objectId: CityId,
  deliveryWindow: GeneratedCityForValidation['freightRoutes'][number]['deliveryWindow'],
  issues: ValidationIssue[]
): void {
  if (
    !Number.isInteger(deliveryWindow.startHour) ||
    !Number.isInteger(deliveryWindow.endHour) ||
    deliveryWindow.startHour < 0 ||
    deliveryWindow.startHour > 23 ||
    deliveryWindow.endHour < 0 ||
    deliveryWindow.endHour > 23 ||
    deliveryWindow.startHour === deliveryWindow.endHour ||
    deliveryWindow.days.length === 0
  ) {
    issues.push({
      id: `invalid-freight-delivery-window-${objectId}`,
      severity: 'error',
      category: 'graph',
      objectId,
      message: `Freight object ${objectId} must expose a non-empty valid delivery time window.`
    });
  }
}

function isCriticalFacilityBuilding(building: GeneratedCityForValidation['buildings'][number]): boolean {
  return building.uses.some((use) => use === 'civic' || use === 'education' || use === 'transport' || use === 'utility');
}
