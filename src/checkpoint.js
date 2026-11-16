import { reconstructPortfolio } from './ledger.js';
import { validateLedger } from './validate.js';

// Checkpoints require exact-date closes, unlike the weekly closure policy.
export function prepareCheckpoint(ledger, label, marketData) {
  const { valuationDate: date, prices } = marketData;
  if (ledger.checkpoints.some(point => point.label === label || point.date === date)) throw new Error('Checkpoint already exists.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > ledger.valuations.date) throw new Error('Invalid checkpoint date.');
  if (prices.length !== ledger.instruments.length || new Set(prices.map(p => p.instrumentId)).size !== prices.length) throw new Error('Incomplete checkpoint prices.');
  for (const instrument of ledger.instruments) {
    const quote = prices.find(p => p.instrumentId === instrument.id);
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0 || !Number.isFinite(quote.fxToGbp) || quote.fxToGbp <= 0 || quote.priceDate !== date || quote.fxDate !== date || quote.priceSource?.name !== 'Yahoo Finance' || quote.fxSource?.name !== 'ECB' || !quote.priceSource.url || !quote.fxSource.url) throw new Error(`Invalid exact-date checkpoint quote: ${instrument.id}.`);
  }
  const values = {};
  for (const player of ledger.players) {
    const historical = { ...ledger, transactions: ledger.transactions.filter(trade => trade.date <= date) };
    const { cash, positions } = reconstructPortfolio(historical, player.id);
    values[player.id] = cash + [...positions].reduce((sum, [id, position]) => {
      const quote = prices.find(p => p.instrumentId === id);
      return sum + position.quantity * quote.price * quote.fxToGbp;
    }, 0);
  }
  const candidate = structuredClone(ledger);
  candidate.checkpoints.push({ label, date, values, prices: structuredClone(prices) });
  candidate.checkpoints.sort((a, b) => a.date.localeCompare(b.date));
  const { errors } = validateLedger(candidate);
  if (errors.length) throw new Error(errors.join('\n'));
  return candidate;
}
