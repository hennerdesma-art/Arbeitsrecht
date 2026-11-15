"use strict";
/* NXT Dashboard 2.0 - presentation views; does not change vote storage or server rules */
const nx=id=>document.getElementById(id);
const NXT_CHART_MODES=["bars","donut","cards","table"];
const NXT_PALETTE=["#008b93","#28baa9","#e1af52","#668caa","#6bbdc0","#a4d5cb","#4f7e90"];
const dash={workspace:"live",chart:"bars",gallery:"tiles",presentation:"round",presentChart:"bars",pinnedRound:null};

function chartRows(round,answers){
  const a=Array.isArray(answers)?answers:[];
  const selections=summarize(round,a);
  const answerCount=a.length;
  const totalChoices=selections.reduce((acc,row)=>acc+Number(row.count||0),0);
  return selections.map((row,i)=>({
    label:row.label,count:Number(row.count||0),color:NXT_PALETTE[i%NXT_PALETTE.length],
    percent:answerCount>0?Math.round(row.count/answerCount*100):0,
    share:totalChoices>0?row.count/totalChoices*100:0
  }));
}
function dashBarChart(round,answers,compact=false){
  const rows=chartRows(round,answers);
  return '<div class="dash-bars">'+rows.map(row=>'<div class="dash-bar-item">'+
    '<div class="dash-row-title"><span>'+esc(row.label)+'</span><span class="count">'+row.count+' · '+row.percent+' %</span></div>'+
    '<div class="dash-track"><span style="--w:'+row.percent+'%"></span></div></div>').join('')+'</div>'+
    (!compact&&round==="benefits"?'<p class="dashboard-annotation">Mehrfachauswahl: Die Prozentwerte zeigen den Anteil der Teilnehmenden, die den jeweiligen Benefit gewählt haben. Die Summe kann über 100 % liegen.</p>':'');
}
function dashDonutChart(round,answers){
  const rows=chartRows(round,answers);
  const total=rows.reduce((s,r)=>s+r.count,0);
  let acc=0;
  const stops=rows.map(row=>{const start=acc;acc+=row.share;return row.color+" "+start.toFixed(2)+"% "+acc.toFixed(2)+"%"}).join(",");
  const gradient=total>0?"conic-gradient("+stops+")":"conic-gradient(#deebeb 0% 100%)";
  return '<div class="dash-donut-layout">'+
    '<div class="dash-donut" style="background:'+gradient+'"><div class="dash-donut-center"><strong>'+total+'</strong><span>'+(round==="benefits"?"Auswahlen":"Stimmen")+'</span></div></div>'+
    '<div class="dash-legend">'+rows.map(row=>'<div><i class="dash-legend-dot" style="background:'+row.color+'"></i><span class="dash-legend-text">'+esc(row.label)+'</span><strong>'+(total?Math.round(row.share):0)+' %</strong></div>').join('')+'</div></div>'+
    '<p class="dashboard-annotation">'+(round==="benefits"?"Beim Kreisdiagramm sind alle Benefit-Auswahlen die Bezugsgröße, nicht die Anzahl der Teilnehmenden.":"Der Kreis zeigt die Verteilung der abgegebenen Stimmen.")+'</p>';
}
function dashCardChart(round,answers){
  const rows=chartRows(round,answers);
  return '<div class="dash-cards">'+rows.map((row,i)=>'<div class="dash-choice-card"><div class="overline">OPTION '+String(i+1).padStart(2,"0")+'</div>'+
  '<div class="percentage">'+row.percent+' %</div><div class="c-label">'+esc(row.label)+'</div><div class="count">'+row.count+' Stimme'+(row.count===1?"":"n")+'</div></div>').join('')+'</div>'+
  (round==="benefits"?'<p class="dashboard-annotation">Mehrfachauswahl – Prozentwerte pro teilnehmendem Gerät.</p>':'');
}
function dashTableChart(round,answers){
  const rows=chartRows(round,answers);
  return '<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>Antwort / Benefit</th><th>Stimmen</th><th>Anteil</th><th>Verteilung</th></tr></thead>'+
    '<tbody>'+rows.map(row=>'<tr><td>'+esc(row.label)+'</td><td>'+row.count+'</td><td>'+row.percent+' %</td><td><div class="barline"><i style="width:'+row.percent+'%"></i></div></td></tr>').join('')+'</tbody></table></div>'+
    (round==="benefits"?'<p class="dashboard-annotation">Mehrere Benefits je Person möglich – Anteile können sich auf mehr als 100 % addieren.</p>':'');
}
function advancedChartHTML(round,answers,mode="bars",compact=false){
  const a=Array.isArray(answers)?answers:[];
  if(!a.length) return '<div class="dashboard-empty"><strong>0</strong>Noch keine Stimmen. Sobald Teilnehmer abstimmen, erscheinen die Ergebnisse hier live.</div>';
  switch(mode){
    case "donut":return dashDonutChart(round,a);
    case "cards":return dashCardChart(round,a);
    case "table":return dashTableChart(round,a);
    default:return dashBarChart(round,a,compact);
  }
}
function dashVotes(round){return (app.adminResults?.votes||[]).filter(x=>x.round===round).map(x=>x.answer)}
function updateDashButtons(){
  document.querySelectorAll("#workspaceTabs [data-workspace]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.workspace===dash.workspace)));
  ["live","questions","all","compare"].forEach(name=>nx("workspace-"+name)?.classList.toggle("hidden",dash.workspace!==name));
  document.querySelectorAll("#adminViewModes [data-chart-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.chartView===dash.chart)));
  document.querySelectorAll("#questionGalleryModes [data-gallery]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.gallery===dash.gallery)));
  nx("allRoundCards")?.classList.toggle("list-mode",dash.gallery==="list");
}
function galleryHTML(){
 const current=app.state?.activeRound||"start";
 return ROUNDS.map((r,i)=>{
  const count=dashVotes(r.id).length;
  const text=r.intro.length>159?r.intro.slice(0,156)+"…":r.intro;
  return '<article class="quiz-gallery-card '+(r.id===current?"is-active":"")+'">'+
    '<div><div class="tiny-label">RUNDE '+String(i).padStart(2,"0")+(r.id===current?" · LIVE":"")+'</div><h3>'+esc(r.title)+'</h3><p>'+esc(text)+'</p></div>'+
    '<div class="card-foot"><span class="dashboard-pill"><strong>'+count+'</strong> Stimmen</span>'+
    (r.id===current?'<span class="dashboard-pill">● Aktiv</span>':'<button type="button" class="ghost small" data-open-question="'+r.id+'">Runde aktivieren ↗</button>')+
    '</div></article>';
 }).join("");
}
function allResultsHTML(compact=true){
 return ROUNDS.map((r,i)=>{
  const answers=dashVotes(r.id);
  return '<article class="master-round"><div class="master-round-title"><small>FRAGE '+String(i).padStart(2,"0")+'</small>'+
  '<strong>'+esc(r.title)+'</strong><span class="dashboard-pill" style="margin-top:13px"><strong>'+answers.length+'</strong> Stimmen</span></div>'+
  '<div class="dashboard-chart">'+advancedChartHTML(r.id,answers,"bars",compact)+'</div></article>';
 }).join("");
}
function comparisonHTML(){
 const first=dashVotes("start"),last=dashVotes("final");
 const a=chartRows("start",first).find(r=>r.label.startsWith("Mir fehlen"));
 const b=chartRows("final",last).find(r=>r.label.startsWith("Mir fehlen"));
 const ready=first.length>0&&last.length>0;
 const delta=ready?(b.percent-a.percent):null;
 const summary=ready?'<div class="history-highlight"><strong>'+(delta>0?"+":"")+delta+' Prozentpunkte</strong>Veränderung beim Anteil „Mir fehlen entscheidende Informationen“ (aggregierter Vergleich).</div>':'<div class="history-highlight">Sobald sowohl bei der Einstiegs- als auch bei der Schlussfrage Stimmen vorliegen, wird die Veränderung hier gezeigt.</div>';
 return '<div class="history-grid"><div class="history-compare"><span class="overline">VOR DER LEHREINHEIT</span><h3>01 · Einstiegsfrage</h3>'+
 advancedChartHTML("start",first,dash.chart)+'</div><div class="history-compare"><span class="overline">NACH DER LEHREINHEIT</span><h3>07 · Abschlussfrage</h3>'+
 advancedChartHTML("final",last,dash.chart)+'</div></div><div style="margin-top:17px">'+summary+'</div>'+
 '<p class="dashboard-annotation">Die beiden Abstimmungen werden als Gruppenwerte verglichen. Gleiche Teilnehmende oder individuelle Meinungswechsel werden nicht verifiziert.</p>';
}
function renderAdvancedDashboard(){
 if(!app.adminPass||!app.adminResults)return;
 const votes=app.adminResults.votes||[];
 const round=app.state?.activeRound||"start";
 const active=ROUNDS.find(r=>r.id===round)||ROUNDS[0];
 const localAnswers=dashVotes(round);
 nx("totalVotes").textContent=votes.length;
 nx("currentDashboardTitle").textContent=active.title;
 nx("liveStatistics").innerHTML='<span class="dashboard-pill"><strong>'+localAnswers.length+'</strong> Stimmen dieser Runde</span>'+
 '<span class="dashboard-pill">'+(app.state?.accepting?"● Abstimmung offen":"◌ Abstimmung pausiert")+'</span>'+
 '<span class="dashboard-pill">'+(app.state?.revealed?"Ergebnis sichtbar":"Ergebnis verborgen")+'</span>';
 nx("adminChart").innerHTML=advancedChartHTML(round,localAnswers,dash.chart);
 nx("allRoundCards").innerHTML=galleryHTML();
 nx("allRoundResults").innerHTML=allResultsHTML();
 nx("comparisonDashboard").innerHTML=comparisonHTML();
 updateDashButtons();
 if(!nx("presentationModal").classList.contains("hidden"))refreshDashboardPresentation();
}
function activateDashboardWorkspace(name){
 if(!["live","questions","all","compare"].includes(name))return;
 dash.workspace=name;
 if(app.adminPass)renderAdvancedDashboard();
}
function openDashboardPresentation(mode="round"){
 dash.presentation=mode;
 dash.pinnedRound=null;
 nx("presentationModal").classList.remove("hidden");
 refreshDashboardPresentation();
}
function presentationHero(round,answers){
 const ix=ROUNDS.findIndex(x=>x.id===round.id);
 return '<div class="presentation-hero"><div><span class="hero-kicker">NXT / '+esc(round.short).toUpperCase()+' / '+String(ix).padStart(2,"0")+'</span>'+
 '<h3>'+esc(round.title)+'</h3><p>'+esc(round.intro)+'</p></div>'+
 '<div class="presentation-number">'+answers.length+'<div style="font-size:14px;text-align:right;color:#c5ebe8">STIMMEN</div></div></div>';
}
function refreshDashboardPresentation(){
 if(nx("presentationModal").classList.contains("hidden"))return;
 document.querySelectorAll("#presentTabs [data-present]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.present===dash.presentation)));
 document.querySelectorAll("#presentModeButtons [data-present-chart]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.presentChart===dash.presentChart)));
 const panel=nx("presentationResults");
 const active=app.state?.activeRound||"start";
 if(dash.presentation==="round"){
  const id=dash.pinnedRound||active;
  const r=ROUNDS.find(x=>x.id===id)||ROUNDS[0],a=dashVotes(r.id),index=ROUNDS.indexOf(r);
  nx("presentationTitle").textContent="Frage "+(index+1)+" · "+r.short;
  panel.innerHTML='<div class="dashboard-toolbar-row"><button type="button" class="ghost" data-pnav="prev" '+(index===0?"disabled":"")+'>← Vorherige Frage</button>'+
  '<span class="overline">FRAGE '+(index+1)+' / '+ROUNDS.length+'</span>'+
  '<button type="button" class="ghost" data-pnav="next" '+(index===ROUNDS.length-1?"disabled":"")+'>Nächste Frage →</button></div>'+
  presentationHero(r,a)+'<div class="dashboard-chart">'+advancedChartHTML(r.id,a,dash.presentChart)+'</div>';
 }else if(dash.presentation==="all"){
  nx("presentationTitle").textContent="Gesamtübersicht · alle Fragen";
  panel.innerHTML='<div class="master-dashboard">'+allResultsHTML(true)+'</div>';
 }else{
  nx("presentationTitle").textContent="Die Entwicklung · vorher & nachher";
  const start=dashVotes("start"),end=dashVotes("final");
  panel.innerHTML='<div class="history-grid">'+
  '<div class="history-compare"><span class="overline">01 / EINSTIEG</span><h3>Was ist eigentlich fair?</h3>'+
   '<span class="dashboard-pill"><strong>'+start.length+'</strong> Stimmen</span><div style="margin-top:22px" class="dashboard-chart">'+advancedChartHTML("start",start,dash.presentChart)+'</div></div>'+
  '<div class="history-compare"><span class="overline">07 / ABSCHLUSS</span><h3>Was ist eigentlich fair?</h3>'+
   '<span class="dashboard-pill"><strong>'+end.length+'</strong> Stimmen</span><div style="margin-top:22px" class="dashboard-chart">'+advancedChartHTML("final",end,dash.presentChart)+'</div></div></div>'+
  '<p class="dashboard-annotation">Aggregierter Vorher-Nachher-Vergleich. Nicht als individueller Lernfortschrittsnachweis interpretieren.</p>';
 }
}
nx("workspaceTabs").addEventListener("click",e=>{const b=e.target.closest("[data-workspace]");if(b)activateDashboardWorkspace(b.dataset.workspace)});
nx("adminViewModes").addEventListener("click",e=>{const b=e.target.closest("[data-chart-view]");if(b){dash.chart=b.dataset.chartView;renderAdvancedDashboard()}});
nx("questionGalleryModes").addEventListener("click",e=>{const b=e.target.closest("[data-gallery]");if(b){dash.gallery=b.dataset.gallery;renderAdvancedDashboard()}});
nx("allRoundCards").addEventListener("click",e=>{const b=e.target.closest("[data-open-question]");if(!b)return;control("activate",b.dataset.openQuestion,null).then(()=>activateDashboardWorkspace("live"))});
nx("presentAllResults").addEventListener("click",()=>openDashboardPresentation("all"));
nx("presentComparison").addEventListener("click",()=>openDashboardPresentation("compare"));
nx("presentTabs").addEventListener("click",e=>{const b=e.target.closest("[data-present]");if(b){dash.presentation=b.dataset.present;dash.pinnedRound=null;refreshDashboardPresentation()}});
nx("presentModeButtons").addEventListener("click",e=>{const b=e.target.closest("[data-present-chart]");if(b){dash.presentChart=b.dataset.presentChart;refreshDashboardPresentation()}});
nx("presentationResults").addEventListener("click",e=>{const b=e.target.closest("[data-pnav]");if(!b)return;const id=dash.pinnedRound||app.state?.activeRound||"start";const index=ROUNDS.findIndex(r=>r.id===id);const next=Math.max(0,Math.min(ROUNDS.length-1,index+(b.dataset.pnav==="next"?1:-1)));dash.pinnedRound=ROUNDS[next].id;refreshDashboardPresentation()});
nx("browserFullscreen").addEventListener("click",async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(nx("presentationModal").requestFullscreen)await nx("presentationModal").requestFullscreen();else toast("Browser-Vollbild ist hier nicht verfügbar.")}catch(e){toast("Vollbild konnte nicht geöffnet werden.")}});
document.addEventListener("fullscreenchange",()=>{nx("browserFullscreen").textContent=document.fullscreenElement?"Vollbild verlassen":"⛶ Vollbild"});
