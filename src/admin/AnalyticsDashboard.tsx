import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { analyticsCatalog } from '../../supabase/functions/_shared/analyticsContract';
import { analyticsFunctionsUrl } from '../lib/productAnalytics';
import { supabase } from '../lib/supabase';
import './analyticsDashboard.css';

type Range = 7 | 30;
type Report = {
    page_views: number;
    browsers: number;
    sessions: number;
    installs: number;
    onboarding: Record<'welcome' | 'context' | 'review' | 'completed' | 'first_session' | 'first_answer' | 'context_skipped' | 'context_provided', number>;
    breakdown: Array<{ source: 'web' | 'desktop'; event: string; value: string; total: number; actors: number }>;
    daily: Array<{ day: string; page_views: number; browsers: number; sessions: number; installs: number }>;
    builds: Array<{ version: string; distribution: 'installer' | 'store'; installs: number; sessions: number }>;
};

const labels: Record<string, string> = {
    '/': 'Home',
    production: 'Stable installer',
    preview: 'Preview installer',
    free_trial: 'Free trial',
    monthly: 'Monthly plan',
    yearly: 'Yearly plan',
    speaker_only: 'Speaker only',
    mic_only: 'Microphone only',
    both: 'Speaker and microphone',
    none: 'No audio',
    single_screenshot: 'Single screenshot',
    multi_screenshot: 'Multiple screenshots',
    debug_screenshot: 'Debug screenshot',
    history: 'History',
    settings: 'Settings',
    ai_context: 'AI Context',
    missing_key: 'Missing access key',
    setup_required: 'Setup required',
    update_required: 'Update required',
    initialization_failed: 'Access or service initialization failed',
    interview: 'Job Interview',
    'technical-interview': 'Technical Interview',
    sales: 'Sales Call',
    meeting: 'Business Meeting',
    presentation: 'Presentation',
    negotiation: 'Negotiation',
    exam: 'Exam Assistant',
    under_1m: 'Under 1 minute',
    '1_to_5m': '1 to under 5 minutes',
    '5_to_15m': '5 to under 15 minutes',
    '15m_plus': '15 minutes or more',
};

const number = new Intl.NumberFormat();
const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });
const dayLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

function Breakdown({ title, source, event, values, report }: {
    title: string;
    source: 'web' | 'desktop';
    event: string;
    values: readonly string[];
    report: Report;
}) {
    const hasCoverage = report.breakdown.some(row => row.source === source);
    const rows = values.map(value => {
        const row = report.breakdown.find(row => row.source === source && row.event === event && row.value === value);
        return { value, total: row?.total ?? 0, actors: row?.actors ?? 0 };
    }).sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...rows.map(row => row.total));

    return (
        <section className="analytics-panel">
            <h2>{title}</h2>
            {!hasCoverage ? <p>No reporting activity in this range.</p> : (
                <table>
                    <thead><tr><th scope="col">Option</th><th scope="col">Actions</th><th scope="col">{source === 'web' ? 'Browsers' : 'Installs'}</th></tr></thead>
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.value}>
                                <th scope="row">
                                    {labels[row.value] ?? row.value}
                                    {row.total > 0 && <span aria-hidden="true" className="analytics-bar" style={{ width: `${100 * row.total / max}%` }} />}
                                </th>
                                <td>{number.format(row.total)}</td><td>{number.format(row.actors)}</td>
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
                            <div><dt>Skipped</dt><dd>{number.format(skipped)} ({percent.format(skipped / total)})</dd></div>
                            <div><dt>Provided</dt><dd>{number.format(provided)} ({percent.format(provided / total)})</dd></div>
                        </dl>
                    ) : <p>No setup completions reported in this range.</p>}
                </section>
                <section className="analytics-panel">
                    <h3>First-time setup funnel</h3>
                    {funnel?.welcome ? (
                        <>
                            <table>
                                <thead><tr><th scope="col">Step</th><th scope="col">Installs</th><th scope="col">Of starts</th></tr></thead>
                                <tbody>
                                    {([
                                        ['Opened welcome', funnel.welcome],
                                        ['Reached context', funnel.context],
                                        ['Reached final step', funnel.review],
                                        ['Completed setup', funnel.completed],
                                        ['Started first session', funnel.first_session],
                                        ['Received first answer', funnel.first_answer],
                                    ] as const).map(([step, count]) => (
                                        <tr key={step}><th scope="row">{step}</th><td>{number.format(count)}</td><td>{percent.format(count / funnel.welcome)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="analytics-note">Counts follow installs that began setup in this range. Recent starts may still be in progress.</p>
                        </>
                    ) : <p>No first-time setup starts reported in this range.</p>}
                </section>
            </div>
        </section>
    );
}

function ReportView({ report }: { report: Report }) {
    return (
        <>
            <dl className="analytics-kpis">
                {([
                    ['Unique browsers', report.browsers],
                    ['Page views', report.page_views],
                    ['Active desktop installs', report.installs],
                    ['Desktop sessions', report.sessions],
                ] as const).map(([label, value]) => (
                    <div key={label}><dt>{label}</dt><dd>{number.format(value)}</dd></div>
                ))}
            </dl>
            <p className="analytics-note">Counts cover builds and browsers reporting analytics. An active install has at least one successful session start in the selected range.</p>
            <OnboardingReport report={report} />
            <div className="analytics-grid">
                <Breakdown title="Desktop audio modes" source="desktop" event="session_started" values={analyticsCatalog.desktop.session_started} report={report} />
                <Breakdown title="Session presets" source="desktop" event="session_profile" values={analyticsCatalog.desktop.session_profile} report={report} />
                <Breakdown title="Session duration" source="desktop" event="session_ended" values={analyticsCatalog.desktop.session_ended} report={report} />
                <Breakdown title="Blocked session starts" source="desktop" event="session_start_blocked" values={analyticsCatalog.desktop.session_start_blocked} report={report} />
                <Breakdown title="Desktop feature usage" source="desktop" event="feature_used" values={analyticsCatalog.desktop.feature_used} report={report} />
                <Breakdown title="Website pages" source="web" event="page_viewed" values={analyticsCatalog.web.page_viewed} report={report} />
                <Breakdown title="Installer clicks" source="web" event="download_clicked" values={analyticsCatalog.web.download_clicked} report={report} />
                <Breakdown title="Trial interest" source="web" event="trial_clicked" values={analyticsCatalog.web.trial_clicked} report={report} />
                <Breakdown title="Plan interest" source="web" event="upgrade_clicked" values={analyticsCatalog.web.upgrade_clicked} report={report} />
                <section className="analytics-panel">
                    <h2>Reporting desktop builds</h2>
                    {!report.builds.length ? <p>No reporting builds in this range.</p> : (
                        <table>
                            <thead><tr><th scope="col">Build</th><th scope="col">Installs</th><th scope="col">Sessions</th></tr></thead>
                            <tbody>
                                {report.builds.map(build => (
                                    <tr key={`${build.version}-${build.distribution}`}>
                                        <th scope="row">{build.version} · {build.distribution === 'store' ? 'Store' : 'Installer'}</th>
                                        <td>{number.format(build.installs)}</td><td>{number.format(build.sessions)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
                <section className="analytics-panel">
                    <h2>Daily activity <small>UTC</small></h2>
                    {!report.daily.length ? <p>No recorded activity in this range.</p> : (
                        <table>
                            <thead><tr><th scope="col">Day</th><th scope="col">Browsers</th><th scope="col">Active installs</th><th scope="col">Sessions</th></tr></thead>
                            <tbody>
                                {[...report.daily].reverse().map(day => (
                                    <tr key={day.day}>
                                        <th scope="row">{dayLabel.format(new Date(day.day))}</th>
                                        <td>{number.format(day.browsers)}</td><td>{number.format(day.installs)}</td><td>{number.format(day.sessions)}</td>
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

export default function AnalyticsDashboard() {
    const [session, setSession] = useState<Session | null | undefined>(undefined);
    const [range, setRange] = useState<Range>(7);
    const [loaded, setLoaded] = useState<{ report: Report; token: string; range: Range } | null>(null);
    const [error, setError] = useState('');
    const [signingIn, setSigningIn] = useState(false);
    const accessToken = session?.access_token;
    const report = loaded?.token === accessToken && loaded?.range === range ? loaded.report : null;

    useEffect(() => {
        document.title = 'Hintio | Product analytics';
        if (!supabase) {
            setSession(null);
            return;
        }
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        setLoaded(null);
        setError('');
        if (!accessToken) return;
        const request = new AbortController();
        async function load() {
            try {
                const response = await fetch(`${analyticsFunctionsUrl}/analytics-admin?days=${range}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    credentials: 'omit',
                    referrerPolicy: 'no-referrer',
                    signal: request.signal,
                    redirect: 'error',
                });
                if (response.status === 401) throw new Error('Your sign-in expired. Sign out and sign in again.');
                if (response.status === 403) throw new Error('This Google account does not have analytics access.');
                if (!response.ok) throw new Error('The analytics report could not be loaded.');
                const nextReport: Report = await response.json();
                if (!request.signal.aborted) setLoaded({ report: nextReport, token: accessToken, range });
            } catch (failure) {
                if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : 'The analytics report could not be loaded.');
            }
        }
        void load();
        return () => request.abort();
    }, [accessToken, range]);

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
                <div><a href="/">Hintio</a><h1>Product analytics</h1></div>
                {session && <button onClick={() => void supabase?.auth.signOut({ scope: 'local' })}>Sign out</button>}
            </header>
            {session === undefined && <p role="status">Checking sign-in…</p>}
            {session === null && (
                <section className="analytics-panel analytics-signin">
                    <h2>Administrator sign-in</h2>
                    {supabase ? <button disabled={signingIn} onClick={() => void signIn()}>Continue with Google</button> : <p>Sign-in is unavailable.</p>}
                    {error && <p role="alert">{error}</p>}
                </section>
            )}
            {session && (
                <>
                    <div className="analytics-range" role="group" aria-label="Report date range">
                        {([7, 30] as const).map(days => (
                            <button key={days} aria-pressed={range === days} onClick={() => setRange(days)}>{days} days</button>
                        ))}
                    </div>
                    {error ? <p role="alert">{error}</p> : report ? <ReportView report={report} /> : <p role="status">Loading analytics…</p>}
                </>
            )}
        </main>
    );
}
