import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

test('renders a nonblank WebGL city scene', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.sceneReady === 'true');

  await expect(page.locator('body')).toHaveAttribute('data-scene-validation-status', 'passed');
  await expect(page.locator('body')).toHaveAttribute('data-scene-validation-issues', '0');
  await expect
    .poll(() =>
      page.evaluate(() => ({
        validationPassed: window.cityDiagnostics?.validation.passed,
        configValidationPassed: window.cityDiagnostics?.config.validation.passed,
        configSchemaVersion: window.cityDiagnostics?.config.schemaVersion,
        configQualityPreset: window.cityDiagnostics?.config.city.qualityPreset,
        configTrafficDensity: window.cityDiagnostics?.config.city.density.trafficDensity,
        configPropDensity: window.cityDiagnostics?.config.city.density.propDensity,
        renderQualityPreset: window.cityDiagnostics?.config.render.qualityPreset,
        masterPlanValidationPassed: window.cityDiagnostics?.masterPlan.validation.passed,
        masterPlanCenters: window.cityDiagnostics?.objectCounts.masterPlanCenters,
        masterPlanProtectedOpenSpaces: window.cityDiagnostics?.objectCounts.masterPlanProtectedOpenSpaces,
        masterPlanGrowthBoundaries: window.cityDiagnostics?.objectCounts.masterPlanGrowthBoundaries,
        masterPlanCityForm: window.cityDiagnostics?.masterPlan.cityFormKind,
        districtCharacterRules: window.cityDiagnostics?.districtCharacter.districtRules,
        districtUseMixRules: window.cityDiagnostics?.objectCounts.districtUseMixRules,
        districtLandmarkTargets: window.cityDiagnostics?.objectCounts.districtLandmarkTargets,
        districtTransitionBuffers: window.cityDiagnostics?.objectCounts.districtTransitionBuffers,
        districtStylePalettes: window.cityDiagnostics?.objectCounts.districtStylePalettes,
        cityMetrics: window.cityDiagnostics?.objectCounts.cityMetrics,
        cityMetricsPassing: window.cityDiagnostics?.cityMetrics.passing,
        cityMetricsWarnings: window.cityDiagnostics?.cityMetrics.warnings,
        cityMetricWalkability: window.cityDiagnostics?.cityMetrics.valuesByKind.walkability,
        cityMetricDensity: window.cityDiagnostics?.cityMetrics.valuesByKind.density,
        waterwayEdgeSegments: window.cityDiagnostics?.objectCounts.waterwayEdgeSegments,
        waterwayChannels: window.cityDiagnostics?.objectCounts.waterwayChannels,
        waterwayCrossings: window.cityDiagnostics?.objectCounts.waterwayCrossings,
        waterwayCulverts: window.cityDiagnostics?.objectCounts.waterwayCulverts,
        waterwayDocks: window.cityDiagnostics?.objectCounts.waterwayDocks,
        waterwayOutfalls: window.cityDiagnostics?.objectCounts.waterwayOutfalls,
        waterwayContinuousEdges: window.cityDiagnostics?.waterwayNetwork.continuousEdgeWaterways,
        waterfrontEdges: window.cityDiagnostics?.objectCounts.waterfrontEdges,
        waterfrontPublicAccessEdges: window.cityDiagnostics?.objectCounts.waterfrontPublicAccessEdges,
        waterfrontFloodProtectionEdges: window.cityDiagnostics?.objectCounts.waterfrontFloodProtectionEdges,
        waterfrontPiers: window.cityDiagnostics?.objectCounts.waterfrontPiers,
        waterfrontModelTotal: window.cityDiagnostics?.waterfrontModel.total,
        waterfrontOverlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'waterfront')
          ?.featureCount,
        hazardZones: window.cityDiagnostics?.objectCounts.hazardZones,
        criticalHazards: window.cityDiagnostics?.objectCounts.criticalHazards,
        noBuildHazards: window.cityDiagnostics?.objectCounts.noBuildHazards,
        mitigationHazards: window.cityDiagnostics?.objectCounts.mitigationHazards,
        hazardOverlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'hazards')
          ?.featureCount,
        administrativeBoundaries: window.cityDiagnostics?.objectCounts.administrativeBoundaries,
        wards: window.cityDiagnostics?.objectCounts.wards,
        neighborhoods: window.cityDiagnostics?.objectCounts.neighborhoods,
        constraints: window.cityDiagnostics?.objectCounts.constraints,
        resilienceGoals: window.cityDiagnostics?.objectCounts.resilienceGoals,
        resilienceCriticalGoals: window.cityDiagnostics?.resilienceGoals.criticalGoals,
        resilienceShelterCandidates: window.cityDiagnostics?.resilienceGoals.shelterCandidates,
        constraintNoBuildRules: window.cityDiagnostics?.constraintLayer.noBuildRules,
        validationIssuesWithFocus: window.cityDiagnostics?.validationIssueFocus.issuesWithFocus,
        validationIssuesWithSuggestedFix: window.cityDiagnostics?.validationIssueFocus.issuesWithSuggestedFix,
        trafficValidationPassed: window.cityDiagnostics?.trafficValidation.passed,
        sceneLayers: window.cityDiagnostics?.objectCounts.sceneLayers,
        sceneLayerIds: window.cityDiagnostics?.sceneLayers.map((layer) => layer.id).join(','),
        networkLayerObjects: window.cityDiagnostics?.sceneLayers.find((layer) => layer.id === 'networks')?.objectCount,
        agentLayerObjects: window.cityDiagnostics?.sceneLayers.find((layer) => layer.id === 'agents')?.objectCount,
        overlayDatasets: window.cityDiagnostics?.objectCounts.overlayDatasets,
        overlayFeatures: window.cityDiagnostics?.objectCounts.overlayFeatures,
        overlayIds: window.cityDiagnostics?.overlays.map((overlay) => overlay.id).join(','),
        validationOverlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'validation-issues')
          ?.featureCount,
        ownerDomainOverlayFeatures: window.cityDiagnostics?.overlays.find((overlay) => overlay.id === 'owner-domains')
          ?.featureCount,
        pickableObjects: window.cityDiagnostics?.objectCounts.pickableObjects,
        firstBuildingPickMetadataParcel: window.cityDiagnostics?.picking.pickableObjects.find(
          (metadata) => metadata.kind === 'building'
        )?.references.parcelId,
        roadPickMetadataLayer: window.cityDiagnostics?.picking.metadataByObjectId['road-v-0']?.ownerDomain,
        performanceBaselineStatus: window.cityDiagnostics?.performance.budget.status,
        performanceBaselineAgents: window.cityDiagnostics?.performance.agents.active,
        runtimeLayerNames: (
          window.cityApp as unknown as { city?: { group: { children: { name: string }[] } } }
        ).city?.group.children.map((child) => child.name).join(','),
        roads: window.cityDiagnostics?.objectCounts.roads,
        verticalSlices: window.cityDiagnostics?.objectCounts.verticalSlices,
        detailedStreetSliceId: window.cityDiagnostics?.objectIndex.objectsById['slice-detailed-street-road-v-6']?.id,
        detailedStreetSliceRoad: (
          window.cityDiagnostics?.objectIndex.objectsById['slice-detailed-street-road-v-6'] as
            | { corridorRoadId?: string }
            | undefined
        )?.corridorRoadId,
        intersections: window.cityDiagnostics?.objectCounts.intersections,
        crossings: window.cityDiagnostics?.objectCounts.crossings,
        midblockCrossings: window.cityDiagnostics?.objectCounts.midblockCrossings,
        raisedCrossings: window.cityDiagnostics?.objectCounts.raisedCrossings,
        tactileCrossings: window.cityDiagnostics?.objectCounts.tactileCrossings,
        crossingRefugeIslands: window.cityDiagnostics?.objectCounts.crossingRefugeIslands,
        crossingSignalPhases: window.cityDiagnostics?.objectCounts.crossingSignalPhases,
        continentalCrossings: window.cityDiagnostics?.crossingDetails.byType.continental,
        raisedTableCrossings: window.cityDiagnostics?.crossingDetails.byType['raised-table'],
        pedestrianPriorityCrossings: window.cityDiagnostics?.crossingDetails.byPriority['pedestrian-priority'],
        curbZones: window.cityDiagnostics?.objectCounts.curbZones,
        trafficCalmingDevices: window.cityDiagnostics?.objectCounts.trafficCalmingDevices,
        curbExtensions: window.cityDiagnostics?.objectCounts.curbExtensions,
        busBulbs: window.cityDiagnostics?.objectCounts.busBulbs,
        speedTables: window.cityDiagnostics?.objectCounts.speedTables,
        trafficCalmingMinimumSpeed: window.cityDiagnostics?.trafficCalming.minimumTargetSpeedKph,
        sidewalkGraphNodes: window.cityDiagnostics?.objectCounts.sidewalkGraphNodes,
        sidewalkGraphEdges: window.cityDiagnostics?.objectCounts.sidewalkGraphEdges,
        buildings: window.cityDiagnostics?.objectCounts.buildings,
        activeFrontages: window.cityDiagnostics?.objectCounts.activeFrontages,
        trees: window.cityDiagnostics?.objectCounts.trees,
        parkTrees: window.cityDiagnostics?.objectCounts.parkTrees,
        streetTrees: window.cityDiagnostics?.objectCounts.streetTrees,
        streetLights: window.cityDiagnostics?.objectCounts.streetLights,
        streetFurniture: window.cityDiagnostics?.objectCounts.streetFurniture,
        assetDefinitions: window.cityDiagnostics?.objectCounts.assetDefinitions,
        renderBindings: window.cityDiagnostics?.objectCounts.renderBindings,
        bindingsWithAssets: window.cityDiagnostics?.assetBindingDiagnostics.bindingsWithAssets,
        bindingsMissingAssets: window.cityDiagnostics?.assetBindingDiagnostics.bindingsMissingAssets,
        bindingsWithFallbacks: window.cityDiagnostics?.assetBindingDiagnostics.bindingsWithFallbacks,
        bindingsMissingFallbacks: window.cityDiagnostics?.assetBindingDiagnostics.bindingsMissingFallbacks,
        unboundAssetDefinitions: window.cityDiagnostics?.assetBindingDiagnostics.unboundAssetDefinitions,
        importExportFormats: window.cityDiagnostics?.importExport.supportedFormatCount,
        importExportProceduralObjects: window.cityDiagnostics?.importExport.proceduralSeedExport.objectCount,
        importExportJsonSerializable: window.cityDiagnostics?.importExport.proceduralSeedExport.jsonSerializable,
        importExportRendererOnlyFields:
          window.cityDiagnostics?.importExport.proceduralSeedExport.rendererOnlyFieldCount,
        objectGroups: window.cityDiagnostics?.objectCounts.objectGroups,
        emptyObjectGroups: window.cityDiagnostics?.objectCounts.emptyObjectGroups,
        objectGroupValidationPassed: window.cityDiagnostics?.objectGroups.validation.passed,
        objectGroupMissingReferences: window.cityDiagnostics?.objectGroups.missingObjectReferences,
        ownerDomainGroups: window.cityDiagnostics?.objectGroups.countsByKind['owner-domain'],
        renderLayerGroups: window.cityDiagnostics?.objectGroups.countsByKind['render-layer'],
        networkRenderLayerObjects:
          window.cityDiagnostics?.objectGroupIndex.groupsById['group:render-layer:networks']?.objectCount,
        baselineScenarioObjects:
          window.cityDiagnostics?.objectGroupIndex.groupsById['group:scenario-layer:baseline']?.objectCount,
        registeredObjectKinds: window.cityDiagnostics?.objectCounts.registeredObjectKinds,
        registryKinds: window.cityDiagnostics?.objectRegistry.registeredKinds,
        geospatialUnit: window.cityDiagnostics?.geospatial.unit,
        geospatialCoordinateSystem: window.cityDiagnostics?.geospatial.coordinateSystem,
        geospatialOriginId: window.cityDiagnostics?.geospatial.originMetadata.id,
        geospatialPrecision: window.cityDiagnostics?.geospatial.precision.coordinatePrecisionMeters,
        heightDatum: window.cityDiagnostics?.geospatial.heightDatum.id,
        importProjectionStatus: window.cityDiagnostics?.geospatial.importProjection.status,
        metadataTaggedObjects: window.cityDiagnostics?.sourceMetadata.objectsWithMetadata,
        metadataMissingObjects: window.cityDiagnostics?.sourceMetadata.objectsMissingMetadata,
        metadataProceduralObjects: window.cityDiagnostics?.sourceMetadata.sourceTypes.procedural,
        metadataSimulatedObjects: window.cityDiagnostics?.sourceMetadata.sourceTypes.simulated,
        lodPolicyTiers: window.cityDiagnostics?.lodCoverage.tierCount,
        lodObjectPolicies: window.cityDiagnostics?.lodCoverage.objectPolicyCount,
        lodObjectsWithPolicy: window.cityDiagnostics?.lodCoverage.objectsWithPolicy,
        lodObjectsWithoutPolicy: window.cityDiagnostics?.lodCoverage.objectsWithoutPolicy,
        lodUnsupportedObjects: window.cityDiagnostics?.lodCoverage.objectsWithUnsupportedTier,
        trafficVehicles: window.cityDiagnostics?.objectCounts.trafficVehicles,
        duplicateObjectIds: window.cityDiagnostics?.objectCounts.duplicateObjectIds,
        lanes: window.cityDiagnostics?.objectCounts.lanes,
        sidewalks: window.cityDiagnostics?.objectCounts.sidewalks,
        laneMarkings: window.cityDiagnostics?.objectCounts.laneMarkings,
        firstIntersectionRoads: (
          window.cityDiagnostics?.objectIndex.objectsById['intersection-v0-h0'] as
            | { connectedRoadIds?: readonly string[] }
            | undefined
        )?.connectedRoadIds?.join(','),
        firstCrossingSidewalks: (
          window.cityDiagnostics?.objectIndex.objectsById['crossing-intersection-v0-h0-road-v-0'] as
            | { connectedSidewalkIds?: readonly string[] }
            | undefined
        )?.connectedSidewalkIds?.join(','),
        roadLaneParent: window.cityDiagnostics?.objectIndex.objectsById['road-v-0-lane-0']?.parentId,
        trafficVehicleKind: window.cityDiagnostics?.objectIndex.objectsById['traffic-vehicle-0']?.kind,
        trafficVehicleLane: (
          window.cityDiagnostics?.objectIndex.objectsById['traffic-vehicle-0'] as
            | { laneId?: string }
            | undefined
        )?.laneId,
        trafficVehicleRouteNodes: (
          window.cityDiagnostics?.objectIndex.objectsById['traffic-vehicle-0'] as
            | { route?: { nodeIds?: readonly string[] } }
            | undefined
        )?.route?.nodeIds?.length,
        vehicleFallbackGeometry: window.cityDiagnostics?.assetBindings.find(
          (binding) => binding.id === 'binding:vehicle:traffic-car'
        )?.fallbackGeometry,
        storefrontFallbackGeometry: window.cityDiagnostics?.assetBindings.find(
          (binding) => binding.id === 'binding:facade:storefront-window'
        )?.fallbackGeometry,
        trafficVehicleParentResolves: Boolean(
          window.cityDiagnostics?.objectIndex.objectsById[
            window.cityDiagnostics.objectIndex.objectsById['traffic-vehicle-0']?.parentId ?? ''
          ]
        )
      }))
    )
    .toEqual({
      validationPassed: true,
      configValidationPassed: true,
      configSchemaVersion: 'city-config-schema-v1',
      configQualityPreset: 'medium',
      configTrafficDensity: 0.42,
      configPropDensity: 0.68,
      renderQualityPreset: 'medium',
      masterPlanValidationPassed: true,
      masterPlanCenters: 4,
      masterPlanProtectedOpenSpaces: 3,
      masterPlanGrowthBoundaries: 3,
      masterPlanCityForm: 'river-coastal-polycentric-grid',
      districtCharacterRules: 5,
      districtUseMixRules: 17,
      districtLandmarkTargets: 5,
      districtTransitionBuffers: 14,
      districtStylePalettes: 5,
      cityMetrics: 8,
      cityMetricsPassing: 6,
      cityMetricsWarnings: 2,
      cityMetricWalkability: 96.02,
      cityMetricDensity: 2029.27,
      waterwayEdgeSegments: 8,
      waterwayChannels: 3,
      waterwayCrossings: 13,
      waterwayCulverts: 8,
      waterwayDocks: 3,
      waterwayOutfalls: 4,
      waterwayContinuousEdges: 1,
      waterfrontEdges: 11,
      waterfrontPublicAccessEdges: 6,
      waterfrontFloodProtectionEdges: 4,
      waterfrontPiers: 3,
      waterfrontModelTotal: 11,
      waterfrontOverlayFeatures: 11,
      hazardZones: 6,
      criticalHazards: 1,
      noBuildHazards: 2,
      mitigationHazards: 6,
      hazardOverlayFeatures: 6,
      administrativeBoundaries: 18,
      wards: 4,
      neighborhoods: 5,
      constraints: 11,
      resilienceGoals: 7,
      resilienceCriticalGoals: 3,
      resilienceShelterCandidates: 3,
      constraintNoBuildRules: 3,
      validationIssuesWithFocus: 0,
      validationIssuesWithSuggestedFix: 0,
      trafficValidationPassed: true,
      sceneLayers: 6,
      sceneLayerIds: 'terrain,networks,buildings,public-realm,agents,overlays',
      networkLayerObjects: 988,
      agentLayerObjects: 7,
      overlayDatasets: 13,
      overlayFeatures: 5613,
      overlayIds: 'administrative-boundaries,districts,zoning,waterways,waterfront,hazards,city-metrics,constraints,resilience-goals,parcels,roads,validation-issues,owner-domains',
      validationOverlayFeatures: 0,
      ownerDomainOverlayFeatures: 4893,
      pickableObjects: 1760,
      firstBuildingPickMetadataParcel: expect.stringMatching(/^parcel-/),
      roadPickMetadataLayer: 'mobility',
      performanceBaselineStatus: 'pass',
      performanceBaselineAgents: 7,
      runtimeLayerNames:
        'SceneLayer:terrain,SceneLayer:networks,SceneLayer:buildings,SceneLayer:public-realm,SceneLayer:agents,SceneLayer:overlays',
      roads: 26,
      verticalSlices: 1,
      detailedStreetSliceId: 'slice-detailed-street-road-v-6',
      detailedStreetSliceRoad: 'road-v-6',
      intersections: 169,
      crossings: 340,
      midblockCrossings: 2,
      raisedCrossings: 106,
      tactileCrossings: 340,
      crossingRefugeIslands: 130,
      crossingSignalPhases: 210,
      continentalCrossings: 130,
      raisedTableCrossings: 106,
      pedestrianPriorityCrossings: 18,
      curbZones: 50,
      trafficCalmingDevices: 12,
      curbExtensions: 2,
      busBulbs: 2,
      speedTables: 2,
      trafficCalmingMinimumSpeed: 15,
      sidewalkGraphNodes: 680,
      sidewalkGraphEdges: 964,
      buildings: 583,
      activeFrontages: 44,
      trees: 53,
      parkTrees: 29,
      streetTrees: 24,
      streetLights: 12,
      streetFurniture: 58,
      assetDefinitions: 32,
      renderBindings: 32,
      bindingsWithAssets: 32,
      bindingsMissingAssets: 0,
      bindingsWithFallbacks: 32,
      bindingsMissingFallbacks: 0,
      unboundAssetDefinitions: 0,
      importExportFormats: 6,
      importExportProceduralObjects: 3936,
      importExportJsonSerializable: true,
      importExportRendererOnlyFields: 0,
      objectGroups: 32,
      emptyObjectGroups: 9,
      objectGroupValidationPassed: true,
      objectGroupMissingReferences: 0,
      ownerDomainGroups: 13,
      renderLayerGroups: 6,
      networkRenderLayerObjects: 988,
      baselineScenarioObjects: 4893,
      registeredObjectKinds: 35,
      registryKinds: 35,
      geospatialUnit: 'meter',
      geospatialCoordinateSystem: 'local-xz',
      geospatialOriginId: 'local-origin-detailed-city-v1',
      geospatialPrecision: 0.01,
      heightDatum: 'local-ground-plane',
      importProjectionStatus: 'not-configured',
      metadataTaggedObjects: 4893,
      metadataMissingObjects: 0,
      metadataProceduralObjects: 4886,
      metadataSimulatedObjects: 7,
      lodPolicyTiers: 5,
      lodObjectPolicies: 35,
      lodObjectsWithPolicy: 4893,
      lodObjectsWithoutPolicy: 0,
      lodUnsupportedObjects: 0,
      trafficVehicles: 7,
      duplicateObjectIds: 0,
      lanes: 72,
      sidewalks: 52,
      laneMarkings: 950,
      firstIntersectionRoads: 'road-v-0,road-h-0',
      firstCrossingSidewalks: 'road-v-0-sidewalk-left,road-v-0-sidewalk-right',
      roadLaneParent: 'road-v-0',
      trafficVehicleKind: 'traffic-vehicle',
      trafficVehicleLane: 'road-v-0-lane-1',
      trafficVehicleRouteNodes: 13,
      vehicleFallbackGeometry: 'vehicle-box',
      storefrontFallbackGeometry: 'storefront-window-box',
      trafficVehicleParentResolves: true
    });

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const screenshot = await page.screenshot({ fullPage: false });
  const png = PNG.sync.read(screenshot);
  let variedPixels = 0;

  for (let y = 0; y < png.height; y += 4) {
    for (let x = 0; x < png.width; x += 4) {
      const offset = (png.width * y + x) * 4;
      const red = png.data[offset];
      const green = png.data[offset + 1];
      const blue = png.data[offset + 2];
      const alpha = png.data[offset + 3];
      const brightness = red + green + blue;
      const channelSpread = Math.max(red, green, blue) - Math.min(red, green, blue);

      if (alpha > 0 && brightness > 45 && channelSpread > 5) {
        variedPixels += 1;
      }
    }
  }

  expect(variedPixels, `${testInfo.project.name} should render visible nonbackground pixels`).toBeGreaterThan(800);
});
