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
  return jsonb_build_object('licenseKey',l.license_key,'licenseId',l.id,'plan',l.plan,'validUntil',l.valid_until,'reused',true,'accessStatus',(select status from public.access_tokens where id=l.access_token_id));
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
 insert into public.provider_secrets(token_id,provider_mode,metadata) values(v_token_id,'managed',jsonb_build_object('plan_type','paid_'||plan_name,'provider','openai','billing_license_id',l.id,'sessionTimeoutMs',null,'session_timeout_ms',null,'sessionLimitMs',null))
 on conflict(token_id) do update set metadata=public.provider_secrets.metadata||excluded.metadata;
 update public.access_tokens set max_interviews=2147483647 where id=v_token_id;
 insert into public.billing_payments(payment_id,license_id,subscription_id,amount,currency,paid_at,period_start,period_end,amount_refunded)
 values(payment_id_value,l.id,sub_id,(p->>'amount')::integer,p->>'currency',paid_time,from_time,end_time,coalesce((p->>'amount_refunded')::integer,0));
 perform public.refresh_paid_license(l.id);
 select * into strict l from public.licenses where id=l.id;
 return jsonb_build_object('licenseKey',l.license_key,'licenseId',l.id,'plan',l.plan,'validUntil',l.valid_until,'reused',false,'accessStatus',(select status from public.access_tokens where id=l.access_token_id));
end; $$;
revoke all on function public.record_billing_payment(jsonb) from public,anon,authenticated;
grant execute on function public.record_billing_payment(jsonb) to service_role;
