import type { AssetDefinition, CityId, CityObjectKind, RenderBinding } from '../../data-contracts/cityContracts';
import {
  createMaterialZoneDiagnostics,
  type MaterialZoneDiagnostics
} from '../material-zones/materialZoneDefinitions';

export interface AssetBindingDiagnostics {
  readonly assetDefinitions: number;
  readonly renderBindings: number;
  readonly bindingsWithAssets: number;
  readonly bindingsMissingAssets: number;
  readonly bindingsWithFallbacks: number;
  readonly bindingsMissingFallbacks: number;
  readonly unboundAssetDefinitions: number;
  readonly renderableObjectKinds: readonly CityObjectKind[];
  readonly materialZones: readonly string[];
  readonly materialZoneRegistry: MaterialZoneDiagnostics;
  readonly semanticTags: readonly string[];
}

export function createAssetBindingDiagnostics(
  assetCatalog: readonly AssetDefinition[],
  assetBindings: readonly RenderBinding[]
): AssetBindingDiagnostics {
  const assetIds = new Set(assetCatalog.map((asset) => asset.id));
  const boundAssetIds = new Set<CityId>();
  const renderableObjectKinds = new Set<CityObjectKind>();
  const materialZones = new Set<string>();
  const semanticTags = new Set<string>();
  let bindingsWithAssets = 0;
  let bindingsMissingAssets = 0;
  let bindingsWithFallbacks = 0;
  let bindingsMissingFallbacks = 0;

  for (const binding of assetBindings) {
    renderableObjectKinds.add(binding.objectKind);

    if (binding.materialZone) {
      materialZones.add(binding.materialZone);
    }

    if (binding.semanticTag) {
      semanticTags.add(binding.semanticTag);
    }

    if (binding.assetId) {
      if (assetIds.has(binding.assetId)) {
        boundAssetIds.add(binding.assetId);
        bindingsWithAssets += 1;
      } else {
        bindingsMissingAssets += 1;
      }
    }

    if (binding.fallbackMaterial && binding.fallbackGeometry) {
      bindingsWithFallbacks += 1;
    } else {
      bindingsMissingFallbacks += 1;
    }
  }

  return {
    assetDefinitions: assetCatalog.length,
    renderBindings: assetBindings.length,
    bindingsWithAssets,
    bindingsMissingAssets,
    bindingsWithFallbacks,
    bindingsMissingFallbacks,
    unboundAssetDefinitions: assetCatalog.filter((asset) => !boundAssetIds.has(asset.id)).length,
    renderableObjectKinds: [...renderableObjectKinds].sort(),
    materialZones: [...materialZones].sort(),
    materialZoneRegistry: createMaterialZoneDiagnostics(assetCatalog, assetBindings),
    semanticTags: [...semanticTags].sort()
  };
}
