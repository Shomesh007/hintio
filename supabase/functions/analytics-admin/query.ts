const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const version = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const channels = ['all', 'web', 'installer', 'store'] as const;
const audiences = ['real', 'internal', 'all'] as const;

type Filters = { p_days: number; p_version: string | null; p_channel: string; p_audience: string };

export type AdminQuery =
    | { rpc: 'product_analytics_summary'; args: Filters }
    | { rpc: 'product_analytics_actors'; args: Filters & { p_limit: number } }
    | { rpc: 'product_analytics_timeline'; args: { p_actor_id: string } }
    | { rpc: 'product_analytics_forget'; args: { p_actor_id: string } }
    | { rpc: 'product_analytics_mark_internal'; args: { p_actor_id: string; p_internal: boolean; p_reason: 'dashboard' | 'admin_browser' } };

// Turns an admin request into one allowlisted database call, or null when any parameter is invalid.
export function parseAdminQuery(method: string, url: URL): AdminQuery | null {
    const params = url.searchParams;
    const view = params.get('view') ?? 'summary';
    const actor = params.get('actor');
    const validActor = actor !== null && uuid.test(actor);

    if (method === 'DELETE') {
        return view === 'actor' && validActor ? { rpc: 'product_analytics_forget', args: { p_actor_id: actor } } : null;
    }
    if (method === 'POST') {
        // Marks or unmarks a browser or install as the team's own test traffic.
        const internal = params.get('internal');
        const reason = params.get('reason') ?? 'dashboard';
        if (view !== 'internal' || !validActor || (internal !== 'true' && internal !== 'false')) return null;
        if (reason !== 'dashboard' && reason !== 'admin_browser') return null;
        return { rpc: 'product_analytics_mark_internal', args: { p_actor_id: actor, p_internal: internal === 'true', p_reason: reason } };
    }
    if (method !== 'GET') return null;
    if (view === 'timeline') {
        return validActor ? { rpc: 'product_analytics_timeline', args: { p_actor_id: actor } } : null;
    }

    const days = Number(params.get('days'));
    if (days !== 7 && days !== 30 && days !== 90) return null;
    const selectedVersion = params.get('version') || null;
    if (selectedVersion !== null && !version.test(selectedVersion)) return null;
    const channel = params.get('channel') ?? 'all';
    if (!(channels as readonly string[]).includes(channel)) return null;
    const audience = params.get('audience') ?? 'real';
    if (!(audiences as readonly string[]).includes(audience)) return null;

    const filters = { p_days: days, p_version: selectedVersion, p_channel: channel, p_audience: audience };
    if (view === 'summary') return { rpc: 'product_analytics_summary', args: filters };
    if (view === 'actors') return { rpc: 'product_analytics_actors', args: { ...filters, p_limit: 200 } };
    return null;
}
