# Family Stock Challenge

The dynamic scorecard is generated from a version-controlled financial ledger. Notion holds only the human narrative: original theses and appended player notes.

## Refresh workflow

1. Update `data/game-ledger.json` with approved prices, checkpoints or confirmed trades.
2. Run `npm test` and `npm run preview` to validate balances and reconcile the leaderboard.
3. Run `npm run build` to create `public/scorecard-data.json` and dated delivery inputs.
4. Run `npm run serve`, then open `http://127.0.0.1:8766/`.

The page never receives a Notion credential or narrative content. The generated public JSON contains the financial ledger and calculated output.

## Commands

- `npm run preview` — validate the ledger and print the calculated leaderboard.
- `npm test` — reconcile the current Notion snapshot with the approved September scorecard.
- `npm run build` — generate the JSON contract and dated HTML/JSON delivery inputs.
- `npm run serve` — serve the dynamic scorecard locally.

The ledger supports append-only BUY and SELL transactions, cash balances, weighted cost basis, checkpoint history and current price/FX valuations.

## Manual JSON publishing with GitHub Pages

The workflow in `.github/workflows/publish.yml` publishes the static `public` directory whenever an approved change is pushed. It can also be run manually from the repository's Actions tab.

1. Update the approved financial data in `data/game-ledger.json`.
2. Run `npm test`, `npm run build`, and inspect the local page.
3. Commit the updated `public/scorecard-data.json` and push it to `main`.
4. GitHub Pages republishes the scorecard automatically.

Original theses, player notes and conversational commentary remain in Notion and are not stored on GitHub.
