# GLM 5.1 Vehicle Card Workflow

This runbook resolves `RTV-D01` for the realistic vehicle and transit board. It defines how GLM 5.1 may be used as a development-time coding worker for one `RTV-*` card while keeping the city runtime deterministic, replayable, testable, and free of language-model calls.

## Role Split

- **Codex** is the orchestrator, reviewer, verifier, board updater, committer, pusher, and final decision maker.
- **GLM 5.1** may be used as a development-time coding worker for a single selected card when a provider is available.
- **Claude Code** remains the default coding worker for this repository workflow unless Codex explicitly dispatches GLM 5.1 for a card.
- Runtime vehicle and transit systems must never call GLM 5.1, Claude, Codex, OpenAI, Anthropic, or any other language model.

## Preconditions

Before dispatching GLM 5.1, Codex must confirm:

1. `git status --short --branch` shows branch `main`.
2. `main` has an upstream or push target.
3. Dirty files are identified and either unrelated or intentionally part of the selected card.
4. The selected card is dependency-ready in `docs/realistic-traffic-kanban.md`.
5. The relevant main-board linkage in `docs/city-kanban.md` is understood.
6. `docs/contribution-workflow.md` has been read for card movement, verification, and ADR expectations.

If any precondition fails, Codex must stop and report the blocker.

## Context Packet

Every GLM 5.1 request must be self-contained. Include:

- Ticket ID, title, priority, size, details, acceptance criteria, and dependencies.
- Dependency chain and why the card is dependency-ready.
- Main-board parent cards and what must not be marked complete.
- Current branch, upstream or push target, and dirty-file summary.
- Dirty files to preserve.
- Architecture rules and relevant docs for the card.
- Files to inspect first.
- Codex's summary of existing behavior from those files.
- Allowed files and forbidden files.
- Required tests, diagnostics, browser checks, and acceptance evidence.
- Known risks and decisions GLM 5.1 must not reopen.

Do not send short follow-ups that rely on memory. Rewrite requests must repeat the same ticket context, constraints, allowed files, forbidden files, verification, risks, and specific problems found.

## Allowed Work

GLM 5.1 may:

- Edit files explicitly allowed by Codex for the selected card.
- Add focused tests, diagnostics, docs, or validation required by the card.
- Run local commands needed for implementation and verification.
- Report blockers when the card is too broad, dependencies are missing, or verification cannot be completed.

GLM 5.1 must not:

- Work on more than one card.
- Commit, push, create branches, or update unrelated board cards.
- Revert or overwrite unrelated dirty files.
- Add runtime language-model calls or nondeterministic cloud dependencies.
- Add third-party assets or dependencies unless the selected card explicitly allows it and the policy is already resolved.
- Store API keys, provider tokens, prompts with secrets, or credentials in the repository.

## Provider And Credentials

GLM 5.1 provider configuration is a local developer concern. API keys and account configuration must live outside the repository, such as in a secure local credential store or ignored environment configuration.

If GLM 5.1 is unavailable, misconfigured, rate-limited, or cannot access the required local tools, Codex must fall back to Claude Code or local implementation for that same card. The fallback path must still preserve the same single-card scope and review gates.

## Retry And Fallback Policy

- Use at most one broad implementation request per selected card.
- If the result is close but flawed, send one targeted rewrite request with exact findings and allowed files.
- If the second result is still broad, unsafe, nondeterministic, or fails verification, Codex should either implement a narrow correction locally or stop and report the blocker.
- If the provider is unavailable before work begins, skip GLM 5.1 and use Claude Code or local implementation.

No GLM 5.1 output is approved until Codex reviews the diff, verifies scope, and runs the required gates.

## Review And Verification Gates

After GLM 5.1 returns, Codex must:

1. Inspect `git diff --stat` and `git diff`.
2. Confirm the diff is scoped to the selected card and preserves unrelated dirty files.
3. Check the architecture boundary: city meaning in `src/city`, generation in `src/generation`, rendering handoff in `src/city/rendering-handoff`, scene assembly in `src/world`, and runtime systems in `src/systems`.
4. Confirm deterministic behavior and absence of runtime language-model calls.
5. Run `npm run build`, `npm run test:e2e`, and `git diff --check`.
6. Run targeted tests and browser checks required by the card.

For visible or runtime behavior, Codex must use browser verification to confirm nonblank output, coherent vehicle/transit behavior, and no new console errors.

## Board, Commit, And Push

Only Codex updates boards, stages files, commits, and pushes. After approval:

1. Move only the completed card to Done or record it in the board's established Done format.
2. Add concise evidence naming files changed and verification passed.
3. Update `docs/city-kanban.md` only when parent-card linkage or evidence needs clarification.
4. Stage explicit paths only; never use `git add .`.
5. Commit a focused message for the card.
6. Push `main` to the configured target.

If push fails, Codex must stop and report the failure instead of pulling, rebasing, force-pushing, or starting another card.

## Single-Card Request Template

```text
You are GLM 5.1 working as a development-time coding worker in /Users/magare/Dev/three/detailed-city.

Implement exactly one Kanban ticket:
- Ticket: [ID] — [title]
- Board: docs/realistic-traffic-kanban.md
- Main-board linkage: [KAN IDs or none]
- Dependencies: [dependency list and status]
- Acceptance criteria: [copy from board]

Context from Codex:
- Why this ticket is next: [dependency chain and readiness]
- Main-board context: [related parent cards and limits]
- Current git state: [branch, upstream, dirty files]
- Files to preserve: [dirty files or none]
- Architecture notes: [card-specific rules]
- Existing implementation notes: [Codex inspection summary]
- Allowed files to modify: [explicit list]
- Files not allowed to modify: [explicit list]
- Verification expected: [commands and browser checks]
- Risks and decisions: [constraints not to reopen]

Rules:
- Implement only this ticket.
- Keep simulation deterministic and replayable.
- Do not add runtime language-model calls.
- Do not make unrelated refactors.
- Do not update unrelated board cards.
- Do not commit or push.

Return changed files, summary, verification run, verification not run, known risks, and dirty-file notes.
```
