# Family Stock Challenge — Architecture Specification

## Purpose

Maintain a reproducible public scorecard for the Family Stock Challenge. Financial data is version-controlled in Git; human reasoning is kept separately in Notion. ChatGPT/Codex is the primary administration interface.

## Architecture

```text
Approved data change → validated ledger → calculated public JSON → website
                              ↓
                      Git version history

Notion → lightweight player context and appended notes
```

### Responsibilities

- **Local JSON ledger:** authoritative record of players, instruments, opening purchases, prices, cash and checkpoint valuations.
- **Calculation code:** validates transactions and derives holdings, returns, rankings and quarter-on-quarter changes.
- **Public JSON:** complete public financial game record needed by ChatGPT and the website. Fields may exist without being displayed.
- **Website:** selective presentation of current standings, holdings, history and recent changes.
- **Git/GitHub:** version-controls all code, rules, trades, valuations, financial history and specifications; provides review, rollback and manual publication through GitHub Pages.
- **Notion:** the only home for original theses, player notes and conversational commentary; not the financial system of record.

## Notion model

Keep one page per player in a single table:

- Player
- Current quarter
- Current holdings (summary)
- Last completed checkpoint value
- Original investment thesis (never overwritten)
- Player notes (dated entries appended, never replaced)
- Last updated

Notes may capture reflections, conversations, thesis changes and trade ideas. Clearly distinguish an idea from an agreed trade.

## Financial ledger

`data/game-ledger.json` contains:

- Players and starting capital
- Instruments with company, MIC-qualified ticker, exchange and currency
- Opening purchase transactions with date, quantity, execution price, FX rate and fees
- Cash movements and balances
- Immutable quarter-end portfolio and position snapshots
- Schema and calculation versions

Corrections use explicit reversal/replacement entries; historical transactions are not silently edited.

## Current update workflow

1. Update approved prices, FX rates or checkpoint values in the ledger.
2. Validate tickers, quantities, dates, currencies, cash and portfolio totals.
3. Calculate standings and changes from the previous checkpoint.
4. Preview the dashboard and obtain approval.
5. Generate `public/scorecard-data.json`, commit and push it.
6. GitHub Pages republishes the static site.
7. Update each player’s Notion summary and append relevant commentary when needed.

## Future quarterly trading

Quarterly trading is **not currently enabled**. The ledger can represent BUY and SELL transactions, but no post-opening trade may be recorded until the game rules are explicitly agreed.

When enabled, ChatGPT/Codex must show a confirmation preview before changing the ledger. It must resolve the exact instruments and show quantities, prices, FX, fees, proceeds, cost and resulting cash. Proposed or ambiguous trades are not completed trades.

## Public output

The published JSON may contain the complete financial record and should support:

- Current standings and positions
- Transaction history
- Checkpoint valuations and rank history
- Changes since the previous quarter
- Recent trades and portfolio attribution
- Reconstructing any published checkpoint

The page may show only a subset. Notion content—including original theses, player notes and conversational commentary—must not enter GitHub or public JSON unless explicitly approved. Credentials and personal information must never enter public JSON.

## Storage and recovery

- Everything except the Notion narrative content is committed to GitHub.
- Git commits provide the recoverable history for code and game data.
- Each approved quarter receives a Git tag such as `2026-q3`.
- The live site changes only after a reviewed commit is pushed.
- A bad publication is restored by reverting to a known-good commit and republishing.

## Trading decisions still required

- Execution timing and price source
- Fractional-share and cash policy
- Fees, dividends and corporate actions
- FX source and fixing date
- Short selling, deposits and withdrawals
- Tie-breaking and correction rules

## Acceptance criteria

- Every published figure can be reproduced from the ledger.
- Opening positions and cash balance from the ledger.
- Previous checkpoints remain unchanged after later updates.
- Quarter-on-quarter changes are generated automatically.
- No Notion dependency is required to calculate or publish the game.
- A failed validation cannot overwrite the published scorecard.
