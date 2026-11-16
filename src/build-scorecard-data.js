import { reconstructPortfolio } from './ledger.js';
import { rankPlayers } from './valuation.js';
import { validateLedger } from './validate.js';

const COLORS = ['green', 'blue', 'red', 'gold', 'purple'];

export function buildScorecardData(ledger, config) {
  const { errors, warnings } = validateLedger(ledger);
  if (errors.length) throw new Error(`Ledger validation failed:\n- ${errors.join('\n- ')}`);
  const previous = ledger.checkpoints.filter(point => point.date <= ledger.valuations.date).at(-1);
  const checkpointPrices = new Map((previous?.prices || []).map(quote => [quote.instrumentId, quote]));
  const instruments = new Map(ledger.instruments.map(item => [item.id, item]));
  const prices = new Map(ledger.valuations.prices.map(item => [item.instrumentId, item]));
  const calculated = ledger.players.map(player => {
    const { cash, positions } = reconstructPortfolio(ledger, player.id);
    const holdings = [...positions.entries()].filter(([, p]) => p.quantity > 1e-9).map(([instrumentId, position]) => {
      const instrument = instruments.get(instrumentId), quote = prices.get(instrumentId);
      const value = position.quantity * quote.price * quote.fxToGbp;
      const baseline = checkpointPrices.get(instrumentId);
      const checkpointValue = baseline ? position.quantity * baseline.price * baseline.fxToGbp : undefined;
      return { instrumentId, checkpointValue, checkpointReturn: baseline ? ((value / checkpointValue) - 1) * 100 : undefined, name:displayName(instrument.name), fullName:instrument.name, ticker:instrument.ticker, currency:instrument.currency, quantity:position.quantity, value, costBasis:position.costBasis, return:((value/position.costBasis)-1)*100, startValue:position.costBasis };
    });
    const value = cash + holdings.reduce((sum, holding) => sum + holding.value, 0);
    return { id:player.id, name:player.name, publicThesis:config.publicTheses?.[player.id], value, cash, return:((value/player.startingCapital)-1)*100, startValue:player.startingCapital, holdings, checkpoints:[{label:'Start',value:player.startingCapital}, ...ledger.checkpoints.map(point => ({label:point.label,value:point.values[player.id]}))] };
  });
  const players = rankPlayers(calculated).map((player,index) => ({...player,color:COLORS[index%COLORS.length]}));
  const checkpointLeaders = ledger.checkpoints.map(point => ({ label:point.label, name:[...ledger.players].sort((a,b)=>point.values[b.id]-point.values[a.id])[0].name, date:shortDate(point.date) }));
  checkpointLeaders.push({label:'Now',name:players[0].name,date:shortDate(ledger.valuations.date)});
  const allHoldings = players.flatMap(player => player.holdings.map(holding => ({...holding,player:player.name})));
  const biggestWinner = allHoldings.filter(holding => Number.isFinite(holding.checkpointReturn)).sort((a,b)=>b.checkpointReturn-a.checkpointReturn)[0];
  return { schemaVersion:2, calculationVersion:ledger.calculationVersion, title:ledger.game.title, year:Number(ledger.game.startDate.slice(0,4)), asOf:ledger.valuations.date, reportingCurrency:ledger.game.reportingCurrency, rules:config.game.rules, tradingRules:ledger.game.tradingRules, chart:config.chart, players, timelineLabels:[{label:'Start',date:ledger.game.startDate},...ledger.checkpoints.map(p=>({label:p.label,date:p.date})),{label:'Now',date:ledger.valuations.date}], checkpointLeaders, biggestWinner:biggestWinner ? {...biggestWinner,startValue:biggestWinner.checkpointValue,return:biggestWinner.checkpointReturn,since:previous.date,checkpoint:previous.label} : null, transactions:ledger.transactions, checkpoints:ledger.checkpoints, changesSincePreviousCheckpoint:players.map(player=>({playerId:player.id,player:player.name,previousValue:previous.values[player.id],currentValue:player.value,change:player.value-previous.values[player.id]})), warnings };
}

function shortDate(iso){ return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(`${iso}T00:00:00Z`)); }
function displayName(name){ return ({'Andrada Mining':'Andrada','Charter Communications':'Charter'})[name]||name; }
