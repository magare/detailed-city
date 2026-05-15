import type { RuntimePerformanceDiagnostics } from '../systems/performance/PerformanceMonitor';
import type {
  CitySceneLayerId,
  CitySceneLayerRuntimeState
} from '../city/rendering-handoff/scene-layers/sceneLayerDefinitions';
import type { CityDiagnostics } from './cityDiagnostics';

export interface DebugPanelStartOptions {
  refreshIntervalMs?: number;
}

export interface DebugPanelSource {
  readonly seed: string;
  readonly updatedAt: Date;
  readonly diagnostics: CityDiagnostics;
  readonly getPerformanceDiagnostics: () => RuntimePerformanceDiagnostics;
  readonly getSceneLayerStates: () => readonly CitySceneLayerRuntimeState[];
  readonly setSceneLayerVisible: (layerId: CitySceneLayerId, visible: boolean) => void;
  readonly setSceneLayerRenderOrder: (layerId: CitySceneLayerId, renderOrder: number) => void;
}

export class DebugPanel {
  readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly toggleButton: HTMLButtonElement;
  private readonly refreshIntervalMs: number;
  private intervalId: number | undefined;
  private collapsed = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly source: DebugPanelSource,
    options: DebugPanelStartOptions = {}
  ) {
    this.root = document.createElement('aside');
    this.root.className = 'city-debug-panel';
    this.root.dataset.cityDebugPanel = 'true';
    this.root.setAttribute('aria-label', 'City diagnostics');

    const header = document.createElement('div');
    header.className = 'city-debug-panel__header';

    const title = document.createElement('div');
    title.className = 'city-debug-panel__title';
    title.textContent = 'Debug';

    this.toggleButton = document.createElement('button');
    this.toggleButton.className = 'city-debug-panel__toggle';
    this.toggleButton.type = 'button';
    this.toggleButton.title = 'Collapse diagnostics';
    this.toggleButton.setAttribute('aria-label', 'Collapse diagnostics');
    this.toggleButton.textContent = '-';
    this.toggleButton.addEventListener('click', () => this.setCollapsed(!this.collapsed));

    this.body = document.createElement('div');
    this.body.className = 'city-debug-panel__body';

    header.append(title, this.toggleButton);
    this.root.append(header, this.body);
    this.container.append(this.root);
    this.render();
    this.refreshIntervalMs = options.refreshIntervalMs ?? 1000;

    if (isDebugPanelHiddenByUrl()) {
      this.setHidden(true);
    } else {
      document.body.dataset.debugPanelState = 'expanded';
    }
  }

  start(): void {
    if (this.refreshIntervalMs <= 0) {
      return;
    }

    if (this.intervalId !== undefined) {
      return;
    }

    this.intervalId = window.setInterval(() => this.render(), this.refreshIntervalMs);
    this.render();
  }

  dispose(): void {
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.root.remove();
  }

  setCollapsed(collapsed: boolean): void {
    if (this.root.hidden) {
      return;
    }

    this.collapsed = collapsed;
    this.root.classList.toggle('is-collapsed', collapsed);
    this.body.hidden = collapsed;
    this.toggleButton.textContent = collapsed ? '+' : '-';
    this.toggleButton.title = collapsed ? 'Expand diagnostics' : 'Collapse diagnostics';
    this.toggleButton.setAttribute('aria-label', collapsed ? 'Expand diagnostics' : 'Collapse diagnostics');
    document.body.dataset.debugPanelState = collapsed ? 'collapsed' : 'expanded';
  }

  setHidden(hidden: boolean): void {
    this.root.hidden = hidden;
    document.body.dataset.debugPanelState = hidden ? 'hidden' : this.collapsed ? 'collapsed' : 'expanded';
  }

  private render(): void {
    if (this.root.hidden) {
      return;
    }

    const diagnostics = this.source.diagnostics;
    const performance = this.source.getPerformanceDiagnostics();
    const overlayNames = diagnostics.overlays.map((overlay) => overlay.id).join(', ');
    const lodTiers = diagnostics.lodPolicy.rules.map((rule) => rule.tier).join('/');
    const coordinatePrecision = diagnostics.geospatial.precision.coordinatePrecisionMeters;
    const layerObjectCounts = new Map(diagnostics.sceneLayers.map((layer) => [layer.id, layer.objectCount]));

    this.body.replaceChildren(
      createMetric('Updated', formatDateTime(this.source.updatedAt)),
      createMetric('Seed', this.source.seed),
      createLayerControls(
        this.source.getSceneLayerStates(),
        layerObjectCounts,
        this.source.setSceneLayerVisible,
        this.source.setSceneLayerRenderOrder
      ),
      createMetric(
        'Config',
        `${diagnostics.config.city.qualityPreset}, grid ${diagnostics.config.city.gridSize}, traffic ${diagnostics.config.city.density.trafficDensity}`
      ),
      createMetric(
        'Master Plan',
        `${diagnostics.masterPlan.centers.total} centers, ${diagnostics.masterPlan.protectedOpenSpaces.total} open spaces, ${diagnostics.masterPlan.growthBoundaries.total} boundaries`
      ),
      createMetric(
        'Districts',
        `${diagnostics.districtCharacter.districtRules} rules, ${diagnostics.districtCharacter.transitionBuffers} transitions`
      ),
      createMetric(
        'Boundaries',
        `${diagnostics.administrativeBoundaries.total} admin, ${diagnostics.administrativeBoundaries.wards} wards, ${diagnostics.administrativeBoundaries.neighborhoods} neighborhoods`
      ),
      createMetric(
        'Blocks',
        `${diagnostics.blockModel.total} blocks, ${diagnostics.blockModel.alleys} access, ${diagnostics.blockModel.averagePermeabilityScore} permeability`
      ),
      createMetric(
        'Parcels',
        `${diagnostics.parcelModel.total} parcels, ${diagnostics.parcelModel.buildableEnvelopes} envelopes, ${diagnostics.parcelModel.primaryFrontageParcels} primary`
      ),
      createMetric(
        'Cadastre',
        `${diagnostics.cadastreModel.total} records, ${diagnostics.cadastreModel.easements} easements, ${diagnostics.cadastreModel.recordsWithBuildRights} build rights`
      ),
      createMetric(
        'Utilities',
        `${diagnostics.utilityBase.nodes} nodes, ${diagnostics.utilityBase.edges} edges, ${diagnostics.utilityBase.networkTypes} networks`
      ),
      createMetric(
        'Service Access',
        `${diagnostics.serviceAccess.total} corridors, ${diagnostics.serviceAccess.restrictedCorridors} restricted, ${diagnostics.serviceAccess.buildingsLinked} buildings`
      ),
      createMetric(
        'Asset Inventory',
        `${diagnostics.assetInventory.totalRecords} records, ${diagnostics.assetInventory.maintenanceWatchAssets} watch, ${diagnostics.assetInventory.uniqueOwnerEntities} owners`
      ),
      createMetric(
        'Maintenance',
        `${diagnostics.maintenanceOperations.total} ops, ${diagnostics.maintenanceOperations.repairQueueItems} repairs, ${diagnostics.maintenanceOperations.temporaryClosures} closures`
      ),
      createMetric(
        'Permits',
        `${diagnostics.permitsInspections.total} records, ${diagnostics.permitsInspections.developmentPermits} development, ${diagnostics.permitsInspections.temporaryClosurePermits} closures`
      ),
      createMetric(
        'Curb Activation',
        `${diagnostics.curbActivations.total} active, ${diagnostics.curbActivations.parklets} parklets, ${diagnostics.curbActivations.totalSeats} seats`
      ),
      createMetric(
        'Public Amenities',
        `${diagnostics.publicAmenities.total} fixtures, ${diagnostics.publicAmenities.publicToilets} toilets, ${diagnostics.publicAmenities.totalDailyUsers} daily users`
      ),
      createMetric(
        'Access Control',
        `${diagnostics.accessControls.total} controls, ${diagnostics.accessControls.navigationControlledEdges} edges, ${diagnostics.accessControls.privateAccessControls} private`
      ),
      createMetric(
        'Power',
        `${diagnostics.powerGrid.nodes} nodes, ${diagnostics.powerGrid.transformers} transformers, ${diagnostics.powerGrid.streetLightsServed} lights`
      ),
      createMetric(
        'Public Lighting',
        `${diagnostics.publicLighting.total} lights, ${diagnostics.publicLighting.citywide} citywide, ${diagnostics.publicLighting.darkCriticalPathLights} dark gaps`
      ),
      createMetric(
        'Water Supply',
        `${diagnostics.waterSupply.nodes} nodes, ${diagnostics.waterSupply.hydrants} hydrants, ${diagnostics.waterSupply.buildingsServed} buildings`
      ),
      createMetric(
        'Wastewater',
        `${diagnostics.wastewater.nodes} nodes, ${diagnostics.wastewater.manholes} manholes, ${diagnostics.wastewater.buildingsServed} buildings`
      ),
      createMetric(
        'Stormwater',
        `${diagnostics.stormwater.nodes} nodes, ${diagnostics.stormwater.inlets} inlets, ${diagnostics.stormwater.roadsDrained} roads`
      ),
      createMetric(
        'Green Stormwater',
        `${diagnostics.greenStormwater.totalFeatures} features, ${diagnostics.greenStormwater.runoffRoutedFeatures} routed, ${diagnostics.greenStormwater.treeLinkedFeatures} tree-linked`
      ),
      createMetric(
        'Telecom',
        `${diagnostics.telecom.nodes} nodes, ${diagnostics.telecom.antennas} antennas, ${diagnostics.telecom.buildingsServed} buildings`
      ),
      createMetric(
        'Thermal',
        `${diagnostics.thermalEnergy.nodes} nodes, ${diagnostics.thermalEnergy.heatExchangers} exchangers, ${diagnostics.thermalEnergy.buildingsServed} buildings`
      ),
      createMetric(
        'Zoning',
        `${diagnostics.zoningModel.total} districts, ${diagnostics.zoningModel.formBasedDistricts} form, ${diagnostics.zoningModel.parcelsWithZoning} parcels`
      ),
      createMetric(
        'Water',
        `${diagnostics.waterwayNetwork.edgeSegments} edges, ${diagnostics.waterwayNetwork.crossings} crossings, ${diagnostics.waterwayNetwork.outfalls} outfalls`
      ),
      createMetric(
        'Waterfront',
        `${diagnostics.waterfrontModel.total} edges, ${diagnostics.waterfrontModel.publicAccessEdges} public, ${diagnostics.waterfrontModel.piers} piers`
      ),
      createMetric(
        'Water Transport',
        `${diagnostics.waterTransportAccess.total} access, ${diagnostics.waterTransportAccess.ferryAccessPoints} ferry, ${diagnostics.waterTransportAccess.emergencyHelipads} helipad`
      ),
      createMetric(
        'Promenade',
        `${diagnostics.waterfrontOpenSpace.total} spaces, ${diagnostics.waterfrontOpenSpace.seatingCapacity} seats, ${diagnostics.waterfrontOpenSpace.waterAccessPoints} water access`
      ),
      createMetric(
        'Hazards',
        `${diagnostics.hazardLayer.total} zones, ${diagnostics.hazardLayer.criticalHazards} critical, ${diagnostics.hazardLayer.noBuildHazards} no-build`
      ),
      createMetric(
        'Soils',
        `${diagnostics.soilGeology.total} zones, ${diagnostics.soilGeology.highRiskZones} high-risk, ${diagnostics.soilGeology.poorDrainageZones} drainage`
      ),
      createMetric(
        'Constraints',
        `${diagnostics.constraintLayer.total} rules, ${diagnostics.constraintLayer.noBuildRules} no-build`
      ),
      createMetric(
        'Resilience',
        `${diagnostics.resilienceGoals.total} goals, ${diagnostics.resilienceGoals.shelterCandidates} shelters`
      ),
      createMetric(
        'Phasing',
        `${diagnostics.developmentPhasing.total} phases, ${diagnostics.developmentPhasing.active} active, ${diagnostics.developmentPhasing.closureRoads} closures`
      ),
      createMetric(
        'Parks',
        `${diagnostics.parkExpansion.totalFeatures} features, ${diagnostics.parkExpansion.pathFeatures} paths, ${diagnostics.parkExpansion.connectedParks} connected`
      ),
      createMetric(
        'Plaza',
        `${diagnostics.plazaModel.totalZones} zones, ${diagnostics.plazaModel.eventCapacityPeople} event cap, ${diagnostics.plazaModel.activeEdges} active edge`
      ),
      createMetric(
        'Planting',
        `${diagnostics.plantingModel.totalTrees} trees, ${diagnostics.plantingModel.greenCorridors} corridors, ${diagnostics.plantingModel.canopyAreaSquareMeters}m2 canopy`
      ),
      createMetric(
        'Furniture',
        `${diagnostics.objectCounts.citywideStreetFurniture} citywide, ${diagnostics.objectCounts.railings} railings, ${diagnostics.objectCounts.transitShelters} shelters`
      ),
      createMetric(
        'Signage',
        `${diagnostics.signageWayfinding.totalSigns} signs, ${diagnostics.signageWayfinding.routeBoundSigns} routes, ${diagnostics.signageWayfinding.frontageBoundSigns} frontages`
      ),
      createMetric(
        'Transit',
        `${diagnostics.objectCounts.transitRoutes} routes, ${diagnostics.objectCounts.transitStops} stops, ${diagnostics.objectCounts.transitPassengerDemand} demand`
      ),
      createMetric(
        'Cycling',
        `${diagnostics.objectCounts.bikeSegments} segments, ${diagnostics.objectCounts.bikeParking} parking, ${diagnostics.objectCounts.bikeConflictZones} conflicts`
      ),
      createMetric(
        'Navigation',
        `${diagnostics.objectCounts.navigationModes} modes, ${diagnostics.objectCounts.navigationGraphNodes} nodes, ${diagnostics.objectCounts.navigationRoutes} routes`
      ),
      createMetric(
        'Freight',
        `${diagnostics.objectCounts.freightRoutes} routes, ${diagnostics.objectCounts.freightLoadingDocks} docks, ${diagnostics.objectCounts.serviceAlleys} alleys`
      ),
      createMetric(
        'Metrics',
        `${diagnostics.cityMetrics.total} metrics, ${diagnostics.cityMetrics.passing} pass, ${diagnostics.cityMetrics.warnings} warn`
      ),
      createMetric(
        'Weather',
        `${diagnostics.climateWeather.activePresetKind}, ${diagnostics.climateWeather.total} presets, ${diagnostics.climateWeather.rainyPresets} rain`
      ),
      createMetric(
        'Solar',
        `${diagnostics.solarShading.total} samples, ${diagnostics.solarShading.roofSolarSamples} roofs, ${diagnostics.solarShading.highGlareSamples} glare`
      ),
      createMetric(
        'Heat',
        `${diagnostics.urbanHeat.total} zones, ${diagnostics.urbanHeat.highRiskZones} high, ${diagnostics.urbanHeat.publicRouteRiskZones} routes`
      ),
      createMetric('Validation', getStatusLabel(diagnostics.validation.passed, diagnostics.validation.issues.length)),
      createMetric('Geo', `${diagnostics.geospatial.coordinateSystem}, ${coordinatePrecision}m`),
      createMetric(
        'Metadata',
        `${diagnostics.sourceMetadata.objectsWithMetadata}/${diagnostics.objectIndex.objectIds.length} tagged`
      ),
      createMetric(
        'Traffic',
        `${diagnostics.objectCounts.trafficVehicles} agents, ${diagnostics.objectCounts.laneMarkings} markings`
      ),
      createMetric(
        'Streets',
        `${diagnostics.roadNetwork.hierarchyKinds} hierarchies, ${diagnostics.roadNetwork.namedCorridors.length} corridors, ${diagnostics.roadNetwork.transitEligibleRoads} transit`
      ),
      createMetric(
        'Lanes',
        `${diagnostics.laneRestrictions.busOnlyLanes} bus, ${diagnostics.laneRestrictions.turnPocketLanes} turn, ${diagnostics.laneRestrictions.reversibleLanes} reversible`
      ),
      createMetric(
        'Curbs',
        `${diagnostics.objectCounts.citywideCurbZones} citywide, ${diagnostics.objectCounts.parkingCurbZones} parking, ${diagnostics.objectCounts.loadingCurbZones} loading`
      ),
      createMetric(
        'Junctions',
        `${diagnostics.intersectionBehavior.signalized} signal, ${diagnostics.intersectionBehavior.stopControlled} stop, ${diagnostics.intersectionBehavior.raisedJunctions} raised`
      ),
      createMetric(
        'Crossings',
        `${diagnostics.crossingDetails.total} total, ${diagnostics.crossingDetails.midblockCrossings} midblock, ${diagnostics.crossingDetails.raisedCrossings} raised`
      ),
      createMetric(
        'Access',
        `${diagnostics.sidewalkAccessibility.accessibleSidewalks}/${diagnostics.sidewalkAccessibility.sidewalks} walks, ${diagnostics.sidewalkAccessibility.minimumClearPathMeters}m clear`
      ),
      createMetric(
        'Calming',
        `${diagnostics.trafficCalming.total} devices, ${diagnostics.trafficCalming.curbExtensions} curb, ${diagnostics.trafficCalming.minimumTargetSpeedKph}kph min`
      ),
      createMetric(
        'City',
        `${diagnostics.objectCounts.buildings} buildings, ${diagnostics.objectCounts.activeFrontages} frontages`
      ),
      createMetric(
        'Typologies',
        `${diagnostics.buildingTypologies.typologyKinds} kinds, ${diagnostics.buildingTypologies.storefrontEntrances} storefront, ${diagnostics.buildingTypologies.yardLoadingBuildings} yard`
      ),
      createMetric(
        'Civic',
        `${diagnostics.civicAnchors.total} anchors, ${diagnostics.civicAnchors.serviceTypes} services, ${diagnostics.civicAnchors.emergencyAccessAnchors} emergency`
      ),
      createMetric(
        'Community',
        `${diagnostics.communityAnchors.total} anchors, ${diagnostics.communityAnchors.dailyVisitors} visits, ${diagnostics.communityAnchors.crowdEventReadyAnchors} crowd`
      ),
      createMetric(
        'Culture',
        `${diagnostics.cultureAnchors.total} anchors, ${diagnostics.cultureAnchors.culturalFootfallDaily} footfall, ${diagnostics.cultureAnchors.eveningActivityAnchors} evening`
      ),
      createMetric(
        'Government',
        `${diagnostics.governmentAnchors.total} anchors, ${diagnostics.governmentAnchors.serviceCounters} counters, ${diagnostics.governmentAnchors.plazaLinkedAnchors} plaza links`
      ),
      createMetric(
        'Healthcare',
        `${diagnostics.healthcareAnchors.total} anchors, ${diagnostics.healthcareAnchors.dailyPatients} patients, ${diagnostics.healthcareAnchors.ambulanceBays} ambulance bays`
      ),
      createMetric(
        'Emergency',
        `${diagnostics.emergencyServiceAnchors.total} anchors, ${diagnostics.emergencyServiceAnchors.vehicles} vehicles, ${diagnostics.emergencyServiceAnchors.fireSafetyProfilesCovered} covered`
      ),
      createMetric(
        'Footprints',
        `${diagnostics.buildingFootprints.grammarKinds} kinds, ${diagnostics.buildingFootprints.offsetFootprints} offset, ${diagnostics.buildingFootprints.towers} towers`
      ),
      createMetric(
        'Shells',
        `${diagnostics.buildingStructureShells.structuralSystemKinds} systems, ${diagnostics.buildingStructureShells.floorPlates} plates, ${diagnostics.buildingStructureShells.transferLevels} transfer`
      ),
      createMetric(
        'Facades',
        `${diagnostics.buildingFacades.facadeRhythms} rhythms, ${diagnostics.buildingFacades.windowModules} windows, ${diagnostics.buildingFacades.storefrontModules} storefront`
      ),
      createMetric(
        'Roofs',
        `${diagnostics.buildingRoofs.roofStyles} styles, ${diagnostics.buildingRoofs.detailModules} details, ${diagnostics.buildingRoofs.heightExemptions} exempt`
      ),
      createMetric(
        'Entrances',
        `${diagnostics.buildingAccess.entrances} entries, ${diagnostics.buildingAccess.addressPoints} addresses, ${diagnostics.buildingAccess.loadingDoors} loading`
      ),
      createMetric(
        'Fire Safety',
        `${diagnostics.buildingFireSafety.profiles} profiles, ${diagnostics.buildingFireSafety.fireLaneBuildings} lanes, ${diagnostics.buildingFireSafety.refugeAreas} refuge`
      ),
      createMetric(
        'Gazetteer',
        `${diagnostics.addressingGazetteer.namedPlaces} places, ${diagnostics.addressingGazetteer.gazetteerEntries} entries, ${diagnostics.addressingGazetteer.reverseLookupEntries} reverse`
      ),
      createMetric(
        'Assets',
        `${diagnostics.assetBindingDiagnostics.assetDefinitions} assets, ${diagnostics.assetBindingDiagnostics.renderBindings} bindings, ${diagnostics.assetBindingDiagnostics.materialZoneRegistry.definitions} zones`
      ),
      createMetric(
        'Export',
        `${diagnostics.importExport.supportedFormatCount} formats, ${diagnostics.importExport.proceduralSeedExport.objectCount} objects`
      ),
      createMetric('Registry', `${diagnostics.objectRegistry.registeredKinds} kinds`),
      createMetric(
        'Groups',
        `${diagnostics.objectGroups.groupCount} groups, ${diagnostics.objectGroups.countsByKind['district']} districts`
      ),
      createMetric('Overlays', `${diagnostics.overlays.length}: ${overlayNames}`),
      createMetric(
        'LOD',
        `${diagnostics.lodPolicy.rules.length} tiers ${lodTiers}, ${diagnostics.lodCoverage.objectPolicyCount} policies`
      ),
      createMetric('Performance', `${performance.budget.status}, ${performance.renderer.drawCalls} draw calls`),
      createMetric('Frame', `${performance.frameTiming.status}, ${performance.frameTiming.estimatedFps} fps`)
    );
  }
}

function createMetric(label: string, value: string): HTMLElement {
  const item = document.createElement('div');
  item.className = 'city-debug-panel__metric';

  const labelElement = document.createElement('span');
  labelElement.className = 'city-debug-panel__label';
  labelElement.textContent = label;

  const valueElement = document.createElement('span');
  valueElement.className = 'city-debug-panel__value';
  valueElement.textContent = value;

  item.append(labelElement, valueElement);
  return item;
}

function createLayerControls(
  layers: readonly CitySceneLayerRuntimeState[],
  layerObjectCounts: ReadonlyMap<CitySceneLayerId, number>,
  setSceneLayerVisible: DebugPanelSource['setSceneLayerVisible'],
  setSceneLayerRenderOrder: DebugPanelSource['setSceneLayerRenderOrder']
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'city-debug-panel__layer-controls';
  section.setAttribute('aria-label', 'Scene layer controls');

  const heading = document.createElement('div');
  heading.className = 'city-debug-panel__layer-heading';
  heading.textContent = 'Layers';
  section.append(heading);

  for (const layer of layers) {
    const row = document.createElement('div');
    row.className = 'city-debug-panel__layer-row';

    const checkbox = document.createElement('input');
    checkbox.className = 'city-debug-panel__layer-checkbox';
    checkbox.type = 'checkbox';
    checkbox.checked = layer.visible;
    checkbox.dataset.cityLayerToggle = layer.id;
    checkbox.setAttribute('aria-label', `${layer.name} layer`);
    checkbox.addEventListener('change', () => {
      setSceneLayerVisible(layer.id, checkbox.checked);
    });

    const label = document.createElement('span');
    label.className = 'city-debug-panel__layer-label';
    label.textContent = layer.name;

    const count = document.createElement('span');
    count.className = 'city-debug-panel__layer-count';
    count.textContent = `${layerObjectCounts.get(layer.id) ?? 0}`;
    count.title = `${layer.name} objects`;

    const order = document.createElement('input');
    order.className = 'city-debug-panel__layer-order';
    order.type = 'number';
    order.min = '0';
    order.max = '99';
    order.step = '1';
    order.value = String(layer.renderOrder);
    order.dataset.cityLayerOrder = layer.id;
    order.setAttribute('aria-label', `${layer.name} render order`);
    order.addEventListener('change', () => {
      setSceneLayerRenderOrder(layer.id, order.valueAsNumber);
      const currentValue = Number.isFinite(order.valueAsNumber) ? Math.round(order.valueAsNumber) : layer.renderOrder;
      order.value = String(Math.max(0, Math.min(99, currentValue)));
    });

    row.append(checkbox, label, count, order);
    section.append(row);
  }

  return section;
}

function getStatusLabel(passed: boolean, issueCount: number): string {
  return `${passed ? 'pass' : 'fail'}, ${issueCount} issues`;
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function isDebugPanelHiddenByUrl(): boolean {
  return new URLSearchParams(window.location.search).get('debugPanel') === 'hidden';
}
