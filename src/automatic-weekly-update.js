import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { readLedger } from './ledger.js';
import { collectThursdayMarketData } from './market-data.js';
import { prepareWeeklyUpdate } from './weekly-update.js';
import { emailConfig, formatWeeklyEmail, loadEnv, sendGmail, verifyGmail } from './email.js';

export async function runWeeklyUpdate(options = {}) {
  let pushed = false;
  const valuationDate = options.date || priorThursday();
  const runDirectory = `output/weekly-runs/${valuationDate}-${Date.now()}`;
  await mkdir(runDirectory, { recursive: true });
  try { return await performWeeklyUpdate({ ...options, valuationDate, runDirectory }, () => { pushed = true; }); }
  catch (error) { await writeFile(`${runDirectory}/failure.txt`, `${error.message}\n`); if (!pushed && !options.dryRun) await failureEmail(error.message); throw error; }
}

async function performWeeklyUpdate({ date, valuationDate, runDirectory, dryRun = false, emailTest = false, rehearsal = false, firstLive = false, confirmed = false, branch, fetchImpl = fetch } = {}, markPushed) {
  if (!date && !isFridayInMadrid()) throw new Error('Automatic weekly update may run only on Friday Europe/Madrid. Use --date YYYY-MM-DD for a recovery or dry run.');
  if (new Date(`${valuationDate}T00:00:00Z`).getUTCDay() !== 4) throw new Error('Valuation date must be a Thursday.');
  const [ledger, config, mapping] = await Promise.all([readLedger(), json('config/scorecard.config.json'), json('config/yahoo-tickers.json')]);
  const prepared = prepareWeeklyUpdate(ledger, config, await collectThursdayMarketData(ledger, mapping, valuationDate, fetchImpl));
  await writeFile(`${runDirectory}/run-record.json`, `${JSON.stringify({ mode: emailTest ? 'email-test' : rehearsal ? 'rehearsal' : dryRun ? 'dry-run' : 'production', valuationDate, marketData: prepared.candidateLedger.valuations, summary: prepared.approvalSummary }, null, 2)}\n`);
  await writeFile(`${runDirectory}/email.txt`, `${formatWeeklyEmail(prepared.whatsappMessage, !dryRun && !emailTest)}\n`);
  await preflight(prepared.candidateLedger, runDirectory);
  if (dryRun) return { mode: 'dry-run', valuationDate, wrote: false, runDirectory };
  if (emailTest) { await sendGmail(await gmail(), 'TEST — Family Stock Challenge weekly update', formatWeeklyEmail(prepared.whatsappMessage, false)); return { mode: 'email-test', valuationDate, wrote: false, runDirectory }; }
  if (rehearsal) return rehearse(prepared, valuationDate, runDirectory, branch);
  if (firstLive && !confirmed) throw new Error('First live run is a real publication to main and GitHub Pages. Re-run only after Michael explicitly confirms with --confirm-live-publication.');
  const mail = await gmail(); await verifyGmail(mail);
  const oldLedger = await readFile('data/game-ledger.json', 'utf8'); const oldPublic = await readFile('public/scorecard-data.json', 'utf8');
  let pushed = false;
  try {
    await writeFile('data/game-ledger.json', `${JSON.stringify(prepared.candidateLedger, null, 2)}\n`);
    await copyFile(`${runDirectory}/public/scorecard-data.json`, 'public/scorecard-data.json');
    await run('git', ['commit', '--only', '-m', `Publish weekly scorecard ${valuationDate}`, '--', 'data/game-ledger.json', 'public/scorecard-data.json']);
    const commit = (await capture('git', ['rev-parse', 'HEAD'])).trim();
    await run('git', ['push', 'origin', 'main']);
    pushed = true; markPushed();
    try { await sendWithRetry(mail, 'Family Stock Challenge — weekly update published', formatWeeklyEmail(prepared.whatsappMessage, true)); }
    catch (error) { await writeFile(`${runDirectory}/notification-failure.txt`, `${error.message}\n`); throw new Error(`Published ${commit}, but Gmail notification failed: ${error.message}`); }
    return { mode: 'production', valuationDate, wrote: true, commit, site: 'https://michaelgarrettbrown-collab.github.io/family-stock-challenge/' };
  } catch (error) {
    if (!pushed) await Promise.all([writeFile('data/game-ledger.json', oldLedger), writeFile('public/scorecard-data.json', oldPublic)]);
    throw error;
  }
}

async function rehearse(prepared, valuationDate, runDirectory, branch) {
  if (!branch || branch === 'main') throw new Error('Rehearsal requires --branch <test-branch>, never main.');
  const worktree = `${runDirectory}/worktree`;
  await run('git', ['worktree', 'add', '--detach', worktree, 'HEAD']);
  try {
    await run('git', ['switch', '-C', branch], {}, worktree);
    await writeFile(`${worktree}/data/game-ledger.json`, `${JSON.stringify(prepared.candidateLedger, null, 2)}\n`);
    await copyFile(`${runDirectory}/public/scorecard-data.json`, `${worktree}/public/scorecard-data.json`);
    await run('git', ['commit', '--only', '-m', `Rehearse weekly scorecard ${valuationDate}`, '--', 'data/game-ledger.json', 'public/scorecard-data.json'], {}, worktree);
    const commit = (await capture('git', ['rev-parse', 'HEAD'], worktree)).trim();
    await run('git', ['push', 'origin', `HEAD:refs/heads/${branch}`], {}, worktree);
    return { mode: 'rehearsal', valuationDate, wrote: true, pushed: true, branch, commit, runDirectory };
  } finally { await run('git', ['worktree', 'remove', '--force', worktree]).catch(() => {}); }
}

async function preflight(candidateLedger, directory) {
  const ledgerPath = `${directory}/game-ledger.json`; await writeFile(ledgerPath, `${JSON.stringify(candidateLedger, null, 2)}\n`);
  const environment = { LEDGER_PATH: ledgerPath, SCORECARD_PUBLIC_DIR: `${directory}/public`, SCORECARD_OUTPUT_DIR: `${directory}/delivery` };
  await run('npm', ['test'], environment); await run('npm', ['run', 'build'], environment);
}
async function gmail() { const local = await readFile('.env', 'utf8').catch(() => ''); return emailConfig({ ...process.env, ...loadEnv(local) }); }
async function failureEmail(message) { try { await sendGmail(await gmail(), 'Family Stock Challenge — weekly update failed', `The weekly update could not be completed.\n\n${message}`); } catch {} }
export async function sendWithRetry(mail, subject, text, send = sendGmail) { try { await send(mail, subject, text); } catch (firstError) { try { await send(mail, subject, text); } catch { throw firstError; } } }
function priorThursday() { const local = localDate(); local.setUTCDate(local.getUTCDate() - 1); return local.toISOString().slice(0, 10); }
function isFridayInMadrid() { return localDate().getUTCDay() === 5; }
function localDate() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(); const get = type => parts.find(part => part.type === type).value; return new Date(Date.UTC(get('year'), Number(get('month')) - 1, get('day'))); }
async function json(path) { return JSON.parse(await readFile(path, 'utf8')); }
function run(command, args, env = {}, cwd) { return new Promise((resolve, reject) => { const child = spawn(command, args, { stdio: 'inherit', cwd, env: { ...process.env, ...env } }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} failed.`))); }); }
function capture(command, args, cwd) { return new Promise((resolve, reject) => { const child = spawn(command, args, { cwd }); let output = ''; child.stdout.on('data', chunk => { output += chunk; }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(`${command} ${args.join(' ')} failed.`))); }); }
