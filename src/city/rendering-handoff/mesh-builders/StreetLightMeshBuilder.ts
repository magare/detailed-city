import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import { STREET_LIGHT_EFFECTS_RENDER_LAYER } from '../../../rendering/layers/renderLayers';
import type { StreetLight, BuildingPlan } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

const DEFAULT_DYNAMIC_STREET_LIGHT_LIMIT = 32;
const DEFAULT_SHADOW_CASTING_STREET_LIGHT_LIMIT = 0;
const GROUND_LIGHT_OFFSET_METERS = 0.045;
const DYNAMIC_LIGHT_RECEIVER_OFFSET_METERS = 0.058;
const MIN_SPOTLIGHT_ANGLE_RADIANS = THREE.MathUtils.degToRad(28);
const MAX_SPOTLIGHT_ANGLE_RADIANS = THREE.MathUtils.degToRad(62);
const FACADE_LIGHT_CLIP_CLEARANCE_METERS = 1.1;
const TEMP_VECTOR_3 = new THREE.Vector3();

export interface StreetLightMeshBuilderOptions {
  readonly dynamicLightLimit?: number;
  readonly shadowCastingLightLimit?: number;
}

export class StreetLightMeshBuilder {
  constructor(
    private readonly materials: MaterialLibrary,
    private readonly metadataByObjectId: Readonly<Record<string, CityPickingMetadata>>,
    private readonly options: StreetLightMeshBuilderOptions = {}
  ) {}

  build(streetLights: readonly StreetLight[], buildings: readonly BuildingPlan[] = []): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StreetLights';

    if (streetLights.length === 0) {
      return group;
    }

    const poleMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 8),
      this.materials.getMaterialForZone('street-light', 'streetLightPole'),
      streetLights.length
    );
    const fixtureMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      this.materials.getMaterialForZone('street-light', 'streetLightPole'),
      streetLights.length
    );
    const glowMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      this.materials.getMaterialForZone('street-light-glow', 'streetLightGlow'),
      streetLights.length
    );
    const illuminationPoolMesh = new THREE.InstancedMesh(
      createRadialCircleGeometry(1, 24),
      this.materials.getMaterialForZone('street-light-illumination', 'streetLightIllumination'),
      streetLights.length
    );
    const coneMesh = new THREE.InstancedMesh(
      createScatteredLightVolumeGeometry(1, 18, 12),
      this.materials.getMaterialForZone('street-light-cone', 'streetLightCone'),
      streetLights.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const groundPoolRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const metadata = streetLights.map(
      (streetLight) => this.metadataByObjectId[streetLight.id] ?? createCityPickingMetadata(streetLight)
    );
    const clipPlanes = new Float32Array(streetLights.length * 4);

    streetLights.forEach((streetLight, index) => {
      const lightShape = getStreetLightShape(streetLight, buildings);

      matrix.compose(
        new THREE.Vector3(streetLight.position.x, streetLight.heightMeters / 2, streetLight.position.z),
        rotation,
        new THREE.Vector3(streetLight.poleRadiusMeters, streetLight.heightMeters, streetLight.poleRadiusMeters)
      );
      poleMesh.setMatrixAt(index, matrix);

      matrix.compose(
        new THREE.Vector3(lightShape.fixtureCenterX, streetLight.heightMeters, lightShape.fixtureCenterZ),
        lightShape.fixtureRotation,
        new THREE.Vector3(streetLight.armLengthMeters, 0.18, streetLight.fixtureLengthMeters)
      );
      fixtureMesh.setMatrixAt(index, matrix);

      matrix.compose(
        new THREE.Vector3(lightShape.sourceX, streetLight.heightMeters - 0.18, lightShape.sourceZ),
        rotation,
        new THREE.Vector3(
          0.32 + streetLight.nightLighting.emissiveIntensity * 0.16,
          0.32 + streetLight.nightLighting.emissiveIntensity * 0.16,
          0.32 + streetLight.nightLighting.emissiveIntensity * 0.16
        )
      );
      glowMesh.setMatrixAt(index, matrix);

      const poolRadius = getIlluminationPoolRadius(streetLight);
      matrix.compose(
        new THREE.Vector3(lightShape.poolCenterX, GROUND_LIGHT_OFFSET_METERS, lightShape.poolCenterZ),
        groundPoolRotation,
        new THREE.Vector3(poolRadius, poolRadius, 1)
      );
      illuminationPoolMesh.setMatrixAt(index, matrix);

      const coneHeight = streetLight.heightMeters - 0.22;
      matrix.compose(
        new THREE.Vector3(lightShape.coneCenterX, coneHeight * 0.48, lightShape.coneCenterZ),
        rotation,
        new THREE.Vector3(poolRadius * 0.84, coneHeight * 0.42, poolRadius * 0.84)
      );
      coneMesh.setMatrixAt(index, matrix);

      const [nx, nz, C, enabled] = lightShape.clipPlane;
      clipPlanes[index * 4] = nx;
      clipPlanes[index * 4 + 1] = nz;
      clipPlanes[index * 4 + 2] = C;
      clipPlanes[index * 4 + 3] = enabled;
    });

    const clipPlaneAttribute = new THREE.InstancedBufferAttribute(clipPlanes, 4);
    illuminationPoolMesh.geometry.setAttribute('aClipPlane', clipPlaneAttribute);
    coneMesh.geometry.setAttribute('aClipPlane', clipPlaneAttribute);

    poleMesh.name = 'StreetLightPoleInstances';
    fixtureMesh.name = 'StreetLightFixtureInstances';
    glowMesh.name = 'StreetLightGlowInstances';
    illuminationPoolMesh.name = 'StreetLightIlluminancePoolInstances';
    coneMesh.name = 'StreetLightConeInstances';
    poleMesh.castShadow = true;
    fixtureMesh.castShadow = true;
    poleMesh.receiveShadow = true;
    fixtureMesh.receiveShadow = true;
    illuminationPoolMesh.renderOrder = 2;
    coneMesh.renderOrder = 4;
    coneMesh.receiveShadow = false;
    coneMesh.castShadow = false;
    poleMesh.instanceMatrix.needsUpdate = true;
    fixtureMesh.instanceMatrix.needsUpdate = true;
    glowMesh.instanceMatrix.needsUpdate = true;
    illuminationPoolMesh.instanceMatrix.needsUpdate = true;
    coneMesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(poleMesh, metadata);
    attachCityPickingInstanceMetadata(fixtureMesh, metadata);
    attachCityPickingInstanceMetadata(glowMesh, metadata);
    attachCityPickingInstanceMetadata(coneMesh, metadata);
    const dynamicLights = createDynamicStreetLightGroup(streetLights, this.options, this.materials, buildings);
    group.userData.streetLightRuntime = {
      dynamicLightCount: dynamicLights.userData.dynamicLightCount,
      shadowCastingLightCount: dynamicLights.userData.shadowCastingLightCount,
      illuminationPoolCount: streetLights.length
    };
    group.add(poleMesh, fixtureMesh, glowMesh, illuminationPoolMesh, coneMesh, dynamicLights);

    return group;
  }
}

function createDynamicStreetLightGroup(
  streetLights: readonly StreetLight[],
  options: StreetLightMeshBuilderOptions,
  materials: MaterialLibrary,
  buildings: readonly BuildingPlan[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'StreetLightDynamicLights';

  const dynamicLightLimit = getSafeLimit(
    options.dynamicLightLimit,
    DEFAULT_DYNAMIC_STREET_LIGHT_LIMIT,
    streetLights.length
  );
  const shadowCastingLightLimit = getSafeLimit(
    options.shadowCastingLightLimit,
    DEFAULT_SHADOW_CASTING_STREET_LIGHT_LIMIT
  );
  const selectedLights = selectDynamicStreetLights(streetLights, dynamicLightLimit);
  let shadowCastingLightCount = 0;

  const receiverMesh = createDynamicLightReceiverMesh(selectedLights, materials, buildings);

  if (receiverMesh) {
    group.add(receiverMesh);
  }

  selectedLights.forEach((streetLight) => {
    const angle = getSpotlightAngle(streetLight);
    const lightShape = getStreetLightShape(streetLight, buildings);
    const streetLightSource = new THREE.SpotLight(
      colorTemperatureToRgb(streetLight.colorTemperatureKelvin),
      getSpotlightIntensity(streetLight),
      getSpotlightDistance(streetLight),
      angle,
      streetLight.glareControl.shielded ? 0.92 : 0.82,
      2
    );
    const shadowCasting = shadowCastingLightCount < shadowCastingLightLimit && shouldCastStreetLightShadow(streetLight);

    streetLightSource.name = `StreetLightSpotLight:${streetLight.id}`;
    streetLightSource.position.set(lightShape.sourceX, streetLight.heightMeters - 0.22, lightShape.sourceZ);
    streetLightSource.target.name = `StreetLightSpotLightTarget:${streetLight.id}`;
    streetLightSource.target.position.set(lightShape.poolCenterX, 0, lightShape.poolCenterZ);
    streetLightSource.layers.enable(0);
    streetLightSource.layers.enable(STREET_LIGHT_EFFECTS_RENDER_LAYER);
    streetLightSource.target.layers.set(STREET_LIGHT_EFFECTS_RENDER_LAYER);
    streetLightSource.castShadow = shadowCasting;
    streetLightSource.userData.streetLightId = streetLight.id;
    streetLightSource.userData.fixtureType = streetLight.fixtureType;
    streetLightSource.userData.colorTemperatureKelvin = streetLight.colorTemperatureKelvin;
    streetLightSource.userData.estimatedIlluminanceLux = streetLight.nightSafety.estimatedIlluminanceLux;
    streetLightSource.userData.coverageRadiusMeters = streetLight.coverage.radiusMeters;
    streetLightSource.userData.cutoffAngleDegrees = streetLight.glareControl.cutoffAngleDegrees;

    if (shadowCasting) {
      configureStreetLightShadow(streetLightSource, streetLight);
      shadowCastingLightCount += 1;
    }

    group.add(streetLightSource, streetLightSource.target);
  });

  group.userData.dynamicLightCount = selectedLights.length;
  group.userData.shadowCastingLightCount = shadowCastingLightCount;
  return group;
}

function createDynamicLightReceiverMesh(
  streetLights: readonly StreetLight[],
  materials: MaterialLibrary,
  buildings: readonly BuildingPlan[]
): THREE.InstancedMesh | undefined {
  if (streetLights.length === 0) {
    return undefined;
  }

  const receiverMesh = new THREE.InstancedMesh(
    createRadialCircleGeometry(1, 24),
    materials.getMaterialForZone('street-light-dynamic-receiver', 'streetLightDynamicReceiver'),
    streetLights.length
  );
  const matrix = new THREE.Matrix4();
  const groundPoolRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const clipPlanes = new Float32Array(streetLights.length * 4);

  streetLights.forEach((streetLight, index) => {
    const poolRadius = getIlluminationPoolRadius(streetLight) * 0.72;
    const lightShape = getStreetLightShape(streetLight, buildings);

    matrix.compose(
      new THREE.Vector3(
        lightShape.poolCenterX,
        DYNAMIC_LIGHT_RECEIVER_OFFSET_METERS,
        lightShape.poolCenterZ
      ),
      groundPoolRotation,
      new THREE.Vector3(poolRadius, poolRadius, 1)
    );
    receiverMesh.setMatrixAt(index, matrix);

    const [nx, nz, C, enabled] = lightShape.clipPlane;
    clipPlanes[index * 4] = nx;
    clipPlanes[index * 4 + 1] = nz;
    clipPlanes[index * 4 + 2] = C;
    clipPlanes[index * 4 + 3] = enabled;
  });

  const clipPlaneAttribute = new THREE.InstancedBufferAttribute(clipPlanes, 4);
  receiverMesh.geometry.setAttribute('aClipPlane', clipPlaneAttribute);

  receiverMesh.name = 'StreetLightDynamicReceiverInstances';
  receiverMesh.layers.set(STREET_LIGHT_EFFECTS_RENDER_LAYER);
  receiverMesh.renderOrder = 3;
  receiverMesh.receiveShadow = false;
  receiverMesh.instanceMatrix.needsUpdate = true;
  return receiverMesh;
}

function selectDynamicStreetLights(streetLights: readonly StreetLight[], limit: number): StreetLight[] {
  if (limit <= 0) {
    return [];
  }

  const candidates = [...streetLights]
    .filter((streetLight) => streetLight.nightLighting.enabledByDefault)
    .sort((a, b) => getDynamicLightPriority(b) - getDynamicLightPriority(a) || a.id.localeCompare(b.id));
  const detailedStreetLights = candidates.filter((streetLight) => streetLight.placementContext === 'detailed-street');
  const selected: StreetLight[] = [];

  for (const candidate of detailedStreetLights) {
    if (selected.length >= limit) {
      break;
    }

    selected.push(candidate);
  }

  for (const candidate of candidates) {
    if (selected.length >= limit) {
      break;
    }

    if (selected.includes(candidate)) {
      continue;
    }

    if (hasEnoughSpacing(candidate, selected)) {
      selected.push(candidate);
    }
  }

  if (selected.length < limit) {
    const selectedIds = new Set(selected.map((streetLight) => streetLight.id));

    for (const candidate of candidates) {
      if (selected.length >= limit) {
        break;
      }

      if (!selectedIds.has(candidate.id)) {
        selected.push(candidate);
      }
    }
  }

  return selected;
}

function hasEnoughSpacing(candidate: StreetLight, selected: readonly StreetLight[]): boolean {
  const minimumSpacing = candidate.coverage.criticalPedestrianPath ? 26 : 34;
  const minimumSpacingSquared = minimumSpacing * minimumSpacing;

  return selected.every((streetLight) => getHorizontalDistanceSquared(candidate, streetLight) >= minimumSpacingSquared);
}

function getHorizontalDistanceSquared(a: StreetLight, b: StreetLight): number {
  const dx = a.position.x - b.position.x;
  const dz = a.position.z - b.position.z;

  return dx * dx + dz * dz;
}

function getDynamicLightPriority(streetLight: StreetLight): number {
  const purposePriority: Record<StreetLight['lightingPurpose'], number> = {
    'transit-stop-safety': 26,
    'arterial-safety': 20,
    'promenade-comfort': 14,
    'local-wayfinding': 8
  };

  return (
    purposePriority[streetLight.lightingPurpose] +
    (streetLight.coverage.criticalPedestrianPath ? 18 : 0) +
    (streetLight.placementContext === 'detailed-street' ? 12 : 0) +
    (streetLight.decorativeLighting.enabled ? 4 : 0) +
    streetLight.nightSafety.estimatedIlluminanceLux * 0.35 +
    streetLight.nightLighting.emissiveIntensity * 5
  );
}

function getIlluminationPoolRadius(streetLight: StreetLight): number {
  return Math.max(3.8, Math.min(12, streetLight.coverage.radiusMeters * 0.42));
}

function getSpotlightIntensity(streetLight: StreetLight): number {
  const heightSquared = streetLight.heightMeters * streetLight.heightMeters;
  const purposeMultiplier = streetLight.lightingPurpose === 'transit-stop-safety' ? 1.24 : 1;

  return streetLight.nightSafety.estimatedIlluminanceLux * heightSquared * purposeMultiplier;
}

function getSpotlightDistance(streetLight: StreetLight): number {
  return Math.max(12, streetLight.coverage.radiusMeters * 1.16);
}

function getSpotlightAngle(streetLight: StreetLight): number {
  const geometricAngle = Math.atan(streetLight.coverage.radiusMeters / Math.max(streetLight.heightMeters, 1));
  const cutoffAngle = THREE.MathUtils.degToRad(streetLight.glareControl.cutoffAngleDegrees);

  return THREE.MathUtils.clamp(
    Math.min(geometricAngle, cutoffAngle),
    MIN_SPOTLIGHT_ANGLE_RADIANS,
    MAX_SPOTLIGHT_ANGLE_RADIANS
  );
}

function shouldCastStreetLightShadow(streetLight: StreetLight): boolean {
  return streetLight.glareControl.shielded && streetLight.coverage.criticalPedestrianPath;
}

function configureStreetLightShadow(spotLight: THREE.SpotLight, streetLight: StreetLight): void {
  spotLight.shadow.mapSize.set(1024, 1024);
  spotLight.shadow.camera.near = 0.25;
  spotLight.shadow.camera.far = getSpotlightDistance(streetLight);
  spotLight.shadow.camera.fov = THREE.MathUtils.radToDeg(spotLight.angle) * 2.08;
  spotLight.shadow.bias = -0.00035;
  spotLight.shadow.normalBias = 0.035;
  spotLight.shadow.radius = 3;
  spotLight.shadow.camera.updateProjectionMatrix();
}

function colorTemperatureToRgb(kelvin: number): THREE.Color {
  const temperature = THREE.MathUtils.clamp(kelvin, 1000, 40000) / 100;
  let red: number;
  let green: number;
  let blue: number;

  if (temperature <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(temperature) - 161.1195681661;
    blue = temperature <= 19 ? 0 : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * (temperature - 60) ** -0.1332047592;
    green = 288.1221695283 * (temperature - 60) ** -0.0755148492;
    blue = 255;
  }

  return new THREE.Color(
    THREE.MathUtils.clamp(red, 0, 255) / 255,
    THREE.MathUtils.clamp(green, 0, 255) / 255,
    THREE.MathUtils.clamp(blue, 0, 255) / 255
  );
}

function getSafeLimit(limit: number | undefined, fallback: number, maximum = Number.POSITIVE_INFINITY): number {
  const rawValue = typeof limit === 'number' ? limit : fallback;

  if (!Number.isFinite(rawValue)) {
    return Number.isFinite(maximum) ? Math.max(0, Math.floor(maximum)) : 0;
  }

  return Math.max(0, Math.min(Math.floor(rawValue), maximum));
}

function createRadialCircleGeometry(radius: number, segments: number): THREE.BufferGeometry {
  const geometry = new THREE.CircleGeometry(radius, segments);
  const position = geometry.attributes.position;
  const count = position.count;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const dist = Math.sqrt(x * x + y * y) / radius;
    const intensity = Math.pow(Math.max(0, 1 - dist), 2.4);

    colors[i * 3] = intensity;
    colors[i * 3 + 1] = intensity;
    colors[i * 3 + 2] = intensity;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function createScatteredLightVolumeGeometry(
  radius: number,
  widthSegments: number,
  heightSegments: number
): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const position = geometry.attributes.position;
  const count = position.count;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const y = position.getY(i);
    const radialDistance = Math.sqrt(position.getX(i) ** 2 + position.getZ(i) ** 2) / radius;
    const sourceBias = Math.pow(THREE.MathUtils.clamp((y + 1) * 0.5, 0, 1), 1.35);
    const radialScatter = Math.exp(-radialDistance * radialDistance * 1.65);
    const lowerHaze = Math.pow(1 - Math.abs(y) * 0.55, 1.8);
    const intensity = Math.max(0, sourceBias * 0.72 + lowerHaze * radialScatter * 0.28) * radialScatter;

    colors[i * 3] = intensity;
    colors[i * 3 + 1] = intensity;
    colors[i * 3 + 2] = intensity;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

interface StreetLightShape {
  readonly sourceX: number;
  readonly sourceZ: number;
  readonly fixtureCenterX: number;
  readonly fixtureCenterZ: number;
  readonly poolCenterX: number;
  readonly poolCenterZ: number;
  readonly coneCenterX: number;
  readonly coneCenterZ: number;
  readonly fixtureRotation: THREE.Quaternion;
  readonly clipPlane: readonly [number, number, number, number];
}

function getStreetLightShape(streetLight: StreetLight, buildings: readonly BuildingPlan[]): StreetLightShape {
  const facade = getNearestFacade(streetLight, buildings);
  const awayX = facade ? -facade.nx : getFallbackArmDirection(streetLight).x;
  const awayZ = facade ? -facade.nz : getFallbackArmDirection(streetLight).z;
  const sourceOffset = Math.max(0.18, streetLight.armLengthMeters * 0.82);
  const sourceX = streetLight.position.x + awayX * sourceOffset;
  const sourceZ = streetLight.position.z + awayZ * sourceOffset;
  const fixtureCenterX = streetLight.position.x + awayX * streetLight.armLengthMeters * 0.5;
  const fixtureCenterZ = streetLight.position.z + awayZ * streetLight.armLengthMeters * 0.5;
  const poolOffset = Math.min(streetLight.coverage.radiusMeters * 0.18, sourceOffset + 1.7);
  const poolCenterX = streetLight.position.x + awayX * poolOffset;
  const poolCenterZ = streetLight.position.z + awayZ * poolOffset;
  const coneCenterX = (sourceX + poolCenterX) * 0.5;
  const coneCenterZ = (sourceZ + poolCenterZ) * 0.5;
  const yaw = Math.atan2(awayZ, awayX);

  return {
    sourceX,
    sourceZ,
    fixtureCenterX,
    fixtureCenterZ,
    poolCenterX,
    poolCenterZ,
    coneCenterX,
    coneCenterZ,
    fixtureRotation: new THREE.Quaternion().setFromAxisAngle(TEMP_VECTOR_3.set(0, 1, 0), -yaw),
    clipPlane: facade ? [facade.nx, facade.nz, facade.c + FACADE_LIGHT_CLIP_CLEARANCE_METERS, 1] : [0, 0, 0, 0]
  };
}

function getFallbackArmDirection(streetLight: StreetLight): { x: number; z: number } {
  return streetLight.side === 'left' ? { x: 1, z: 0 } : { x: -1, z: 0 };
}

function getNearestFacade(
  streetLight: StreetLight,
  buildings: readonly BuildingPlan[]
): { readonly nx: number; readonly nz: number; readonly c: number } | undefined {
  let closestBuilding: BuildingPlan | null = null;
  let minDistance = Infinity;
  let closestPX = 0;
  let closestPZ = 0;

  const Lx = streetLight.position.x;
  const Lz = streetLight.position.z;
  const poolRadius = getIlluminationPoolRadius(streetLight);

  for (const building of buildings) {
    const Cx = building.center.x;
    const Cz = building.center.z;
    const hx = building.size.x / 2;
    const hz = building.size.z / 2;

    const Px = Math.max(Cx - hx, Math.min(Lx, Cx + hx));
    const Pz = Math.max(Cz - hz, Math.min(Lz, Cz + hz));

    const dx = Px - Lx;
    const dz = Pz - Lz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < minDistance) {
      minDistance = dist;
      closestBuilding = building;
      closestPX = Px;
      closestPZ = Pz;
    }
  }

  if (closestBuilding && minDistance < poolRadius && minDistance > 0.01) {
    const nx = (closestPX - Lx) / minDistance;
    const nz = (closestPZ - Lz) / minDistance;
    const c = -(nx * closestPX + nz * closestPZ);
    return { nx, nz, c };
  }

  return undefined;
}
