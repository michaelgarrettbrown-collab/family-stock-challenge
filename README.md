# Family Stock Challenge

## Project intent

The Family Stock Challenge is a small, light-hearted family stock-picking game. Each player starts with the same virtual capital and the public scorecard shows how their choices have performed over time.

It is not investment advice, real-money portfolio management or a financial-data platform. The design preference is for a fair, reproducible and low-maintenance game that is easy to follow on a phone and easy to discuss in the family WhatsApp group.

## Current operational status

- **Live dashboard:** valued through 5 November 2026.
- **Manual production publications:** succeeded on 17 September, 24 September, 1 October, 8 October and 5 November 2026; Gmail sends completed without error.
- **Friday 08:05 schedule:** intended to run in Codex for Europe/Madrid, but its present external configuration and reliability are unverified. Manual production runs remain the confirmed operating path.
- **Quarterly trading:** not enabled. No post-opening trade should be added without agreeing the rules first.

## System map

```text
Notion: player context and commentary only
        ↓ (not used for calculations)

Local JSON ledger → validation + calculations → public scorecard JSON → GitHub Pages dashboard
       ↑                      ↓
Yahoo Finance closes + ECB FX   Git history / recovery
```

## The two data stores

### Local JSON ledger — the financial record

[`data/game-ledger.json`](data/game-ledger.json) is the authoritative game record. It is version-controlled in Git and is the source of all dashboard financial calculations. It contains:

- players, starting capital and game rules;
- exact MIC-qualified instruments, exchanges and currencies;
- opening purchases, quantities and FX used at purchase;
- current valuations and dated weekly snapshots; and
- quarter checkpoints.

`public/scorecard-data.json` is generated from this ledger and the scorecard configuration. It is a public, derived dashboard file—not a separate system of record. Git history preserves previous approved game data and lets a bad publication be reverted.

### Notion — the human record

Notion is deliberately not part of the financial calculation or publication path. It holds one lightweight player page with:

- current-quarter and holdings summaries;
- original investment thesis;
- the last completed checkpoint value; and
- player notes and reflections, appended over time.

Family commentary and reflections remain private. The dashboard includes only authorized concise excerpts of each original thesis, read once from Notion and stored in configuration; it makes no runtime Notion requests. Financial calculations remain reproducible without a Notion connection.

## Weekly data acquisition and publication

The intended weekly valuation is Thursday's close, with the automatic run scheduled externally in Codex for Friday at 08:05 Europe/Madrid after the existing 08:00 computer wake-up. The repository code does not create or control either schedule; the computer must be awake and the Codex desktop app running.

For every instrument, the workflow:

1. Uses the exchange-specific Yahoo Finance ticker from [`config/yahoo-tickers.json`](config/yahoo-tickers.json) to retrieve the historical daily **Close** price for Thursday. For LSE shares, Yahoo's GBp/pence price is converted to GBP by dividing by 100.
2. Retrieves Thursday EUR, USD and KRW reference rates from the European Central Bank (ECB), deriving each holding's GBP FX rate. GBP holdings use an FX rate of `1`.
3. Records the native price, GBP FX rate, dates, source names, source URLs and any market-closure exception in the weekly snapshot.
4. Rejects incomplete, unapproved or implausible data; it must not silently substitute a different ticker, source or estimate. If Yahoo has no Thursday row, the current implementation uses its most recent earlier Close and records a market-closure exception. This is a known limitation: it can represent a stale price and requires operational review.
5. Tests and builds the candidate scorecard in isolation before any publication.

When a production run succeeds, it updates the ledger and public scorecard data, commits only those permitted data files, pushes `main`, and GitHub Pages refreshes the dashboard. It then emails Michael a WhatsApp-ready family summary. If a required collection, validation, test, build, Git or pre-publication email check fails, it does not publish a partial update.

The first manual live publication succeeded on 17 September 2026 and Gmail delivery was confirmed by Michael. Subsequent manual production publications have succeeded through 5 November 2026. The external Friday schedule should be treated as unverified until its Scheduled run history has been checked after a successful unattended run.

## Known limitations and inconsistencies

- The Friday 08:05 schedule is configured outside this repository. Its prior local configuration record is no longer available here, and no successful unattended production run has been confirmed. Keep the computer awake and the ChatGPT desktop app running for any scheduled local-project run, then review its result in Scheduled.
- Yahoo Finance is a convenient public source, not an official exchange feed. The collector cannot independently prove that a returned daily row is the exchange's official close.
- If Yahoo has no Thursday row, the current workflow can publish using the most recent earlier Close and records a market-closure exception. This conflicts with the stronger ideal of an official Thursday-close valuation and needs a future policy decision; it is not a licence to invent or silently substitute data.
- Post-opening trading remains disabled; the dashboard rules state this explicitly.

## Privacy and secrets

- Game data, source provenance and code may be public in GitHub.
- Only explicitly authorized concise initial-thesis excerpts are retained in `config/scorecard.config.json` and generated public JSON. Other Notion narrative does not enter the ledger or public JSON.
- Gmail address, App Password and any future provider credentials are local secrets in `.env`; `.env` is ignored by Git.
- `.env.example` contains variable names only and is safe to commit.

## Commands

### General ledger checks

- `npm test` — run the ledger, market-data and weekly-workflow unit tests. It does not send email, push Git or change the site.
- `npm run preview` — validate the current ledger and print its calculated leaderboard.
- `npm run build` — regenerate the current public scorecard JSON and local delivery files.
- `npm run serve` — serve the dashboard locally at `http://127.0.0.1:8766/`.

### Weekly-workflow tests

- `npm run weekly-dry-run -- --date YYYY-MM-DD` — retrieve a past Thursday's data, validate and build locally. It does not send email, commit, push or change the dashboard.
- `npm run weekly-email-test -- --date YYYY-MM-DD` — run the same candidate checks and send one clearly labelled test email. It does not commit, push or change the dashboard.
- `npm run weekly-rehearsal -- --date YYYY-MM-DD --branch weekly-rehearsal` — perform the publication path only on a named non-`main` test branch from a temporary worktree. It does not update GitHub Pages.
- `npm run github-connectivity-check` — perform a read-only `git ls-remote` check for `origin/main`; it does not change Git, data or the site.

### Live publication

- `npm run weekly-first-live -- --date YYYY-MM-DD --confirm-live-publication` — legacy first-live command retained in the codebase; the first publication already occurred on 17 September 2026, so it is not the normal operating command.
- `npm run weekly-update` — the normal production command intended for the activated Friday schedule. Do not use it manually before the first live publication has been completed.

Before any email command, copy `.env.example` to `.env` and set the Gmail sender, App Password and recipient locally. Never commit `.env` or paste its password into chat.

## Checkpoint valuations and dashboard behavior

The ledger records the formal Q3 valuation for 30 September 2026. Exact-date Yahoo historical Close prices and ECB FX source URLs are retained on the checkpoint in the ledger. `src/checkpoint.js` validates the complete candidate before mutation and rejects missing or earlier-date closes. This is separate from the Thursday weekly command and creates no trades. Q3 values are Lee £129,419.61, Roger £112,744.95, and Michael £87,903.18.

The timeline includes Start, Q1, Q2, Q3, and Now; checkpoint winners include Q3. Biggest winner compares each holding’s GBP percentage gain from the latest completed checkpoint with current value, including FX changes. Opening-return columns remain opening returns. The bar chart retains its 0–150k scale and marks £100k starting capital with a labelled dashed reference. Portfolio headers use two lines; the stale sign-off is removed. Initial-thesis excerpts open on player-name hover, focus, or tap, with close, Escape, and outside-click dismissal and a five-line visible limit.

## Dashboard and hosting

The dashboard is a static site hosted on GitHub Pages:

- Public site: <https://michaelgarrettbrown-collab.github.io/family-stock-challenge/>
- GitHub Pages publishes the `public` directory after approved data is pushed to `main`.
- The visible dashboard intentionally remains simple; weekly automation updates its data, not its design.

## Further documentation

- [`intent.md`](intent.md), [`spec.md`](spec.md), and [`plan.md`](plan.md) track active changes.
- [`future.md`](future.md) records retained hypotheses and deferred decisions; it is not authorization to build them.
