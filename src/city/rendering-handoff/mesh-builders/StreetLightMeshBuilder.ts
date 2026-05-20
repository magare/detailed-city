import * as THREE from 'three';
import { MaterialLibrary } from '../../../rendering/materials/MaterialLibrary';
import { STREET_LIGHT_EFFECTS_RENDER_LAYER } from '../../../rendering/layers/renderLayers';
import type { StreetLight } from '../../../types/city';
import {
  attachCityPickingInstanceMetadata,
  createCityPickingMetadata,
  type CityPickingMetadata
} from '../picking/pickingMetadata';

const DEFAULT_DYNAMIC_STREET_LIGHT_LIMIT = 0;
const DEFAULT_SHADOW_CASTING_STREET_LIGHT_LIMIT = 0;
const GROUND_LIGHT_OFFSET_METERS = 0.045;
const DYNAMIC_LIGHT_RECEIVER_OFFSET_METERS = 0.058;
const MIN_SPOTLIGHT_ANGLE_RADIANS = THREE.MathUtils.degToRad(28);
const MAX_SPOTLIGHT_ANGLE_RADIANS = THREE.MathUtils.degToRad(62);

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

  build(streetLights: readonly StreetLight[]): THREE.Group {
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
      new THREE.CircleGeometry(1, 24),
      this.materials.getMaterialForZone('street-light-illumination', 'streetLightIllumination'),
      streetLights.length
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const groundPoolRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const metadata = streetLights.map(
      (streetLight) => this.metadataByObjectId[streetLight.id] ?? createCityPickingMetadata(streetLight)
    );

    streetLights.forEach((streetLight, index) => {
      matrix.compose(
        new THREE.Vector3(streetLight.position.x, streetLight.heightMeters / 2, streetLight.position.z),
        rotation,
        new THREE.Vector3(streetLight.poleRadiusMeters, streetLight.heightMeters, streetLight.poleRadiusMeters)
      );
      poleMesh.setMatrixAt(index, matrix);

      matrix.compose(
        new THREE.Vector3(streetLight.position.x, streetLight.heightMeters, streetLight.position.z),
        rotation,
        new THREE.Vector3(streetLight.armLengthMeters, 0.18, streetLight.fixtureLengthMeters)
      );
      fixtureMesh.setMatrixAt(index, matrix);

      matrix.compose(
        new THREE.Vector3(streetLight.position.x, streetLight.heightMeters - 0.18, streetLight.position.z),
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
        new THREE.Vector3(streetLight.position.x, GROUND_LIGHT_OFFSET_METERS, streetLight.position.z),
        groundPoolRotation,
        new THREE.Vector3(poolRadius, poolRadius, 1)
      );
      illuminationPoolMesh.setMatrixAt(index, matrix);
    });

    poleMesh.name = 'StreetLightPoleInstances';
    fixtureMesh.name = 'StreetLightFixtureInstances';
    glowMesh.name = 'StreetLightGlowInstances';
    illuminationPoolMesh.name = 'StreetLightIlluminancePoolInstances';
    poleMesh.castShadow = true;
    fixtureMesh.castShadow = true;
    poleMesh.receiveShadow = true;
    fixtureMesh.receiveShadow = true;
    illuminationPoolMesh.renderOrder = 2;
    poleMesh.instanceMatrix.needsUpdate = true;
    fixtureMesh.instanceMatrix.needsUpdate = true;
    glowMesh.instanceMatrix.needsUpdate = true;
    illuminationPoolMesh.instanceMatrix.needsUpdate = true;
    attachCityPickingInstanceMetadata(poleMesh, metadata);
    attachCityPickingInstanceMetadata(fixtureMesh, metadata);
    attachCityPickingInstanceMetadata(glowMesh, metadata);
    const dynamicLights = createDynamicStreetLightGroup(streetLights, this.options, this.materials);
    group.userData.streetLightRuntime = {
      dynamicLightCount: dynamicLights.userData.dynamicLightCount,
      shadowCastingLightCount: dynamicLights.userData.shadowCastingLightCount,
      illuminationPoolCount: streetLights.length
    };
    group.add(poleMesh, fixtureMesh, glowMesh, illuminationPoolMesh, dynamicLights);

    return group;
  }
}

function createDynamicStreetLightGroup(
  streetLights: readonly StreetLight[],
  options: StreetLightMeshBuilderOptions,
  materials: MaterialLibrary
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'StreetLightDynamicLights';

  const dynamicLightLimit = getSafeLimit(options.dynamicLightLimit, DEFAULT_DYNAMIC_STREET_LIGHT_LIMIT);
  const shadowCastingLightLimit = getSafeLimit(
    options.shadowCastingLightLimit,
    DEFAULT_SHADOW_CASTING_STREET_LIGHT_LIMIT
  );
  const selectedLights = selectDynamicStreetLights(streetLights, dynamicLightLimit);
  let shadowCastingLightCount = 0;

  const receiverMesh = createDynamicLightReceiverMesh(selectedLights, materials);

  if (receiverMesh) {
    group.add(receiverMesh);
  }

  selectedLights.forEach((streetLight, index) => {
    const angle = getSpotlightAngle(streetLight);
    const streetLightSource = new THREE.SpotLight(
      colorTemperatureToRgb(streetLight.colorTemperatureKelvin),
      getSpotlightIntensity(streetLight),
      getSpotlightDistance(streetLight),
      angle,
      streetLight.glareControl.shielded ? 0.28 : 0.5,
      2
    );
    const shadowCasting = shadowCastingLightCount < shadowCastingLightLimit && shouldCastStreetLightShadow(streetLight, index);

    streetLightSource.name = `StreetLightSpotLight:${streetLight.id}`;
    streetLightSource.position.set(streetLight.position.x, streetLight.heightMeters - 0.22, streetLight.position.z);
    streetLightSource.target.name = `StreetLightSpotLightTarget:${streetLight.id}`;
    streetLightSource.target.position.set(streetLight.position.x, 0, streetLight.position.z);
    streetLightSource.layers.set(STREET_LIGHT_EFFECTS_RENDER_LAYER);
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
  materials: MaterialLibrary
): THREE.InstancedMesh | undefined {
  if (streetLights.length === 0) {
    return undefined;
  }

  const receiverMesh = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 24),
    materials.getMaterialForZone('street-light-dynamic-receiver', 'streetLightDynamicReceiver'),
    streetLights.length
  );
  const matrix = new THREE.Matrix4();
  const groundPoolRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

  streetLights.forEach((streetLight, index) => {
    const poolRadius = getIlluminationPoolRadius(streetLight) * 0.72;

    matrix.compose(
      new THREE.Vector3(
        streetLight.position.x,
        DYNAMIC_LIGHT_RECEIVER_OFFSET_METERS,
        streetLight.position.z
      ),
      groundPoolRotation,
      new THREE.Vector3(poolRadius, poolRadius, 1)
    );
    receiverMesh.setMatrixAt(index, matrix);
  });

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
  const selected: StreetLight[] = [];

  for (const candidate of candidates) {
    if (selected.length >= limit) {
      break;
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

function shouldCastStreetLightShadow(streetLight: StreetLight, index: number): boolean {
  return index === 0 && streetLight.glareControl.shielded && streetLight.coverage.criticalPedestrianPath;
}

function configureStreetLightShadow(spotLight: THREE.SpotLight, streetLight: StreetLight): void {
  spotLight.shadow.mapSize.set(512, 512);
  spotLight.shadow.camera.near = 0.4;
  spotLight.shadow.camera.far = getSpotlightDistance(streetLight);
  spotLight.shadow.bias = -0.0007;
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

function getSafeLimit(limit: number | undefined, fallback: number): number {
  const value = typeof limit === 'number' && Number.isFinite(limit) ? limit : fallback;

  return Math.max(0, Math.floor(value));
}
