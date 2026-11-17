-- Chapter 5 v2: new four-option twists, with dual-answer gate for Twist 3.
-- Leave the cafeteria package and all existing responses untouched.
alter table public.arb_pr_steps drop constraint if exists arb_pr_steps_kind_check;
alter table public.arb_pr_steps add constraint arb_pr_steps_kind_check
  check (kind = any (array['choice','boolean','salary','benefits','wordcloud','dual_choice']::text[]));

-- Archive previous twists rather than recoding or losing their historical answers.
update public.arb_pr_steps set is_active=false,seq=96 where id='benefit-tax' and chapter=5;
update public.arb_pr_steps set is_active=false,seq=97 where id='benefit-parttime' and chapter=5;
update public.arb_pr_steps set is_active=false,seq=98 where id='benefit-withdrawal' and chapter=5;

insert into public.arb_pr_steps (id,chapter,seq,kind,title,prompt,context,solution,explanation,sources) values
('benefit-tax-v2',5,2,'choice','Twist 1: Gehalt umwandeln statt Budget oben drauf?','Der CFO meint: Statt eines zusätzlichen Budgets wandeln wir einfach 100 € Gehalt in Benefits um. Gleicher Steuervorteil?','{"options":[{"value":"A","label":"A) Ja. Der Arbeitgeber zahlt den Betrag so oder so, für die Steuer spielt die Herkunft keine Rolle."},{"value":"B","label":"B) Nein. Der Steuervorteil gilt meist nur, wenn der Benefit zusätzlich zum geschuldeten Lohn kommt."},{"value":"C","label":"C) Nein. Gehalt in Benefits umzuwandeln ist arbeitsrechtlich grundsätzlich unzulässig."},{"value":"D","label":"D) Ja, solange der Sachbezug unter 50 € im Monat bleibt."}]}'::jsonb,'{"correct":"B"}'::jsonb,'Für zahlreiche steuerbegünstigte Benefits ist die Zusätzlichkeit zum ohnehin geschuldeten Arbeitslohn Voraussetzung. Es gibt Ausnahmen, insbesondere bei der betrieblichen Altersversorgung durch Entgeltumwandlung. Deshalb gilt diese Aussage überwiegend, aber nicht ausnahmslos.','["§ 8 Abs. 4 EStG","§ 1a BetrAVG","§ 3 Nr. 63 EStG"]'::jsonb),
('benefit-parttime-v2',5,3,'choice','Twist 2: Weniger Budget für Teilzeit?','Lena arbeitet 20 Stunden pro Woche und bekommt nur 50 € statt 100 € Budget. Ist das zulässig?','{"options":[{"value":"A","label":"A) Unzulässig. Teilzeitkräfte dürfen nicht schlechter gestellt werden, Lena stehen 100 € zu."},{"value":"B","label":"B) Zulässig, weil Benefits freiwillig sind und die Gleichbehandlung hier nicht gilt."},{"value":"C","label":"C) Nur zulässig, wenn der Betriebsrat der Kürzung zustimmt."},{"value":"D","label":"D) Zulässig. Eine Kürzung im Verhältnis zur Arbeitszeit ist erlaubt, ein Ausschluss nicht."}]}'::jsonb,'{"correct":"D"}'::jsonb,'Teilbare geldwerte Leistungen können im Verhältnis zur Arbeitszeit gewährt werden; ein Ausschluss allein wegen Teilzeit ist grundsätzlich unzulässig. Die Verteilung einzelner nicht teilbarer Leistungen kann eine gesonderte Prüfung erfordern.','["§ 4 Abs. 1 TzBfG","§§ 3, 7 EntgTranspG"]'::jsonb),
('benefit-withdrawal-v2',5,4,'dual_choice','Twist 3: Budget in der Krise streichen?','In der Krise will NovaTech nach zwei Jahren das Budget streichen. Geht das? Und wer hätte bei der Einführung mitreden müssen?','{"questions":[{"id":"q1","title":"Frage 1: Darf NovaTech das Budget streichen?","options":[{"value":"A","label":"A) Ja, in der Krise sind Benefits jederzeit streichbar."},{"value":"B","label":"B) Nein, nach zwei Jahren besteht ein fester Anspruch."},{"value":"C","label":"C) Kommt darauf an, wie das Budget eingeführt wurde."}]},{"id":"q2","title":"Frage 2: Wo redet der Betriebsrat mit?","options":[{"value":"D","label":"D) Nur bei Menü und Verteilungsregeln."},{"value":"E","label":"E) Beim Ob, bei der Höhe und bei der Verteilung."},{"value":"F","label":"F) Gar nicht, weil die Leistung freiwillig ist."}]}],"requireBoth":true}'::jsonb,'{"correct":{"q1":"C","q2":"D"}}'::jsonb,'Frage 1: Eine Streichung hängt von der Rechtsgrundlage ab (Arbeitsvertrag, betriebliche Übung, wirksamer Vorbehalt oder Betriebsvereinbarung); zwei Jahre führen nicht automatisch zu einem festen Anspruch. Frage 2: Im Grundsatz legt der Arbeitgeber den Dotierungsrahmen fest, während bei kollektiven Entlohnungsgrundsätzen und Verteilungsregeln Mitbestimmungsrechte des Betriebsrats zu beachten sind.','["§ 87 Abs. 1 Nr. 10 BetrVG","§ 77 Abs. 5–6 BetrVG","§§ 133, 157 BGB"]'::jsonb)
on conflict(id) do update
set chapter=excluded.chapter,seq=excluded.seq,kind=excluded.kind,
title=excluded.title,prompt=excluded.prompt,context=excluded.context,
solution=excluded.solution,explanation=excluded.explanation,sources=excluded.sources,
is_active=true;


CREATE OR REPLACE FUNCTION public.arb_pr_submit(p_session uuid, p_step text, p_device uuid, p_answer jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sess record; stepdata record; payload text; numeric_value numeric; minval numeric; maxval numeric;
 chosen text; items jsonb; cash_val numeric; total numeric; participant_budget numeric; persona_name text;
 item_count integer; unique_count integer; valid_count integer; existing_answer jsonb;
begin
 if p_session is null or p_step is null or p_device is null or p_answer is null or jsonb_typeof(p_answer)<>'object'
 or pg_column_size(p_answer)>4096 then raise exception 'Ungültige Antwort'; end if;
 select * into sess from public.arb_pr_sessions where id=p_session for share;
 if not found or sess.status<>'active' or sess.active_step is distinct from p_step or sess.phase<>'voting'
 or not exists(select 1 from public.arb_pr_control where id=1 and session_id=p_session)
 then raise exception 'Abstimmung ist nicht geöffnet';end if;
 select * into stepdata from public.arb_pr_steps where id=p_step and chapter=sess.active_chapter and is_active;
 if not found then raise exception 'Frage nicht gefunden';end if;
 select persona into persona_name from public.arb_pr_people where session_id=p_session and device_id=p_device;
 if not found then raise exception 'Bitte zuerst anmelden';end if;
 if stepdata.kind='boolean' then
  if jsonb_typeof(p_answer->'value')<>'boolean' or (select count(*) from jsonb_object_keys(p_answer))<>1
  then raise exception 'Nur Richtig/Falsch erlaubt';end if;
 elsif stepdata.kind='salary' then
  if jsonb_typeof(p_answer->'value')<>'number' or (select count(*) from jsonb_object_keys(p_answer))<>1
  then raise exception 'Bitte ein Gehalt eingeben';end if;
  numeric_value := (p_answer->>'value')::numeric;
  minval := (stepdata.context->>'min')::numeric;maxval := (stepdata.context->>'max')::numeric;
  if numeric_value<minval or numeric_value>maxval or mod(numeric_value-minval,(stepdata.context->>'step')::numeric)<>0
  then raise exception 'Gehalt nicht im erlaubten Bereich';end if;
 elsif stepdata.kind='choice' then
  if jsonb_typeof(p_answer->'value')<>'string' or (select count(*) from jsonb_object_keys(p_answer))<>1
   or not exists (select 1 from jsonb_array_elements(stepdata.context->'options') o where o->>'value'=p_answer->>'value')
  then raise exception 'Ungültige Antwortoption';end if;
 elsif stepdata.kind='dual_choice' then
  -- Twist 3: both subquestions must be answered in one atomic submission.
  if stepdata.chapter<>5 or jsonb_typeof(p_answer->'q1')<>'string'
    or jsonb_typeof(p_answer->'q2')<>'string'
    or (select count(*) from jsonb_object_keys(p_answer))<>2
    or not exists(
      select 1 from jsonb_array_elements(stepdata.context->'questions') subquestion,
        jsonb_array_elements(subquestion->'options') option
      where subquestion->>'id'='q1' and option->>'value'=p_answer->>'q1'
    )
    or not exists(
      select 1 from jsonb_array_elements(stepdata.context->'questions') subquestion,
        jsonb_array_elements(subquestion->'options') option
      where subquestion->>'id'='q2' and option->>'value'=p_answer->>'q2'
    )
  then raise exception 'Bitte beide Fragen von Twist 3 gültig beantworten';end if;
 elsif stepdata.kind='wordcloud' then
  -- Each user may add up to 25 DIFFERENT ideas. No word count requirement.
  -- All ideas stay in one answer row per user, preserving existing session data.
  if stepdata.chapter<>3 or jsonb_typeof(p_answer->'value')<>'string'
    or (select count(*) from jsonb_object_keys(p_answer))<>1
  then raise exception 'Bitte eine Idee als Text eingeben'; end if;
  payload:=btrim(regexp_replace(p_answer->>'value','[[:space:]]+',' ','g'));
  if char_length(payload)<1 or char_length(payload)>100 or payload ~ '[[:cntrl:]<>]'
  then raise exception 'Bitte einen Begriff oder kurzen Satz mit höchstens 100 Zeichen eingeben'; end if;

  -- Atomic conflict update: concurrent posts append rather than overwrite each other.
  insert into public.arb_pr_votes as v (session_id,step_id,device_id,answer,updated_at)
    values (p_session,p_step,p_device,jsonb_build_object('items',jsonb_build_array(payload)),now())
  on conflict(session_id,step_id,device_id) do update
    set answer=jsonb_build_object('items',(case when jsonb_typeof(v.answer->'items')='array' then v.answer->'items'
     when jsonb_typeof(v.answer->'value')='string' then jsonb_build_array(v.answer->>'value')
     else '[]'::jsonb end) || jsonb_build_array(payload)),
        updated_at=now()
    where jsonb_array_length((case when jsonb_typeof(v.answer->'items')='array' then v.answer->'items'
     when jsonb_typeof(v.answer->'value')='string' then jsonb_build_array(v.answer->>'value')
     else '[]'::jsonb end))<25
      and not exists (
        select 1 from jsonb_array_elements_text((case when jsonb_typeof(v.answer->'items')='array' then v.answer->'items'
     when jsonb_typeof(v.answer->'value')='string' then jsonb_build_array(v.answer->>'value')
     else '[]'::jsonb end)) as existing(value)
        where lower(btrim(existing.value))=lower(payload)
      )
  returning answer into existing_answer;
  if existing_answer is null then
    raise exception 'Diese Idee wurde bereits eingereicht oder das Limit von 25 Ideen ist erreicht';
  end if;
  return jsonb_build_object('saved',true,'step',p_step,'items',existing_answer->'items');
 elsif stepdata.kind='benefits' then
  if jsonb_typeof(p_answer->'items')<>'array' or jsonb_typeof(p_answer->'cash')<>'number'
   or (select count(*) from jsonb_object_keys(p_answer))<>2
   or jsonb_array_length(p_answer->'items')>9 then raise exception 'Ungültiges Benefit-Paket';end if;
  cash_val:=(p_answer->>'cash')::numeric;
  if cash_val<0 or cash_val>100 or mod(cash_val,10)<>0 then raise exception 'Barauszahlung muss in 10-Euro-Schritten gewählt werden';end if;
  select count(*),count(distinct value) into item_count,unique_count
    from jsonb_array_elements_text(p_answer->'items');
  if item_count<>unique_count then raise exception 'Jedes Benefit nur einmal';end if;
  select count(*) into valid_count
  from jsonb_array_elements_text(p_answer->'items') picked
  where exists (select 1 from jsonb_array_elements(stepdata.context->'catalog') item where item->>'id'=picked.value);
  if item_count<>valid_count then raise exception 'Unbekanntes Benefit';end if;
  select coalesce(sum((item->>'cost')::numeric),0) into total
    from jsonb_array_elements(stepdata.context->'catalog') item where item->>'id' in
    (select value from jsonb_array_elements_text(p_answer->'items'));
  total:=total+cash_val;
  participant_budget:=case when persona_name='lena' then 50 else 100 end;
  if total>participant_budget then raise exception 'Budget überschritten';end if;
 else raise exception 'Unbekannter Fragetyp';end if;
 insert into public.arb_pr_votes(session_id,step_id,device_id,answer,updated_at)
 values(p_session,p_step,p_device,p_answer,now())
 on conflict(session_id,step_id,device_id) do update set answer=excluded.answer,updated_at=now();
 return jsonb_build_object('saved',true,'step',p_step);
end $function$
;
