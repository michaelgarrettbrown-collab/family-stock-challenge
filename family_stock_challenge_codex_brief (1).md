# Family Stock Challenge — Codex Brief

## Concept

Maintain and display a simple annual family stock-picking competition.

Each player starts with the same virtual capital, chooses a small fixed portfolio at the beginning of the game, and holds it for the year. No trading occurs after inception. Dividends are ignored unless the Notion data explicitly says otherwise. Foreign holdings are valued in GBP using the relevant FX rate.

**Notion is the source of truth.** Do not duplicate historical game data, holdings, theses, opening positions, checkpoints, or current values in this project unless needed temporarily for rendering.

The LLM/agent is the interface and update mechanism; the renderer is deterministic.

## Notion

The game uses two Notion databases:

- **Portfolios** — one row per player/portfolio; contains the portfolio thesis, current value/rank and historical checkpoint results.
- **Holdings** — one row per stock; contains the portfolio relation, ticker, currency, fixed opening position, current market data and calculated holding performance.

Read these existing Notion databases to discover the current year's:

- players and portfolios
- holdings and tickers
- fixed share quantities / opening positions
- currencies
- current prices and FX
- historical checkpoints
- portfolio theses and notes
- any game-specific rules stored there

Do not rely on hard-coded player names, stocks, dates, or annual data.

When updating the game, use reliable closing market prices and same-date FX rates, calculate the valuation independently, update the appropriate current fields in Notion, then read the results back and sanity-check them.

Historical checkpoint values should be treated as audit records and not silently rewritten.

If calculated results materially conflict with Notion, investigate rather than overwriting the source of truth.

## Output

The primary output is a **WhatsApp-ready visual scorecard**.

Use a fixed HTML/CSS template rendered in a browser and exported to PNG.

Preferred output size:

```text
1080 × 1350 px
```

The visual design should remain essentially identical between updates. **Change the data, not the layout.**

Do not use generative image models for routine scorecards: visual drift makes comparison between updates harder.

Preferred pipeline:

```text
Notion
  ↓
structured scorecard data
  ↓
fixed HTML/CSS/SVG template
  ↓
browser render at 1080 × 1350
  ↓
PNG for WhatsApp
```

Keep data separate from presentation. Ideally all displayed values are populated from one JS/JSON object generated from the Notion data, rather than hard-coded repeatedly in the HTML.

## Scorecard content

The scorecard should contain:

1. **Title and valuation date**
2. **Current leaderboard** — rank, player, portfolio value and return
3. **Horizontal bar chart** comparing total portfolio values
4. **Portfolio detail** — each player's holdings with current value and return
5. **Portfolio value-over-time chart** — start, completed checkpoints and current value
6. **Biggest winning holding** — player, starting value, current value and return
7. **Checkpoint leaders** — leaders at completed quarter/year checkpoints
8. **Rules footer** — starting capital, buy-and-hold/no trading, dividend treatment and reporting currency

Only display checkpoints that actually exist in Notion.

Charts should use sensible, stable scales where possible so that visual changes between scorecards reflect real changes rather than automatic axis rescaling.

## Design

Aim for a polished but playful financial scorecard suitable for a family WhatsApp group:

- dark navy background
- strong typography
- clear leaderboard hierarchy
- restrained positive/negative indicators
- prominent charts
- readable on a phone
- visually consistent from one update to the next

Accuracy and legibility outrank decoration.

## Reuse

This project must work across years.

Do **not** encode:

- a particular year
- player names
- stock names or tickers
- opening prices
- portfolio values
- checkpoint results

in the template logic.

Those belong in Notion.

A new annual game should require updating/creating the relevant Notion records, not rewriting the renderer.

## Routine task

When asked to **update the Family Stock Challenge**, the intended workflow is:

```text
Read current game state from Notion
        ↓
Fetch and verify required market prices + FX
        ↓
Calculate and sanity-check valuations
        ↓
Update Notion
        ↓
Read back authoritative results
        ↓
Generate structured scorecard data
        ↓
Render fixed HTML at 1080 × 1350
        ↓
Export PNG
```

Return:

- the WhatsApp-ready PNG
- the HTML used to render it
- a very short text leaderboard
- any genuine data-quality warnings

Keep the implementation small and maintainable. This is a family game, not a portfolio-management system.
