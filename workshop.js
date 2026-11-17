"use strict";
/* NXT Workshop controller: participant games + server-controlled moderation. */
const API="https://trqhbzzwpamcyxzxaxmk.supabase.co/rest/v1/rpc/";
const KEY="sb_publishable_MdUD-YPx8HT7WO7MnOqVLQ_fW5-Cnvn";
const $=id=>document.getElementById(id);
const ws={name:localStorage.getItem("nxt_name")||"",device:localStorage.getItem("nxt_device")||"",
 adminPass:sessionStorage.getItem("nxt_admin")||"",public:null,admin:null,mode:"join",tab:"executive",
 selected:null,salary:null,busy:false,fetching:false,overlay:false,filter:"all"};
if(!ws.device){ws.device=crypto.randomUUID();localStorage.setItem("nxt_device",ws.device)}
async function rpc(fn,body={}){
 const r=await fetch(API+fn,{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
 let v;try{v=await r.json()}catch{v={message:"Keine Verbindung zum Server"}}
 if(!r.ok)throw Error(v.message||"Serverfehler");return v;
}
let toastTimeout;
function toast(s){$("wsToast").textContent=s;$("wsToast").classList.remove("hidden");clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$("wsToast").classList.add("hidden"),4000)}
function phaseName(p){return({ready:"Vorbereitung",voting:"Abstimmung geöffnet",closed:"Abstimmung geschlossen",revealed:"Lösung freigegeben"})[p]||"Bereit"}
function setMode(mode){
 ws.mode=mode;const maps={join:"wsJoin",participant:"wsPlay",admin:"wsAdmin"};
 Object.values(maps).forEach(id=>$(id).classList.toggle("hidden",id!==maps[mode]));
 if(mode==="participant")renderPlayer();
 if(mode==="admin")renderAdmin();
 window.scrollTo({top:0,behavior:"smooth"});
}
async function join(name=ws.name){
 name=(name||"").trim();if(name.length<2||name.length>30)throw Error("Bitte einen Namen von 2 bis 30 Zeichen verwenden");
 await rpc("arb_ws_join",{p_device:ws.device,p_name:name});
 ws.name=name;localStorage.setItem("nxt_name",name);
}
async function refresh(){
 if(ws.fetching)return;ws.fetching=true;
 try{
  const oldSession=ws.public?.sessionId,oldQuestion=ws.public?.activeQuestion?.id;
  const oldPhase=ws.public?.activeQuestion?.phase;
  const editingSalary=["wsRange","wsExactAmount"].includes(document.activeElement?.id);
  const editingSession=document.activeElement?.id==="wsNewSessionLabel";
  ws.public=await rpc("arb_ws_public",{p_device:ws.device});
  if(ws.name&&ws.public?.sessionId&&ws.public.sessionId!==oldSession){
    await join();ws.public=await rpc("arb_ws_public",{p_device:ws.device});
  }
  if(oldQuestion!==ws.public?.activeQuestion?.id){ws.selected=null;ws.salary=null}
  $("wsConnection").className="connection online";$("wsConnection").innerHTML="<i></i>LIVE VERBUNDEN";
  if(ws.mode==="participant"){
    if(!editingSalary||oldQuestion!==ws.public?.activeQuestion?.id||oldPhase!==ws.public?.activeQuestion?.phase)renderPlayer();
    else $("wsSupport").textContent=ws.public.participants+" registriert · "+ws.public.activeParticipants+" online · "+(ws.public.activeQuestion?.voted||0)+" Stimmen in dieser Runde";
  }
  if(ws.mode==="admin"&&ws.adminPass){
   ws.admin=await rpc("arb_ws_admin",{p_password:ws.adminPass,p_action:"status"});
   if(!editingSession)renderAdmin();else renderKpis();
   if(ws.overlay)renderOverlay();
  }
 }catch(e){
  $("wsConnection").className="connection offline";$("wsConnection").innerHTML="<i></i>OFFLINE";
  if(ws.mode!=="join")toast(e.message);
 }finally{ws.fetching=false}
}
function factualCards(q){
 const f=q.context?.facts||[];
 return f.length?'<div class="ws-facts">'+f.map(x=>'<div class="ws-fact"><span>'+wsEsc(x[0])+'</span><strong>'+wsEsc(x[1])+'</strong></div>').join("")+'</div>':"";
}
function selectedValid(q,v){
 const c=q.context||{};
 return Number.isFinite(v)&&v>=c.min&&v<=c.max&&((v-c.min)%c.step===0);
}
function answerUI(q){
 const disabled=q.phase!=="voting",v=q.myAnswer?.value;
 if(q.kind==="boolean"){
   const answer=ws.selected===null?v:ws.selected;
   return '<div class="ws-options">'+[[true,"Richtig"],[false,"Falsch"]].map(([n,label])=>
    '<button type="button" class="ws-answer" data-answer="'+n+'" aria-pressed="'+(answer===n)+'" '+(disabled?"disabled":"")+
    '><span class="ws-radio"></span>'+label+'</button>').join("")+'</div>';
 }
 const c=q.context,n=ws.salary===null?(typeof v==="number"?v:Number(c.default??c.min)):ws.salary;
 return '<div class="ws-salary-module"><div class="ws-eyebrow">DEIN ANGEBOT · BRUTTO / '+wsEsc(c.unit).toUpperCase()+'</div>'+
 '<div class="ws-salary-value" id="wsAmountLabel">'+wsEuro(n)+' <small>/ '+wsEsc(c.unit)+'</small></div>'+
 '<div class="ws-range-controls"><button class="ws-stepper" type="button" id="wsMinus" '+(disabled?"disabled":"")+'>−</button>'+
 '<input id="wsRange" type="range" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+n+'" aria-label="Gehalt wählen" '+(disabled?"disabled":"")+'>'+
 '<button class="ws-stepper" type="button" id="wsPlus" '+(disabled?"disabled":"")+'>+</button></div>'+
 '<div class="ws-range-labels"><span>'+wsEuro(c.min)+'</span><span>'+wsEuro(c.max)+'</span></div>'+
 '<div class="ws-amount-field"><label for="wsExactAmount">Betrag direkt eingeben</label>'+
 '<input id="wsExactAmount" type="number" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" inputmode="numeric" value="'+n+'" '+(disabled?"disabled":"")+'></div>'+
 '<p class="ws-tiny" id="wsAmountError" style="color:#a56651;min-height:18px"></p></div>';
}
function revealUI(q){
 const s=q.solution||{},isSalary=q.kind==="salary";
 let headline=isSalary?(s.category==="legal_minimum"?"Tarifgrenze: "+wsEuro(s.minimum):s.needsReview?"Neue Stellenbewertung erforderlich":"HR-Empfehlung: "+wsEuro(s.recommendedMin)+"–"+wsEuro(s.recommendedMax)):
 "Juristisch richtig: "+(s.correct?"Richtig":"Falsch");
 return '<div class="ws-explain-panel ws-fade"><div class="ws-eyebrow">RECHTLICHE & FACHLICHE AUFLÖSUNG</div>'+
 '<div class="ws-flash"><strong>'+wsEsc(headline)+'</strong>'+(isSalary&&s.category!=="legal_minimum"?"Kein gesetzlich zwingender Gehaltswert.":"")+'</div>'+
 '<h3>Begründung</h3><p>'+wsEsc(q.explanation)+'</p><h3>HR-Praxis</h3><p>'+wsEsc(q.hrTakeaway)+'</p>'+
 '<div class="ws-legal-sources">'+(q.sources||[]).map(source=>'<a href="'+wsEsc(source.url)+'" target="_blank" rel="noopener noreferrer">'+wsEsc(source.label)+' ↗</a>').join("")+'</div></div>';
}
function participantDistribution(q){
 const d=q.distribution;
 if(d==null)return"";
 let out=q.kind==="boolean"?
 wsBars([{label:"Richtig",count:Number(d.true||0)},{label:"Falsch",count:Number(d.false||0)}],q.voted):
 wsHistogram(Array.isArray(d)?d.map(Number):[],q.context);
 return '<div class="ws-panel" style="margin-top:17px"><div class="ws-eyebrow">ANONYMISIERTE ERGEBNISSE</div>'+out+
 (q.phase==="revealed"?"":'<p class="ws-tiny">Die richtige Antwort ist noch nicht freigeschaltet.</p>')+'</div>';
}
function renderPlayer(){
 if(!ws.name){setMode("join");return}
 const data=ws.public,q=data?.activeQuestion;
 $("wsPlayerName").textContent=ws.name;$("wsSessionLabel").textContent=data?.sessionLabel||"Präsentationssitzung";
 $("wsPhaseTag").textContent=q?phaseName(q.phase):"Auf die nächste Frage warten";
 $("wsProgress").textContent="12 Aufgaben · 2 Ebenen";
 document.querySelectorAll(".ws-level-item").forEach(el=>el.classList.toggle("is-active",Number(el.dataset.level)===q?.level));
 if(!data?.ready){
  $("wsQuestion").innerHTML='<div class="ws-empty">Keine Präsentationssitzung vorbereitet.</div>';return;
 }
 if(!q){
  $("wsQuestion").innerHTML='<div class="ws-eyebrow">LIVE-WARTERAUM</div><h2>Die nächste Frage kommt gleich.</h2>'+
  '<p class="statement">Die Moderation schaltet die Aufgaben nacheinander frei. Du kannst dieses Fenster geöffnet lassen.</p>'+
  '<div class="ws-flash"><strong>✓ Du bist angemeldet.</strong>'+data.participants+' Geräte registriert.</div>';
  $("wsSupport").textContent="Der Start erfolgt durch die Moderation.";return;
 }
 let html='<div class="ws-eyebrow">EBENE '+q.level+' · '+(q.level===1?"RECHTSSICHERHEIT":"FIXGEHALT")+' · FRAGE '+q.seq+'/6</div>'+
 '<h2>'+wsEsc(q.title)+'</h2><div class="ws-prompt">'+wsEsc(q.topic)+'</div>'+
 factualCards(q)+'<p class="statement">'+wsEsc(q.statement)+'</p>'+answerUI(q);
 if(q.phase==="voting"){
  html+='<button type="button" class="primary ws-submit" id="wsSubmit" '+(ws.busy?"disabled":"")+'>'+(q.myAnswer?"Antwort aktualisieren ↗":"Antwort abgeben ↗")+'</button>';
  if(q.myAnswer)html+='<div class="ws-flash"><strong>✓ Antwort gespeichert.</strong>Bis zum Schließen kannst du sie ändern. Es zählt weiterhin nur eine Stimme.</div>';
  else html+='<p class="ws-tiny">Eine gültige Stimme pro Browser-ID und Frage. Änderungen ersetzen die bisherige Antwort.</p>';
 }else if(q.phase==="closed"){
  html+='<div class="ws-flash neutral"><strong>Abstimmung beendet.</strong>Die Antwort ist gesperrt. Die Moderation kann nun die juristische Lösung freigeben.</div>';
 }else if(q.phase==="revealed"){
  html+='<div class="ws-flash"><strong>Auflösung freigegeben.</strong>Jetzt folgt die fachliche Einordnung.</div>'+revealUI(q);
 }else{
  html+='<div class="ws-flash neutral">Auf Freigabe durch die Moderation warten.</div>';
 }
 html+=participantDistribution(q);
 $("wsQuestion").innerHTML=html;
 $("wsSupport").textContent=data.participants+" registriert · "+data.activeParticipants+" online · "+q.voted+" Stimmen in dieser Runde";
 if(q.phase==="voting"){
  if(q.kind==="boolean"){
   document.querySelectorAll("[data-answer]").forEach(btn=>btn.addEventListener("click",()=>{ws.selected=btn.dataset.answer==="true";renderPlayer()}));
  }else bindSalary(q);
  $("wsSubmit")?.addEventListener("click",()=>submit(q));
 }
}
function bindSalary(q){
 const c=q.context,range=$("wsRange"),num=$("wsExactAmount"),label=$("wsAmountLabel"),error=$("wsAmountError"),button=$("wsSubmit");
 const update=v=>{
  ws.salary=v;label.innerHTML=wsEuro(v)+' <small>/ '+wsEsc(c.unit)+'</small>';
  const valid=selectedValid(q,v);
  error.textContent=valid?"":"Betrag im erlaubten Bereich und in Schritten von "+wsEuro(c.step)+" eingeben.";
  button.disabled=!valid||ws.busy;
 };
 range.addEventListener("input",()=>{num.value=range.value;update(Number(range.value))});
 num.addEventListener("input",()=>{const value=num.value===""?NaN:Number(num.value);if(Number.isFinite(value))range.value=Math.max(c.min,Math.min(c.max,value));update(value)});
 for(const [id,multiplier] of [["wsMinus",-1],["wsPlus",1]]){
  $(id).addEventListener("click",()=>{const v=Math.max(c.min,Math.min(c.max,Number(range.value)+multiplier*c.step));range.value=v;num.value=v;update(v)});
 }
}
async function submit(q){
 if(ws.busy)return;
 const value=q.kind==="boolean"?(ws.selected===null?q.myAnswer?.value:ws.selected):Number(ws.salary===null?(q.myAnswer?.value??q.context.default):ws.salary);
 if(q.kind==="boolean"&&typeof value!=="boolean"){toast("Wähle Richtig oder Falsch.");return}
 if(q.kind==="salary"&&!selectedValid(q,value)){toast("Ungültiger Gehaltsbetrag.");return}
 ws.busy=true;$("wsSubmit")?.setAttribute("disabled","true");
 try{await rpc("arb_ws_submit",{p_session:ws.public.sessionId,p_question:q.id,p_device:ws.device,p_answer:{value}});
  toast("Antwort gespeichert ✓");await refresh();
 }catch(e){toast(e.message)}finally{ws.busy=false;renderPlayer()}
}
function renderKpis(){
 const d=ws.admin,q=wsQuestion(d.activeQuestion),n=q?wsVotes(q.id).length:0;
 const completed=(d.questionStates||[]).filter(x=>["closed","revealed"].includes(x.phase)).length;
 const values=[
 ["REGISTRIERTE TEILNEHMER",d.participants||0],["AKTUELL AKTIV",d.activeParticipants||0],
 ["EINGEGANGENE STIMMEN",(d.votes||[]).length],["TEILNAHMEQUOTE",wsPct(n,d.participants||0)+" %"],
 ["FORTSCHRITT",completed+" / 12"]
 ];
 $("wsKpis").innerHTML=values.map(([label,n])=>'<div class="ws-kpi"><div class="ws-kpi-label">'+wsEsc(label)+'</div><strong>'+wsEsc(n)+'</strong></div>').join("");
}
function adminControlHTML(){
 const d=ws.admin,active=wsQuestion(d.activeQuestion),state=active?d.questionStates.find(s=>s.id===active.id):null;
 return '<div class="ws-panel-grid wide ws-fade"><div class="ws-panel"><div class="ws-eyebrow">SITZUNG VERWALTEN</div><h3>'+wsEsc(d.sessionLabel)+'</h3>'+
 '<div class="ws-big-callout"><strong>'+(d.isDemo?"DEMO":"LIVE")+'</strong>'+wsEsc(d.sessionStatus)+'</div>'+
 '<div class="ws-buttonrow"><select id="wsSessionSelect" class="ws-select" aria-label="Session">'+d.sessions.map(s=>
 '<option value="'+s.id+'" '+(s.id===d.sessionId?"selected":"")+'>'+wsEsc(s.label)+(s.isDemo?" · DEMO":"")+'</option>').join("")+'</select>'+
 '<button class="ghost" data-ws-action="switch-session">Session wechseln</button></div>'+
 '<div class="ws-eyebrow" style="margin:18px 0 10px">NEUE SESSION</div>'+
 '<input id="wsNewSessionLabel" class="ws-input" placeholder="Bezeichnung (mind. 3 Zeichen)" maxlength="90">'+
 '<div class="ws-buttonrow"><button class="primary" data-ws-action="new-live">Neue Live-Session</button><button class="secondary" data-ws-action="new-demo">Neue Demo-Session</button></div>'+
 '<p class="ws-tiny">Neue Sessions starten ohne Stimmen. Vorherige Ergebnisse werden nicht gelöscht.</p>'+
 '<div class="ws-buttonrow"><button class="ghost" data-ws-action="finish">Session abschließen</button>'+
 (d.isDemo?'<button class="ghost" data-ws-action="reset-demo">Demo-Daten zurücksetzen</button>':'')+'</div></div>'+
 '<div class="ws-panel"><div class="ws-eyebrow">SPIELPHASEN</div><h3>Frage steuern</h3>'+
 (active?'<div class="ws-big-callout"><strong>'+wsEsc(active.title)+'</strong>'+phaseName(state?.phase)+'</div>':
 '<div class="ws-empty">Wähle unten eine Frage aus.</div>')+
 '<div class="ws-buttonrow">'+(active?
 '<button class="secondary" data-ws-action="close">Abstimmung schließen</button><button class="primary" data-ws-action="reveal">Lösung zeigen</button><button class="ghost" data-ws-action="skip">Überspringen</button>':'')+'</div>'+
 (active?'<label class="ws-tiny"><input id="wsShowDistribution" type="checkbox" style="width:auto" '+(state?.publicDistribution?"checked":"")+
 '> Antwortverteilung (ohne Lösung) den Teilnehmenden anzeigen</label>':'')+
 '<div class="ws-buttonrow"><button class="ghost" data-ws-action="present">Beamer-Dashboard ↗</button></div>'+
 '<p class="ws-tiny">Start → Abstimmen → Schließen → Auflösung. Ohne Freigabe bleiben Lösungen verborgen.</p></div></div>'+
 '<div class="ws-panel" style="margin-top:18px"><div class="ws-eyebrow">AUFGABENKATALOG</div><h3>Die 12 Aufgaben</h3>'+
 '<div class="ws-buttonrow"><button class="ghost small" data-ws-action="filter-all">Alle</button><button class="ghost small" data-ws-action="filter-1">Ebene 01</button><button class="ghost small" data-ws-action="filter-2">Ebene 02</button></div>'+
 '<div class="ws-question-list">'+d.questions.filter(q=>ws.filter==="all"||q.level===Number(ws.filter)).map(q=>
 '<div class="ws-question-row"><div><strong>'+q.level+'.'+q.seq+' '+wsEsc(q.title)+'</strong><small>'+wsEsc(q.topic)+' · '+wsVotes(q.id).length+' Stimmen</small></div>'+
 '<span class="ws-tag '+wsPhase(q.id)+'">'+wsEsc(phaseName(wsPhase(q.id)))+'</span>'+
 '<button type="button" class="ghost small" data-start-question="'+q.id+'">Starten ↗</button></div>').join("")+'</div></div>';
}
function renderAdmin(){
 if(ws.mode!=="admin")return;
 $("wsAdminLogin").classList.toggle("hidden",!!ws.adminPass);
 $("wsAdminContent").classList.toggle("hidden",!ws.adminPass);
 if(!ws.adminPass||!ws.admin)return;
 renderKpis();
 document.querySelectorAll("#wsAdminTabs [data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===ws.tab));
 const views={executive:wsExecutiveHTML,legal:wsLegalHTML,salary:wsSalaryHTML,compare:wsCompareHTML,control:adminControlHTML};
 $("wsPanel").innerHTML=views[ws.tab]();
 $("wsPanel").querySelectorAll("[data-ws-action]").forEach(b=>b.addEventListener("click",()=>onAction(b.dataset.wsAction)));
 $("wsPanel").querySelectorAll("[data-start-question]").forEach(b=>b.addEventListener("click",()=>changeAdmin("start",{p_question:b.dataset.startQuestion})));
 $("wsShowDistribution")?.addEventListener("change",e=>changeAdmin("distribution",{p_flag:e.target.checked}));
}
async function adminLogin(){
 ws.admin=await rpc("arb_ws_admin",{p_password:ws.adminPass,p_action:"status"});
 renderAdmin();
}
async function changeAdmin(action,params={}){
 if(ws.busy)return;ws.busy=true;
 try{ws.admin=await rpc("arb_ws_admin",{p_password:ws.adminPass,p_action:action,...params});toast("Änderung gespeichert ✓");await refresh();renderAdmin()}
 catch(e){toast(e.message)}finally{ws.busy=false}
}
async function onAction(action){
 if(action==="control-tab"){ws.tab="control";renderAdmin();return}
 if(action==="present"){ws.overlay=true;$("wsOverlay").classList.remove("hidden");renderOverlay();return}
 if(action.startsWith("filter-")){ws.filter=action.slice(7);renderAdmin();return}
 if(action==="switch-session"){const sid=$("wsSessionSelect")?.value;if(sid)await changeAdmin("switch",{p_session:sid});return}
 if(action==="new-live"||action==="new-demo"){
  const label=$("wsNewSessionLabel")?.value.trim();if(!label||label.length<3){toast("Bitte einen Session-Namen eingeben.");return}
  if(confirm("Neue "+(action==="new-demo"?"Demo":"Live")+"-Session starten?"))await changeAdmin("create",{p_label:label,p_demo:action==="new-demo"});return;
 }
 if(action==="finish"){if(confirm("Session abschließen? Daten bleiben erhalten."))await changeAdmin("finish");return}
 if(action==="reset-demo"){if(confirm("Alle Stimmen und Teilnehmenden dieser Demo-Session löschen?"))await changeAdmin("reset_demo");return}
 if(action==="reveal"&&wsPhase(ws.admin.activeQuestion)!=="closed"){toast("Zuerst die Abstimmung schließen.");return}
 if(["close","reveal","skip"].includes(action))await changeAdmin(action);
}
function renderOverlay(){
 if(!ws.admin||!ws.overlay)return;
 $("wsOverlayBody").innerHTML=wsPresentationHTML();
}
function downloadCSV(){
 const d=ws.admin;if(!d)return;
 const rows=[["Session","Ebene","Frage","Typ","Antwort","Zeitstempel"]];
 d.votes.forEach(v=>{const q=wsQuestion(v.questionId);if(q)rows.push([d.sessionLabel,q.level,q.id,q.kind,v.answer?.value,v.time])});
 const csv="\ufeff"+rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="NXT-Arbeitsrecht-"+d.sessionId.slice(0,8)+".csv";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$("wsJoinForm").addEventListener("submit",async e=>{e.preventDefault();try{await join($("wsNickname").value);await refresh();setMode("participant")}catch(err){toast(err.message)}});
$("wsAdminButton").addEventListener("click",async()=>{setMode("admin");if(ws.adminPass)try{await adminLogin()}catch(e){toast(e.message)}});
$("wsAdminBack").addEventListener("click",()=>setMode(ws.name?"participant":"join"));
$("wsAdminForm").addEventListener("submit",async e=>{e.preventDefault();ws.adminPass=$("wsAdminPassword").value;try{await adminLogin();sessionStorage.setItem("nxt_admin",ws.adminPass);$("wsAdminPassword").value="";renderAdmin()}catch(err){ws.adminPass="";toast(err.message);renderAdmin()}});
$("wsAdminTabs").addEventListener("click",e=>{const b=e.target.closest("[data-tab]");if(b){ws.tab=b.dataset.tab;renderAdmin()}});
$("wsAdminRefresh").addEventListener("click",refresh);
$("wsAdminLogout").addEventListener("click",()=>{ws.adminPass="";ws.admin=null;sessionStorage.removeItem("nxt_admin");renderAdmin()});
$("wsExport").addEventListener("click",downloadCSV);
$("wsOverlayClose").addEventListener("click",()=>{ws.overlay=false;$("wsOverlay").classList.add("hidden")});
$("wsFullScreen").addEventListener("click",async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $("wsOverlay").requestFullscreen()}catch{toast("Vollbild nicht verfügbar")}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&ws.overlay){ws.overlay=false;$("wsOverlay").classList.add("hidden")}});
if(ws.name){$("wsNickname").value=ws.name;setMode("participant")}else setMode("join");
refresh();setInterval(refresh,3500);
