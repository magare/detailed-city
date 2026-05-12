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
import { applyConstraintFilters } from './constraints/applyConstraintFilters';
import { ConstraintGenerator } from './constraints/ConstraintGenerator';
import { attachCurbZoneIdsToSlices, CurbZoneGenerator } from './curbs/CurbZoneGenerator';
import { AdministrativeBoundaryGenerator } from './land/AdministrativeBoundaryGenerator';
import { HazardZoneGenerator } from './land/HazardZoneGenerator';
import { SoilGeologyGenerator } from './land/SoilGeologyGenerator';
import { TopographyGenerator } from './land/TopographyGenerator';
import { WaterfrontGenerator } from './land/WaterfrontGenerator';
import { CityMetricGenerator } from './metrics/CityMetricGenerator';
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
    const developmentPhases = new PhasingGenerator().create({ bounds });
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
    const civicAnchors = new CivicAnchorGenerator().create({
      administrativeBoundaries: administrativeLand.administrativeBoundaries,
      districts: landAndBuildingsWithTopography.districts,
      parcels: soilGeology.parcels,
      buildings: sliceTagged.buildings
    });
    const cityMetrics = new CityMetricGenerator(this.config).create({
      bounds,
      roads: sliceTagged.roads,
      crossings: sliceTagged.crossings,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      parcels: sliceTagged.parcels,
      buildings: sliceTagged.buildings,
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
      constraints,
      hazardZones,
      topographyZones: topography.topographyZones,
      soilGeologyZones: soilGeology.soilGeologyZones,
      resilienceGoals,
      blocks: administrativeLand.blocks,
      verticalSlices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      intersections: sliceTagged.intersections,
      crossings: sliceTagged.crossings,
      curbZones,
      trafficCalmingDevices,
      streetLights,
      streetFurniture,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      parcels: sliceTagged.parcels,
      buildings: sliceTagged.buildings,
      civicAnchors,
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
