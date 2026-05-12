# Codex Gold Prompt: Implement The City Kanban Board One Card At A Time

Use this prompt with Codex Gold when you want it to implement the entire city Kanban board in disciplined, sequential slices while keeping only one active card at a time.

```text
You are Codex working in the repository `/Users/magare/Dev/three/detailed-city`.

All changes must be done on the `main` branch.

Your mission is to implement the entire city described by `docs/city-kanban.md` without compromising architecture, visual quality, determinism, performance, or test coverage.

You must work on exactly one active Kanban card at a time.

Continue from the currently unimplemented part of `docs/city-kanban.md`; do not restart or rework cards that are already complete unless a selected card explicitly requires it.

Do not batch multiple cards. Do not start a second card until the current card is implemented, tested, browser-verified, fixed if needed, documented, moved to the correct board status, and explicitly reported as complete. After one card is complete, select the next single dependency-ready card and repeat the same full process. Continue this one-card-at-a-time loop until the whole Kanban board is complete or until you hit a blocker that requires human input.

Core source of truth:

- `docs/city-kanban.md` is the implementation board.
- `docs/city-domain-structure.md` defines city ownership boundaries.
- `docs/architecture.md` defines code ownership boundaries.
- `docs/generation-rules.md` defines generation order and determinism expectations.
- `docs/data-contracts.md` and `src/city/data-contracts/cityContracts.ts` define city contracts.
- `docs/validation-spec.md` defines validation expectations.
- `docs/vertical-slices.md` defines slice success criteria.
- `docs/performance-budget.md` defines performance targets.
- `docs/visual-style.md` defines the city’s visual identity.
- `docs/debug-tools.md` defines debug and inspection expectations.
- `docs/asset-catalog.md` and `docs/assets.md` define asset rules.

Non-negotiable working rules:

1. Work on one active Kanban card only.
2. Read the target card and its dependencies before editing.
3. If a dependency is not done, stop and report the dependency instead of skipping ahead.
4. Keep edits scoped to the selected card.
5. Preserve the domain-first architecture:
   - City meaning belongs in `src/city`.
   - Generation belongs in `src/generation`.
   - Three.js scene assembly belongs in `src/world` only after domain data exists.
   - Render adapters, mesh builders, LOD, material zones, and asset bindings belong in `src/city/rendering-handoff` or `src/rendering`.
   - Runtime systems belong in `src/systems`.
6. Do not invent planning concepts directly inside renderer code.
7. Keep procedural output deterministic for the same seed/config.
8. Give every new city object stable IDs, owner domain, parent relationships where applicable, LOD tier, and validation coverage.
9. Add or update diagnostics/debug data when a card introduces inspectable city state.
10. Add tests appropriate to the risk. Do not rely only on unit tests.
11. Open the browser, load the city, and verify the rendered result before completing any card that can affect runtime, visuals, generation, diagnostics, config, validation, assets, controls, or UI.
12. If tests or browser verification fail, fix the issues before moving on.
13. Do not mark a card complete while known failures remain.
14. Do not hide visual defects behind fog, darkness, blur, oversized UI, or camera framing.
15. Do not degrade existing visible city quality, object counts, determinism, validation status, or performance without an explicit reason.
16. Do not make unrelated refactors.
17. Do not revert user changes or unrelated local work.
18. The long-term goal is the whole board, but the active work scope is always exactly one card.
19. If the selected card reveals hidden prerequisite work, create or identify the prerequisite card, report the dependency, and stop instead of folding prerequisite work into the current card.
20. Treat each per-card report as an interim progress checkpoint when running autonomously, not as permission to batch the next card into the same implementation scope.
21. Keep code efficient so the city does not consume excessive CPU, GPU, memory, or battery resources on my machine.
22. When moving to the next card, compact the working context before starting, even if the default context compaction threshold has not been reached. Each new card must start from a compacted context focused on the board, current repo state, and the next selected card.

Task selection:

1. Open `docs/city-kanban.md`.
2. Select exactly one card using this order:
   - First incomplete P0 card in `Ready`.
   - Then incomplete P1 card in `Ready`.
   - Then the first unblocked card in `Next`.
   - Then the earliest dependency-ready card in `Backlog` needed by the active vertical slice.
3. Prefer cards that unlock the next vertical slice checkpoint.
4. If I name a card ID, work on that exact card only.
5. If the named card has unmet dependencies, report them and stop.

Dependency-ready means every dependency listed on the card is either already in the `Done` lane or was completed earlier in this same run and recorded in `docs/city-kanban.md`.

Before editing:

1. State the single card you selected:
   - Card ID
   - Card title
   - Dependencies
   - Why it is the next card
2. Read the relevant existing files.
3. Identify the narrow implementation path.
4. Identify tests and browser checks you will run.
5. If a dependency/library is missing, decide whether the card can be implemented without adding it. Add dependencies only when the card genuinely needs them and explain why.

Implementation standard:

For every card, update all layers that the card logically touches:

- Types/contracts in `src/city/data-contracts` or `src/types` when new domain data is introduced.
- Blueprint/domain data in `src/city` when a city concept is introduced.
- Generators in `src/generation` when deterministic procedural output is needed.
- Validators in `src/city/data-contracts/validation` when invalid states are possible.
- Rendering handoff in `src/city/rendering-handoff` or `src/rendering` when domain data becomes visible.
- Scene assembly in `src/world` only as a consumer of planned/render-ready data.
- Runtime systems in `src/systems` when behavior changes over time.
- Diagnostics/debug data in `src/app` when the object should be inspectable.
- Tests in `tests` or a new unit-test location when behavior must be locked.
- Docs only when the card changes contracts, workflows, or important behavior.

Testing requirements for every implementation card:

Minimum local verification:

1. Run TypeScript/build:
   - `npm run build`
2. Run the existing browser smoke tests:
   - `npm run test:e2e`
3. If unit tests exist or are added:
   - Run the relevant unit test command.
4. If new dependencies are added:
   - Run `npm ls --depth=0`.

Browser verification is required:

1. Start or reuse the dev server:
   - `npm run dev -- --port 5173`
2. Open the city in a browser at:
   - `http://127.0.0.1:5173`
3. Verify at desktop viewport:
   - Canvas is visible and nonblank.
   - City is framed correctly.
   - Roads, water, parks, buildings, trees, vehicles, and any new objects render as expected.
   - No major objects overlap incoherently.
   - No UI text overlaps, clips, or blocks core city inspection.
   - Debug/diagnostic data matches the implemented card.
   - Browser console has no new errors.
4. Verify at mobile viewport:
   - Canvas remains visible and nonblank.
   - UI/debug controls remain usable or are intentionally hidden.
   - Text fits and does not overlap.
   - The city remains readable.
5. If the card affects visuals, inspect screenshots or canvas pixels enough to prove the change rendered.

For visual cards, additionally verify:

- The new geometry is visible from at least one named or deliberate camera angle.
- The new objects have correct scale relative to roads, parcels, buildings, and pedestrians/vehicles.
- The material palette remains varied and consistent with `docs/visual-style.md`.
- The city still reads as a detailed contemporary river/coastal city.
- Object density improves the city without creating clutter or performance collapse.
- New lights, signs, windows, or effects support readability rather than hiding problems.

For generation/contract cards, additionally verify:

- Same seed/config produces stable IDs and stable counts.
- Parent references resolve.
- Validation catches at least one representative invalid fixture or invalid state when practical.
- Diagnostics expose new object counts or metadata where useful.
- Rendering consumes domain data, not ad hoc mesh-only assumptions.

For simulation cards, additionally verify:

- Simulation state is deterministic or explicitly seeded.
- Agents reference graph nodes, spawn points, destinations, and schedules.
- Update loops do not allocate excessive objects per frame.
- Pause/resume or reset behavior is stable where applicable.
- Browser verification shows behavior over time, not just initial render.

For debug/UI/authoring cards, additionally verify:

- Controls are compact and do not cover the city unnecessarily.
- Controls reflect actual domain data.
- Controls are keyboard usable where practical.
- Controls do not mutate hidden renderer state without updating source config/domain data.
- Mobile layout does not overlap or clip.

For performance-sensitive cards, additionally verify:

- Instancing or pooling is used for repeated objects.
- Draw calls and object counts are checked through diagnostics or renderer info when available.
- No card introduces obvious per-frame allocations or unbounded object creation.
- The scene remains responsive in desktop and mobile Playwright/browser checks.

Quality bar:

- The implementation should be small enough to review.
- Prefer clear typed data and validators over implicit conventions.
- Prefer deterministic procedural rules over random one-off placement.
- Prefer semantic placement zones over arbitrary coordinates.
- Prefer existing patterns already used in the repo.
- Avoid broad abstractions unless they directly reduce complexity.
- Keep runtime and generation code efficient enough that the city remains responsive on my machine.
- Keep comments sparse and only explain non-obvious logic.
- Keep files ASCII unless an existing file already uses non-ASCII.

Card completion protocol:

Before reporting completion:

1. Confirm all acceptance criteria for the selected card are met.
2. Run required tests and browser checks.
3. Fix every failure introduced by the card.
4. Check `git diff` and ensure changes are scoped to the card.
5. Update `docs/city-kanban.md` for exactly the completed card:
   - Move the completed card to `Done`, or update its status in the existing board format.
   - Add concise acceptance evidence for the completed card.
   - Do not move or mark any other card done.
6. Create a git commit containing the completed card's scoped code, tests, docs, and board update before moving to another card.
7. If the completed card unblocks another card, leave the newly unblocked card in its current lane unless the board format already has a clear status-change rule for it.
8. In full-board mode, after the per-card report and git commit, compact context first, then select exactly one next dependency-ready card and repeat, unless blocked or unless I ask you to pause.
9. In strict pause mode, stop after the per-card report and git commit, then wait for my explicit `continue`.

Per-card report format:

- Card completed: `KAN-XXX — Title`
- What changed: short, concrete summary
- Files changed: list important files
- Verification run:
  - `npm run build`: pass/fail
  - `npm run test:e2e`: pass/fail
  - Browser desktop check: pass/fail and what was inspected
  - Browser mobile check: pass/fail and what was inspected
  - Any added unit/property tests: pass/fail
- Remaining risks or follow-up:
  - Only mention real risks, not generic possibilities
- Git commit:
  - Commit hash and message for the completed card
- Next recommended card:
  - One card ID only
  - If continuing autonomously, say that you will start only that one card next.
  - If blocked, say exactly what input or dependency is required.

If a verification step cannot be run:

- Explain exactly why.
- Provide the command or browser step that should be run later.
- Do not call the card complete unless the missing verification is genuinely unrelated to the card.

If you encounter a failing test or browser issue:

1. Diagnose the failure.
2. Fix the root cause.
3. Re-run the relevant checks.
4. Repeat until the selected card is clean or blocked by an external issue.
5. If blocked, stop and report the blocker.

Start now by selecting exactly one dependency-ready card from `docs/city-kanban.md`, then implement only that card. After it is fully verified, moved to the correct board status, and reported, continue to the next single dependency-ready card using the same process. Keep going one card at a time until the full board is complete or blocked.
```

## Strict Pause Variant

Use this extra paragraph only if you want Codex Gold to stop after every single completed card and wait for your explicit "continue" before selecting the next one.

```text
Strict pause mode is enabled. After completing and reporting one card, stop and wait. Do not select or start the next card until I explicitly say "continue". When I say "continue", select exactly one dependency-ready card and repeat the full implementation, testing, browser verification, and fix cycle.
```
