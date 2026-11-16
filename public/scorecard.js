const money = new Intl.NumberFormat('en-GB', { style:'currency', currency:'GBP', maximumFractionDigits:0 });
const date = new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric', timeZone:'UTC' });
const colors = { green:'#52e28d', blue:'#58bff7', red:'#ff7f8d', gold:'#ffc846', purple:'#b79cff' };

const response = await fetch('scorecard-data.json', { cache:'no-store' });
if (!response.ok) throw new Error(`Unable to load scorecard data (${response.status})`);
const data = await response.json();

text('game-title', data.title.toUpperCase());
text('year', data.year);
text('as-of', formatDate(data.asOf).toUpperCase());
text('currency', data.reportingCurrency);
document.title = `${data.title} ${data.year}`;

document.querySelector('#leaderboard').innerHTML = data.players.map(player => `
  <div class="row"><div class="rank ${rankClass(player.rank)}">🏆 ${player.rank}</div><div class="player"><button class="thesis-trigger" aria-expanded="false" aria-controls="thesis-${player.id}">${escapeHtml(player.name)}</button><div class="thesis-popover" id="thesis-${player.id}" hidden><div class="thesis-title">Initial thesis</div><p>${escapeHtml(player.publicThesis)}</p><button class="thesis-close" aria-label="Close initial thesis">×</button></div></div><div class="value">${money.format(player.value)}</div><div class="ret ${signClass(player.return)}">${percent(player.return)}</div></div>
`).join('');

document.querySelector('#bar-chart').innerHTML = data.players.map(player => `
  <div class="barrow"><div class="track"><span class="capital-line" style="left:${player.startValue / data.chart.barMax * 100}%"></span><div class="fill ${player.color}" style="width:${Math.min(100, player.value / data.chart.barMax * 100)}%"></div></div><div class="barlabel">£${(player.value / 1000).toFixed(1)}k</div></div>
`).join('') + `<div><div class="axis"><span>0</span><span>50</span><span>100</span><span>150</span></div><div class="axis-title">Portfolio value (£ thousands)</div><div class="capital-key">┆ £100k starting capital</div></div>`;

document.querySelector('#portfolios').style.gridTemplateColumns = `repeat(${data.players.length},1fr)`;
document.querySelector('#portfolios').innerHTML = data.players.map(player => `
  <article class="card pcard ${player.color}line"><div class="phead"><div class="name ${player.color}">${escapeHtml(player.name.toUpperCase())}'S<br>PORTFOLIO</div><div class="sum">${money.format(player.value)} <span class="${signClass(player.return)}">(${percent(player.return)})</span></div></div><div class="holding-head"><div>Holding</div><div class="hval">Value (£)</div><div class="hret">Return</div></div>${player.holdings.map(holding => `<div class="holding"><div title="${escapeHtml(holding.fullName)}">${escapeHtml(holding.name)}</div><div class="hval">${Math.round(holding.value).toLocaleString('en-GB')}</div><div class="hret ${signClass(holding.return)}">${percent(holding.return)}</div></div>`).join('')}</article>
`).join('');

renderTimeline(data);
const winner = data.biggestWinner;
document.querySelector('#winner').innerHTML = winner ? `<div class="rocket">🚀</div><div><div class="winner-main">${escapeHtml(winner.name)} (${escapeHtml(winner.player)})</div><div style="font-size:18px">£${(winner.startValue/1000).toFixed(1)}k → £${(winner.value/1000).toFixed(1)}k</div><div class="winner-big">${percent(winner.return)}</div><div class="winner-period">Since ${escapeHtml(winner.checkpoint)} · ${formatDate(winner.since)}</div></div>` : 'Checkpoint holding prices unavailable.';
document.querySelector('#checkpoints').style.gridTemplateColumns = `repeat(${data.checkpointLeaders.length},1fr)`;
document.querySelector('#checkpoints').innerHTML = data.checkpointLeaders.map((point, index) => `<div class="cp"><div class="q">${point.label}</div><div class="date">${point.date}</div><div class="who ${index === data.checkpointLeaders.length - 1 || point.name === data.players[0].name ? 'lead':'old'}">${escapeHtml(point.name)}</div></div>`).join('');
document.querySelector('#rules').innerHTML = data.rules.map(rule => `<span>${escapeHtml(rule)}</span>`).join('');

if (data.warnings.length) { const el=document.querySelector('#warnings'); el.hidden=false; el.textContent=data.warnings.join(' · '); }
document.documentElement.dataset.renderComplete = 'true';

// Native buttons provide keyboard and touch activation; Escape/outside click dismiss.
const thesisButtons = [...document.querySelectorAll('.thesis-trigger')];
function setThesis(button, open) {
  button.setAttribute('aria-expanded', String(open));
  document.getElementById(button.getAttribute('aria-controls')).hidden = !open;
}
function closeTheses() { thesisButtons.forEach(button => setThesis(button, false)); }
for (const button of thesisButtons) {
  button.addEventListener('click', () => { closeTheses(); setThesis(button, true); });
  button.addEventListener('focus', () => { closeTheses(); setThesis(button, true); });
  button.parentElement.addEventListener('mouseenter', () => { closeTheses(); setThesis(button, true); });
  button.parentElement.addEventListener('mouseleave', () => { if (!button.parentElement.contains(document.activeElement)) setThesis(button, false); });
  button.parentElement.addEventListener('focusout', event => { if (!button.parentElement.contains(event.relatedTarget)) setThesis(button, false); });
  button.parentElement.querySelector('.thesis-close').addEventListener('click', () => { button.focus(); setThesis(button, false); });
}
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeTheses(); });
document.addEventListener('click', event => { if (!event.target.closest('.player')) closeTheses(); });

function renderTimeline(data) {
  const labels = data.timelineLabels;
  const min = data.chart.min, max = data.chart.max, height = 220, width = 400;
  const values = Array.from({length:5}, (_, i) => max - ((max-min)/4)*i);
  const yLabels = values.map((value,i) => `<div class="ylabel" style="top:${8+i*50}px">£${Math.round(value/1000)}k</div>`).join('');
  const series = data.players.map(player => {
    const sequence = [...player.checkpoints, {label:'Now',value:player.value}];
    const points = sequence.map((point,index) => `${index/(labels.length-1)*width},${(max-point.value)/(max-min)*height}`).join(' ');
    const circles = sequence.map((point,index) => `<circle cx="${index/(labels.length-1)*width}" cy="${(max-point.value)/(max-min)*height}" r="6"/>`).join('');
    return `<polyline fill="none" stroke="${colors[player.color]}" stroke-width="4" points="${points}"/><g fill="${colors[player.color]}">${circles}</g>`;
  }).join('');
  const xLabels = labels.map(item => `<span>${labelDate(item)}<br>(${item.label})</span>`).join('');
  document.querySelector('#timeline-chart').innerHTML = `<div class="ygrid"></div><div class="xgrid"></div>${yLabels}<svg viewBox="0 0 400 220" preserveAspectRatio="none">${series}</svg><div class="xlabels" style="grid-template-columns:repeat(${labels.length},1fr)">${xLabels}</div>`;
}
function labelDate(item){ if (/^\d{4}-/.test(item.date)) return new Intl.DateTimeFormat('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${item.date}T00:00:00Z`)); return item.date.replace(/^\d+ /,'')+' '+data.year; }

function formatDate(iso){ return date.format(new Date(`${iso}T00:00:00Z`)); }
function percent(value){ return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`; }
function signClass(value){ return value >= 0 ? 'pos':'neg'; }
function rankClass(rank){ return rank===1?'one':rank===2?'two':rank===3?'three':''; }
function text(id,value){ document.getElementById(id).textContent=value; }
function escapeHtml(value){ return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
