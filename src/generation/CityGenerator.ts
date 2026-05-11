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
import { applyConstraintFilters } from './constraints/applyConstraintFilters';
import { ConstraintGenerator } from './constraints/ConstraintGenerator';
import { attachCurbZoneIdsToSlices, CurbZoneGenerator } from './curbs/CurbZoneGenerator';
import { AdministrativeBoundaryGenerator } from './land/AdministrativeBoundaryGenerator';
import { WaterfrontGenerator } from './land/WaterfrontGenerator';
import { CityMetricGenerator } from './metrics/CityMetricGenerator';
import { StreetFurnitureGenerator } from './public-realm/StreetFurnitureGenerator';
import { StreetLightGenerator } from './public-realm/StreetLightGenerator';
import { StreetTreeGenerator } from './public-realm/StreetTreeGenerator';
import { ResilienceGoalGenerator } from './resilience/ResilienceGoalGenerator';
import { PedestrianNetworkGenerator } from './roads/PedestrianNetworkGenerator';
import { RoadNetworkGenerator } from './roads/RoadNetworkGenerator';
import { applyDetailedStreetSliceTags, DetailedStreetSliceGenerator } from './slices/DetailedStreetSliceGenerator';
import { TerrainGenerator } from './terrain/TerrainGenerator';
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
    const pedestrianNetwork = new PedestrianNetworkGenerator().create(roads, intersections);
    const parks = terrainGenerator.generateParks(bounds);
    const waterways = terrainGenerator.generateWaterways(bounds, roads);
    const constraints = new ConstraintGenerator(this.config).create({ bounds, parks, waterways, roads });
    const excludedBlocks = terrainGenerator.getExcludedBlocks(bounds, constraints);
    const landAndBuildings = applyConstraintFilters(buildingGenerator.generate(bounds, excludedBlocks), constraints);
    const administrativeLand = new AdministrativeBoundaryGenerator().create({
      bounds,
      districts: landAndBuildings.districts,
      blocks: landAndBuildings.blocks,
      parcels: landAndBuildings.parcels
    });
    const resilienceGoals = new ResilienceGoalGenerator(this.config).create({
      bounds,
      parks,
      roads,
      waterways
    });
    const waterfrontEdges = new WaterfrontGenerator().create({
      waterways,
      roads,
      parks
    });
    const parkTrees = terrainGenerator.generateTreePlantings(parks);
    const verticalSlices = new DetailedStreetSliceGenerator(this.config).create({
      roads,
      intersections,
      crossings: pedestrianNetwork.crossings,
      sidewalkGraph: pedestrianNetwork.sidewalkGraph,
      parcels: administrativeLand.parcels,
      buildings: landAndBuildings.buildings
    });
    const sliceTagged = applyDetailedStreetSliceTags(
      {
        roads,
        intersections,
        crossings: pedestrianNetwork.crossings,
        sidewalkGraph: pedestrianNetwork.sidewalkGraph,
        parcels: administrativeLand.parcels,
        buildings: landAndBuildings.buildings
      },
      verticalSlices
    );
    const curbZones = new CurbZoneGenerator().create({
      slices: verticalSlices,
      roads: sliceTagged.roads,
      intersections: sliceTagged.intersections
    });
    const verticalSlicesWithCurbs = attachCurbZoneIdsToSlices(verticalSlices, curbZones);
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
      curbZones
    });
    const activeFrontages = new ActiveFrontageGenerator().create({
      slices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      parcels: sliceTagged.parcels,
      buildings: sliceTagged.buildings
    });
    const trees = [...parkTrees, ...streetTrees];
    const cityMetrics = new CityMetricGenerator(this.config).create({
      bounds,
      roads: sliceTagged.roads,
      crossings: sliceTagged.crossings,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      parcels: sliceTagged.parcels,
      buildings: sliceTagged.buildings,
      activeFrontages,
      parks,
      resilienceGoals
    });

    const generatedWithoutMetadata: Omit<GeneratedCity, 'objectIndex' | 'validation'> = {
      schemaVersion: CITY_CONTRACT_SCHEMA_VERSION,
      geospatial: LOCAL_CITY_FRAME,
      lodPolicy: DEFAULT_CITY_LOD_POLICY,
      performanceBudget: DEFAULT_PERFORMANCE_BUDGET,
      bounds,
      administrativeBoundaries: administrativeLand.administrativeBoundaries,
      districts: landAndBuildings.districts,
      zoningDistricts: landAndBuildings.zoningDistricts,
      cityMetrics,
      constraints,
      resilienceGoals,
      blocks: administrativeLand.blocks,
      verticalSlices: verticalSlicesWithCurbs,
      roads: sliceTagged.roads,
      intersections: sliceTagged.intersections,
      crossings: sliceTagged.crossings,
      curbZones,
      streetLights,
      streetFurniture,
      sidewalkGraph: sliceTagged.sidewalkGraph,
      parcels: sliceTagged.parcels,
      buildings: sliceTagged.buildings,
      activeFrontages,
      parks,
      waterways,
      waterfrontEdges,
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
