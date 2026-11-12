-- Restrict legacy privileged RPCs; preserve the signed-in trial-claim contract.
create schema if not exists hintio_private;
revoke all on schema hintio_private from public, anon;
grant usage on schema hintio_private to authenticated, service_role;
CREATE OR REPLACE FUNCTION hintio_private.claim_three_usage_trial_key()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_token_id uuid;
  v_key text;
  v_is_new boolean := false;
  v_new_access_token text;
  v_new_token_id uuid;
  v_new_max_interviews integer;
begin
  if v_user_id is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select email into v_email
  from auth.users
  where id = v_user_id;

  select c.token_id, c.key_value
    into v_token_id, v_key
  from public.trial_key_claims c
  where c.user_id = v_user_id
  limit 1;

  if v_token_id is null then
    select d.access_token, d.token_id, d.max_interviews
      into v_new_access_token, v_new_token_id, v_new_max_interviews
    from public.issue_download_access_token('three_usage') d;

    if v_new_token_id is null or v_new_access_token is null then
      raise exception 'No free trial keys available';
    end if;

    update public.access_tokens
    set sold_to = coalesce(v_email, v_user_id::text),
        updated_at = now()
    where id = v_new_token_id;

    insert into public.trial_key_claims (user_id, token_id, key_value)
    values (v_user_id, v_new_token_id, v_new_access_token)
    on conflict (user_id) do nothing;

    select c.token_id, c.key_value
      into v_token_id, v_key
    from public.trial_key_claims c
    where c.user_id = v_user_id
    limit 1;

    v_is_new := true;

    return jsonb_build_object(
      'access_key', v_key,
      'max_interviews', coalesce(v_new_max_interviews, 3),
      'minutes_per_interview', 15,
      'is_new', v_is_new
    );
  end if;

  return jsonb_build_object(
    'access_key', v_key,
    'max_interviews', 3,
    'minutes_per_interview', 15,
    'is_new', v_is_new
  );
end;
$function$;

revoke all on function hintio_private.claim_three_usage_trial_key() from public, anon;
grant execute on function hintio_private.claim_three_usage_trial_key() to authenticated, service_role;
create or replace function public.claim_three_usage_trial_key() returns jsonb
language sql security invoker set search_path='' as $$
 select hintio_private.claim_three_usage_trial_key();
$$;
CREATE OR REPLACE FUNCTION public.get_user_setting(p_key text, p_default jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  v_value jsonb;
begin
  if auth.uid() is null then
    return p_default;
  end if;

  select setting_value into v_value
  from public.app_settings
  where user_id = auth.uid()
    and setting_key = p_key;

  return coalesce(v_value, p_default);
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_user_setting(p_key text, p_value jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.app_settings (user_id, setting_key, setting_value, updated_at)
  values (auth.uid(), p_key, p_value, now())
  on conflict (user_id, setting_key)
  do update set setting_value = p_value, updated_at = now();

  return p_value;
end;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_active_subscription(target_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
    select exists (
        select 1
        from public.subscriptions s
        where target_user_id = auth.uid()
          and not coalesce((auth.jwt()->>'is_anonymous')::boolean, false)
          and s.user_id = target_user_id
          and s.status in ('active', 'trial')
          and (s.expires_at is null or s.expires_at > now())
    );
$function$;

revoke all on function public.claim_three_usage_trial_key() from public, anon, authenticated;
grant execute on function public.claim_three_usage_trial_key() to service_role;
grant execute on function public.claim_three_usage_trial_key() to authenticated;
revoke all on function public.get_trial_key_status(uuid) from public, anon, authenticated;
grant execute on function public.get_trial_key_status(uuid) to service_role;
revoke all on function public.get_user_setting(text,jsonb) from public, anon, authenticated;
grant execute on function public.get_user_setting(text,jsonb) to service_role;
grant execute on function public.get_user_setting(text,jsonb) to authenticated;
revoke all on function public.log_trial_usage_end(bigint,integer) from public, anon, authenticated;
grant execute on function public.log_trial_usage_end(bigint,integer) to service_role;
revoke all on function public.log_trial_usage_start(uuid,uuid) from public, anon, authenticated;
grant execute on function public.log_trial_usage_start(uuid,uuid) to service_role;
revoke all on function public.set_user_setting(text,jsonb) from public, anon, authenticated;
grant execute on function public.set_user_setting(text,jsonb) to service_role;
grant execute on function public.set_user_setting(text,jsonb) to authenticated;
revoke all on function public.user_has_active_subscription(uuid) from public, anon, authenticated;
grant execute on function public.user_has_active_subscription(uuid) to service_role;
grant execute on function public.user_has_active_subscription(uuid) to authenticated;
revoke all on function public.validate_trial_key_usage(uuid) from public, anon, authenticated;
grant execute on function public.validate_trial_key_usage(uuid) to service_role;
-- Trial logging is internal; browser writes must not forge usage for another token.
revoke insert,update,delete on public.trial_usage_logs from anon,authenticated;
drop policy if exists "Allow logging trial usage" on public.trial_usage_logs;
drop policy if exists "Allow updating trial usage logs" on public.trial_usage_logs;
alter policy "Users can view their own trial usage logs" on public.trial_usage_logs to authenticated
 using (auth.uid()=user_id and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
alter policy "Users can view their own settings" on public.app_settings
 using (auth.uid()=user_id and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
alter policy "Users can update their own settings" on public.app_settings
 using (auth.uid()=user_id and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false))
 with check (auth.uid()=user_id and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
alter policy "Users can insert their own settings" on public.app_settings
 with check (auth.uid()=user_id and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
alter policy subscriptions_authenticated_select_own on public.subscriptions
 using (auth.uid()=user_id and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false));
alter policy premium_questions_paid_users_select on public.premium_interview_questions
 using (is_published=true and not coalesce((auth.jwt()->>'is_anonymous')::boolean,false) and public.user_has_active_subscription(auth.uid()));
