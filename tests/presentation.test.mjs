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


// Chapter 4: correctness and voting distribution only; detailed legal explanations remain on slides.
for(const feature of ["function prBonusFeedbackHTML(step){","pr-bonus-verdict","Leider falsch eingeschätzt.","Richtig eingeschätzt!","KAPITEL 04 · FALL"]){
 assert.ok(code.includes(feature),"Chapter 4 feedback missing: "+feature);
}
assert.match(code,/step\.chapter===4&&step\.kind==='boolean'&&hasAnswered/,"Chapter 4 feedback appears only after a saved vote");
assert.match(code,/if\(step\.solution&&step\.chapter!==4\)body\+=prLegalSolution\(step\)/,"Never render legal commentary for chapter 4 in generic view");
assert.match(code,/step\.chapter!==4\)text\+=prLegalSolution\(step\)/,"Do not render chapter 4 legal explanations in projector dashboard");
assert.match(code,/if\(\[1,2,4\]\.includes\(step\.chapter\)\)/,"Scroll to immediate chapter 4 feedback after answer");
assert.match(css,/\.pr-bonus-verdict/,"Chapter 4 keeps a responsive card design");
{
 const begin=code.indexOf("function prBonusFeedbackHTML(step){");
 const end=code.indexOf("function prInstantFeedbackHTML(step){",begin);
 assert.ok(begin>0&&end>begin,"Dedicated chapter 4 feedback renderer must exist");
 const sandbox={pr:{public:{participants:3}},prStats:(label,value)=>"<b>"+label+":"+value+"</b>",prResultRows:()=>"VERTEILUNG",prButton:()=>"<button>Antwort ändern</button>"};
 vm.createContext(sandbox);vm.runInContext(code.slice(begin,end),sandbox);
 const correct=sandbox.prBonusFeedbackHTML({seq:1,kind:"boolean",phase:"voting",myAnswer:{value:false},solution:{correct:false},responses:[{answer:{value:false}},{answer:{value:true}}],explanation:"LEGAL_SECRET"});
 assert.ok(correct.includes("Richtig eingeschätzt!")&&correct.includes("VERTEILUNG"),"Correct answer and live distribution should appear");
 assert.ok(!correct.includes("LEGAL_SECRET"),"No legal reasoning in participant feedback");
 const incorrect=sandbox.prBonusFeedbackHTML({seq:3,kind:"boolean",phase:"closed",myAnswer:{value:true},solution:{correct:false},responses:[{answer:{value:true}}],explanation:"LEGAL_SECRET"});
 assert.ok(incorrect.includes("Leider falsch eingeschätzt."),"Incorrect answers must be graded immediately");
 assert.ok(!incorrect.includes("LEGAL_SECRET"),"Keep explanations on slides only");
}

console.log("Presentation static checks passed (six chapters, NXT design, RPC, salary and benefits).");
