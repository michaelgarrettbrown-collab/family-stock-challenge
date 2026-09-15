const DAY = 86_400_000;
const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const ECB_URL = 'https://data-api.ecb.europa.eu/service/data/EXR';

export async function collectThursdayMarketData(ledger, mapping, valuationDate, fetchImpl = fetch) {
  const mappingErrors = validateYahooMapping(ledger, mapping);
  if (mappingErrors.length) throw new Error(`Ticker mapping validation failed:\n- ${mappingErrors.join('\n- ')}`);
  const fx = await collectEcbFx(valuationDate, fetchImpl);
  const mapped = new Map(mapping.instruments.map(item => [item.instrumentId, item]));
  const prices = await Promise.all(ledger.instruments.map(async instrument => {
    const item = mapped.get(instrument.id);
    const close = await collectYahooClose(item, valuationDate, fetchImpl);
    return {
      instrumentId: instrument.id,
      price: item.exchange === 'LSE' ? close.value / 100 : close.value,
      fxToGbp: fx[instrument.currency],
      priceDate: close.date,
      fxDate: valuationDate,
      marketClosed: close.date !== valuationDate,
      ...(close.date === valuationDate ? {} : { marketClosedReason: `Yahoo Finance has no Close for ${valuationDate}; used the most recent available Close from ${close.date}.` }),
      priceSource: { name: 'Yahoo Finance', url: close.url },
      fxSource: { name: 'ECB', url: fx.url }
    };
  }));
  return { valuationDate, prices };
}

export function validateYahooMapping(ledger, mapping) {
  const errors = [];
  const records = mapping?.instruments || [];
  const byId = new Map(records.map(item => [item.instrumentId, item]));
  if (byId.size !== records.length) errors.push('Yahoo ticker mapping contains duplicate instrument IDs.');
  for (const instrument of ledger.instruments) {
    const item = byId.get(instrument.id);
    if (!item) { errors.push(`${instrument.id}: missing Yahoo ticker mapping.`); continue; }
    for (const field of ['ledgerTicker', 'yahooTicker', 'exchange', 'currency']) if (!item[field]) errors.push(`${instrument.id}: ${field} is required.`);
    if (item.ledgerTicker !== instrument.ticker) errors.push(`${instrument.id}: mapped ledger ticker does not match.`);
    if (item.exchange !== instrument.exchange) errors.push(`${instrument.id}: mapped exchange does not match.`);
    if (item.currency !== instrument.currency) errors.push(`${instrument.id}: mapped currency does not match.`);
  }
  for (const item of records) if (!ledger.instruments.some(instrument => instrument.id === item.instrumentId)) errors.push(`${item.instrumentId}: mapping refers to an unknown instrument.`);
  return errors;
}

async function collectYahooClose(item, valuationDate, fetchImpl) {
  const start = Date.parse(`${valuationDate}T00:00:00Z`) - 7 * DAY;
  const end = Date.parse(`${valuationDate}T00:00:00Z`) + DAY;
  const url = `${YAHOO_URL}/${encodeURIComponent(item.yahooTicker)}?period1=${Math.floor(start / 1000)}&period2=${Math.floor(end / 1000)}&interval=1d&events=history`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`${item.instrumentId}: Yahoo Finance request failed (${response.status}).`);
  const body = await response.json();
  const result = body.chart?.result?.[0];
  if (!result?.timestamp || !result.indicators?.quote?.[0]?.close) throw new Error(`${item.instrumentId}: Yahoo Finance returned no daily Close data.`);
  const rows = result.timestamp.map((timestamp, index) => ({ date: new Date(timestamp * 1000).toISOString().slice(0, 10), value: result.indicators.quote[0].close[index] }))
    .filter(row => row.date <= valuationDate && Number.isFinite(row.value));
  const close = rows.at(-1);
  if (!close) throw new Error(`${item.instrumentId}: Yahoo Finance returned no Close on or before ${valuationDate}.`);
  return { ...close, url };
}

async function collectEcbFx(valuationDate, fetchImpl) {
  const url = `${ECB_URL}/D.USD+KRW+GBP.EUR.SP00.A?startPeriod=${valuationDate}&endPeriod=${valuationDate}&format=csvdata`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`ECB FX request failed (${response.status}).`);
  const text = await response.text();
  const values = parseEcbCsv(text, valuationDate);
  for (const currency of ['USD', 'KRW', 'GBP']) if (!(values[currency] > 0)) throw new Error(`ECB returned no ${currency} reference rate for ${valuationDate}.`);
  return { GBP: 1, EUR: values.GBP, USD: values.GBP / values.USD, KRW: values.GBP / values.KRW, url };
}

export function parseEcbCsv(text, valuationDate) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split(',').map(value => value.replace(/^"|"$/g, ''));
  const index = Object.fromEntries(columns.map((name, position) => [name, position]));
  const values = {};
  for (const line of lines) {
    const fields = splitCsv(line);
    if (fields[index.TIME_PERIOD] !== valuationDate) continue;
    const currency = fields[index.CURRENCY];
    const value = Number(fields[index.OBS_VALUE]);
    if (currency && Number.isFinite(value)) values[currency] = value;
  }
  return values;
}

function splitCsv(line) {
  const fields = []; let value = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted; }
    else if (character === ',' && !quoted) { fields.push(value); value = ''; }
    else value += character;
  }
  fields.push(value);
  return fields;
}
