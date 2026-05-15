import type {
  CityId,
  CityObjectBase,
  CityObjectIndex,
  CityObjectKind,
  Point2D,
  Polygon2D,
  Polyline2D,
  ValidationIssue,
  ValidationSeverity
} from '../../data-contracts/cityContracts';
import type { CityPlanningLayer } from '../../cityPlan';
import type { GeneratedCity, GeneratedRuntimeCityObject } from '../../../types/city';

export type CityOverlayId =
  | 'administrative-boundaries'
  | 'districts'
  | 'zoning'
  | 'waterways'
  | 'waterfront'
  | 'hazards'
  | 'topography'
  | 'soil-geology'
  | 'phasing'
  | 'weather-presets'
  | 'solar-shading'
  | 'urban-heat'
  | 'city-metrics'
  | 'cycling-network'
  | 'navigation-graphs'
  | 'freight-logistics'
  | 'asset-inventory'
  | 'civic-anchors'
  | 'community-anchors'
  | 'culture-anchors'
  | 'government-anchors'
  | 'building-access'
  | 'addressing-gazetteer'
  | 'access-controls'
  | 'public-lighting'
  | 'signage-wayfinding'
  | 'green-stormwater'
  | 'constraints'
  | 'resilience-goals'
  | 'service-access'
  | 'thermal-service'
  | 'thermal-outages'
  | 'parcels'
  | 'roads'
  | 'validation-issues'
  | 'owner-domains';

export type CityOverlayGeometry =
  | { readonly type: 'none' }
  | { readonly type: 'point'; readonly point: Point2D }
  | { readonly type: 'polyline'; readonly points: Polyline2D }
  | { readonly type: 'polygon'; readonly points: Polygon2D };

export interface CityOverlayFeature {
  readonly id: string;
  readonly overlayId: CityOverlayId;
  readonly objectId?: CityId;
  readonly objectKind?: CityObjectKind;
  readonly ownerDomain?: CityPlanningLayer;
  readonly label: string;
  readonly geometry: CityOverlayGeometry;
  readonly severity?: ValidationSeverity;
  readonly category?: ValidationIssue['category'];
  readonly focus?: {
    readonly objectId?: CityId;
    readonly point?: Point2D;
    readonly boundary?: Polygon2D;
    readonly suggestedFix?: string;
  };
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface CityOverlayDataset {
  readonly id: CityOverlayId;
  readonly name: string;
  readonly ownerDomain: 'rendering-handoff';
  readonly source: 'domain-data' | 'validation';
  readonly featureCount: number;
  readonly features: readonly CityOverlayFeature[];
}

export function createCityOverlayDatasets(
  city: GeneratedCity,
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): readonly CityOverlayDataset[] {
  return [
    createDataset('administrative-boundaries', 'Administrative Boundaries', 'domain-data', createAdministrativeBoundaryFeatures(city)),
    createDataset('districts', 'Districts', 'domain-data', createDistrictFeatures(city)),
    createDataset('zoning', 'Zoning', 'domain-data', createZoningFeatures(city)),
    createDataset('waterways', 'Waterways', 'domain-data', createWaterwayFeatures(city)),
    createDataset('waterfront', 'Waterfront', 'domain-data', createWaterfrontFeatures(city)),
    createDataset('hazards', 'Hazards', 'domain-data', createHazardFeatures(city)),
    createDataset('topography', 'Topography', 'domain-data', createTopographyFeatures(city)),
    createDataset('soil-geology', 'Soil Geology', 'domain-data', createSoilGeologyFeatures(city)),
    createDataset('phasing', 'Phasing', 'domain-data', createDevelopmentPhaseFeatures(city)),
    createDataset('weather-presets', 'Weather Presets', 'domain-data', createWeatherPresetFeatures(city)),
    createDataset('solar-shading', 'Solar Shading', 'domain-data', createSolarShadingFeatures(city)),
    createDataset('urban-heat', 'Urban Heat', 'domain-data', createUrbanHeatFeatures(city)),
    createDataset('city-metrics', 'City Metrics', 'domain-data', createCityMetricFeatures(city)),
    createDataset('cycling-network', 'Cycling Network', 'domain-data', createCyclingNetworkFeatures(city)),
    createDataset('navigation-graphs', 'Navigation Graphs', 'domain-data', createNavigationGraphFeatures(city)),
    createDataset('freight-logistics', 'Freight Logistics', 'domain-data', createFreightLogisticsFeatures(city)),
    createDataset('asset-inventory', 'Asset Inventory', 'domain-data', createAssetInventoryFeatures(city)),
    createDataset('civic-anchors', 'Civic Anchors', 'domain-data', createCivicAnchorFeatures(city)),
    createDataset('community-anchors', 'Community Anchors', 'domain-data', createCommunityAnchorFeatures(city)),
    createDataset('culture-anchors', 'Culture Anchors', 'domain-data', createCultureAnchorFeatures(city)),
    createDataset('government-anchors', 'Government Anchors', 'domain-data', createGovernmentAnchorFeatures(city)),
    createDataset('building-access', 'Building Access', 'domain-data', createBuildingAccessFeatures(city)),
    createDataset('addressing-gazetteer', 'Addressing Gazetteer', 'domain-data', createAddressingGazetteerFeatures(city)),
    createDataset('access-controls', 'Access Controls', 'domain-data', createAccessControlFeatures(city)),
    createDataset('public-lighting', 'Public Lighting', 'domain-data', createPublicLightingFeatures(city)),
    createDataset('signage-wayfinding', 'Signage And Wayfinding', 'domain-data', createSignageWayfindingFeatures(city)),
    createDataset('green-stormwater', 'Green Stormwater', 'domain-data', createGreenStormwaterFeatures(city)),
    createDataset('constraints', 'Constraints', 'domain-data', createConstraintFeatures(city)),
    createDataset('resilience-goals', 'Resilience Goals', 'domain-data', createResilienceGoalFeatures(city)),
    createDataset('service-access', 'Service Access', 'domain-data', createServiceAccessFeatures(city)),
    createDataset('thermal-service', 'Thermal Service', 'domain-data', createThermalServiceFeatures(city)),
    createDataset('thermal-outages', 'Thermal Outages', 'domain-data', createThermalOutageFeatures(city)),
    createDataset('parcels', 'Parcels', 'domain-data', createParcelFeatures(city)),
    createDataset('roads', 'Roads', 'domain-data', createRoadFeatures(city)),
    createDataset('validation-issues', 'Validation Issues', 'validation', createValidationIssueFeatures(city, runtimeObjectIndex)),
    createDataset('owner-domains', 'Owner Domains', 'domain-data', createOwnerDomainFeatures(runtimeObjectIndex))
  ];
}

function createDataset(
  id: CityOverlayId,
  name: string,
  source: CityOverlayDataset['source'],
  features: readonly CityOverlayFeature[]
): CityOverlayDataset {
  return {
    id,
    name,
    ownerDomain: 'rendering-handoff',
    source,
    featureCount: features.length,
    features
  };
}

function createAdministrativeBoundaryFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.administrativeBoundaries.map((boundary) => ({
    id: `overlay:administrative-boundaries:${boundary.id}`,
    overlayId: 'administrative-boundaries',
    objectId: boundary.id,
    objectKind: boundary.kind,
    ownerDomain: boundary.ownerDomain,
    label: boundary.name ?? boundary.id,
    geometry: { type: 'polygon', points: boundary.boundary },
    metadata: {
      boundaryKind: boundary.boundaryKind,
      authority: boundary.authority,
      jurisdictionLevel: boundary.jurisdictionLevel,
      ownershipClass: boundary.ownershipClass,
      blocks: boundary.blockIds.length,
      parcels: boundary.parcelIds.length,
      services: boundary.serviceTypes.join(',')
    }
  }));
}

function createDistrictFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.districts.map((district) => ({
    id: `overlay:districts:${district.id}`,
    overlayId: 'districts',
    objectId: district.id,
    objectKind: district.kind,
    ownerDomain: district.ownerDomain,
    label: district.name ?? district.id,
    geometry: { type: 'polygon', points: district.boundary },
    metadata: {
      density: district.density,
      primaryUses: district.primaryUses.join(',')
    }
  }));
}

function createZoningFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.zoningDistricts.map((zoning) => ({
    id: `overlay:zoning:${zoning.id}`,
    overlayId: 'zoning',
    objectId: zoning.id,
    objectKind: zoning.kind,
    ownerDomain: zoning.ownerDomain,
    label: zoning.name ?? zoning.id,
    geometry: { type: 'polygon', points: zoning.boundary },
    metadata: {
      zoningCode: zoning.zoningCode,
      zoningKind: zoning.zoningKind,
      allowedUses: zoning.controls.allowedUses.join(','),
      maxHeightMeters: zoning.controls.maxHeightMeters,
      maxFloorAreaRatio: zoning.controls.maxFloorAreaRatio,
      maxCoverageRatio: zoning.controls.maxCoverageRatio,
      bufferMeters: zoning.controls.bufferMeters,
      frontagePriority: zoning.controls.frontageRules.requiredPriority,
      blocks: zoning.blockIds.length,
      parcels: zoning.parcelIds.length
    }
  }));
}

function createWaterwayFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.waterways.flatMap((waterway) => [
    {
      id: `overlay:waterways:${waterway.id}`,
      overlayId: 'waterways' as const,
      objectId: waterway.id,
      objectKind: waterway.kind,
      ownerDomain: waterway.ownerDomain,
      label: waterway.name ?? waterway.id,
      geometry: { type: 'polygon' as const, points: waterway.boundary },
      metadata: {
        waterwayKind: waterway.waterwayKind,
        lengthMeters: waterway.length,
        widthMeters: waterway.width,
        edgeSegments: waterway.edgeSegments.length,
        channels: waterway.channels.length,
        crossings: waterway.crossingRefs.length,
        culverts: waterway.culverts.length,
        docks: waterway.docks.length,
        outfalls: waterway.outfalls.length
      }
    },
    ...waterway.edgeSegments.map((edgeSegment) => ({
      id: `overlay:waterways:${edgeSegment.id}`,
      overlayId: 'waterways' as const,
      objectId: waterway.id,
      objectKind: waterway.kind,
      ownerDomain: waterway.ownerDomain,
      label: edgeSegment.id,
      geometry: { type: 'polyline' as const, points: edgeSegment.centerline },
      metadata: {
        component: 'edge',
        side: edgeSegment.side,
        edgeKind: edgeSegment.edgeKind,
        lengthMeters: edgeSegment.lengthMeters,
        publicAccess: edgeSegment.publicAccess,
        connectedSegments: edgeSegment.connectedSegmentIds.length,
        districts: edgeSegment.districtIds.join(',')
      }
    })),
    ...waterway.channels.map((channel) => ({
      id: `overlay:waterways:${channel.id}`,
      overlayId: 'waterways' as const,
      objectId: waterway.id,
      objectKind: waterway.kind,
      ownerDomain: waterway.ownerDomain,
      label: channel.id,
      geometry: { type: 'polyline' as const, points: channel.centerline },
      metadata: {
        component: 'channel',
        channelKind: channel.channelKind,
        widthMeters: channel.widthMeters,
        navigable: channel.navigable,
        connectedEdges: channel.connectsToEdgeSegmentIds.length
      }
    })),
    ...waterway.crossingRefs.map((crossing) => ({
      id: `overlay:waterways:${crossing.id}`,
      overlayId: 'waterways' as const,
      objectId: waterway.id,
      objectKind: waterway.kind,
      ownerDomain: waterway.ownerDomain,
      label: crossing.id,
      geometry: { type: 'point' as const, point: crossing.center },
      metadata: {
        component: 'crossing',
        crossingKind: crossing.crossingKind,
        roadId: crossing.roadId,
        clearanceMeters: crossing.clearanceMeters,
        edgeSegments: crossing.edgeSegmentIds.join(',')
      }
    })),
    ...waterway.culverts.map((culvert) => ({
      id: `overlay:waterways:${culvert.id}`,
      overlayId: 'waterways' as const,
      objectId: waterway.id,
      objectKind: waterway.kind,
      ownerDomain: waterway.ownerDomain,
      label: culvert.id,
      geometry: { type: 'point' as const, point: culvert.center },
      metadata: {
        component: 'culvert',
        roadId: culvert.roadId,
        diameterMeters: culvert.diameterMeters,
        outfalls: culvert.outfallIds.join(',')
      }
    })),
    ...waterway.docks.map((dock) => ({
      id: `overlay:waterways:${dock.id}`,
      overlayId: 'waterways' as const,
      objectId: waterway.id,
      objectKind: waterway.kind,
      ownerDomain: waterway.ownerDomain,
      label: dock.id,
      geometry: { type: 'point' as const, point: dock.center },
      metadata: {
        component: 'dock',
        dockUse: dock.use,
        edgeSegmentId: dock.edgeSegmentId,
        lengthMeters: dock.lengthMeters,
        widthMeters: dock.widthMeters,
        accessRoadId: dock.accessRoadId ?? ''
      }
    })),
    ...waterway.outfalls.map((outfall) => ({
      id: `overlay:waterways:${outfall.id}`,
      overlayId: 'waterways' as const,
      objectId: waterway.id,
      objectKind: waterway.kind,
      ownerDomain: waterway.ownerDomain,
      label: outfall.id,
      geometry: { type: 'point' as const, point: outfall.center },
      metadata: {
        component: 'outfall',
        source: outfall.source,
        edgeSegmentId: outfall.edgeSegmentId,
        receivingWaterwayId: outfall.receivingWaterwayId,
        diameterMeters: outfall.diameterMeters
      }
    }))
  ]);
}

function createTopographyFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.topographyZones.map((zone) => ({
    id: `overlay:topography:${zone.id}`,
    overlayId: 'topography',
    objectId: zone.id,
    objectKind: zone.kind,
    ownerDomain: zone.ownerDomain,
    label: zone.name ?? zone.id,
    geometry: { type: 'polygon', points: zone.boundary },
    metadata: {
      zoneKind: zone.zoneKind,
      minElevationMeters: zone.minElevationMeters,
      maxElevationMeters: zone.maxElevationMeters,
      averageElevationMeters: zone.averageElevationMeters,
      slopePercent: zone.slopePercent,
      buildability: zone.buildability,
      retainingCondition: zone.retainingCondition,
      roads: zone.relatedRoadIds.length,
      buildings: zone.relatedBuildingIds.length
    }
  }));
}

function createSoilGeologyFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.soilGeologyZones.map((zone) => ({
    id: `overlay:soil-geology:${zone.id}`,
    overlayId: 'soil-geology',
    objectId: zone.id,
    objectKind: zone.kind,
    ownerDomain: zone.ownerDomain,
    label: zone.name ?? zone.id,
    geometry: { type: 'polygon', points: zone.boundary },
    severity: zone.groundRisk.overall === 'high' || zone.groundRisk.overall === 'critical' ? 'warning' : 'info',
    category: 'land',
    metadata: {
      soilKind: zone.soilKind,
      foundationSuitability: zone.foundationSuitability,
      bearingCapacityKpa: zone.bearingCapacityKpa,
      settlementRisk: zone.settlementRisk,
      tunnelDifficulty: zone.tunnelDifficulty,
      drainageAssumption: zone.drainageAssumption,
      contaminationStatus: zone.contamination.status,
      groundRisk: zone.groundRisk.overall,
      districts: zone.districtIds.length,
      topographyRefs: zone.topographyZoneIds.length,
      hazardRefs: zone.hazardZoneIds.length,
      parcels: zone.parcelIds.length,
      buildings: zone.buildingIds.length
    }
  }));
}

function createDevelopmentPhaseFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.developmentPhases.map((phase) => ({
    id: `overlay:phasing:${phase.id}`,
    overlayId: 'phasing',
    objectId: phase.id,
    objectKind: phase.kind,
    ownerDomain: phase.ownerDomain,
    label: phase.name ?? phase.id,
    geometry: { type: 'polygon', points: phase.boundary },
    severity: phase.status === 'active' ? 'info' : phase.status === 'temporary' ? 'warning' : 'info',
    category: 'metadata',
    metadata: {
      phaseKind: phase.phaseKind,
      status: phase.status,
      sequence: phase.sequence,
      startYear: phase.startYear,
      targetYear: phase.targetYear,
      unlockDependencies: phase.unlocksAfterPhaseIds.length,
      unlockObjects: phase.unlocksObjectIds.length,
      closureRoads: phase.closureRoadIds.length,
      temporaryRoads: phase.temporaryRoadIds.length,
      temporaryParks: phase.temporaryParkIds.length,
      growthBoundaries: phase.masterPlanGrowthBoundaryIds.length,
      simulationScenarios: phase.operationsHooks.simulationScenarioIds.length
    }
  }));
}

function createWaterfrontFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return [
    ...city.waterfrontEdges.map((edge) => ({
      id: `overlay:waterfront:${edge.id}`,
      overlayId: 'waterfront' as const,
      objectId: edge.id,
      objectKind: edge.kind,
      ownerDomain: edge.ownerDomain,
      label: edge.name ?? edge.id,
      geometry: { type: 'polygon' as const, points: edge.boundary },
      metadata: {
        waterfrontKind: edge.waterfrontKind,
        waterwayId: edge.waterwayId,
        waterwayEdgeSegmentId: edge.waterwayEdgeSegmentId ?? '',
        dockId: edge.dockId ?? '',
        publicAccess: edge.publicAccess,
        publicRealmConnections: edge.connectedPublicRealmIds.length,
        roadConnections: edge.connectedRoadIds.length,
        floodProtection: edge.floodProtection.kind,
        materialHint: edge.materialHint,
        lengthMeters: edge.lengthMeters,
        widthMeters: edge.widthMeters
      }
    })),
    ...city.waterfrontOpenSpaces.map((openSpace) => ({
      id: `overlay:waterfront:${openSpace.id}`,
      overlayId: 'waterfront' as const,
      objectId: openSpace.id,
      objectKind: openSpace.kind,
      ownerDomain: openSpace.ownerDomain,
      label: openSpace.name ?? openSpace.id,
      geometry: { type: 'polygon' as const, points: openSpace.boundary },
      metadata: {
        openSpaceKind: openSpace.openSpaceKind,
        waterfrontEdgeId: openSpace.waterfrontEdgeId,
        waterwayId: openSpace.waterwayId,
        surface: openSpace.surface,
        publicAccess: openSpace.publicAccess,
        seatingCapacity: openSpace.seatingCapacity,
        railingLengthMeters: openSpace.railingLengthMeters,
        shadeTrees: openSpace.shadeTreeIds.length,
        nearbyFurniture: openSpace.nearbyFurnitureIds.length,
        waterAccess: Boolean(openSpace.waterAccessPoint),
        eventCapacityPeople: openSpace.comfort.eventCapacityPeople
      }
    }))
  ];
}

function createHazardFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.hazardZones.map((hazard) => ({
    id: `overlay:hazards:${hazard.id}`,
    overlayId: 'hazards',
    objectId: hazard.id,
    objectKind: hazard.kind,
    ownerDomain: hazard.ownerDomain,
    label: hazard.name ?? hazard.id,
    geometry: { type: 'polygon', points: hazard.boundary },
    severity: hazard.severity === 'critical' || hazard.severity === 'high' ? 'warning' : 'info',
    category: 'land',
    metadata: {
      hazardKind: hazard.hazardKind,
      hazardSeverity: hazard.severity,
      affectedKinds: hazard.affectedObjectKinds.join(','),
      prohibitedKinds: hazard.prohibitedObjectKinds.join(','),
      mitigationKinds: hazard.mitigationKinds.join(','),
      relatedConstraints: hazard.relatedConstraintIds.length,
      relatedWaterways: hazard.relatedWaterwayIds.length,
      relatedZoningDistricts: hazard.relatedZoningDistrictIds.length,
      relatedRoads: hazard.relatedRoadIds.length,
      requiresMitigation: hazard.requiresMitigation
    }
  }));
}

function createCityMetricFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.cityMetrics.map((metric) => ({
    id: `overlay:city-metrics:${metric.id}`,
    overlayId: 'city-metrics',
    objectId: metric.id,
    objectKind: metric.kind,
    ownerDomain: metric.ownerDomain,
    label: metric.name ?? metric.id,
    geometry: { type: 'point', point: metric.focusPoint },
    metadata: {
      metricKind: metric.metricKind,
      value: metric.value,
      unit: metric.unit,
      status: metric.status,
      inputs: metric.computedFromObjectIds.length
    }
  }));
}

function createCivicAnchorFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.civicAnchors.map((anchor) => ({
    id: `overlay:civic-anchors:${anchor.id}`,
    overlayId: 'civic-anchors',
    objectId: anchor.id,
    objectKind: anchor.kind,
    ownerDomain: anchor.ownerDomain,
    label: anchor.name ?? anchor.id,
    geometry: { type: 'point', point: anchor.center },
    metadata: {
      serviceType: anchor.serviceType,
      buildingId: anchor.buildingId,
      serviceAreaBoundaryId: anchor.serviceAreaBoundaryId,
      catchmentRadiusMeters: anchor.catchment.radiusMeters,
      dailyVisitors: anchor.capacity.dailyVisitors,
      staff: anchor.capacity.staff,
      emergencyAccess: anchor.schedule.emergencyAccess
    }
  }));
}

function createWeatherPresetFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.weatherPresets.map((preset) => ({
    id: `overlay:weather-presets:${preset.id}`,
    overlayId: 'weather-presets',
    objectId: preset.id,
    objectKind: preset.kind,
    ownerDomain: preset.ownerDomain,
    label: preset.name ?? preset.id,
    geometry: { type: 'none' },
    metadata: {
      presetKind: preset.presetKind,
      season: preset.season,
      active: preset.active,
      cloudCover: preset.cloudCover,
      precipitation: preset.precipitation,
      precipitationIntensity: preset.precipitationIntensity,
      visibilityMeters: preset.visibilityMeters,
      surfaceWetness: preset.surfaceWetness,
      drainageLoad: preset.simulationHooks.drainageLoad
    }
  }));
}

function createSolarShadingFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.solarShadingSamples.map((sample) => ({
    id: `overlay:solar-shading:${sample.id}`,
    overlayId: 'solar-shading',
    objectId: sample.id,
    objectKind: sample.kind,
    ownerDomain: sample.ownerDomain,
    label: sample.name ?? sample.id,
    geometry: { type: 'point', point: sample.center },
    metadata: {
      sampleKind: sample.sampleKind,
      parentObjectId: sample.parentObjectId,
      weatherPresetId: sample.weatherPresetId,
      shadeCoverageRatio: sample.shadeCoverageRatio,
      comfortScore: sample.comfortScore,
      glareRisk: sample.glareRisk,
      solarPotentialKwhPerDay: sample.solarPotentialKwhPerDay,
      roofSuitabilityScore: sample.roofSuitabilityScore,
      daylightHours: sample.daylightHours
    }
  }));
}

function createUrbanHeatFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.urbanHeatZones.map((zone) => ({
    id: `overlay:urban-heat:${zone.id}`,
    overlayId: 'urban-heat',
    objectId: zone.id,
    objectKind: zone.kind,
    ownerDomain: zone.ownerDomain,
    label: zone.name ?? zone.id,
    geometry: { type: 'polygon', points: zone.boundary },
    metadata: {
      zoneKind: zone.zoneKind,
      riskLevel: zone.riskLevel,
      parentObjectId: zone.parentObjectId,
      weatherPresetId: zone.weatherPresetId,
      heatRiskScore: zone.heatRiskScore,
      routeExposureScore: zone.routeExposureScore,
      shadeCoverageRatio: zone.shadeCoverageRatio,
      treeCanopyCoolingScore: zone.treeCanopyCoolingScore,
      waterCoolingScore: zone.waterCoolingScore,
      coolRoofCoverageRatio: zone.coolRoofCoverageRatio,
      mitigationEffectScore: zone.mitigationEffectScore,
      daytimeTemperatureDeltaCelsius: zone.daytimeTemperatureDeltaCelsius
    }
  }));
}

function createCultureAnchorFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.cultureAnchors.map((anchor) => ({
    id: `overlay:culture-anchors:${anchor.id}`,
    overlayId: 'culture-anchors',
    objectId: anchor.id,
    objectKind: anchor.kind,
    ownerDomain: anchor.ownerDomain,
    label: anchor.name ?? anchor.id,
    geometry: { type: 'point', point: anchor.center },
    metadata: {
      anchorKind: anchor.anchorKind,
      civicAnchorId: anchor.civicAnchorId,
      buildingId: anchor.buildingId,
      plazaZones: anchor.plazaZoneIds.length,
      culturalFootfallDaily: anchor.culturalFootfallDaily,
      eventCapacityPeople: anchor.eventCapacityPeople,
      tourismAttractionScore: anchor.tourismAttractionScore,
      eveningActivity: anchor.eveningActivity,
      heritageProtected: anchor.heritageProtected
    }
  }));
}

function createCommunityAnchorFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.communityAnchors.map((anchor) => ({
    id: `overlay:community-anchors:${anchor.id}`,
    overlayId: 'community-anchors',
    objectId: anchor.id,
    objectKind: anchor.kind,
    ownerDomain: anchor.ownerDomain,
    label: anchor.name ?? anchor.id,
    geometry: { type: 'point', point: anchor.center },
    metadata: {
      anchorKind: anchor.anchorKind,
      civicAnchorId: anchor.civicAnchorId,
      buildingId: anchor.buildingId,
      plazaZones: anchor.plazaZoneIds.length,
      dailyVisitors: anchor.dailyVisitors,
      eventCapacityPeople: anchor.eventCapacityPeople,
      socialServiceCapacityPeople: anchor.socialServiceCapacityPeople,
      shelterCapacityPeople: anchor.shelterCapacityPeople,
      communityCoverageScore: anchor.communityCoverageScore,
      crowdEventReady: anchor.crowdEventReady,
      foodDistribution: anchor.foodDistribution
    }
  }));
}

function createGovernmentAnchorFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.governmentAnchors.map((anchor) => ({
    id: `overlay:government-anchors:${anchor.id}`,
    overlayId: 'government-anchors',
    objectId: anchor.id,
    objectKind: anchor.kind,
    ownerDomain: anchor.ownerDomain,
    label: anchor.name ?? anchor.id,
    geometry: { type: 'point', point: anchor.center },
    metadata: {
      anchorKind: anchor.anchorKind,
      civicAnchorId: anchor.civicAnchorId,
      buildingId: anchor.buildingId,
      plazaZones: anchor.plazaZoneIds.length,
      serviceCounters: anchor.serviceCounterCount,
      dailyVisitors: anchor.dailyVisitors,
      staffCapacity: anchor.staffCapacity,
      publicAccess: anchor.publicAccess
    }
  }));
}

function createBuildingAccessFeatures(city: GeneratedCity): CityOverlayFeature[] {
  const entranceFeatures = city.buildingEntrances.map((entrance) => ({
    id: `overlay:building-access:${entrance.id}`,
    overlayId: 'building-access' as const,
    objectId: entrance.id,
    objectKind: entrance.kind,
    ownerDomain: entrance.ownerDomain,
    label: `${entrance.entranceKind} ${entrance.id}`,
    geometry: { type: 'point' as const, point: entrance.position },
    metadata: {
      featureType: 'entrance',
      entranceKind: entrance.entranceKind,
      accessLevel: entrance.accessLevel,
      buildingId: entrance.buildingId,
      roadId: entrance.roadId,
      accessible: entrance.accessible,
      stepFree: entrance.stepFree,
      activeFrontages: entrance.activeFrontageIds.length,
      serviceAccessCorridors: entrance.serviceAccessCorridorIds.length
    }
  }));
  const addressFeatures = city.addressPoints.map((addressPoint) => ({
    id: `overlay:building-access:${addressPoint.id}`,
    overlayId: 'building-access' as const,
    objectId: addressPoint.id,
    objectKind: addressPoint.kind,
    ownerDomain: addressPoint.ownerDomain,
    label: `${addressPoint.buildingNumber} ${addressPoint.streetName}`,
    geometry: { type: 'point' as const, point: addressPoint.position },
    metadata: {
      featureType: 'address',
      buildingId: addressPoint.buildingId,
      parcelId: addressPoint.parcelId,
      roadId: addressPoint.roadId,
      postalCode: addressPoint.postalCode,
      entrances: addressPoint.entranceIds.length,
      activeFrontages: addressPoint.activeFrontageIds.length
    }
  }));

  return [...entranceFeatures, ...addressFeatures];
}

function createAddressingGazetteerFeatures(city: GeneratedCity): CityOverlayFeature[] {
  const placeFeatures = city.namedPlaces.map((place) => ({
    id: `overlay:addressing-gazetteer:${place.id}`,
    overlayId: 'addressing-gazetteer' as const,
    objectId: place.id,
    objectKind: place.kind,
    ownerDomain: place.ownerDomain,
    label: place.name,
    geometry: place.boundary ? { type: 'polygon' as const, points: place.boundary } : { type: 'point' as const, point: place.center },
    metadata: {
      featureType: 'named-place',
      placeKind: place.placeKind,
      sourceObjectId: place.sourceObjectId,
      addressPoints: place.addressPointIds.length,
      searchTokens: place.placeTags.join(',')
    }
  }));
  const gazetteerFeatures = city.gazetteerEntries.map((entry) => ({
    id: `overlay:addressing-gazetteer:${entry.id}`,
    overlayId: 'addressing-gazetteer' as const,
    objectId: entry.id,
    objectKind: entry.kind,
    ownerDomain: entry.ownerDomain,
    label: entry.displayName,
    geometry: { type: 'point' as const, point: entry.position },
    metadata: {
      featureType: 'gazetteer-entry',
      entryKind: entry.entryKind,
      sourceObjectId: entry.sourceObjectId,
      reverseLookupRadiusMeters: entry.reverseLookupRadiusMeters,
      searchTokens: entry.searchTokens.length
    }
  }));

  return [...placeFeatures, ...gazetteerFeatures];
}

function createAccessControlFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.accessControls.map((control) => ({
    id: `overlay:access-controls:${control.id}`,
    overlayId: 'access-controls' as const,
    objectId: control.id,
    objectKind: control.kind,
    ownerDomain: control.ownerDomain,
    label: control.name ?? control.id,
    geometry: { type: 'polyline' as const, points: control.centerline },
    metadata: {
      controlKind: control.controlKind,
      ruleKind: control.ruleKind,
      publicAccess: control.publicAccess,
      privateAccess: control.privateAccess,
      emergencyOverride: control.emergencyOverride,
      normallyOpen: control.normallyOpen,
      restrictedModes: control.restrictedModes.length,
      navigationEdges: control.navigationGraphEdgeIds.length
    }
  }));
}

function createPublicLightingFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.streetLights.map((light) => ({
    id: `overlay:public-lighting:${light.id}`,
    overlayId: 'public-lighting' as const,
    objectId: light.id,
    objectKind: light.kind,
    ownerDomain: light.ownerDomain,
    label: light.name ?? light.id,
    geometry: { type: 'point' as const, point: light.position },
    metadata: {
      placementContext: light.placementContext,
      fixtureType: light.fixtureType,
      lightingPurpose: light.lightingPurpose,
      coverageRadiusMeters: light.coverage.radiusMeters,
      estimatedIlluminanceLux: light.nightSafety.estimatedIlluminanceLux,
      criticalPedestrianPath: light.coverage.criticalPedestrianPath,
      darkPathRisk: light.nightSafety.darkPathRisk,
      glareRating: light.glareControl.glareRating,
      decorative: light.decorativeLighting.enabled
    }
  }));
}

function createSignageWayfindingFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.streetFurniture
    .filter((item) => item.signFace)
    .map((sign) => ({
      id: `overlay:signage-wayfinding:${sign.id}`,
      overlayId: 'signage-wayfinding' as const,
      objectId: sign.id,
      objectKind: sign.kind,
      ownerDomain: sign.ownerDomain,
      label: sign.signFace?.textCode ?? sign.id,
      geometry: { type: 'point' as const, point: sign.position },
      metadata: {
        signRole: sign.signFace?.signRole ?? 'unknown',
        panelKind: sign.signFace?.panelKind ?? 'unknown',
        furnitureType: sign.furnitureType,
        placementContext: sign.placementContext,
        readableLod: sign.signFace?.readableLod ?? sign.lod,
        routes: sign.signFace?.routeIds.length ?? 0,
        districts: sign.signFace?.districtIds.length ?? 0,
        frontages: sign.signFace?.activeFrontageIds.length ?? 0,
        destinations: sign.signFace?.destinationObjectIds.length ?? 0
      }
    }));
}

function createGreenStormwaterFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.greenStormwaterFeatures.map((feature) => ({
    id: `overlay:green-stormwater:${feature.id}`,
    overlayId: 'green-stormwater' as const,
    objectId: feature.id,
    objectKind: feature.kind,
    ownerDomain: feature.ownerDomain,
    label: `${feature.featureKind} ${feature.roadId}`,
    geometry: { type: 'polygon' as const, points: feature.boundary },
    metadata: {
      featureKind: feature.featureKind,
      roadId: feature.roadId,
      sidewalkId: feature.sidewalkId,
      utilityNodes: feature.utilityNodeIds.length,
      runoffEdges: feature.runoffPathEdgeIds.length,
      trees: feature.treeIds.length,
      storageM3: feature.storageVolumeCubicMeters,
      treatmentM3: feature.treatmentVolumeCubicMeters,
      clearPathMeters: feature.clearPathMeters,
      runoffCapturePercent: feature.runoffCapturePercent
    }
  }));
}

function createConstraintFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.constraints.map((constraint) => ({
    id: `overlay:constraints:${constraint.id}`,
    overlayId: 'constraints',
    objectId: constraint.id,
    objectKind: constraint.kind,
    ownerDomain: constraint.ownerDomain,
    label: constraint.name ?? constraint.id,
    geometry: { type: 'polygon', points: constraint.boundary },
    metadata: {
      constraintKind: constraint.constraintKind,
      priority: constraint.priority,
      affectedKinds: constraint.affectedObjectKinds.join(','),
      prohibitedKinds: constraint.prohibitedObjectKinds.join(','),
      requiredReferences: constraint.requiredObjectIds.length,
      relatedReferences: constraint.relatedObjectIds.length,
      ...(constraint.minSetbackMeters !== undefined ? { minSetbackMeters: constraint.minSetbackMeters } : {}),
      ...(constraint.minClearanceMeters !== undefined ? { minClearanceMeters: constraint.minClearanceMeters } : {}),
      ...(constraint.maxHeightMeters !== undefined ? { maxHeightMeters: constraint.maxHeightMeters } : {})
    }
  }));
}

function createResilienceGoalFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.resilienceGoals.map((goal) => ({
    id: `overlay:resilience-goals:${goal.id}`,
    overlayId: 'resilience-goals',
    objectId: goal.id,
    objectKind: goal.kind,
    ownerDomain: goal.ownerDomain,
    label: goal.name ?? goal.id,
    geometry: goal.focusBoundary
      ? { type: 'polygon', points: goal.focusBoundary }
      : { type: 'point', point: goal.focusPoint },
    metadata: {
      goalKind: goal.goalKind,
      priority: goal.priority,
      targetMetric: goal.target.metric,
      targetMinimumCount: goal.target.minimumCount,
      targetDistricts: goal.targetDistrictIds.length,
      routeRoads: goal.routeRoadIds.length,
      shelterCandidates: goal.shelterObjectIds.length,
      continuityTargets: goal.continuityTargets.length,
      recoveryPriority: goal.recoveryPriority
    }
  }));
}

function createParcelFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.parcels.map((parcel) => ({
    id: `overlay:parcels:${parcel.id}`,
    overlayId: 'parcels',
    objectId: parcel.id,
    objectKind: parcel.kind,
    ownerDomain: parcel.ownerDomain,
    label: parcel.id,
    geometry: { type: 'polygon', points: parcel.boundary },
    metadata: {
      district: parcel.district,
      blockId: parcel.blockId,
      blockBuildableEnvelopeId: parcel.blockBuildableEnvelopeId,
      zoningDistrictId: parcel.zoningDistrictId,
      zoningCode: parcel.zoning.zoningCode,
      parcelBuildableEnvelopeId: parcel.fit.buildableEnvelopeId,
      frontageRoads: parcel.frontageRoadIds.length,
      primaryFrontageRoad: parcel.frontagePriority[0]?.roadId ?? '',
      buildableAreaSqM: parcel.fit.buildableAreaSqM,
      developmentStatus: parcel.developmentRights.status,
      constraints: parcel.parcelConstraintIds.length
    }
  }));
}

function createRoadFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.roads.map((road) => ({
    id: `overlay:roads:${road.id}`,
    overlayId: 'roads',
    objectId: road.id,
    objectKind: road.kind,
    ownerDomain: road.ownerDomain,
    label: road.id,
    geometry: { type: 'polyline', points: road.centerline },
    metadata: {
      hierarchy: road.hierarchy,
      profile: road.streetProfileId,
      lanes: road.laneCount,
      corridorId: road.corridorId,
      corridorName: road.corridorName,
      continuityGroupId: road.continuityGroupId,
      designSpeedKph: road.designSpeedKph,
      rightOfWayWidthMeters: road.rightOfWayWidthMeters,
      transitEligible: road.transitEligible,
      laneRoles: road.lanes.map((lane) => lane.laneRole).join(','),
      busOnlyLanes: road.lanes.filter((lane) => lane.laneRole === 'bus-only').length,
      reversibleLanes: road.lanes.filter((lane) => lane.reversible).length,
      turnPocketLanes: road.lanes.filter((lane) => lane.laneRole === 'turn-pocket').length
    }
  }));
}

function createNavigationGraphFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return [
    ...city.navigationGraphEdges.map((edge) => {
      const fromNode = city.navigationGraphNodes.find((node) => node.id === edge.fromNodeId);
      const toNode = city.navigationGraphNodes.find((node) => node.id === edge.toNodeId);
      return {
        id: `overlay:navigation-graphs:${edge.id}`,
        overlayId: 'navigation-graphs' as const,
        objectId: edge.id,
        objectKind: edge.kind,
        ownerDomain: edge.ownerDomain,
        label: `${edge.mode} edge`,
        geometry: fromNode && toNode ? { type: 'polyline' as const, points: [fromNode.position, toNode.position] } : { type: 'none' as const },
        metadata: {
          mode: edge.mode,
          sourceObjectKind: edge.sourceObjectKind,
          lengthMeters: edge.lengthMeters,
          travelTimeSeconds: edge.travelTimeSeconds,
          accessible: edge.accessible,
          restrictions: edge.restrictions.join(',')
        }
      } satisfies CityOverlayFeature;
    }),
    ...city.navigationRoutes.map((route) => ({
      id: `overlay:navigation-graphs:${route.id}`,
      overlayId: 'navigation-graphs' as const,
      objectId: route.id,
      objectKind: route.kind,
      ownerDomain: route.ownerDomain,
      label: `${route.mode} ${route.routeKind} route`,
      geometry: { type: 'none' as const },
      metadata: {
        mode: route.mode,
        routeKind: route.routeKind,
        requestClass: route.requestClass,
        edges: route.edgeIds.length,
        lengthMeters: route.lengthMeters,
        agentTypes: route.supportedAgentTypes.join(',')
      }
    }))
  ];
}

function createFreightLogisticsFeatures(city: GeneratedCity): CityOverlayFeature[] {
  const routeFeatures = city.freightRoutes.map((route) => ({
    id: `overlay:freight-logistics:${route.id}`,
    overlayId: 'freight-logistics' as const,
    objectId: route.id,
    objectKind: route.kind,
    ownerDomain: route.ownerDomain,
    label: route.name ?? route.id,
    geometry: { type: 'polyline' as const, points: route.polyline },
    metadata: {
      routeKind: route.routeKind,
      docks: route.loadingDockIds.length,
      warehouseBuildings: route.warehouseBuildingIds.length,
      deliveryWindow: route.deliveryWindow.windowKind,
      maxLengthMeters: route.truckRestriction.maxLengthMeters,
      maxWeightTonnes: route.truckRestriction.maxWeightTonnes,
      lastMileStops: route.lastMileStopCount
    }
  }));
  const dockFeatures = city.freightLoadingDocks.map((dock) => ({
    id: `overlay:freight-logistics:${dock.id}`,
    overlayId: 'freight-logistics' as const,
    objectId: dock.id,
    objectKind: dock.kind,
    ownerDomain: dock.ownerDomain,
    label: dock.name ?? dock.id,
    geometry: { type: 'point' as const, point: dock.position },
    metadata: {
      buildingId: dock.buildingId,
      parcelId: dock.parcelId,
      roadId: dock.roadId,
      curbZoneId: dock.curbZoneId,
      dockKind: dock.dockKind,
      loadingBays: dock.loadingBays,
      deliveryWindow: dock.deliveryWindow.windowKind,
      warehouseLink: dock.warehouseLink
    }
  }));
  const alleyFeatures = city.serviceAlleys.map((alley) => ({
    id: `overlay:freight-logistics:${alley.id}`,
    overlayId: 'freight-logistics' as const,
    objectId: alley.id,
    objectKind: alley.kind,
    ownerDomain: alley.ownerDomain,
    label: alley.name ?? alley.id,
    geometry: { type: 'polyline' as const, points: alley.centerline },
    metadata: {
      roadId: alley.roadId,
      buildings: alley.buildingIds.length,
      parcels: alley.parcelIds.length,
      loadingDocks: alley.loadingDockIds.length,
      accessControlled: alley.accessControlled,
      deliveryWindow: alley.deliveryWindow.windowKind
    }
  }));

  return [...routeFeatures, ...dockFeatures, ...alleyFeatures];
}

function createAssetInventoryFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.assetInventoryRecords.map((record) => {
    const target = city.objectIndex.objectsById[record.assetObjectId];

    return {
      id: `overlay:asset-inventory:${record.id}`,
      overlayId: 'asset-inventory',
      objectId: record.id,
      objectKind: record.kind,
      ownerDomain: record.ownerDomain,
      label: record.assetLookupKey,
      geometry: target ? getObjectGeometry(target) : { type: 'none' },
      metadata: {
        assetObjectId: record.assetObjectId,
        assetObjectKind: record.assetObjectKind,
        inventoryScope: record.inventoryScope,
        ownerEntityId: record.ownerEntityId,
        responsibleDepartmentId: record.responsibleDepartmentId,
        renderBindingId: record.renderBindingId,
        renderAssetId: record.renderAssetId,
        lifecycleStage: record.lifecycle.stage,
        replacementYear: record.lifecycle.replacementYear,
        conditionRating: record.condition.rating,
        conditionScore: record.condition.score,
        operationalStatus: record.operationalStatus,
        criticality: record.criticality,
        replacementCostUsd: record.replacementCost.amountUsd
      }
    };
  });
}

function createCyclingNetworkFeatures(city: GeneratedCity): CityOverlayFeature[] {
  const segmentFeatures = city.bikeSegments.map((segment) => ({
    id: `overlay:cycling-network:${segment.id}`,
    overlayId: 'cycling-network' as const,
    objectId: segment.id,
    objectKind: segment.kind,
    ownerDomain: segment.ownerDomain,
    label: segment.id,
    geometry: { type: 'polyline' as const, points: segment.centerline },
    metadata: {
      roadId: segment.roadId,
      side: segment.side,
      facilityKind: segment.facilityKind,
      protected: segment.protected,
      parking: segment.bikeParkingIds.length,
      conflicts: segment.conflictZoneIds.length,
      connectsToTransit: segment.connectsToTransit
    }
  }));
  const parkingFeatures = city.bikeParking.map((parking) => ({
    id: `overlay:cycling-network:${parking.id}`,
    overlayId: 'cycling-network' as const,
    objectId: parking.id,
    objectKind: parking.kind,
    ownerDomain: parking.ownerDomain,
    label: parking.id,
    geometry: { type: 'point' as const, point: parking.position },
    metadata: {
      roadId: parking.roadId,
      segmentId: parking.segmentId,
      capacity: parking.capacity,
      parkingKind: parking.parkingKind,
      connectsToTransit: Boolean(parking.connectsToTransitStopId)
    }
  }));
  const conflictFeatures = city.bikeConflictZones.map((conflict) => ({
    id: `overlay:cycling-network:${conflict.id}`,
    overlayId: 'cycling-network' as const,
    objectId: conflict.id,
    objectKind: conflict.kind,
    ownerDomain: conflict.ownerDomain,
    label: conflict.id,
    geometry: { type: 'point' as const, point: conflict.position },
    metadata: {
      roadId: conflict.roadId,
      segmentId: conflict.segmentId,
      conflictKind: conflict.conflictKind,
      severity: conflict.severity,
      mitigation: conflict.mitigation
    }
  }));
  const signalFeatures = city.bikeSignals.map((signal) => ({
    id: `overlay:cycling-network:${signal.id}`,
    overlayId: 'cycling-network' as const,
    objectId: signal.id,
    objectKind: signal.kind,
    ownerDomain: signal.ownerDomain,
    label: signal.id,
    geometry: { type: 'point' as const, point: signal.position },
    metadata: {
      roadId: signal.roadId,
      segmentId: signal.segmentId,
      signalKind: signal.signalKind,
      protectedPhaseSeconds: signal.protectedPhaseSeconds,
      conflicts: signal.conflictZoneIds.length
    }
  }));

  return [...segmentFeatures, ...parkingFeatures, ...conflictFeatures, ...signalFeatures];
}

function createServiceAccessFeatures(city: GeneratedCity): CityOverlayFeature[] {
  return city.serviceAccessCorridors.map((corridor) => ({
    id: `overlay:service-access:${corridor.id}`,
    overlayId: 'service-access' as const,
    objectId: corridor.id,
    objectKind: corridor.kind,
    ownerDomain: corridor.ownerDomain,
    label: `${corridor.corridorKind} ${corridor.id}`,
    geometry: { type: 'polygon' as const, points: corridor.boundary },
    metadata: {
      corridorKind: corridor.corridorKind,
      surface: corridor.surface,
      restricted: corridor.restricted,
      emergencyAccess: corridor.emergencyAccess,
      clearAccessMeters: corridor.clearAccessMeters,
      widthMeters: corridor.widthMeters,
      buildingCount: corridor.buildingIds.length,
      utilityNodeCount: corridor.utilityNodeIds.length,
      utilityEdgeCount: corridor.utilityEdgeIds.length,
      cadastreEasements: corridor.cadastreEasementIds.length,
      authorizedRoles: corridor.authorizedRoleIds.length
    }
  }));
}

function createThermalServiceFeatures(city: GeneratedCity): CityOverlayFeature[] {
  const nodeFeatures = city.utilityNodes
    .filter((node) => node.thermalEnergy)
    .map((node) => ({
      id: `overlay:thermal-service:${node.id}`,
      overlayId: 'thermal-service' as const,
      objectId: node.id,
      objectKind: node.kind,
      ownerDomain: node.ownerDomain,
      label: node.name ?? node.id,
      geometry: { type: 'point' as const, point: node.center },
      metadata: {
        utilityType: node.utilityType,
        equipmentKind: node.thermalEnergy?.equipmentKind ?? '',
        medium: node.thermalEnergy?.medium ?? '',
        thermalLoopId: node.thermalEnergy?.thermalLoopId ?? '',
        serviceAreaId: node.thermalEnergy?.serviceAreaId ?? '',
        outageDomainId: node.outage.outageDomainId,
        capacityKwThermal: node.thermalEnergy?.capacityKwThermal ?? 0,
        servedObjects: node.thermalEnergy?.servedObjectIds.length ?? 0,
        backupFuelAvailable: node.thermalEnergy?.backupFuelAvailable ?? false
      }
    }));

  const edgeFeatures = city.utilityEdges
    .filter((edge) => edge.thermalEnergy)
    .map((edge) => ({
      id: `overlay:thermal-service:${edge.id}`,
      overlayId: 'thermal-service' as const,
      objectId: edge.id,
      objectKind: edge.kind,
      ownerDomain: edge.ownerDomain,
      label: edge.name ?? edge.id,
      geometry: { type: 'polyline' as const, points: edge.centerline },
      metadata: {
        utilityType: edge.utilityType,
        medium: edge.thermalEnergy?.medium ?? '',
        loopId: edge.thermalEnergy?.loopId ?? '',
        outageDomainId: edge.outageDomainId,
        fromEquipmentKind: edge.thermalEnergy?.fromEquipmentKind ?? '',
        toEquipmentKind: edge.thermalEnergy?.toEquipmentKind ?? '',
        capacityKwThermal: edge.thermalEnergy?.capacityKwThermal ?? 0,
        pipeDiameterMm: edge.thermalEnergy?.pipeDiameterMm ?? 0,
        insulated: edge.thermalEnergy?.insulated ?? false
      }
    }));

  return [...nodeFeatures, ...edgeFeatures];
}

function createThermalOutageFeatures(city: GeneratedCity): CityOverlayFeature[] {
  const thermalNodes = city.utilityNodes.filter((node) => node.thermalEnergy);
  const thermalEdges = city.utilityEdges.filter((edge) => edge.thermalEnergy);
  const outageDomainIds = [...new Set([...thermalNodes.map((node) => node.outage.outageDomainId), ...thermalEdges.map((edge) => edge.outageDomainId)])].sort();

  return outageDomainIds.map((outageDomainId) => {
    const domainNodes = thermalNodes.filter((node) => node.outage.outageDomainId === outageDomainId);
    const domainEdges = thermalEdges.filter((edge) => edge.outageDomainId === outageDomainId);
    const points = [
      ...domainNodes.map((node) => node.center),
      ...domainEdges.flatMap((edge) => edge.centerline)
    ];

    return {
      id: `overlay:thermal-outages:${outageDomainId}`,
      overlayId: 'thermal-outages' as const,
      ownerDomain: 'utilities' as const,
      label: outageDomainId,
      geometry: { type: 'polygon' as const, points: createPaddedBoundsPolygon(points, 12) },
      metadata: {
        outageDomainId,
        thermalNodes: domainNodes.length,
        thermalEdges: domainEdges.length,
        backupNodes: domainNodes.filter((node) => node.outage.backupAvailable).length,
        highCriticalityNodes: domainNodes.filter((node) => node.outage.criticality === 'high').length,
        serviceAreas: new Set(domainNodes.map((node) => node.thermalEnergy?.serviceAreaId).filter(Boolean)).size,
        thermalLoops: new Set([
          ...domainNodes.map((node) => node.thermalEnergy?.thermalLoopId).filter(Boolean),
          ...domainEdges.map((edge) => edge.thermalEnergy?.loopId).filter(Boolean)
        ]).size
      }
    };
  });
}

function createValidationIssueFeatures(
  city: GeneratedCity,
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityOverlayFeature[] {
  return city.validation.issues.map((issue) => {
    const object = issue.objectId ? runtimeObjectIndex.objectsById[issue.objectId] : undefined;
    const focus = createValidationIssueFocus(issue, object);

    return {
      id: `overlay:validation-issues:${issue.id}`,
      overlayId: 'validation-issues',
      objectId: issue.objectId,
      objectKind: object?.kind,
      ownerDomain: object?.ownerDomain,
      label: issue.message,
      geometry: getValidationIssueGeometry(issue, object),
      severity: issue.severity,
      category: issue.category,
      focus,
      metadata: {
        validationIssueId: issue.id,
        ...(issue.suggestedFix ? { suggestedFix: issue.suggestedFix } : {}),
        ...(focus.objectId ? { focusObjectId: focus.objectId } : {})
      }
    };
  });
}

function getValidationIssueGeometry(
  issue: ValidationIssue,
  object: GeneratedRuntimeCityObject | undefined
): CityOverlayGeometry {
  if (issue.affectedBoundary) {
    return { type: 'polygon', points: issue.affectedBoundary };
  }

  if (issue.affectedPoint) {
    return { type: 'point', point: issue.affectedPoint };
  }

  return object ? getObjectGeometry(object) : { type: 'none' };
}

function createValidationIssueFocus(
  issue: ValidationIssue,
  object: GeneratedRuntimeCityObject | undefined
): NonNullable<CityOverlayFeature['focus']> {
  const objectGeometry = object ? getObjectGeometry(object) : undefined;

  return {
    objectId: issue.objectId,
    point: issue.affectedPoint ?? getGeometryPoint(objectGeometry),
    boundary: issue.affectedBoundary ?? (objectGeometry?.type === 'polygon' ? objectGeometry.points : undefined),
    suggestedFix: issue.suggestedFix
  };
}

function createOwnerDomainFeatures(
  runtimeObjectIndex: CityObjectIndex<GeneratedRuntimeCityObject>
): CityOverlayFeature[] {
  return runtimeObjectIndex.objects.map((object) => ({
    id: `overlay:owner-domains:${object.id}`,
    overlayId: 'owner-domains',
    objectId: object.id,
    objectKind: object.kind,
    ownerDomain: object.ownerDomain,
    label: object.name ?? object.id,
    geometry: getObjectGeometry(object),
    metadata: {
      lod: object.lod
    }
  }));
}

function getObjectGeometry(object: CityObjectBase): CityOverlayGeometry {
  if ('focusBoundary' in object && isPointArray(object.focusBoundary)) {
    return { type: 'polygon', points: object.focusBoundary };
  }

  if ('focusPoint' in object && isPoint(object.focusPoint)) {
    return { type: 'point', point: object.focusPoint };
  }

  if ('boundary' in object && isPointArray(object.boundary)) {
    return { type: 'polygon', points: object.boundary };
  }

  if ('centerline' in object && isPointArray(object.centerline)) {
    return { type: 'polyline', points: object.centerline };
  }

  if ('center' in object && isPoint(object.center)) {
    return { type: 'point', point: object.center };
  }

  if ('position' in object && isPoint(object.position)) {
    return { type: 'point', point: object.position };
  }

  return { type: 'none' };
}

function getGeometryPoint(geometry: CityOverlayGeometry | undefined): Point2D | undefined {
  if (!geometry) {
    return undefined;
  }

  if (geometry.type === 'point') {
    return geometry.point;
  }

  if (geometry.type === 'polygon' || geometry.type === 'polyline') {
    return geometry.points[0];
  }

  return undefined;
}

function createPaddedBoundsPolygon(points: readonly Point2D[], paddingMeters: number): Polygon2D {
  if (points.length === 0) {
    return [
      { x: -paddingMeters, z: -paddingMeters },
      { x: paddingMeters, z: -paddingMeters },
      { x: paddingMeters, z: paddingMeters },
      { x: -paddingMeters, z: paddingMeters }
    ];
  }

  const bounds = points.reduce(
    (current, point) => ({
      minX: Math.min(current.minX, point.x),
      maxX: Math.max(current.maxX, point.x),
      minZ: Math.min(current.minZ, point.z),
      maxZ: Math.max(current.maxZ, point.z)
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY
    }
  );

  return [
    { x: bounds.minX - paddingMeters, z: bounds.minZ - paddingMeters },
    { x: bounds.maxX + paddingMeters, z: bounds.minZ - paddingMeters },
    { x: bounds.maxX + paddingMeters, z: bounds.maxZ + paddingMeters },
    { x: bounds.minX - paddingMeters, z: bounds.maxZ + paddingMeters }
  ];
}

function isPoint(value: unknown): value is Point2D {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'z' in value &&
    typeof value.x === 'number' &&
    typeof value.z === 'number'
  );
}

function isPointArray(value: unknown): value is readonly Point2D[] {
  return Array.isArray(value) && value.every(isPoint);
}
