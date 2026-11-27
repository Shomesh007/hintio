-- Per-user product analytics.
--
-- Adds three pseudonymous link events and one launch event, then adds per-actor
-- list, timeline and forget functions. Actor IDs stay random UUIDs created on the
-- device or in the browser. No email, IP address, access key or session content is
-- stored. Rows still expire after 90 days through hintio_analytics.purge_expired_events().
--
--   desktop app_launched     first | returning
--   desktop web_link_opened  one-time random link code (UUID) added to a hintio.tech link opened from the app
--   web     desktop_linked   the same link code, read from the URL fragment by the website
--   web     account_linked   acct_ + 32 hex characters: an HMAC of the Supabase user ID made by the edge function

do $$
declare
    constraint_name text;
begin
    for constraint_name in
        select conname from pg_catalog.pg_constraint
        where conrelid = 'hintio_analytics.events'::regclass and contype = 'c'
    loop
        execute pg_catalog.format('alter table hintio_analytics.events drop constraint %I', constraint_name);
    end loop;
end;
$$;

alter table hintio_analytics.events add constraint events_allowed_values check (
    (source = 'web' and app_version is null and distribution is null and (
        (event_name = 'page_viewed' and event_value in ('/', '/workflows', '/shortcuts', '/get-started', '/download', '/access', '/pricing', '/privacy', '/terms', '/contact'))
        or (event_name = 'download_clicked' and event_value in ('production', 'preview'))
        or (event_name = 'trial_clicked' and event_value = 'free_trial')
        or (event_name = 'upgrade_clicked' and event_value in ('monthly', 'yearly'))
        or (event_name = 'desktop_linked' and event_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
        or (event_name = 'account_linked' and event_value ~ '^acct_[0-9a-f]{32}$')
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
        or (event_name = 'app_launched' and event_value in ('first', 'returning'))
        or (event_name = 'web_link_opened' and event_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    ))
);

create index product_analytics_actor on hintio_analytics.events (actor_id, received_at);
create index product_analytics_links on hintio_analytics.events (event_value)
    where event_name in ('web_link_opened', 'desktop_linked', 'account_linked');

-- True when an event belongs to the selected version and channel. Website events
-- have no version, so a version filter shows desktop activity only.
create function hintio_analytics.in_scope(p_source text, p_app_version text, p_distribution text, p_version text, p_channel text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
    select (p_channel = 'all'
            or (p_channel = 'web' and p_source = 'web')
            or (p_channel in ('installer', 'store') and p_source = 'desktop' and p_distribution = p_channel))
        and (p_version is null or (p_source = 'desktop' and p_app_version = p_version));
$$;

create function hintio_analytics.range_start(p_days integer)
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
    select (pg_catalog.date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') - (p_days - 1) * interval '1 day';
$$;

-- All actors joined to p_actor_id through shared link codes or a shared account reference.
create function hintio_analytics.linked_actors(p_actor_id uuid)
returns table (actor_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
    with recursive cluster(actor_id) as (
        select p_actor_id
        union
        select other.actor_id
        from cluster c
        join hintio_analytics.events own on own.actor_id = c.actor_id
            and own.event_name in ('web_link_opened', 'desktop_linked', 'account_linked')
        join hintio_analytics.events other on other.event_value = own.event_value
            and other.event_name in ('web_link_opened', 'desktop_linked', 'account_linked')
            and other.actor_id <> c.actor_id
    )
    select cluster.actor_id from cluster limit 50;
$$;

drop function public.product_analytics_summary(integer);

create function public.product_analytics_summary(p_days integer, p_version text default null, p_channel text default 'all')
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$
    with recent as materialized (
        select * from hintio_analytics.events
        where p_days in (7, 30, 90)
          and p_channel in ('all', 'web', 'installer', 'store')
          and received_at >= hintio_analytics.range_start(p_days)
          and hintio_analytics.in_scope(source, app_version, distribution, p_version, p_channel)
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
        where event_name not in ('web_link_opened', 'desktop_linked', 'account_linked')
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
    ), versions as (
        -- Unfiltered by version so the filter menu keeps every option.
        select distinct app_version as version
        from hintio_analytics.events
        where p_days in (7, 30, 90) and source = 'desktop' and received_at >= hintio_analytics.range_start(p_days)
    ), links as (
        select
            count(distinct w.actor_id) as linked_browsers,
            count(distinct d.actor_id) as linked_installs
        from recent w
        join hintio_analytics.events d on d.event_value = w.event_value and d.event_name = 'web_link_opened'
        where w.event_name = 'desktop_linked'
    )
    select jsonb_build_object(
        'page_views', count(*) filter (where source = 'web' and event_name = 'page_viewed'),
        'browsers', count(distinct actor_id) filter (where source = 'web' and event_name = 'page_viewed'),
        'sessions', count(*) filter (where source = 'desktop' and event_name = 'session_started'),
        'installs', count(distinct actor_id) filter (where source = 'desktop' and event_name = 'session_started'),
        'new_installs', count(distinct actor_id) filter (where source = 'desktop' and event_name = 'app_launched' and event_value = 'first'),
        'linked_browsers', (select linked_browsers from links),
        'linked_installs', (select linked_installs from links),
        'accounts', count(distinct event_value) filter (where source = 'web' and event_name = 'account_linked'),
        'onboarding', (select counts from activation),
        'breakdown', coalesce((select jsonb_agg(to_jsonb(b) order by b.total desc, b.value) from breakdown b), '[]'::jsonb),
        'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily d), '[]'::jsonb),
        'builds', coalesce((select jsonb_agg(to_jsonb(b) order by b.sessions desc, b.version, b.distribution) from builds b), '[]'::jsonb),
        'versions', coalesce((select jsonb_agg(v.version order by pg_catalog.string_to_array(v.version, '.')::int[] desc) from versions v), '[]'::jsonb)
    )
    from recent;
$$;

-- One row per browser or install active in the range, most recent first.
create function public.product_analytics_actors(p_days integer, p_version text default null, p_channel text default 'all', p_limit integer default 200)
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$
    with recent as materialized (
        select * from hintio_analytics.events
        where p_days in (7, 30, 90)
          and p_channel in ('all', 'web', 'installer', 'store')
          and received_at >= hintio_analytics.range_start(p_days)
          and hintio_analytics.in_scope(source, app_version, distribution, p_version, p_channel)
    ), active as (
        select actor_id, min(source) as source,
            count(*) as events,
            count(*) filter (where event_name = 'page_viewed') as page_views,
            count(*) filter (where event_name = 'download_clicked') as installer_clicks,
            count(*) filter (where event_name = 'trial_clicked') as trial_clicks,
            count(*) filter (where event_name = 'upgrade_clicked') as plan_clicks,
            count(*) filter (where event_name = 'session_started') as sessions,
            count(*) filter (where event_name = 'session_start_blocked') as blocked_starts,
            count(*) filter (where event_name = 'session_answered') as answered_sessions,
            count(*) filter (where event_name = 'feature_used') as features_used
        from recent
        group by actor_id
    ), lifetime as (
        select e.actor_id,
            min(e.received_at) as first_seen,
            max(e.received_at) as last_seen,
            (array_agg(e.app_version order by e.received_at desc) filter (where e.app_version is not null))[1] as version,
            (array_agg(e.distribution order by e.received_at desc) filter (where e.distribution is not null))[1] as distribution,
            min(e.received_at) filter (where e.event_name = 'app_launched' and e.event_value = 'first') as installed_at,
            bool_or(e.event_name = 'onboarding_completed') as onboarded,
            bool_or(e.event_name = 'account_linked') as has_account
        from hintio_analytics.events e
        join active a on a.actor_id = e.actor_id
        group by e.actor_id
    ), links as (
        select a.actor_id, count(distinct other.actor_id) as linked
        from active a
        join hintio_analytics.events own on own.actor_id = a.actor_id
            and own.event_name in ('web_link_opened', 'desktop_linked', 'account_linked')
        join hintio_analytics.events other on other.event_value = own.event_value
            and other.event_name in ('web_link_opened', 'desktop_linked', 'account_linked')
            and other.actor_id <> a.actor_id
        group by a.actor_id
    ), listed as (
        select a.*, l.first_seen, l.last_seen, l.version, l.distribution, l.installed_at, l.onboarded, l.has_account,
            coalesce(k.linked, 0) as linked
        from active a
        join lifetime l on l.actor_id = a.actor_id
        left join links k on k.actor_id = a.actor_id
        order by l.last_seen desc, a.actor_id
        limit least(greatest(coalesce(p_limit, 200), 1), 500)
    )
    select jsonb_build_object(
        'total', (select count(*) from active),
        'actors', coalesce((select jsonb_agg(to_jsonb(r) order by r.last_seen desc, r.actor_id) from listed r), '[]'::jsonb)
    );
$$;

-- Every retained event for one actor and the actors linked to it, oldest first.
-- Link codes are replaced with null: they only matter for joining.
create function public.product_analytics_timeline(p_actor_id uuid)
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$
    with cluster as (
        select actor_id from hintio_analytics.linked_actors(p_actor_id)
    ), latest as (
        select e.* from hintio_analytics.events e
        join cluster c on c.actor_id = e.actor_id
        order by e.received_at desc, e.event_id desc
        limit 1001
    ), actors as (
        select e.actor_id, min(e.source) as source, min(e.received_at) as first_seen, max(e.received_at) as last_seen,
            (array_agg(e.app_version order by e.received_at desc) filter (where e.app_version is not null))[1] as version,
            (array_agg(e.distribution order by e.received_at desc) filter (where e.distribution is not null))[1] as distribution
        from hintio_analytics.events e
        join cluster c on c.actor_id = e.actor_id
        group by e.actor_id
    ), shown as (
        select * from latest order by received_at desc, event_id desc limit 1000
    )
    select jsonb_build_object(
        'actor_id', p_actor_id,
        'actors', coalesce((select jsonb_agg(to_jsonb(a) order by a.first_seen, a.actor_id) from actors a), '[]'::jsonb),
        'events', coalesce((
            select jsonb_agg(jsonb_build_object(
                'at', s.received_at,
                'actor_id', s.actor_id,
                'source', s.source,
                'event', s.event_name,
                'value', case when s.event_name in ('web_link_opened', 'desktop_linked') then null else s.event_value end,
                'version', s.app_version,
                'distribution', s.distribution
            ) order by s.received_at, s.event_id)
            from shown s
        ), '[]'::jsonb),
        'truncated', (select count(*) > 1000 from latest)
    );
$$;

-- Deletes one actor's events and the matching half of each of its links, for data requests.
create function public.product_analytics_forget(p_actor_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
    removed integer;
    counterpart integer;
begin
    delete from hintio_analytics.events
    where event_name in ('web_link_opened', 'desktop_linked')
      and event_value in (
          select event_value from hintio_analytics.events
          where actor_id = p_actor_id and event_name in ('web_link_opened', 'desktop_linked')
      )
      and actor_id <> p_actor_id;
    get diagnostics counterpart = row_count;
    delete from hintio_analytics.events where actor_id = p_actor_id;
    get diagnostics removed = row_count;
    return removed + counterpart;
end;
$$;

revoke all on function hintio_analytics.in_scope(text, text, text, text, text) from public, anon, authenticated;
revoke all on function hintio_analytics.range_start(integer) from public, anon, authenticated;
revoke all on function hintio_analytics.linked_actors(uuid) from public, anon, authenticated;
revoke all on function public.product_analytics_summary(integer, text, text) from public, anon, authenticated;
revoke all on function public.product_analytics_actors(integer, text, text, integer) from public, anon, authenticated;
revoke all on function public.product_analytics_timeline(uuid) from public, anon, authenticated;
revoke all on function public.product_analytics_forget(uuid) from public, anon, authenticated;
grant execute on function hintio_analytics.in_scope(text, text, text, text, text) to service_role;
grant execute on function hintio_analytics.range_start(integer) to service_role;
grant execute on function hintio_analytics.linked_actors(uuid) to service_role;
grant execute on function public.product_analytics_summary(integer, text, text) to service_role;
grant execute on function public.product_analytics_actors(integer, text, text, integer) to service_role;
grant execute on function public.product_analytics_timeline(uuid) to service_role;
grant execute on function public.product_analytics_forget(uuid) to service_role;
