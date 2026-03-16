create table if not exists public.trial_key_claims (
  id bigserial primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  token_id uuid not null unique references public.access_tokens(id) on delete cascade,
  key_value text not null,
  created_at timestamptz not null default now()
);

alter table public.trial_key_claims enable row level security;

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
    with candidate as (
      select at.id, at.token_hash
      from public.access_tokens at
      join public.provider_secrets ps on ps.token_id = at.id
      where at.is_active = true
        and (at.expires_at is null or at.expires_at > now())
        and at.max_interviews = 3
        and coalesce(ps.metadata->>'plan_type', '') = 'three_usage'
        and (at.sold_to is null or btrim(at.sold_to) = '')
      order by at.created_at asc
      limit 1
      for update skip locked
    ),
    claimed as (
      update public.access_tokens at
      set sold_to = coalesce(v_email, v_user_id::text),
          updated_at = now()
      from candidate c
      where at.id = c.id
      returning at.id, c.token_hash
    )
    select id, token_hash into v_token_id, v_key
    from claimed;

    if v_token_id is null then
      raise exception 'No free trial keys available';
    end if;

    insert into public.trial_key_claims (user_id, token_id, key_value)
    values (v_user_id, v_token_id, v_key)
    on conflict (user_id) do nothing;

    v_is_new := true;
  end if;

  return jsonb_build_object(
    'access_key', v_key,
    'max_interviews', 3,
    'minutes_per_interview', 15,
    'is_new', v_is_new
  );
end;
$$;

revoke all on table public.trial_key_claims from anon, authenticated;
grant execute on function public.claim_three_usage_trial_key() to authenticated;
