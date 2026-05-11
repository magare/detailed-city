# Contribution Workflow

This workflow keeps the detailed city implementation auditable while the Kanban board is worked one card at a time.

## Decision Records

Use an ADR when a change introduces or materially changes any of these:

- City domain ownership boundaries.
- Data contracts, validation categories, stable ID rules, import/export shapes, or LOD policy.
- Generation order, deterministic seed behavior, or procedural placement rules.
- Rendering handoff boundaries, asset source policy, material/LOD strategy, or scene-layer policy.
- Runtime simulation architecture, performance budgets, or externally visible debug/authoring behavior.
- New external dependencies, asset licenses, or long-lived workflow rules.

ADR files live in `docs/decisions/` and use `ADR-###-short-title.md`. Copy `docs/decisions/ADR-TEMPLATE.md`, choose the next number, keep the status explicit, and link the related Kanban card. Accepted ADRs should be referenced from the card evidence or from the domain doc they affect.

## Card Movement Rules

- Work on exactly one active card.
- Select cards from `docs/city-kanban.md` by lane priority, then by dependency readiness.
- Do not skip a selected card with unmet dependencies; report the missing dependency and stop or choose the earliest dependency-ready card allowed by the selection rules.
- Keep unrelated cards in their current lane, even when a completed card unblocks them.
- Move a card to `Done` only after implementation, required tests, browser verification where required, diff review, and acceptance evidence are complete.
- The `Done` evidence must name the main files or docs changed and the verification commands or browser checks that proved the acceptance criteria.
- If hidden prerequisite work appears, add or identify the prerequisite card and stop instead of folding it into the active card.

## Branch And Change Scope

- Use a branch named `codex/<card-id>-short-title` when creating a branch for card work.
- Keep commits and diffs scoped to the active card; do not include unrelated dirty work.
- Preserve user changes. Do not reset, checkout, or revert unrelated files unless the user explicitly asks.
- Prefer small reviewable patches over broad refactors. If a card is larger than its stated size, split or report the mismatch before continuing.
- Add dependencies only when the card genuinely needs them, document why, and run `npm ls --depth=0`.

## Verification Expectations

Run the verification that matches the card risk before moving a card to `Done`.

Always run:

- `npm run build`
- `npm run test:e2e`
- `git diff --check`

Run additional targeted tests when the card adds or changes contracts, generation, validation, rendering handoff, runtime systems, diagnostics, assets, controls, or docs with executable examples.

Browser verification is required for runtime, visual, generation, diagnostics, config, validation, asset, control, and UI cards. Reuse the dev server at `http://127.0.0.1:5173`, check desktop and mobile viewports, confirm a nonblank canvas, inspect diagnostics, and record console errors if any.

Docs-only cards still run build and e2e to prove the repository was not disturbed. A lightweight desktop/mobile browser smoke check should be run when continuing the full-board workflow.

## Review Checklist

Before reporting a card complete, check:

- The card dependencies are in `Done`.
- City meaning remains in `src/city`; procedural work remains in `src/generation`; Three.js assembly consumes existing domain data from `src/world`.
- New city objects have stable IDs, owner domains, parent references where applicable, LOD tier, source metadata, and asset/fallback bindings where applicable.
- Validators reject representative invalid states.
- Diagnostics expose new inspectable city state.
- Repeated visible objects use instancing or pooling where appropriate.
- UI/debug controls are compact, keyboard usable where practical, and usable on mobile.
- Tests cover deterministic output, validation failures, and browser behavior at the right level of risk.
- ADRs exist for architecture, workflow, dependency, asset, or policy choices that future cards must understand.
- `docs/city-kanban.md` moves only the completed card and records concise acceptance evidence.
