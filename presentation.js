"use strict";
/* NXT · six chapter presentation engine. No answer keys in the public bundle. */
const PR_API="https://trqhbzzwpamcyxzxaxmk.supabase.co/rest/v1/rpc/";
const PR_KEY="sb_publishable_MdUD-YPx8HT7WO7MnOqVLQ_fW5-Cnvn";
const PR_CHAPTERS=[
 {name:"Einleitung",short:"Einstieg",subtitle:"Initiale Umfrage",color:"#647f88"},
 {name:"Rechtssicherheit",short:"Recht",subtitle:"Mindestlohn · Entgeltfortzahlung",color:"#193e46"},
 {name:"Fixgehalt",short:"Fixgehalt",subtitle:"Gehaltsmanager · Tarifrecht",color:"#4d829a"},
 {name:"Gerechtigkeit",short:"Gerechtigkeit",subtitle:"Equal Pay · Transparenz",color:"#218076"},
 {name:"Variable Vergütung",short:"Bonus",subtitle:"Boni · Zielvereinbarungen",color:"#78a9a0"},
 {name:"Benefits",short:"Benefits",subtitle:"Cafeteria · Rechts-Twists",color:"#bfd9d2"}
];
const PR_PERSONAS={
 mia:{name:"Mia",age:27,info:"Teilzeit · 20 h/Woche · tägliche Bahnpendlerin · berufsbegleitender Master · achtet auf ihre Ausgaben",budget:50},
 murat:{name:"Murat",age:38,info:"Vollzeit · zwei Kinder (3 und 5) in der Kita · Bahnpendler · Rückenprobleme",budget:100},
 sabine:{name:"Sabine",age:58,info:"Vollzeit · denkt an die Rente · Rückenprobleme · wünscht sich mehr Freizeit",budget:100},
 tim:{name:"Tim",age:24,info:"Berufseinsteiger · fährt Rad · technikaffin · möchte sich weiterbilden",budget:100}
};
const pr$=id=>document.getElementById(id);
const pr={
 name:localStorage.getItem("nxt_name")||"",device:localStorage.getItem("nxt_device")||"",
 password:sessionStorage.getItem("nxt_admin")||"",view:"join",public:null,admin:null,clock:null,
 adminChapter:1,adminDashboard:1,busy:false,polling:false,choice:null,dualChoice:{q1:null,q2:null},salary:null,items:[],
 stepId:null,overlay:false,lastError:"",joinedSession:null,reviewEditing:false,wordEditing:false,ideaDraft:""
};
if(!pr.device){pr.device=crypto.randomUUID();localStorage.setItem("nxt_device",pr.device)}
function prEscape(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function prEuro(n){return Math.round(Number(n)||0).toLocaleString("de-DE")+" €"}
function prToast(message){let el=pr$("prToast");el.textContent=String(message);el.classList.remove("hidden");clearTimeout(prToast.timer);prToast.timer=setTimeout(()=>el.classList.add("hidden"),4200)}
async function prRpc(fn,params={}){
 const r=await fetch(PR_API+fn,{method:"POST",headers:{apikey:PR_KEY,"Content-Type":"application/json"},body:JSON.stringify(params)});
 let data;try{data=await r.json()}catch{data={message:"Keine Serverantwort"}}
 if(!r.ok)throw new Error(data.message||"Verbindung fehlgeschlagen");
 return data;
}
function prButton(text,action,cls="ghost small",other=""){return '<button type="button" class="'+cls+'" data-pr="'+action+'" '+other+'>'+text+'</button>'}
function prSetView(view){
 pr.view=view;
 ["prJoin","prParticipant","prAdmin"].forEach(id=>pr$(id).classList.toggle("hidden",id!==({join:"prJoin",participant:"prParticipant",admin:"prAdmin"}[view])));
 prRender();window.scrollTo({top:0,behavior:"smooth"});
}
function prPyramid(){
 const rows=[...PR_CHAPTERS.slice(1)].reverse();
 return rows.map((c,i)=>{
  const n=5-i,w=59+(i*8.2),fg=n<3?"#fff":"#163943";
  return '<div class="pr-pyramid-row" style="width:'+Math.min(w,100)+'%;margin:auto;background:'+c.color+';color:'+fg+'">'+(n===0?"00":("0"+n))+' · '+prEscape(c.name)+'</div>';
 }).join("");
}
function prChapterMenu(){
 const p=pr.public,chapter=p?.chapter??0,opened=p?.openedChapters||[0];
 return PR_CHAPTERS.slice(1).map((c,j)=>{
  const i=j+1,unlocked=opened.includes(i),current=chapter===i;
  return '<div class="pr-chap '+(current?'current ':'')+(!unlocked?'locked':'')+'"><strong>'+String(j+1).padStart(2,"0")+'</strong><small>'+prEscape(c.short)+'</small></div>';
 }).join("");
}
function prStats(label,value){return '<div class="pr-fact"><small>'+prEscape(label)+'</small><strong>'+prEscape(value)+'</strong></div>'}
function prPersonaHTML(){
 const d=PR_PERSONAS[pr.public?.persona];
 if(!d)return '<p class="pr-note">Deine Persona wird bei der Anmeldung zugeteilt.</p>';
 return '<div class="pr-persona"><small>DEINE PERSONA</small><strong>'+d.name+', '+d.age+'</strong><p>'+prEscape(d.info)+'</p><b>'+prEuro(d.budget)+' / Monat</b></div>';
}
function prBudgetItems(step){return Array.isArray(step?.context?.catalog)?step.context.catalog:[]}
function prBudgetTotal(step){
 return prBudgetItems(step).reduce((sum,b)=>sum+(pr.items.includes(b.id)?Number(b.cost):0),0);
}
function prBudgetHTML(step,readonly=false){
 const persona=PR_PERSONAS[pr.public?.persona],max=persona?.budget||100,total=prBudgetTotal(step),remain=Math.max(0,max-total);
 const options=prBudgetItems(step);
 let txt='<div class="pr-persona"><small>FÜR WEN STELLST DU DAS PAKET ZUSAMMEN?</small><strong>'+prEscape(persona?.name||"Persona")+', '+(persona?.age||"")+'</strong><p>'+prEscape(persona?.info||"")+'</p><b>'+prEuro(max)+' Benefit-Budget pro Monat</b></div>';
 txt+='<div class="pr-budget"><div class="pr-budget-row"><span>Dein Paket</span><strong>'+prEuro(total)+' / '+prEuro(max)+'</strong></div><div class="pr-progress"><span style="width:'+Math.min(100,total/max*100)+'%"></span></div><p class="pr-muted">Verbleibend: '+prEuro(remain)+' · Nicht verbrauchtes Budget verfällt.</p></div>';
 txt+='<div class="pr-benefits">'+options.map(b=>{
  const selected=pr.items.includes(b.id),affordable=selected||Number(b.cost)<=remain;
  return '<button class="pr-benefit '+(selected?'selected':'')+'" data-benefit="'+prEscape(b.id)+'" type="button" '+(readonly||!affordable?'disabled':'')+' aria-pressed="'+selected+'"><span class="pr-benefit-icon">'+prEscape(b.icon)+'</span><strong>'+prEscape(b.label)+'</strong><small>'+prEuro(b.cost)+' / Monat'+(!affordable?" · Budget reicht nicht":"")+'</small></button>';
 }).join("")+'</div>';
 if(remain>0&&!readonly)txt+='<div class="pr-cafe-budget-warning" role="status" aria-live="polite"><strong>Restbudget verfällt:</strong> '+prEuro(remain)+' werden beim Abschicken nicht ausgezahlt oder übertragen.</div>';
 return txt;
}

/* Chapter 5 / Twist 3: both answers are mandatory and are released together. */
function prDualChoiceOptions(step){
 const questions=Array.isArray(step.context?.questions)?step.context.questions:[];
 return '<div class="pr-twist-double">'+questions.map((question,i)=>{
  const selected=pr.dualChoice?.[question.id]??null;
  return '<section class="pr-twist-question" aria-label="'+prEscape(question.title)+'">'+
   '<div class="pr-twist-question-top"><span class="pr-eyebrow">TEILFRAGE '+(i+1)+' / 2</span><span class="pr-pill">'+(selected?'✓ Beantwortet':'Noch offen')+'</span></div>'+
   '<h3>'+prEscape(question.title)+'</h3>'+
   '<div class="pr-optiongrid">'+(question.options||[]).map(option=>'<button type="button" class="pr-option '+(selected===option.value?'selected':'')+
    '" data-dual-id="'+prEscape(question.id)+'" data-dual-choice="'+prEscape(option.value)+'" '+(step.phase==='voting'?'':'disabled')+
    ' aria-pressed="'+(selected===option.value)+'"><strong>'+prEscape(option.label)+'</strong></button>').join("")+'</div></section>';
 }).join("")+'</div><p class="pr-twist-note">Beantworte beide Teilfragen. Die Auflösung erfolgt erst nach der gemeinsamen Abgabe und Freigabe durch die Moderation.</p>';
}
function prDualClick(questionId,value){
 const step=pr.public?.step;
 if(step?.kind!=='dual_choice'||step.phase!=='voting')return;
 const subquestion=(step.context?.questions||[]).find(q=>q.id===questionId);
 if(!subquestion||(subquestion.options||[]).every(o=>o.value!==value))return;
 pr.dualChoice={...(pr.dualChoice||{}),[questionId]:value};
 pr.localEdited=true;prShowParticipant();
}

function prOptions(step){
 const options=step.kind==='boolean'?[{value:true,label:"Richtig"},{value:false,label:"Falsch"}]:(step.context?.options||[]);
 return '<div class="pr-optiongrid">'+options.map((o)=>{
  const selected=pr.choice===o.value,disabled=step.phase!=='voting'?"disabled":"";
  return '<button type="button" class="pr-option '+(selected?'selected':'')+'" data-choice="'+prEscape(String(o.value))+'" '+disabled+' aria-pressed="'+selected+'"><strong>'+prEscape(o.label)+'</strong></button>';
 }).join("")+'</div>';
}
function prSalaryHTML(step){
 const c=step.context||{},min=Number(c.min),max=Number(c.max),delta=Number(c.step||1000);
 const amount=Number(pr.salary??c.default??min);
 const facts=Array.isArray(c.facts)?c.facts:[];
 return '<div class="pr-facts">'+facts.map(f=>prStats(f[0],f[1])).join("")+'</div>'+
  '<div class="pr-budget"><div class="pr-budget-row"><span>Deine Gehaltsentscheidung</span><strong>'+prEuro(amount)+'</strong></div>'+
  '<div class="pr-salary-input"><input id="prSalarySlider" aria-label="Gehalt wählen" type="range" min="'+min+'" max="'+max+'" step="'+delta+'" value="'+amount+'" '+(step.phase==='voting'?'':'disabled')+'></div>'+
  '<div class="pr-salary-input"><button class="ghost small" type="button" data-salary-step="'+(-delta)+'" '+(step.phase==='voting'?'':'disabled')+'>−</button>'+
  '<input type="number" id="prSalaryNumber" aria-label="Gehalt als Zahl eingeben" min="'+min+'" max="'+max+'" step="'+delta+'" value="'+amount+'" '+(step.phase==='voting'?'':'disabled')+'>'+
  '<button class="ghost small" type="button" data-salary-step="'+delta+'" '+(step.phase==='voting'?'':'disabled')+'>+</button><span class="pr-muted">€ brutto / '+prEscape(c.unit||"Jahr")+'</span></div>'+
  '<small class="pr-note">Gültiger Bereich: '+prEuro(min)+' bis '+prEuro(max)+' in '+prEuro(delta)+'-Schritten.</small></div>';
}

/* Chapter 3 | brainstorm answers are grouped as short, normalized phrases. */
function prWordIdeaCheck(value){
 const text=String(value??"").normalize("NFKC").trim().replace(/\s+/gu," ");
 return {text,words:text?text.split(" ").length:0,
  valid:text.length>=1&&text.length<=100&&!/[<>\u0000-\u001f\u007f]/u.test(text)};
}
function prOwnWordIdeas(answer){
 if(Array.isArray(answer?.items))return answer.items.filter(v=>typeof v==="string"&&prWordIdeaCheck(v).valid);
 if(typeof answer?.value==="string"&&prWordIdeaCheck(answer.value).valid)return [answer.value];
 return [];
}
function prWordCloudEntries(responses){
 return (Array.isArray(responses)?responses:[]).flatMap(item=>prOwnWordIdeas(item?.answer));
}
function prWordCloudData(responses){
 const frequency=new Map();
 for(const value of prWordCloudEntries(responses)){
  const idea=prWordIdeaCheck(value);
  if(!idea.valid)continue;
  const key=idea.text.toLocaleLowerCase("de-DE").replace(/[.,!?;:„“"’']/gu,"").trim();
  if(!key)continue;
  const current=frequency.get(key);
  if(current)current.count++;
  else frequency.set(key,{label:idea.text,count:1,key});
 }
 return [...frequency.values()].sort((x,y)=>y.count-x.count||x.label.localeCompare(y.label,"de"));
}
function prWordCloudHTML(responses,compact=false){
 const terms=prWordCloudData(responses),total=terms.reduce((n,term)=>n+term.count,0);
 if(!total)return '<div class="pr-word-empty"><span aria-hidden="true">✦</span><p>Die Wörterwolke wartet auf ihre erste Idee.</p></div>';
 let html='<div class="pr-word-meta">'+prStats("Eingereichte Ideen",total)+prStats("Unterschiedliche Antworten",terms.length)+'</div>';
 html+='<div class="pr-word-cloud '+(compact?'pr-word-cloud-small':'')+'" role="list" aria-label="Wörterwolke aus '+total+' eingereichten Ideen">';
 html+=terms.map((term,index)=>{
  const font=Math.min(compact?31:48,Math.round((compact?11:10)+(compact?10:13)*Math.log2(term.count+1)));
  const tone=index%4;
  return '<span class="pr-word-term pr-word-tone-'+tone+'" role="listitem" style="--pr-word-size:'+font+'px;font-size:'+font+'px" title="'+prEscape(term.count+' '+(term.count===1?'Nennung':'Nennungen'))+'">'+prEscape(term.label)+'<sup>'+term.count+'</sup></span>';
 }).join("");
 html+='</div><p class="pr-note">Häufig genannte Antworten werden größer. Groß-/Kleinschreibung und zusätzliche Leerzeichen werden zusammengefasst.</p>';
 return html;
}
function prWordParticipantHTML(step,open){
 const own=prOwnWordIdeas(step.myAnswer),count=own.length,max=Number(step.context?.maxEntries||25);
 const visible=Array.isArray(step.responses);
 let html='<p class="pr-eyebrow">EBENE 3 · GERECHTIGKEIT · IDEENSAMMLUNG</p><h2>'+prEscape(step.title)+'</h2>';
 html+='<div class="pr-lena-case"><span class="pr-eyebrow">DER FALL WIRD VORN AUF DER FOLIE GEZEIGT</span><p>'+prEscape(step.context?.case||"")+'</p></div>';
 html+='<h3 class="pr-word-question">'+prEscape(step.prompt)+'</h3>';
 if(open&&count<max){
  const idea=prWordIdeaCheck(pr.ideaDraft);
  html+='<div class="pr-word-editor"><label for="prWordIdea">NEUE IDEE HINZUFÜGEN</label>'+
   '<input id="prWordIdea" type="text" maxlength="100" autocomplete="off" autocapitalize="sentences" spellcheck="true" placeholder="'+prEscape(step.context?.placeholder||"Ein Begriff oder kurzer Satz")+'" value="'+prEscape(pr.ideaDraft||"")+'" aria-describedby="prWordHint">'+
   '<p class="pr-note" id="prWordHint">'+idea.text.length+' / 100 Zeichen · Ein Wort oder mehrere Wörter möglich</p>'+
   '<div class="pr-actions"><button type="button" class="primary" data-pr="submit">+ Idee hinzufügen</button>'+
   '<span class="pr-muted">Du kannst mehrere unterschiedliche Ideen nacheinander eintragen.</span></div></div>';
 }else if(open){
  html+='<div class="pr-note-bubble">Du hast bereits '+max+' Ideen eingereicht. Deine bisherigen Beiträge bleiben sichtbar.</div>';
 }else{
  html+='<div class="pr-note-bubble">Die Eingabe wurde von der Moderation geschlossen.</div>';
 }
 if(count)html+='<div class="pr-word-owned"><div class="pr-word-owned-header"><strong>Deine bisherigen Ideen</strong><span>'+count+' / '+max+'</span></div>'+
  '<div class="pr-word-owned-list">'+own.map((item,i)=>'<span class="pr-word-owned-item"><small>'+(i+1)+'.</small> '+prEscape(item)+'</span>').join("")+'</div></div>';
 if(visible){
  html+='<div class="pr-word-results"><div class="pr-live-head"><div><p class="pr-eyebrow">IDEEN AUS DEM PLENUM</p><h3>Unsere Wörterwolke.</h3></div><span class="pr-live-badge"><i></i> LIVE</span></div>'+
  '<div id="prWordCloudLive">'+prWordCloudHTML(step.responses)+'</div></div>';
 }else if(!count){
  html+='<p class="pr-note">Sobald du deine erste Idee absendest, siehst du die gemeinsamen Ergebnisse live.</p>';
 }
 if(step.phase==='revealed'&&step.explanation)html+='<div class="pr-note-bubble">'+prEscape(step.explanation)+'</div>';
 return html;
}
function prResultRows(step,responses){
 if(!Array.isArray(responses)||!responses.length)return '<p class="pr-note">Noch keine Antworten. Die Werte erscheinen nach Eingang der Stimmen.</p>';
 if(step.kind==="wordcloud")return prWordCloudHTML(responses);
 if(step.kind==="dual_choice"){
  return '<div class="pr-twist-results">'+(step.context?.questions||[]).map((sub,i)=>{
   const options=(sub.options||[]).map(option=>({label:option.label,count:responses.filter(r=>r.answer?.[sub.id]===option.value).length}));
   return '<div class="pr-twist-result-question"><p class="pr-eyebrow">TEILFRAGE '+(i+1)+' / 2</p><h4>'+prEscape(sub.title)+'</h4>'+
    prBars(options,responses.length,false)+'</div>';
  }).join("")+'</div>';
 }
 if(step.kind==="benefits")return prCafeteriaBarRows(step,responses,"alle");
 if(step.kind==='salary'){
  const values=responses.map(r=>Number(r.answer?.value)).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!values.length)return '<p class="pr-note">Noch keine gültigen Gehaltswerte.</p>';
  const avg=values.reduce((a,b)=>a+b,0)/values.length;
  const med=values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2;
  const mid=values.reduce((acc,n)=>{acc[n]=(acc[n]||0)+1;return acc},{});
  const bars=Object.entries(mid).sort((a,b)=>Number(a[0])-Number(b[0])).map(([v,count])=>({label:prEuro(v),count}));
  return '<div class="pr-facts">'+prStats("Antworten",values.length)+prStats("Median",prEuro(med))+prStats("Mittelwert",prEuro(avg))+prStats("Spanne",prEuro(values[0])+" – "+prEuro(values.at(-1)))+'</div>'+prBars(bars,values.length,false);
 }
 const options=step.kind==='boolean'?[{value:true,label:"Richtig"},{value:false,label:"Falsch"}]:(step.context?.options||[]);
 return prBars(options.map(o=>({label:o.label,count:responses.filter(r=>r.answer?.value===o.value).length})),responses.length,false);
}
function prBars(rows,total,multiple){
 return rows.map(r=>{
  const percentage=total?Math.round(r.count/total*100):0;
  return '<div class="pr-result-bar"><div><span>'+prEscape(r.label)+'</span><strong>'+r.count+' · '+percentage+' %</strong></div><div class="pr-result-track"><span style="width:'+Math.min(100,percentage)+'%"></span></div></div>';
 }).join('')+(multiple?'<p class="pr-note">Mehrfachauswahl: Prozentwerte beziehen sich auf abgegebene Pakete und können zusammen mehr als 100 % ergeben.</p>':'');
}

/* Instant feedback for voting participants in chapters 1 and 2. All results are anonymous. */
function prLiveSalaryHistogram(step,responses){
 const c=step.context||{},min=Number(c.min),max=Number(c.max),increment=Number(c.step||1000);
 const values=responses.map(row=>Number(row.answer?.value)).filter(n=>Number.isFinite(n)&&n>=min&&n<=max).sort((a,b)=>a-b);
 if(!values.length)return '<p class="pr-note">Die erste Stimme wird gerade geladen.</p>';
 const bins=Math.max(1,Math.min(10,Math.floor((max-min)/increment)+1));
 const width=(max-min+increment)/bins,counts=Array(bins).fill(0);
 for(const value of values)counts[Math.min(bins-1,Math.floor((value-min)/width))]++;
 const peak=Math.max(1,...counts),avg=values.reduce((a,b)=>a+b,0)/values.length;
 const median=values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2;
 const myValue=Number(step.myAnswer?.value);
 let html='<div class="pr-live-metrics">'+prStats("Antworten",values.length)+prStats("Median",prEuro(median))+prStats("Durchschnitt",prEuro(avg))+'</div>';
 html+='<div class="pr-live-hist-scroll"><div class="pr-live-hist" role="img" aria-label="Histogramm aller abgegebenen Gehaltsvorschläge. '+values.length+' Stimmen, Median '+prEuro(median)+'.">';
 html+=counts.map((count,i)=>{
  const start=min+i*width,stop=Math.min(max,min+(i+1)*width);
  const me=myValue>=start&&(i===bins-1?myValue<=max:myValue<min+(i+1)*width);
  const height=count?Math.max(5,Math.round(count/peak*100)):0;
  return '<div class="pr-hist-column '+(me?'is-mine':'')+'" title="'+prEuro(start)+' bis '+prEuro(stop)+': '+count+' Stimmen"><span class="pr-hist-value">'+(count?count:'')+'</span><div class="pr-hist-column-track"><span style="height:'+height+'%"></span></div></div>';
 }).join('');
 html+='</div></div><div class="pr-hist-axis"><span>'+prEuro(min)+'</span><span>'+prEuro(max)+'</span></div>';
 html+='<div class="pr-live-legend"><span><i class="pr-legend-bar"></i>Gruppenverteilung</span><span><i class="pr-legend-mine"></i>Deine Gehaltsklasse</span></div>';
 if(step.phase==='revealed'&&Number.isFinite(Number(step.solution?.minimum)))html+='<p class="pr-note-bubble">Tarifliche Mindestgrenze: <strong>'+prEuro(step.solution.minimum)+'</strong>. Niedrigere Angebote sind im geschilderten Fall nicht tarifkonform.</p>';
 else if(step.phase==='revealed'&&Number.isFinite(Number(step.solution?.recommendedMin)))html+='<p class="pr-note-bubble">Fachlicher Orientierungsbereich: <strong>'+prEuro(step.solution.recommendedMin)+' – '+prEuro(step.solution.recommendedMax)+'</strong> (kein gesetzlicher Grenzwert).</p>';
 return html;
}

/* Chapter 4: anonymous live vote distribution + concise personal correctness.
 * Detailed legal reasoning intentionally stays in the PowerPoint, not the public app. */
function prBonusFeedbackHTML(step){
 const own=step.myAnswer?.value;
 const answeredCorrectly=typeof own==="boolean"&&typeof step.solution?.correct==="boolean"&&own===step.solution.correct;
 const votes=Array.isArray(step.responses)?step.responses:[];
 const correctClass=answeredCorrectly?"pr-bonus-correct":"pr-bonus-incorrect";
 let html='<section class="pr-live-feedback pr-bonus-feedback" aria-label="Dein Ergebnis zu diesem HR-Fall">';
 html+='<div class="pr-live-head"><div><p class="pr-eyebrow">HR-FALL '+step.seq+' VON 4 · ANTWORT GESPEICHERT</p><h3>Deine Auswertung.</h3></div><span class="pr-live-badge"><i></i> LIVE</span></div>';
 html+='<div class="pr-bonus-verdict '+correctClass+'" role="status"><span class="pr-bonus-verdict-icon" aria-hidden="true">'+(answeredCorrectly?'✓':'×')+'</span><div><strong>'+(answeredCorrectly?'Richtig eingeschätzt!':'Leider falsch eingeschätzt.')+'</strong><p>Deine Antwort: '+(own===true?'Richtig':'Falsch')+'</p></div></div>';
 html+='<div class="pr-live-metrics">'+prStats("Abgegebene Stimmen",votes.length)+prStats("Teilnahmequote",Math.min(100,Math.round(votes.length/Math.max(1,pr.public?.participants||votes.length)*100))+" %")+'</div>';
 html+='<div class="pr-live-chart"><p class="pr-eyebrow">ABSTIMMUNG IM PLENUM</p><h3>Richtig oder Falsch?</h3>'+prResultRows(step,votes)+'</div>';
 html+='<div class="pr-note-bubble"><strong>Die juristische Erklärung besprechen wir auf der PowerPoint-Folie.</strong></div>';
 if(step.phase==='voting')html+='<div class="pr-actions">'+prButton("Antwort ändern","review-edit","ghost")+'<span class="pr-muted">Bis zum Schließen der Abstimmung möglich.</span></div>';
 else html+='<p class="pr-note">Die Moderation öffnet die nächste Aufgabe.</p>';
 html+='</section>';
 return html;
}


/* Chapter 5 / Rights Twists: reveal anonymous results immediately, but never legal answers until moderator release. */
function prTwistLiveFeedbackHTML(step){
 const responses=Array.isArray(step.responses)?step.responses:[];
 const dual=step.kind==="dual_choice";
 let ownText="";
 if(dual){
  ownText=(step.context?.questions||[]).map((q,i)=>{
   const selected=step.myAnswer?.[q.id]??"–";
   return '<span><strong>Frage '+(i+1)+':</strong> '+prEscape(selected)+'</span>';
  }).join("");
 }else{
  const selected=step.myAnswer?.value??"–";
  ownText='<span><strong>Deine Antwort:</strong> '+prEscape(selected)+'</span>';
 }
 const revealed=step.phase==="revealed"&&step.solution!==null&&step.solution!==undefined;
 let html='<section class="pr-live-feedback pr-twist-feedback" aria-label="Live-Abstimmung zu diesem Rechts-Twist">';
 html+='<div class="pr-live-head"><div><p class="pr-eyebrow">✓ ANTWORT GESPEICHERT · KAPITEL 5</p><h3>So hat das Plenum abgestimmt.</h3></div><span class="pr-live-badge"><i></i> LIVE</span></div>';
 html+='<div class="pr-twist-my-vote">'+ownText+'</div>';
 html+='<div class="pr-live-metrics">'+prStats("Abgegebene Stimmen",responses.length)+
 prStats("Beteiligung",Math.min(100,Math.round(100*responses.length/Math.max(1,pr.public?.participants||responses.length)))+" %")+'</div>';
 html+='<div class="pr-live-chart"><p class="pr-eyebrow">LIVE-ERGEBNIS · '+(dual?"BEIDE TEILFRAGEN":"DIESE FRAGE")+'</p>'+prResultRows(step,responses)+'</div>';
 if(revealed)html+=prLegalSolution(step);
 else html+='<div class="pr-note-bubble"><strong>Die Auflösung bleibt vorerst verborgen.</strong> Die Moderation zeigt die richtigen Antworten und die Rechtsgrundlagen erst nach der gemeinsamen Auswertung auf den Folien und in der App.</div>';
 if(step.phase==="voting")html+='<div class="pr-actions">'+prButton("Antwort ändern","review-edit","ghost")+
 '<span class="pr-muted">Solange die Abstimmung geöffnet ist.</span></div>';
 else html+='<p class="pr-note">Die Abstimmung ist geschlossen. Die nächste Frage wird von der Moderation geöffnet.</p>';
 html+='<p class="pr-note">Die Diagramme aktualisieren sich automatisch, wenn weitere Teilnehmer abstimmen.</p></section>';
 return html;
}

function prInstantFeedbackHTML(step){
 const rows=Array.isArray(step.responses)?step.responses:[];
 const own=step.myAnswer?.value;
 const total=rows.length;
 const isSalary=step.kind==='salary';
 const ownLabel=isSalary?prEuro(own):own===true?"Richtig":own===false?"Falsch":String(own??"");
 let feedback="";
 const released=step.phase==='revealed'&&step.solution!==null&&step.solution!==undefined;
 if(released&&step.kind==='boolean'&&typeof step.solution?.correct==='boolean')
  feedback=step.solution.correct===own?"Deine Einschätzung war richtig.":"Deine Einschätzung war nicht richtig.";
 else if(released&&isSalary&&Number.isFinite(Number(step.solution?.minimum)))
  feedback=Number(own)<Number(step.solution.minimum)?"Dein Betrag liegt unter dem tariflichen Mindestgehalt.":"Dein Betrag liegt nicht unter der tariflichen Untergrenze.";
 else if(released&&isSalary)feedback="Es gibt hier mehrere fachlich vertretbare Entscheidungen – vergleiche deine Wahl mit der Gruppe.";
 let html='<section class="pr-live-feedback" aria-label="Deine persönliche Auswertung">';
 html+='<div class="pr-live-head"><div><p class="pr-eyebrow">✓ ANTWORT GESPEICHERT · INDIVIDUELLE AUSWERTUNG</p><h3>So hat die Gruppe entschieden.</h3></div><span class="pr-live-badge"><i></i> LIVE</span></div>';
 html+='<div class="pr-live-metrics">'+prStats("Deine Antwort",ownLabel)+prStats("Abgegebene Stimmen",total)+prStats("Aktuelle Beteiligung",Math.min(100,Math.round(total/Math.max(1,pr.public?.participants||total)*100))+" %")+'</div>';
 html+='<div class="pr-live-chart">'+(isSalary?prLiveSalaryHistogram(step,rows):prResultRows(step,rows))+'</div>';
 if(feedback)html+='<p class="pr-feedback-insight">'+prEscape(feedback)+'</p>';
 if(released)html+=prLegalSolution(step);
 else html+='<div class="pr-note-bubble"><strong>Auflösung noch nicht freigegeben.</strong> Die Moderation zeigt die richtige Antwort und die Rechtsgrundlagen später für alle an. Bis dahin siehst du nur die Live-Ergebnisse.</div>';
 html+='<details class="pr-review-original"><summary>Die ursprüngliche Fragestellung anzeigen</summary><p>'+prEscape(step.prompt)+'</p></details>';
 if(step.phase==='voting')html+='<div class="pr-actions">'+prButton("Antwort ändern","review-edit","ghost")+'<span class="pr-muted">Bis zum Schließen der Frage möglich.</span></div>';
 else html+='<div class="pr-note-bubble">Die Abstimmung ist abgeschlossen. Die nächste Frage wird automatisch von der Moderation geöffnet.</div>';
 html+='<p class="pr-note">Jede Browserkennung zählt einmal. Die Balken aktualisieren sich laufend; einzelne Namen werden nicht angezeigt.</p></section>';
 return html;
}

function prLegalSolution(step){
 if(!step?.solution)return '';
 const s=step.solution;
 let label="";
 if(step.kind==='dual_choice'){
  const sections=(step.context?.questions||[]).map((sub,i)=>{
   const correct=s.correct?.[sub.id],chosen=(sub.options||[]).find(o=>o.value===correct);
   return '<div class="pr-twist-solution-part"><p class="pr-eyebrow">FRAGE '+(i+1)+' / 2</p><h4>'+prEscape(sub.title)+'</h4>'+
    '<p><strong>Richtige Antwort:</strong> '+prEscape(chosen?.label||correct||"–")+'</p></div>';
  }).join("");
  return '<div class="pr-answerbox"><p class="pr-eyebrow">GEMEINSAME AUFLÖSUNG · TWIST 3</p>'+sections+
   '<p>'+prEscape(step.explanation||"")+'</p>'+
   (Array.isArray(step.sources)&&step.sources.length?'<div class="pr-note"><strong>Rechtsgrundlagen:</strong> '+step.sources.map(prEscape).join(' · ')+'</div>':'')+'</div>';
 }
 if(step.kind==='boolean')label=s.correct?"Richtig":"Falsch";
 else if(step.kind==='choice')label=s.correct==="indication"?"Der Unterschied ist ein Indiz":(step.context?.options||[]).find(o=>o.value===s.correct)?.label||"Diskussionsfall";
 else if(step.kind==='salary')label=s.minimum?"Rechtliche Untergrenze: "+prEuro(s.minimum):s.recommendedMin?"Fachlich begründeter Bereich: "+prEuro(s.recommendedMin)+" – "+prEuro(s.recommendedMax):"Stellenbewertung prüfen";
 else label="Individuelle Benefit-Wahl";
 return '<div class="pr-answerbox"><p class="pr-eyebrow">AUFLÖSUNG UND RECHTLICHE EINORDNUNG</p><h3>'+prEscape(label)+'</h3><p>'+prEscape(step.explanation||"")+'</p>'+
 (step.id==='benefit-parttime-v2'&&step.context?.followUp?'<div class="pr-cafe-followup"><strong>Nachfrage:</strong> '+prEscape(step.context.followUp)+'</div>':'')+
 (Array.isArray(step.sources)&&step.sources.length?'<div class="pr-note"><strong>Rechtsgrundlagen:</strong> '+step.sources.map(prEscape).join(' · ')+'</div>':'')+'</div>';
}
function prHistoryHTML(){
 const p=pr.public;
 if(!p)return "";
 const chapter=p.chapter??0;
 const history=(p.history||[]).filter(x=>x.chapter===chapter);
 if(!history.length)return "";
 return '<h3>Bereits freigegebene Ergebnisse</h3><div class="pr-history-grid">'+history.map(x=>{
  const rows=x.responses||[],kind=x.kind;
  let summary=kind==='wordcloud'?prWordCloudEntries(rows).length+" Ideen von "+rows.length+" Personen":rows.length+" Antworten";
  if(kind==='boolean'&&x.solution&&typeof x.solution.correct==='boolean'){
   const correct=rows.filter(r=>r.answer?.value===x.solution.correct).length;
   summary+=" · "+Math.round(correct/Math.max(1,rows.length)*100)+" % korrekt";
  }
  return '<div class="pr-history-card"><span class="pr-eyebrow">FRAGE '+x.seq+'</span><h4>'+prEscape(x.title)+'</h4><p>'+summary+'</p>'+
   (kind==='wordcloud'?prWordCloudHTML(rows,true):'')+
   (x.chapter===4&&kind==='boolean'?prResultRows({kind:'boolean'},rows):'')+
   (kind==='benefits'?prBars([ {label:"Paket abgegeben",count:rows.length}],rows.length,false):'')+
   (x.solution&&x.chapter!==4?'<div class="pr-note">'+prEscape(x.explanation||"")+'</div>':"")+'</div>';
 }).join("")+'</div>';
}
function prShowParticipant(){
 const p=pr.public;
 if(!p)return;
 pr$("prName").textContent=pr.name||p.name||"du";
 pr$("prSessionName").textContent=p.sessionLabel||"";
 pr$("prStatus").textContent=(p.chapter===5&&["choice","dual_choice"].includes(p.step?.kind)&&p.step?.myAnswer?(['results','revealed'].includes(p.phase)?"✓ Ergebnis freigegeben":"✓ Antwort gespeichert"):p.chapter===4&&p.step?.kind==="boolean"&&p.step?.myAnswer?"✓ Fall ausgewertet · Live-Ergebnis":p.chapter===3&&p.step?.kind==="wordcloud"&&p.step?.myAnswer?"✓ Idee abgegeben · Live-Wörterwolke":p.phase==="revealed"?"✓ Auflösung freigegeben":[1,2].includes(p.chapter)&&p.step?.myAnswer?"✓ Live-Diagramm aktiv":p.phase==="voting"?"● Abstimmung läuft":p.phase==="results"?"Ergebnisse freigegeben":p.phase==="revealed"?"Auflösung verfügbar":p.phase==="chapter_results"?"Kapitelübersicht":"Warten auf Moderation");
 pr$("prChapterNav").innerHTML=prChapterMenu();
 const c=PR_CHAPTERS[p.chapter??0];
 pr$("prChapterDetail").innerHTML='<div class="pr-chap current"><strong>'+String(p.chapter??0).padStart(2,"0")+'</strong><small>'+prEscape(c.name)+'</small></div><p class="pr-chapter-info">'+prEscape(c.subtitle)+'. Die Moderation öffnet alle Aufgaben nacheinander.</p>';
 pr$("prParticipantStats").innerHTML='<div class="pr-facts">'+prStats("Angemeldet",p.participants||0)+prStats("Aktive Geräte",p.activeParticipants||0)+'</div>';
 const step=p.step;
 if(!step){
  pr$("prCurrent").innerHTML='<p class="pr-eyebrow">KAPITEL '+String(p.chapter??0).padStart(2,"0")+' · '+prEscape(c.name)+'</p><h2>'+(p.phase==='chapter_results'?"Die Ergebnisse sind da.":"Bereit für das nächste Kapitel.")+'</h2><p class="pr-statement">'+(p.phase==='chapter_results'?"Die bisherigen Abstimmungen und Auflösungen sind unten zusammengefasst.":"Die Moderation führt euch durch jede Frage. Sobald die nächste Aufgabe freigegeben wird, erscheint sie automatisch hier.")+'</p>';
  pr$("prResultHistory").innerHTML=prHistoryHTML();return;
 }
 if(pr.stepId!==step.id){
  pr.stepId=step.id;pr.choice=null;pr.dualChoice={q1:null,q2:null};pr.salary=Number(step.context?.default??step.context?.min??0);
  pr.items=[];pr.localEdited=false;pr.reviewEditing=false;pr.wordEditing=false;pr.ideaDraft="";
 }
 const mine=step.myAnswer;
 if(mine&&pr.choice===null&&step.kind==='boolean')pr.choice=mine.value;
 if(mine&&pr.choice===null&&step.kind==='choice')pr.choice=mine.value;
 if(mine&&step.kind==='dual_choice'&&!pr.localEdited)pr.dualChoice={q1:mine.q1??null,q2:mine.q2??null};
 if(mine&&step.kind==='salary'&&!pr.localEdited)pr.salary=Number(mine.value);
 if(mine&&step.kind==='benefits'&&!pr.localEdited){pr.items=Array.isArray(mine.items)?[...mine.items]:[]}
 const open=step.phase==='voting'&&!(step.kind==='benefits'&&prSecondsLeft()===0);
 if(step.kind==='wordcloud'){
  // Keep the text field focused and update the cloud in place while live polling.
  if(open&&document.activeElement?.id==='prWordIdea'&&pr.wordViewStep===step.id&&pr.wordViewPhase===step.phase){
   const liveCloud=pr$("prWordCloudLive");
   if(liveCloud&&Array.isArray(step.responses))liveCloud.innerHTML=prWordCloudHTML(step.responses);
   return;
  }
  pr$("prCurrent").innerHTML=prWordParticipantHTML(step,open);
  pr.wordViewStep=step.id;pr.wordViewPhase=step.phase;
  pr$("prResultHistory").innerHTML=prHistoryHTML();
  return;
 }
 const hasAnswered=step.myAnswer!==null&&step.myAnswer!==undefined;
 const liveTwist=step.chapter===5&&(step.kind==='choice'||step.kind==='dual_choice')&&hasAnswered&&
  Array.isArray(step.responses)&&(step.kind!=='dual_choice'||(step.myAnswer?.q1&&step.myAnswer?.q2));
 if(liveTwist&&(!pr.reviewEditing||!open)){
  pr$("prCurrent").innerHTML='<p class="pr-eyebrow">KAPITEL 05 · RECHTS-TWIST '+(step.seq-1)+' / 3</p><h2>'+prEscape(step.title)+'</h2>'+prTwistLiveFeedbackHTML(step);
  pr$("prResultHistory").innerHTML=prHistoryHTML();
  return;
 }
 if(step.kind==='benefits'&&['results','revealed'].includes(step.phase)){
  pr$("prCurrent").innerHTML=prCafeteriaMobileResult(step);
  pr$("prResultHistory").innerHTML=prHistoryHTML();return;
 }
 const bonusFeedback=step.chapter===4&&step.kind==='boolean'&&hasAnswered&&Array.isArray(step.responses)&&typeof step.solution?.correct==='boolean';
 if(bonusFeedback&&(!pr.reviewEditing||!open)){
  pr$("prCurrent").innerHTML='<p class="pr-eyebrow">KAPITEL 04 · FALL '+step.seq+' / 4</p><h2>'+prEscape(step.title)+'</h2>'+prBonusFeedbackHTML(step);
  pr$("prResultHistory").innerHTML=prHistoryHTML();
  return;
 }
 const liveReview=[1,2].includes(step.chapter)&&hasAnswered&&Array.isArray(step.responses);
 if(liveReview&&(!pr.reviewEditing||!open)){
  const content='<p class="pr-eyebrow">KAPITEL '+String(step.chapter).padStart(2,"0")+' · FRAGE '+step.seq+' · '+prEscape(c.name)+'</p><h2>'+prEscape(step.title)+'</h2>'+prInstantFeedbackHTML(step);
  pr$("prCurrent").innerHTML=content;
  pr$("prResultHistory").innerHTML=prHistoryHTML();return;
 }
 let body='<p class="pr-eyebrow">KAPITEL '+String(step.chapter).padStart(2,"0")+' · FRAGE '+step.seq+' · '+prEscape(c.name)+'</p><h2>'+prEscape(step.title)+'</h2><p class="pr-statement">'+prEscape(step.prompt)+'</p>';
 if(step.kind==='benefits')body+=prBudgetHTML(step,!open);
 else if(step.kind==='dual_choice')body+=prDualChoiceOptions(step);
 else if(step.kind==='salary')body+=prSalaryHTML(step);
 else body+=prOptions(step);
 if(step.kind==='benefits')body+='<div class="pr-note" id="prTimerNote">'+prTimerLabel()+'</div>';
 if(open){
  body+='<div class="pr-actions"><button type="button" class="primary" data-pr="submit">'+(mine?'Auswahl aktualisieren ↗':"Antwort abschicken ↗")+'</button>'+
   (mine?'<span class="pr-pill">✓ Antwort gespeichert</span>':'')+'</div>';
 }else{
  body+='<div class="pr-note-bubble">'+(step.phase==='voting'?'Die Auswahlzeit ist abgelaufen.':step.phase==='closed'?'Die Abstimmung ist geschlossen.':step.phase==='results'?'Das Abstimmungsergebnis ist freigegeben.':step.phase==='revealed'?'Auflösung freigegeben.':'Warte auf Freigabe.')+'</div>';
 }
 if(step.responses)body+='<div class="pr-card" style="background:#f8fbfb;box-shadow:none;margin-top:20px"><h3>Live-Ergebnisse · '+step.votes+' Stimmen</h3>'+prResultRows(step,step.responses)+'</div>';
 if(step.solution&&step.chapter!==4)body+=prLegalSolution(step);
 pr$("prCurrent").innerHTML=body;
 pr$("prResultHistory").innerHTML=prHistoryHTML();
}
function prSecondsLeft(){
 const c=pr.clock;
 if(!c||!pr.public?.step||c.activeStep!==pr.public.step.id||c.duration==null||!c.openedAt)return null;
 return Math.max(0,Math.ceil(Number(c.duration)-(Number(c.serverNow)-Number(c.openedAt))-(Date.now()-Number(c.clientReceivedAt||Date.now()))/1000));
}
function prTimerLabel(){const secs=prSecondsLeft();return secs==null?"5 Minuten Auswahlzeit":secs>0?"Auswahlzeit: "+Math.floor(secs/60)+":"+String(secs%60).padStart(2,"0")+" Minuten verbleibend":"Die fünf Minuten sind abgelaufen."}
function prRenderKpis(){
 const a=pr.admin,chapterSteps=(a.steps||[]).filter(s=>s.chapter===a.chapter);
 const all=Object.values(a.votes||{}),total=all.reduce((n,arr)=>n+(arr?.length||0),0);
 const cards=[["Teilnehmer",a.participants||0],["Gespeicherte Stimmen",total],["Aktives Kapitel",String(a.chapter).padStart(2,"0")],["Kapitelaufgaben",chapterSteps.length]];
 pr$("prKpis").innerHTML=cards.map(([label,value])=>'<div class="pr-kpi"><small>'+label+'</small><strong>'+prEscape(value)+'</strong></div>').join("");
}
function prAdminChapters(){
 const a=pr.admin;
 pr$("prAdminChapters").innerHTML=PR_CHAPTERS.slice(1).map((c,j)=>'<button type="button" data-admin-chapter="'+(j+1)+'" class="pr-admin-chapter '+(a.chapter===j+1?'is-active':'')+'"><strong class="pr-number">'+String(j+1).padStart(2,"0")+'</strong><span>'+prEscape(c.name)+'<small style="display:block;font-weight:400;margin-top:5px">'+prEscape(c.subtitle)+'</small></span></button>').join("");
 pr$("prAdminSessionTag").textContent=(a.isDemo?"Demo · ":"Live · ")+a.sessionLabel;
}
function prAdminSteps(){
 const a=pr.admin;
 const steps=(a.steps||[]).filter(s=>s.chapter===a.chapter).sort((x,y)=>x.seq-y.seq);
 const status=Object.fromEntries((a.states||[]).map(s=>[s.id,s.phase]));
 pr$("prAdminChapterTitle").textContent=PR_CHAPTERS[a.chapter].name;
 pr$("prAdminSteps").innerHTML=steps.map(s=>{
  const responseList=a.votes?.[s.id]||[],count=responseList.length;
  const countText=s.kind==='wordcloud'?prWordCloudEntries(responseList).length+' Ideen von '+count+' Personen':count+' gültige Stimmen';
  return '<div class="pr-step"><div><small>FRAGE '+s.seq+' · '+prEscape(status[s.id]||"Bereit")+'</small><h4>'+prEscape(s.title)+'</h4><small>'+countText+'</small></div>'+
   prButton(a.activeStep===s.id?"Aktiv":"Starten","step","ghost small",'data-step="'+prEscape(s.id)+'" '+(a.status!=='active'?'disabled':''))+'</div>';
 }).join('');
}
function prAdminLive(){
 const a=pr.admin,step=(a.steps||[]).find(s=>s.id===a.activeStep);
 pr$("prNowTitle").textContent=step?step.title:PR_CHAPTERS[a.chapter].name;
 let html='<p class="pr-muted">'+(step?prEscape(step.prompt):"Kapitel geöffnet. Wähle eine Aufgabe aus der Liste.")+'</p>';
 if(step){
  const responses=a.votes?.[step.id]||[];
  html+='<div class="pr-facts">'+prStats("Abstimmungsphase",a.phase)+prStats(step.kind==='wordcloud'?"Teilnehmende mit Ideen":"Gültige Stimmen",responses.length)+
   (step.kind==='wordcloud'?prStats("Eingereichte Ideen",prWordCloudEntries(responses).length):"")+'</div>';
  if(step.kind==='benefits')html+='<div class="pr-note">Benefit-Auswahl: '+prTimerLabel()+'</div>';
  if(a.phase==='voting')html+='<div class="pr-admin-live-actions">'+prButton("Abstimmung schließen","close","primary wide")+'</div>';
  else if(a.phase==='closed')html+='<div class="pr-admin-live-actions">'+prButton("Ergebnisse zeigen","results","primary wide")+(step.chapter===4?"":prButton("Direkt auflösen","reveal","ghost wide"))+'</div>';
  else if(a.phase==='results'&&step.chapter!==4)html+='<div class="pr-admin-live-actions">'+prButton(step.kind==='benefits'?"Steuerinfos & Gehaltsvergleich zeigen":"Juristische Lösung zeigen","reveal","primary wide")+'</div>';
  if(step.kind==='benefits'){
   if(a.phase==='results'||a.phase==='revealed')html+='<div class="pr-admin-wordcloud">'+prCafeteriaDashboard(step,responses,a.phase==='revealed')+'</div>';
  }else if(step.kind==='wordcloud'){
   html+='<div class="pr-admin-wordcloud"><p class="pr-eyebrow">LIVE · WÖRTERWOLKE</p>'+prWordCloudHTML(responses,true)+'</div>';
   if(a.phase==='revealed')html+='<p class="pr-note-bubble">'+prEscape(step.explanation||"")+'</p>';
  }else if(step.chapter===4&&step.kind==='boolean'){
   html+='<div class="pr-admin-wordcloud"><p class="pr-eyebrow">LIVE · STIMMENVERTEILUNG</p>'+prResultRows(step,responses)+
    '<p class="pr-note">Teilnehmer sehen nach dem Abschicken nur ihre persönliche Bewertung und die Stimmenverteilung. Die ausführliche Auflösung erfolgt auf den Folien.</p></div>';
  }else if(a.phase==='results'||a.phase==='revealed'){
   html+='<div style="margin:17px 0">'+prResultRows(step,responses)+'</div>';
   if(a.phase==='revealed')html+=prLegalSolution(step);
  }
 }
 html+='<div class="pr-admin-live-actions">'+prButton("Kapitel-Ergebnisse freigeben","publish","ghost wide",a.phase==='voting'?'disabled':'')+
 prButton("Wartebildschirm","wait","ghost wide",a.phase==='voting'?'disabled':'')+'</div>';
 pr$("prAdminLive").innerHTML=html;
}
function prDashboardCard(step,answers,showSolution,phase){
 let text='<div class="pr-dash-card"><p class="pr-eyebrow">KAPITEL '+String(step.chapter).padStart(2,"0")+' · FRAGE '+step.seq+'</p><h3>'+prEscape(step.title)+'</h3>';
 if(step.chapter===5&&['benefits','choice','dual_choice'].includes(step.kind)&&!['results','revealed'].includes(phase)){
  return text+'<p class="pr-note">Die Stimmverteilung erscheint nach Ende der Abstimmung. Die Auflösung folgt ausschließlich nach Freigabe durch die Moderation.</p></div>';
 }
 text+='<p>'+(step.kind==='wordcloud'?prWordCloudEntries(answers).length+' Ideen von '+answers.length+' Personen':answers.length+' gültige Antworten')+'</p>'+
 (step.kind==='benefits'?prCafeteriaDashboard(step,answers,showSolution):prResultRows(step,answers));
 if(showSolution&&step.solution&&step.kind!=='wordcloud'&&step.kind!=='benefits'&&step.chapter!==4)text+=prLegalSolution(step);
 return text+'</div>';
}
function prRenderDashboard(){
 const a=pr.admin,chapter=pr.adminDashboard;
 const steps=(a.steps||[]).filter(s=>s.chapter===chapter).sort((x,y)=>x.seq-y.seq),statuses=Object.fromEntries((a.states||[]).map(s=>[s.id,s.phase]));
 const switcher='<div class="pr-dash-actions">'+PR_CHAPTERS.slice(1).map((c,j)=>prButton(String(j+1).padStart(2,"0")+' · '+c.name,'dashboard','ghost small '+(chapter===j+1?'active':''),'data-chapter="'+(j+1)+'"')).join("")+'</div>';
 const results=steps.map(s=>prDashboardCard(s,a.votes?.[s.id]||[],statuses[s.id]==='revealed',statuses[s.id])).join("");
 const html=switcher+'<div class="pr-dash-layout">'+results+'</div>';
 pr$("prDashboard").innerHTML=html;
 pr$("prOverlayContent").innerHTML='<div class="pr-kpis">'+[['Kapitel',String(chapter).padStart(2,"0")],['Teilnehmer',a.participants||0],['Aufgaben',steps.length]].map(([l,v])=>'<div class="pr-kpi"><small>'+l+'</small><strong>'+v+'</strong></div>').join('')+'</div>'+switcher+'<div class="pr-dash-layout">'+results+'</div>';
}
function prShowAdmin(){
 const authenticated=!!pr.password;
 pr$("prAdminLogin").classList.toggle("hidden",authenticated);
 pr$("prAdminContent").classList.toggle("hidden",!authenticated);
 if(!authenticated||!pr.admin)return;
 prRenderKpis();prAdminChapters();prAdminSteps();prAdminLive();prRenderDashboard();
}
function prRender(){
 if(pr.view==='join'){pr$("prIntroChapters").innerHTML=prPyramid();if(pr.name)pr$("prNickname").value=pr.name}
 if(pr.view==='participant')prShowParticipant();
 if(pr.view==='admin')prShowAdmin();
}
async function prFetch(silent=true){
 if(pr.polling)return;
 pr.polling=true;
 try{
  const pub=await prRpc("arb_pr_public",{p_device:pr.device});
  if(!pub.ready)throw Error("Noch keine Session vorbereitet");
  pr.public=pub;
  pr$("prConnection").innerHTML='<i></i>LIVE';
  if(pr.password){try{pr.admin=await prRpc("arb_pr_admin",{p_password:pr.password,p_action:"status"})}catch(e){
    pr.password="";sessionStorage.removeItem("nxt_admin");pr.admin=null;if(!silent)prToast(e.message);
  }}
  if(pub.step?.kind==='benefits'||pr.admin?.activeStep==='benefit-pack'){
   try{pr.clock=await prRpc("arb_pr_clock",{});pr.clock.clientReceivedAt=Date.now()}catch(e){pr.clock=null}
  }else pr.clock=null;
  if(pr.view==='participant'&&pr.name&&pr.joinedSession!==pub.sessionId){
   try{await prRpc("arb_pr_join",{p_device:pr.device,p_name:pr.name});pr.joinedSession=pub.sessionId}catch(e){if(!silent)prToast(e.message)}
  }
  if(pr.view==='join'&&pr.name&&pr.joinedSession===pub.sessionId)prSetView("participant");
  prRender();
 }catch(e){pr$("prConnection").textContent="OFFLINE";if(!silent)prToast(e.message)}
 finally{pr.polling=false}
}
async function prJoin(name){
 if(pr.busy)return;pr.busy=true;
 try{
  const response=await prRpc("arb_pr_join",{p_device:pr.device,p_name:name});
  pr.name=name;pr.joinedSession=response.sessionId;localStorage.setItem("nxt_name",name);
  await prFetch(false);prSetView("participant");
 }catch(e){prToast(e.message)}finally{pr.busy=false}
}
async function prSubmit(){
 const step=pr.public?.step;if(!step||step.phase!=='voting'||pr.busy)return;
 let ans;
 if(step.kind==='dual_choice'){
  const q1=pr.dualChoice?.q1,q2=pr.dualChoice?.q2;
  const qs=step.context?.questions||[];
  if(!q1||!q2||qs.length!==2||qs.some(q=>(q.options||[]).every(o=>o.value!==pr.dualChoice[q.id]))){
   prToast("Bitte zuerst beide Fragen von Twist 3 beantworten.");return;
  }
  ans={q1,q2};
 }else if(step.kind==='wordcloud'){
  const idea=prWordIdeaCheck(pr.ideaDraft);
  if(!idea.valid){prToast("Bitte einen Begriff oder einen Text mit höchstens 100 Zeichen eingeben.");pr$("prWordIdea")?.focus();return}
  const previous=prOwnWordIdeas(step.myAnswer);
  if(previous.length>=Number(step.context?.maxEntries||25)){prToast("Du hast bereits 25 Ideen eingereicht.");return}
  if(previous.some(v=>v.toLocaleLowerCase("de-DE")===idea.text.toLocaleLowerCase("de-DE"))){prToast("Diese Idee hast du bereits eingereicht.");return}
  ans={value:idea.text};
 }else if(step.kind==='benefits'){ans={items:[...pr.items]};
  if(prBudgetTotal(step)>(PR_PERSONAS[pr.public.persona]?.budget||100)){prToast("Budget überschritten");return}
 }else if(step.kind==='salary'){
  const c=step.context||{},n=Number(pr.salary);
  if(!Number.isFinite(n)||n<Number(c.min)||n>Number(c.max)||(n-Number(c.min))%Number(c.step)!==0){prToast("Bitte zulässigen Gehaltswert wählen");return}
  ans={value:n};
 }else{if(pr.choice===null){prToast("Bitte zuerst eine Antwort wählen");return}ans={value:pr.choice}}
 pr.busy=true;
 try{await prRpc("arb_pr_submit",{p_session:pr.public.sessionId,p_step:step.id,p_device:pr.device,p_answer:ans});pr.localEdited=false;pr.reviewEditing=false;pr.wordEditing=false;
  if(step.kind==='wordcloud')pr.ideaDraft="";
  prToast(step.kind==='wordcloud'?"Idee hinzugefügt – du kannst weitere eintragen.":"Deine Antwort wurde gespeichert.");
  // Get the post-vote chart immediately, without waiting for the regular 2.5s poll.
  if(step.chapter===5&&(step.kind==='choice'||step.kind==='dual_choice')){
   try{pr.public=await prRpc("arb_pr_public",{p_device:pr.device});prShowParticipant()}
   catch{await prFetch()}
  }else await prFetch();
  if([1,2,4,5].includes(step.chapter))pr$("prCurrent")?.scrollIntoView({behavior:"smooth",block:"start"})}
 catch(e){prToast(e.message)}finally{pr.busy=false}
}
async function prAdminAction(action,options={}){
 if(pr.busy)return;pr.busy=true;
 try{
  const data=await prRpc("arb_pr_admin",Object.assign({p_password:pr.password,p_action:action},options));
  pr.admin=data;pr.adminChapter=data.chapter;
  prToast(action==='chapter'?"Kapitel für alle geöffnet.":action==='step'?"Frage geöffnet.":action==='reveal'?"Auflösung freigegeben.":"Ansicht aktualisiert.");
  await prFetch();prShowAdmin();
 }catch(e){prToast(e.message)}finally{pr.busy=false}
}
function prChoiceClick(value){
 const step=pr.public?.step;if(step?.phase!=='voting')return;
 pr.choice=step.kind==='boolean'?value==="true":value;
 pr.localEdited=true;prRender();
}
function prSalaryUpdate(value){
 const c=pr.public?.step?.context||{},min=Number(c.min),max=Number(c.max),step=Number(c.step||1);
 if(!Number.isFinite(value))return;
 pr.salary=Math.max(min,Math.min(max,min+Math.round((value-min)/step)*step));
 pr.localEdited=true;prShowParticipant();
}
function prBenefitToggle(id){
 const step=pr.public?.step;if(!step||step.phase!=='voting')return;
 const item=prBudgetItems(step).find(b=>b.id===id);if(!item)return;
 if(pr.items.includes(id)){pr.items=pr.items.filter(x=>x!==id)}
 else if(prBudgetTotal(step)+Number(item.cost)<=(PR_PERSONAS[pr.public.persona]?.budget||100)){pr.items.push(id)}
 else {prToast("Das Budget reicht für dieses Benefit nicht aus.");return}
 pr.localEdited=true;prShowParticipant();
}
document.addEventListener("click",async e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.id==="prAdminToggle"){prSetView("admin");await prFetch();return}
 if(b.id==="prAdminBack"){prSetView(pr.name?"participant":"join");return}
 if(b.id==="prLogout"){pr.password="";sessionStorage.removeItem("nxt_admin");pr.admin=null;prShowAdmin();return}
 if(b.id==="prFinish"){if(confirm("Diese Präsentationssitzung wirklich abschließen?"))await prAdminAction("finish");return}
 if(b.id==="prPresent"){pr.overlay=true;pr$("prOverlay").classList.remove("hidden");prRenderDashboard();return}
 if(b.id==="prOverlayClose"){pr.overlay=false;pr$("prOverlay").classList.add("hidden");if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});return}
 if(b.id==="prFullScreen"){const el=pr$("prOverlay");if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else el.requestFullscreen?.().catch(()=>{});return}
 if(b.dataset.dualId!==undefined){prDualClick(b.dataset.dualId,b.dataset.dualChoice);return}
 if(b.dataset.choice!==undefined){prChoiceClick(b.dataset.choice);return}
 if(b.dataset.benefit){prBenefitToggle(b.dataset.benefit);return}
 if(b.dataset.cafeFilter!==undefined){
  if(["alle","mia","murat","sabine","tim"].includes(b.dataset.cafeFilter)){
   pr.cafeFilter=b.dataset.cafeFilter;
   if(pr.view==="admin")prShowAdmin();
  }
  return;
 }
 if(b.dataset.salaryStep){prSalaryUpdate(Number(pr.salary||0)+Number(b.dataset.salaryStep));return}
 if(b.dataset.adminChapter!==undefined){
  const chapter=Number(b.dataset.adminChapter);
  if(chapter===pr.admin?.chapter)return;
  if(pr.admin?.phase==='voting'&&!confirm("Die aktuelle Abstimmung wird verlassen. Kapitel trotzdem öffnen?"))return;
  await prAdminAction("chapter",{p_chapter:chapter});return;
 }
 if(b.dataset.pr==="word-edit"){pr.wordEditing=true;pr.ideaDraft=pr.public?.step?.myAnswer?.value||"";prShowParticipant();pr$("prWordIdea")?.focus();return}
 if(b.dataset.pr==="review-edit"){pr.reviewEditing=true;pr.localEdited=false;prShowParticipant();return}
 if(b.dataset.pr==="step"){await prAdminAction("step",{p_step:b.dataset.step});return}
 if(b.dataset.pr==="submit"){await prSubmit();return}
 if(["close","results","reveal","publish","wait"].includes(b.dataset.pr)){await prAdminAction(b.dataset.pr);return}
 if(b.dataset.pr==="dashboard"){pr.adminDashboard=Number(b.dataset.chapter);prRenderDashboard();return}
});
document.addEventListener("input",e=>{
 if(e.target.id==="prWordIdea"){
  pr.ideaDraft=e.target.value;
  const idea=prWordIdeaCheck(pr.ideaDraft);
  const hint=pr$("prWordHint");
  if(hint)hint.textContent=idea.text.length+" / 100 Zeichen · Ein Wort oder mehrere Wörter möglich";
 }
 if(e.target.id==="prSalarySlider"){prSalaryUpdate(Number(e.target.value))}
});
document.addEventListener("keydown",e=>{
 if(e.target.id==="prWordIdea"&&e.key==="Enter"){e.preventDefault();prSubmit()}
});
document.addEventListener("change",e=>{
 if(e.target.id==="prSalaryNumber")prSalaryUpdate(Number(e.target.value));
});
pr$("prJoinForm").addEventListener("submit",e=>{e.preventDefault();prJoin(pr$("prNickname").value.trim())});
pr$("prAdminForm").addEventListener("submit",async e=>{
 e.preventDefault();pr.password=pr$("prAdminPassword").value;sessionStorage.setItem("nxt_admin",pr.password);
 try{pr.admin=await prRpc("arb_pr_admin",{p_password:pr.password,p_action:"status"});pr$("prAdminPassword").value="";prShowAdmin()}
 catch(err){pr.password="";sessionStorage.removeItem("nxt_admin");prToast(err.message)}
});
pr$("prNewSession").addEventListener("submit",async e=>{
 e.preventDefault();const label=pr$("prNewSessionName").value.trim();
 if(!confirm("Neue Session \""+label+"\" starten? Die bisherigen Daten bleiben erhalten."))return;
 await prAdminAction("new",{p_label:label,p_demo:pr$("prDemo").checked});
 pr$("prNewSessionName").value="";
});
prRender();
if(pr.name)prSetView("participant");
prFetch(false);
setInterval(()=>prFetch(),2500);
setInterval(()=>{
 const label=pr$("prTimerNote");if(label)label.textContent=prTimerLabel();
},1000);
