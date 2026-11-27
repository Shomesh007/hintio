import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migrations = ['20261123115453_product_analytics.sql', '20261127120000_per_user_analytics.sql', '20261127150000_internal_test_actors.sql'];

// PGlite has no pg_cron, so the schedule lines are skipped. Everything else runs as deployed.
async function database() {
    const db = new PGlite();
    await db.exec('create role anon; create role authenticated; create role service_role;');
    for (const file of migrations) {
        const sql = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')
            .split('\n')
            .filter(line => !/pg_cron|cron\.schedule/.test(line))
            .join('\n');
        await db.exec(sql);
    }
    return db;
}

type Event = { actor: string; source: 'web' | 'desktop'; event: string; value: string; hoursAgo: number; version?: string; distribution?: string };

async function insert(db: PGlite, events: Event[]) {
    for (const [index, e] of events.entries()) {
        await db.query(
            `insert into hintio_analytics.events (event_id, actor_id, received_at, source, event_name, event_value, app_version, distribution)
             values ($1, $2, now() - make_interval(secs => $3 * 3600 - $9), $4, $5, $6, $7, $8)`,
            [
                randomUUID(),
                e.actor,
                e.hoursAgo,
                e.source,
                e.event,
                e.value,
                e.source === 'desktop' ? (e.version ?? '1.0.13') : null,
                e.source === 'desktop' ? (e.distribution ?? 'installer') : null,
                index, // keeps events that share an hour in insertion order
            ]
        );
    }
}

async function call<T>(db: PGlite, sql: string, params: unknown[]) {
    const { rows } = await db.query<{ result: T }>(`select ${sql} as result`, params);
    return rows[0].result;
}

const browser = randomUUID();
const otherBrowser = randomUUID();
const install = randomUUID();
const storeInstall = randomUUID();
const linkCode = randomUUID();
const account = `acct_${'a'.repeat(32)}`;

const journey: Event[] = [
    { actor: browser, source: 'web', event: 'page_viewed', value: '/', hoursAgo: 50 },
    { actor: browser, source: 'web', event: 'page_viewed', value: '/download', hoursAgo: 49 },
    { actor: browser, source: 'web', event: 'trial_clicked', value: 'free_trial', hoursAgo: 49 },
    { actor: browser, source: 'web', event: 'download_clicked', value: 'production', hoursAgo: 48 },
    { actor: browser, source: 'web', event: 'account_linked', value: account, hoursAgo: 48 },
    { actor: install, source: 'desktop', event: 'app_launched', value: 'first', hoursAgo: 47 },
    { actor: install, source: 'desktop', event: 'onboarding_step', value: 'welcome', hoursAgo: 47 },
    { actor: install, source: 'desktop', event: 'onboarding_completed', value: 'blank', hoursAgo: 46 },
    { actor: install, source: 'desktop', event: 'web_link_opened', value: linkCode, hoursAgo: 45 },
    { actor: otherBrowser, source: 'web', event: 'desktop_linked', value: linkCode, hoursAgo: 45 },
    { actor: otherBrowser, source: 'web', event: 'account_linked', value: account, hoursAgo: 44 },
    { actor: install, source: 'desktop', event: 'session_start_blocked', value: 'missing_key', hoursAgo: 3 },
    { actor: install, source: 'desktop', event: 'session_started', value: 'speaker_only', hoursAgo: 2 },
    { actor: install, source: 'desktop', event: 'feature_used', value: 'single_screenshot', hoursAgo: 1 },
    { actor: storeInstall, source: 'desktop', event: 'session_started', value: 'none', hoursAgo: 5, version: '1.0.12', distribution: 'store' },
];

test('the new event constraint accepts link and launch events and rejects free text', async () => {
    const db = await database();
    await insert(db, journey);
    for (const bad of [
        { actor: install, source: 'desktop', event: 'web_link_opened', value: 'someone@example.com', hoursAgo: 1 },
        { actor: browser, source: 'web', event: 'account_linked', value: 'user-id', hoursAgo: 1 },
        { actor: install, source: 'desktop', event: 'app_launched', value: 'C:\\Users\\name', hoursAgo: 1 },
        { actor: browser, source: 'web', event: 'web_link_opened', value: linkCode, hoursAgo: 1 },
    ] as Event[]) {
        await assert.rejects(insert(db, [bad]), /events_allowed_values/);
    }
});

test('the actor list reports each browser and install with lifetime and in-range activity', async () => {
    const db = await database();
    await insert(db, journey);
    const result = await call<{ total: number; actors: Array<Record<string, unknown>> }>(db, 'public.product_analytics_actors($1, $2, $3, $4)', [
        7,
        null,
        'all',
        200,
    ]);
    assert.equal(result.total, 4);
    const byId = new Map(result.actors.map(actor => [actor.actor_id, actor]));
    assert.equal(result.actors[0].actor_id, install, 'most recently active first');

    const installRow = byId.get(install)!;
    assert.equal(installRow.source, 'desktop');
    assert.equal(installRow.version, '1.0.13');
    assert.equal(installRow.distribution, 'installer');
    assert.equal(installRow.sessions, 1);
    assert.equal(installRow.blocked_starts, 1);
    assert.equal(installRow.features_used, 1);
    assert.equal(installRow.onboarded, true);
    assert.equal(installRow.linked, 1);
    assert.ok(installRow.installed_at);

    const browserRow = byId.get(browser)!;
    assert.equal(browserRow.page_views, 2);
    assert.equal(browserRow.trial_clicks, 1);
    assert.equal(browserRow.installer_clicks, 1);
    assert.equal(browserRow.has_account, true);
    assert.equal(browserRow.linked, 1, 'linked to the other browser through the shared account');
    assert.equal(browserRow.version, null);
});

test('actor list and summary honour version and channel filters', async () => {
    const db = await database();
    await insert(db, journey);
    const store = await call<{ total: number; actors: Array<{ actor_id: string }> }>(db, 'public.product_analytics_actors($1, $2, $3, $4)', [
        7,
        null,
        'store',
        200,
    ]);
    assert.deepEqual(
        store.actors.map(actor => actor.actor_id),
        [storeInstall]
    );
    const web = await call<{ total: number }>(db, 'public.product_analytics_actors($1, $2, $3, $4)', [7, null, 'web', 200]);
    assert.equal(web.total, 2);
    const version = await call<{ total: number }>(db, 'public.product_analytics_actors($1, $2, $3, $4)', [7, '1.0.12', 'all', 200]);
    assert.equal(version.total, 1);
    const invalid = await call<{ total: number }>(db, 'public.product_analytics_actors($1, $2, $3, $4)', [365, null, 'all', 200]);
    assert.equal(invalid.total, 0);

    const summary = await call<Record<string, unknown>>(db, 'public.product_analytics_summary($1, $2, $3)', [7, null, 'all']);
    assert.equal(summary.sessions, 2);
    assert.equal(summary.installs, 2);
    assert.equal(summary.browsers, 1);
    assert.equal(summary.new_installs, 1);
    assert.equal(summary.linked_browsers, 1);
    assert.equal(summary.linked_installs, 1);
    assert.equal(summary.accounts, 1);
    assert.deepEqual(summary.versions, ['1.0.13', '1.0.12']);
    const breakdown = summary.breakdown as Array<{ event: string }>;
    assert.ok(!breakdown.some(row => ['web_link_opened', 'desktop_linked', 'account_linked'].includes(row.event)), 'link codes stay out of totals');

    const storeSummary = await call<Record<string, unknown>>(db, 'public.product_analytics_summary($1, $2, $3)', [7, '1.0.12', 'all']);
    assert.equal(storeSummary.sessions, 1);
    assert.equal(storeSummary.page_views, 0);
    assert.deepEqual(storeSummary.versions, ['1.0.13', '1.0.12'], 'version options ignore the version filter');
});

test('the timeline joins a browser to the install and account it became, in order, without link codes', async () => {
    const db = await database();
    await insert(db, journey);
    const timeline = await call<{
        actors: Array<{ actor_id: string }>;
        events: Array<{ actor_id: string; event: string; value: string | null }>;
        truncated: boolean;
    }>(db, 'public.product_analytics_timeline($1)', [browser]);
    assert.deepEqual(new Set(timeline.actors.map(actor => actor.actor_id)), new Set([browser, otherBrowser, install]));
    assert.equal(timeline.truncated, false);
    assert.deepEqual(
        timeline.events.map(event => event.event),
        journey.filter(event => event.actor !== storeInstall).map(event => event.event)
    );
    const link = timeline.events.find(event => event.event === 'web_link_opened')!;
    assert.equal(link.value, null);
    assert.ok(!JSON.stringify(timeline).includes(linkCode));

    const alone = await call<{ actors: unknown[]; events: unknown[] }>(db, 'public.product_analytics_timeline($1)', [storeInstall]);
    assert.equal(alone.actors.length, 1);
    assert.equal(alone.events.length, 1);
});

test('forgetting an actor removes its events and breaks its links', async () => {
    const db = await database();
    await insert(db, journey);
    const removed = await call<number>(db, 'public.product_analytics_forget($1)', [install]);
    assert.equal(removed, 8);
    const timeline = await call<{ actors: Array<{ actor_id: string }> }>(db, 'public.product_analytics_timeline($1)', [browser]);
    assert.deepEqual(new Set(timeline.actors.map(actor => actor.actor_id)), new Set([browser, otherBrowser]));
});

test('only the service role can run the analytics functions', async () => {
    const db = await database();
    for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(db.query('select public.product_analytics_actors(7)'), /permission denied/);
        await assert.rejects(db.query(`select public.product_analytics_timeline('${browser}')`), /permission denied/);
        await assert.rejects(db.query(`select public.product_analytics_forget('${browser}')`), /permission denied/);
        await db.exec('reset role');
    }
});

test('marking one ID as internal moves it and every linked ID out of real-user reports', async () => {
    const db = await database();
    await insert(db, journey);
    assert.equal(await call<boolean>(db, 'public.product_analytics_mark_internal($1, $2, $3)', [browser, true, 'admin_browser']), true);
    await call(db, 'public.product_analytics_mark_internal($1, $2, $3)', [browser, true, 'dashboard']);

    const summary = (audience: string) =>
        call<Record<string, number>>(db, 'public.product_analytics_summary($1, $2, $3, $4)', [7, null, 'all', audience]);
    const real = await summary('real');
    assert.equal(real.sessions, 1, 'only the store install is a real user');
    assert.equal(real.installs, 1);
    assert.equal(real.browsers, 0);
    assert.equal(real.accounts, 0);
    assert.equal(real.internal_ids, 3);
    assert.equal((await summary('internal')).sessions, 1);
    assert.equal((await summary('all')).sessions, 2);
    assert.equal((await call<Record<string, number>>(db, 'public.product_analytics_summary($1)', [7])).sessions, 1, 'real users by default');

    type Actors = { total: number; actors: Array<{ actor_id: string; internal: boolean; marked_internal: boolean }> };
    const actors = (audience: string) => call<Actors>(db, 'public.product_analytics_actors($1, $2, $3, $4, $5)', [7, null, 'all', 200, audience]);
    assert.deepEqual(
        (await actors('real')).actors.map(actor => [actor.actor_id, actor.internal]),
        [[storeInstall, false]]
    );
    const internal = await actors('internal');
    assert.deepEqual(new Set(internal.actors.map(actor => actor.actor_id)), new Set([browser, otherBrowser, install]));
    assert.deepEqual(
        internal.actors.filter(actor => actor.marked_internal).map(actor => actor.actor_id),
        [browser],
        'linked IDs are internal without being marked themselves'
    );
    assert.equal((await actors('everyone')).total, 0, 'unknown audiences return nothing');

    const timeline = await call<{ actors: Array<{ actor_id: string; internal: boolean; marked_internal: boolean }> }>(
        db,
        'public.product_analytics_timeline($1)',
        [install]
    );
    assert.ok(timeline.actors.every(actor => actor.internal));
    assert.deepEqual(
        timeline.actors.filter(actor => actor.marked_internal).map(actor => actor.actor_id),
        [browser]
    );

    await assert.rejects(call(db, 'public.product_analytics_mark_internal($1, $2, $3)', [storeInstall, true, 'free text']), /check/);
    assert.equal(await call<boolean>(db, 'public.product_analytics_mark_internal($1, $2, $3)', [browser, false, 'dashboard']), false);
    assert.equal((await summary('real')).sessions, 2);

    await call(db, 'public.product_analytics_mark_internal($1, $2, $3)', [install, true, 'dashboard']);
    await call(db, 'public.product_analytics_forget($1)', [install]);
    const { rows } = await db.query('select * from hintio_analytics.internal_actors');
    assert.equal(rows.length, 0, 'forgetting an ID also removes its mark');
});

test('only the service role can mark IDs as internal or read the marks', async () => {
    const db = await database();
    for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`);
        await assert.rejects(db.query(`select public.product_analytics_mark_internal('${browser}', true, 'dashboard')`), /permission denied/);
        await assert.rejects(db.query('select * from hintio_analytics.internal_actors'), /permission denied/);
        await db.exec('reset role');
    }
});
