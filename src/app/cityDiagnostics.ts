import type { RenderConfig } from '../config/renderConfig';
import { cityConfig as defaultCityConfig } from '../config/cityConfig';
import { createConfigDiagnostics, type ConfigDiagnostics } from '../config/configSchema';
import type { CityObjectIndex, SourceType } from '../city/data-contracts/cityContracts';
import { createGeneratedRuntimeObjectIndex } from '../city/data-contracts/generatedCityObjectIndex';
import {
  createCityObjectRegistryDiagnostics,
  type CityObjectRegistryDiagnostics
} from '../city/data-contracts/cityObjectRegistry';
import { createCityLodPolicyDiagnostics, type CityLodPolicyDiagnostics } from '../city/data-contracts/lodPolicy';
import {
  createCitySceneLayerDiagnostics,
  type CitySceneLayerDiagnostics
} from '../city/rendering-handoff/scene-layers/sceneLayerDefinitions';
import { createCityOverlayDatasets, type CityOverlayDataset } from '../city/rendering-handoff/overlays/overlayData';
import {
  createCityPickingMetadataCatalog,
  type CityPickingCatalog
} from '../city/rendering-handoff/picking/pickingMetadata';
import {
  createAssetBindingDiagnostics,
  type AssetBindingDiagnostics
} from '../city/rendering-handoff/asset-binding/assetBindingDiagnostics';
import {
  createCityImportExportDiagnostics,
  type CityImportExportDiagnostics
} from '../city/data-contracts/import-export';
import { validateTrafficPlan } from '../city/data-contracts/validation/validateTrafficPlan';
import {
  createStaticPerformanceDiagnostics,
  type StaticPerformanceDiagnostics
} from '../systems/performance/PerformanceMonitor';
import type { CityConfig, GeneratedCity, GeneratedRuntimeCityObject, TrafficPlan } from '../types/city';

export interface CityDiagnostics {
  readonly schemaVersion: string;
  readonly config: ConfigDiagnostics;
  readonly validation: GeneratedCity['validation'];
  readonly validationIssueFocus: {
    readonly issuesWithFocus: number;
    readonly issuesWithAffectedBoundary: number;
    readonly issuesWithSuggestedFix: number;
  };
  readonly trafficValidation: GeneratedCity['validation'];
  readonly objectIndex: CityObjectIndex<GeneratedRuntimeCityObject>;
  readonly objectRegistry: CityObjectRegistryDiagnostics;
  readonly geospatial: GeneratedCity['geospatial'];
  readonly sourceMetadata: {
    readonly objectsWithMetadata: number;
    readonly objectsMissingMetadata: number;
    readonly objectsRequiringReview: number;
    readonly sourceTypes: Readonly<Record<SourceType, number>>;
  };
  readonly assetCatalog: GeneratedCity['assetCatalog'];
  readonly assetBindings: GeneratedCity['assetBindings'];
  readonly assetBindingDiagnostics: AssetBindingDiagnostics;
  readonly importExport: CityImportExportDiagnostics;
  readonly sceneLayers: readonly CitySceneLayerDiagnostics[];
  readonly overlays: readonly CityOverlayDataset[];
  readonly picking: CityPickingCatalog;
  readonly performance: StaticPerformanceDiagnostics;
  readonly lodPolicy: GeneratedCity['lodPolicy'];
  readonly lodCoverage: CityLodPolicyDiagnostics;
  readonly objectCounts: {
    readonly sceneLayers: number;
    readonly overlayDatasets: number;
    readonly overlayFeatures: number;
    readonly pickableObjects: number;
    readonly assetDefinitions: number;
    readonly renderBindings: number;
    readonly districts: number;
    readonly verticalSlices: number;
    readonly blocks: number;
    readonly roads: number;
    readonly intersections: number;
    readonly crossings: number;
    readonly curbZones: number;
    readonly sidewalkGraphNodes: number;
    readonly sidewalkGraphEdges: number;
    readonly lanes: number;
    readonly sidewalks: number;
    readonly parcels: number;
    readonly buildings: number;
    readonly activeFrontages: number;
    readonly parks: number;
    readonly waterways: number;
    readonly trees: number;
    readonly parkTrees: number;
    readonly streetTrees: number;
    readonly streetLights: number;
    readonly streetFurniture: number;
    readonly laneMarkings: number;
    readonly trafficVehicles: number;
    readonly indexedObjects: number;
    readonly duplicateObjectIds: number;
    readonly registeredObjectKinds: number;
  };
  readonly performanceBudget: GeneratedCity['performanceBudget'];
  readonly quality: {
    readonly maxPixelRatio: number;
    readonly shadows: boolean;
  };
}

export function createCityDiagnostics(
  city: GeneratedCity,
  traffic: TrafficPlan,
  renderConfig: RenderConfig,
  activeCityConfig: CityConfig = defaultCityConfig
): CityDiagnostics {
  const objectIndex = createGeneratedRuntimeObjectIndex(city, traffic);
  const sceneLayers = createCitySceneLayerDiagnostics(city, traffic);
  const overlays = createCityOverlayDatasets(city, objectIndex);
  const picking = createCityPickingMetadataCatalog(city, traffic, objectIndex);
  const performance = createStaticPerformanceDiagnostics(city.performanceBudget, traffic.vehicles.length);
  const objectRegistry = createCityObjectRegistryDiagnostics();
  const trafficValidation = validateTrafficPlan({
    roads: city.roads,
    crossings: city.crossings,
    intersections: city.intersections,
    assetBindings: city.assetBindings,
    traffic,
    lodPolicy: city.lodPolicy
  });
  const sourceMetadata = createSourceMetadataDiagnostics(objectIndex);
  const lodCoverage = createCityLodPolicyDiagnostics(city.lodPolicy, objectIndex.objects);
  const assetBindingDiagnostics = createAssetBindingDiagnostics(city.assetCatalog, city.assetBindings);
  const config = createConfigDiagnostics(activeCityConfig, renderConfig);
  const importExport = createCityImportExportDiagnostics(city, {
    seed: activeCityConfig.seed,
    config: activeCityConfig
  });

  return {
    schemaVersion: city.schemaVersion,
    config,
    validation: city.validation,
    validationIssueFocus: createValidationIssueFocusDiagnostics(city.validation.issues),
    trafficValidation,
    objectIndex,
    objectRegistry,
    geospatial: city.geospatial,
    sourceMetadata,
    assetCatalog: city.assetCatalog,
    assetBindings: city.assetBindings,
    assetBindingDiagnostics,
    importExport,
    sceneLayers,
    overlays,
    picking,
    performance,
    lodPolicy: city.lodPolicy,
    lodCoverage,
    objectCounts: {
      sceneLayers: sceneLayers.length,
      overlayDatasets: overlays.length,
      overlayFeatures: overlays.reduce((sum, overlay) => sum + overlay.featureCount, 0),
      pickableObjects: picking.pickableObjects.length,
      assetDefinitions: city.assetCatalog.length,
      renderBindings: city.assetBindings.length,
      districts: city.districts.length,
      verticalSlices: city.verticalSlices.length,
      blocks: city.blocks.length,
      roads: city.roads.length,
      intersections: city.intersections.length,
      crossings: city.crossings.length,
      curbZones: city.curbZones.length,
      sidewalkGraphNodes: city.sidewalkGraph.nodes.length,
      sidewalkGraphEdges: city.sidewalkGraph.edges.length,
      lanes: objectIndex.countsByKind.lane ?? 0,
      sidewalks: objectIndex.countsByKind.sidewalk ?? 0,
      parcels: city.parcels.length,
      buildings: city.buildings.length,
      activeFrontages: city.activeFrontages.length,
      parks: city.parks.length,
      waterways: city.waterways.length,
      trees: city.trees.length,
      parkTrees: city.trees.filter((tree) => tree.plantingContext === 'park').length,
      streetTrees: city.trees.filter((tree) => tree.plantingContext === 'street').length,
      streetLights: city.streetLights.length,
      streetFurniture: city.streetFurniture.length,
      laneMarkings: objectIndex.countsByKind['lane-marking'] ?? 0,
      trafficVehicles: objectIndex.countsByKind['traffic-vehicle'] ?? 0,
      indexedObjects: objectIndex.objectIds.length,
      duplicateObjectIds: objectIndex.duplicateIds.length,
      registeredObjectKinds: objectRegistry.registeredKinds
    },
    performanceBudget: city.performanceBudget,
    quality: {
      maxPixelRatio: renderConfig.maxPixelRatio,
      shadows: renderConfig.shadows
    }
  };
}

function createValidationIssueFocusDiagnostics(
  issues: GeneratedCity['validation']['issues']
): CityDiagnostics['validationIssueFocus'] {
  return {
    issuesWithFocus: issues.filter((issue) => issue.affectedPoint || issue.affectedBoundary).length,
    issuesWithAffectedBoundary: issues.filter((issue) => issue.affectedBoundary).length,
    issuesWithSuggestedFix: issues.filter((issue) => issue.suggestedFix).length
  };
}

function createSourceMetadataDiagnostics(
  objectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityDiagnostics['sourceMetadata'] {
  const sourceTypes: Record<SourceType, number> = {
    procedural: 0,
    authored: 0,
    imported: 0,
    simulated: 0
  };
  let objectsWithMetadata = 0;
  let objectsRequiringReview = 0;

  for (const object of objectIndex.objects) {
    if (!object.metadata) {
      continue;
    }

    objectsWithMetadata += 1;
    sourceTypes[object.metadata.sourceType] += 1;

    if (object.metadata.reviewStatus !== 'reviewed' && object.metadata.reviewStatus !== 'generated') {
      objectsRequiringReview += 1;
    }
  }

  return {
    objectsWithMetadata,
    objectsMissingMetadata: objectIndex.objects.length - objectsWithMetadata,
    objectsRequiringReview,
    sourceTypes
  };
}
