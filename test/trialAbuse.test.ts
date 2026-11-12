import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrialService, networkAddress, keyedHash } from '../supabase/functions/_shared/trial';
import { getTrialDeviceId } from '../src/lib/trialDevice';
const device = '11111111-1111-4111-8111-111111111111';
const user = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'qa@hintio.invalid',
    email_confirmed_at: '2026-11-12',
    identities: [{ provider: 'google' }],
};
function fixture(options: Record<string, any> = {}) {
    const calls: { name: string; args: any }[] = [];
    const handler = createTrialService({
        env: () => (options.noSecret ? '' : 'synthetic-server-secret'),
        admin: {
            auth: { getUser: async () => ({ data: { user: options.user === undefined ? user : options.user }, error: options.authError }) },
            rpc: async (name: string, args: any) => {
                calls.push({ name, args });
                if (name === 'enforce_access_token_rate_limit') return options.rateError ? { error: {} } : { data: !options.rateDeny };
                return options.claimError
                    ? { error: { message: options.claimError } }
                    : { data: { access_key: 'SYNTHETIC_KEY', max_interviews: 3, minutes_per_interview: 15, is_new: true } };
            },
        },
    });
    const call = (headers: Record<string, string> = {}, body: unknown = { deviceId: device }) =>
        handler(
            new Request('https://test.invalid', {
                method: 'POST',
                headers: {
                    authorization: 'Bearer synthetic-jwt',
                    'content-type': 'application/json',
                    'cf-connecting-ip': '198.51.100.10',
                    origin: 'https://www.hintio.tech',
                    ...headers,
                },
                body: JSON.stringify(body),
            })
        );
    return { call, calls, handler };
}
test('only server-verified user ID and keyed hashes reach claim RPC', async () => {
    const h = fixture(),
        r = await h.call();
    assert.equal(r.status, 200);
    const c = h.calls.find(c => c.name === 'claim_trial_access')!;
    assert.equal(c.args.p_user_id, user.id);
    assert.match(c.args.p_ip_hash, /^[a-f0-9]{64}$/);
    assert.match(c.args.p_device_hash, /^[a-f0-9]{64}$/);
    assert.notEqual(c.args.p_ip_hash, c.args.p_device_hash);
    assert(!JSON.stringify(h.calls).includes('198.51.100.10'));
    assert(!JSON.stringify(h.calls).includes(device));
});
for (const [name, options] of [
    ['expired login', { authError: {} }],
    ['anonymous', { user: { ...user, is_anonymous: true } }],
    ['unconfirmed', { user: { ...user, email_confirmed_at: null } }],
    ['not Google', { user: { ...user, identities: [{ provider: 'email' }] } }],
] as const)
    test(name + ' cannot claim', async () => {
        const h = fixture(options),
            r = await h.call();
        assert.equal(r.status, 401);
        assert.equal(h.calls.length, 0);
    });
test('missing proxy IP cannot fall back to spoofed forwarded header', async () => {
    const h = fixture(),
        r = await h.call({ 'cf-connecting-ip': '', 'x-forwarded-for': '198.51.100.99' });
    assert.equal(r.status, 503);
    assert.equal(h.calls.length, 0);
});
test('client-supplied IP or user ID rejected', async () => {
    const h = fixture(),
        r = await h.call({}, { deviceId: device, ip: '198.51.100.55', userId: 'other' });
    assert.equal(r.status, 400);
    assert.equal(h.calls.length, 0);
});
test('invalid browser ID rejected', async () => {
    const h = fixture(),
        r = await h.call({}, { deviceId: 'anything' });
    assert.equal(r.status, 400);
    assert.equal(h.calls.length, 0);
});
test('duplicate network/device response is actionable', async () => {
    const h = fixture({ claimError: 'TRIAL_NETWORK_OR_DEVICE_USED' }),
        r = await h.call();
    assert.equal(r.status, 409);
    assert.equal((await r.json()).code, 'TRIAL_ALREADY_USED');
});
for (const [name, options, status] of [
    ['rate denied', { rateDeny: true }, 429],
    ['limiter unavailable', { rateError: true }, 503],
    ['missing secret', { noSecret: true }, 503],
] as const)
    test(name + ' stops issuance', async () => {
        const h = fixture(options),
            r = await h.call();
        assert.equal(r.status, status);
        assert(!h.calls.some(c => c.name === 'claim_trial_access'));
    });
test('unapproved origin rejected', async () => {
    const h = fixture(),
        r = await h.call({ origin: 'https://other.invalid' });
    assert.equal(r.status, 403);
    assert.equal(h.calls.length, 0);
});
test('IPv6 normalizes before hashing', () =>
    assert.equal(networkAddress(new Request('https://test.invalid', { headers: { 'cf-connecting-ip': '2001:0db8:0:0:0:0:0:1' } })), '2001:db8::1'));
test('hashes stable and separated by purpose', async () => {
    assert.equal(await keyedHash('test', 'ip:a'), await keyedHash('test', 'ip:a'));
    assert.notEqual(await keyedHash('test', 'ip:a'), await keyedHash('test', 'device:a'));
});
test('browser identity survives reload', () => {
    const m = new Map<string, string>();
    const storage = {
        getItem: (k: string) => m.get(k) || null,
        setItem: (k: string, v: string) => {
            m.set(k, v);
        },
    };
    assert.equal(
        getTrialDeviceId(storage, () => device),
        device
    );
    assert.equal(
        getTrialDeviceId(storage, () => assert.fail('must reuse identity')),
        device
    );
});
test('blocked storage cannot silently bypass restriction', () =>
    assert.throws(
        () =>
            getTrialDeviceId({
                getItem: () => {
                    throw Error();
                },
                setItem: () => {},
            }),
        /Browser storage is required/
    ));

test('public health probe verifies proxy network headers without revealing the IP', async () => {
    const h = fixture();
    const r = await h.handler(new Request('https://test.invalid/claim-trial-access/health', { headers: { 'cf-connecting-ip': '198.51.100.10' } }));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ready: true });
    assert.equal(h.calls.length, 0);
});
test('public health probe fails closed without proxy IP', async () => {
    const h = fixture();
    const r = await h.handler(new Request('https://test.invalid/claim-trial-access/health'));
    assert.equal(r.status, 503);
    assert.deepEqual(await r.json(), { ready: false });
});
