-- NXT | Chapter 5 Cafeteria. Existing votes preserved, legacy cash answers excluded in UI charts.

update public.arb_pr_steps
set context='{"catalog":[{"id":"ticket","label":"Jobticket-Zuschuss","cost":50,"icon":"🚆","tax":"Steuerfrei unter den Voraussetzungen des § 3 Nr. 15 EStG."},{"id":"care","label":"Kita-Zuschuss","cost":60,"icon":"🧸","tax":"Steuerfrei unter den Voraussetzungen des § 3 Nr. 33 EStG."},{"id":"learn","label":"Weiterbildungsbudget","cost":60,"icon":"📚","tax":"Steuerfrei bei begünstigten Weiterbildungsleistungen (§ 3 Nr. 19 EStG)."},{"id":"pension","label":"Zuschuss zur Betriebsrente","cost":50,"icon":"🛡️","tax":"Steuerfrei innerhalb der gesetzlichen Grenzen (§ 3 Nr. 63 EStG)."},{"id":"voucher","label":"Gutscheinkarte","cost":50,"icon":"🎁","tax":"Sachbezug bis 50 € / Monat unter den Voraussetzungen des § 8 Abs. 2 Satz 11 EStG."},{"id":"health","label":"Gesundheitsbudget","cost":40,"icon":"💚","tax":"Steuerfrei bis zu 600 € / Jahr bei begünstigter Gesundheitsförderung (§ 3 Nr. 34 EStG)."},{"id":"bike","label":"Dienstrad-Leasing","cost":30,"icon":"🚲","tax":"Steuerfrei bei zusätzlicher Überlassung und gesetzlichen Voraussetzungen (§ 3 Nr. 37 EStG)."},{"id":"vacation","label":"2 zusätzliche Urlaubstage/Jahr","cost":30,"icon":"🌴","tax":"Kein besonderer Steuervorteil – Zeit statt Geld. 30 € sind der fiktive monatliche Spielwert."},{"id":"device","label":"Diensthandy zur Privatnutzung","cost":20,"icon":"📱","tax":"Steuerfrei bei begünstigter Überlassung durch den Arbeitgeber (§ 3 Nr. 45 EStG)."}],"durationSeconds":300}'::jsonb,
    prompt='Stelle für deine Persona ein passendes Paket aus neun Benefits zusammen. Jede Leistung darf höchstens einmal ausgewählt werden. Das Monatsbudget darf nicht überschritten werden; Restbudget verfällt.',
    explanation='Spielwerte je Monat. Steuerliche Vorteile gelten nur bei Erfüllung der Voraussetzungen des jeweiligen Paragrafen. Die Arbeitgeberkosten sind nicht automatisch der individuelle Nettowert einer Leistung. Das Vergleichsbeispiel zur Gehaltserhöhung ist vereinfacht.'
where id='benefit-pack' and chapter=5;
update public.arb_pr_steps
set prompt='Mia arbeitet 20 Stunden pro Woche und bekommt nur 50 € statt 100 € Benefit-Budget. Ist das zulässig?',
    context=jsonb_build_object('options','[{"value":"A","label":"A) Unzulässig. Teilzeitkräfte dürfen nicht schlechter gestellt werden, Mia stehen 100 € zu."},{"value":"B","label":"B) Zulässig, weil Benefits freiwillig sind und die Gleichbehandlung hier nicht gilt."},{"value":"C","label":"C) Nur zulässig, wenn der Betriebsrat der Kürzung zustimmt."},{"value":"D","label":"D) Zulässig. Eine Kürzung teilbarer Leistungen im Verhältnis zur Arbeitszeit ist erlaubt, ein Ausschluss allein wegen Teilzeit nicht."}]'::jsonb,'followUp','Bekommt Mia als Teilzeitkraft den vollen Jobticket-Zuschuss – oder nur die Hälfte?'),
    explanation='Bei teilbaren geldwerten Leistungen ist eine anteilige Gewährung nach Arbeitszeit grundsätzlich zulässig (§ 4 Abs. 1 TzBfG). Mia darf allein wegen der Teilzeit nicht ohne sachlichen Grund ausgeschlossen werden. Ob ein Jobticket als nicht teilbare Leistung voll gewährt werden muss, erfordert eine gesonderte Prüfung; eine pauschale Halbierung ist nicht automatisch zulässig.',
    sources='["§ 4 Abs. 1 TzBfG"]'::jsonb
where id='benefit-parttime-v2' and chapter=5;
alter table public.arb_pr_people drop constraint arb_pr_people_persona_check;
update public.arb_pr_people set persona=case persona when 'lena' then 'mia' when 'jonas' then 'tim' else persona end
where persona in ('lena','jonas');
alter table public.arb_pr_people add constraint arb_pr_people_persona_check
 check (persona in ('mia','murat','sabine','tim'));

CREATE OR REPLACE FUNCTION public.arb_pr_join(p_device uuid, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid uuid; person text; result_persona text;
begin
 select session_id into sid from public.arb_pr_control where id=1;
 if sid is null or not exists (select 1 from public.arb_pr_sessions where id=sid and status='active') then
   raise exception 'Keine aktive Präsentationssitzung'; end if;
 if p_device is null or p_name is null or char_length(btrim(p_name)) not between 2 and 30
 then raise exception 'Name oder Gerätekennung ungültig'; end if;
 select persona into result_persona from public.arb_pr_people where session_id=sid and device_id=p_device;
 if result_persona is null then
  select x.persona into result_persona
  from (values ('mia'),('murat'),('sabine'),('tim')) x(persona)
  order by (select count(*) from public.arb_pr_people p where p.session_id=sid and p.persona=x.persona),random() limit 1;
 end if;
 insert into public.arb_pr_people(session_id,device_id,nickname,persona,last_seen)
 values(sid,p_device,btrim(p_name),result_persona,now())
 on conflict(session_id,device_id) do update
 set nickname=excluded.nickname,last_seen=now();
 return jsonb_build_object('joined',true,'sessionId',sid,'persona',result_persona);
end $function$;

CREATE OR REPLACE FUNCTION public.arb_pr_submit(p_session uuid, p_step text, p_device uuid, p_answer jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sess record; stepdata record; payload text; numeric_value numeric; minval numeric; maxval numeric;
 chosen text; items jsonb; total numeric; participant_budget numeric; persona_name text;
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
  if jsonb_typeof(p_answer->'items')<>'array'
   or (select count(*) from jsonb_object_keys(p_answer))<>1
   or jsonb_array_length(p_answer->'items')>9 then raise exception 'Ungültiges Benefit-Paket: nur das Benefit-Menü ist erlaubt';end if;
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
  if persona_name not in ('mia','murat','sabine','tim') then raise exception 'Unbekannte Persona';end if;
  participant_budget:=case when persona_name='mia' then 50 else 100 end;
  if total>participant_budget then raise exception 'Budget überschritten';end if;
 else raise exception 'Unbekannter Fragetyp';end if;
 insert into public.arb_pr_votes(session_id,step_id,device_id,answer,updated_at)
 values(p_session,p_step,p_device,p_answer,now())
 on conflict(session_id,step_id,device_id) do update set answer=excluded.answer,updated_at=now();
 return jsonb_build_object('saved',true,'step',p_step);
end $function$;

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
 'solution',case when st.phase='revealed' and q.chapter=4 then jsonb_build_object('correct',(q.solution->>'correct')::boolean) when st.phase='revealed' then q.solution else null end,
 'explanation',case when st.phase='revealed' and q.chapter<>4 then q.explanation else null end,
 'sources',case when st.phase='revealed' and q.chapter<>4 then q.sources else null end)
 order by q.chapter,q.seq),'[]'::jsonb) into history
 from public.arb_pr_step_states st join public.arb_pr_steps q on q.id=st.step_id
 where st.session_id=sid and st.phase in ('results','revealed') and q.is_active;
 if sess.active_step is null then
  return jsonb_build_object('ready',true,'sessionId',sid,'sessionLabel',sess.label,'status',sess.status,
   'chapter',sess.active_chapter,'step',null,'phase',sess.phase,'persona',my_persona,'name',my_name,
   'participants',participants,'activeParticipants',active_devices,
   'openedChapters',sess.opened_chapters,'history',history);
 end if;
 select * into active_question from public.arb_pr_steps where id=sess.active_step;
 select answer into my_vote from public.arb_pr_votes where session_id=sid and step_id=sess.active_step and device_id=p_device;
 -- Instant diagram after own submission: chapters 1/2, chapter 3 word cloud, chapter 4 binary cases, and chapter 5 legal twists (not the cafeteria pack). Legal answers remain gated by the moderator reveal.
 post_answer_feedback := (sess.active_chapter in (1,2) or (sess.active_chapter=3 and active_question.kind='wordcloud') or (sess.active_chapter=4 and active_question.kind='boolean')) and my_vote is not null and my_persona is not null and (active_question.kind<>'dual_choice' or (my_vote ? 'q1' and my_vote ? 'q2'));
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
 'prompt',active_question.prompt,'context',case when active_question.kind='benefits' and sess.phase<>'revealed' then
 jsonb_set(active_question.context,'{catalog}',
 (select coalesce(jsonb_agg(entry.value - 'tax' order by entry.ordinality),'[]'::jsonb)
 from jsonb_array_elements(active_question.context->'catalog') with ordinality as entry(value,ordinality)))
 else active_question.context end,'phase',sess.phase,'votes',vote_count,
 'myAnswer',my_vote,'responses',public_answers,
 'solution',case when active_question.chapter=4 then (case when post_answer_feedback then jsonb_build_object('correct',(active_question.solution->>'correct')::boolean) else null end) when sess.phase='revealed' then active_question.solution else null end,
 'explanation',case when active_question.chapter=4 then null when sess.phase='revealed' then active_question.explanation else null end,
 'sources',case when active_question.chapter=4 then null when sess.phase='revealed' then active_question.sources else null end),
 'phase',sess.phase,'persona',my_persona,'name',my_name,'participants',participants,
 'activeParticipants',active_devices,'openedChapters',sess.opened_chapters,'history',history);
end $function$;

CREATE OR REPLACE FUNCTION public.arb_pr_admin(p_password text, p_action text DEFAULT 'status'::text, p_chapter smallint DEFAULT NULL::smallint, p_step text DEFAULT NULL::text, p_label text DEFAULT NULL::text, p_demo boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare h text; sid uuid; sess record; new_id uuid; active_step_id text; votes_by_step jsonb;
 stages jsonb; all_steps jsonb; live_people integer;
begin
 select password_hash into h from public.arb_admin_auth where id=1;
 if p_password is null or char_length(p_password)>200 or h is null or extensions.crypt(p_password,h)<>h
 then raise exception 'Admin-Zugang verweigert';end if;
 select session_id into sid from public.arb_pr_control where id=1 for update;
 select * into sess from public.arb_pr_sessions where id=sid for update;
 if p_action='new' then
  if p_label is null or char_length(btrim(p_label)) not between 3 and 90 then raise exception 'Bitte Session-Namen eingeben';end if;
  insert into public.arb_pr_sessions(label,is_demo) values(btrim(p_label),coalesce(p_demo,true)) returning id into new_id;
  update public.arb_pr_control set session_id=new_id where id=1;
  sid:=new_id;
 elsif p_action='chapter' then
  if p_chapter is null or p_chapter not between 0 and 5 then raise exception 'Kapitel nicht gefunden';end if;
  if sess.status<>'active' then raise exception 'Session abgeschlossen';end if;
  update public.arb_pr_sessions set active_chapter=p_chapter,active_step=null,phase='waiting',
  opened_chapters=case when opened_chapters @> to_jsonb(p_chapter::integer) then opened_chapters
   else opened_chapters || jsonb_build_array(p_chapter) end where id=sid;
 elsif p_action='step' then
  if p_step is null or not exists(select 1 from public.arb_pr_steps where id=p_step and chapter=sess.active_chapter and is_active)
  then raise exception 'Frage gehört nicht zum geöffneten Kapitel';end if;
  if sess.status<>'active' then raise exception 'Session abgeschlossen';end if;
  update public.arb_pr_sessions set active_step=p_step,phase='voting' where id=sid;
  insert into public.arb_pr_step_states(session_id,step_id,phase)
  values(sid,p_step,'voting')
  on conflict(session_id,step_id) do update set phase='voting',updated_at=now();
 elsif p_action='close' then
  if sess.phase<>'voting' or sess.active_step is null then raise exception 'Keine offene Abstimmung';end if;
  -- In chapter 5, closing a legal twist immediately shows anonymous results; no solutions yet.
  update public.arb_pr_sessions set phase=
   case when exists(select 1 from public.arb_pr_steps q where q.id=sess.active_step and q.chapter=5 and q.kind in ('choice','dual_choice'))
     then 'results' else 'closed' end where id=sid;
  update public.arb_pr_step_states set phase=
   case when exists(select 1 from public.arb_pr_steps q where q.id=sess.active_step and q.chapter=5 and q.kind in ('choice','dual_choice'))
     then 'results' else 'closed' end,updated_at=now() where session_id=sid and step_id=sess.active_step;
 elsif p_action='results' then
  if sess.phase not in ('closed','results') then raise exception 'Erst Abstimmung schließen';end if;
  update public.arb_pr_sessions set phase='results' where id=sid;
  update public.arb_pr_step_states set phase='results',updated_at=now() where session_id=sid and step_id=sess.active_step;
 elsif p_action='reveal' then
  if sess.phase not in ('closed','results','revealed') then raise exception 'Erst Abstimmung schließen';end if;
  update public.arb_pr_sessions set phase='revealed' where id=sid;
  update public.arb_pr_step_states set phase='revealed',updated_at=now() where session_id=sid and step_id=sess.active_step;
 elsif p_action='publish' then
  if sess.phase='voting' then raise exception 'Laufende Abstimmung zuerst schließen';end if;
  update public.arb_pr_sessions set active_step=null,phase='chapter_results' where id=sid;
 elsif p_action='wait' then
  if sess.phase='voting' then raise exception 'Abstimmung zuerst schließen';end if;
  update public.arb_pr_sessions set active_step=null,phase='waiting' where id=sid;
 elsif p_action='finish' then
  if sess.phase='voting' then raise exception 'Abstimmung zuerst schließen';end if;
  update public.arb_pr_sessions set status='finished',finished_at=now(),active_step=null,phase='waiting' where id=sid;
 elsif p_action='status' then null;
 else raise exception 'Unbekannte Admin-Aktion';end if;
 select * into sess from public.arb_pr_sessions where id=sid;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'chapter',chapter,'seq',seq,'kind',kind,'title',title,
  'prompt',prompt,'context',context,'solution',solution,'explanation',explanation,'sources',sources)
  order by chapter,seq),'[]'::jsonb) into all_steps from public.arb_pr_steps where is_active;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'phase',st.phase)
 order by s.chapter,s.seq),'[]'::jsonb) into stages
 from public.arb_pr_steps s left join public.arb_pr_step_states st on st.session_id=sid and st.step_id=s.id where s.is_active;
 select coalesce(jsonb_object_agg(s.id,
  (select coalesce(jsonb_agg(jsonb_build_object('answer',v.answer,'persona',p.persona)),'[]'::jsonb)
   from public.arb_pr_votes v join public.arb_pr_people p on p.session_id=v.session_id and p.device_id=v.device_id
   where v.session_id=sid and v.step_id=s.id)),'{}'::jsonb)
 into votes_by_step from public.arb_pr_steps s where s.is_active;
 select count(*) into live_people from public.arb_pr_people where session_id=sid;
 return jsonb_build_object('sessionId',sid,'sessionLabel',sess.label,'isDemo',sess.is_demo,'status',sess.status,
 'chapter',sess.active_chapter,'activeStep',sess.active_step,'phase',sess.phase,'openedChapters',sess.opened_chapters,
 'steps',all_steps,'states',stages,'votes',votes_by_step,'participants',live_people);
end $function$;

