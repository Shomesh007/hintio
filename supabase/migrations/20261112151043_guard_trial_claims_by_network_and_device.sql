create table public.trial_abuse_bindings (
 kind text not null check(kind in ('ip','device')),
 binding_hash text not null check(binding_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(kind,binding_hash)
);
alter table public.trial_abuse_bindings enable row level security;
alter table public.trial_abuse_bindings force row level security;
revoke all on public.trial_abuse_bindings from public,anon,authenticated;
grant select,insert on public.trial_abuse_bindings to service_role;
create index trial_abuse_bindings_user_idx on public.trial_abuse_bindings(user_id);
create function public.claim_trial_access(p_user_id uuid,p_ip_hash text,p_device_hash text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t uuid;k text;fresh boolean:=false;until_time timestamptz;used integer;lock_name text;
begin
 if p_user_id is null or p_ip_hash is null or p_device_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' or p_device_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid trial request'; end if;
 for lock_name in select x from unnest(array['trial-user:'||p_user_id::text,'trial-ip:'||p_ip_hash,'trial-device:'||p_device_hash]) as x order by x loop
  perform pg_advisory_xact_lock(hashtextextended(lock_name,0));
 end loop;
 select token_id,key_value into t,k from public.trial_key_claims where user_id=p_user_id;
 if t is null then
  if exists(select 1 from public.trial_abuse_bindings where (kind='ip' and binding_hash=p_ip_hash) or (kind='device' and binding_hash=p_device_hash)) then raise exception 'TRIAL_NETWORK_OR_DEVICE_USED'; end if;
  k:='SKI-'||upper(encode(extensions.gen_random_bytes(24),'hex'));
  insert into public.access_tokens(token_hash,label,is_active,expires_at,max_interviews,interviews_used,sold_to,sold_price_inr,status)
  values(encode(extensions.digest(convert_to(k,'UTF8'),'sha256'),'hex'),'free-download:three_usage',true,now()+interval '30 days',3,0,p_user_id::text,0,'active') returning id into t;
  insert into public.provider_secrets(token_id,provider_mode,metadata) values(t,'managed',jsonb_build_object('plan_type','three_usage','issued_for','free_download','issued_at',now()));
  insert into public.trial_key_claims(user_id,token_id,key_value) values(p_user_id,t,k);
  fresh:=true;
 end if;
 insert into public.trial_abuse_bindings(kind,binding_hash,user_id) values('ip',p_ip_hash,p_user_id),('device',p_device_hash,p_user_id) on conflict(kind,binding_hash) do nothing;
 select expires_at,interviews_used into until_time,used from public.access_tokens where id=t;
 return jsonb_build_object('access_key',k,'max_interviews',3,'minutes_per_interview',15,'is_new',fresh,'expires_at',until_time,'interviews_remaining',greatest(0,3-used));
end; $$;
revoke all on function public.claim_trial_access(uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_trial_access(uuid,text,text) to service_role;
revoke execute on function public.claim_three_usage_trial_key() from public,anon,authenticated;
revoke execute on function hintio_private.claim_three_usage_trial_key() from public,anon,authenticated;
comment on function public.claim_trial_access(uuid,text,text) is 'Service-only atomic trial claim. Edge handler validates Google account and derives keyed network/device hashes. Existing keys are recoverable; no new trial per bound IP/device.';

