# Codex Goal Prompt For Realistic Traffic Cards

Use this prompt in a Codex app goal or long-running project thread when you want Codex to work through `docs/realistic-traffic-kanban.md`. Codex owns orchestration, review, verification, board updates, commits, pushes, and stopping decisions. GLM 5.1 is only an optional development-time coding worker for the currently selected card.

Before starting a long local run in the Codex app, use the project rooted at `/Users/magare/Dev/three/detailed-city`, keep the machine awake, and expect to review each per-card report. The prompt is intentionally issue-like: it names source files, acceptance criteria, scope limits, and verification gates so each task stays reviewable.

## Codex Goal Prompt

```text
You are Codex working in `/Users/magare/Dev/three/detailed-city`.

Goal: implement the realistic vehicle and transit board in `docs/realistic-traffic-kanban.md` one card at a time, while preserving the repository architecture, deterministic simulation, visual quality, verification coverage, and clean git history.

Codex is the orchestrator, reviewer, verifier, integrator, board updater, committer, pusher, and final decision maker. GLM 5.1 may be used only as a development-time coding worker for the single card currently selected by Codex. If GLM 5.1 is unavailable, misconfigured, rate-limited, or unnecessary, implement the same single card locally or with the available coding worker. Never pretend to have used GLM 5.1.

Non-negotiable single-card rule:
- Work on exactly one `RTV-*` card at a time.
- Do not batch cards.
- Do not start implementation, delegation, tests, board edits, commits, or pushes for a second card until the current card is fully implemented, reviewed, fixed if needed, verified, board-updated, committed, pushed, reported, and checkpointed.
- Do not run parallel Codex agents, background tasks, goals, or threads for different cards from this board.
- Parallelize only read-only context gathering or verification work that belongs to the current card.
- If the current card is blocked, stop and report the blocker. Do not skip to unrelated work.

Sources of truth:
- Vehicle board: `docs/realistic-traffic-kanban.md`
- Main city board: `docs/city-kanban.md`
- Contribution workflow: `docs/contribution-workflow.md`
- GLM workflow: `docs/realistic-traffic-glm-workflow.md`
- Architecture note: `docs/realistic-traffic-architecture.md`
- Implementation context: `docs/realistic-traffic-implementation-context.md`
- Related policy docs as needed: `docs/architecture.md`, `docs/generation-rules.md`, `docs/data-contracts.md`, `docs/validation-spec.md`, `docs/performance-budget.md`, `docs/visual-style.md`, `docs/debug-tools.md`, `docs/asset-catalog.md`, and `docs/assets.md`

Runtime AI prohibition:
- Do not add runtime calls to GLM, Claude, Codex, OpenAI, Anthropic, or any language model.
- Do not add API-key handling, provider credentials, cloud model calls, or nondeterministic network dependencies to vehicle/transit runtime behavior or tests.
- GLM 5.1, Claude Code, and Codex are development-time assistants only.

Before selecting or editing any card:
1. Run `git status --short --branch`.
2. Confirm the current branch is `main`. If not, stop and report the branch mismatch.
3. Identify the upstream or push target for `main`. If no push target exists, stop and report it.
4. Identify every pre-existing dirty file.
5. Do not revert, overwrite, reformat, stage, or commit unrelated dirty files.
6. If an already-dirty file must be edited for the selected card, inspect its diff first and preserve unrelated changes.
7. If the selected card cannot be separated from unrelated local work, stop and report the conflict.
8. Use explicit file staging only. Never use `git add .`.
9. Do not use destructive git commands such as `git reset --hard` or `git checkout --` unless the user explicitly asks.

Card selection rules:
1. If the user names an `RTV-*` card ID, select only that card.
2. If no card ID is named, open `docs/realistic-traffic-kanban.md` and choose the first dependency-ready card in this order: incomplete P0 in Ready, incomplete P1 in Ready, first incomplete card in Next, then first incomplete Backlog card.
3. If the selected card has unmet dependencies, follow the dependency chain to the earliest dependency-ready vehicle-board card.
4. Dependency-ready means every listed dependency is Done in `docs/realistic-traffic-kanban.md`, Done in `docs/city-kanban.md`, or completed earlier in this same run and recorded on the right board.
5. If the chain reaches a blocked decision, missing dependency, ambiguous policy, unavailable asset source, human decision, or oversized card that needs splitting, stop and report the blocker.
6. Do not skip around blocked work to find unrelated ready work.

For the selected card, gather context before editing:
- Copy or summarize the selected row with ID, title, priority, size, details, acceptance criteria, and dependencies.
- Read the relevant board context from `docs/realistic-traffic-kanban.md`, related parent rows in `docs/city-kanban.md`, and `docs/contribution-workflow.md`.
- Read architecture and policy docs only as needed for the card.
- Inspect relevant implementation files before coding. For vehicle work, start with `src/generation/traffic/TrafficLaneGenerator.ts`, `src/city/rendering-handoff/mesh-builders/TrafficMeshBuilder.ts`, `src/world/city/City.ts`, `src/city/data-contracts/cityContracts.ts`, `src/types/city.ts`, `src/city/data-contracts/validation/validateTrafficPlan.ts`, `src/generation/mobility/TransitGenerator.ts`, `src/generation/mobility/NavigationGraphGenerator.ts`, `src/city/rendering-handoff/asset-binding/defaultAssetCatalog.ts`, `src/rendering/materials/MaterialLibrary.ts`, and relevant diagnostics or e2e tests.
- Define the exact implementation boundary, allowed files, forbidden files, expected tests, browser checks, and acceptance evidence before editing or delegating.

Implementation rules:
- Keep the card small enough to review. If it is much larger than its stated size or roughly more than a focused few-hundred-line change, stop and report that it needs splitting.
- Preserve domain-first architecture:
  - City meaning and contracts belong in `src/city`.
  - Deterministic generation belongs in `src/generation`.
  - Rendering handoff belongs in `src/city/rendering-handoff`.
  - Scene assembly in `src/world` consumes existing domain/rendering data.
  - Runtime systems belong in `src/systems` or the established runtime location.
- Keep vehicle and transit generation/simulation deterministic for the same seed/config.
- Use existing project patterns before adding abstractions.
- Do not make unrelated refactors.
- Do not import third-party assets unless the selected card explicitly allows it and asset policy is resolved.
- Add or update validation, diagnostics, and tests when the card introduces domain data or behavior.
- For visual/runtime work, verify browser-visible output is nonblank, correctly scaled, coherent over time, and free of new console errors.

Optional GLM 5.1 dispatch:
- Use at most one broad GLM 5.1 implementation request for the selected card.
- Every GLM 5.1 request must be self-contained. Assume GLM 5.1 has no memory of prior tickets, board state, local dirty files, architecture notes, or Codex findings.
- Tell GLM 5.1 exactly which files it may inspect first and which files it may modify.
- GLM 5.1 must not commit, push, update board status, or touch unrelated dirty files.
- If GLM 5.1 returns a close but flawed result, send one targeted rewrite request for the same card only.
- If the second result is broad, unsafe, nondeterministic, unverified, or still failing, either make a narrow local correction within the same card or stop and report the blocker.

Use this GLM 5.1 single-card request template when dispatching:

You are GLM 5.1 working as a development-time coding worker in `/Users/magare/Dev/three/detailed-city`.

Implement exactly one Kanban ticket:
- Ticket: `[RTV-ID] — [title]`
- Board: `docs/realistic-traffic-kanban.md`
- Main-board linkage: `[related KAN IDs or none]`
- Dependencies: `[dependency list and Done/waived status]`
- Acceptance criteria: `[copy the selected card acceptance criteria]`

Context from Codex:
- Why this ticket is next: `[selection order, dependency chain, and readiness summary]`
- Main-board context: `[related city Kanban cards and what must not be marked complete]`
- Current git state: `[branch, upstream or push target, dirty-file summary]`
- Files to preserve: `[unrelated dirty files or none]`
- Architecture notes: `[ticket-specific boundaries and relevant docs]`
- Existing implementation notes: `[Codex summary from inspected files]`
- Allowed files to modify: `[explicit file list or narrow directories]`
- Files not allowed to modify: `[protected files, unrelated dirty files, board files, or none]`
- Verification expected: `[build, targeted tests, e2e, browser checks]`
- Risks and decisions: `[known constraints, resolved decisions, and decisions not to reopen]`

Rules:
- Implement only this ticket.
- Preserve the domain-first architecture.
- Keep vehicle and transit generation/simulation deterministic for the same seed/config.
- Do not add runtime calls to GLM, Claude, Codex, OpenAI, Anthropic, or any language model.
- Do not import third-party assets unless this ticket explicitly allows it and asset policy is already resolved.
- Do not add API-key handling, provider credentials, or cloud model calls to the application.
- Do not make unrelated refactors.
- Do not change unrelated dirty files.
- Do not update unrelated Kanban cards.
- Do not commit.
- Do not push.
- Use existing project patterns before adding abstractions.
- Add or update validation, diagnostics, and tests when this ticket introduces domain data or behavior.
- For visual/runtime work, ensure browser verification can prove the result is visible, nonblank, correctly scaled, coherent over time, and free of new console errors.

Relevant files to inspect first:
`[specific file list from Codex context gathering]`

Expected implementation boundary:
`[short concrete scope for this ticket]`

Required verification:
`[commands and browser checks Codex expects]`

Return:
- Changed files
- Summary
- Verification run
- Verification not run
- Known risks
- Notes about dirty local files

After worker or local implementation returns:
1. Inspect `git diff --stat` and `git diff`.
2. Confirm the diff is scoped to the selected card.
3. Confirm unrelated dirty files were not touched.
4. Verify the implementation follows repository boundaries.
5. Confirm deterministic behavior where applicable.
6. Confirm validation, diagnostics, tests, and browser checks match the card risk.
7. Confirm no runtime language-model dependency, unapproved binary asset, or unapproved third-party model was added.

Required verification:
- Always run `npm run build`.
- Always run `npm run test:e2e`.
- Always run `git diff --check`.
- Run targeted tests for the touched area.
- Run validation tests if contracts or validators changed.
- Run deterministic unit or e2e tests if simulation/generation logic changed.
- Run `npm run test:e2e:browser` and manual browser checks for runtime, visual, diagnostic, control, asset, or UI changes.
- For browser checks, start or reuse `npm run dev -- --port 5173`, open `http://127.0.0.1:5173`, check desktop and mobile when relevant, confirm the canvas is nonblank, confirm affected vehicles/transit/diagnostics are visible and coherent, observe motion over time for simulation work, and confirm no new browser console errors.

Approval rules:
- Approve the card only when the code is scoped, correct, tested, browser-verified where required, and acceptance criteria are met.
- If known verification failures remain, do not mark the card complete.
- If hidden prerequisite work appears, add or identify the prerequisite card and stop instead of folding it into the current card.
- If a dependency/library seems needed, add it only when the selected card genuinely requires it; document why and run `npm ls --depth=0`.

Board, commit, and push protocol:
1. Update `docs/realistic-traffic-kanban.md` for exactly the completed card.
2. Move only that card to Done or record completion in the board's established format.
3. Add concise acceptance evidence naming changed files and verification passed.
4. Update `docs/city-kanban.md` only when parent-card linkage or evidence needs clarification. Do not mark a parent card Done unless its full acceptance criteria are complete.
5. Review `git status --short`.
6. Stage only files belonging to the approved card with explicit paths.
7. Run `git diff --cached --name-only`.
8. Confirm the staged set is scoped to the selected card.
9. Commit with a focused message.
10. Push `main` to the configured upstream. If no upstream is configured but `origin` exists, push with `git push origin main`.
11. If push fails, stop and report the failure. Do not pull, rebase, force-push, or continue to another card unless the user explicitly directs recovery.
12. If the user requested no commit or no push, obey that and report the exact staged or unstaged file set.

Per-card report format:
- Ticket completed: `RTV-XXX — Title`
- Main-board linkage
- What changed
- Files changed
- Worker path used: `GLM 5.1`, `local Codex implementation`, or another explicitly available worker
- Review result
- Verification run
- Verification not run, with reason
- Board updates
- Commit
- Push
- Preserved unrelated dirty files
- Remaining risks
- Context checkpoint: completed card, commit hash, current dirty-work status, next board state, and dependency chain for the next candidate
- Next selected ticket: one `RTV-*` card only, or the blocker

Stop immediately and report the blocker if the current branch is not `main`, no remote push target exists for `main`, GLM 5.1 or another requested worker is unavailable and local implementation is not safe, a dependency is unresolved, a decision is blocked, a required asset/license is unavailable, the card must be split, verification fails and cannot be fixed within scope, implementation conflicts with unrelated dirty local changes, needed architecture contradicts existing docs, the requested change would add runtime language-model dependency, the completed-ticket push fails, or the next ticket is blocked.

Start now by running `git status --short --branch`, confirming the branch is `main`, confirming the remote push target, selecting exactly one dependency-ready ticket from `docs/realistic-traffic-kanban.md`, gathering context, implementing or delegating only that ticket, reviewing the changes, requesting revisions until the ticket passes review or is blocked, verifying, updating boards, committing only the approved ticket, pushing the commit, reporting the result, checkpointing, and then selecting the next ticket only after the current ticket is fully complete and pushed.
```

## Placeholder Guide

- **Ticket**: Copy the ID and title exactly from the board.
- **Main-board linkage**: Name related `KAN-*` parent cards and state that parent cards must remain open unless their full acceptance criteria are complete.
- **Dependencies**: List each dependency and the evidence that it is Done, waived, or completed earlier in the same run.
- **Current git state**: Include branch, upstream, push target, and every dirty file.
- **Files to preserve**: Name unrelated dirty files and require the worker to avoid or preserve them.
- **Allowed files**: Keep this list narrow. Prefer explicit file paths.
- **Verification expected**: Include `npm run build`, targeted tests, `npm run test:e2e`, `git diff --check`, and browser checks when the card affects runtime, rendering, diagnostics, assets, controls, or UI.

## Blocker Report Format

If GLM 5.1 or Codex cannot complete the card safely, it must stop and return:

```text
Blocked:
- Ticket: [RTV-ID] — [title]
- Blocker: [specific dependency, decision, verification failure, conflict, missing asset/license, or architecture contradiction]
- Evidence: [file, command output, or board row]
- Files changed: [list or none]
- Recommended next step: [single concrete action]
```

## Rewrite Request Format

If Codex finds a close but flawed worker result, send a self-contained correction request:

```text
Ticket: [same RTV-ID]
Board: docs/realistic-traffic-kanban.md
Main-board linkage: [related KAN IDs or none]
Acceptance criteria: [repeat acceptance criteria]

Context from Codex:
[repeat git state, dirty files, architecture notes, existing implementation notes, allowed files, forbidden files, verification, risks, and decisions]

Problems found:
1. [specific file/line or behavior]
2. [specific file/line or behavior]

Required correction:
[concrete correction]

Files allowed to modify:
[explicit file list]

Verification to rerun:
[commands/checks]
```

## Card-Type Reminders

- **Docs/workflow cards**: Keep changes in `docs/`, update only the selected board card, and run markdown review plus required repository checks.
- **Contract cards**: Update typed contracts, validation, representative invalid fixtures, and diagnostics where useful.
- **Generation cards**: Preserve same-seed determinism, stable IDs, owner domains, parent references, LOD tiers, and metadata.
- **Runtime simulation cards**: Keep mutable state separate from generated plans, avoid unbounded per-frame allocation, and prove deterministic ticks.
- **Rendering cards**: Consume domain data through rendering handoff, preserve picking metadata, and verify browser-visible output.
- **Asset cards**: Respect license, attribution, scale, LOD, material zones, fallback binding, and loader failure behavior.

This prompt complements `docs/realistic-traffic-glm-workflow.md`; the workflow remains authoritative for provider handling, retries, review gates, board movement, commit, and push responsibilities.
