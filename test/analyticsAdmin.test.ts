import test from 'node:test';
import assert from 'node:assert/strict';
import { isAnalyticsAdmin } from '../supabase/functions/analytics-admin/authorize';

const email = 'BuiltbyGSV@gmail.com';
const account = {
    email,
    email_confirmed_at: '2026-11-23T00:00:00Z',
    identities: [{ provider: 'google', identity_data: { email, email_verified: true } }],
};

function token(method: string) {
    return `header.${Buffer.from(JSON.stringify({ amr: [{ method }] })).toString('base64url')}.signature`;
}

test('only the confirmed BuiltbyGSV Google identity with an OAuth login can read analytics', () => {
    assert(isAnalyticsAdmin(account, token('oauth')));
    assert(!isAnalyticsAdmin(account, token('password')));
    assert(!isAnalyticsAdmin(account, 'malformed'));
    assert(!isAnalyticsAdmin({ ...account, email: 'another@gmail.com' }, token('oauth')));
    assert(!isAnalyticsAdmin({ ...account, email_confirmed_at: undefined }, token('oauth')));
    assert(!isAnalyticsAdmin({ ...account, identities: [{ provider: 'email', identity_data: { email, email_verified: true } }] }, token('oauth')));
    assert(!isAnalyticsAdmin({ ...account, identities: [{ provider: 'google', identity_data: { email, email_verified: false } }] }, token('oauth')));
});
