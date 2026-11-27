const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const version = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
const channels = ['all', 'web', 'installer', 'store'] as const;

export type AdminQuery =
    | { rpc: 'product_analytics_summary'; args: { p_days: number; p_version: string | null; p_channel: string } }
    | { rpc: 'product_analytics_actors'; args: { p_days: number; p_version: string | null; p_channel: string; p_limit: number } }
    | { rpc: 'product_analytics_timeline'; args: { p_actor_id: string } }
    | { rpc: 'product_analytics_forget'; args: { p_actor_id: string } };

// Turns an admin request into one allowlisted database call, or null when any parameter is invalid.
export function parseAdminQuery(method: string, url: URL): AdminQuery | null {
    const params = url.searchParams;
    const view = params.get('view') ?? 'summary';
    const actor = params.get('actor');

    if (method === 'DELETE') {
        return view === 'actor' && actor && uuid.test(actor) ? { rpc: 'product_analytics_forget', args: { p_actor_id: actor } } : null;
    }
    if (method !== 'GET') return null;
    if (view === 'timeline') {
        return actor && uuid.test(actor) ? { rpc: 'product_analytics_timeline', args: { p_actor_id: actor } } : null;
    }

    const days = Number(params.get('days'));
    if (days !== 7 && days !== 30 && days !== 90) return null;
    const selectedVersion = params.get('version') || null;
    if (selectedVersion !== null && !version.test(selectedVersion)) return null;
    const channel = params.get('channel') ?? 'all';
    if (!(channels as readonly string[]).includes(channel)) return null;

    const filters = { p_days: days, p_version: selectedVersion, p_channel: channel };
    if (view === 'summary') return { rpc: 'product_analytics_summary', args: filters };
    if (view === 'actors') return { rpc: 'product_analytics_actors', args: { ...filters, p_limit: 200 } };
    return null;
}
