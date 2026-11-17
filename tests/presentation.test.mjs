import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const code=readFileSync("presentation.js","utf8");
const html=readFileSync("presentation.html","utf8");
const css=readFileSync("presentation.css","utf8");
new vm.Script(code,{filename:"presentation.js"});
for(const id of ["prJoin","prParticipant","prAdmin","prJoinForm","prAdminForm","prCurrent","prAdminChapters","prAdminSteps","prDashboard","prOverlay","prSalarySlider"]){
 if(id==="prSalarySlider") {assert.match(code,/prSalarySlider/);continue}
 assert.ok(html.includes('id="'+id+'"'),"Missing interface element "+id);
}
for(const name of ["arb_pr_join","arb_pr_public","arb_pr_submit","arb_pr_admin","arb_pr_clock"])
 assert.ok(code.includes('"'+name+'"'),"Missing Supabase RPC "+name);
for(const title of ["Einleitung","Rechtssicherheit","Fixgehalt","Gerechtigkeit","Variable Vergütung","Benefits"])
 assert.ok(code.includes(title),"Missing chapter "+title);
for(const test of ["data-benefit","prBudgetTotal","data-cash","prSalaryUpdate","prRenderDashboard","prAdminAction"])
 assert.ok(code.includes(test),"Missing interaction "+test);
for(const design of ["#008b93","#0d2832",".pr-benefit",".pr-dash-card"])
 assert.ok(css.includes(design),"Missing NXT design "+design);
assert.match(html,/nxt-logo\.svg/);
assert.match(code,/sessionStorage\.getItem\("nxt_admin"\)/);
assert.ok(!code.includes("service_role"),"Secret service role must never be exposed");
console.log("Presentation static checks passed (six chapters, NXT design, RPC, salary and benefits).");
