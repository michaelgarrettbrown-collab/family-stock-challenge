import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { readLedger } from './ledger.js';
import { buildScorecardData } from './build-scorecard-data.js';

const command = process.argv[2] || 'build';
if (!['build', 'preview'].includes(command)) throw new Error(`Unknown command: ${command}`);

const config = JSON.parse(await readFile('config/scorecard.config.json', 'utf8'));
const scorecard = buildScorecardData(await readLedger(), config);

await mkdir('public', { recursive:true });
await writeFile('public/scorecard-data.json', `${JSON.stringify(scorecard, null, 2)}\n`);

if (command === 'preview') {
  console.log(JSON.stringify({
    asOf: scorecard.asOf,
    leaderboard: scorecard.players.map(p => ({ rank:p.rank, player:p.name, value:Math.round(p.value), return:Number(p.return.toFixed(1)) })),
    warnings: scorecard.warnings
  }, null, 2));
} else {
  await mkdir('output', { recursive:true });
  const stem = `family-stock-challenge-${scorecard.asOf}`;
  await copyFile('public/index.html', `output/${stem}.html`);
  await copyFile('public/scorecard-data.json', `output/${stem}.json`);
  console.log(`Built public/scorecard-data.json and output/${stem}.{html,json}`);
}
