import type { CityPlanningLayer } from '../../cityPlan';
import type {
  AssetDefinition,
  CityId,
  CityObjectKind,
  GeospatialFrame,
  LodTier,
  Point2D,
  Point3D,
  Polygon2D,
  RenderBinding,
  ValidationIssue,
  ValidationResult
} from '../cityContracts';
import { listGeneratedCityObjects } from '../generatedCityObjectIndex';
import type { CityConfig, GeneratedCity } from '../../../types/city';

export const CITY_EXCHANGE_SCHEMA_VERSION = 'city-exchange-v1';

export type CityExchangeFormat =
  | 'geojson-feature-collection'
  | 'cityjson-domain'
  | 'osm-inspired-features'
  | 'gltf-asset-binding'
  | 'csv-table'
  | 'procedural-seed-json';

export type CityExchangeDirection = 'import' | 'export' | 'roundtrip';

export interface CityExchangeFormatContract {
  readonly format: CityExchangeFormat;
  readonly version: string;
  readonly direction: CityExchangeDirection;
  readonly ownerDomain: Extract<CityPlanningLayer, 'data-contracts'>;
  readonly coordinateFrame: 'local-xz-meter';
  readonly requiredSections: readonly string[];
  readonly excludedSections: readonly string[];
  readonly description: string;
}

export const RENDERER_ONLY_EXPORT_KEYS = [
  'objectIndex',
  'sceneLayers',
  'overlays',
  'picking',
  'performance',
  'quality',
  'trafficValidation'
] as const;

export const CITY_EXCHANGE_FORMAT_CONTRACTS = [
  {
    format: 'geojson-feature-collection',
    version: 'geojson-rfc7946-local-xz-v1',
    direction: 'roundtrip',
    ownerDomain: 'data-contracts',
    coordinateFrame: 'local-xz-meter',
    requiredSections: ['type', 'features', 'geospatial'],
    excludedSections: RENDERER_ONLY_EXPORT_KEYS,
    description: 'Local-meter GeoJSON FeatureCollection for boundaries, points, and route lines.'
  },
  {
    format: 'cityjson-domain',
    version: 'cityjson-domain-v1',
    direction: 'roundtrip',
    ownerDomain: 'data-contracts',
    coordinateFrame: 'local-xz-meter',
    requiredSections: ['type', 'cityObjects', 'geospatial'],
    excludedSections: RENDERER_ONLY_EXPORT_KEYS,
    description: 'CityJSON-style semantic object graph using local city contracts instead of mesh state.'
  },
  {
    format: 'osm-inspired-features',
    version: 'osm-inspired-v1',
    direction: 'roundtrip',
    ownerDomain: 'data-contracts',
    coordinateFrame: 'local-xz-meter',
    requiredSections: ['features', 'tags', 'geospatial'],
    excludedSections: RENDERER_ONLY_EXPORT_KEYS,
    description: 'OSM-inspired node, way, and relation features normalized into city object IDs.'
  },
  {
    format: 'gltf-asset-binding',
    version: 'gltf-asset-binding-v1',
    direction: 'roundtrip',
    ownerDomain: 'data-contracts',
    coordinateFrame: 'local-xz-meter',
    requiredSections: ['assetCatalog', 'renderBindings', 'materialZones'],
    excludedSections: RENDERER_ONLY_EXPORT_KEYS,
    description: 'glTF/GLB asset references and render bindings without Three.js runtime objects.'
  },
  {
    format: 'csv-table',
    version: 'csv-table-v1',
    direction: 'roundtrip',
    ownerDomain: 'data-contracts',
    coordinateFrame: 'local-xz-meter',
    requiredSections: ['tables', 'columns', 'rows'],
    excludedSections: RENDERER_ONLY_EXPORT_KEYS,
    description: 'Flat table shape for audits, inventories, and spreadsheet-oriented city data.'
  },
  {
    format: 'procedural-seed-json',
    version: 'procedural-seed-json-v1',
    direction: 'roundtrip',
    ownerDomain: 'data-contracts',
    coordinateFrame: 'local-xz-meter',
    requiredSections: ['seed', 'config', 'city', 'assets', 'validation'],
    excludedSections: RENDERER_ONLY_EXPORT_KEYS,
    description: 'Deterministic generated city seed and domain data export used as the first JSON artifact.'
  }
] as const satisfies readonly CityExchangeFormatContract[];

export const CITY_EXCHANGE_FORMATS = CITY_EXCHANGE_FORMAT_CONTRACTS.map((contract) => contract.format);

export type CityExchangePropertyValue = string | number | boolean | null;
export type CityExchangeProperties = Readonly<Record<string, CityExchangePropertyValue>>;

export type CityGeoJsonPosition2D = readonly [number, number];
export type CityGeoJsonPosition3D = readonly [number, number, number];
export type CityGeoJsonPosition = CityGeoJsonPosition2D | CityGeoJsonPosition3D;

export type CityGeoJsonGeometry =
  | {
      readonly type: 'Point';
      readonly coordinates: CityGeoJsonPosition;
    }
  | {
      readonly type: 'LineString';
      readonly coordinates: readonly CityGeoJsonPosition[];
    }
  | {
      readonly type: 'Polygon';
      readonly coordinates: readonly (readonly CityGeoJsonPosition[])[];
    };

export interface CityGeoJsonFeature {
  readonly type: 'Feature';
  readonly id: CityId;
  readonly geometry: CityGeoJsonGeometry;
  readonly properties: CityExchangeProperties & {
    readonly kind: CityObjectKind;
    readonly ownerDomain: CityPlanningLayer;
    readonly parentId?: CityId;
    readonly lod: LodTier;
  };
}

export interface CityGeoJsonFeatureCollectionExport {
  readonly schemaVersion: typeof CITY_EXCHANGE_SCHEMA_VERSION;
  readonly format: Extract<CityExchangeFormat, 'geojson-feature-collection'>;
  readonly geospatial: GeospatialFrame;
  readonly type: 'FeatureCollection';
  readonly features: readonly CityGeoJsonFeature[];
}

export interface CityJsonDomainObject {
  readonly id: CityId;
  readonly kind: CityObjectKind;
  readonly ownerDomain: CityPlanningLayer;
  readonly parentId?: CityId;
  readonly lod: LodTier;
  readonly attributes: CityExchangeProperties;
  readonly position?: Point2D | Point3D;
  readonly boundaries?: readonly Polygon2D[];
}

export interface CityJsonDomainExport {
  readonly schemaVersion: typeof CITY_EXCHANGE_SCHEMA_VERSION;
  readonly format: Extract<CityExchangeFormat, 'cityjson-domain'>;
  readonly geospatial: GeospatialFrame;
  readonly type: 'CityJSON';
  readonly cityObjects: readonly CityJsonDomainObject[];
}

export interface OsmInspiredFeature {
  readonly id: CityId;
  readonly type: 'node' | 'way' | 'relation';
  readonly sourceObjectId?: CityId;
  readonly sourceObjectKind?: CityObjectKind;
  readonly tags: Readonly<Record<string, string>>;
  readonly point?: Point2D;
  readonly refs?: readonly CityId[];
}

export interface OsmInspiredFeatureCollectionExport {
  readonly schemaVersion: typeof CITY_EXCHANGE_SCHEMA_VERSION;
  readonly format: Extract<CityExchangeFormat, 'osm-inspired-features'>;
  readonly geospatial: GeospatialFrame;
  readonly features: readonly OsmInspiredFeature[];
}

export interface NormalizedAddressImportTags {
  readonly buildingNumber: string;
  readonly streetName: string;
  readonly postalCode: string;
  readonly unitRange?: string;
  readonly neighborhoodName?: string;
}

export interface GltfAssetBindingExport {
  readonly schemaVersion: typeof CITY_EXCHANGE_SCHEMA_VERSION;
  readonly format: Extract<CityExchangeFormat, 'gltf-asset-binding'>;
  readonly geospatial: GeospatialFrame;
  readonly assetCatalog: readonly AssetDefinition[];
  readonly renderBindings: readonly RenderBinding[];
  readonly materialZones: readonly string[];
}

export type CityCsvColumnType = 'string' | 'number' | 'boolean' | 'json';

export interface CityCsvColumn {
  readonly name: string;
  readonly type: CityCsvColumnType;
  readonly required: boolean;
}

export interface CityCsvTable {
  readonly tableName: string;
  readonly primaryKey: string;
  readonly columns: readonly CityCsvColumn[];
  readonly rows: readonly Readonly<Record<string, CityExchangePropertyValue>>[];
}

export interface CityCsvTableExport {
  readonly schemaVersion: typeof CITY_EXCHANGE_SCHEMA_VERSION;
  readonly format: Extract<CityExchangeFormat, 'csv-table'>;
  readonly geospatial: GeospatialFrame;
  readonly tables: readonly CityCsvTable[];
}

export interface ProceduralSeedDomainSections {
  readonly administrativeBoundaries: GeneratedCity['administrativeBoundaries'];
  readonly districts: GeneratedCity['districts'];
  readonly zoningDistricts: GeneratedCity['zoningDistricts'];
  readonly cityMetrics: GeneratedCity['cityMetrics'];
  readonly developmentPhases: GeneratedCity['developmentPhases'];
  readonly weatherPresets: GeneratedCity['weatherPresets'];
  readonly solarShadingSamples: GeneratedCity['solarShadingSamples'];
  readonly urbanHeatZones: GeneratedCity['urbanHeatZones'];
  readonly utilityNodes: GeneratedCity['utilityNodes'];
  readonly utilityEdges: GeneratedCity['utilityEdges'];
  readonly serviceAccessCorridors: GeneratedCity['serviceAccessCorridors'];
  readonly accessControls: GeneratedCity['accessControls'];
  readonly buildingEntrances: GeneratedCity['buildingEntrances'];
  readonly buildingFireSafetyProfiles: GeneratedCity['buildingFireSafetyProfiles'];
  readonly addressPoints: GeneratedCity['addressPoints'];
  readonly namedPlaces: GeneratedCity['namedPlaces'];
  readonly gazetteerEntries: GeneratedCity['gazetteerEntries'];
  readonly constraints: GeneratedCity['constraints'];
  readonly hazardZones: GeneratedCity['hazardZones'];
  readonly topographyZones: GeneratedCity['topographyZones'];
  readonly soilGeologyZones: GeneratedCity['soilGeologyZones'];
  readonly resilienceGoals: GeneratedCity['resilienceGoals'];
  readonly verticalSlices: GeneratedCity['verticalSlices'];
  readonly blocks: GeneratedCity['blocks'];
  readonly roads: GeneratedCity['roads'];
  readonly intersections: GeneratedCity['intersections'];
  readonly crossings: GeneratedCity['crossings'];
  readonly curbZones: GeneratedCity['curbZones'];
  readonly curbActivations: GeneratedCity['curbActivations'];
  readonly publicAmenities: GeneratedCity['publicAmenities'];
  readonly trafficCalmingDevices: GeneratedCity['trafficCalmingDevices'];
  readonly transitStops: GeneratedCity['transitStops'];
  readonly transitRoutes: GeneratedCity['transitRoutes'];
  readonly bikeSegments: GeneratedCity['bikeSegments'];
  readonly bikeGraphNodes: GeneratedCity['bikeGraphNodes'];
  readonly bikeGraphEdges: GeneratedCity['bikeGraphEdges'];
  readonly bikeParking: GeneratedCity['bikeParking'];
  readonly bikeSignals: GeneratedCity['bikeSignals'];
  readonly bikeConflictZones: GeneratedCity['bikeConflictZones'];
  readonly navigationGraphNodes: GeneratedCity['navigationGraphNodes'];
  readonly navigationGraphEdges: GeneratedCity['navigationGraphEdges'];
  readonly navigationRoutes: GeneratedCity['navigationRoutes'];
  readonly maintenanceOperations: GeneratedCity['maintenanceOperations'];
  readonly permitInspectionRecords: GeneratedCity['permitInspectionRecords'];
  readonly freightLoadingDocks: GeneratedCity['freightLoadingDocks'];
  readonly freightRoutes: GeneratedCity['freightRoutes'];
  readonly serviceAlleys: GeneratedCity['serviceAlleys'];
  readonly streetLights: GeneratedCity['streetLights'];
  readonly streetFurniture: GeneratedCity['streetFurniture'];
  readonly greenStormwaterFeatures: GeneratedCity['greenStormwaterFeatures'];
  readonly sidewalkGraph: GeneratedCity['sidewalkGraph'];
  readonly parcels: GeneratedCity['parcels'];
  readonly cadastreRecords: GeneratedCity['cadastreRecords'];
  readonly assetInventoryRecords: GeneratedCity['assetInventoryRecords'];
  readonly buildings: GeneratedCity['buildings'];
  readonly civicAnchors: GeneratedCity['civicAnchors'];
  readonly communityAnchors: GeneratedCity['communityAnchors'];
  readonly cultureAnchors: GeneratedCity['cultureAnchors'];
  readonly educationAnchors: GeneratedCity['educationAnchors'];
  readonly governmentAnchors: GeneratedCity['governmentAnchors'];
  readonly healthcareAnchors: GeneratedCity['healthcareAnchors'];
  readonly emergencyServiceAnchors: GeneratedCity['emergencyServiceAnchors'];
  readonly waterTransportAccess: GeneratedCity['waterTransportAccess'];
  readonly activeFrontages: GeneratedCity['activeFrontages'];
  readonly parks: GeneratedCity['parks'];
  readonly parkFeatures: GeneratedCity['parkFeatures'];
  readonly plazaZones: GeneratedCity['plazaZones'];
  readonly waterways: GeneratedCity['waterways'];
  readonly waterfrontEdges: GeneratedCity['waterfrontEdges'];
  readonly waterfrontOpenSpaces: GeneratedCity['waterfrontOpenSpaces'];
  readonly trees: GeneratedCity['trees'];
}

export interface ProceduralSeedDomainSectionCounts {
  readonly administrativeBoundaries: number;
  readonly districts: number;
  readonly zoningDistricts: number;
  readonly cityMetrics: number;
  readonly developmentPhases: number;
  readonly weatherPresets: number;
  readonly solarShadingSamples: number;
  readonly urbanHeatZones: number;
  readonly utilityNodes: number;
  readonly utilityEdges: number;
  readonly serviceAccessCorridors: number;
  readonly accessControls: number;
  readonly buildingEntrances: number;
  readonly buildingFireSafetyProfiles: number;
  readonly addressPoints: number;
  readonly namedPlaces: number;
  readonly gazetteerEntries: number;
  readonly constraints: number;
  readonly hazardZones: number;
  readonly topographyZones: number;
  readonly soilGeologyZones: number;
  readonly resilienceGoals: number;
  readonly verticalSlices: number;
  readonly blocks: number;
  readonly roads: number;
  readonly lanes: number;
  readonly sidewalks: number;
  readonly intersections: number;
  readonly crossings: number;
  readonly curbZones: number;
  readonly curbActivations: number;
  readonly publicAmenities: number;
  readonly trafficCalmingDevices: number;
  readonly transitStops: number;
  readonly transitRoutes: number;
  readonly bikeSegments: number;
  readonly bikeGraphNodes: number;
  readonly bikeGraphEdges: number;
  readonly bikeParking: number;
  readonly bikeSignals: number;
  readonly bikeConflictZones: number;
  readonly navigationGraphNodes: number;
  readonly navigationGraphEdges: number;
  readonly navigationRoutes: number;
  readonly maintenanceOperations: number;
  readonly permitInspectionRecords: number;
  readonly freightLoadingDocks: number;
  readonly freightRoutes: number;
  readonly serviceAlleys: number;
  readonly streetLights: number;
  readonly streetFurniture: number;
  readonly greenStormwaterFeatures: number;
  readonly sidewalkGraphNodes: number;
  readonly sidewalkGraphEdges: number;
  readonly parcels: number;
  readonly cadastreRecords: number;
  readonly assetInventoryRecords: number;
  readonly buildings: number;
  readonly civicAnchors: number;
  readonly communityAnchors: number;
  readonly cultureAnchors: number;
  readonly educationAnchors: number;
  readonly governmentAnchors: number;
  readonly healthcareAnchors: number;
  readonly emergencyServiceAnchors: number;
  readonly waterTransportAccess: number;
  readonly activeFrontages: number;
  readonly parks: number;
  readonly parkFeatures: number;
  readonly plazaZones: number;
  readonly waterways: number;
  readonly waterfrontEdges: number;
  readonly waterfrontOpenSpaces: number;
  readonly trees: number;
  readonly assetCatalog: number;
  readonly renderBindings: number;
}

export interface ProceduralSeedJsonExport {
  readonly schemaVersion: typeof CITY_EXCHANGE_SCHEMA_VERSION;
  readonly citySchemaVersion: GeneratedCity['schemaVersion'];
  readonly format: Extract<CityExchangeFormat, 'procedural-seed-json'>;
  readonly exportId: CityId;
  readonly seed: string;
  readonly config: CityConfig;
  readonly geospatial: GeneratedCity['geospatial'];
  readonly bounds: GeneratedCity['bounds'];
  readonly lodPolicy: GeneratedCity['lodPolicy'];
  readonly performanceBudget: GeneratedCity['performanceBudget'];
  readonly objectCount: number;
  readonly objectIds: readonly CityId[];
  readonly domainSectionCounts: ProceduralSeedDomainSectionCounts;
  readonly city: ProceduralSeedDomainSections;
  readonly assets: {
    readonly catalog: GeneratedCity['assetCatalog'];
    readonly bindings: GeneratedCity['assetBindings'];
  };
  readonly validation: GeneratedCity['validation'];
  readonly provenance: {
    readonly ownerDomain: Extract<CityPlanningLayer, 'data-contracts'>;
    readonly generator: 'CityGenerator';
    readonly deterministic: true;
    readonly rendererOnlyFieldsExcluded: readonly (typeof RENDERER_ONLY_EXPORT_KEYS)[number][];
  };
}

export interface CreateProceduralSeedJsonExportOptions {
  readonly seed: string;
  readonly config: CityConfig;
  readonly exportId?: CityId;
}

export interface CityImportExportDiagnostics {
  readonly schemaVersion: typeof CITY_EXCHANGE_SCHEMA_VERSION;
  readonly supportedFormatCount: number;
  readonly supportedFormats: readonly CityExchangeFormat[];
  readonly contracts: readonly CityExchangeFormatContract[];
  readonly proceduralSeedExport: {
    readonly format: Extract<CityExchangeFormat, 'procedural-seed-json'>;
    readonly exportId: CityId;
    readonly objectCount: number;
    readonly domainSectionCounts: ProceduralSeedDomainSectionCounts;
    readonly exportedAssetDefinitions: number;
    readonly exportedRenderBindings: number;
    readonly validationPassed: boolean;
    readonly jsonSerializable: boolean;
    readonly rendererOnlyFieldsDetected: readonly string[];
    readonly rendererOnlyFieldCount: number;
  };
}

export function createProceduralSeedJsonExport(
  city: GeneratedCity,
  options: CreateProceduralSeedJsonExportOptions
): ProceduralSeedJsonExport {
  const objects = listGeneratedCityObjects(city);

  return {
    schemaVersion: CITY_EXCHANGE_SCHEMA_VERSION,
    citySchemaVersion: city.schemaVersion,
    format: 'procedural-seed-json',
    exportId: options.exportId ?? `export:procedural-seed:${options.seed}`,
    seed: options.seed,
    config: options.config,
    geospatial: city.geospatial,
    bounds: city.bounds,
    lodPolicy: city.lodPolicy,
    performanceBudget: city.performanceBudget,
    objectCount: objects.length,
    objectIds: objects.map((object) => object.id),
    domainSectionCounts: createProceduralSeedDomainSectionCounts(city),
    city: {
      administrativeBoundaries: city.administrativeBoundaries,
      districts: city.districts,
      zoningDistricts: city.zoningDistricts,
      cityMetrics: city.cityMetrics,
      developmentPhases: city.developmentPhases,
      weatherPresets: city.weatherPresets,
      solarShadingSamples: city.solarShadingSamples,
      urbanHeatZones: city.urbanHeatZones,
      utilityNodes: city.utilityNodes,
      utilityEdges: city.utilityEdges,
      serviceAccessCorridors: city.serviceAccessCorridors,
      accessControls: city.accessControls,
      buildingEntrances: city.buildingEntrances,
      buildingFireSafetyProfiles: city.buildingFireSafetyProfiles,
      addressPoints: city.addressPoints,
      namedPlaces: city.namedPlaces,
      gazetteerEntries: city.gazetteerEntries,
      constraints: city.constraints,
      hazardZones: city.hazardZones,
      topographyZones: city.topographyZones,
      soilGeologyZones: city.soilGeologyZones,
      resilienceGoals: city.resilienceGoals,
      verticalSlices: city.verticalSlices,
      blocks: city.blocks,
      roads: city.roads,
      intersections: city.intersections,
      crossings: city.crossings,
      curbZones: city.curbZones,
      curbActivations: city.curbActivations,
      publicAmenities: city.publicAmenities,
      trafficCalmingDevices: city.trafficCalmingDevices,
      transitStops: city.transitStops,
      transitRoutes: city.transitRoutes,
      bikeSegments: city.bikeSegments,
      bikeGraphNodes: city.bikeGraphNodes,
      bikeGraphEdges: city.bikeGraphEdges,
      bikeParking: city.bikeParking,
      bikeSignals: city.bikeSignals,
      bikeConflictZones: city.bikeConflictZones,
      navigationGraphNodes: city.navigationGraphNodes,
      navigationGraphEdges: city.navigationGraphEdges,
      navigationRoutes: city.navigationRoutes,
      maintenanceOperations: city.maintenanceOperations,
      permitInspectionRecords: city.permitInspectionRecords,
      freightLoadingDocks: city.freightLoadingDocks,
      freightRoutes: city.freightRoutes,
      serviceAlleys: city.serviceAlleys,
      streetLights: city.streetLights,
      streetFurniture: city.streetFurniture,
      greenStormwaterFeatures: city.greenStormwaterFeatures,
      sidewalkGraph: city.sidewalkGraph,
      parcels: city.parcels,
      cadastreRecords: city.cadastreRecords,
      assetInventoryRecords: city.assetInventoryRecords,
      buildings: city.buildings,
      civicAnchors: city.civicAnchors,
      communityAnchors: city.communityAnchors,
      cultureAnchors: city.cultureAnchors,
      educationAnchors: city.educationAnchors,
      governmentAnchors: city.governmentAnchors,
      healthcareAnchors: city.healthcareAnchors,
      emergencyServiceAnchors: city.emergencyServiceAnchors,
      waterTransportAccess: city.waterTransportAccess,
      activeFrontages: city.activeFrontages,
      parks: city.parks,
      parkFeatures: city.parkFeatures,
      plazaZones: city.plazaZones,
      waterways: city.waterways,
      waterfrontEdges: city.waterfrontEdges,
      waterfrontOpenSpaces: city.waterfrontOpenSpaces,
      trees: city.trees
    },
    assets: {
      catalog: city.assetCatalog,
      bindings: city.assetBindings
    },
    validation: city.validation,
    provenance: {
      ownerDomain: 'data-contracts',
      generator: 'CityGenerator',
      deterministic: true,
      rendererOnlyFieldsExcluded: RENDERER_ONLY_EXPORT_KEYS
    }
  };
}

export function createCityImportExportDiagnostics(
  city: GeneratedCity,
  options: CreateProceduralSeedJsonExportOptions
): CityImportExportDiagnostics {
  const proceduralSeedExport = createProceduralSeedJsonExport(city, options);
  const validation = validateProceduralSeedJsonExport(proceduralSeedExport);
  const rendererOnlyFieldsDetected = findRendererOnlyExportFields(proceduralSeedExport);

  return {
    schemaVersion: CITY_EXCHANGE_SCHEMA_VERSION,
    supportedFormatCount: CITY_EXCHANGE_FORMAT_CONTRACTS.length,
    supportedFormats: CITY_EXCHANGE_FORMATS,
    contracts: CITY_EXCHANGE_FORMAT_CONTRACTS,
    proceduralSeedExport: {
      format: proceduralSeedExport.format,
      exportId: proceduralSeedExport.exportId,
      objectCount: proceduralSeedExport.objectCount,
      domainSectionCounts: proceduralSeedExport.domainSectionCounts,
      exportedAssetDefinitions: proceduralSeedExport.assets.catalog.length,
      exportedRenderBindings: proceduralSeedExport.assets.bindings.length,
      validationPassed: validation.passed,
      jsonSerializable: isJsonSerializable(proceduralSeedExport),
      rendererOnlyFieldsDetected,
      rendererOnlyFieldCount: rendererOnlyFieldsDetected.length
    }
  };
}

export function mapAddressPointToOsmAddressTags(
  addressPoint: GeneratedCity['addressPoints'][number]
): Readonly<Record<string, string>> {
  return {
    'addr:housenumber': addressPoint.buildingNumber,
    'addr:street': addressPoint.streetName,
    'addr:postcode': addressPoint.postalCode,
    ...(addressPoint.unitRange ? { 'addr:unit': addressPoint.unitRange } : {}),
    ...(addressPoint.neighborhoodName ? { 'addr:neighbourhood': addressPoint.neighborhoodName } : {})
  };
}

export function mapOsmAddressTagsToAddressFields(
  tags: Readonly<Record<string, string | undefined>>
): NormalizedAddressImportTags | undefined {
  const buildingNumber = tags['addr:housenumber'];
  const streetName = tags['addr:street'];
  const postalCode = tags['addr:postcode'];

  if (!buildingNumber || !streetName || !postalCode) {
    return undefined;
  }

  return {
    buildingNumber,
    streetName,
    postalCode,
    unitRange: tags['addr:unit'],
    neighborhoodName: tags['addr:neighbourhood'] ?? tags['addr:suburb']
  };
}

export function validateProceduralSeedJsonExport(artifact: unknown): ValidationResult {
  const exportArtifact = isRecord(artifact) ? (artifact as Partial<ProceduralSeedJsonExport>) : {};
  const issues: ValidationIssue[] = [];
  const rendererOnlyFields = findRendererOnlyExportFields(exportArtifact);

  if (exportArtifact.schemaVersion !== CITY_EXCHANGE_SCHEMA_VERSION) {
    issues.push(createImportExportIssue('invalid-export-schema-version', 'Export schema version is not supported.'));
  }

  if (exportArtifact.format !== 'procedural-seed-json') {
    issues.push(createImportExportIssue('invalid-export-format', 'Expected procedural-seed-json export format.'));
  }

  if (typeof exportArtifact.seed !== 'string' || exportArtifact.seed.length === 0) {
    issues.push(createImportExportIssue('missing-export-seed', 'Procedural seed export must carry a stable seed.'));
  }

  if (!isGeospatialFrame(exportArtifact.geospatial) || exportArtifact.geospatial.coordinateSystem !== 'local-xz') {
    issues.push(
      createImportExportIssue(
        'invalid-export-geospatial-frame',
        'Procedural seed export must carry the local x/z meter geospatial frame.'
      )
    );
  }

  if (typeof exportArtifact.objectCount !== 'number' || !Number.isInteger(exportArtifact.objectCount)) {
    issues.push(createImportExportIssue('missing-export-object-count', 'Procedural seed export needs an object count.'));
  } else {
    const computedObjectCount = countProceduralSeedDomainObjects(exportArtifact);

    if (exportArtifact.objectCount !== computedObjectCount) {
      issues.push(
        createImportExportIssue(
          'invalid-export-object-count',
          `Procedural seed export object count ${exportArtifact.objectCount} does not match ${computedObjectCount}.`
        )
      );
    }
  }

  for (const fieldPath of rendererOnlyFields) {
    issues.push(
      createImportExportIssue(
        `export-renderer-only-field-${sanitizeIssueId(fieldPath)}`,
        `Procedural seed export must not include renderer-only field ${fieldPath}.`
      )
    );
  }

  return {
    passed: issues.every((issue) => issue.severity !== 'error'),
    issues
  };
}

export function createProceduralSeedDomainSectionCounts(
  city: Pick<
    GeneratedCity,
    | 'activeFrontages'
    | 'administrativeBoundaries'
    | 'assetBindings'
    | 'assetCatalog'
    | 'blocks'
    | 'buildings'
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
    | 'accessControls'
    | 'buildingEntrances'
    | 'buildingFireSafetyProfiles'
    | 'addressPoints'
    | 'namedPlaces'
    | 'gazetteerEntries'
    | 'constraints'
    | 'hazardZones'
    | 'topographyZones'
    | 'soilGeologyZones'
    | 'resilienceGoals'
    | 'crossings'
    | 'curbZones'
    | 'curbActivations'
    | 'publicAmenities'
    | 'trafficCalmingDevices'
    | 'transitStops'
    | 'transitRoutes'
    | 'bikeSegments'
    | 'bikeGraphNodes'
    | 'bikeGraphEdges'
    | 'bikeParking'
    | 'bikeSignals'
    | 'bikeConflictZones'
    | 'navigationGraphNodes'
    | 'navigationGraphEdges'
    | 'navigationRoutes'
    | 'maintenanceOperations'
    | 'permitInspectionRecords'
    | 'freightLoadingDocks'
    | 'freightRoutes'
    | 'serviceAlleys'
    | 'districts'
    | 'zoningDistricts'
    | 'intersections'
    | 'parcels'
    | 'parks'
    | 'parkFeatures'
    | 'plazaZones'
    | 'roads'
    | 'sidewalkGraph'
    | 'streetFurniture'
    | 'streetLights'
    | 'greenStormwaterFeatures'
    | 'trees'
    | 'verticalSlices'
    | 'waterways'
    | 'waterfrontEdges'
    | 'waterfrontOpenSpaces'
  >
): ProceduralSeedDomainSectionCounts {
  return {
    administrativeBoundaries: city.administrativeBoundaries.length,
    districts: city.districts.length,
    zoningDistricts: city.zoningDistricts.length,
    cityMetrics: city.cityMetrics.length,
    developmentPhases: city.developmentPhases.length,
    weatherPresets: city.weatherPresets.length,
    solarShadingSamples: city.solarShadingSamples.length,
    urbanHeatZones: city.urbanHeatZones.length,
    utilityNodes: city.utilityNodes.length,
    utilityEdges: city.utilityEdges.length,
    serviceAccessCorridors: city.serviceAccessCorridors.length,
    accessControls: city.accessControls.length,
    buildingEntrances: city.buildingEntrances.length,
    buildingFireSafetyProfiles: city.buildingFireSafetyProfiles.length,
    addressPoints: city.addressPoints.length,
    namedPlaces: city.namedPlaces.length,
    gazetteerEntries: city.gazetteerEntries.length,
    constraints: city.constraints.length,
    hazardZones: city.hazardZones.length,
    topographyZones: city.topographyZones.length,
    soilGeologyZones: city.soilGeologyZones.length,
    resilienceGoals: city.resilienceGoals.length,
    verticalSlices: city.verticalSlices.length,
    blocks: city.blocks.length,
    roads: city.roads.length,
    lanes: city.roads.reduce((sum, road) => sum + road.lanes.length, 0),
    sidewalks: city.roads.reduce((sum, road) => sum + road.sidewalks.length, 0),
    intersections: city.intersections.length,
    crossings: city.crossings.length,
    curbZones: city.curbZones.length,
    curbActivations: city.curbActivations.length,
    publicAmenities: city.publicAmenities.length,
    trafficCalmingDevices: city.trafficCalmingDevices.length,
    transitStops: city.transitStops.length,
    transitRoutes: city.transitRoutes.length,
    bikeSegments: city.bikeSegments.length,
    bikeGraphNodes: city.bikeGraphNodes.length,
    bikeGraphEdges: city.bikeGraphEdges.length,
    bikeParking: city.bikeParking.length,
    bikeSignals: city.bikeSignals.length,
    bikeConflictZones: city.bikeConflictZones.length,
    navigationGraphNodes: city.navigationGraphNodes.length,
    navigationGraphEdges: city.navigationGraphEdges.length,
    navigationRoutes: city.navigationRoutes.length,
    maintenanceOperations: city.maintenanceOperations.length,
    permitInspectionRecords: city.permitInspectionRecords.length,
    freightLoadingDocks: city.freightLoadingDocks.length,
    freightRoutes: city.freightRoutes.length,
    serviceAlleys: city.serviceAlleys.length,
    streetLights: city.streetLights.length,
    streetFurniture: city.streetFurniture.length,
    greenStormwaterFeatures: city.greenStormwaterFeatures.length,
    sidewalkGraphNodes: city.sidewalkGraph.nodes.length,
    sidewalkGraphEdges: city.sidewalkGraph.edges.length,
    parcels: city.parcels.length,
    cadastreRecords: city.cadastreRecords.length,
    assetInventoryRecords: city.assetInventoryRecords.length,
    buildings: city.buildings.length,
    civicAnchors: city.civicAnchors.length,
    communityAnchors: city.communityAnchors.length,
    cultureAnchors: city.cultureAnchors.length,
    educationAnchors: city.educationAnchors.length,
    governmentAnchors: city.governmentAnchors.length,
    healthcareAnchors: city.healthcareAnchors.length,
    emergencyServiceAnchors: city.emergencyServiceAnchors.length,
    waterTransportAccess: city.waterTransportAccess.length,
    activeFrontages: city.activeFrontages.length,
    parks: city.parks.length,
    parkFeatures: city.parkFeatures.length,
    plazaZones: city.plazaZones.length,
    waterways: city.waterways.length,
    waterfrontEdges: city.waterfrontEdges.length,
    waterfrontOpenSpaces: city.waterfrontOpenSpaces.length,
    trees: city.trees.length,
    assetCatalog: city.assetCatalog.length,
    renderBindings: city.assetBindings.length
  };
}

export function countProceduralSeedDomainObjects(
  artifact: Partial<Pick<ProceduralSeedJsonExport, 'assets' | 'city'>>
): number {
  const city = artifact.city;
  const assets = artifact.assets;

  return (
    getArrayLength(city, 'administrativeBoundaries') +
    getArrayLength(city, 'districts') +
    getArrayLength(city, 'zoningDistricts') +
    getArrayLength(city, 'cityMetrics') +
    getArrayLength(city, 'developmentPhases') +
    getArrayLength(city, 'weatherPresets') +
    getArrayLength(city, 'solarShadingSamples') +
    getArrayLength(city, 'urbanHeatZones') +
    getArrayLength(city, 'utilityNodes') +
    getArrayLength(city, 'utilityEdges') +
    getArrayLength(city, 'serviceAccessCorridors') +
    getArrayLength(city, 'accessControls') +
    getArrayLength(city, 'buildingEntrances') +
    getArrayLength(city, 'buildingFireSafetyProfiles') +
    getArrayLength(city, 'addressPoints') +
    getArrayLength(city, 'namedPlaces') +
    getArrayLength(city, 'gazetteerEntries') +
    getArrayLength(city, 'constraints') +
    getArrayLength(city, 'hazardZones') +
    getArrayLength(city, 'topographyZones') +
    getArrayLength(city, 'soilGeologyZones') +
    getArrayLength(city, 'resilienceGoals') +
    getArrayLength(city, 'verticalSlices') +
    getArrayLength(city, 'blocks') +
    getArrayLength(city, 'roads') +
    getNestedRoadChildCount(city, 'lanes') +
    getNestedRoadChildCount(city, 'sidewalks') +
    getArrayLength(city, 'intersections') +
    getArrayLength(city, 'crossings') +
    getArrayLength(city, 'curbZones') +
    getArrayLength(city, 'curbActivations') +
    getArrayLength(city, 'publicAmenities') +
    getArrayLength(city, 'trafficCalmingDevices') +
    getArrayLength(city, 'transitStops') +
    getArrayLength(city, 'transitRoutes') +
    getArrayLength(city, 'bikeSegments') +
    getArrayLength(city, 'bikeGraphNodes') +
    getArrayLength(city, 'bikeGraphEdges') +
    getArrayLength(city, 'bikeParking') +
    getArrayLength(city, 'bikeSignals') +
    getArrayLength(city, 'bikeConflictZones') +
    getArrayLength(city, 'navigationGraphNodes') +
    getArrayLength(city, 'navigationGraphEdges') +
    getArrayLength(city, 'navigationRoutes') +
    getArrayLength(city, 'maintenanceOperations') +
    getArrayLength(city, 'permitInspectionRecords') +
    getArrayLength(city, 'freightLoadingDocks') +
    getArrayLength(city, 'freightRoutes') +
    getArrayLength(city, 'serviceAlleys') +
    getArrayLength(city, 'streetLights') +
    getArrayLength(city, 'streetFurniture') +
    getArrayLength(city, 'greenStormwaterFeatures') +
    getNestedArrayLength(city, 'sidewalkGraph', 'nodes') +
    getNestedArrayLength(city, 'sidewalkGraph', 'edges') +
    getArrayLength(city, 'parcels') +
    getArrayLength(city, 'cadastreRecords') +
    getArrayLength(city, 'assetInventoryRecords') +
    getArrayLength(city, 'buildings') +
    getArrayLength(city, 'civicAnchors') +
    getArrayLength(city, 'communityAnchors') +
    getArrayLength(city, 'cultureAnchors') +
    getArrayLength(city, 'educationAnchors') +
    getArrayLength(city, 'governmentAnchors') +
    getArrayLength(city, 'healthcareAnchors') +
    getArrayLength(city, 'emergencyServiceAnchors') +
    getArrayLength(city, 'waterTransportAccess') +
    getArrayLength(city, 'activeFrontages') +
    getArrayLength(city, 'parks') +
    getArrayLength(city, 'parkFeatures') +
    getArrayLength(city, 'plazaZones') +
    getArrayLength(city, 'waterways') +
    getArrayLength(city, 'waterfrontEdges') +
    getArrayLength(city, 'waterfrontOpenSpaces') +
    getArrayLength(city, 'trees') +
    getArrayLength(assets, 'catalog')
  );
}

export function findRendererOnlyExportFields(value: unknown): string[] {
  const matches: string[] = [];
  collectRendererOnlyExportFields(value, '', matches, new Set<object>());
  return matches;
}

function collectRendererOnlyExportFields(
  value: unknown,
  path: string,
  matches: string[],
  seen: Set<object>
): void {
  if (!isRecord(value)) {
    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  for (const [key, childValue] of Object.entries(value)) {
    const childPath = path.length > 0 ? `${path}.${key}` : key;

    if (isRendererOnlyExportKey(key)) {
      matches.push(childPath);
      continue;
    }

    if (isRecord(childValue) || Array.isArray(childValue)) {
      collectRendererOnlyExportFields(childValue, childPath, matches, seen);
    }
  }
}

function isRendererOnlyExportKey(key: string): key is (typeof RENDERER_ONLY_EXPORT_KEYS)[number] {
  return RENDERER_ONLY_EXPORT_KEYS.includes(key as (typeof RENDERER_ONLY_EXPORT_KEYS)[number]);
}

function isJsonSerializable(value: unknown): boolean {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}

function createImportExportIssue(id: CityId, message: string): ValidationIssue {
  return {
    id,
    severity: 'error',
    category: 'import-export',
    message
  };
}

function sanitizeIssueId(value: string): string {
  return value.replace(/[^a-zA-Z0-9:-]+/g, '-');
}

function isGeospatialFrame(value: unknown): value is GeospatialFrame {
  return isRecord(value) && value.unit === 'meter' && typeof value.coordinateSystem === 'string';
}

function getArrayLength(value: unknown, key: string): number {
  if (!isRecord(value)) {
    return 0;
  }

  const child = value[key];
  return Array.isArray(child) ? child.length : 0;
}

function getNestedArrayLength(value: unknown, parentKey: string, childKey: string): number {
  if (!isRecord(value)) {
    return 0;
  }

  return getArrayLength(value[parentKey], childKey);
}

function getNestedRoadChildCount(value: unknown, childKey: 'lanes' | 'sidewalks'): number {
  if (!isRecord(value) || !Array.isArray(value.roads)) {
    return 0;
  }

  return value.roads.reduce((sum, road) => sum + getArrayLength(road, childKey), 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
