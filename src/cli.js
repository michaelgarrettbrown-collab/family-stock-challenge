import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { readLedger } from './ledger.js';
import { buildScorecardData } from './build-scorecard-data.js';
import { runWeeklyUpdate } from './automatic-weekly-update.js';

const [command = 'build', ...args] = process.argv.slice(2);
const config = JSON.parse(await readFile('config/scorecard.config.json', 'utf8'));

if (command === 'weekly-update') await automaticUpdate();
else if (command === 'weekly-dry-run') await automaticUpdate(true);
else if (command === 'weekly-email-test') await automaticUpdate(false, true);
else if (command === 'weekly-rehearsal') await automaticUpdate(false, false, true);
else if (command === 'weekly-first-live') await automaticUpdate(false, false, false, true);
else if (['build', 'preview'].includes(command)) await buildCurrent();
else throw new Error(`Unknown command: ${command}`);

async function buildCurrent() {
  const scorecard = buildScorecardData(await readLedger(), config);
  const publicDirectory = process.env.SCORECARD_PUBLIC_DIR || 'public';
  const outputDirectory = process.env.SCORECARD_OUTPUT_DIR || 'output';
  const assetDirectory = process.env.SCORECARD_ASSET_DIR || 'public';
  await mkdir(publicDirectory, { recursive:true });
  await writeFile(`${publicDirectory}/scorecard-data.json`, `${JSON.stringify(scorecard, null, 2)}\n`);
  if (command === 'preview') {
    console.log(JSON.stringify({ asOf: scorecard.asOf, leaderboard: leaderboard(scorecard), warnings: scorecard.warnings }, null, 2));
    return;
  }
  await mkdir(outputDirectory, { recursive:true });
  const stem = `family-stock-challenge-${scorecard.asOf}`;
  await copyFile(`${assetDirectory}/index.html`, `${outputDirectory}/${stem}.html`);
  await copyFile(`${publicDirectory}/scorecard-data.json`, `${outputDirectory}/${stem}.json`);
  console.log(`Built ${publicDirectory}/scorecard-data.json and ${outputDirectory}/${stem}.{html,json}`);
}

async function automaticUpdate(dryRun = false, emailTest = false, rehearsal = false, firstLive = false) {
  const result = await runWeeklyUpdate({ date: option('--date'), dryRun, emailTest, rehearsal, firstLive, confirmed: args.includes('--confirm-live-publication'), branch: option('--branch') });
  console.log(JSON.stringify(result, null, 2));
}

function option(name) { const index = args.indexOf(name); return index === -1 ? undefined : args[index + 1]; }
function leaderboard(scorecard) { return scorecard.players.map(player => ({ rank: player.rank, player: player.name, value: Math.round(player.value), return: Number(player.return.toFixed(1)) })); }
