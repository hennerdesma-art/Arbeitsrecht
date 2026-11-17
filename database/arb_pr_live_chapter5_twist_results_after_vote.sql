-- NXT Rechts-Twists: live aggregated diagrams after participant submits; solutions still require moderator reveal.
-- Twist 3 requires both subanswers; no new tables, grants or changes to cafeteria package.
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
 post_answer_feedback := (sess.active_chapter in (1,2) or (sess.active_chapter=3 and active_question.kind='wordcloud') or (sess.active_chapter=4 and active_question.kind='boolean') or (sess.active_chapter=5 and active_question.kind in ('choice','dual_choice'))) and my_vote is not null and my_persona is not null and (active_question.kind<>'dual_choice' or (my_vote ? 'q1' and my_vote ? 'q2'));
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
