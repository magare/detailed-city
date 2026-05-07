import type { ValidationIssue, ValidationResult } from '../cityContracts';
import type { GeneratedCity } from '../../../types/city';

type GeneratedCityForValidation = Pick<
  GeneratedCity,
  'blocks' | 'buildings' | 'districts' | 'parcels' | 'parks' | 'roads' | 'trees' | 'waterways'
>;

export function validateGeneratedCity(city: GeneratedCityForValidation): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  const roadChildren = city.roads.flatMap((road) => [...road.lanes, ...road.sidewalks]);
  const objects = [
    ...city.districts,
    ...city.blocks,
    ...city.roads,
    ...roadChildren,
    ...city.parcels,
    ...city.buildings,
    ...city.parks,
    ...city.waterways,
    ...city.trees
  ];

  for (const object of objects) {
    if (ids.has(object.id)) {
      issues.push({
        id: `duplicate-id-${object.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: object.id,
        message: `Duplicate city object id: ${object.id}.`
      });
    }
    ids.add(object.id);
  }

  for (const road of city.roads) {
    if (road.length <= 0 || road.width <= 0 || road.laneCount <= 0 || road.widthMeters <= 0) {
      issues.push({
        id: `invalid-road-${road.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: road.id,
        message: 'Road segments must have positive length, width, widthMeters, and lane count.'
      });
    }

    if (road.lanes.length !== road.laneCount) {
      issues.push({
        id: `lane-count-mismatch-${road.id}`,
        severity: 'error',
        category: 'graph',
        objectId: road.id,
        message: `Road declares ${road.laneCount} lanes but generated ${road.lanes.length}.`
      });
    }

    const totalLaneWidth = road.lanes.reduce((sum, lane) => sum + lane.widthMeters, 0);
    if (totalLaneWidth > road.widthMeters + 0.001) {
      issues.push({
        id: `lanes-over-road-width-${road.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: road.id,
        message: `Road lane widths total ${totalLaneWidth.toFixed(1)}m but road width is ${road.widthMeters.toFixed(1)}m.`
      });
    }

    for (const lane of road.lanes) {
      if (lane.roadSegmentId !== road.id || lane.parentId !== road.id || lane.widthMeters <= 0) {
        issues.push({
          id: `invalid-lane-${lane.id}`,
          severity: 'error',
          category: 'graph',
          objectId: lane.id,
          message: 'Lane must reference its parent road and have a positive width.'
        });
      }
    }

    for (const sidewalk of road.sidewalks) {
      if (sidewalk.roadSegmentId !== road.id || sidewalk.parentId !== road.id || sidewalk.clearWidthMeters <= 0) {
        issues.push({
          id: `invalid-sidewalk-${sidewalk.id}`,
          severity: 'error',
          category: 'graph',
          objectId: sidewalk.id,
          message: 'Sidewalk must reference its parent road and have a positive clear width.'
        });
      }
    }
  }

  for (const district of city.districts) {
    if (district.boundary.length < 4 || district.primaryUses.length === 0 || district.allowedStreetProfiles.length === 0) {
      issues.push({
        id: `invalid-district-${district.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: district.id,
        message: 'Districts must have a boundary, primary uses, and allowed street profiles.'
      });
    }
  }

  for (const block of city.blocks) {
    if (!ids.has(block.districtId) || block.parentId !== block.districtId) {
      issues.push({
        id: `invalid-block-district-${block.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: block.id,
        message: `Block must reference an existing parent district ${block.districtId}.`
      });
    }

    if (block.size.x <= 0 || block.size.z <= 0 || block.boundary.length < 4) {
      issues.push({
        id: `invalid-block-geometry-${block.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: block.id,
        message: 'Blocks must have positive dimensions and a valid boundary seed.'
      });
    }
  }

  const parcelsById = new Map(city.parcels.map((parcel) => [parcel.id, parcel]));

  for (const parcel of city.parcels) {
    if (!ids.has(parcel.districtId) || !ids.has(parcel.blockId)) {
      issues.push({
        id: `invalid-parcel-relationships-${parcel.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: parcel.id,
        message: `Parcel must reference existing district ${parcel.districtId} and block ${parcel.blockId}.`
      });
    }

    if (
      parcel.size.x <= 0 ||
      parcel.size.z <= 0 ||
      parcel.maxHeightMeters <= 0 ||
      parcel.maxCoverageRatio <= 0 ||
      parcel.maxCoverageRatio > 1
    ) {
      issues.push({
        id: `invalid-parcel-${parcel.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: parcel.id,
        message: 'Parcels must have positive width, depth, max height, and a coverage ratio from 0 to 1.'
      });
    }

    if (parcel.frontageRoadIds.length === 0) {
      issues.push({
        id: `missing-frontage-${parcel.id}`,
        severity: 'error',
        category: 'graph',
        objectId: parcel.id,
        message: 'Parcel must expose at least one frontage road.'
      });
    }

    for (const frontageRoadId of parcel.frontageRoadIds) {
      if (!ids.has(frontageRoadId)) {
        issues.push({
          id: `missing-frontage-road-${parcel.id}-${frontageRoadId}`,
          severity: 'error',
          category: 'identifier',
          objectId: parcel.id,
          message: `Parcel references missing frontage road ${frontageRoadId}.`
        });
      }
    }

    if (parcel.allowedUses.length === 0) {
      issues.push({
        id: `missing-allowed-uses-${parcel.id}`,
        severity: 'error',
        category: 'zoning',
        objectId: parcel.id,
        message: 'Parcel must carry at least one allowed land use.'
      });
    }
  }

  for (const building of city.buildings) {
    const parcel = parcelsById.get(building.parcelId);

    if (!parcel) {
      issues.push({
        id: `missing-building-parcel-${building.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: building.id,
        message: `Building references missing parcel ${building.parcelId}.`
      });
      continue;
    }

    if (building.size.x <= 0 || building.size.z <= 0 || building.heightMeters <= 0 || building.floorCount <= 0) {
      issues.push({
        id: `invalid-building-${building.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: building.id,
        message: 'Buildings must have positive footprint, height, and floor count.'
      });
    }

    if (building.size.x > parcel.size.x || building.size.z > parcel.size.z) {
      issues.push({
        id: `building-over-parcel-${building.id}`,
        severity: 'error',
        category: 'geometry',
        objectId: building.id,
        message: 'Building footprint must fit inside its parcel envelope.'
      });
    }

    const coverageRatio = (building.size.x * building.size.z) / (parcel.size.x * parcel.size.z);
    if (coverageRatio > parcel.maxCoverageRatio + 0.001) {
      issues.push({
        id: `coverage-over-zoning-${building.id}`,
        severity: 'error',
        category: 'zoning',
        objectId: building.id,
        message: `Building coverage ${coverageRatio.toFixed(2)} exceeds parcel max coverage ${parcel.maxCoverageRatio.toFixed(2)}.`
      });
    }

    if (building.heightMeters > parcel.maxHeightMeters) {
      issues.push({
        id: `height-over-zoning-${building.id}`,
        severity: 'warning',
        category: 'zoning',
        objectId: building.id,
        message: `Building height ${building.heightMeters.toFixed(1)}m exceeds max height ${parcel.maxHeightMeters.toFixed(1)}m.`
      });
    }

    for (const use of building.uses) {
      if (!parcel.allowedUses.includes(use)) {
        issues.push({
          id: `use-over-zoning-${building.id}-${use}`,
          severity: 'error',
          category: 'zoning',
          objectId: building.id,
          message: `Building use ${use} is not allowed by parcel ${parcel.id}.`
        });
      }
    }
  }

  for (const tree of city.trees) {
    if (!ids.has(tree.parkId)) {
      issues.push({
        id: `missing-tree-parent-${tree.id}`,
        severity: 'error',
        category: 'identifier',
        objectId: tree.id,
        message: `Tree planting references missing park ${tree.parkId}.`
      });
    }
  }

  return {
    passed: issues.every((issue) => issue.severity !== 'error'),
    issues
  };
}
