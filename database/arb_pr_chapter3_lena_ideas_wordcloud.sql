-- NXT Hochschule Reutlingen | chapter 3 brainstorming + live word cloud
-- Existing chapter-3 multiple-choice quiz and votes remain intact.
alter table public.arb_pr_steps drop constraint arb_pr_steps_kind_check;
alter table public.arb_pr_steps
  add constraint arb_pr_steps_kind_check
  check(kind = any(array['choice'::text,'boolean'::text,'salary'::text,'benefits'::text,'wordcloud'::text]));

-- Make the open-ended brainstorm the first step; retain the legal follow-up quiz at seq 2.
update public.arb_pr_steps set seq=2 where id='equity-1' and chapter=3;
insert into public.arb_pr_steps
 (id,chapter,seq,kind,title,prompt,context,solution,explanation,sources)
values
 ('equity-wordcloud',3,1,'wordcloud','Lenas Gehaltsunterschied',
  'Was kann Lena tun? (Antwort in 2–3 Worten)',
  '{"case":"Lena und Jonas machen dieselbe Arbeit. Jonas verdient 500 € monatlich mehr – laut Vorgesetztem, weil er besser verhandelt hat.","placeholder":"Deine Idee in 2–3 Worten","minWords":2,"maxWords":3,"maxChars":70}'::jsonb,
  '{"category":"discussion"}'::jsonb,
  'Die Wörterwolke sammelt zunächst eure Ideen. Gemeinsam besprechen wir anschließend mögliche Schritte, beispielsweise Auskunftsansprüche, Dokumentation, Gespräche und gegebenenfalls rechtliche Durchsetzung.',
  '["§§ 3, 7, 10 ff. EntgTranspG","§ 22 AGG","Art. 157 AEUV"]'::jsonb)
on conflict(id) do nothing;

CREATE OR REPLACE FUNCTION public.arb_pr_submit(p_session uuid, p_step text, p_device uuid, p_answer jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sess record; stepdata record; payload text; numeric_value numeric; minval numeric; maxval numeric;
 chosen text; items jsonb; cash_val numeric; total numeric; participant_budget numeric; persona_name text;
 item_count integer; unique_count integer; valid_count integer;
begin
 if p_session is null or p_step is null or p_device is null or p_answer is null or jsonb_typeof(p_answer)<>'object'
 or pg_column_size(p_answer)>4096 then raise exception 'Ungültige Antwort'; end if;
 select * into sess from public.arb_pr_sessions where id=p_session for share;
 if not found or sess.status<>'active' or sess.active_step is distinct from p_step or sess.phase<>'voting'
 or not exists(select 1 from public.arb_pr_control where id=1 and session_id=p_session)
 then raise exception 'Abstimmung ist nicht geöffnet';end if;
 select * into stepdata from public.arb_pr_steps where id=p_step and chapter=sess.active_chapter;
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
 elsif stepdata.kind='wordcloud' then
  if stepdata.chapter<>3 or jsonb_typeof(p_answer->'value')<>'string'
    or (select count(*) from jsonb_object_keys(p_answer))<>1
  then raise exception 'Für die Wörterwolke wird ein kurzer Text benötigt'; end if;
  payload:=btrim(regexp_replace(p_answer->>'value','[[:space:]]+',' ','g'));
  if char_length(payload)>70 or char_length(payload)<4
     or array_length(regexp_split_to_array(payload,'[[:space:]]+'),1) not between 2 and 3
     or payload ~ '[[:cntrl:]<>]'
  then raise exception 'Bitte eine Idee in 2–3 Worten eingeben (höchstens 70 Zeichen)'; end if;
  p_answer:=jsonb_build_object('value',payload);
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

CREATE OR REPLACE FUNCTION public.arb_pr_public(p_device uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid uuid; sess record; active_question record; my_persona text; my_name text;
 my_vote jsonb; participants integer; active_devices integer; vote_count integer;
 public_answers jsonb; history jsonb; catalog jsonb; post_answer_feedback boolean := false;
begin
 select session_id into sid from public.arb_pr_control where id=1;
 if sid is null then return jsonb_build_object('ready',false);end if;
 select * into sess from public.arb_pr_sessions where id=sid;
 if p_device is not null then
  update public.arb_pr_people set last_seen=now() where session_id=sid and device_id=p_device;
  select persona,nickname into my_persona,my_name from public.arb_pr_people where session_id=sid and device_id=p_device;
 end if;
 select count(*), count(*) filter(where last_seen>now()-interval '60 seconds')
 into participants,active_devices from public.arb_pr_people where session_id=sid;
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'chapter',q.chapter,'seq',q.seq,
 'title',q.title,'kind',q.kind,'phase',st.phase,
 'responses',(select coalesce(jsonb_agg(jsonb_build_object('answer',v.answer,'persona',p.persona)),'[]'::jsonb)
  from public.arb_pr_votes v join public.arb_pr_people p on p.session_id=v.session_id and p.device_id=v.device_id
  where v.session_id=sid and v.step_id=q.id),
 'solution',case when st.phase='revealed' then q.solution else null end,
 'explanation',case when st.phase='revealed' then q.explanation else null end,
 'sources',case when st.phase='revealed' then q.sources else null end)
 order by q.chapter,q.seq),'[]'::jsonb) into history
 from public.arb_pr_step_states st join public.arb_pr_steps q on q.id=st.step_id
 where st.session_id=sid and st.phase in ('results','revealed');
 if sess.active_step is null then
  return jsonb_build_object('ready',true,'sessionId',sid,'sessionLabel',sess.label,'status',sess.status,
   'chapter',sess.active_chapter,'step',null,'phase',sess.phase,'persona',my_persona,'name',my_name,
   'participants',participants,'activeParticipants',active_devices,
   'openedChapters',sess.opened_chapters,'history',history);
 end if;
 select * into active_question from public.arb_pr_steps where id=sess.active_step;
 select answer into my_vote from public.arb_pr_votes where session_id=sid and step_id=sess.active_step and device_id=p_device;
 -- Chapter 1 and 2: a saved vote unlocks the live diagram and that question's legal interpretation.
 post_answer_feedback := (sess.active_chapter in (1,2) or (sess.active_chapter=3 and active_question.kind='wordcloud')) and my_vote is not null and my_persona is not null;
 select count(*) into vote_count from public.arb_pr_votes where session_id=sid and step_id=sess.active_step;
 public_answers := null;
 if sess.phase in ('results','revealed') or post_answer_feedback then
   select coalesce(jsonb_agg(jsonb_build_object('answer',v.answer,'persona',p.persona)),'[]'::jsonb)
   into public_answers from public.arb_pr_votes v join public.arb_pr_people p
     on p.session_id=v.session_id and p.device_id=v.device_id
   where v.session_id=sid and v.step_id=sess.active_step;
 end if;
 return jsonb_build_object('ready',true,'sessionId',sid,'sessionLabel',sess.label,'status',sess.status,
 'chapter',sess.active_chapter,'step',jsonb_build_object('id',active_question.id,
 'chapter',active_question.chapter,'seq',active_question.seq,'kind',active_question.kind,'title',active_question.title,
 'prompt',active_question.prompt,'context',active_question.context,'phase',sess.phase,'votes',vote_count,
 'myAnswer',my_vote,'responses',public_answers,
 'solution',case when sess.phase='revealed' then active_question.solution else null end,
 'explanation',case when sess.phase='revealed' then active_question.explanation else null end,
 'sources',case when sess.phase='revealed' then active_question.sources else null end),
 'phase',sess.phase,'persona',my_persona,'name',my_name,'participants',participants,
 'activeParticipants',active_devices,'openedChapters',sess.opened_chapters,'history',history);
end $function$
;
