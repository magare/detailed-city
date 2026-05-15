import {
  CITY_CONTRACT_SCHEMA_VERSION,
  DEFAULT_CITY_LOD_POLICY,
  DEFAULT_PERFORMANCE_BUDGET,
  LOCAL_CITY_FRAME
} from '../city/data-contracts/cityContracts';
import { createGeneratedCityObjectIndex } from '../city/data-contracts/generatedCityObjectIndex';
import { validateGeneratedCity } from '../city/data-contracts/validation/validateGeneratedCity';
import { DEFAULT_RENDER_ASSET_CATALOG, DEFAULT_RENDER_BINDINGS } from '../city/rendering-handoff/asset-binding/defaultAssetCatalog';
import type { CityConfig, GeneratedCity } from '../types/city';
import { SeededRandom } from '../utils/random';
import { ActiveFrontageGenerator } from './buildings/ActiveFrontageGenerator';
import { BuildingFireSafetyGenerator } from './buildings/BuildingFireSafetyGenerator';
import { BuildingGenerator } from './buildings/BuildingGenerator';
import { EntranceAddressGenerator } from './buildings/EntranceAddressGenerator';
import { CivicAnchorGenerator } from './civic/CivicAnchorGenerator';
import { CommunityAnchorGenerator } from './civic/CommunityAnchorGenerator';
import { CultureAnchorGenerator } from './civic/CultureAnchorGenerator';
import { EmergencyServiceAnchorGenerator } from './civic/EmergencyServiceAnchorGenerator';
import { GovernmentAnchorGenerator } from './civic/GovernmentAnchorGenerator';
import { HealthcareAnchorGenerator } from './civic/HealthcareAnchorGenerator';
import { applyConstraintFilters } from './constraints/applyConstraintFilters';
import { ConstraintGenerator } from './constraints/ConstraintGenerator';
import { attachCurbZoneIdsToSlices, CurbZoneGenerator } from './curbs/CurbZoneGenerator';
import { ClimateWeatherGenerator } from './environment/ClimateWeatherGenerator';
import { SolarShadingGenerator } from './environment/SolarShadingGenerator';
import { UrbanHeatGenerator } from './environment/UrbanHeatGenerator';
import { AdministrativeBoundaryGenerator } from './land/AdministrativeBoundaryGenerator';
import { AddressingGazetteerGenerator } from './land/AddressingGazetteerGenerator';
import { CadastreGenerator } from './land/CadastreGenerator';
import { HazardZoneGenerator } from './land/HazardZoneGenerator';
import { SoilGeologyGenerator } from './land/SoilGeologyGenerator';
import { TopographyGenerator } from './land/TopographyGenerator';
import { AccessControlGenerator } from './land/AccessControlGenerator';
import { WaterfrontGenerator } from './land/WaterfrontGenerator';
import { CityMetricGenerator } from './metrics/CityMetricGenerator';
import { CyclingNetworkGenerator } from './mobility/CyclingNetworkGenerator';
import { FreightLogisticsGenerator } from './mobility/FreightLogisticsGenerator';
import { NavigationGraphGenerator } from './mobility/NavigationGraphGenerator';
import { TransitGenerator } from './mobility/TransitGenerator';
import { WaterTransportAccessGenerator } from './mobility/WaterTransportAccessGenerator';
import { AssetInventoryGenerator } from './operations/AssetInventoryGenerator';
import { MaintenanceOperationGenerator } from './operations/MaintenanceOperationGenerator';
import { PermitInspectionGenerator } from './operations/PermitInspectionGenerator';
import { PhasingGenerator } from './phasing/PhasingGenerator';
import { CurbActivationGenerator } from './public-realm/CurbActivationGenerator';
import { GreenStormwaterGenerator } from './public-realm/GreenStormwaterGenerator';
import { PlazaGenerator } from './public-realm/PlazaGenerator';
import { PublicAmenityGenerator } from './public-realm/PublicAmenityGenerator';
import { attachSignageWayfindingBindings, StreetFurnitureGenerator } from './public-realm/StreetFurnitureGenerator';
import { StreetLightGenerator } from './public-realm/StreetLightGenerator';
import { StreetTreeGenerator } from './public-realm/StreetTreeGenerator';
import { WaterfrontOpenSpaceGenerator } from './public-realm/WaterfrontOpenSpaceGenerator';
import { ResilienceGoalGenerator } from './resilience/ResilienceGoalGenerator';
import { PedestrianNetworkGenerator } from './roads/PedestrianNetworkGenerator';
import { RoadNetworkGenerator } from './roads/RoadNetworkGenerator';
import { applyDetailedStreetSliceTags, DetailedStreetSliceGenerator } from './slices/DetailedStreetSliceGenerator';
import { TerrainGenerator } from './terrain/TerrainGenerator';
import { TrafficCalmingGenerator } from './traffic/TrafficCalmingGenerator';
import { PowerGridGenerator } from './utilities/PowerGridGenerator';
import { StormwaterGenerator } from './utilities/StormwaterGenerator';
import { TelecomGenerator } from './utilities/TelecomGenerator';
import { GasDistrictEnergyGenerator } from './utilities/GasDistrictEnergyGenerator';
import { ServiceAccessCorridorGenerator } from './utilities/ServiceAccessCorridorGenerator';
import { UtilityBaseGenerator } from './utilities/UtilityBaseGenerator';
import { WaterSupplyGenerator } from './utilities/WaterSupplyGenerator';
import { WastewaterGenerator } from './utilities/WastewaterGenerator';
import { applyGeneratedCitySourceMetadata } from './applySourceMetadata';

export class CityGenerator {
  private readonly random: SeededRandom;

  constructor(private readonly config: CityConfig) {
    this.random = new SeededRandom(config.seed);
  }

  generate(): GeneratedCity {
    const roadGenerator = new RoadNetworkGenerator(this.config);
    const terrainGenerator = new TerrainGenerator(this.config);
    const buildingGenerator = new BuildingGenerator(this.config, this.random);

    const bounds = roadGenerator.getBounds();
    const roads = roadGenerator.generate();
    const intersections = roadGenerator.generateIntersections(roads);
    const parks = terrainGenerator.generateParks(bounds);
    const waterways = terrainGenerator.generateWaterways(bounds, roads);
    const constraints = new ConstraintGenerator(this.config).create({ bounds, parks, waterways, roads });
    const excludedBlocks = terrainGenerator.getExcludedBlocks(bounds, constraints);
    const landAndBuildings = applyConstraintFilters(buildingGenerator.generate(bounds, excludedBlocks), constraints);
    const topography = new TopographyGenerator().create({
      bounds,
      roads,
      buildings: landAndBuildings.buildings
    });
    const roadsWithTopography = topography.roads;
    const pedestrianNetwork = new PedestrianNetworkGenerator().create(roadsWithTopography, intersections);
    const parksWithSidewalks = terrainGenerator.connectParksToSidewalks(parks, roadsWithTopography);
    const parkFeatures = terrainGenerator.generateParkFeatures(parksWithSidewalks);
    const parksWithFeatures = terrainGenerator.attachParkFeatureIds(parksWithSidewalks, parkFeatures);
    const landAndBuildingsWithTopography = {
      ...landAndBuildings,
      buildings: topography.buildings
    };
    const administrativeLand = new AdministrativeBoundaryGenerator().create({
      bounds,
      districts: landAndBuildingsWithTopography.districts,
      blocks: landAndBuildingsWithTopography.blocks,
      parcels: landAndBuildingsWithTopography.parcels
    });
    const resilienceGoals = new ResilienceGoalGenerator(this.config).create({
      bounds,
      parks: parksWithFeatures,
      roads: roadsWithTopography,
      waterways
    });
    const waterfrontEdges = new WaterfrontGenerator().create({
      waterways,
      roads: roadsWithTopography,
      parks: parksWithFeatures
    });
    const hazardZones = new HazardZoneGenerator().create({
      bounds,
      constraints,
      roads: roadsWithTopography,
      waterways,
      zoningDistricts: landAndBuildingsWithTopography.zoningDistricts
    });
    const soilGeology = new SoilGeologyGenerator().create({
      bounds,
      districts: landAndBuildingsWithTopography.districts,
      parcels: administrativeLand.parcels,
      buildings: landAndBuildingsWithTopography.buildings,
      topographyZones: topography.topographyZones,
      hazardZones,
      waterways
    });
    const cadastreRecords = new CadastreGenerator().create(soilGeology.parcels);
    const developmentPhases = new PhasingGenerator().create({ bounds });
    const weatherPresets = new ClimateWeatherGenerator().create();
    const parkTrees = terrainGenerator.generateTreePlantings(parksWithFeatures);
    const verticalSlices = new DetailedStreetSliceGenerator(this.config).create({
      roads: roadsWithTopography,
      intersections,
      crossings: pedestrianNetwork.crossings,
      sidewalkGraph: pedestrianNetwork.sidewalkGraph,
      parcels: soilGeology.parcels,
      buildings: soilGeology.buildings
    });
    const sliceTagged = applyDetailedStreetSliceTags(
      {
        roads: roadsWithTopography,
        intersections,
        crossings: pedestrianNetwork.crossings,
        sidewalkGraph: pedestrianNetwork.sidewalkGraph,
        parcels: soilGeology.parcels,
        buildings: soilGeology.buildings
      },
      verticalSlices
    );
    const curbZones = new CurbZoneGenerator().create({
      slices: verticalSlices,
      roads: sliceTagged.roads,
      intersections: sliceTagged.intersections
    });
    const verticalSlicesWithCurbs = attachCurbZoneIdsToSlices(verticalSlices, curbZones);
    const trafficCalmingDevices = new TrafficCalmingGenerator().create({
      slices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      intersections: sliceTagged.intersections,
      crossings: sliceTagged.crossings,
      curbZones
    });
    const streetTrees = new StreetTreeGenerator().create({
      slices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      curbZones
    });
    const streetLights = new StreetLightGenerator().create({
      slices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      curbZones,
      intersections: sliceTagged.intersections
    });
    const activeFrontages = new ActiveFrontageGenerator().create({
      slices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      parcels: sliceTagged.parcels,
      buildings: sliceTagged.buildings
    });
    const streetFurnitureSeed = new StreetFurnitureGenerator().create({
      slices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      intersections: sliceTagged.intersections,
      curbZones
    });
    const transit = new TransitGenerator().create({
      roads: sliceTagged.roads,
      streetFurniture: streetFurnitureSeed
    });
    const streetFurniture = attachSignageWayfindingBindings({
      streetFurniture: streetFurnitureSeed,
      roads: sliceTagged.roads,
      districts: landAndBuildingsWithTopography.districts,
      parcels: sliceTagged.parcels,
      activeFrontages,
      transitRoutes: transit.routes
    });
    const cycling = new CyclingNetworkGenerator().create({
      roads: sliceTagged.roads,
      intersections: sliceTagged.intersections,
      crossings: sliceTagged.crossings,
      curbZones,
      streetFurniture,
      transitStops: transit.stops
    });
    const freightLogistics = new FreightLogisticsGenerator().create({
      roads: sliceTagged.roads,
      parcels: sliceTagged.parcels,
      buildings: sliceTagged.buildings,
      curbZones
    });
    const plazaZones = new PlazaGenerator().create({
      parks: parksWithFeatures,
      parkFeatures,
      activeFrontages
    });
    const trees = [...parkTrees, ...streetTrees];
    const waterfrontOpenSpaces = new WaterfrontOpenSpaceGenerator().create({
      waterfrontEdges,
      parks: parksWithFeatures,
      streetFurniture,
      trees
    });
    const solarShadingSamples = new SolarShadingGenerator().create({
      buildings: sliceTagged.buildings,
      plazaZones,
      parks: parksWithFeatures,
      parkFeatures,
      waterfrontOpenSpaces,
      trees,
      weatherPresets
    });
    const urbanHeatZones = new UrbanHeatGenerator().create({
      districts: landAndBuildingsWithTopography.districts,
      buildings: sliceTagged.buildings,
      roads: sliceTagged.roads,
      hazardZones,
      solarShadingSamples,
      trees,
      weatherPresets,
      waterfrontOpenSpaces
    });
    const utilityBase = new UtilityBaseGenerator().create({
      administrativeBoundaries: administrativeLand.administrativeBoundaries,
      districts: landAndBuildingsWithTopography.districts,
      parcels: soilGeology.parcels,
      roads: sliceTagged.roads
    });
    const powerGrid = new PowerGridGenerator().create({
      utilityNodes: utilityBase.utilityNodes,
      utilityEdges: utilityBase.utilityEdges,
      roads: sliceTagged.roads,
      buildings: sliceTagged.buildings,
      streetLights
    });
    const waterSupply = new WaterSupplyGenerator().create({
      utilityNodes: powerGrid.utilityNodes,
      utilityEdges: powerGrid.utilityEdges,
      roads: sliceTagged.roads,
      buildings: powerGrid.buildings
    });
    const wastewater = new WastewaterGenerator().create({
      utilityNodes: waterSupply.utilityNodes,
      utilityEdges: waterSupply.utilityEdges,
      roads: sliceTagged.roads,
      buildings: waterSupply.buildings,
      waterways
    });
    const stormwater = new StormwaterGenerator().create({
      utilityNodes: wastewater.utilityNodes,
      utilityEdges: wastewater.utilityEdges,
      roads: sliceTagged.roads,
      waterways,
      hazardZones
    });
    const greenStormwaterFeatures = new GreenStormwaterGenerator().create({
      roads: stormwater.roads,
      utilityNodes: stormwater.utilityNodes,
      utilityEdges: stormwater.utilityEdges,
      trees
    });
    const telecom = new TelecomGenerator().create({
      utilityNodes: stormwater.utilityNodes,
      utilityEdges: stormwater.utilityEdges,
      roads: stormwater.roads,
      buildings: wastewater.buildings
    });
    const gasDistrictEnergy = new GasDistrictEnergyGenerator().create({
      utilityNodes: telecom.utilityNodes,
      utilityEdges: telecom.utilityEdges,
      roads: stormwater.roads,
      buildings: telecom.buildings
    });
    const serviceAccess = new ServiceAccessCorridorGenerator().create({
      cadastreRecords,
      parcels: soilGeology.parcels,
      buildings: gasDistrictEnergy.buildings,
      roads: stormwater.roads,
      utilityNodes: gasDistrictEnergy.utilityNodes,
      utilityEdges: gasDistrictEnergy.utilityEdges
    });
    const publicAmenities = new PublicAmenityGenerator().create({
      streetFurniture,
      plazaZones,
      waterfrontOpenSpaces,
      serviceAccessCorridors: serviceAccess.serviceAccessCorridors
    });
    const entranceAddress = new EntranceAddressGenerator().create({
      buildings: serviceAccess.buildings,
      parcels: soilGeology.parcels,
      roads: stormwater.roads,
      activeFrontages,
      serviceAccessCorridors: serviceAccess.serviceAccessCorridors,
      freightLoadingDocks: freightLogistics.loadingDocks
    });
    const buildingFireSafetyProfiles = new BuildingFireSafetyGenerator().create({
      buildings: entranceAddress.buildings,
      buildingEntrances: entranceAddress.buildingEntrances,
      curbZones,
      utilityNodes: serviceAccess.utilityNodes,
      serviceAccessCorridors: serviceAccess.serviceAccessCorridors
    });
    const navigationGraphs = new NavigationGraphGenerator().create({
      roads: stormwater.roads,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      bikeSegments: cycling.bikeSegments,
      bikeGraphNodes: cycling.bikeGraphNodes,
      bikeGraphEdges: cycling.bikeGraphEdges,
      bikeParking: cycling.bikeParking,
      transitStops: transit.stops,
      transitRoutes: transit.routes,
      freightLoadingDocks: freightLogistics.loadingDocks,
      freightRoutes: freightLogistics.routes,
      serviceAlleys: freightLogistics.serviceAlleys,
      utilityNodes: serviceAccess.utilityNodes
    });
    const accessControl = new AccessControlGenerator().create({
      hazardZones,
      navigationGraphEdges: navigationGraphs.navigationGraphEdges,
      roads: stormwater.roads,
      serviceAccessCorridors: serviceAccess.serviceAccessCorridors,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      transitStops: transit.stops
    });
    const civicAnchors = new CivicAnchorGenerator().create({
      administrativeBoundaries: administrativeLand.administrativeBoundaries,
      districts: landAndBuildingsWithTopography.districts,
      parcels: soilGeology.parcels,
      buildings: entranceAddress.buildings
    });
    const emergencyServiceAnchors = new EmergencyServiceAnchorGenerator().create({
      civicAnchors,
      buildings: entranceAddress.buildings,
      buildingFireSafetyProfiles,
      navigationGraphNodes: navigationGraphs.navigationGraphNodes,
      navigationGraphEdges: accessControl.navigationGraphEdges,
      curbZones
    });
    const waterTransportAccess = new WaterTransportAccessGenerator().create({
      waterways,
      waterfrontEdges,
      waterfrontOpenSpaces,
      freightRoutes: freightLogistics.routes,
      navigationGraphNodes: navigationGraphs.navigationGraphNodes,
      navigationGraphEdges: accessControl.navigationGraphEdges,
      emergencyServiceAnchors,
      roads: stormwater.roads
    });
    const healthcareAnchors = new HealthcareAnchorGenerator().create({
      civicAnchors,
      buildings: entranceAddress.buildings,
      navigationGraphNodes: navigationGraphs.navigationGraphNodes,
      navigationGraphEdges: accessControl.navigationGraphEdges,
      roads: stormwater.roads,
      transitStops: transit.stops
    });
    const governmentAnchors = new GovernmentAnchorGenerator().create({
      civicAnchors,
      buildings: entranceAddress.buildings,
      plazaZones
    });
    const cultureAnchors = new CultureAnchorGenerator().create({
      civicAnchors,
      buildings: entranceAddress.buildings,
      plazaZones
    });
    const communityAnchors = new CommunityAnchorGenerator().create({
      civicAnchors,
      buildings: entranceAddress.buildings,
      plazaZones
    });
    const addressingGazetteer = new AddressingGazetteerGenerator().create({
      addressPoints: entranceAddress.addressPoints,
      administrativeBoundaries: administrativeLand.administrativeBoundaries,
      districts: landAndBuildingsWithTopography.districts,
      parcels: soilGeology.parcels,
      buildings: entranceAddress.buildings,
      roads: stormwater.roads,
      parks: parksWithFeatures,
      waterfrontOpenSpaces,
      civicAnchors,
      communityAnchors,
      cultureAnchors,
      governmentAnchors,
      healthcareAnchors
    });
    const cityMetrics = new CityMetricGenerator(this.config).create({
      bounds,
      roads: stormwater.roads,
      crossings: sliceTagged.crossings,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      parcels: sliceTagged.parcels,
      buildings: entranceAddress.buildings,
      activeFrontages: entranceAddress.activeFrontages,
      parks: parksWithFeatures,
      resilienceGoals
    });
    const assetInventoryRecords = new AssetInventoryGenerator().create({
      assetBindings: DEFAULT_RENDER_BINDINGS,
      civicAnchors: addressingGazetteer.civicAnchors,
      communityAnchors: addressingGazetteer.communityAnchors,
      cultureAnchors: addressingGazetteer.cultureAnchors,
      governmentAnchors: addressingGazetteer.governmentAnchors,
      healthcareAnchors: addressingGazetteer.healthcareAnchors,
      emergencyServiceAnchors,
      waterTransportAccess,
      utilityNodes: serviceAccess.utilityNodes,
      utilityEdges: serviceAccess.utilityEdges,
      streetLights: powerGrid.streetLights,
      streetFurniture,
      parkFeatures,
      plazaZones,
      greenStormwaterFeatures,
      waterfrontOpenSpaces
    });
    const maintenanceOperations = new MaintenanceOperationGenerator().create({
      assetInventoryRecords,
      navigationRoutes: navigationGraphs.navigationRoutes,
      navigationGraphEdges: accessControl.navigationGraphEdges,
      roads: stormwater.roads
    });
    const permitInspectionRecords = new PermitInspectionGenerator().create({
      cadastreRecords,
      maintenanceOperations
    });
    const curbActivations = new CurbActivationGenerator().create({
      curbZones,
      roads: stormwater.roads,
      permitInspectionRecords
    });

    const generatedWithoutMetadata: Omit<GeneratedCity, 'objectIndex' | 'validation'> = {
      schemaVersion: CITY_CONTRACT_SCHEMA_VERSION,
      geospatial: LOCAL_CITY_FRAME,
      lodPolicy: DEFAULT_CITY_LOD_POLICY,
      performanceBudget: DEFAULT_PERFORMANCE_BUDGET,
      bounds,
      administrativeBoundaries: administrativeLand.administrativeBoundaries,
      districts: landAndBuildingsWithTopography.districts,
      zoningDistricts: landAndBuildingsWithTopography.zoningDistricts,
      cityMetrics,
      developmentPhases,
      weatherPresets,
      solarShadingSamples,
      urbanHeatZones,
      utilityNodes: serviceAccess.utilityNodes,
      utilityEdges: serviceAccess.utilityEdges,
      serviceAccessCorridors: serviceAccess.serviceAccessCorridors,
      buildingEntrances: entranceAddress.buildingEntrances,
      buildingFireSafetyProfiles,
      addressPoints: addressingGazetteer.addressPoints,
      namedPlaces: addressingGazetteer.namedPlaces,
      gazetteerEntries: addressingGazetteer.gazetteerEntries,
      constraints,
      hazardZones,
      topographyZones: topography.topographyZones,
      soilGeologyZones: soilGeology.soilGeologyZones,
      cadastreRecords,
      resilienceGoals,
      blocks: administrativeLand.blocks,
      verticalSlices: verticalSlicesWithCurbs,
      roads: stormwater.roads,
      intersections: sliceTagged.intersections,
      crossings: sliceTagged.crossings,
      curbZones,
      curbActivations,
      publicAmenities,
      trafficCalmingDevices,
      accessControls: accessControl.accessControls,
      transitStops: transit.stops,
      transitRoutes: transit.routes,
      bikeSegments: cycling.bikeSegments,
      bikeGraphNodes: cycling.bikeGraphNodes,
      bikeGraphEdges: cycling.bikeGraphEdges,
      bikeParking: cycling.bikeParking,
      bikeSignals: cycling.bikeSignals,
      bikeConflictZones: cycling.bikeConflictZones,
      navigationGraphNodes: navigationGraphs.navigationGraphNodes,
      navigationGraphEdges: accessControl.navigationGraphEdges,
      navigationRoutes: navigationGraphs.navigationRoutes,
      maintenanceOperations,
      permitInspectionRecords,
      freightLoadingDocks: freightLogistics.loadingDocks,
      freightRoutes: freightLogistics.routes,
      serviceAlleys: freightLogistics.serviceAlleys,
      streetLights: powerGrid.streetLights,
      streetFurniture,
      greenStormwaterFeatures,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      parcels: sliceTagged.parcels,
      assetInventoryRecords,
      buildings: entranceAddress.buildings,
      civicAnchors: addressingGazetteer.civicAnchors,
      communityAnchors: addressingGazetteer.communityAnchors,
      cultureAnchors: addressingGazetteer.cultureAnchors,
      governmentAnchors: addressingGazetteer.governmentAnchors,
      healthcareAnchors: addressingGazetteer.healthcareAnchors,
      emergencyServiceAnchors,
      waterTransportAccess,
      activeFrontages: entranceAddress.activeFrontages,
      parks: parksWithFeatures,
      parkFeatures,
      plazaZones,
      waterways,
      waterfrontEdges,
      waterfrontOpenSpaces,
      trees,
      assetCatalog: [...DEFAULT_RENDER_ASSET_CATALOG],
      assetBindings: [...DEFAULT_RENDER_BINDINGS]
    };
    const generatedWithoutIndex = applyGeneratedCitySourceMetadata(generatedWithoutMetadata);
    const generated: Omit<GeneratedCity, 'validation'> = {
      ...generatedWithoutIndex,
      objectIndex: createGeneratedCityObjectIndex(generatedWithoutIndex)
    };

    return {
      ...generated,
      validation: validateGeneratedCity(generated)
    };
  }
}
