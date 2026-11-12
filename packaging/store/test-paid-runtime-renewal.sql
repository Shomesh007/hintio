begin;
do $test$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();r uuid:=gen_random_uuid();h text:=repeat('c',64);h2 text:=repeat('d',64);expiry timestamptz; used integer;
begin
 insert into public.access_tokens(id,token_hash,label,is_active,expires_at,max_interviews,interviews_used,status)
 values(a,encode(extensions.digest('SKI-renewal-rollback-paid','sha256'),'hex'),'security-rollback-paid',true,now()+interval '2 days',1,0,'active'),
 (b,encode(extensions.digest('SKI-renewal-rollback-trial','sha256'),'hex'),'security-rollback-trial',true,now()+interval '2 days',1,0,'active');
 insert into public.provider_secrets(token_id,provider_mode,metadata) values(a,'managed','{"plan_type":"paid_qa"}'),(b,'managed','{"plan_type":"three_usage"}');
 perform public.start_managed_runtime('SKI-renewal-rollback-paid',r,h);
 update public.managed_runtime_sessions set expires_at=now()+interval '1 hour' where token_id=a;
 if public.authorize_managed_runtime(h)<>a then raise exception 'paid authorization failed';end if;
 select expires_at into expiry from public.managed_runtime_sessions where token_id=a;
 if expiry<>now()+interval '8 hours' then raise exception 'paid idle lifetime did not renew';end if;
 select interviews_used into used from public.access_tokens where id=a;
 if used<>1 then raise exception 'renewal consumed another credit';end if;
 update public.access_tokens set expires_at=now()+interval '20 minutes' where id=a;
 perform public.authorize_managed_runtime(h);
 if (select expires_at from public.managed_runtime_sessions where token_id=a)<>now()+interval '20 minutes' then raise exception 'renewal exceeded paid expiry';end if;
 update public.access_tokens set status='blocked' where id=a;
 if public.authorize_managed_runtime(h) is not null then raise exception 'blocked license renewed';end if;
 update public.access_tokens set status='active',expires_at=now()-interval '1 second' where id=a;
 if public.authorize_managed_runtime(h) is not null then raise exception 'expired license renewed';end if;
 update public.access_tokens set expires_at=now()+interval '2 days' where id=a;
 update public.managed_runtime_sessions set expires_at=now()-interval '1 second' where token_id=a;
 if public.authorize_managed_runtime(h) is not null then raise exception 'expired session revived';end if;
 perform public.start_managed_runtime('SKI-renewal-rollback-trial',gen_random_uuid(),h2);
 select expires_at into expiry from public.managed_runtime_sessions where token_id=b;
 if public.authorize_managed_runtime(h2)<>b or (select expires_at from public.managed_runtime_sessions where token_id=b)<>expiry then raise exception 'trial lifetime extended';end if;
 if expiry>now()+interval '15 minutes' then raise exception 'trial timeout exceeds allowance';end if;
 if has_function_privilege('anon','public.authorize_managed_runtime(text)','execute') or has_function_privilege('authenticated','public.authorize_managed_runtime(text)','execute') then raise exception 'authorization RPC exposed';end if;
 if not public.enforce_managed_daily_limit(a) then raise exception 'daily counter unavailable';end if;
 update public.access_token_rate_limits set attempts=10000 where identifier='gateway-day:'||a::text;
 if public.enforce_managed_daily_limit(a) then raise exception 'daily limit bypassed';end if;
end;$test$;
select 'passed' status,'paid idle renewal, no extra credits, paid expiry, blocks, expiry, no resurrection, trial lifetime, service privileges and daily limits' verified;
rollback;