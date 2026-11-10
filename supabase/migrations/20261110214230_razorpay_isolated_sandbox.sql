-- Dedicated empty sandbox storage. No customer rows, keys or grants are copied.
do $$
declare base text;
begin
 foreach base in array array['access_tokens','licenses','provider_secrets','billing_payments','billing_webhook_events'] loop
  execute format('create table public.%I (like public.%I including defaults including constraints including indexes)', 'billing_test_'||replace(base,'billing_',''),base);
  execute format('alter table public.%I enable row level security','billing_test_'||replace(base,'billing_',''));
  execute format('alter table public.%I force row level security','billing_test_'||replace(base,'billing_',''));
  execute format('revoke all on public.%I from public,anon,authenticated','billing_test_'||replace(base,'billing_',''));
  execute format('grant select,insert,update on public.%I to service_role','billing_test_'||replace(base,'billing_',''));
 end loop;
end; $$;
-- LIKE intentionally does not copy foreign keys or triggers.
alter table public.billing_test_licenses add foreign key(user_id) references auth.users(id);
alter table public.billing_test_licenses add foreign key(access_token_id) references public.billing_test_access_tokens(id);
alter table public.billing_test_provider_secrets add foreign key(token_id) references public.billing_test_access_tokens(id) on delete cascade;
alter table public.billing_test_payments add foreign key(license_id) references public.billing_test_licenses(id);

-- Clone the current verified lifecycle implementation; rewrite every billing reference.
do $$
declare signature text; definition text; base text; function_name text; target_name text;
begin
 foreach signature in array array['refresh_paid_license(uuid)','record_billing_payment(jsonb)','record_billing_refund(text,integer)'] loop
  definition:=pg_get_functiondef(('public.'||signature)::regprocedure);
  if definition ilike '%security definer%' then raise exception 'Sandbox clone requires invoker functions'; end if;
  foreach base in array array['access_tokens','licenses','provider_secrets','billing_payments','billing_webhook_events'] loop
   definition:=replace(definition,'public.'||base,'public.billing_test_'||replace(base,'billing_',''));
  end loop;
  foreach function_name in array array['refresh_paid_license','record_billing_payment','record_billing_refund'] loop
   definition:=replace(definition,'public.'||function_name,'public.test_'||function_name);
  end loop;
  definition:=replace(definition,'''SKI-''','''HINTIO-TEST-''');
  definition:=replace(definition,'''billing-owner:''','''test-billing-owner:''');
  execute definition;
  target_name:='public.test_'||signature;
  execute 'revoke all on function '||target_name||' from public,anon,authenticated';
  execute 'grant execute on function '||target_name||' to service_role';
 end loop;
end; $$;
comment on table public.billing_test_licenses is 'Razorpay TEST-mode entitlements. Not accepted by production desktop access resolution.';
