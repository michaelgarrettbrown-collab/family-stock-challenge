import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readLedger, reconstructPortfolio } from '../src/ledger.js';
import { buildScorecardData } from '../src/build-scorecard-data.js';
import { prepareWeeklyUpdate } from '../src/weekly-update.js';
import { collectThursdayMarketData, parseEcbCsv, validateYahooMapping } from '../src/market-data.js';
import { sendWithRetry } from '../src/automatic-weekly-update.js';

test('the current ledger produces a complete, internally consistent scorecard', async () => {
  const config=JSON.parse(await readFile('config/scorecard.config.json','utf8'));
  const ledger=await readLedger(), result=buildScorecardData(ledger,config);
  assert.equal(result.asOf, ledger.valuations.date);
  assert.equal(result.players.length, ledger.players.length);
  assert.deepEqual(result.players.map(player => player.rank), [1, 2, 3]);
  for(const player of result.players) {
    assert.ok(Number.isFinite(player.value));
    assert.ok(Number.isFinite(player.return));
    assert.ok(player.holdings.every(holding => Number.isFinite(holding.value)));
  }
  for(const player of ledger.players) assert.ok(Math.abs(reconstructPortfolio(ledger,player.id).cash)<0.01);
  assert.equal(result.checkpointLeaders.at(-1).name, result.players[0].name);
  assert.deepEqual(result.warnings,[]);
  assert.equal(result.transactions.length,9);
  assert.equal(result.schemaVersion,2);
  for(const snapshot of ledger.valuations.snapshots||[]) for(const player of result.players) assert.ok(Number.isFinite(snapshot.playerValues[player.id]));
});

test('ledger rejects a sale larger than the position held', async () => {
  const ledger=await readLedger();
  ledger.transactions.push({id:'invalid-sale',date:'2026-09-30',quarter:'Q3',playerId:'lee',instrumentId:'chevron',type:'SELL',quantity:999999,price:214.06,fxToGbp:0.7402,feesGbp:0});
  assert.throws(()=>reconstructPortfolio(ledger,'lee'),/cannot sell/);
});

test('a complete Thursday valuation prepares a reproducible first weekly snapshot', async () => {
  const config = JSON.parse(await readFile('config/scorecard.config.json', 'utf8'));
  config.weeklyUpdate.approvedPriceSources = ['Exchange close'];
  config.weeklyUpdate.approvedFxSources = ['FX close'];
  const ledger = await readLedger();
  const priorSnapshotCount = ledger.valuations.snapshots?.length || 0;
  const valuationDate = nextThursday(ledger.valuations.date);
  const marketData = quotesFor(ledger, valuationDate);
  const prepared = prepareWeeklyUpdate(ledger, config, marketData, '2026-09-18T08:00:00.000Z');

  assert.equal(prepared.valuationDate, valuationDate);
  assert.equal(prepared.candidateLedger.valuations.snapshots.length, priorSnapshotCount + 1);
  assert.equal(prepared.candidateLedger.valuations.snapshots.at(-1).prices.length, ledger.instruments.length);
  if (priorSnapshotCount === 0) {
    assert.deepEqual(prepared.approvalSummary.portfolioChanges.map(change => change.change), [null, null, null]);
    assert.deepEqual(prepared.approvalSummary.biggestMovers, []);
  } else {
    assert.ok(prepared.approvalSummary.portfolioChanges.every(change => Number.isFinite(change.change)));
  }
  assert.match(prepared.whatsappMessage, new RegExp(`Week ${isoWeek(valuationDate)}`));
});

test('weekly preparation rejects an incomplete or unapproved price run without changing the ledger', async () => {
  const config = JSON.parse(await readFile('config/scorecard.config.json', 'utf8'));
  config.weeklyUpdate.approvedPriceSources = ['Exchange close'];
  config.weeklyUpdate.approvedFxSources = ['FX close'];
  const ledger = await readLedger();
  const original = structuredClone(ledger);
  const marketData = quotesFor(ledger, '2026-09-17');
  marketData.prices.pop();
  marketData.prices[0].priceSource.name = 'Unapproved source';

  assert.throws(() => prepareWeeklyUpdate(ledger, config, marketData), /not approved[\s\S]*missing quote/);
  assert.deepEqual(ledger, original);
});

function quotesFor(ledger, date) {
  return {
    valuationDate: date,
    prices: ledger.valuations.prices.map(quote => ({
      instrumentId: quote.instrumentId,
      price: quote.price,
      fxToGbp: quote.fxToGbp,
      priceDate: date,
      fxDate: date,
      priceSource: { name: 'Exchange close', url: `https://prices.example/${quote.instrumentId}` },
      fxSource: { name: 'FX close', url: 'https://fx.example/gbp' }
    }))
  };
}

function nextThursday(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const days = (4 - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoWeek(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86_400_000 + 1) / 7);
}

test('Yahoo Close collection converts LSE pence and uses ECB FX cross rates', async () => {
  const ledger = await readLedger();
  const mapping = { instruments: ledger.instruments.map(instrument => ({ instrumentId: instrument.id, ledgerTicker: instrument.ticker, yahooTicker: instrument.id, exchange: instrument.exchange, currency: instrument.currency })) };
  const thursday = '2026-09-17';
  const collected = await collectThursdayMarketData(ledger, mapping, thursday, async url => {
    if (url.includes('data-api.ecb')) return { ok: true, text: async () => 'CURRENCY,TIME_PERIOD,OBS_VALUE\nUSD,2026-09-17,1.2\nKRW,2026-09-17,1700\nGBP,2026-09-17,0.86\n' };
    return { ok: true, json: async () => ({ chart: { result: [{ timestamp: [Date.parse(`${thursday}T00:00:00Z`) / 1000], indicators: { quote: [{ close: [1234] }] } }] } }) };
  });
  assert.equal(collected.prices.find(price => price.instrumentId === 'experian').price, 12.34);
  assert.equal(collected.prices.find(price => price.instrumentId === 'servicenow').fxToGbp, 0.86 / 1.2);
  assert.equal(collected.prices.find(price => price.instrumentId === 'sk-hynix').fxToGbp, 0.86 / 1700);
  assert.equal(collected.prices.every(price => price.priceSource.name === 'Yahoo Finance' && price.fxSource.name === 'ECB'), true);
});

test('market-data parsing and mapping reject missing records', async () => {
  const ledger = await readLedger();
  assert.deepEqual(parseEcbCsv('CURRENCY,TIME_PERIOD,OBS_VALUE\nUSD,2026-09-17,1.2\n', '2026-09-17'), { USD: 1.2 });
  assert.match(validateYahooMapping(ledger, { instruments: [] }).join('\n'), /missing Yahoo ticker mapping/);
});

test('post-publication email gets one retry', async () => {
  let attempts = 0;
  await sendWithRetry({}, 'subject', 'body', async () => { attempts += 1; if (attempts === 1) throw new Error('temporary Gmail failure'); });
  assert.equal(attempts, 2);
});
