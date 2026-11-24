create schema if not exists hintio_analytics;
revoke all on schema hintio_analytics from public, anon, authenticated;
grant usage on schema hintio_analytics to service_role;

create table hintio_analytics.events (
    event_id uuid primary key,
    actor_id uuid not null,
    received_at timestamptz not null default now(),
    source text not null,
    event_name text not null,
    event_value text not null,
    app_version text,
    distribution text,
    check (
        (source = 'web' and app_version is null and distribution is null and (
            (event_name = 'page_viewed' and event_value in ('/', '/workflows', '/shortcuts', '/get-started', '/download', '/access', '/pricing', '/privacy', '/terms', '/contact'))
            or (event_name = 'download_clicked' and event_value in ('production', 'preview'))
            or (event_name = 'trial_clicked' and event_value = 'free_trial')
            or (event_name = 'upgrade_clicked' and event_value in ('monthly', 'yearly'))
        ))
        or (source = 'desktop' and app_version is not null and app_version ~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$'
            and distribution is not null and distribution in ('installer', 'store') and (
            (event_name = 'session_started' and event_value in ('speaker_only', 'mic_only', 'both', 'none'))
            or (event_name = 'onboarding_step' and event_value in ('welcome', 'context', 'review'))
            or (event_name = 'onboarding_completed' and event_value in ('blank', 'provided'))
            or (event_name = 'session_start_blocked' and event_value in ('missing_key', 'setup_required', 'update_required', 'initialization_failed'))
            or (event_name = 'session_profile' and event_value in ('interview', 'technical-interview', 'sales', 'meeting', 'presentation', 'negotiation', 'exam'))
            or (event_name = 'session_answered' and event_value = 'completed')
            or (event_name = 'session_ended' and event_value in ('under_1m', '1_to_5m', '5_to_15m', '15m_plus'))
            or (event_name = 'feature_used' and event_value in ('single_screenshot', 'multi_screenshot', 'debug_screenshot', 'history', 'settings', 'ai_context'))
        ))
    )
);

alter table hintio_analytics.events enable row level security;
alter table hintio_analytics.events force row level security;
revoke all on hintio_analytics.events from public, anon, authenticated;
grant select, insert, delete on hintio_analytics.events to service_role;

create index product_analytics_received_at on hintio_analytics.events (received_at);
create index product_analytics_actor_time on hintio_analytics.events (source, actor_id, received_at);

create function public.record_product_analytics(
    p_event_id uuid, p_actor_id uuid, p_source text, p_event_name text, p_event_value text, p_app_version text, p_distribution text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_source || ':' || p_actor_id::text, 0));
    if exists (select 1 from hintio_analytics.events where event_id = p_event_id) then
        return true;
    end if;
    if (
        select count(*) from hintio_analytics.events
        where source = p_source and actor_id = p_actor_id and received_at >= now() - interval '1 hour'
    ) >= 120 then
        return false;
    end if;
    insert into hintio_analytics.events (event_id, actor_id, source, event_name, event_value, app_version, distribution)
    values (p_event_id, p_actor_id, p_source, p_event_name, p_event_value, p_app_version, p_distribution)
    on conflict (event_id) do nothing;
    return true;
end;
$$;

create function public.product_analytics_summary(p_days integer)
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$
    with recent as materialized (
        select * from hintio_analytics.events
        where p_days in (7, 30)
          and received_at >= (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') - (p_days - 1) * interval '1 day'
    ), welcome_in_range as (
        select actor_id, min(received_at) as welcomed_at
        from recent
        where source = 'desktop' and event_name = 'onboarding_step' and event_value = 'welcome'
        group by actor_id
    ), welcome_cohort as (
        select w.* from welcome_in_range w
        where not exists (
            select 1 from hintio_analytics.events e
            where e.source = 'desktop' and e.actor_id = w.actor_id
              and e.event_name = 'onboarding_step' and e.event_value = 'welcome'
              and e.received_at < w.welcomed_at
        )
    ), setup_progress as (
        select w.actor_id,
            bool_or(e.event_name = 'onboarding_step' and e.event_value = 'context') as reached_context,
            bool_or(e.event_name = 'onboarding_step' and e.event_value = 'review') as reached_review,
            min(e.received_at) filter (where e.event_name = 'onboarding_completed') as completed_at
        from welcome_cohort w
        left join recent e on e.source = 'desktop' and e.actor_id = w.actor_id and e.received_at >= w.welcomed_at
        group by w.actor_id
    ), first_sessions as (
        select p.actor_id, min(e.received_at) as started_at
        from setup_progress p
        join recent e on e.source = 'desktop' and e.actor_id = p.actor_id
            and e.event_name = 'session_started' and e.received_at >= p.completed_at
        group by p.actor_id
    ), completed_in_range as (
        select distinct on (actor_id) actor_id, event_value, received_at
        from recent
        where source = 'desktop' and event_name = 'onboarding_completed'
        order by actor_id, received_at, event_id
    ), context_outcomes as (
        select
            count(*) filter (where c.event_value = 'blank') as skipped,
            count(*) filter (where c.event_value = 'provided') as provided
        from completed_in_range c
        where not exists (
            select 1 from hintio_analytics.events e
            where e.source = 'desktop' and e.actor_id = c.actor_id
              and e.event_name = 'onboarding_completed' and e.received_at < c.received_at
        )
    ), activation as (
        select jsonb_build_object(
            'context_skipped', (select skipped from context_outcomes),
            'context_provided', (select provided from context_outcomes),
            'welcome', count(*),
            'context', count(*) filter (where p.reached_context or p.reached_review or p.completed_at is not null),
            'review', count(*) filter (where p.reached_review or p.completed_at is not null),
            'completed', count(p.completed_at),
            'first_session', count(s.actor_id),
            'first_answer', count(*) filter (where exists (
                select 1 from recent e where e.source = 'desktop' and e.actor_id = p.actor_id
                    and e.event_name = 'session_answered' and e.received_at >= s.started_at
            ))
        ) as counts
        from setup_progress p
        left join first_sessions s on s.actor_id = p.actor_id
    ), breakdown as (
        select source, event_name as event, event_value as value, count(*) as total, count(distinct actor_id) as actors
        from recent
        group by source, event_name, event_value
    ), daily as (
        select (received_at at time zone 'UTC')::date as day,
            count(*) filter (where source = 'web' and event_name = 'page_viewed') as page_views,
            count(distinct actor_id) filter (where source = 'web' and event_name = 'page_viewed') as browsers,
            count(*) filter (where source = 'desktop' and event_name = 'session_started') as sessions,
            count(distinct actor_id) filter (where source = 'desktop' and event_name = 'session_started') as installs
        from recent
        group by 1
    ), builds as (
        select app_version as version, distribution, count(distinct actor_id) as installs,
            count(*) filter (where event_name = 'session_started') as sessions
        from recent
        where source = 'desktop'
        group by app_version, distribution
    )
    select jsonb_build_object(
        'page_views', count(*) filter (where source = 'web' and event_name = 'page_viewed'),
        'browsers', count(distinct actor_id) filter (where source = 'web' and event_name = 'page_viewed'),
        'sessions', count(*) filter (where source = 'desktop' and event_name = 'session_started'),
        'installs', count(distinct actor_id) filter (where source = 'desktop' and event_name = 'session_started'),
        'onboarding', (select counts from activation),
        'breakdown', coalesce((select jsonb_agg(to_jsonb(b) order by b.total desc, b.value) from breakdown b), '[]'::jsonb),
        'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily d), '[]'::jsonb),
        'builds', coalesce((select jsonb_agg(to_jsonb(b) order by b.sessions desc, b.version, b.distribution) from builds b), '[]'::jsonb)
    )
    from recent;
$$;

create function hintio_analytics.purge_expired_events()
returns void
language sql
security invoker
set search_path = ''
as $$
    delete from hintio_analytics.events where received_at < now() - interval '90 days';
$$;

revoke all on function public.record_product_analytics(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.product_analytics_summary(integer) from public, anon, authenticated;
revoke all on function hintio_analytics.purge_expired_events() from public, anon, authenticated;
grant execute on function public.record_product_analytics(uuid, uuid, text, text, text, text, text) to service_role;
grant execute on function public.product_analytics_summary(integer) to service_role;
grant execute on function hintio_analytics.purge_expired_events() to service_role;
