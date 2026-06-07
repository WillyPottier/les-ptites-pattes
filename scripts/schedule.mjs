// ============================================================
//  scripts/schedule.mjs
//  Attribue des dates de publication par vagues hebdomadaires.
//  - Les communes "core"/"home" restent en ligne immédiatement.
//  - Les autres sont publiées par lots de PER_WEEK, +7 jours par vague.
//
//  Usage :  node scripts/schedule.mjs
//  (édite src/data/communes.json — relis le diff puis commit)
//
//  Pour TOUT republier d'un coup :  node scripts/schedule.mjs --reset
// ============================================================
import fs from 'node:fs';

const PER_WEEK = 10;          // nombre de communes publiées par semaine
const FILE = new URL('../src/data/communes.json', import.meta.url);

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const reset = process.argv.includes('--reset');

function iso(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function nextMonday(from) {
  const d = new Date(from);
  const day = d.getDay();              // 0=dim … 1=lun
  const delta = (8 - day) % 7 || 7;    // prochain lundi (jamais aujourd'hui)
  return addDays(d, delta);
}

if (reset) {
  data.communes.forEach((c) => { delete c.publishAt; });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('✅ Toutes les dates retirées : les 74 communes sont publiées immédiatement.');
  process.exit(0);
}

const start = nextMonday(new Date());
let n = 0;
const plan = {};

data.communes.forEach((c) => {
  if (c.core || c.home) { delete c.publishAt; return; }   // toujours en ligne
  const week = Math.floor(n / PER_WEEK);
  c.publishAt = iso(addDays(start, week * 7));
  plan[c.publishAt] = (plan[c.publishAt] || 0) + 1;
  n++;
});

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

const liveNow = data.communes.filter((c) => !c.publishAt).length;
console.log(`✅ Planification écrite dans src/data/communes.json`);
console.log(`   ${liveNow} communes en ligne immédiatement (core)`);
console.log(`   ${n} communes réparties en ${Math.ceil(n / PER_WEEK)} vagues de ${PER_WEEK}/semaine :`);
Object.keys(plan).sort().forEach((d) => console.log(`     ${d} : +${plan[d]} communes`));
console.log(`\n   Relis le diff, puis commit. Le build hebdomadaire révélera chaque vague automatiquement.`);
