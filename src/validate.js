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
  return {errors,warnings};
}
