# Agent instructions — Family Stock Challenge

## Purpose

This repository contains a small, fair, light-hearted family stock-picking game. Keep the system simple, reproducible, phone-friendly and easy for a human maintainer to understand.

The project is not investment advice, real-money portfolio management or a financial-data platform.

## Repository map

- `README.md` — permanent product truth, architecture, current status, operations, privacy, limitations and recovery guidance.
- `AGENTS.md` — these durable instructions for agents working in the repository.
- `intent.md` — brief reason and desired outcome for the latest change.
- `spec.md` — brief summary of what the latest change was required to achieve.
- `plan.md` — brief summary of how the latest change was implemented; use detailed plans only when sequencing or architectural decisions justify them.
- `src/` — application and calculation logic.
- `test/` — automated tests and fixtures.
- `config/` — version-controlled non-secret configuration and ticker mappings.
- `data/` — authoritative financial ledger and game data.
- `public/` — generated public scorecard data and dashboard assets.
- `audit/` — historical audit notes and reconciliations.
- `.env` — local secrets only; never commit or expose it.

## Source-of-truth boundaries

- `data/game-ledger.json` is the authoritative financial record.
- `public/scorecard-data.json` is generated output, not an independent source of truth.
- Notion contains private player context, theses and notes. Do not use it as an implicit calculation input and do not copy its narrative into public files.
- Git is the history and recovery mechanism for code, data and documentation.

## Agent roles

### Intent / Specification

Works with the user to define the purpose and required behaviour of a change.
Owns `intent.md` and `spec.md`. Does not implement.

### Builder

Implements the approved specification.
Creates `plan.md` when complexity warrants it.
Self-tests before handing work over.

### Tester / Reviewer

Independently verifies the implementation against the specification and original intent.
Looks for regressions and unintended behaviour.
Does not fix failures unless explicitly asked.

## Working conventions

- Read `README.md`, `intent.md`, `spec.md` and `plan.md` before making a material change. If one is absent, say so and continue with the available documentation.
- Treat `README.md` as current product truth. Update it when completed work materially changes the product or operating procedure.
- Treat `intent.md`, `spec.md` and `plan.md` as durable, human-readable records. After a change is complete, reduce each to a brief summary of the completed change, outcome and any remaining limitation. Do not leave stale implementation instructions in them.
- Use `spec.md` and, where justified, `plan.md` for proposed work before implementation. Do not put task-specific requirements into `AGENTS.md`.
- Preserve the existing dashboard design unless a request explicitly changes it.

## How to work

1. **Autonomy:** proceed without asking when the task is clear, local, reversible and within the approved specification.
2. **Ask the user:** when requirements are materially ambiguous, there are meaningful product trade-offs, scope would expand, or the action is destructive, risky or security-related.
3. **Do not interrupt the user:** for ordinary implementation choices, fixing tests or lint caused by the change, or questions Codex can answer by inspecting the code.
4. **Verification:** test the change before declaring completion and never claim something was tested when it was not.
5. **Intent checking:** verify the finished result against the original `intent.md`, not merely the specification and tests—did we build the right thing, not just build the thing right?
6. **Documentation:** update `README.md` when the current product materially changes; update `AGENTS.md` only when a genuinely reusable working rule emerges.
7. **Scope discipline:** make the smallest change that satisfies the specification; do not casually refactor unrelated code or overwrite unrelated changes.

## Safety and autonomy

- Read and explain relevant existing behaviour before changing it.
- Do not initiate publication or other external actions manually without explicit user authorization. A configured scheduled workflow may perform its already-approved actions within its documented scope.
- Use dry runs, fixtures, isolated output directories and test branches before live operations.
- Never guess missing prices, FX rates, tickers or trades. Stop with a clear explanation when required data is missing or ambiguous.
- Keep credentials, personal addresses, tokens and private narrative out of Git, public JSON and logs.
- Do not run destructive commands such as hard resets or broad deletion. Prefer recoverable operations and confirm exact targets first.

## Verification requirements

For code changes, run proportionate checks before handoff. The normal baseline is:

```text
npm test
npm run build
git diff --check
```

For financial or publication changes, also verify that candidate calculations are reproducible, required source/date metadata is present, and the live ledger/public output remain unchanged until the permitted publication step.

For email or scheduled-workflow changes, test the no-send/dry-run path separately from any explicitly authorised email test. Never send a real message merely to prove that unrelated code compiles.

Report what was tested, what was not tested, external limitations such as network or credentials, and whether any live data or external service was changed.

## Documentation completion checklist

When a material change is complete:

1. Confirm the implementation against the relevant intent and spec.
2. Update `README.md` if the current product or operating procedure changed.
3. Replace the contents of `intent.md`, `spec.md` and `plan.md` with brief completed-change summaries, retaining their detailed history in Git.
4. Run the relevant verification checks.
5. Report changed files, tests, remaining limitations and any action that still requires the user's approval.
