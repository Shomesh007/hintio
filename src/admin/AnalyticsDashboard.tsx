import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { analyticsCatalog } from '../../supabase/functions/_shared/analyticsContract';
import { analyticsFunctionsUrl } from '../lib/productAnalytics';
import { supabase } from '../lib/supabase';
import {
    actorName,
    channelName,
    describeEvent,
    groupByDay,
    keyActions,
    valueLabels as labels,
    type ActorList,
    type ActorRow,
    type Timeline,
} from './analyticsPeople';
import './analyticsDashboard.css';

type Range = 7 | 30 | 90;
type Channel = 'all' | 'web' | 'installer' | 'store';
type Filters = { range: Range; version: string; channel: Channel };
type Tab = 'overview' | 'people';
type Report = {
    page_views: number;
    browsers: number;
    sessions: number;
    installs: number;
    new_installs: number;
    linked_browsers: number;
    linked_installs: number;
    accounts: number;
    versions: string[];
    onboarding: Record<
        'welcome' | 'context' | 'review' | 'completed' | 'first_session' | 'first_answer' | 'context_skipped' | 'context_provided',
        number
    >;
    breakdown: Array<{ source: 'web' | 'desktop'; event: string; value: string; total: number; actors: number }>;
    daily: Array<{ day: string; page_views: number; browsers: number; sessions: number; installs: number }>;
    builds: Array<{ version: string; distribution: 'installer' | 'store'; installs: number; sessions: number }>;
};

const number = new Intl.NumberFormat();
const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });
const dayLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const dateTime = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const channelLabels: Record<Channel, string> = { all: 'All channels', web: 'Website', installer: 'Desktop installer', store: 'Microsoft Store' };

function Breakdown({
    title,
    source,
    event,
    values,
    report,
}: {
    title: string;
    source: 'web' | 'desktop';
    event: string;
    values: readonly string[];
    report: Report;
}) {
    const hasCoverage = report.breakdown.some(row => row.source === source);
    const rows = values
        .map(value => {
            const row = report.breakdown.find(row => row.source === source && row.event === event && row.value === value);
            return { value, total: row?.total ?? 0, actors: row?.actors ?? 0 };
        })
        .sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...rows.map(row => row.total));

    return (
        <section className="analytics-panel">
            <h2>{title}</h2>
            {!hasCoverage ? (
                <p>No reporting activity in this range.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Option</th>
                            <th scope="col">Actions</th>
                            <th scope="col">{source === 'web' ? 'Browsers' : 'Installs'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.value}>
                                <th scope="row">
                                    {labels[row.value] ?? row.value}
                                    {row.total > 0 && (
                                        <span aria-hidden="true" className="analytics-bar" style={{ width: `${(100 * row.total) / max}%` }} />
                                    )}
                                </th>
                                <td>{number.format(row.total)}</td>
                                <td>{number.format(row.actors)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}

function OnboardingReport({ report }: { report: Report }) {
    const funnel = report.onboarding;
    const skipped = funnel?.context_skipped ?? 0;
    const provided = funnel?.context_provided ?? 0;
    const total = skipped + provided;

    return (
        <section className="analytics-onboarding" aria-labelledby="analytics-onboarding-heading">
            <h2 id="analytics-onboarding-heading">Onboarding &amp; activation</h2>
            <div className="analytics-grid">
                <section className="analytics-panel">
                    <h3>Context during completed setups</h3>
                    {total ? (
                        <dl className="analytics-context-count">
                            <div>
                                <dt>Skipped</dt>
                                <dd>
                                    {number.format(skipped)} ({percent.format(skipped / total)})
                                </dd>
                            </div>
                            <div>
                                <dt>Provided</dt>
                                <dd>
                                    {number.format(provided)} ({percent.format(provided / total)})
                                </dd>
                            </div>
                        </dl>
                    ) : (
                        <p>No setup completions reported in this range.</p>
                    )}
                </section>
                <section className="analytics-panel">
                    <h3>First-time setup funnel</h3>
                    {funnel?.welcome ? (
                        <>
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">Step</th>
                                        <th scope="col">Installs</th>
                                        <th scope="col">Of starts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(
                                        [
                                            ['Opened welcome', funnel.welcome],
                                            ['Reached context', funnel.context],
                                            ['Reached final step', funnel.review],
                                            ['Completed setup', funnel.completed],
                                            ['Started first session', funnel.first_session],
                                            ['Received first answer', funnel.first_answer],
                                        ] as const
                                    ).map(([step, count]) => (
                                        <tr key={step}>
                                            <th scope="row">{step}</th>
                                            <td>{number.format(count)}</td>
                                            <td>{percent.format(count / funnel.welcome)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="analytics-note">
                                Counts follow installs that began setup in this range. Recent starts may still be in progress.
                            </p>
                        </>
                    ) : (
                        <p>No first-time setup starts reported in this range.</p>
                    )}
                </section>
            </div>
        </section>
    );
}

function ReportView({ report }: { report: Report }) {
    return (
        <>
            <dl className="analytics-kpis">
                {(
                    [
                        ['Unique browsers', report.browsers],
                        ['Page views', report.page_views],
                        ['Active desktop installs', report.installs],
                        ['Desktop sessions', report.sessions],
                        ['New installs', report.new_installs ?? 0],
                        ['Browsers linked to an install', report.linked_browsers ?? 0],
                        ['Signed-in accounts', report.accounts ?? 0],
                    ] as const
                ).map(([label, value]) => (
                    <div key={label}>
                        <dt>{label}</dt>
                        <dd>{number.format(value)}</dd>
                    </div>
                ))}
            </dl>
            <p className="analytics-note">
                Counts cover builds and browsers reporting analytics. An active install has at least one successful session start in the selected
                range. New installs count first launches on desktop builds that report launches. A version filter shows desktop activity only.
            </p>
            <OnboardingReport report={report} />
            <div className="analytics-grid">
                <Breakdown
                    title="Desktop audio modes"
                    source="desktop"
                    event="session_started"
                    values={analyticsCatalog.desktop.session_started}
                    report={report}
                />
                <Breakdown
                    title="Session presets"
                    source="desktop"
                    event="session_profile"
                    values={analyticsCatalog.desktop.session_profile}
                    report={report}
                />
                <Breakdown
                    title="Session duration"
                    source="desktop"
                    event="session_ended"
                    values={analyticsCatalog.desktop.session_ended}
                    report={report}
                />
                <Breakdown
                    title="Blocked session starts"
                    source="desktop"
                    event="session_start_blocked"
                    values={analyticsCatalog.desktop.session_start_blocked}
                    report={report}
                />
                <Breakdown
                    title="Desktop feature usage"
                    source="desktop"
                    event="feature_used"
                    values={analyticsCatalog.desktop.feature_used}
                    report={report}
                />
                <Breakdown title="Website pages" source="web" event="page_viewed" values={analyticsCatalog.web.page_viewed} report={report} />
                <Breakdown
                    title="Installer clicks"
                    source="web"
                    event="download_clicked"
                    values={analyticsCatalog.web.download_clicked}
                    report={report}
                />
                <Breakdown title="Trial interest" source="web" event="trial_clicked" values={analyticsCatalog.web.trial_clicked} report={report} />
                <Breakdown title="Plan interest" source="web" event="upgrade_clicked" values={analyticsCatalog.web.upgrade_clicked} report={report} />
                <section className="analytics-panel">
                    <h2>Reporting desktop builds</h2>
                    {!report.builds.length ? (
                        <p>No reporting builds in this range.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Build</th>
                                    <th scope="col">Installs</th>
                                    <th scope="col">Sessions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.builds.map(build => (
                                    <tr key={`${build.version}-${build.distribution}`}>
                                        <th scope="row">
                                            {build.version} · {build.distribution === 'store' ? 'Store' : 'Installer'}
                                        </th>
                                        <td>{number.format(build.installs)}</td>
                                        <td>{number.format(build.sessions)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
                <section className="analytics-panel">
                    <h2>
                        Daily activity <small>UTC</small>
                    </h2>
                    {!report.daily.length ? (
                        <p>No recorded activity in this range.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Day</th>
                                    <th scope="col">Browsers</th>
                                    <th scope="col">Active installs</th>
                                    <th scope="col">Sessions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...report.daily].reverse().map(day => (
                                    <tr key={day.day}>
                                        <th scope="row">{dayLabel.format(new Date(day.day))}</th>
                                        <td>{number.format(day.browsers)}</td>
                                        <td>{number.format(day.installs)}</td>
                                        <td>{number.format(day.sessions)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>
        </>
    );
}

async function adminRequest<T>(
    accessToken: string,
    query: Record<string, string>,
    signal?: AbortSignal,
    method: 'GET' | 'DELETE' = 'GET'
): Promise<T> {
    const response = await fetch(`${analyticsFunctionsUrl}/analytics-admin?${new URLSearchParams(query)}`, {
        method,
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal,
        redirect: 'error',
    });
    if (response.status === 401) throw new Error('Your sign-in expired. Sign out and sign in again.');
    if (response.status === 403) throw new Error('This Google account does not have analytics access.');
    if (!response.ok) throw new Error('The analytics report could not be loaded.');
    return response.json();
}

function filterQuery(filters: Filters, view: 'summary' | 'actors') {
    const query: Record<string, string> = { view, days: String(filters.range), channel: filters.channel };
    if (filters.version) query.version = filters.version;
    return query;
}

function useAdminData<T>(accessToken: string | undefined, query: Record<string, string> | null) {
    const key = query ? new URLSearchParams(query).toString() : '';
    const [state, setState] = useState<{ key: string; data?: T; error?: string } | null>(null);
    const [reload, setReload] = useState(0);
    useEffect(() => {
        if (!accessToken || !key) return;
        const request = new AbortController();
        adminRequest<T>(accessToken, Object.fromEntries(new URLSearchParams(key)), request.signal)
            .then(data => {
                if (!request.signal.aborted) setState({ key, data });
            })
            .catch(failure => {
                if (!request.signal.aborted)
                    setState({ key, error: failure instanceof Error ? failure.message : 'The analytics report could not be loaded.' });
            });
        return () => request.abort();
    }, [accessToken, key, reload]);
    const current = state?.key === key ? state : null;
    return { data: current?.data, error: current?.error, reload: () => setReload(count => count + 1) };
}

function FilterBar({ filters, versions, onChange }: { filters: Filters; versions: string[]; onChange: (filters: Filters) => void }) {
    const versionOptions = filters.version && !versions.includes(filters.version) ? [filters.version, ...versions] : versions;
    return (
        <div className="analytics-filters">
            <div className="analytics-range" role="group" aria-label="Report date range">
                {([7, 30, 90] as const).map(days => (
                    <button key={days} aria-pressed={filters.range === days} onClick={() => onChange({ ...filters, range: days })}>
                        {days} days
                    </button>
                ))}
            </div>
            <label>
                Channel
                <select value={filters.channel} onChange={event => onChange({ ...filters, channel: event.target.value as Channel })}>
                    {(Object.keys(channelLabels) as Channel[]).map(channel => (
                        <option key={channel} value={channel}>
                            {channelLabels[channel]}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Version
                <select value={filters.version} onChange={event => onChange({ ...filters, version: event.target.value })}>
                    <option value="">All versions</option>
                    {versionOptions.map(version => (
                        <option key={version} value={version}>
                            {version}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}

function PeopleList({ list, selected, onSelect }: { list: ActorList; selected: string | null; onSelect: (actorId: string) => void }) {
    if (!list.actors.length) return <p>No browsers or installs reported activity for these filters.</p>;
    return (
        <section className="analytics-panel analytics-people">
            <h2>Browsers and installs</h2>
            <p className="analytics-note">
                Showing {number.format(list.actors.length)} of {number.format(list.total)}, most recently seen first. First and last seen cover the
                full 90-day retention window; activity columns cover the selected range. Times are UTC.
            </p>
            <div className="analytics-scroll">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">ID</th>
                            <th scope="col">Channel</th>
                            <th scope="col">Version</th>
                            <th scope="col">First seen</th>
                            <th scope="col">Last seen</th>
                            <th scope="col">Sessions</th>
                            <th scope="col">Key actions</th>
                            <th scope="col">Linked</th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.actors.map((actor: ActorRow) => (
                            <tr key={actor.actor_id} aria-selected={selected === actor.actor_id}>
                                <th scope="row">
                                    <button className="analytics-link" onClick={() => onSelect(actor.actor_id)}>
                                        {actorName(actor)}
                                    </button>
                                </th>
                                <td>{channelName(actor)}</td>
                                <td>{actor.version ?? '—'}</td>
                                <td>{dateTime.format(new Date(actor.first_seen))}</td>
                                <td>{dateTime.format(new Date(actor.last_seen))}</td>
                                <td>{actor.source === 'desktop' ? number.format(actor.sessions) : '—'}</td>
                                <td className="analytics-actions">{keyActions(actor).join(' · ') || '—'}</td>
                                <td>
                                    {[actor.linked ? `${actor.linked} linked` : '', actor.has_account ? 'account' : ''].filter(Boolean).join(', ') ||
                                        '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function TimelineView({ timeline, onClose, onForget }: { timeline: Timeline; onClose: () => void; onForget: () => void }) {
    const names = new Map(timeline.actors.map(actor => [actor.actor_id, actorName(actor)]));
    const multiple = timeline.actors.length > 1;
    return (
        <section className="analytics-panel analytics-timeline" aria-labelledby="analytics-timeline-heading">
            <div className="analytics-timeline-header">
                <h2 id="analytics-timeline-heading">Timeline · {names.get(timeline.actor_id) ?? timeline.actor_id.slice(0, 8)}</h2>
                <button onClick={onClose}>Close</button>
            </div>
            {multiple && (
                <p className="analytics-note">
                    Linked through the desktop app or a website sign-in:{' '}
                    {timeline.actors
                        .map(actor => `${actorName(actor)} (${channelName(actor)}${actor.version ? ` ${actor.version}` : ''})`)
                        .join(', ')}
                </p>
            )}
            {timeline.truncated && <p className="analytics-note">Showing the latest 1,000 events.</p>}
            {groupByDay(timeline.events).map(day => (
                <div key={day.day} className="analytics-day">
                    <h3>{dayLabel.format(new Date(day.day))}</h3>
                    <ol>
                        {day.events.map((event, index) => {
                            const { stage, text } = describeEvent(event);
                            return (
                                <li key={`${event.at}-${index}`} data-stage={stage}>
                                    <time dateTime={event.at}>{time.format(new Date(event.at))}</time>
                                    <span>{text}</span>
                                    {multiple && <small>{names.get(event.actor_id)}</small>}
                                </li>
                            );
                        })}
                    </ol>
                </div>
            ))}
            <div className="analytics-forget">
                <p>For a deletion request, remove this ID&rsquo;s analytics events and break its links. This cannot be undone.</p>
                <button onClick={onForget}>Delete this ID&rsquo;s analytics</button>
            </div>
        </section>
    );
}

function PeopleView({ accessToken, filters }: { accessToken: string; filters: Filters }) {
    const [selected, setSelected] = useState<string | null>(null);
    const [notice, setNotice] = useState('');
    const list = useAdminData<ActorList>(accessToken, filterQuery(filters, 'actors'));
    const timeline = useAdminData<Timeline>(accessToken, selected ? { view: 'timeline', actor: selected } : null);

    async function forget(actorId: string) {
        if (!window.confirm(`Permanently delete analytics for ${actorId.slice(0, 8)}? This cannot be undone.`)) return;
        try {
            const { removed } = await adminRequest<{ removed: number }>(accessToken, { view: 'actor', actor: actorId }, undefined, 'DELETE');
            setNotice(`Deleted ${number.format(removed)} events.`);
            setSelected(null);
            list.reload();
        } catch (failure) {
            setNotice(failure instanceof Error ? failure.message : 'The events could not be deleted.');
        }
    }

    if (list.error) return <p role="alert">{list.error}</p>;
    if (!list.data) return <p role="status">Loading browsers and installs…</p>;
    return (
        <div className="analytics-people-layout">
            {notice && <p role="status">{notice}</p>}
            <PeopleList list={list.data} selected={selected} onSelect={setSelected} />
            {selected &&
                (timeline.error ? (
                    <p role="alert">{timeline.error}</p>
                ) : timeline.data ? (
                    <TimelineView timeline={timeline.data} onClose={() => setSelected(null)} onForget={() => void forget(selected)} />
                ) : (
                    <p role="status">Loading timeline…</p>
                ))}
        </div>
    );
}

export default function AnalyticsDashboard() {
    const [session, setSession] = useState<Session | null | undefined>(undefined);
    const [filters, setFilters] = useState<Filters>({ range: 7, version: '', channel: 'all' });
    const [tab, setTab] = useState<Tab>('overview');
    const [error, setError] = useState('');
    const [signingIn, setSigningIn] = useState(false);
    const [versions, setVersions] = useState<string[]>([]);
    const accessToken = session?.access_token;
    const summary = useAdminData<Report>(accessToken, filterQuery(filters, 'summary'));

    useEffect(() => {
        if (summary.data?.versions) setVersions(summary.data.versions);
    }, [summary.data]);

    useEffect(() => {
        document.title = 'Hintio | Product analytics';
        if (!supabase) {
            setSession(null);
            return;
        }
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
        return () => subscription.unsubscribe();
    }, []);

    async function signIn() {
        if (!supabase) return;
        setError('');
        setSigningIn(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/admin/analytics`, queryParams: { prompt: 'select_account' } },
            });
            if (error) setError('Google sign-in could not be started.');
        } catch {
            setError('Google sign-in could not be started.');
        } finally {
            setSigningIn(false);
        }
    }

    return (
        <main className="analytics-admin">
            <header className="analytics-header">
                <div>
                    <a href="/">Hintio</a>
                    <h1>Product analytics</h1>
                </div>
                {session && <button onClick={() => void supabase?.auth.signOut({ scope: 'local' })}>Sign out</button>}
            </header>
            {session === undefined && <p role="status">Checking sign-in…</p>}
            {session === null && (
                <section className="analytics-panel analytics-signin">
                    <h2>Administrator sign-in</h2>
                    {supabase ? (
                        <button disabled={signingIn} onClick={() => void signIn()}>
                            Continue with Google
                        </button>
                    ) : (
                        <p>Sign-in is unavailable.</p>
                    )}
                    {error && <p role="alert">{error}</p>}
                </section>
            )}
            {session && accessToken && (
                <>
                    <div className="analytics-tabs" role="group" aria-label="Report view">
                        {(
                            [
                                ['overview', 'Overview'],
                                ['people', 'People'],
                            ] as const
                        ).map(([id, name]) => (
                            <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
                                {name}
                            </button>
                        ))}
                    </div>
                    <FilterBar filters={filters} versions={versions} onChange={setFilters} />
                    {tab === 'people' ? (
                        <PeopleView accessToken={accessToken} filters={filters} />
                    ) : summary.error ? (
                        <p role="alert">{summary.error}</p>
                    ) : summary.data ? (
                        <ReportView report={summary.data} />
                    ) : (
                        <p role="status">Loading analytics…</p>
                    )}
                </>
            )}
        </main>
    );
}
