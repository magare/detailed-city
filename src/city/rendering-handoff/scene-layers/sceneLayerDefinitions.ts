import type { CityPlanningLayer } from '../../cityPlan';
import type { GeneratedCity, TrafficPlan } from '../../../types/city';

export type CitySceneLayerId = 'terrain' | 'networks' | 'buildings' | 'public-realm' | 'agents' | 'overlays';

export interface CitySceneLayerDefinition {
  readonly id: CitySceneLayerId;
  readonly name: string;
  readonly ownerDomain: CityPlanningLayer;
  readonly order: number;
  readonly defaultVisible: boolean;
  readonly description: string;
}

export interface CitySceneLayerDiagnostics extends CitySceneLayerDefinition {
  readonly objectCount: number;
}

export const CITY_SCENE_LAYER_DEFINITIONS = [
  {
    id: 'terrain',
    name: 'Terrain',
    ownerDomain: 'rendering-handoff',
    order: 0,
    defaultVisible: true,
    description: 'Ground and water surfaces.'
  },
  {
    id: 'networks',
    name: 'Networks',
    ownerDomain: 'rendering-handoff',
    order: 1,
    defaultVisible: true,
    description: 'Roads, lane markings, and future mobility or utility networks.'
  },
  {
    id: 'buildings',
    name: 'Buildings',
    ownerDomain: 'rendering-handoff',
    order: 2,
    defaultVisible: true,
    description: 'Building massing and roof detail.'
  },
  {
    id: 'public-realm',
    name: 'Public Realm',
    ownerDomain: 'rendering-handoff',
    order: 3,
    defaultVisible: true,
    description: 'Parks, trees, street lights, street furniture, and human-scale public-realm detail.'
  },
  {
    id: 'agents',
    name: 'Agents',
    ownerDomain: 'rendering-handoff',
    order: 4,
    defaultVisible: true,
    description: 'Moving simulation objects such as traffic vehicles.'
  },
  {
    id: 'overlays',
    name: 'Overlays',
    ownerDomain: 'rendering-handoff',
    order: 5,
    defaultVisible: true,
    description: 'Debug, validation, and inspection overlays.'
  }
] as const satisfies readonly CitySceneLayerDefinition[];

export function createCitySceneLayerDiagnostics(
  city: GeneratedCity,
  traffic: TrafficPlan
): readonly CitySceneLayerDiagnostics[] {
  const roofDetailCount = city.buildings.filter((building) => building.roofStyle !== 'flat').length;
  const objectCounts: Record<CitySceneLayerId, number> = {
    terrain: 1 + city.waterways.length,
    networks: city.roads.length + traffic.markings.length,
    buildings: city.buildings.length + roofDetailCount + city.activeFrontages.length,
    'public-realm': city.parks.length + city.trees.length + city.streetLights.length + city.streetFurniture.length,
    agents: traffic.vehicles.length,
    overlays:
      city.administrativeBoundaries.length +
      city.verticalSlices.length +
      city.cityMetrics.length +
      city.constraints.length +
      city.resilienceGoals.length
  };

  return CITY_SCENE_LAYER_DEFINITIONS.map((definition) => ({
    ...definition,
    objectCount: objectCounts[definition.id]
  }));
}
