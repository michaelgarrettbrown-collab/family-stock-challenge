export function validateLedger(ledger) {
  const errors=[], warnings=[];
  const unique=(items,label)=>{ const ids=items.map(item=>item.id); if(new Set(ids).size!==ids.length) errors.push(`${label} IDs must be unique.`); };
  if(!ledger.schemaVersion||!ledger.calculationVersion) errors.push('Ledger versions are required.');
  unique(ledger.players||[],'Player'); unique(ledger.instruments||[],'Instrument'); unique(ledger.transactions||[],'Transaction');
  const playerIds=new Set(ledger.players.map(item=>item.id)), instrumentIds=new Set(ledger.instruments.map(item=>item.id)), priceIds=new Set(ledger.valuations.prices.map(item=>item.instrumentId));
  for(const trade of ledger.transactions){
    if(!playerIds.has(trade.playerId)) errors.push(`${trade.id}: unknown player.`);
    if(!instrumentIds.has(trade.instrumentId)) errors.push(`${trade.id}: unknown instrument.`);
    if(!['BUY','SELL'].includes(trade.type)) errors.push(`${trade.id}: type must be BUY or SELL.`);
    for(const field of ['quantity','price','fxToGbp']) if(!(Number(trade[field])>0)) errors.push(`${trade.id}: ${field} must be positive.`);
    if(Number(trade.feesGbp)<0) errors.push(`${trade.id}: fees cannot be negative.`);
  }
  for(const instrument of ledger.instruments){ if(!/^[A-Z0-9]{4}:.+/.test(instrument.ticker)) errors.push(`${instrument.name}: ticker must include a MIC prefix.`); if(!priceIds.has(instrument.id)) warnings.push(`${instrument.name}: no current valuation price.`); }
  for(const point of ledger.checkpoints) for(const id of playerIds) if(!Number.isFinite(point.values[id])) errors.push(`${point.label}: missing value for ${id}.`);
  const snapshots=ledger.valuations.snapshots||[];
  for(const snapshot of snapshots){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date||'')) errors.push('Weekly snapshot: date must be an ISO date.');
    const snapshotPrices=new Map((snapshot.prices||[]).map(item=>[item.instrumentId,item]));
    for(const instrument of ledger.instruments){
      const quote=snapshotPrices.get(instrument.id);
      if(!quote) { errors.push(`Weekly snapshot ${snapshot.date}: missing ${instrument.id} quote.`); continue; }
      if(!(Number(quote.price)>0) || !(Number(quote.fxToGbp)>0)) errors.push(`Weekly snapshot ${snapshot.date}: invalid ${instrument.id} price or FX rate.`);
      if(!quote.priceDate || !quote.fxDate || !quote.priceSource?.name || !quote.priceSource?.url || !quote.fxSource?.name || !quote.fxSource?.url) errors.push(`Weekly snapshot ${snapshot.date}: incomplete source record for ${instrument.id}.`);
    }
    for(const id of playerIds) if(!Number.isFinite(snapshot.playerValues?.[id])) errors.push(`Weekly snapshot ${snapshot.date}: missing ${id} portfolio value.`);
  }
  if(snapshots.length && snapshots.at(-1).date!==ledger.valuations.date) errors.push('Current valuation must match the latest weekly snapshot date.');
  return {errors,warnings};
}
