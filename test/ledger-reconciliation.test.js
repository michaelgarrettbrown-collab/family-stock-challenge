import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readLedger, reconstructPortfolio } from '../src/ledger.js';
import { buildScorecardData } from '../src/build-scorecard-data.js';

test('version-controlled ledger reproduces the approved scorecard', async () => {
  const config=JSON.parse(await readFile('config/scorecard.config.json','utf8'));
  const ledger=await readLedger(), result=buildScorecardData(ledger,config);
  assert.deepEqual(result.players.map(p=>({rank:p.rank,name:p.name,value:Math.round(p.value),return:Number(p.return.toFixed(1))})),[
    {rank:1,name:'Lee',value:132346,return:32.3}, {rank:2,name:'Roger',value:105484,return:5.5}, {rank:3,name:'Michael',value:95495,return:-4.5}
  ]);
  for(const player of ledger.players) assert.ok(Math.abs(reconstructPortfolio(ledger,player.id).cash)<0.01);
  assert.equal(result.biggestWinner.name,'SK Hynix');
  assert.deepEqual(result.checkpointLeaders.map(p=>[p.label,p.name]),[['Q1','Michael'],['Q2','Lee'],['Now','Lee']]);
  assert.deepEqual(result.warnings,[]);
  assert.equal(result.transactions.length,9);
  assert.equal(result.schemaVersion,2);
});

test('ledger rejects a sale larger than the position held', async () => {
  const ledger=await readLedger();
  ledger.transactions.push({id:'invalid-sale',date:'2026-09-30',quarter:'Q3',playerId:'lee',instrumentId:'chevron',type:'SELL',quantity:999999,price:214.06,fxToGbp:0.7402,feesGbp:0});
  assert.throws(()=>reconstructPortfolio(ledger,'lee'),/cannot sell/);
});
