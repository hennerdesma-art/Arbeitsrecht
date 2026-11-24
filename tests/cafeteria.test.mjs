import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('cafeteria.js','utf8');
new vm.Script(source,{filename:'cafeteria.js'});
const PERSONAS={mia:{name:'Mia',budget:50},murat:{name:'Murat',budget:100},sabine:{name:'Sabine',budget:100},tim:{name:'Tim',budget:100}};
const catalog=[
 {id:'ticket',label:'Jobticket-Zuschuss',cost:50,tax:'§ 3 Nr. 15 EStG'},
 {id:'care',label:'Kita-Zuschuss',cost:60,tax:'§ 3 Nr. 33 EStG'},
 {id:'learn',label:'Weiterbildungsbudget',cost:60,tax:'§ 3 Nr. 19 EStG'},
 {id:'bike',label:'Dienstrad-Leasing',cost:30,tax:'§ 3 Nr. 37 EStG'},
 {id:'device',label:'Diensthandy zur Privatnutzung',cost:20,tax:'§ 3 Nr. 45 EStG'}
];
const step={context:{catalog},kind:'benefits',phase:'results',myAnswer:{items:['ticket']}};
const ctx={PR_PERSONAS:PERSONAS,pr:{cafeFilter:'alle',public:{persona:'mia'}},
 prBudgetItems:s=>s.context.catalog,prEuro:n=>Math.round(n)+' €',
 prEscape:v=>String(v).replaceAll('<','&lt;'),prBars:(rows,total)=>rows.map(r=>r.label+':'+r.count+'/'+total).join('|')};
vm.createContext(ctx);vm.runInContext(source,ctx);
const rows=[
 {persona:'mia',answer:{items:['ticket']}},
 {persona:'murat',answer:{items:['care','device']}},
 {persona:'tim',answer:{items:['learn','ticket']}}, // 110 > 100 => invalid
 {persona:'tim',answer:{items:['bike','device']}},
 {persona:'sabine',answer:{items:['ticket'],cash:10}}, // old cash vote => excluded
 {persona:'sabine',answer:{items:['ticket','ticket']}}, // duplicate => excluded
 {persona:'mia',answer:{items:['care']}}, // over budget => invalid
];
assert.equal(ctx.prCafeteriaValidRows(step,rows).length,3,'Only valid noncash answers may count');
assert.equal(ctx.prCafeteriaValidRows(step,rows,'mia').length,1,'Persona filter');
assert.equal(ctx.prCafeteriaValidRows(step,rows,'tim').length,1,'Invalid over-budget answers excluded');
const before=ctx.prCafeteriaDashboard(step,rows,false);
assert.ok(before.includes('Gewählte Benefits')&&before.includes('Alle')&&before.includes('Mia'));
assert.ok(!before.includes('§ 3 Nr. 15 EStG')&&!before.includes('40–50 €'),'Do not show tax or comparison before moderator reveal');
const after=ctx.prCafeteriaDashboard(step,rows,true);
assert.ok(after.includes('§ 3 Nr. 15 EStG')&&after.includes('40–50 €'),'Reveal tax information and comparison');
const mobile=ctx.prCafeteriaMobileResult(step);
assert.ok(mobile.includes('50 €')&&mobile.includes('45 %')&&!mobile.includes('§ 3 Nr. 15 EStG'));
step.phase='revealed';assert.ok(ctx.prCafeteriaMobileResult(step).includes('§ 3 Nr. 15 EStG'));
console.log('Cafeteria: persona filtering, cash rejection, tax gating and personal result passed.');