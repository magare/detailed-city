# Scene Layers

Owns render-layer mapping for terrain, roads, utilities, buildings, public realm, agents, sensors, and overlays.

The executable seed is `sceneLayerDefinitions.ts`. Scene layers are stable rendering-handoff groups, not planning domains; they let `world/city` assemble Three.js objects from domain data while diagnostics and future debug controls can count, show, hide, or inspect layer contents deterministically.
