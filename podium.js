"use strict";
/* NXT Podium | Live leaderboard backed by server-scored, session-scoped RPC. */
const award={data:null,session:null,updated:0,loading:false,selected:0,all:false,preview:false};
function awardAvatar(){return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="20" r="12" fill="currentColor"/><path d="M8 60c2-17 14-26 24-26s22 9 24 26" fill="currentColor"/></svg>'}
function awardPlace(row,place){
 return '<div class="award-place award-place-'+place+'"><div class="award-avatar">'+(place===1?'<span class="award-crown" aria-hidden="true">♛</span>':'')+awardAvatar()+'</div><div class="award-step"><span class="award-medal">'+place+'</span><strong class="award-person">'+(row?prEscape(row.name):'Noch frei')+'</strong><span class="award-points">'+(row?row.points+' Punkte':'–')+'</span></div></div>';
}
function awardHTML(data){
 const rows=Array.isArray(data.leaderboard)?data.leaderboard:[],top=rows.slice(0,3);
 const chosen=rows[award.selected]||rows[0],nf=new Intl.NumberFormat('de-DE',{maximumFractionDigits:1});
 const average=rows.length?rows.reduce((s,r)=>s+Number(r.points||0),0)/rows.length:0;
 const ranking=rows.slice(0,award.all?rows.length:5).map((r,i)=>'<button type="button" data-award="person" data-index="'+i+'" aria-pressed="'+(i===award.selected)+'" class="award-rank '+(i===award.selected?'selected':'')+'"><span class="award-number">'+r.rank+'</span><span>'+prEscape(r.name)+'</span><strong>'+r.points+' P.</strong></button>').join('')||'<p>Noch keine Teilnehmenden vorhanden.</p>';
 const details=chosen?'<div class="award-profile"><span class="award-profile-avatar">'+awardAvatar()+'</span><div><strong>'+prEscape(chosen.name)+'</strong><small>Platz '+chosen.rank+' · '+chosen.points+' Punkte</small></div></div><div class="award-metrics"><div><strong>'+chosen.points+' / '+chosen.answered+'</strong><small>Richtig / beantwortet</small></div><div><strong>'+nf.format(chosen.accuracy||0)+' %</strong><small>Trefferquote</small></div></div>':'<p>Wähle eine Person aus der Rangliste.</p>';
 return '<div class="award-shell"><div class="award-header"><div><p>NXT · QUIZ · SIEGEREHRUNG</p><h1>Herzlichen Glückwunsch!</h1><span>'+prEscape(data.sessionLabel||'')+' · Die Quiz-Session ist abgeschlossen.</span></div><span class="award-done">✓ Abgeschlossen</span></div>'+
 '<div class="award-kpis"><div><strong>'+rows.length+'</strong><small>Teilnehmende</small></div><div><strong>'+Number(data.totalQuestions||0)+'</strong><small>Bewertbare Teilfragen</small></div><div><strong>'+nf.format(average)+'</strong><small>Ø Punkte</small></div><div><strong>Top 3</strong><small>auf dem Siegerpodest</small></div></div>'+
 '<div class="award-layout"><aside class="award-panel award-details"><h2>Ergebnis-Details</h2><p><small>Höchste Punktzahl</small><strong>'+(rows[0]?.points??0)+' Punkte</strong></p><p><small>Durchschnitt</small><strong>'+nf.format(average)+' Punkte</strong></p><p><small>Maximal erreichbar</small><strong>'+Number(data.totalQuestions||0)+' Punkte</strong></p><p class="award-explain">Gewertet werden objektiv richtige Antworten. Schätzungen, Wörterwolke und Cafeteria-Auswahl bleiben unbewertet.</p></aside>'+
 '<section class="award-center"><h2>Die drei Bestplatzierten</h2><div class="award-scene"><div class="award-wreath" aria-hidden="true"></div><div class="award-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="award-stage">'+awardPlace(top[1],2)+awardPlace(top[0],1)+awardPlace(top[2],3)+'</div></div></section>'+
 '<aside class="award-aside"><div class="award-panel"><div class="award-panel-top"><h2>Gesamtrangliste</h2><button type="button" data-award="more">'+(award.all?'Weniger':'Alle ('+rows.length+')')+'</button></div><div class="award-ranking">'+ranking+'</div></div><div class="award-panel"><h2>Teilnehmendendetails</h2>'+details+'</div></aside></div>'+
 '<div class="award-actions"><button type="button" data-award="reload">↻ Aktualisieren</button><button type="button" data-award="more" class="award-main-button">'+(award.all?'Top 5 anzeigen':'Vollständige Rangliste')+'</button><button type="button" data-award="csv">↓ CSV herunterladen</button><button type="button" data-award="fullscreen">⛶ Vollbild</button></div></div>';
}
function awardRender(){
 for(const id of ['awardPublic','awardPreviewBody']){
  const node=document.getElementById(id);if(!node)continue;
  node.innerHTML=award.data?.ready?awardHTML(award.data):'<div class="award-empty">'+(award.loading?'Lade Siegerehrung …':'Die Siegerehrung wird nach dem Abschluss der Session freigegeben.')+'</div>';
 }
}
async function awardFetch(force=false){
 const sid=pr.public?.sessionId||pr.admin?.sessionId;
 if(award.loading||(!force&&award.session===sid&&Date.now()-award.updated<6500))return;
 award.loading=true;awardRender();
 try{const data=await prRpc('arb_pr_leaderboard',pr.password?{p_password:pr.password}:{});
  award.data=data;award.session=data.sessionId||sid;award.updated=Date.now();
  award.selected=Math.min(award.selected,Math.max(0,(data.leaderboard?.length||1)-1));
 }catch(error){award.data={ready:false};prToast('Siegerehrung: '+error.message)}
 finally{award.loading=false;awardRender()}
}
(function installAward(){
 const participant=document.getElementById('prParticipant');
 participant?.insertAdjacentHTML('beforeend','<div id="awardPublic" class="hidden"></div>');
 document.getElementById('prFinish')?.insertAdjacentHTML('beforebegin','<button id="awardPreviewButton" type="button" class="primary full pr-mt">🏆 Siegerehrung anzeigen</button>');
 document.body.insertAdjacentHTML('beforeend','<div id="awardPreview" role="dialog" aria-modal="true" aria-label="Siegerehrung" class="award-preview hidden"><div class="award-preview-bar"><strong>NXT · Siegerehrung</strong><button class="ghost small" id="awardClose" type="button">Schließen ×</button></div><div id="awardPreviewBody"></div></div>');
 const old=prShowParticipant;
 prShowParticipant=function(){
  const finished=pr.public?.status==='finished';
  participant?.classList.toggle('award-mode',finished);
  document.getElementById('awardPublic')?.classList.toggle('hidden',!finished);
  if(finished){awardFetch();return}old();
 };
 document.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.id==='awardPreviewButton'){award.preview=true;document.getElementById('awardPreview').classList.remove('hidden');await awardFetch(true);document.getElementById('awardClose').focus();return}
  if(b.id==='awardClose'){award.preview=false;document.getElementById('awardPreview').classList.add('hidden');return}
  if(!b.dataset.award)return;
  if(b.dataset.award==='person'){award.selected=Number(b.dataset.index)||0;awardRender()}
  if(b.dataset.award==='more'){award.all=!award.all;awardRender()}
  if(b.dataset.award==='reload')await awardFetch(true);
  if(b.dataset.award==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await (b.closest('.award-preview,.award-shell')||document.getElementById('awardPublic')).requestFullscreen()}catch{prToast('Vollbild nicht verfügbar')}}
  if(b.dataset.award==='csv'&&award.data?.ready){
   const records=[['Rang','Name','Punkte','Beantwortet','Maximal','Trefferquote'],...award.data.leaderboard.map(r=>[r.rank,r.name,r.points,r.answered,r.possible,r.accuracy])];
   const csv='\ufeff'+records.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n');
   const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='NXT-Quiz-Rangliste.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&award.preview){award.preview=false;document.getElementById('awardPreview').classList.add('hidden')}});
})();
