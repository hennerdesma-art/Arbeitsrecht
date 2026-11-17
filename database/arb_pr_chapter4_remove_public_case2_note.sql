-- Remove editorial clarification from public context; keep legal analysis in admin-only explanation.
update public.arb_pr_steps set context=context-'precisionNote' where id='bonus-case-2' and chapter=4;
