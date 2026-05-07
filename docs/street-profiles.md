# Street Profiles

Street profiles convert mobility intent into lanes, sidewalks, curbs, trees, lighting, props, and route graph constraints.

The executable seed is `DEFAULT_STREET_PROFILES` in `src/city/data-contracts/cityContracts.ts`.

## Profile Fields

| Field | Purpose |
| --- | --- |
| `hierarchy` | Arterial, collector, local, alley, promenade, or transit corridor. |
| `totalWidthMeters` | Right-of-way width available for all street zones. |
| `vehicleLanes` | Count of through vehicle lanes. |
| `laneWidthMeters` | Typical lane width. |
| `sidewalkWidthMeters` | Clear pedestrian sidewalk width before frontage/furnishing split. |
| `bikeLane` | None, painted, protected, or cycle-track. |
| `parking` | None, one side, two sides, or loading-only. |
| `median` | Whether a planted or hard median exists. |
| `treeZone` | Whether the profile includes street tree placement zones. |
| `transitLane` | Whether buses/trams get dedicated priority. |
| `designSpeedKph` | Speed used for traffic behavior and safety validation. |

## Initial Profiles

| Profile | Use |
| --- | --- |
| `grand-avenue` | Tall corridors, transit priority, median, protected bikes, large sidewalks. |
| `main-street` | Retail frontage, slower traffic, parking/loading, frequent crosswalks. |
| `residential-street` | Neighborhood access, narrow lanes, trees, local parking. |
| `service-alley` | Loading, waste, fire access, back-of-house movement. |
| `waterfront-promenade` | Pedestrians, bikes, lighting, kiosks, seating, water access. |

## Generation Rules

- Road hierarchy selects the default profile.
- Intersections must inherit crossing expectations from both intersecting profiles.
- Sidewalk graph nodes must be generated from profile sidewalk zones.
- Curb allocation must be explicit, especially for loading, transit stops, emergency access, and parking.
- Street tree, light, sign, and furniture placement should attach to profile zones, not to mesh coordinates.

## Validation Rules

- Arterials and transit corridors require controlled crossings.
- Alleys cannot be primary pedestrian routes unless explicitly upgraded.
- Promenades cannot host through vehicle traffic.
- Sidewalk width must satisfy accessibility minimums for public streets.
- Loading zones cannot block fire lanes, crosswalks, or transit stops.
