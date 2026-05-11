# Crossings

Owns crosswalks, refuge islands, midblock crossings, raised crossings, tactile cues, and crossing priority.

The first executable seed creates marked crossing contracts at generated intersections. Each crossing references its parent intersection, crossed road, connected sidewalks, dimensions, and graph edge.

`src/generation/traffic/TrafficLaneGenerator.ts` now consumes detailed-street crossing contracts to create zebra stripe, stop bar, tactile paving, and refuge-island `lane-marking` objects for rendering and picking.
