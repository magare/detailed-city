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
import { BuildingGenerator } from './buildings/BuildingGenerator';
import { CivicAnchorGenerator } from './civic/CivicAnchorGenerator';
import { CommunityAnchorGenerator } from './civic/CommunityAnchorGenerator';
import { CultureAnchorGenerator } from './civic/CultureAnchorGenerator';
import { GovernmentAnchorGenerator } from './civic/GovernmentAnchorGenerator';
import { applyConstraintFilters } from './constraints/applyConstraintFilters';
import { ConstraintGenerator } from './constraints/ConstraintGenerator';
import { attachCurbZoneIdsToSlices, CurbZoneGenerator } from './curbs/CurbZoneGenerator';
import { ClimateWeatherGenerator } from './environment/ClimateWeatherGenerator';
import { SolarShadingGenerator } from './environment/SolarShadingGenerator';
import { UrbanHeatGenerator } from './environment/UrbanHeatGenerator';
import { AdministrativeBoundaryGenerator } from './land/AdministrativeBoundaryGenerator';
import { CadastreGenerator } from './land/CadastreGenerator';
import { HazardZoneGenerator } from './land/HazardZoneGenerator';
import { SoilGeologyGenerator } from './land/SoilGeologyGenerator';
import { TopographyGenerator } from './land/TopographyGenerator';
import { WaterfrontGenerator } from './land/WaterfrontGenerator';
import { CityMetricGenerator } from './metrics/CityMetricGenerator';
import { CyclingNetworkGenerator } from './mobility/CyclingNetworkGenerator';
import { FreightLogisticsGenerator } from './mobility/FreightLogisticsGenerator';
import { TransitGenerator } from './mobility/TransitGenerator';
import { PhasingGenerator } from './phasing/PhasingGenerator';
import { PlazaGenerator } from './public-realm/PlazaGenerator';
import { StreetFurnitureGenerator } from './public-realm/StreetFurnitureGenerator';
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
      curbZones
    });
    const streetFurniture = new StreetFurnitureGenerator().create({
      slices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      intersections: sliceTagged.intersections,
      curbZones
    });
    const transit = new TransitGenerator().create({
      roads: sliceTagged.roads,
      streetFurniture
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
    const activeFrontages = new ActiveFrontageGenerator().create({
      slices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      parcels: sliceTagged.parcels,
      buildings: sliceTagged.buildings
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
    const civicAnchors = new CivicAnchorGenerator().create({
      administrativeBoundaries: administrativeLand.administrativeBoundaries,
      districts: landAndBuildingsWithTopography.districts,
      parcels: soilGeology.parcels,
      buildings: gasDistrictEnergy.buildings
    });
    const governmentAnchors = new GovernmentAnchorGenerator().create({
      civicAnchors,
      buildings: gasDistrictEnergy.buildings,
      plazaZones
    });
    const cultureAnchors = new CultureAnchorGenerator().create({
      civicAnchors,
      buildings: gasDistrictEnergy.buildings,
      plazaZones
    });
    const communityAnchors = new CommunityAnchorGenerator().create({
      civicAnchors,
      buildings: gasDistrictEnergy.buildings,
      plazaZones
    });
    const cityMetrics = new CityMetricGenerator(this.config).create({
      bounds,
      roads: stormwater.roads,
      crossings: sliceTagged.crossings,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      parcels: sliceTagged.parcels,
      buildings: gasDistrictEnergy.buildings,
      activeFrontages,
      parks: parksWithFeatures,
      resilienceGoals
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
      utilityNodes: gasDistrictEnergy.utilityNodes,
      utilityEdges: gasDistrictEnergy.utilityEdges,
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
      trafficCalmingDevices,
      transitStops: transit.stops,
      transitRoutes: transit.routes,
      bikeSegments: cycling.bikeSegments,
      bikeGraphNodes: cycling.bikeGraphNodes,
      bikeGraphEdges: cycling.bikeGraphEdges,
      bikeParking: cycling.bikeParking,
      bikeSignals: cycling.bikeSignals,
      bikeConflictZones: cycling.bikeConflictZones,
      freightLoadingDocks: freightLogistics.loadingDocks,
      freightRoutes: freightLogistics.routes,
      serviceAlleys: freightLogistics.serviceAlleys,
      streetLights: powerGrid.streetLights,
      streetFurniture,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      parcels: sliceTagged.parcels,
      buildings: gasDistrictEnergy.buildings,
      civicAnchors,
      communityAnchors,
      cultureAnchors,
      governmentAnchors,
      activeFrontages,
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
