export type ActorSource = 'web' | 'desktop';

export type ActorRow = {
    actor_id: string;
    source: ActorSource;
    first_seen: string;
    last_seen: string;
    version: string | null;
    distribution: 'installer' | 'store' | null;
    installed_at: string | null;
    onboarded: boolean;
    has_account: boolean;
    linked: number;
    events: number;
    page_views: number;
    installer_clicks: number;
    trial_clicks: number;
    plan_clicks: number;
    sessions: number;
    blocked_starts: number;
    answered_sessions: number;
    features_used: number;
};

export type ActorList = { total: number; actors: ActorRow[] };

export type TimelineEvent = {
    at: string;
    actor_id: string;
    source: ActorSource;
    event: string;
    value: string | null;
    version: string | null;
    distribution: 'installer' | 'store' | null;
};

export type Timeline = {
    actor_id: string;
    actors: Array<{
        actor_id: string;
        source: ActorSource;
        first_seen: string;
        last_seen: string;
        version: string | null;
        distribution: string | null;
    }>;
    events: TimelineEvent[];
    truncated: boolean;
};

export const valueLabels: Record<string, string> = {
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

const label = (value: string | null) => (value === null ? '' : (valueLabels[value] ?? value));

export type Stage = 'website' | 'interest' | 'install' | 'onboarding' | 'session' | 'blocked' | 'feature' | 'link';

// Plain-language description of one timeline event and the stage it belongs to.
export function describeEvent(event: Pick<TimelineEvent, 'event' | 'value'>): { stage: Stage; text: string } {
    const value = label(event.value);
    switch (event.event) {
        case 'page_viewed':
            return { stage: 'website', text: `Visited ${value}` };
        case 'download_clicked':
            return { stage: 'interest', text: `Clicked ${value.toLowerCase()} download` };
        case 'trial_clicked':
            return { stage: 'interest', text: 'Clicked free trial' };
        case 'upgrade_clicked':
            return { stage: 'interest', text: `Clicked ${value.toLowerCase()}` };
        case 'account_linked':
            return { stage: 'link', text: 'Signed in on the website' };
        case 'desktop_linked':
            return { stage: 'link', text: 'Arrived on the website from the desktop app' };
        case 'web_link_opened':
            return { stage: 'link', text: 'Opened hintio.tech from the app' };
        case 'app_launched':
            return { stage: 'install', text: event.value === 'first' ? 'Installed and opened the app' : 'Opened the app' };
        case 'onboarding_step':
            return { stage: 'onboarding', text: `Setup: reached ${event.value === 'review' ? 'final step' : event.value} step` };
        case 'onboarding_completed':
            return { stage: 'onboarding', text: event.value === 'provided' ? 'Completed setup with context' : 'Completed setup without context' };
        case 'session_started':
            return { stage: 'session', text: `Started a session (${value.toLowerCase()})` };
        case 'session_profile':
            return { stage: 'session', text: `Session preset: ${value}` };
        case 'session_answered':
            return { stage: 'session', text: 'Received an answer' };
        case 'session_ended':
            return { stage: 'session', text: `Ended a session (${value.toLowerCase()})` };
        case 'session_start_blocked':
            return { stage: 'blocked', text: `Session start blocked: ${value.toLowerCase()}` };
        case 'feature_used':
            return { stage: 'feature', text: `Used ${value}` };
        default:
            return { stage: 'feature', text: `${event.event}${value ? `: ${value}` : ''}` };
    }
}

// Short summary of what an actor did in the range, most important first.
export function keyActions(row: ActorRow): string[] {
    const actions: string[] = [];
    const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
    if (row.page_views) actions.push(plural(row.page_views, 'page view'));
    if (row.trial_clicks) actions.push('free trial');
    if (row.installer_clicks) actions.push(plural(row.installer_clicks, 'installer click'));
    if (row.plan_clicks) actions.push(plural(row.plan_clicks, 'plan click'));
    if (row.source === 'desktop') actions.push(row.onboarded ? 'set up' : 'not set up');
    if (row.sessions) actions.push(plural(row.sessions, 'session'));
    if (row.answered_sessions) actions.push(plural(row.answered_sessions, 'answer'));
    if (row.blocked_starts) actions.push(plural(row.blocked_starts, 'blocked start'));
    if (row.features_used) actions.push(plural(row.features_used, 'feature use'));
    return actions;
}

// Groups timeline events by UTC day, oldest first, keeping their order within a day.
export function groupByDay(events: TimelineEvent[]) {
    const days: Array<{ day: string; events: TimelineEvent[] }> = [];
    for (const event of events) {
        const day = event.at.slice(0, 10);
        const last = days[days.length - 1];
        if (last?.day === day) last.events.push(event);
        else days.push({ day, events: [event] });
    }
    return days;
}

// A stable short name for a pseudonymous ID, such as "Install 3f2a9c1d".
export function actorName(actor: { actor_id: string; source: ActorSource }) {
    return `${actor.source === 'web' ? 'Browser' : 'Install'} ${actor.actor_id.slice(0, 8)}`;
}

export function channelName(actor: { source: ActorSource; distribution: string | null }) {
    if (actor.source === 'web') return 'Website';
    return actor.distribution === 'store' ? 'Store' : 'Installer';
}
