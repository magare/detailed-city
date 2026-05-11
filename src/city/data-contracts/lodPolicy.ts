import type {
  CityLodPolicy,
  CityObjectBase,
  CityObjectKind,
  CityObjectLodPolicy,
  LodTier,
  ValidationIssue
} from './cityContracts';
import { CITY_LOD_TIERS } from './cityContracts';
import { CITY_OBJECT_KIND_REGISTRY_ENTRIES } from './cityObjectRegistry';

export interface CityLodPolicyDiagnostics {
  readonly tierCount: number;
  readonly objectPolicyCount: number;
  readonly objectsWithPolicy: number;
  readonly objectsWithoutPolicy: number;
  readonly objectsWithUnsupportedTier: number;
  readonly missingPolicyKinds: readonly CityObjectKind[];
  readonly unsupportedObjectIds: readonly string[];
  readonly countsByTier: Readonly<Record<LodTier, number>>;
}

export function createCityLodPolicyDiagnostics(
  lodPolicy: CityLodPolicy,
  objects: readonly CityObjectBase[]
): CityLodPolicyDiagnostics {
  const policyByKind = createObjectLodPolicyMap(lodPolicy);
  const countsByTier = createEmptyTierCounts();
  const missingPolicyKinds = new Set<CityObjectKind>();
  const unsupportedObjectIds: string[] = [];
  let objectsWithPolicy = 0;

  for (const object of objects) {
    const policy = policyByKind.get(object.kind);
    const lod = getObjectLod(object);

    if (!policy) {
      missingPolicyKinds.add(object.kind);
      continue;
    }

    objectsWithPolicy += 1;

    if (isLodTier(lod)) {
      countsByTier[lod] += 1;
    }

    if (!isLodTier(lod) || !policy.allowedTiers.includes(lod)) {
      unsupportedObjectIds.push(object.id);
    }
  }

  return {
    tierCount: lodPolicy.rules.length,
    objectPolicyCount: lodPolicy.objectPolicies.length,
    objectsWithPolicy,
    objectsWithoutPolicy: objects.length - objectsWithPolicy,
    objectsWithUnsupportedTier: unsupportedObjectIds.length,
    missingPolicyKinds: [...missingPolicyKinds].sort(),
    unsupportedObjectIds,
    countsByTier
  };
}

export function validateCityLodPolicy(
  lodPolicy: CityLodPolicy,
  objects: readonly CityObjectBase[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tierIds = new Set<LodTier>();
  const objectPoliciesByKind = createObjectLodPolicyMap(lodPolicy);

  for (const rule of lodPolicy.rules) {
    if (tierIds.has(rule.tier)) {
      issues.push({
        id: `duplicate-lod-tier-${rule.tier}`,
        severity: 'error',
        category: 'lod',
        objectId: rule.tier,
        message: `LOD policy declares tier ${rule.tier} more than once.`
      });
    }

    tierIds.add(rule.tier);

    if (rule.maxDistanceMeters <= 0 || !Number.isFinite(rule.maxDistanceMeters)) {
      issues.push({
        id: `invalid-lod-distance-${rule.tier}`,
        severity: 'error',
        category: 'lod',
        objectId: rule.tier,
        message: `LOD tier ${rule.tier} must declare a positive max distance.`
      });
    }

    if (!rule.geometry || !rule.materials || !rule.behavior) {
      issues.push({
        id: `incomplete-lod-rule-${rule.tier}`,
        severity: 'warning',
        category: 'lod',
        objectId: rule.tier,
        message: `LOD tier ${rule.tier} should describe geometry, materials, and behavior.`
      });
    }
  }

  for (const tier of CITY_LOD_TIERS) {
    if (!tierIds.has(tier)) {
      issues.push({
        id: `missing-lod-tier-${tier}`,
        severity: 'error',
        category: 'lod',
        objectId: tier,
        message: `LOD policy must declare ${tier}.`
      });
    }
  }

  for (let index = 1; index < lodPolicy.rules.length; index += 1) {
    const previous = lodPolicy.rules[index - 1];
    const current = lodPolicy.rules[index];

    if (current.maxDistanceMeters >= previous.maxDistanceMeters) {
      issues.push({
        id: `lod-distance-order-${previous.tier}-${current.tier}`,
        severity: 'error',
        category: 'lod',
        objectId: current.tier,
        message: 'LOD max distances must decrease from coarse to close tiers.'
      });
    }
  }

  const allObjectKinds = new Set(CITY_OBJECT_KIND_REGISTRY_ENTRIES.map((entry) => entry.kind));
  const seenPolicyKinds = new Set<CityObjectKind>();

  for (const policy of lodPolicy.objectPolicies) {
    issues.push(...validateObjectLodPolicyEntry(policy, tierIds));

    if (seenPolicyKinds.has(policy.objectKind)) {
      issues.push({
        id: `duplicate-lod-object-policy-${policy.objectKind}`,
        severity: 'error',
        category: 'lod',
        objectId: policy.objectKind,
        message: `LOD policy declares object kind ${policy.objectKind} more than once.`
      });
    }

    seenPolicyKinds.add(policy.objectKind);
  }

  for (const objectKind of allObjectKinds) {
    if (!seenPolicyKinds.has(objectKind)) {
      issues.push({
        id: `missing-lod-object-policy-${objectKind}`,
        severity: 'error',
        category: 'lod',
        objectId: objectKind,
        message: `LOD policy must cover object kind ${objectKind}.`
      });
    }
  }

  const missingObjectKinds = new Set<CityObjectKind>();

  for (const object of objects) {
    const objectLod = getObjectLod(object);
    const objectPolicy = objectPoliciesByKind.get(object.kind);

    if (!objectPolicy) {
      missingObjectKinds.add(object.kind);
      continue;
    }

    if (!isLodTier(objectLod)) {
      issues.push({
        id: `invalid-object-lod-${object.id}`,
        severity: 'error',
        category: 'lod',
        objectId: object.id,
        message: `City object ${object.id} must declare a supported LOD tier.`
      });
      continue;
    }

    if (!objectPolicy.allowedTiers.includes(objectLod)) {
      issues.push({
        id: `unsupported-object-lod-${object.id}-${objectLod}`,
        severity: 'error',
        category: 'lod',
        objectId: object.id,
        message: `City object ${object.id} uses ${objectLod}, which is outside the ${object.kind} LOD policy.`
      });
    }
  }

  for (const objectKind of missingObjectKinds) {
    issues.push({
      id: `missing-object-kind-lod-policy-${objectKind}`,
      severity: 'error',
      category: 'lod',
      objectId: objectKind,
      message: `Generated object kind ${objectKind} has no LOD object policy.`
    });
  }

  return issues;
}

function validateObjectLodPolicyEntry(
  policy: CityObjectLodPolicy,
  tierIds: ReadonlySet<LodTier>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!policy.allowedTiers.includes(policy.defaultTier)) {
    issues.push({
      id: `lod-default-not-allowed-${policy.objectKind}`,
      severity: 'error',
      category: 'lod',
      objectId: policy.objectKind,
      message: `LOD default tier for ${policy.objectKind} must be included in its allowed tiers.`
    });
  }

  if (policy.allowedTiers.length === 0) {
    issues.push({
      id: `empty-lod-object-policy-${policy.objectKind}`,
      severity: 'error',
      category: 'lod',
      objectId: policy.objectKind,
      message: `LOD policy for ${policy.objectKind} must allow at least one tier.`
    });
  }

  for (const tier of policy.allowedTiers) {
    if (!tierIds.has(tier)) {
      issues.push({
        id: `unknown-lod-tier-${policy.objectKind}-${tier}`,
        severity: 'error',
        category: 'lod',
        objectId: policy.objectKind,
        message: `LOD policy for ${policy.objectKind} references unknown tier ${tier}.`
      });
    }
  }

  if (!policy.description) {
    issues.push({
      id: `missing-lod-policy-description-${policy.objectKind}`,
      severity: 'warning',
      category: 'lod',
      objectId: policy.objectKind,
      message: `LOD policy for ${policy.objectKind} should describe its rendering role.`
    });
  }

  return issues;
}

function createObjectLodPolicyMap(lodPolicy: CityLodPolicy): ReadonlyMap<CityObjectKind, CityObjectLodPolicy> {
  return new Map(lodPolicy.objectPolicies.map((policy) => [policy.objectKind, policy]));
}

function createEmptyTierCounts(): Record<LodTier, number> {
  return {
    lod0: 0,
    lod1: 0,
    lod2: 0,
    lod3: 0,
    lod4: 0
  };
}

function getObjectLod(object: CityObjectBase): unknown {
  return (object as { readonly lod?: unknown }).lod;
}

function isLodTier(value: unknown): value is LodTier {
  return typeof value === 'string' && (CITY_LOD_TIERS as readonly string[]).includes(value);
}
