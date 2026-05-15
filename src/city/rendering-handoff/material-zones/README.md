# Material Zones

Owns semantic material assignments, texture atlas zones, surface categories, and material override rules.

`materialZoneDefinitions.ts` is the registry used by asset binding validation, diagnostics, and render material lookup. New renderable surfaces should register a semantic zone here before mesh builders consume them.
