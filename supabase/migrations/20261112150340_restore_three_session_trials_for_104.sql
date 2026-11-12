create or replace function hintio_private.claim_three_usage_trial_key() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); k text; t uuid; fresh boolean:=false; until_time timestamptz; used integer; new_key text;
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not exists(select 1 from auth.users where id=u and email is not null) then raise exception 'Not authenticated'; end if;
 if not public.enforce_access_token_rate_limit('trial-claim:'||u::text,10,300) then raise exception 'Too many trial requests. Please retry in a few minutes.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select token_id,key_value into t,k from public.trial_key_claims where user_id=u;
 if t is null then
  new_key:='SKI-'||upper(encode(extensions.gen_random_bytes(24),'hex'));
  insert into public.access_tokens(token_hash,label,is_active,expires_at,max_interviews,interviews_used,sold_to,sold_price_inr,status)
  values(encode(extensions.digest(convert_to(new_key,'UTF8'),'sha256'),'hex'),'free-download:three_usage',true,now()+interval '30 days',3,0,u::text,0,'active') returning id into t;
  insert into public.provider_secrets(token_id,provider_mode,metadata) values(t,'managed',jsonb_build_object('plan_type','three_usage','issued_for','free_download','issued_at',now()));
  insert into public.trial_key_claims(user_id,token_id,key_value) values(u,t,new_key);
  k:=new_key; fresh:=true;
 end if;
 select expires_at,interviews_used into until_time,used from public.access_tokens where id=t;
 return jsonb_build_object('access_key',k,'max_interviews',3,'minutes_per_interview',15,'is_new',fresh,'expires_at',until_time,'interviews_remaining',greatest(0,3-used));
end; $$;
create or replace function public.claim_three_usage_trial_key() returns jsonb language sql security invoker set search_path='' as $$ select hintio_private.claim_three_usage_trial_key(); $$;
comment on function public.claim_three_usage_trial_key() is 'One three-session trial per authenticated non-anonymous account. 1.0.4 production restored by owner on 2026-11-12; paid access and Store candidate are separate.';

