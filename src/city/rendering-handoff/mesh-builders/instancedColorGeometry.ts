import * as THREE from 'three';

export function withWhiteVertexColors<GeometryType extends THREE.BufferGeometry>(geometry: GeometryType): GeometryType {
  if (geometry.getAttribute('color')) {
    return geometry;
  }

  const position = geometry.getAttribute('position');

  if (!position) {
    return geometry;
  }

  const colors = new Float32Array(position.count * 3);
  colors.fill(1);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}
