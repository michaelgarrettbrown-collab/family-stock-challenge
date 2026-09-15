import { createHash } from 'node:crypto';
import { buildScorecardData } from './build-scorecard-data.js';

const DAY = 24 * 60 * 60 * 1000;

export function prepareWeeklyUpdate(ledger, config, marketData, preparedAt = new Date().toISOString()) {
  const errors = validateMarketData(ledger, config, marketData);
  if (errors.length) throw new Error(`Weekly valuation validation failed:\n- ${errors.join('\n- ')}`);

  const valuation = { date: marketData.valuationDate, prices: marketData.prices.map(quote => normalizePrice(quote, marketData.valuationDate)) };
  const candidate = structuredClone(ledger);
  candidate.valuations = valuation;
  const current = buildScorecardData(candidate, config);
  const snapshot = makeSnapshot(valuation, current);
  candidate.valuations.snapshots = [...(ledger.valuations.snapshots || []), snapshot];
  const scorecard = buildScorecardData(candidate, config);
  const previous = ledger.valuations.snapshots?.at(-1);
  const changes = weeklyChanges(scorecard, previous);
  const movers = weeklyMovers(scorecard, previous);

  return {
    schemaVersion: 1,
    preparedAt,
    valuationDate: valuation.date,
    baseLedgerHash: hash(ledger),
    candidateLedger: candidate,
    scorecard,
    approvalSummary: {
      valuationDate: valuation.date,
      marketCloseExceptions: valuation.prices.filter(price => price.marketClosed).map(price => ({ instrumentId: price.instrumentId, priceDate: price.priceDate, reason: price.marketClosedReason })),
      leaderboard: scorecard.players.map(player => ({ rank: player.rank, name: player.name, value: player.value, return: player.return })),
      portfolioChanges: changes,
      biggestMovers: movers
    },
    whatsappMessage: formatWhatsApp(scorecard, movers, previous)
  };
}

export function validateMarketData(ledger, config, marketData) {
  const errors = [];
  if (!marketData || !/^\d{4}-\d{2}-\d{2}$/.test(marketData.valuationDate || '')) return ['valuationDate must be an ISO date.'];
  const valuationTime = Date.parse(`${marketData.valuationDate}T00:00:00Z`);
  if (new Date(valuationTime).getUTCDay() !== 4) errors.push(`${marketData.valuationDate} is not a Thursday.`);
  const expected = new Set(ledger.instruments.map(item => item.id));
  const prices = marketData.prices || [];
  const seen = new Set();
  const approvedPriceSources = new Set(config.weeklyUpdate?.approvedPriceSources || []);
  const approvedFxSources = new Set(config.weeklyUpdate?.approvedFxSources || []);
  const current = new Map(ledger.valuations.prices.map(item => [item.instrumentId, item]));
  for (const quote of prices) {
    if (!expected.has(quote.instrumentId)) errors.push(`${quote.instrumentId}: unknown instrument.`);
    if (seen.has(quote.instrumentId)) errors.push(`${quote.instrumentId}: duplicate quote.`);
    seen.add(quote.instrumentId);
    for (const field of ['price', 'fxToGbp']) if (!(Number(quote[field]) > 0)) errors.push(`${quote.instrumentId}: ${field} must be positive.`);
    if (!quote.priceSource?.name || !approvedPriceSources.has(quote.priceSource.name)) errors.push(`${quote.instrumentId}: price source is not approved.`);
    if (!quote.fxSource?.name || !approvedFxSources.has(quote.fxSource.name)) errors.push(`${quote.instrumentId}: FX source is not approved.`);
    if (!quote.priceSource?.url || !quote.fxSource?.url) errors.push(`${quote.instrumentId}: price and FX source URLs are required.`);
    const priceDate = quote.priceDate || marketData.valuationDate;
    const fxDate = quote.fxDate || marketData.valuationDate;
    if (quote.marketClosed) {
      if (!quote.marketClosedReason) errors.push(`${quote.instrumentId}: a market-close reason is required.`);
      if (priceDate > marketData.valuationDate) errors.push(`${quote.instrumentId}: market-close price cannot be after valuation date.`);
    } else if (priceDate !== marketData.valuationDate) errors.push(`${quote.instrumentId}: price date must be the Thursday valuation date unless the market was closed.`);
    if (fxDate !== marketData.valuationDate) errors.push(`${quote.instrumentId}: FX date must be the Thursday valuation date.`);
    const prior = current.get(quote.instrumentId);
    const maximum = config.weeklyUpdate?.plausibilityMaxChangePercent ?? 90;
    if (prior && Math.abs(Number(quote.price) / prior.price - 1) * 100 > maximum) errors.push(`${quote.instrumentId}: price move exceeds the ${maximum}% plausibility threshold.`);
  }
  for (const instrumentId of expected) if (!seen.has(instrumentId)) errors.push(`${instrumentId}: missing quote.`);
  return errors;
}

function normalizePrice(quote, valuationDate) {
  return { ...quote, price: Number(quote.price), fxToGbp: Number(quote.fxToGbp), priceDate: quote.priceDate || valuationDate, fxDate: quote.fxDate || valuationDate };
}

function makeSnapshot(valuation, scorecard) {
  return {
    date: valuation.date,
    prices: valuation.prices,
    playerValues: Object.fromEntries(scorecard.players.map(player => [player.id, player.value])),
    holdingValues: Object.fromEntries(scorecard.players.flatMap(player => player.holdings.map(holding => [`${player.id}:${holding.ticker}`, holding.value])))
  };
}

function weeklyChanges(scorecard, previous) {
  return scorecard.players.map(player => {
    const previousValue = previous?.playerValues?.[player.id];
    return { playerId: player.id, player: player.name, previousValue: previousValue ?? null, currentValue: player.value, change: previousValue == null ? null : player.value - previousValue };
  });
}

function weeklyMovers(scorecard, previous) {
  if (!previous?.holdingValues) return [];
  return scorecard.players.flatMap(player => player.holdings.map(holding => {
    const key = `${player.id}:${holding.ticker}`;
    const previousValue = previous.holdingValues[key];
    if (!(previousValue > 0)) return null;
    const change = (holding.value / previousValue - 1) * 100;
    return { player: player.name, holding: holding.name, ticker: holding.ticker, previousValue, currentValue: holding.value, change };
  })).filter(Boolean).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 2);
}

function formatWhatsApp(scorecard, movers, previous) {
  const week = isoWeek(scorecard.asOf);
  const leaderboard = scorecard.players.map(player => `${player.rank}. ${player.name} — £${Math.round(player.value).toLocaleString('en-GB')} (${signed(player.return)})`).join('\n');
  const moverLines = previous ? movers.map(mover => `• ${mover.player}: ${mover.holding} ${mover.change >= 0 ? 'up' : 'down'} ${signed(mover.change)}`).join('\n') : '• Weekly movers begin with next week\'s update.';
  return `📈 Family Stock Challenge — Week ${week}\n\n🏆 Leaderboard\n${leaderboard}\n\n🚀 This week's movers\n${moverLines}\n\nThe market has had its say — family bragging rights remain gloriously competitive.`;
}

function isoWeek(date) { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d - start) / DAY + 1) / 7); }
function signed(value) { return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`; }
function hash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function ledgerHash(ledger) { return hash(ledger); }
