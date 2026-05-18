# GLM 5.1 Single Vehicle Card Prompt

Use this template to dispatch GLM 5.1 as a development-time coding worker for exactly one `RTV-*` card from `docs/realistic-traffic-kanban.md`. Fill every bracketed placeholder before sending. Do not rely on previous GLM 5.1 context.

```text
You are GLM 5.1 working as a development-time coding worker in /Users/magare/Dev/three/detailed-city.

Implement exactly one Kanban ticket:
- Ticket: [RTV-ID] — [title]
- Board: docs/realistic-traffic-kanban.md
- Main-board linkage: [related KAN IDs or none]
- Dependencies: [dependency list and Done/waived status]
- Acceptance criteria: [copy the selected card acceptance criteria]

Context from Codex:
- Why this ticket is next: [selection order, dependency chain, and readiness summary]
- Main-board context: [related city Kanban cards and what must not be marked complete]
- Current git state: [branch, upstream or push target, dirty-file summary]
- Files to preserve: [unrelated dirty files or none]
- Architecture notes: [ticket-specific boundaries and relevant docs]
- Existing implementation notes: [Codex summary from inspected files]
- Allowed files to modify: [explicit file list or narrow directories]
- Files not allowed to modify: [protected files, unrelated dirty files, board files, or none]
- Verification expected: [build, targeted tests, e2e, browser checks]
- Risks and decisions: [known constraints, resolved decisions, and decisions not to reopen]

Rules:
- Implement only this ticket.
- Preserve the domain-first architecture:
  - City meaning and contracts belong in src/city.
  - Deterministic generation belongs in src/generation.
  - Rendering handoff belongs in src/city/rendering-handoff.
  - Scene assembly in src/world consumes existing domain/rendering data.
  - Runtime systems belong in src/systems or the established runtime location.
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
[specific file list from Codex context gathering]

Expected implementation boundary:
[short concrete scope for this ticket]

Required verification:
[commands and browser checks Codex expects]

Return:
- Changed files
- Summary
- Verification run
- Verification not run
- Known risks
- Notes about dirty local files
```

## Placeholder Guide

- **Ticket**: Copy the ID and title exactly from the board.
- **Main-board linkage**: Name related `KAN-*` parent cards and state that parent cards must remain open unless their full acceptance criteria are complete.
- **Dependencies**: List each dependency and the evidence that it is Done, waived, or completed earlier in the same run.
- **Current git state**: Include branch, upstream, push target, and every dirty file.
- **Files to preserve**: Name unrelated dirty files and require GLM 5.1 to avoid or preserve them.
- **Allowed files**: Keep this list narrow. Prefer explicit file paths.
- **Verification expected**: Include `npm run build`, targeted tests, `npm run test:e2e`, `git diff --check`, and browser checks when the card affects runtime, rendering, diagnostics, assets, controls, or UI.

## Blocker Report Format

If GLM 5.1 cannot complete the card safely, it must stop and return:

```text
Blocked:
- Ticket: [RTV-ID] — [title]
- Blocker: [specific dependency, decision, verification failure, conflict, missing asset/license, or architecture contradiction]
- Evidence: [file, command output, or board row]
- Files changed: [list or none]
- Recommended next step: [single concrete action for Codex]
```

## Rewrite Request Format

If Codex finds a close but flawed result, send a self-contained correction request:

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

This prompt template complements `docs/realistic-traffic-glm-workflow.md`; the workflow remains authoritative for provider handling, retries, review gates, board movement, commit, and push responsibilities.
