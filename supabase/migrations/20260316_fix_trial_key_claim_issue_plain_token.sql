create or replace function public.claim_three_usage_trial_key()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
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
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

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
$$;

-- Remove previously stored hash-like values so affected users can receive a valid plain access key.
delete from public.trial_key_claims
where key_value ~ '^[0-9a-f]{64}$';

grant execute on function public.claim_three_usage_trial_key() to authenticated;
