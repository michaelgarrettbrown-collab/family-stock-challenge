# Family Stock Challenge — Architecture Specification

## Purpose

Evolve the scorecard into a quarterly trading game that preserves both financial history and the reasoning behind each player’s decisions. ChatGPT/Codex is the primary administration interface.

## Architecture

```text
Conversation → validated ledger change → calculated public JSON → website
                         ↓
                 Git version history

Notion → lightweight player context and appended notes
```

### Responsibilities

- **Local JSON ledger:** authoritative record of players, instruments, trades, cash, positions and checkpoint valuations.
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

## Ledger model

The source ledger must contain:

- Players and starting capital
- Instruments with company, MIC-qualified ticker, exchange and currency
- Append-only buy/sell transactions with date, quarter, quantity, execution price, FX rate and fees
- Cash movements and balances
- Immutable quarter-end portfolio and position snapshots
- Schema and calculation versions

Corrections use explicit reversal/replacement entries; historical transactions are not silently edited.

## Quarterly workflow

1. Close the quarter using the agreed prices and FX rates.
2. Save immutable valuation and position snapshots.
3. Record each approved trade through balanced ledger entries.
4. Reconstruct positions and cash from the transaction history.
5. Validate tickers, ownership, quantities, dates, currencies and portfolio totals.
6. Calculate standings and changes from the previous checkpoint.
7. Preview the dashboard and obtain approval.
8. Generate `public/scorecard-data.json`, commit and push it.
9. GitHub Pages republishes the static site.
10. Update each player’s Notion summary and append relevant commentary.

## Conversational trade control

For a request such as “Lee sold X and bought Y,” ChatGPT/Codex must show a confirmation preview before changing the ledger. It should resolve the exact instruments and show quantities, prices, FX, fees, proceeds, cost and resulting cash. Proposed or ambiguous trades are not recorded as completed trades.

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

## Adopted initial trading rules

- Trades execute at quarterly checkpoints using explicitly recorded prices and FX rates.
- Fractional shares and uninvested cash are allowed.
- Initial fees are zero and dividends are excluded.
- Short selling, deposits and withdrawals are not allowed.
- Ties share a rank and are then displayed alphabetically.
- Corrections use explicit reversal and replacement entries.
- Corporate actions require an explicit ledger entry before publication.

## Acceptance criteria

- Every published figure can be reproduced from the ledger.
- Positions and cash balance after every transaction.
- Previous checkpoints remain unchanged after later trades.
- Quarter-on-quarter changes are generated automatically.
- No Notion dependency is required to calculate or publish the game.
- A failed validation cannot overwrite the published scorecard.
