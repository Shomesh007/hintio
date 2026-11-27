-- Separates the team's own test browsers and installs from real users.
--
-- An admin marks an ID as internal from the dashboard, and the dashboard marks the
-- admin's own browser automatically. Every ID linked to a marked ID (through a desktop
-- link code or a shared account reference) counts as internal too. Reports default to
-- real users only. Marks are removed with the actor's events by product_analytics_forget.

create table hintio_analytics.internal_actors (
    actor_id uuid primary key,
    marked_at timestamptz not null default now(),
    reason text not null check (reason in ('dashboard', 'admin_browser'))
);

alter table hintio_analytics.internal_actors enable row level security;
alter table hintio_analytics.internal_actors force row level security;
revoke all on hintio_analytics.internal_actors from public, anon, authenticated;
grant select, insert, delete on hintio_analytics.internal_actors to service_role;

-- Marked IDs plus every ID linked to one of them.
create function hintio_analytics.internal_actor_ids()
returns table (actor_id uuid, marked boolean)
language sql
stable
security invoker
set search_path = ''
as $$
    with recursive cluster(actor_id) as (
        select i.actor_id from hintio_analytics.internal_actors i
        union
        select other.actor_id
        from cluster c
        join hintio_analytics.events own on own.actor_id = c.actor_id
            and own.event_name in ('web_link_opened', 'desktop_linked', 'account_linked')
        join hintio_analytics.events other on other.event_value = own.event_value
            and other.event_name in ('web_link_opened', 'desktop_linked', 'account_linked')
            and other.actor_id <> c.actor_id
    )
    select c.actor_id, exists (select 1 from hintio_analytics.internal_actors i where i.actor_id = c.actor_id)
    from cluster c;
$$;

-- 'real' keeps IDs that are not internal, 'internal' keeps only internal IDs, 'all' keeps both.
create function hintio_analytics.in_audience(p_internal boolean, p_audience text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
    select p_audience = 'all' or (p_audience = 'internal') = p_internal;
$$;

drop function public.product_analytics_summary(integer, text, text);

create function public.product_analytics_summary(p_days integer, p_version text default null, p_channel text default 'all', p_audience text default 'real')
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$
    with internal as materialized (
        select actor_id from hintio_analytics.internal_actor_ids()
    ), recent as materialized (
        select e.* from hintio_analytics.events e
        where p_days in (7, 30, 90)
          and p_channel in ('all', 'web', 'installer', 'store')
          and p_audience in ('real', 'internal', 'all')
          and e.received_at >= hintio_analytics.range_start(p_days)
          and hintio_analytics.in_scope(e.source, e.app_version, e.distribution, p_version, p_channel)
          and hintio_analytics.in_audience(exists (select 1 from internal i where i.actor_id = e.actor_id), p_audience)
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
        -- Unfiltered by version and audience so the filter menu keeps every option.
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
    ), excluded as (
        -- How many internal IDs were active in the range, shown so totals are not mistaken for everyone.
        select count(distinct e.actor_id) as internal_ids
        from hintio_analytics.events e
        join internal i on i.actor_id = e.actor_id
        where p_days in (7, 30, 90) and e.received_at >= hintio_analytics.range_start(p_days)
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
        'internal_ids', (select internal_ids from excluded),
        'onboarding', (select counts from activation),
        'breakdown', coalesce((select jsonb_agg(to_jsonb(b) order by b.total desc, b.value) from breakdown b), '[]'::jsonb),
        'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily d), '[]'::jsonb),
        'builds', coalesce((select jsonb_agg(to_jsonb(b) order by b.sessions desc, b.version, b.distribution) from builds b), '[]'::jsonb),
        'versions', coalesce((select jsonb_agg(v.version order by pg_catalog.string_to_array(v.version, '.')::int[] desc) from versions v), '[]'::jsonb)
    )
    from recent;
$$;

drop function public.product_analytics_actors(integer, text, text, integer);

create function public.product_analytics_actors(
    p_days integer, p_version text default null, p_channel text default 'all', p_limit integer default 200, p_audience text default 'real'
)
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$
    with internal as materialized (
        select * from hintio_analytics.internal_actor_ids()
    ), recent as materialized (
        select e.* from hintio_analytics.events e
        where p_days in (7, 30, 90)
          and p_channel in ('all', 'web', 'installer', 'store')
          and p_audience in ('real', 'internal', 'all')
          and e.received_at >= hintio_analytics.range_start(p_days)
          and hintio_analytics.in_scope(e.source, e.app_version, e.distribution, p_version, p_channel)
          and hintio_analytics.in_audience(exists (select 1 from internal i where i.actor_id = e.actor_id), p_audience)
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
            coalesce(k.linked, 0) as linked,
            i.actor_id is not null as internal,
            coalesce(i.marked, false) as marked_internal
        from active a
        join lifetime l on l.actor_id = a.actor_id
        left join links k on k.actor_id = a.actor_id
        left join internal i on i.actor_id = a.actor_id
        order by l.last_seen desc, a.actor_id
        limit least(greatest(coalesce(p_limit, 200), 1), 500)
    )
    select jsonb_build_object(
        'total', (select count(*) from active),
        'actors', coalesce((select jsonb_agg(to_jsonb(r) order by r.last_seen desc, r.actor_id) from listed r), '[]'::jsonb)
    );
$$;

-- Same timeline as before, plus whether each ID is internal and whether it was marked directly.
create or replace function public.product_analytics_timeline(p_actor_id uuid)
returns jsonb
language sql stable
security invoker
set search_path = ''
as $$
    with cluster as (
        select actor_id from hintio_analytics.linked_actors(p_actor_id)
    ), internal as materialized (
        select * from hintio_analytics.internal_actor_ids()
    ), latest as (
        select e.* from hintio_analytics.events e
        join cluster c on c.actor_id = e.actor_id
        order by e.received_at desc, e.event_id desc
        limit 1001
    ), actors as (
        select e.actor_id, min(e.source) as source, min(e.received_at) as first_seen, max(e.received_at) as last_seen,
            (array_agg(e.app_version order by e.received_at desc) filter (where e.app_version is not null))[1] as version,
            (array_agg(e.distribution order by e.received_at desc) filter (where e.distribution is not null))[1] as distribution,
            bool_or(i.actor_id is not null) as internal,
            bool_or(coalesce(i.marked, false)) as marked_internal
        from hintio_analytics.events e
        join cluster c on c.actor_id = e.actor_id
        left join internal i on i.actor_id = e.actor_id
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

-- Marks or unmarks one ID as internal. Returns whether it is now marked directly.
create function public.product_analytics_mark_internal(p_actor_id uuid, p_internal boolean, p_reason text default 'dashboard')
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
    if p_internal then
        insert into hintio_analytics.internal_actors (actor_id, reason) values (p_actor_id, p_reason)
        on conflict (actor_id) do nothing;
    else
        delete from hintio_analytics.internal_actors where actor_id = p_actor_id;
    end if;
    return p_internal;
end;
$$;

create or replace function public.product_analytics_forget(p_actor_id uuid)
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
    delete from hintio_analytics.internal_actors where actor_id = p_actor_id;
    return removed + counterpart;
end;
$$;

revoke all on function hintio_analytics.internal_actor_ids() from public, anon, authenticated;
revoke all on function hintio_analytics.in_audience(boolean, text) from public, anon, authenticated;
revoke all on function public.product_analytics_summary(integer, text, text, text) from public, anon, authenticated;
revoke all on function public.product_analytics_actors(integer, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.product_analytics_timeline(uuid) from public, anon, authenticated;
revoke all on function public.product_analytics_mark_internal(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.product_analytics_forget(uuid) from public, anon, authenticated;
grant execute on function hintio_analytics.internal_actor_ids() to service_role;
grant execute on function hintio_analytics.in_audience(boolean, text) to service_role;
grant execute on function public.product_analytics_summary(integer, text, text, text) to service_role;
grant execute on function public.product_analytics_actors(integer, text, text, integer, text) to service_role;
grant execute on function public.product_analytics_timeline(uuid) to service_role;
grant execute on function public.product_analytics_mark_internal(uuid, boolean, text) to service_role;
grant execute on function public.product_analytics_forget(uuid) to service_role;
