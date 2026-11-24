"use strict";
/* NXT Chapter 5: menu analytics. Only newly valid no-cash answers count. */
function prCafeteriaValidRows(step, responses, persona="alle") {
 const catalog=prBudgetItems(step), allowed=new Set(catalog.map(b=>b.id));
 return (Array.isArray(responses)?responses:[]).filter(row=>{
  const a=row.answer, who=row.persona;
  if(persona!=="alle"&&who!==persona)return false;
  if(!a||!Array.isArray(a.items)||Object.prototype.hasOwnProperty.call(a,"cash"))return false;
  if(a.items.length!==new Set(a.items).size||a.items.some(id=>!allowed.has(id)))return false;
  const budget=PR_PERSONAS[who]?.budget;
  if(!budget)return false;
  const cost=catalog.filter(b=>a.items.includes(b.id)).reduce((sum,b)=>sum+Number(b.cost||0),0);
  return cost<=budget;
 });
}
function prCafeteriaBarRows(step,responses,persona="alle"){
 const valid=prCafeteriaValidRows(step,responses,persona),count=valid.length;
 const rows=prBudgetItems(step).map(b=>({label:b.label,count:valid.filter(v=>v.answer.items.includes(b.id)).length}));
 return '<p class="pr-cafe-denominator">'+count+' gültige Pakete · Anteile je Benefit bezogen auf die abgegebenen Pakete'+(persona==='alle'?'':' dieser Persona')+'.</p>'+
  (count?prBars(rows,count,true):'<p class="pr-cafe-empty">Noch keine gültigen Pakete im gewählten Segment.</p>');
}
function prCafeteriaTaxHTML(step){
 const items=prBudgetItems(step);
 if(!items.some(b=>b.tax))return '';
 return '<div class="pr-cafe-tax"><h3>Steuerliche Einordnung der Benefits</h3><p>Die Voraussetzungen der jeweiligen Steuerbefreiung müssen im Einzelfall erfüllt sein.</p><div class="pr-cafe-taxgrid">'+items.map(b=>
  '<div class="pr-cafe-taxitem"><strong>'+prEscape(b.icon||'')+' '+prEscape(b.label)+'</strong><span>'+prEscape(b.tax||'Steuerliche Behandlung prüfen')+'</span></div>'
 ).join('')+'</div></div>';
}
function prCafeteriaComparison(){
 return '<div class="pr-cafe-comparison"><p class="pr-eyebrow">GEDANKENSPIEL · GEHALT ODER BENEFITS?</p><h3>100 € zusätzlich als Gehalt?</h3><div class="pr-cafe-comparison-numbers"><span><strong>100 €</strong><small>vereinfachte Benefit-Werte</small></span><span>vs.</span><span><strong>ca. 40–50 €</strong><small>Netto aus 100 € Gehaltserhöhung</small></span></div><p>Hätte NovaTech die 100 € stattdessen als Gehaltserhöhung gezahlt, kämen nach Steuern und Sozialabgaben nur ca. 40–50 € netto an (vereinfacht). Steuerfreie Benefits kommen in voller Höhe an – sofern die gesetzlichen Voraussetzungen erfüllt sind. Soweit Zusätzlichkeit erforderlich ist, dürfen sie nicht auf den Arbeitslohn angerechnet oder an seine Stelle gesetzt werden (§ 8 Abs. 4 EStG). Für das Spiel gibt es keine Bargeld-Alternative.</p><small>Didaktisches Modell, keine individuelle Lohnsteuerberechnung. Urlaubstage sind ein Zeitvorteil, keine Nettoeinnahme.</small></div>';
}
function prCafeteriaDashboard(step,responses,revealed){
 const persona=pr.cafeFilter||'alle';
 const filters=[['alle','Alle'],...Object.entries(PR_PERSONAS).map(([key,value])=>[key,value.name])];
 return '<section class="pr-cafe-dashboard" aria-label="Gewählte Benefits"><div class="pr-cafe-dashboard-head"><div><p class="pr-eyebrow">KAPITEL 05 · CAFETERIA</p><h3>Gewählte Benefits</h3><p>Anteil der Teilnehmenden mit gültiger Auswahl je Benefit.</p></div><span class="pr-cafe-phase">'+(revealed?'✓ Steuerinfo freigegeben':'Anonyme Stimmverteilung')+'</span></div>'+
 '<div role="group" aria-label="Personas filtern" class="pr-cafe-filters">'+filters.map(([key,label])=>
 '<button type="button" data-cafe-filter="'+key+'" aria-pressed="'+(key===persona)+'" class="'+(key===persona?'is-active':'')+'">'+prEscape(label)+'</button>').join('')+'</div>'+
 '<div class="pr-cafe-bars">'+prCafeteriaBarRows(step,responses,persona)+'</div>'+
 (revealed?prCafeteriaTaxHTML(step)+prCafeteriaComparison():'<p class="pr-cafe-instructions">Die Moderation kann die steuerlichen Hinweise nach der Diagramm-Auswertung freigeben.</p>')+'</section>';
}
function prCafeteriaMobileResult(step){
 const p=PR_PERSONAS[pr.public?.persona],chosen=Array.isArray(step.myAnswer?.items)?[...new Set(step.myAnswer.items)]:[];
 const items=prBudgetItems(step).filter(b=>chosen.includes(b.id));
 const sum=items.reduce((n,b)=>n+Number(b.cost||0),0),budget=p?.budget||100;
 if(!step.myAnswer)return '<p class="pr-note">Du hast kein Benefit-Paket abgeschickt. Die Auswertung ist beendet.</p>';
 if(Object.prototype.hasOwnProperty.call(step.myAnswer,'cash'))return '<div class="pr-cafe-budget-warning">Diese Abgabe stammt aus einer früheren Spielversion und wird bei der neuen Benefit-Auswertung nicht mitgezählt. Die Moderation kann die Cafeteria-Aufgabe für eine neue Auswahl erneut öffnen.</div>';
 return '<section class="pr-cafe-personal" aria-label="Dein Cafeteria-Ergebnis"><p class="pr-eyebrow">DEIN ERGEBNIS · '+prEscape(p?.name||'Persona')+'</p><h2>Dein Benefit-Paket</h2>'+
 '<div class="pr-cafe-value"><small>Netto-Wert deines Pakets (Spielwert)</small><strong>'+prEuro(sum)+'</strong><span>Summe der gewählten Benefits – vereinfacht</span></div>'+
 '<ul>'+items.map(b=>'<li><span>'+prEscape(b.icon||'')+' '+prEscape(b.label)+'</span><strong>'+prEuro(b.cost)+'</strong></li>').join('')+'</ul>'+
 '<p class="pr-cafe-remainder">'+(budget>sum?'Restbudget verfallen: '+prEuro(budget-sum)+'.':'Dein Budget wurde vollständig verwendet.')+'</p>'+
 '<div class="pr-cafe-salary"><strong>Als Gehaltserhöhung wären es nur ca. 45 % davon gewesen (vereinfacht).</strong><span>Bei deinem Paket entspräche das etwa '+prEuro(sum*.45)+' Netto. Keine individuelle Lohnsteuerberechnung.</span></div>'+
 (step.phase==='revealed'?'<details class="pr-cafe-legal"><summary>Steuerliche Einordnung deiner Benefits</summary>'+items.map(b=>'<p><strong>'+prEscape(b.label)+':</strong> '+prEscape(b.tax||'Rechtliche Voraussetzungen prüfen')+'</p>').join('')+'</details>':'<p class="pr-note">Die Steuerinformationen werden nach Freigabe durch die Moderation sichtbar.</p>')+'</section>';
}
