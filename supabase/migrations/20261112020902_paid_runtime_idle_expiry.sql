-- Owner-approved 12 November 2026: active paid sessions renew their scoped credential.
-- Trial lifetime, paid expiry, revocation and all request budgets remain enforced.
create or replace function public.authorize_managed_runtime(p_session_hash text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_token_id uuid; v_paid_expiry timestamptz; v_plan text;
begin
 select s.token_id,t.expires_at,p.metadata->>'plan_type'
 into v_token_id,v_paid_expiry,v_plan
 from public.managed_runtime_sessions s
 join public.access_tokens t on t.id=s.token_id
 join public.provider_secrets p on p.token_id=t.id
 where s.session_hash=p_session_hash and s.expires_at>now()
 and t.is_active and t.status='active' and t.expires_at>now()
 for update of s;
 if not found then return null; end if;
 if coalesce(v_plan,'') like 'paid_%' then
  update public.managed_runtime_sessions set expires_at=least(v_paid_expiry,now()+interval '8 hours')
  where session_hash=p_session_hash;
 end if;
 return v_token_id;
end; $$;
revoke all on function public.authorize_managed_runtime(text) from public,anon,authenticated;
grant execute on function public.authorize_managed_runtime(text) to service_role;