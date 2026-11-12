begin;
do $test$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();r uuid:=gen_random_uuid();r2 uuid:=gen_random_uuid();h text:=repeat('a',64);h2 text:=repeat('b',64);result jsonb;used integer;sig text;
begin
 insert into public.access_tokens(id,token_hash,label,is_active,expires_at,max_interviews,interviews_used,status)
 values(a,encode(extensions.digest('SKI-security-rollback-a','sha256'),'hex'),'security-rollback',true,now()+interval '1 hour',1,0,'active'),
 (b,encode(extensions.digest('SKI-security-rollback-b','sha256'),'hex'),'security-rollback',true,now()+interval '1 hour',1,0,'active');
 insert into public.provider_secrets(token_id,provider_mode,metadata) values(a,'managed','{"plan_type":"paid_qa"}'),(b,'managed','{}');
 result:=public.start_managed_runtime('SKI-security-rollback-a',r,h);
 if result is null then raise exception 'session start failed';end if;
 result:=public.start_managed_runtime('SKI-security-rollback-a',r,h);
 select interviews_used into used from public.access_tokens where id=a;
 if result is null or used<>1 then raise exception 'idempotent last credit failed';end if;
 if public.start_managed_runtime('SKI-security-rollback-b',r,h) is not null then raise exception 'cross license session replay accepted';end if;
 if public.start_managed_runtime('SKI-security-rollback-a',r2,h2) is not null then raise exception 'exhausted license accepted';end if;
 if public.authorize_managed_runtime(h)<>a then raise exception 'last credit session unusable';end if;
 update public.access_tokens set status='blocked' where id=a;
 if public.authorize_managed_runtime(h) is not null then raise exception 'blocked license accepted';end if;
 update public.access_tokens set status='active',expires_at=now()-interval '1 second' where id=a;
 if public.authorize_managed_runtime(h) is not null then raise exception 'expired license accepted';end if;
 update public.access_tokens set expires_at=now()+interval '1 hour' where id=a;
 update public.managed_runtime_sessions set expires_at=now()-interval '1 second' where token_id=a;
 if public.authorize_managed_runtime(h) is not null then raise exception 'expired session accepted';end if;
 if not public.enforce_managed_daily_limit(a) then raise exception 'daily limiter unavailable';end if;
 update public.access_token_rate_limits set attempts=10000 where identifier='gateway-day:'||a::text;
 if public.enforce_managed_daily_limit(a) then raise exception 'daily ceiling not enforced';end if;
 foreach sig in array array['start_managed_runtime(text,uuid,text)','authorize_managed_runtime(text)','enforce_managed_daily_limit(uuid)','get_trial_key_status(uuid)','log_trial_usage_start(uuid,uuid)','log_trial_usage_end(bigint,integer)','validate_trial_key_usage(uuid)'] loop
  if has_function_privilege('anon','public.'||sig,'execute') or has_function_privilege('authenticated','public.'||sig,'execute') then raise exception 'privileged rpc exposed: %',sig;end if;
 end loop;
 if has_table_privilege('anon','public.managed_runtime_sessions','select') or has_table_privilege('authenticated','public.managed_runtime_sessions','select') then raise exception 'session hashes exposed';end if;
 if has_schema_privilege('anon','hintio_private','usage') then raise exception 'private schema exposed to anon';end if;
end;$test$;
select 'passed' status,'idempotency, last-credit session, cross-license replay, exhaustion, revocation, expiry, daily budget and privileges' verified;
rollback;