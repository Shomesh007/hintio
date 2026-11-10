-- Atomic paid entitlements. All functions are service-only invokers, never public grants.
alter table public.licenses add column if not exists access_token_id uuid references public.access_tokens(id);
alter table public.licenses add column if not exists valid_until timestamptz;
alter table public.licenses add column if not exists legacy_valid_until timestamptz;
alter table public.licenses add column if not exists billing_status text;
alter table public.licenses add column if not exists cancel_at_period_end boolean not null default false;
alter table public.licenses add column if not exists billing_updated_at timestamptz;
create index if not exists licenses_access_token_idx on public.licenses(access_token_id);

create table public.billing_payments (
 payment_id text primary key, license_id uuid not null references public.licenses(id),
 subscription_id text, amount integer not null check(amount > 0), currency text not null check(currency='INR'),
 paid_at timestamptz not null, period_start timestamptz not null, period_end timestamptz not null,
 amount_refunded integer not null default 0 check(amount_refunded >= 0 and amount_refunded <= amount),
 check(period_end > period_start)
);
create index billing_payments_license_idx on public.billing_payments(license_id);
alter table public.billing_payments enable row level security;
alter table public.billing_payments force row level security;
revoke all on public.billing_payments from public,anon,authenticated;
grant select,insert,update on public.billing_payments to service_role;
create table public.billing_webhook_events(event_id text primary key,event_type text not null,processed_at timestamptz not null default now());
alter table public.billing_webhook_events enable row level security;
alter table public.billing_webhook_events force row level security;
revoke all on public.billing_webhook_events from public,anon,authenticated;
grant select,insert on public.billing_webhook_events to service_role;
grant select,insert,update on public.licenses,public.access_tokens,public.provider_secrets to service_role;

-- Link only already-existing tokens. No unverified legacy license is activated.
update public.licenses l set access_token_id=t.id,valid_until=t.expires_at,legacy_valid_until=t.expires_at
from public.access_tokens t where l.access_token_id is null and t.token_hash=encode(extensions.digest(convert_to(l.license_key,'UTF8'),'sha256'),'hex');

create or replace function public.refresh_paid_license(p_license_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare l public.licenses%rowtype; p public.billing_payments%rowtype; until_time timestamptz; start_time timestamptz;
begin
 select * into strict l from public.licenses where id=p_license_id for update;
 until_time:=l.legacy_valid_until;
 if l.plan='yearly' then
  for p in select * from public.billing_payments where license_id=l.id and amount_refunded<amount order by paid_at,payment_id loop
   start_time:=greatest(p.paid_at,until_time);
   until_time:=start_time+interval '365 days';
   update public.billing_payments set period_start=start_time,period_end=until_time where payment_id=p.payment_id;
  end loop;
 else
  select greatest(l.legacy_valid_until,max(period_end)) into until_time from public.billing_payments where license_id=l.id and amount_refunded<amount;
 end if;
 update public.licenses set valid_until=until_time,status=case when until_time>now() then 'active' else 'expired' end where id=l.id;
 update public.access_tokens set expires_at=coalesce(until_time,now()),
  is_active=case when status='blocked' then false else coalesce(until_time>now(),false) end,
  status=case when status='blocked' then 'blocked' when until_time>now() then 'active' else 'expired' end
 where id=l.access_token_id;
end; $$;
revoke all on function public.refresh_paid_license(uuid) from public,anon,authenticated;
grant execute on function public.refresh_paid_license(uuid) to service_role;

create or replace function public.record_billing_payment(p jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare l public.licenses%rowtype; old_payment public.billing_payments%rowtype; v_token_id uuid;
 owner_id uuid:=(p->>'user_id')::uuid; plan_name text:=p->>'plan'; sub_id text:=nullif(p->>'subscription_id','');
 payment_id_value text:=p->>'payment_id'; paid_time timestamptz:=(p->>'paid_at')::timestamptz;
 from_time timestamptz:=(p->>'period_start')::timestamptz; end_time timestamptz:=(p->>'period_end')::timestamptz;
begin
 if owner_id is null or plan_name is null or plan_name not in ('monthly','yearly') or coalesce(payment_id_value,'') !~ '^pay_[A-Za-z0-9]+$' or coalesce(p->>'email','')='' then raise exception 'Invalid verified payment'; end if;
 if coalesce((p->>'amount')::integer,0)<=0 or (p->>'currency') is distinct from 'INR' or from_time is null or end_time is null or paid_time is null or end_time<=from_time or paid_time>now()+interval '10 minutes' then raise exception 'Invalid payment terms'; end if;
 perform pg_advisory_xact_lock(hashtextextended('billing-owner:'||owner_id::text||':'||plan_name,0));
 select * into old_payment from public.billing_payments where payment_id=payment_id_value;
 if found then
  select * into strict l from public.licenses where id=old_payment.license_id;
  if l.user_id<>owner_id or l.plan<>plan_name then raise exception 'Payment ownership mismatch'; end if;
  return jsonb_build_object('licenseKey',l.license_key,'licenseId',l.id,'plan',l.plan,'validUntil',l.valid_until,'reused',true);
 end if;
 if sub_id is not null then
  select * into l from public.licenses where razorpay_subscription_id=sub_id for update;
 else
  select * into l from public.licenses where razorpay_payment_id=payment_id_value for update;
  if l.id is null and plan_name='yearly' then select * into l from public.licenses where user_id=owner_id and plan='yearly' and access_token_id is not null and razorpay_subscription_id is null order by created_at desc limit 1 for update; end if;
 end if;
 if l.id is null then
  select * into l from public.licenses where user_id=owner_id and plan=plan_name and access_token_id is null and razorpay_payment_id is null and razorpay_subscription_id is null order by created_at desc limit 1 for update;
  if l.id is not null then update public.licenses set razorpay_payment_id=payment_id_value,razorpay_subscription_id=sub_id,billing_status='active' where id=l.id; end if;
 end if;
 if l.id is not null and (l.user_id is distinct from owner_id or l.plan is distinct from plan_name) then raise exception 'License ownership mismatch'; end if;
 if l.id is null then
  insert into public.licenses(user_id,email,license_key,plan,status,razorpay_payment_id,razorpay_subscription_id,billing_status)
  values(owner_id,p->>'email','SKI-'||upper(encode(extensions.gen_random_bytes(12),'hex')),plan_name,'active',payment_id_value,sub_id,'active') returning * into l;
 end if;
 if l.access_token_id is null then
  insert into public.access_tokens(token_hash,label,is_active,expires_at,max_interviews,interviews_used,sold_price_inr,status)
  values(encode(extensions.digest(convert_to(l.license_key,'UTF8'),'sha256'),'hex'),'paid:'||plan_name,true,end_time,2147483647,0,ceil((p->>'amount')::numeric/100)::integer,'active')
  on conflict(token_hash) do update set expires_at=greatest(public.access_tokens.expires_at,excluded.expires_at) returning id into v_token_id;
  update public.licenses set access_token_id=v_token_id where id=l.id;
 else v_token_id:=l.access_token_id; end if;
 insert into public.provider_secrets(token_id,provider_mode,metadata) values(v_token_id,'managed',jsonb_build_object('plan_type','paid_'||plan_name,'provider','openai','billing_license_id',l.id,'sessionTimeoutMs',null))
 on conflict(token_id) do update set metadata=public.provider_secrets.metadata||excluded.metadata;
 update public.access_tokens set max_interviews=2147483647 where id=v_token_id;
 insert into public.billing_payments(payment_id,license_id,subscription_id,amount,currency,paid_at,period_start,period_end,amount_refunded)
 values(payment_id_value,l.id,sub_id,(p->>'amount')::integer,p->>'currency',paid_time,from_time,end_time,coalesce((p->>'amount_refunded')::integer,0));
 perform public.refresh_paid_license(l.id);
 select * into strict l from public.licenses where id=l.id;
 return jsonb_build_object('licenseKey',l.license_key,'licenseId',l.id,'plan',l.plan,'validUntil',l.valid_until,'reused',false);
end; $$;
revoke all on function public.record_billing_payment(jsonb) from public,anon,authenticated;
grant execute on function public.record_billing_payment(jsonb) to service_role;

create or replace function public.record_billing_refund(p_payment_id text,p_amount_refunded integer) returns void
language plpgsql security invoker set search_path='' as $$
declare l_id uuid; owner_id uuid; plan_name text;
begin
 select l.id,l.user_id,l.plan into l_id,owner_id,plan_name from public.billing_payments p join public.licenses l on l.id=p.license_id where p.payment_id=p_payment_id;
 if l_id is null then return; end if;
 perform pg_advisory_xact_lock(hashtextextended('billing-owner:'||owner_id::text||':'||plan_name,0));
 update public.billing_payments set amount_refunded=greatest(amount_refunded,least(amount,p_amount_refunded)) where payment_id=p_payment_id;
 perform public.refresh_paid_license(l_id);
end; $$;
revoke all on function public.record_billing_refund(text,integer) from public,anon,authenticated;
grant execute on function public.record_billing_refund(text,integer) to service_role;

-- Retain expired token identity for renewal and audits. Do not delete customer records.
create or replace function public.cleanup_expired_access_tokens() returns integer language plpgsql security invoker set search_path='' as $$
declare affected integer;
begin
 update public.access_tokens set is_active=false,status='expired' where expires_at<now() and status is distinct from 'blocked' and (is_active or status is distinct from 'expired');
 get diagnostics affected=row_count;return affected;
end; $$;
revoke all on function public.cleanup_expired_access_tokens() from public,anon,authenticated;
grant execute on function public.cleanup_expired_access_tokens() to service_role;
