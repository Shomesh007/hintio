create or replace function public.enforce_managed_daily_limit(p_token_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare attempts integer;
begin
 insert into public.access_token_rate_limits(identifier,window_started_at,attempts,updated_at)
 values('gateway-day:'||p_token_id::text,now(),1,now())
 on conflict(identifier) do update set
 attempts=case when public.access_token_rate_limits.window_started_at<now()-interval '24 hours' then 1 else public.access_token_rate_limits.attempts+1 end,
 window_started_at=case when public.access_token_rate_limits.window_started_at<now()-interval '24 hours' then now() else public.access_token_rate_limits.window_started_at end,
 updated_at=now()
 returning public.access_token_rate_limits.attempts into attempts;
 return attempts<=10000;
end; $$;
revoke all on function public.enforce_managed_daily_limit(uuid) from public,anon,authenticated;
grant execute on function public.enforce_managed_daily_limit(uuid) to service_role;