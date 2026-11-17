"use strict";
/* Dashboard chart and statistical helpers. Functions are used by workshop.js. */
function wsEsc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function wsEuro(v){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(v)}
function wsPct(n,d){return d?Math.round(100*n/d):0}
function wsValidNumbers(v){return v.filter(x=>typeof x==="number"&&Number.isFinite(x))}
function wsPercentile(v,p){v=wsValidNumbers(v).sort((a,b)=>a-b);if(!v.length)return null;const x=(v.length-1)*p,l=Math.floor(x),h=Math.ceil(x);return v[l]+(v[h]-v[l])*(x-l)}
function wsStats(v){v=wsValidNumbers(v);return v.length?{n:v.length,avg:v.reduce((a,b)=>a+b,0)/v.length,median:wsPercentile(v,.5),q1:wsPercentile(v,.25),q3:wsPercentile(v,.75),min:Math.min(...v),max:Math.max(...v)}:null}
function wsBars(rows,total){
 return '<div class="ws-dash-bars">'+rows.map(row=>'<div class="ws-dash-row"><span>'+wsEsc(row.label)+'</span><strong>'+row.count+' · '+wsPct(row.count,total)+' %</strong><div class="ws-dash-track"><i style="width:'+wsPct(row.count,total)+'%"></i></div></div>').join("")+'</div>';
}
function wsHistogram(values,c){
 values=wsValidNumbers(values);const n=Math.max(2,Math.min(16,Math.round((c.max-c.min)/c.step)+1)),bins=Array(n).fill(0);
 values.forEach(v=>{const i=Math.max(0,Math.min(n-1,Math.floor((v-c.min)/(c.max-c.min+c.step)*n)));bins[i]++});
 const max=Math.max(1,...bins);
 return '<div class="ws-histogram">'+bins.map(k=>'<div class="ws-histbar" style="height:'+Math.max(1,k/max*100)+'%;'+(k?'':'opacity:.13;')+'" title="'+k+' Stimmen"><span class="ws-tip">'+k+' Stimmen</span></div>').join("")+'</div>'+
 '<div class="ws-histlabels"><span>'+wsEuro(c.min)+'</span><span>'+wsEuro(c.max)+'</span></div><p class="ws-tiny">'+values.length+' gültige Gehaltsentscheidungen</p>';
}
function wsBand(q,v,revealed){
 const c=q.context,sol=q.solution||{},pos=x=>Math.max(0,Math.min(100,100*(x-c.min)/(c.max-c.min)));
 let body='<div class="ws-band-track"></div>';
 if(revealed){
 if(c.marketMin!=null)body+='<div class="ws-band-market" style="left:'+pos(c.marketMin)+'%;width:'+(pos(c.marketMax)-pos(c.marketMin))+'%"></div>';
 if(sol.recommendedMin!=null)body+='<div class="ws-band-rec" style="left:'+pos(sol.recommendedMin)+'%;width:'+(pos(sol.recommendedMax)-pos(sol.recommendedMin))+'%"></div>';
 if(c.tariffMin!=null||c.budgetMax!=null){const x=c.tariffMin??c.budgetMax;body+='<div class="ws-band-line" style="left:'+pos(x)+'%" data-label="'+(c.tariffMin?"Tarifgrenze":"Budget")+'"></div>'}
 }
 body+=wsValidNumbers(v).map(x=>'<i class="ws-band-dot" title="'+wsEuro(x)+'" style="left:'+pos(x)+'%"></i>').join("");
 return '<div class="ws-salary-band"><div class="ws-eyebrow">VERTEILUNG IM GEHALTSBAND</div><div class="ws-band-axis">'+body+'</div>'+
 '<div class="ws-band-labels"><span>'+wsEuro(c.min)+'</span><span>'+wsEuro(c.max)+'</span></div><p class="ws-tiny">'+
 (revealed?'Türkis = Marktkorridor · Sand = HR-Empfehlung · Linie = Budget-/Tarifgrenze. ':'')+'Punkte = abgegebene Gehaltsentscheidungen.</p></div>';
}
function wsStatCards(v){const s=wsStats(v);if(!s)return '<div class="ws-empty">Noch keine Gehaltswerte eingegangen.</div>';
 return '<div class="ws-cardlist">'+[['Mittelwert',s.avg],['Median',s.median],['Minimum',s.min],['Maximum',s.max],['25. Perzentil',s.q1],['75. Perzentil',s.q3]].map(([label,n])=>
 '<div class="ws-legal-card"><div class="ws-tiny">'+label+'</div><div class="ws-stat-value">'+wsEuro(Math.round(n))+'</div></div>').join("")+'</div>';
}
function wsAdminQuestions(){return ws.admin?.questions||[]}
function wsQuestion(id){return wsAdminQuestions().find(q=>q.id===id)}
function wsPhase(id){return ws.admin?.questionStates?.find(q=>q.id===id)?.phase||"ready"}
function wsVotes(id){return (ws.admin?.votes||[]).filter(v=>v.questionId===id).map(v=>v.answer?.value)}
function wsScore(q){const v=wsVotes(q.id),correct=v.filter(x=>x===q.solution.correct).length;return{total:v.length,correct,incorrect:v.length-correct,rate:wsPct(correct,v.length)}}
function wsLegalSum(level){const eligible=wsAdminQuestions().filter(q=>q.level===level&&q.kind==="boolean"&&wsPhase(q.id)==="revealed");
 const scores=eligible.map(wsScore),total=scores.reduce((a,b)=>a+b.total,0),correct=scores.reduce((a,b)=>a+b.correct,0);
 return{total,correct,rate:wsPct(correct,total),count:eligible.length};
}
function wsQuestionCard(q){
 const arr=wsVotes(q.id),phase=wsPhase(q.id),revealed=phase==="revealed",v=wsValidNumbers(arr);
 let out='<article class="ws-legal-card"><div class="ws-eyebrow">'+wsEsc(q.topic)+' · '+wsEsc(phase)+'</div><h4>'+wsEsc(q.title)+'</h4><p class="ws-tiny">'+arr.length+' Stimmen</p>';
 if(q.kind==="boolean"){
  out+=wsBars([{label:"Richtig",count:arr.filter(x=>x===true).length},{label:"Falsch",count:arr.filter(x=>x===false).length}],arr.length);
  if(revealed)out+='<div class="ws-big-callout" style="margin-top:15px"><strong>'+wsScore(q).rate+' % korrekt</strong>'+wsEsc(q.hrTakeaway)+'</div>';
 }else{
  out+=wsHistogram(v,q.context);
  if(revealed)out+=wsBand(q,v,true);
 }
 if(revealed)out+='<p class="ws-tiny">'+wsEsc(q.explanation)+'</p><div class="ws-legal-sources">'+(q.sources||[]).map(s=>'<a href="'+wsEsc(s.url)+'" target="_blank" rel="noopener noreferrer">'+wsEsc(s.label)+' ↗</a>').join("")+'</div>';
 else out+='<p class="ws-tiny">Juristische Lösung bis zur Auflösung verborgen.</p>';
 return out+'</article>';
}
function wsExecutiveHTML(){
 const d=ws.admin,current=wsQuestion(d.activeQuestion),num=current?wsVotes(current.id).length:0,registered=d.participants||0;
 const completed=(d.questionStates||[]).filter(s=>["closed","revealed"].includes(s.phase)).length;
 const a=wsLegalSum(1),b=wsLegalSum(2);
 return '<div class="ws-panel-grid wide ws-fade">'+
 '<div class="ws-panel"><div class="ws-eyebrow">AKTUELLE LEHRFRAGE</div><h3>'+wsEsc(current?.title||"Noch keine Frage geöffnet")+'</h3>'+
 '<div class="ws-big-callout"><strong>'+wsEsc(current?["","Rechtssicherheit","Fixgehalt"][current.level]:"Bereit")+'</strong>'+
 wsEsc(current?wsPhase(current.id):"Präsentationssitzung vorbereiten")+'</div><div style="margin-top:22px">'+
 wsBars([{label:"Stimmen eingegangen",count:num},{label:"Noch ohne Stimme",count:Math.max(0,registered-num)}],registered)+'</div>'+
 '<p class="ws-tiny">Quote '+wsPct(num,registered)+' % · Basis '+registered+' registrierte Browser-IDs</p>'+
 '<div class="ws-buttonrow"><button class="primary" data-ws-action="control-tab">Spiel steuern ↗</button><button class="ghost" data-ws-action="present">Beamer ↗</button></div></div>'+
 '<div class="ws-panel"><div class="ws-eyebrow">LERNANALYSE</div><h3>Vergütungspyramide · 2 Ebenen</h3>'+
 '<div class="ws-cardlist"><div class="ws-legal-card"><div class="ws-eyebrow">01 · RECHTSSICHERHEIT</div><div class="ws-stat-value">'+(a.total?a.rate+" %":"—")+'</div><p class="ws-tiny">Juristische Korrektheit aus '+a.count+' aufgelösten Fragen · n='+a.total+'</p></div>'+
 '<div class="ws-legal-card"><div class="ws-eyebrow">02 · FIXGEHALT</div><div class="ws-stat-value">'+(b.total?b.rate+" %":"—")+'</div><p class="ws-tiny">Nur juristischer Gehaltscheck · n='+b.total+'</p></div></div>'+
 '<div style="margin-top:23px"><div class="ws-eyebrow">FORTSCHRITT</div>'+
 wsBars([{label:"Gesamte Aufgaben abgeschlossen",count:completed}],12)+'</div></div></div>';
}
function wsLegalHTML(){
 const questions=wsAdminQuestions().filter(q=>q.level===1),rated=questions.filter(q=>wsPhase(q.id)==="revealed"&&wsVotes(q.id).length).map(q=>({q,s:wsScore(q)})),sum=wsLegalSum(1);
 const hardest=rated.slice().sort((a,b)=>a.s.rate-b.s.rate)[0],topicGroups=[...new Set(questions.map(q=>q.topic.split(" · ")[0]))];
 const heat='<div class="ws-heatmap">'+topicGroups.map(t=>{
 const group=rated.filter(x=>x.q.topic.startsWith(t)),n=group.reduce((s,x)=>s+x.s.total,0),correct=group.reduce((s,x)=>s+x.s.correct,0),rate=wsPct(correct,n);
 return '<div class="ws-heat" style="background:'+(n?'rgba(0,139,147,'+(0.07+(100-rate)/350)+')':'#edf4f3')+'"><span>'+wsEsc(t)+'</span><strong>'+(n?rate+" %":"—")+'</strong><span>n = '+n+'</span></div>';
 }).join("")+'</div>';
 return '<div class="ws-panel-grid ws-fade"><div class="ws-panel"><div class="ws-eyebrow">01 · RECHTSSICHERHEIT</div><h3>Juristische Trefferquote</h3>'+
 '<div class="ws-big-callout"><strong>'+(sum.total?sum.rate+" %":"Noch keine")+'</strong>Korrektheit über alle bereits aufgelösten Antworten · n = '+sum.total+'</div>'+
 '<div style="margin-top:19px">'+rated.map(x=>'<div class="ws-dash-row"><span>Frage '+x.q.seq+' · '+wsEsc(x.q.title)+'</span><strong>'+x.s.rate+' % · n='+x.s.total+'</strong>'+
 '<div class="ws-dash-track"><i style="width:'+x.s.rate+'%"></i><i class="bad" style="width:'+(100-x.s.rate)+'%"></i></div></div>').join("")+
 '</div><p class="ws-tiny">Gestapelte Balken = korrekte / nicht korrekte Stimmen; nur nach Auflösung.</p></div>'+
 '<div class="ws-panel"><div class="ws-eyebrow">PROBLEMFELDER</div><h3>Schwierigste Rechtsbereiche</h3>'+
 (hardest?'<div class="ws-big-callout"><strong>'+wsEsc(hardest.q.title)+'</strong>'+hardest.s.rate+' % korrekte Antworten · n = '+hardest.s.total+'</div>':'<div class="ws-empty">Nach den ersten Auflösungen werden die Schwierigkeitsschwerpunkte sichtbar.</div>')+
 '<div class="ws-eyebrow" style="margin:24px 0 13px">HEATMAP NACH RECHTSGEBIET</div>'+heat+'</div></div>'+
 '<div class="ws-panel" style="margin-top:18px"><div class="ws-eyebrow">FRAGEN 1–6</div><h3>Einzelne Aufgaben und Rechtsgrundlagen</h3>'+
 '<div class="ws-cardlist">'+questions.map(wsQuestionCard).join("")+'</div></div>';
}
function wsSalaryHTML(){
 const qs=wsAdminQuestions().filter(q=>q.level===2),salary=qs.filter(q=>q.kind==="salary"),legal=qs.filter(q=>q.kind==="boolean");
 let out='<div class="ws-panel ws-fade"><div class="ws-eyebrow">02 · FIXGEHALT</div><h3>Gehaltsmanager · Verteilungen</h3>'+
 '<p class="ws-muted">Die Gehaltswerte sind tatsächliche Teilnehmerentscheidungen aus dieser Session, keine Musterwerte.</p><div class="ws-cardlist">'+
 salary.map(q=>'<div class="ws-legal-card"><div class="ws-eyebrow">'+wsEsc(q.topic)+'</div><h4>'+wsEsc(q.title)+'</h4>'+
 wsHistogram(wsVotes(q.id),q.context)+(wsStats(wsVotes(q.id))?'<p class="ws-tiny">Mittelwert '+wsEuro(Math.round(wsStats(wsVotes(q.id)).avg))+' · Median '+wsEuro(Math.round(wsStats(wsVotes(q.id)).median))+'</p>':'')+'</div>').join("")+'</div></div>';
 for(const q of salary){
  const v=wsVotes(q.id),revealed=wsPhase(q.id)==="revealed";
  out+='<div class="ws-panel" style="margin-top:18px"><div class="ws-eyebrow">'+wsEsc(q.topic)+'</div><h3>'+wsEsc(q.title)+'</h3>'+
  wsStatCards(v)+wsBand(q,v,revealed);
  if(revealed){
    if(q.solution.category==="legal_minimum"){
      const low=wsValidNumbers(v).filter(x=>x<q.solution.minimum),ok=v.length-low.length,avg=low.length?low.reduce((s,x)=>s+q.solution.minimum-x,0)/low.length:0;
      out+='<div class="ws-big-callout"><strong>'+wsPct(ok,v.length)+' % rechtskonform</strong>'+low.length+' Entscheidungen unter '+wsEuro(q.solution.minimum)+' · durchschnittliche Unterschreitung '+wsEuro(Math.round(avg))+'</div>';
    }else if(q.solution.needsReview)out+='<div class="ws-flash warning"><strong>Stellenbewertung prüfen.</strong>Neue Führungsverantwortung kann eine neue Eingruppierung begründen.</div>';
    else out+='<div class="ws-big-callout"><strong>HR-Empfehlung '+wsEuro(q.solution.recommendedMin)+'–'+wsEuro(q.solution.recommendedMax)+'</strong>Orientierungsbereich, keine gesetzliche Untergrenze.</div>';
    out+='<p class="ws-tiny">'+wsEsc(q.explanation)+'</p>';
  }else out+='<p class="ws-tiny">Fachliche Grenzwerte werden nach der Auflösung eingeblendet.</p>';
  out+='</div>';
 }
 return out+'<div class="ws-panel" style="margin-top:18px"><div class="ws-eyebrow">RECHTLICHER GEHALTSCHECK</div><h3>Fragen 4–6</h3><div class="ws-cardlist">'+legal.map(wsQuestionCard).join("")+'</div></div>';
}
function wsCompareHTML(){
 const a=wsLegalSum(1),b=wsLegalSum(2),salary=wsAdminQuestions().filter(q=>q.kind==="salary"),bad=wsAdminQuestions().filter(q=>q.kind==="boolean"&&wsPhase(q.id)==="revealed"&&wsVotes(q.id).length).sort((x,y)=>wsScore(x).rate-wsScore(y).rate);
 return '<div class="ws-panel-grid ws-fade"><div class="ws-panel"><div class="ws-eyebrow">ZWEI EBENEN</div><h3>Vergleich des Rechtsverständnisses</h3>'+
 '<div class="ws-cardlist"><div class="ws-legal-card"><span class="ws-eyebrow">RECHTSSICHERHEIT</span><div class="ws-stat-value">'+(a.total?a.rate+" %":"—")+'</div><p class="ws-tiny">n='+a.total+' Antworten</p></div>'+
 '<div class="ws-legal-card"><span class="ws-eyebrow">GEHALTSRECHT</span><div class="ws-stat-value">'+(b.total?b.rate+" %":"—")+'</div><p class="ws-tiny">n='+b.total+' Antworten</p></div></div>'+
 '<p class="ws-tiny">Die Gehaltsregler werden nicht künstlich als Richtig/Falsch gewertet.</p></div>'+
 '<div class="ws-panel"><div class="ws-eyebrow">GEHALTSENTSCHEIDUNGEN</div><h3>Median je Fall</h3>'+
 salary.map(q=>'<div class="ws-question-row"><div><strong>'+wsEsc(q.title)+'</strong><small>'+wsVotes(q.id).length+' Entscheidungen</small></div>'+
 '<div><strong>'+(wsStats(wsVotes(q.id))?wsEuro(Math.round(wsStats(wsVotes(q.id)).median)):"—")+'</strong><small>Median</small></div></div>').join("")+'</div></div>'+
 '<div class="ws-panel" style="margin-top:18px"><div class="ws-eyebrow">DISKUSSION</div><h3>Fragen mit den meisten Fehleinschätzungen</h3>'+
 (bad.length?'<div class="ws-cardlist">'+bad.slice(0,4).map(wsQuestionCard).join("")+'</div>':'<div class="ws-empty">Dafür müssen zuerst juristische Auflösungen freigegeben werden.</div>')+'</div>';
}
function wsPresentationHTML(){
 const q=wsQuestion(ws.admin.activeQuestion),v=q?wsVotes(q.id):[],p=q?wsPhase(q.id):"ready";
 let content='<div class="ws-panel"><div class="ws-eyebrow">NXT · PRÄSENTATIONS-DASHBOARD</div><h3>'+wsEsc(q?.title||"Bereit für die erste Frage")+'</h3>'+
 '<p class="ws-muted">'+wsEsc(q?.statement||"Starte eine Frage im Moderator-Dashboard.")+'</p>'+
 '<div class="ws-big-callout"><strong>'+v.length+' Stimmen</strong>'+wsEsc(p)+' · '+(ws.admin.activeParticipants||0)+' aktuell aktive Geräte</div>';
 if(q){
  content+='<div style="margin-top:25px">'+(q.kind==="boolean"?wsBars([{label:"Richtig",count:v.filter(x=>x===true).length},{label:"Falsch",count:v.filter(x=>x===false).length}],v.length):wsHistogram(v,q.context))+'</div>';
  if(p==="revealed")content+='<div class="ws-flash"><strong>'+(q.kind==="boolean"?(q.solution.correct?"Richtig":"Falsch"):q.solution.category==="legal_minimum"?"Tarifliche Untergrenze "+wsEuro(q.solution.minimum):"HR-Empfehlung / Neubewertung")+'</strong>'+wsEsc(q.explanation)+'</div>';
 }
 content+='</div><div class="ws-panel" style="margin-top:17px"><div class="ws-eyebrow">BEREITS AUFGELÖSTE FRAGEN</div><h3>Alle Ergebnisse</h3>'+
 '<div class="ws-cardlist">'+wsAdminQuestions().filter(x=>wsPhase(x.id)==="revealed").map(wsQuestionCard).join("")+'</div></div>';
 return content;
}
