create or replace function public.start_managed_runtime(p_access_token text, p_request_id uuid, p_session_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    t public.access_tokens%rowtype;
    s public.managed_runtime_sessions%rowtype;
    m jsonb;
    expiry timestamptz;
    feedback_preview boolean;
begin
    if p_session_hash !~ '^[a-f0-9]{64}$' then
        raise exception 'Invalid session hash';
    end if;
    select * into t
    from public.access_tokens
    where token_hash = encode(extensions.digest(convert_to(p_access_token, 'UTF8'), 'sha256'), 'hex')
    for update;
    if not found or not t.is_active or t.status <> 'active' or t.expires_at <= now() then
        return null;
    end if;

    select * into s from public.managed_runtime_sessions where id = p_request_id;
    if found then
        if s.token_id <> t.id or s.session_hash <> p_session_hash or s.expires_at <= now() then
            return null;
        end if;
        return jsonb_build_object('expiresAt', s.expires_at, 'tokenId', t.id);
    end if;

    select metadata into m from public.provider_secrets where token_id = t.id;
    if not found then
        return null;
    end if;

    feedback_preview := coalesce(m->>'plan_type' = 'feedback_preview' and m->>'issued_for' = 'hintio_feedback', false);
    if feedback_preview then
        -- Testers sharing a feedback key keep independent sessions until the preview expires.
        expiry := t.expires_at;
    else
        if t.interviews_used >= t.max_interviews then
            return null;
        end if;
        expiry := least(t.expires_at, now() + case when coalesce(m->>'plan_type', '') like 'paid_%' then interval '8 hours' else interval '15 minutes' end);
        update public.managed_runtime_sessions
        set expires_at = least(expires_at, now())
        where token_id = t.id and expires_at > now();
        update public.access_tokens set interviews_used = interviews_used + 1, updated_at = now() where id = t.id;
    end if;

    insert into public.managed_runtime_sessions (id, token_id, session_hash, expires_at)
    values (p_request_id, t.id, p_session_hash, expiry);
    return jsonb_build_object('expiresAt', expiry, 'tokenId', t.id);
end;
$$;

revoke all on function public.start_managed_runtime(text, uuid, text) from public, anon, authenticated;
grant execute on function public.start_managed_runtime(text, uuid, text) to service_role;
