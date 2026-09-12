# Family Stock Challenge — Historical Consistency Audit

Audit date: 12 September 2026  
Scope: Notion Portfolios and Holdings databases  
Mode: Read-only; no historical checkpoint fields changed

## Executive result

- All nine holdings relate to exactly one of the three portfolios, and both sides of every relation agree.
- Starting allocations sum to £100,000 for every portfolio.
- Q1 and Q2 ranks stored in Notion agree with the independently reconstructed ordering.
- Current values recalculate consistently from opening allocation, opening price/FX, and current price/FX.
- After the separately approved Unilever correction, Roger's current calculated value is £105,484.21 and current return is +5.48%. Rank remains second.
- Historical checkpoint totals cannot yet be treated as fully reproducible audit records because Notion does not store checkpoint-level holding prices, FX rates, effective dates, price units, or sources.
- Indicative independent reconstructions differ from Notion by £14.88–£538.98. These are too large for rounding but small enough to plausibly arise from different intraday/closing prices, FX conventions, and illiquid-stock marks. No historical rewrite is recommended without recovering or standardising the original checkpoint inputs.

## Cross-table checks

| Check | Result |
|---|---|
| Nine holdings, three portfolios | Pass |
| Exactly one portfolio relation per holding | Pass |
| Reverse portfolio relations contain the same holdings | Pass |
| Starting allocations sum to portfolio starting value | Pass |
| Current formulas reproduce holding values | Pass |
| Current portfolio ranking after Unilever correction | Pass: Lee, Roger, Michael |
| Q1 ranks agree with reconstructed ordering | Pass: Michael, Lee, Roger |
| Q2 ranks agree with reconstructed ordering | Pass: Lee, Roger, Michael |
| One common current price date | Pass: 11 September 2026 |
| Exchange-qualified tickers | Pass |
| Reproducible historical checkpoint inputs | Fail: inputs absent from Notion |

## Current reconstruction

| Player | Calculated current value | Return | Rank |
|---|---:|---:|---:|
| Lee | £132,345.90 | +32.35% | 1 |
| Roger | £105,484.21 | +5.48% | 2 |
| Michael | £95,495.40 | −4.50% | 3 |

The only difference from the previously rendered card is the approved Unilever price correction from £53.12 to £45.515.

## Indicative Q1 reconciliation

Checkpoint date: 31 March 2026.

| Player | Notion value | Independent reconstruction | Difference (reconstruction − Notion) | Rank check |
|---|---:|---:|---:|---|
| Michael | £98,619.70 | £98,749.08 | +£129.38 | Pass |
| Lee | £97,392.30 | £97,253.64 | −£138.66 | Pass |
| Roger | £88,144.89 | £88,683.87 | +£538.98 | Pass |

Indicative inputs include: Experian £26.09; AstraZeneca £147.48; Unilever £41.99; Rheinmetall €1,444.50; ServiceNow $104.55; Charter $215.88; SK Hynix ₩807,000; Chevron $206.90; Andrada approximately 3.05p; USD/GBP approximately 1/1.3244; EUR/GBP 0.86833; KRW/GBP 0.0005026.

## Indicative Q2 reconciliation

Checkpoint date: 30 June 2026.

| Player | Notion value | Independent reconstruction | Difference (reconstruction − Notion) | Rank check |
|---|---:|---:|---:|---|
| Lee | £144,924.57 | £145,136.18 | +£211.61 | Pass |
| Roger | £96,034.43 | £95,762.60 | −£271.83 | Pass |
| Michael | £83,988.25 | £83,973.37 | −£14.88 | Pass |

Indicative inputs include: Experian £25.43; AstraZeneca approximately £141.51; Unilever £45.24; Rheinmetall €990.50; ServiceNow $99.28; Charter $142.21; SK Hynix ₩2,650,000; Chevron $165.76; Andrada approximately 3.85p; USD/GBP approximately 1/1.3254; EUR/GBP 0.86136; KRW/GBP 0.0004880.

## Evidence and data-quality notes

- London-listed prices are quoted in GBX by the exchange and must be divided by 100 before being stored as GBP. The earlier Unilever error came from accepting the Amsterdam euro quote as a London sterling quote.
- ServiceNow historical prices are split-adjusted and match the scale of the Notion opening price.
- Andrada is relatively illiquid; daily close, last trade, bid/offer midpoint, and monthly history can differ materially. This is the largest likely contributor to Roger's Q1 variance.
- FX sources publish reference rates, daily closes, and intraday rates that differ slightly. Notion does not identify which convention was used for Q1/Q2.
- The Q1/Q2 portfolio values and ranks are manually stored fields. The Holdings database contains no Q1/Q2 prices or FX values from which those totals can be reproduced.

Key sources:

- London Stock Exchange Unilever listing: https://www.londonstockexchange.com/stock/ULVR/unilever-plc/company-page?lang=en
- Experian historical lookup: https://www.experianplc.com/investors/shareholders/share-price/historical-lookup
- AstraZeneca London history: https://stockanalysis.com/quote/lon/AZN/history/
- Unilever London history: https://www.trading212.com/trading-instruments/cfd/ULVR.GB
- Andrada AIM history: https://stockanalysis.com/quote/aim/ATM/history/
- Rheinmetall history: https://closelook.net/de/indices/stock/rhm.de/price-history/
- ServiceNow history: https://ca.finance.yahoo.com/quote/NOW/history/
- Charter history: https://chartexchange.com/symbol/nasdaq-chtr/historical/
- SK Hynix history: https://ca.finance.yahoo.com/quote/000660.KS/history/
- Chevron history: https://ca.finance.yahoo.com/quote/CVX/history/
- ECB 31 March reference rates: https://www.ecb.europa.eu/stats/exchange/eurofxref/shared/pdf/2026/03/20260331.pdf
- KRW/GBP history: https://www.exchange-rates.org/exchange-rate-history/krw-gbp

## Correction proposal

Do not overwrite Q1 or Q2 values yet. First add or otherwise preserve, for every completed checkpoint and holding:

- Effective price date
- Raw closing price
- Quote currency and price unit
- Price-to-major-unit multiplier
- FX-to-GBP rate and convention
- Source URL/provider
- Calculated GBP holding value

Then recalculate portfolio totals from those records. Only differences that remain after using one explicit price and FX convention should be written back to the Portfolios database, with an audit note retaining the old value.

No historical Notion fields were changed during this audit.
