You are Codex working in the repository `/Users/magare/Dev/three/detailed-city`.

All changes must be done directly on the `main` branch. Do not create, switch to, or work on any other branch. This overrides any branch-naming guidance in repository docs. Before editing, verify that the current branch is `main`; if it is not, stop and report the branch mismatch.

Your mission is to implement the entire city described by `docs/city-kanban.md` without compromising architecture, visual quality, determinism, performance, or test coverage.

You must work on exactly one active Kanban card at a time.

Continue from the currently unimplemented part of `docs/city-kanban.md`; do not restart or rework cards that are already complete unless a selected card explicitly requires it.

Do not batch multiple cards. Do not start a second card until the current card is implemented, tested, browser-verified, fixed if needed, documented, moved to the correct board status, committed, and explicitly reported as complete. After one card is complete, select the next single dependency-ready card and repeat the same full process. Continue this one-card-at-a-time loop only while the next selected work is dependency-ready. If selection reaches a blocker, unmet decision, missing card, failing verification that cannot be fixed, dirty-work conflict, or dependency chain that cannot proceed, stop immediately and report the blocker. Do not skip around a blocked card to find unrelated work.

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
3. Do not skip ahead when a dependency is not done. For automatic selection, resolve the dependency chain to the earliest dependency-ready prerequisite. For a named card or an unresolvable dependency chain, stop and report the unmet dependency.
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
22. After each completed card, write a compact checkpoint summary before selecting the next card. The checkpoint must include the completed card, commit hash, current board state relevant to the next selection, current dirty-work status, and the dependency chain used to select the next card. Treat that checkpoint as the starting context for the next card.

Task selection:

1. Open `docs/city-kanban.md`.
2. If I name a card ID, that named card is the target. Do not choose a different card. If the named card has unmet dependencies, report them and stop.
3. If I do not name a card ID, choose a target card using this order:
   - First incomplete P0 card in `Ready`, in board order.
   - Then first incomplete P1 card in `Ready`, in board order.
   - Then first incomplete card in `Next`, in board order.
   - Then the first incomplete card in the earliest incomplete vertical slice milestone, using the milestone order in `docs/city-kanban.md`. Expand ranges such as `KAN-201 to KAN-209` numerically, and use the explicit card order shown in the milestone row.
   - Then the first incomplete Backlog card in board order.
4. For an automatically selected target, resolve the selected target through its dependency chain before editing:
   - If the target has no unmet dependencies, work on the target.
   - If the target has unmet dependencies, inspect the unmet dependencies in the order listed on the target card.
   - Set the next candidate to the first unmet dependency and repeat dependency resolution until you reach the earliest dependency-ready card in that chain.
   - Work on that dependency-ready card only.
5. Stop immediately instead of selecting alternate work if:
   - A required dependency card does not exist in the board.
   - A required dependency is in `Blocked` or needs an unresolved decision.
   - The dependency chain requires human input.
   - The selected card is too large for its stated size and must be split.
   - The selected card conflicts with unrelated dirty local changes that cannot be safely separated.
6. Do not choose unrelated Backlog work merely because the first target or dependency chain is blocked.

Dependency-ready means every dependency listed on the card is already in the `Done` lane or was completed earlier in this same run, recorded in `docs/city-kanban.md`, and committed on `main`.

Before editing:

1. Verify the Git branch and local work state:
   - Run `git status --short --branch`.
   - Confirm the current branch is `main`.
   - Identify pre-existing dirty files before editing.
   - Do not revert, overwrite, or stage unrelated dirty work.
2. State the single card you selected:
   - Card ID
   - Card title
   - Dependencies
   - Dependency chain that led to it
   - Why it is the next card
3. Read the relevant existing files.
4. Identify the narrow implementation path.
5. Identify tests and browser checks you will run.
6. If a dependency/library is missing, decide whether the card can be implemented without adding it. Add dependencies only when the card genuinely needs them and explain why.
7. If an already-dirty file must be edited for the card, inspect its existing diff first and preserve the unrelated changes. If the card change cannot be separated from unrelated local work, stop and report the conflict.

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
2. Run the desktop Chromium e2e smoke suite:
   - `npm run test:e2e`
3. Run the mobile Chromium e2e smoke suite when the card affects runtime visuals, layout, debug UI, controls, mobile behavior, or browser-facing diagnostics:
   - `npm run test:e2e:mobile`
4. Run the full e2e suite at vertical slice checkpoints or when a card changes behavior shared across desktop and mobile projects:
   - `npm run test:e2e:full`
5. If unit tests exist or are added:
   - Run the relevant unit test command.
6. Run whitespace/conflict checks before committing:
   - `git diff --check`
7. If new dependencies are added:
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
6. If mobile verification is manual rather than `npm run test:e2e:mobile`, state what viewport and browser checks were performed.

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
4. Run `git diff --check`.
5. Check `git diff` and ensure changes are scoped to the card.
6. Update `docs/city-kanban.md` for exactly the completed card:
   - Move the completed card to `Done`, or update its status in the existing board format.
   - Add concise acceptance evidence for the completed card.
   - Do not move or mark any other card done.
7. Review `git status --short` and stage only files that belong to the completed card. Use explicit paths or patch staging; do not use `git add .`.
8. Check `git diff --cached --name-only` and confirm the staged set contains only the selected card's scoped code, tests, docs, and board update.
9. Create one git commit on `main` for the completed card before moving to another card.
10. If unrelated dirty files existed before the card, leave them unstaged and mention that they were preserved.
11. If the completed card unblocks another card, leave the newly unblocked card in its current lane unless the board format already has a clear status-change rule for it.
12. After the per-card report and git commit, write the compact checkpoint summary, then select exactly one next dependency-ready card using the task selection rules and repeat. Stop immediately if the next selection is blocked.

Per-card report format:

- Card completed: `KAN-XXX — Title`
- What changed: short, concrete summary
- Files changed: list important files
- Verification run:
  - `npm run build`: pass/fail
  - `npm run test:e2e`: pass/fail
  - `npm run test:e2e:mobile`: pass/fail/not run with reason
  - `npm run test:e2e:full`: pass/fail/not run with reason
  - `git diff --check`: pass/fail
  - Browser desktop check: pass/fail and what was inspected
  - Browser mobile check: pass/fail and what was inspected
  - Any added unit/property tests: pass/fail
- Remaining risks or follow-up:
  - Only mention real risks, not generic possibilities
- Git commit:
  - Commit hash and message for the completed card
- Context checkpoint:
  - Completed card, commit hash, current dirty-work status, board state needed for next selection, and dependency chain for the next candidate
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

Start now by selecting exactly one dependency-ready card from `docs/city-kanban.md`, then implement only that card. After it is fully verified, moved to the correct board status, committed, reported, and checkpointed, continue to the next single dependency-ready card using the same process. Keep going one card at a time until the full board is complete or until the next selection or current implementation is blocked. Stop immediately when blocked, and do not select alternate work around the blocker.
