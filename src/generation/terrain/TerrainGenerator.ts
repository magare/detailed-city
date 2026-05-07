import { CITY_BLUEPRINT } from '../../city/blueprint/cityBlueprint';
import type { CityBounds, CityConfig, ParkPatch, TreePlanting, Waterway } from '../../types/city';
import { rectanglePolygon } from '../../utils/geometry';

export class TerrainGenerator {
  constructor(private readonly config: CityConfig) {}

  generateParks(bounds: CityBounds): ParkPatch[] {
    const block = this.config.blockSize;

    return CITY_BLUEPRINT.publicSpaces.map((space) => {
      const center = {
        x: bounds.spacing * space.centerBySpacing.x,
        z: bounds.spacing * space.centerBySpacing.z
      };
      const size = {
        x: block * space.sizeByBlock.x,
        z: block * space.sizeByBlock.z
      };

      return {
        id: space.id,
        kind: 'park',
        ownerDomain: 'public-realm',
        name: space.name,
        lod: 'lod1',
        center,
        size,
        boundary: rectanglePolygon(center, size)
      };
    });
  }

  generateWaterways(bounds: CityBounds): Waterway[] {
    return CITY_BLUEPRINT.waterways.map((waterway) => {
      const center = {
        x: bounds.span * waterway.centerBySpan.x,
        z: bounds.span * waterway.centerBySpan.z
      };
      const length = bounds.span * waterway.lengthBySpan;
      const size = { x: length, z: this.config.waterwayWidth };

      return {
        id: waterway.id,
        kind: 'waterway',
        ownerDomain: 'land',
        name: waterway.name,
        lod: 'lod1',
        center,
        length,
        width: this.config.waterwayWidth,
        boundary: rectanglePolygon(center, size)
      };
    });
  }

  generateTreePlantings(parks: ParkPatch[]): TreePlanting[] {
    const trees: TreePlanting[] = [];

    for (const park of parks) {
      const treeCount = Math.max(8, Math.floor((park.size.x * park.size.z) / 260));

      for (let index = 0; index < treeCount; index += 1) {
        const angle = index * 2.399963;
        const radius = Math.sqrt((index + 0.5) / treeCount);
        const center = {
          x: park.center.x + Math.cos(angle) * radius * park.size.x * 0.42,
          z: park.center.z + Math.sin(angle) * radius * park.size.z * 0.42
        };
        const species = CITY_BLUEPRINT.treeSpeciesCycle[index % CITY_BLUEPRINT.treeSpeciesCycle.length];

        trees.push({
          id: `${park.id}-tree-${index}`,
          kind: 'tree-planting',
          ownerDomain: 'public-realm',
          parentId: park.id,
          parkId: park.id,
          lod: 'lod2',
          center,
          species,
          height: species === 'palm' ? 6.8 : 6.2,
          canopyDiameter: species === 'palm' ? 3.2 : 4.2
        });
      }
    }

    return trees;
  }

  getExcludedBlocks(bounds: CityBounds, parks: ParkPatch[], waterways: Waterway[]): Set<string> {
    const excluded = new Set<string>();

    for (let blockX = 0; blockX < this.config.gridSize; blockX += 1) {
      for (let blockZ = 0; blockZ < this.config.gridSize; blockZ += 1) {
        const center = this.getBlockCenter(bounds, blockX, blockZ);

        if (parks.some((park) => isInsideRect(center, park.center, park.size))) {
          excluded.add(blockKey(blockX, blockZ));
          continue;
        }

        if (
          waterways.some((waterway) =>
            isInsideRect(center, waterway.center, {
              x: waterway.length,
              z: waterway.width + this.config.blockSize * 0.55
            })
          )
        ) {
          excluded.add(blockKey(blockX, blockZ));
        }
      }
    }

    return excluded;
  }

  private getBlockCenter(bounds: CityBounds, blockX: number, blockZ: number): { x: number; z: number } {
    return {
      x: -bounds.halfSpan + this.config.roadWidth + this.config.blockSize / 2 + blockX * bounds.spacing,
      z: -bounds.halfSpan + this.config.roadWidth + this.config.blockSize / 2 + blockZ * bounds.spacing
    };
  }
}

export function blockKey(blockX: number, blockZ: number): string {
  return `${blockX}:${blockZ}`;
}

function isInsideRect(
  point: { x: number; z: number },
  center: { x: number; z: number },
  size: { x: number; z: number }
): boolean {
  return Math.abs(point.x - center.x) <= size.x / 2 && Math.abs(point.z - center.z) <= size.z / 2;
}
