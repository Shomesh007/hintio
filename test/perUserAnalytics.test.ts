import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { accountReference, parseAnalyticsEvent } from '../supabase/functions/_shared/analyticsContract';
import { parseAdminQuery } from '../supabase/functions/analytics-admin/query';
import { takeDesktopLinkCode } from '../src/lib/desktopLink';
import { actorName, describeEvent, groupByDay, keyActions, type ActorRow, type TimelineEvent } from '../src/admin/analyticsPeople';

const common = { actorId: randomUUID(), eventId: randomUUID() };
const desktop = { ...common, source: 'desktop', version: '1.0.13', distribution: 'installer' };

test('link and launch events accept only a random code or a fixed value', () => {
    const code = randomUUID();
    assert.deepEqual(parseAnalyticsEvent({ ...desktop, event: 'web_link_opened', value: code }), {
        ...desktop,
        event: 'web_link_opened',
        value: code,
    });
    assert.deepEqual(parseAnalyticsEvent({ ...desktop, event: 'app_launched', value: 'first' }), {
        ...desktop,
        event: 'app_launched',
        value: 'first',
    });
    assert.equal(parseAnalyticsEvent({ ...desktop, event: 'web_link_opened', value: 'user@example.com' }), null);
    assert.equal(parseAnalyticsEvent({ ...desktop, event: 'app_launched', value: 'C:\\Users\\private' }), null);
    assert.equal(parseAnalyticsEvent({ ...desktop, event: 'desktop_linked', value: code }), null, 'web-only event from desktop');

    const web = { ...common, source: 'web' };
    assert.deepEqual(parseAnalyticsEvent({ ...web, event: 'desktop_linked', value: code }), {
        ...web,
        event: 'desktop_linked',
        value: code,
        version: null,
        distribution: null,
    });
    assert.ok(parseAnalyticsEvent({ ...web, event: 'account_linked', value: 'signed_in' }));
    assert.equal(parseAnalyticsEvent({ ...web, event: 'account_linked', value: 'person@example.com' }), null, 'clients cannot pick the stored value');
    assert.equal(parseAnalyticsEvent({ ...web, event: 'account_linked', value: `acct_${'a'.repeat(32)}` }), null);
    assert.equal(parseAnalyticsEvent({ ...web, event: 'web_link_opened', value: code }), null, 'desktop-only event from the website');
    assert.equal(parseAnalyticsEvent({ ...web, event: 'desktop_linked', value: code, email: 'person@example.com' }), null);
});

test('account references are keyed, stable and not the account ID', async () => {
    const key = 'k'.repeat(40);
    const account = randomUUID();
    const reference = await accountReference(key, account);
    assert.match(reference!, /^acct_[0-9a-f]{32}$/);
    assert.equal(await accountReference(key, account), reference);
    assert.notEqual(await accountReference('j'.repeat(40), account), reference);
    assert.ok(!reference!.includes(account.replace(/-/g, '').slice(0, 8)));
    assert.equal(await accountReference('short', account), null, 'refuses a missing or weak key');
    assert.equal(await accountReference(key, 'person@example.com'), null);
});

test('admin queries allow only known views, ranges, versions and channels', () => {
    const url = (query: string) => new URL(`https://example.supabase.co/functions/v1/analytics-admin?${query}`);
    const actor = randomUUID();
    assert.deepEqual(parseAdminQuery('GET', url('days=7')), {
        rpc: 'product_analytics_summary',
        args: { p_days: 7, p_version: null, p_channel: 'all', p_audience: 'real' },
    });
    assert.deepEqual(parseAdminQuery('GET', url('view=actors&days=90&version=1.0.13&channel=store')), {
        rpc: 'product_analytics_actors',
        args: { p_days: 90, p_version: '1.0.13', p_channel: 'store', p_audience: 'real', p_limit: 200 },
    });
    assert.deepEqual(parseAdminQuery('GET', url(`view=timeline&actor=${actor}`)), { rpc: 'product_analytics_timeline', args: { p_actor_id: actor } });
    assert.deepEqual(parseAdminQuery('DELETE', url(`view=actor&actor=${actor}`)), { rpc: 'product_analytics_forget', args: { p_actor_id: actor } });

    assert.equal(parseAdminQuery('GET', url('days=365')), null);
    assert.equal(parseAdminQuery('GET', url('days=7&version=latest')), null);
    assert.equal(parseAdminQuery('GET', url('days=7&channel=email')), null);
    assert.equal(parseAdminQuery('GET', url('view=timeline&actor=person@example.com')), null);
    assert.equal(parseAdminQuery('GET', url('view=events&days=7')), null);
    assert.equal(parseAdminQuery('DELETE', url('days=7')), null);
    assert.equal(parseAdminQuery('POST', url(`view=actor&actor=${actor}`)), null);
});

test('the website removes a desktop link code from the fragment and keeps other anchors', () => {
    const code = randomUUID();
    assert.deepEqual(takeDesktopLinkCode(`#hl=${code}`), { code, hash: '' });
    assert.deepEqual(takeDesktopLinkCode(`#billing&hl=${code}`), { code, hash: '#billing' });
    assert.deepEqual(takeDesktopLinkCode('#billing'), { code: null, hash: '#billing' });
    assert.deepEqual(takeDesktopLinkCode('#hl=not-a-code'), { code: null, hash: '#hl=not-a-code' });
    assert.deepEqual(takeDesktopLinkCode(`#hl=${code}x`), { code: null, hash: `#hl=${code}x` });
});

test('the people view describes timelines in order and summarises key actions', () => {
    const at = (day: number, hour: number) => `2026-11-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00+00:00`;
    const event = (when: string, name: string, value: string | null): TimelineEvent => ({
        at: when,
        actor_id: 'a',
        source: 'web',
        event: name,
        value,
        version: null,
        distribution: null,
    });
    const days = groupByDay([
        event(at(25, 9), 'page_viewed', '/download'),
        event(at(25, 10), 'download_clicked', 'production'),
        event(at(26, 8), 'app_launched', 'first'),
    ]);
    assert.deepEqual(
        days.map(day => [day.day, day.events.length]),
        [
            ['2026-11-25', 2],
            ['2026-11-26', 1],
        ]
    );
    assert.deepEqual(describeEvent({ event: 'page_viewed', value: '/' }), { stage: 'website', text: 'Visited Home' });
    assert.deepEqual(describeEvent({ event: 'download_clicked', value: 'production' }), {
        stage: 'interest',
        text: 'Clicked stable installer download',
    });
    assert.deepEqual(describeEvent({ event: 'app_launched', value: 'first' }), { stage: 'install', text: 'Installed and opened the app' });
    assert.deepEqual(describeEvent({ event: 'session_start_blocked', value: 'missing_key' }), {
        stage: 'blocked',
        text: 'Session start blocked: missing access key',
    });
    assert.equal(describeEvent({ event: 'desktop_linked', value: null }).stage, 'link');

    const row = {
        actor_id: '3f2a9c1d-0000-4000-8000-000000000000',
        source: 'desktop',
        onboarded: true,
        page_views: 0,
        trial_clicks: 0,
        installer_clicks: 0,
        plan_clicks: 0,
        sessions: 3,
        answered_sessions: 1,
        blocked_starts: 1,
        features_used: 0,
    } as ActorRow;
    assert.deepEqual(keyActions(row), ['set up', '3 sessions', '1 answer', '1 blocked start']);
    assert.equal(actorName(row), 'Install 3f2a9c1d');
});

test('admin queries filter by audience and mark only valid IDs as test traffic', () => {
    const url = (query: string) => new URL(`https://example.supabase.co/functions/v1/analytics-admin?${query}`);
    const actor = randomUUID();
    assert.deepEqual(parseAdminQuery('GET', url('view=actors&days=7&audience=internal')), {
        rpc: 'product_analytics_actors',
        args: { p_days: 7, p_version: null, p_channel: 'all', p_audience: 'internal', p_limit: 200 },
    });
    assert.equal(parseAdminQuery('GET', url('days=7&audience=everyone')), null);
    assert.deepEqual(parseAdminQuery('POST', url(`view=internal&actor=${actor}&internal=true`)), {
        rpc: 'product_analytics_mark_internal',
        args: { p_actor_id: actor, p_internal: true, p_reason: 'dashboard' },
    });
    assert.deepEqual(parseAdminQuery('POST', url(`view=internal&actor=${actor}&internal=false&reason=admin_browser`)), {
        rpc: 'product_analytics_mark_internal',
        args: { p_actor_id: actor, p_internal: false, p_reason: 'admin_browser' },
    });
    assert.equal(parseAdminQuery('POST', url(`view=internal&actor=${actor}&internal=yes`)), null);
    assert.equal(parseAdminQuery('POST', url(`view=internal&actor=${actor}&internal=true&reason=note`)), null);
    assert.equal(parseAdminQuery('POST', url('view=internal&actor=person@example.com&internal=true')), null);
    assert.equal(parseAdminQuery('GET', url(`view=internal&actor=${actor}&internal=true`)), null);
});
