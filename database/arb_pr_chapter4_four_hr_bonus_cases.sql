-- Chapter 4 binary HR cases; post-vote accuracy and anonymous distribution, no explanations sent publicly.

-- Chapter 4: four slide-based situations; one unique vote per question/device.
-- Existing bonus-1 has no votes and is reused to avoid a fifth visible question.
insert into public.arb_pr_steps(id,chapter,seq,kind,title,prompt,context,solution,explanation,sources) values
('bonus-1',4,1,'boolean','HR-Fall 1 | Freiwilliger Leistungsbonus','Jonas (34), Vertrieb: Sein Vertrag bezeichnet den monatlichen Leistungsbonus als „freiwillig und jederzeit widerruflich“. Aussage: Die GmbH darf ihn jederzeit ohne Begründung einstellen.','{"person":"Jonas","age":34,"position":"Vertrieb","number":1}'::jsonb,'{"correct":false}'::jsonb,'Nein. Der widersprüchliche Freiwilligkeits- und Widerrufsvorbehalt sowie die fehlende Bindung an einen Widerrufsgrund machen einen jederzeit grundlosen Widerruf nicht ohne Weiteres zulässig. Laufendes Arbeitsentgelt kann nicht pauschal als freiwillig der Bindung entzogen werden.','["§ 307 BGB","§ 308 Nr. 4 BGB","BAG 08.12.2010 – 10 AZR 671/09","BAG 13.11.2013 – 10 AZR 848/12"]'::jsonb),
('bonus-case-2',4,2,'boolean','HR-Fall 2 | Widerruf der Leistungszulage','Aylin (41), Controlling: Ihre widerrufliche Leistungszulage beträgt 20 % der Gesamtvergütung. Nach einem Umsatzeinbruch widerruft die GmbH sie. Aussage: Allein dadurch ist der Widerruf automatisch wirksam.','{"person":"Aylin","age":41,"position":"Controlling","number":2,"precisionNote":"Die ursprüngliche Aussage war ohne nähere Angaben rechtlich nicht eindeutig; die kurze App-Aussage prüft die automatische Wirksamkeit."}'::jsonb,'{"correct":false}'::jsonb,'Ein Umsatzrückgang und ein Widerrufsvorbehalt für 20 % des Entgelts reichen nicht automatisch. Zunächst sind Transparenz und Zumutbarkeit der Vertragsklausel (§§ 307, 308 Nr. 4 BGB) und bei Ausübung des Widerrufs die Interessenabwägung nach § 315 BGB zu prüfen. Ein wirksamer Widerruf kann möglich sein, folgt aber nicht zwingend aus den genannten Tatsachen.','["§ 307 BGB","§ 308 Nr. 4 BGB","§ 315 BGB","BAG 24.01.2017 – 1 AZR 774/14","BAG 12.02.2025 – 5 AZR 171/24"]'::jsonb),
('bonus-case-3',4,3,'boolean','HR-Fall 3 | Weihnachtsgeld ohne Vertrag','Tim (29), Produktion: Seit 2023 zahlt die GmbH jedes Jahr im November vorbehaltlos Weihnachtsgeld. Im Vertrag steht nichts dazu. Aussage: 2026 darf die GmbH die Zahlung einfach streichen.','{"person":"Tim","age":29,"position":"Produktion","number":3}'::jsonb,'{"correct":false}'::jsonb,'Dreimalige vorbehaltlose Zahlung einer jährlichen Gratifikation kann eine betriebliche Übung und damit einen vertraglichen Anspruch für die Zukunft begründen. Entscheidend sind die Umstände, nicht allein eine schriftliche Vertragsklausel.','["§§ 133, 157 BGB","BAG 25.01.2023 – 10 AZR 109/22"]'::jsonb),
('bonus-case-4',4,4,'boolean','HR-Fall 4 | Bonus mit Stichtag','Sara (37), Key Account: Der leistungsbezogene Jahresbonus 2026 ist an ein ungekündigtes Arbeitsverhältnis am 31.03.2027 geknüpft. Sara scheidet zum 31.12.2026 aus. Aussage: Sie verliert den Bonus für 2026 vollständig.','{"person":"Sara","age":37,"position":"Key Account","number":4}'::jsonb,'{"correct":false}'::jsonb,'Eine vom Arbeitgeber vorformulierte Stichtagsklausel, die erarbeiteten leistungsbezogenen Bonus an ein ungekündigtes Arbeitsverhältnis nach dem Bezugsjahr bindet, kann nach § 307 BGB unwirksam sein. Bereits verdientes Entgelt darf nicht durch eine solche Bindungsregel vollständig entzogen werden.','["§ 307 BGB","BAG 13.11.2013 – 10 AZR 848/12","BAG 10.12.2015 – 10 AZR 710/14"]'::jsonb)
on conflict(id) do update set chapter=excluded.chapter,seq=excluded.seq,kind=excluded.kind,title=excluded.title,prompt=excluded.prompt,context=excluded.context,solution=excluded.solution,explanation=excluded.explanation,sources=excluded.sources;

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
 where st.session_id=sid and st.phase in ('results','revealed');
 if sess.active_step is null then
  return jsonb_build_object('ready',true,'sessionId',sid,'sessionLabel',sess.label,'status',sess.status,
   'chapter',sess.active_chapter,'step',null,'phase',sess.phase,'persona',my_persona,'name',my_name,
   'participants',participants,'activeParticipants',active_devices,
   'openedChapters',sess.opened_chapters,'history',history);
 end if;
 select * into active_question from public.arb_pr_steps where id=sess.active_step;
 select answer into my_vote from public.arb_pr_votes where session_id=sid and step_id=sess.active_step and device_id=p_device;
 -- Immediate result distributions are available only after own submission in levels 1, 2, 4 and the level 3 word cloud. Level 4 returns no legal explanations.
 post_answer_feedback := (sess.active_chapter in (1,2) or (sess.active_chapter=3 and active_question.kind='wordcloud') or (sess.active_chapter=4 and active_question.kind='boolean')) and my_vote is not null and my_persona is not null;
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
 'solution',case when active_question.chapter=4 then (case when post_answer_feedback then jsonb_build_object('correct',(active_question.solution->>'correct')::boolean) else null end) when sess.phase='revealed' then active_question.solution else null end,
 'explanation',case when active_question.chapter=4 then null when sess.phase='revealed' then active_question.explanation else null end,
 'sources',case when active_question.chapter=4 then null when sess.phase='revealed' then active_question.sources else null end),
 'phase',sess.phase,'persona',my_persona,'name',my_name,'participants',participants,
 'activeParticipants',active_devices,'openedChapters',sess.opened_chapters,'history',history);
end $function$
;
