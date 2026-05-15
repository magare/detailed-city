import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import type { WaterfrontEdge } from '../../../types/city';
import type { Polygon2D } from '../../data-contracts/cityContracts';
import { attachCityPickingMetadata, type CityPickingMetadata } from '../picking/pickingMetadata';

export class WaterfrontEdgeMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>
  ) {}

  build(edges: readonly WaterfrontEdge[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'WaterfrontEdges';

    for (const edge of edges) {
      const bounds = getBoundaryBounds(edge.boundary);
      const geometry = new THREE.BoxGeometry(
        Math.max(1, bounds.maxX - bounds.minX),
        edge.waterfrontKind === 'flood-wall' ? 1.6 : 0.16,
        Math.max(1, bounds.maxZ - bounds.minZ)
      );
      const mesh = new THREE.Mesh(geometry, this.materials.getMaterialForZone('waterfront', 'waterfrontEdge'));
      mesh.name = edge.id;
      mesh.position.set(edge.center.x, edge.waterfrontKind === 'flood-wall' ? 0.82 : 0.16, edge.center.z);
      mesh.receiveShadow = true;

      const metadata = this.metadataByObjectId[edge.id];
      if (metadata) {
        attachCityPickingMetadata(mesh, metadata);
      }

      group.add(mesh);
    }

    return group;
  }
}

function getBoundaryBounds(boundary: Polygon2D): {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
} {
  const xs = boundary.map((point) => point.x);
  const zs = boundary.map((point) => point.z);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs)
  };
}
