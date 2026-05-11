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
  readonly districts: GeneratedCity['districts'];
  readonly constraints: GeneratedCity['constraints'];
  readonly verticalSlices: GeneratedCity['verticalSlices'];
  readonly blocks: GeneratedCity['blocks'];
  readonly roads: GeneratedCity['roads'];
  readonly intersections: GeneratedCity['intersections'];
  readonly crossings: GeneratedCity['crossings'];
  readonly curbZones: GeneratedCity['curbZones'];
  readonly streetLights: GeneratedCity['streetLights'];
  readonly streetFurniture: GeneratedCity['streetFurniture'];
  readonly sidewalkGraph: GeneratedCity['sidewalkGraph'];
  readonly parcels: GeneratedCity['parcels'];
  readonly buildings: GeneratedCity['buildings'];
  readonly activeFrontages: GeneratedCity['activeFrontages'];
  readonly parks: GeneratedCity['parks'];
  readonly waterways: GeneratedCity['waterways'];
  readonly trees: GeneratedCity['trees'];
}

export interface ProceduralSeedDomainSectionCounts {
  readonly districts: number;
  readonly constraints: number;
  readonly verticalSlices: number;
  readonly blocks: number;
  readonly roads: number;
  readonly lanes: number;
  readonly sidewalks: number;
  readonly intersections: number;
  readonly crossings: number;
  readonly curbZones: number;
  readonly streetLights: number;
  readonly streetFurniture: number;
  readonly sidewalkGraphNodes: number;
  readonly sidewalkGraphEdges: number;
  readonly parcels: number;
  readonly buildings: number;
  readonly activeFrontages: number;
  readonly parks: number;
  readonly waterways: number;
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
      districts: city.districts,
      constraints: city.constraints,
      verticalSlices: city.verticalSlices,
      blocks: city.blocks,
      roads: city.roads,
      intersections: city.intersections,
      crossings: city.crossings,
      curbZones: city.curbZones,
      streetLights: city.streetLights,
      streetFurniture: city.streetFurniture,
      sidewalkGraph: city.sidewalkGraph,
      parcels: city.parcels,
      buildings: city.buildings,
      activeFrontages: city.activeFrontages,
      parks: city.parks,
      waterways: city.waterways,
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
    | 'assetBindings'
    | 'assetCatalog'
    | 'blocks'
    | 'buildings'
    | 'constraints'
    | 'crossings'
    | 'curbZones'
    | 'districts'
    | 'intersections'
    | 'parcels'
    | 'parks'
    | 'roads'
    | 'sidewalkGraph'
    | 'streetFurniture'
    | 'streetLights'
    | 'trees'
    | 'verticalSlices'
    | 'waterways'
  >
): ProceduralSeedDomainSectionCounts {
  return {
    districts: city.districts.length,
    constraints: city.constraints.length,
    verticalSlices: city.verticalSlices.length,
    blocks: city.blocks.length,
    roads: city.roads.length,
    lanes: city.roads.reduce((sum, road) => sum + road.lanes.length, 0),
    sidewalks: city.roads.reduce((sum, road) => sum + road.sidewalks.length, 0),
    intersections: city.intersections.length,
    crossings: city.crossings.length,
    curbZones: city.curbZones.length,
    streetLights: city.streetLights.length,
    streetFurniture: city.streetFurniture.length,
    sidewalkGraphNodes: city.sidewalkGraph.nodes.length,
    sidewalkGraphEdges: city.sidewalkGraph.edges.length,
    parcels: city.parcels.length,
    buildings: city.buildings.length,
    activeFrontages: city.activeFrontages.length,
    parks: city.parks.length,
    waterways: city.waterways.length,
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
    getArrayLength(city, 'districts') +
    getArrayLength(city, 'constraints') +
    getArrayLength(city, 'verticalSlices') +
    getArrayLength(city, 'blocks') +
    getArrayLength(city, 'roads') +
    getNestedRoadChildCount(city, 'lanes') +
    getNestedRoadChildCount(city, 'sidewalks') +
    getArrayLength(city, 'intersections') +
    getArrayLength(city, 'crossings') +
    getArrayLength(city, 'curbZones') +
    getArrayLength(city, 'streetLights') +
    getArrayLength(city, 'streetFurniture') +
    getNestedArrayLength(city, 'sidewalkGraph', 'nodes') +
    getNestedArrayLength(city, 'sidewalkGraph', 'edges') +
    getArrayLength(city, 'parcels') +
    getArrayLength(city, 'buildings') +
    getArrayLength(city, 'activeFrontages') +
    getArrayLength(city, 'parks') +
    getArrayLength(city, 'waterways') +
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
