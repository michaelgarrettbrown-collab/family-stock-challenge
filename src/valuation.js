export function calculateHolding(row) {
  const allocation = number(row['Starting Allocation (£)']);
  const openingPrice = number(row['Opening Price']);
  const openingFx = number(row['Opening FX to GBP']);
  const currentPrice = number(row['Current Price']);
  const currentFx = number(row['Current FX to GBP']);
  const shares = allocation / (openingPrice * openingFx);
  const value = shares * currentPrice * currentFx;
  return {
    shares,
    value,
    return: ((value / allocation) - 1) * 100,
    gainLoss: value - allocation
  };
}

export function rankPlayers(players) {
  const sorted = [...players].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  let lastValue;
  let lastRank = 0;
  return sorted.map((player, index) => {
    const rank = player.value === lastValue ? lastRank : index + 1;
    lastValue = player.value;
    lastRank = rank;
    return { ...player, rank };
  });
}

export function number(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Expected a number, received ${value}`);
  return parsed;
}
