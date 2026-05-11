import type { CityId, CityObjectBase, CityObjectIndex, CityObjectKind } from './cityContracts';

export function createCityObjectIndex<ObjectType extends CityObjectBase>(
  objects: readonly ObjectType[]
): CityObjectIndex<ObjectType> {
  const indexedObjects = [...objects];
  const objectIds: CityId[] = [];
  const objectsById: Record<CityId, ObjectType> = {};
  const duplicateIds = new Set<CityId>();
  const childrenByParentId: Record<CityId, CityId[]> = {};
  const countsByKind: Partial<Record<CityObjectKind, number>> = {};

  for (const object of indexedObjects) {
    objectIds.push(object.id);

    if (hasOwn(objectsById, object.id)) {
      duplicateIds.add(object.id);
    } else {
      objectsById[object.id] = object;
    }

    if (object.parentId) {
      childrenByParentId[object.parentId] ??= [];
      childrenByParentId[object.parentId].push(object.id);
    }

    countsByKind[object.kind] = (countsByKind[object.kind] ?? 0) + 1;
  }

  return {
    objects: indexedObjects,
    objectIds,
    objectsById,
    duplicateIds: [...duplicateIds].sort(),
    childrenByParentId,
    countsByKind
  };
}

export function hasCityObject(index: CityObjectIndex, id: CityId): boolean {
  return hasOwn(index.objectsById, id);
}

export function resolveCityObject<ObjectType extends CityObjectBase>(
  index: CityObjectIndex<ObjectType>,
  id: CityId
): ObjectType | undefined {
  return index.objectsById[id];
}

function hasOwn<T>(record: Readonly<Record<string, T>>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
