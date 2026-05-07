import type { RoadSegment, TrafficPlan } from '../../types/city';

export class TrafficLaneGenerator {
  create(roads: RoadSegment[]): TrafficPlan {
    return {
      markings: this.createLaneMarkings(roads),
      vehicles: this.createVehicles(roads)
    };
  }

  private createLaneMarkings(roads: RoadSegment[]): TrafficPlan['markings'] {
    const markings: TrafficPlan['markings'] = [];
    const dashSpacing = 20;

    for (const road of roads) {
      const dashCount = Math.floor(road.length / dashSpacing);

      for (let index = 0; index < dashCount; index += 1) {
        const offset = -road.length / 2 + index * dashSpacing + dashSpacing / 2;
        const center =
          road.orientation === 'vertical'
            ? { x: road.center.x, z: road.center.z + offset }
            : { x: road.center.x + offset, z: road.center.z };

        markings.push({
          id: `${road.id}-lane-dash-${index}`,
          kind: 'lane-marking',
          ownerDomain: 'mobility',
          parentId: road.id,
          lod: 'lod2',
          roadId: road.id,
          center,
          orientation: road.orientation,
          size: { x: 0.42, z: 7.2 }
        });
      }
    }

    return markings;
  }

  private createVehicles(roads: RoadSegment[]): TrafficPlan['vehicles'] {
    const vehicles: TrafficPlan['vehicles'] = [];
    const selectedRoads = roads.filter((_, index) => index % 4 === 0).slice(0, 28);

    selectedRoads.forEach((road, index) => {
      const axis = road.orientation === 'horizontal' ? 'x' : 'z';
      const direction: 1 | -1 = index % 2 === 0 ? 1 : -1;
      const offset = -road.length / 2 + ((index * 37) % Math.floor(road.length));
      const position = {
        x: axis === 'x' ? road.center.x + offset : road.center.x + road.width * 0.22 * direction,
        z: axis === 'z' ? road.center.z + offset : road.center.z + road.width * 0.22 * direction
      };

      vehicles.push({
        id: `traffic-vehicle-${index}`,
        kind: 'traffic-vehicle',
        ownerDomain: 'simulation',
        parentId: road.id,
        lod: 'lod2',
        roadId: road.id,
        axis,
        direction,
        speed: 11 + (index % 5) * 2.2,
        position,
        size: axis === 'x' ? { x: 4.8, z: 2.05 } : { x: 2.05, z: 4.8 },
        min: -road.length / 2,
        max: road.length / 2
      });
    });

    return vehicles;
  }
}
