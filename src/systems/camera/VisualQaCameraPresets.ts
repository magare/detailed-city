import type { Point3D } from '../../city/data-contracts/cityContracts';
import type { CityConfig, GeneratedCity } from '../../types/city';

export type VisualQaCameraPresetId = 'overview' | 'detailed-street';

export interface VisualQaCameraPreset {
  readonly id: VisualQaCameraPresetId;
  readonly name: string;
  readonly position: Point3D;
  readonly target: Point3D;
}

export function createVisualQaCameraPresets(
  config: CityConfig,
  city: GeneratedCity
): readonly VisualQaCameraPreset[] {
  const presets: VisualQaCameraPreset[] = [createOverviewVisualQaCameraPreset(config)];
  const detailedStreetSlice = city.verticalSlices
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id))[0];

  if (detailedStreetSlice) {
    presets.push({
      id: 'detailed-street',
      name: 'Detailed Street',
      position: detailedStreetSlice.cameraPosition,
      target: detailedStreetSlice.cameraTarget
    });
  }

  return presets;
}

export function createOverviewVisualQaCameraPreset(config: CityConfig): VisualQaCameraPreset {
  const span = config.gridSize * (config.blockSize + config.roadWidth);

  return {
    id: 'overview',
    name: 'Overview',
    position: { x: span * 0.42, y: span * 0.58, z: span * 0.68 },
    target: { x: 0, y: 0, z: 0 }
  };
}
