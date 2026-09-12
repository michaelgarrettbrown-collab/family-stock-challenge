import { readFile } from 'node:fs/promises';

export async function readLedger(path = 'data/game-ledger.json') { return JSON.parse(await readFile(path, 'utf8')); }

export function reconstructPortfolio(ledger, playerId) {
  const player = ledger.players.find(item => item.id === playerId);
  const positions = new Map();
  let cash = player.startingCapital;
  for (const trade of ledger.transactions.filter(item => item.playerId === playerId)) {
    const position = positions.get(trade.instrumentId) || { quantity:0, costBasis:0 };
    if (trade.type === 'SELL' && trade.quantity > position.quantity + 1e-9) throw new Error(`${player.name} cannot sell ${trade.quantity} units of ${trade.instrumentId}; only ${position.quantity} held.`);
    const consideration = trade.quantity * trade.price * trade.fxToGbp;
    if (trade.type === 'BUY') { position.quantity += trade.quantity; position.costBasis += consideration + trade.feesGbp; cash -= consideration + trade.feesGbp; }
    else { position.costBasis -= trade.quantity * (position.costBasis / position.quantity); position.quantity -= trade.quantity; cash += consideration - trade.feesGbp; }
    positions.set(trade.instrumentId, position);
  }
  if (cash < -0.01) throw new Error(`${player.name} has a negative cash balance of £${cash.toFixed(2)}.`);
  return { cash, positions };
}
