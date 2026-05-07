import {
  CITY_CONTRACT_SCHEMA_VERSION,
  DEFAULT_CITY_LOD_POLICY,
  DEFAULT_PERFORMANCE_BUDGET,
  LOCAL_CITY_FRAME
} from '../city/data-contracts/cityContracts';
import { validateGeneratedCity } from '../city/data-contracts/validation/validateGeneratedCity';
import type { CityConfig, GeneratedCity } from '../types/city';
import { SeededRandom } from '../utils/random';
import { BuildingGenerator } from './buildings/BuildingGenerator';
import { RoadNetworkGenerator } from './roads/RoadNetworkGenerator';
import { TerrainGenerator } from './terrain/TerrainGenerator';

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
    const parks = terrainGenerator.generateParks(bounds);
    const waterways = terrainGenerator.generateWaterways(bounds);
    const excludedBlocks = terrainGenerator.getExcludedBlocks(bounds, parks, waterways);
    const landAndBuildings = buildingGenerator.generate(bounds, excludedBlocks);
    const trees = terrainGenerator.generateTreePlantings(parks);

    const generated: GeneratedCity = {
      schemaVersion: CITY_CONTRACT_SCHEMA_VERSION,
      geospatial: LOCAL_CITY_FRAME,
      lodPolicy: DEFAULT_CITY_LOD_POLICY,
      performanceBudget: DEFAULT_PERFORMANCE_BUDGET,
      bounds,
      districts: landAndBuildings.districts,
      blocks: landAndBuildings.blocks,
      roads,
      parcels: landAndBuildings.parcels,
      buildings: landAndBuildings.buildings,
      parks,
      waterways,
      trees,
      assetBindings: [],
      validation: {
        passed: true,
        issues: []
      }
    };

    return {
      ...generated,
      validation: validateGeneratedCity(generated)
    };
  }
}
