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
for(const test of ["data-benefit","prBudgetTotal","data-cash","prSalaryUpdate","prRenderDashboard","prAdminAction","prLiveSalaryHistogram","prInstantFeedbackHTML","review-edit","hasAnswered","liveReview","pr.reviewEditing"])
 assert.ok(code.includes(test),"Missing interaction "+test);
for(const design of ["#008b93","#0d2832",".pr-benefit",".pr-dash-card",".pr-live-feedback",".pr-live-hist"])
 assert.ok(css.includes(design),"Missing NXT design "+design);
for(const feature of ["prWordIdeaCheck","prWordCloudData","prWordCloudHTML","prWordParticipantHTML","pr-word-results","word-edit","step.kind==='wordcloud'"]){
 assert.ok(code.includes(feature),"Chapter 3 missing: "+feature);
}
assert.match(code,/pr\.ideaDraft=e\.target\.value/,"Word cloud draft must be retained across polls");
assert.match(code,/pr\.wordViewPhase===step\.phase&&\(!step\.myAnswer\|\|pr\.wordEditing\)/,"Typing must not be interrupted by live polls");
assert.match(css,/\.pr-word-cloud/,"NXT responsive word cloud design");
assert.match(html,/nxt-logo\.svg/);
assert.match(code,/\[1,2\]\.includes\(step\.chapter\)/,"Instant results are limited to chapters 1 and 2");
assert.match(code,/step\.myAnswer!==null/,"Require saved vote before showing feedback");
assert.match(code,/const liveReview=\[1,2\]\.includes\(step\.chapter\)&&hasAnswered&&Array\.isArray\(step\.responses\);/,"Diagram must not require released legal solution");
assert.match(code,/const released=step\.phase==='revealed'&&step\.solution!==null/,"Correctness and law explanation require moderator reveal");
assert.match(code,/if\(released\)html\+=prLegalSolution\(step\)/,"Hide legal explanation until manual reveal");
assert.match(code,/Auflösung noch nicht freigegeben/,"Show pending state before the solution is released");
assert.match(code,/setInterval\(\(\)=>prFetch\(\),2500\)/,"Live results need regular refresh");
assert.match(code,/sessionStorage\.getItem\("nxt_admin"\)/);
assert.ok(!code.includes("service_role"),"Secret service role must never be exposed");

// Real normalization and frequency check for the third chapter's free text.
const wordStart=code.indexOf("function prWordIdeaCheck(value){");
const wordEnd=code.indexOf("function prWordCloudHTML(",wordStart);
assert.ok(wordStart>=0&&wordEnd>wordStart,"Word-cloud functions should be defined");
const wordContext=vm.createContext({});
vm.runInContext(code.slice(wordStart,wordEnd),wordContext);
assert.equal(vm.runInContext('prWordIdeaCheck("Betriebsrat").valid',wordContext),false,"Exactly two to three words required");
assert.equal(vm.runInContext('prWordIdeaCheck("Betriebsrat einschalten").valid',wordContext),true);
const wordGroups=vm.runInContext('prWordCloudData([{answer:{value:"Betriebsrat fragen"}},{answer:{value:"betriebsrat   fragen."}},{answer:{value:"Auskunft verlangen"}}])',wordContext);
assert.equal(wordGroups[0].count,2,"Repeated normalized ideas should be shown larger");
assert.equal(wordGroups.length,2,"Variants should be aggregated");
assert.equal(wordGroups[1].count,1);
assert.match(code,/--pr-word-size:/,"Frontend must supply a responsive word-cloud scale");
assert.match(css,/min\(var\(--pr-word-size\),9vw\)/,"Mobile view must preserve relative font sizes");

console.log("Presentation static checks passed (six chapters, NXT design, RPC, salary and benefits).");
