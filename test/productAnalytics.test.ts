import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseAnalyticsEvent } from '../supabase/functions/_shared/analyticsContract';

const common = { actorId: randomUUID(), eventId: randomUUID() };

test('analytics accepts only registered event and value pairs per source', () => {
    const page = { ...common, source: 'web', event: 'page_viewed', value: '/pricing' };
    const session = { ...common, source: 'desktop', event: 'session_started', value: 'none', version: '1.0.11', distribution: 'installer' };
    assert.deepEqual(parseAnalyticsEvent(page), { ...page, version: null, distribution: null });
    assert.deepEqual(parseAnalyticsEvent(session), session);
    assert.equal(parseAnalyticsEvent({ ...page, value: '/pricing?email=user@example.com' }), null);
    assert.equal(parseAnalyticsEvent({ ...page, event: 'feature_used', value: 'history' }), null);
    assert.equal(parseAnalyticsEvent({ ...page, event: 'constructor' }), null);
    assert.equal(parseAnalyticsEvent({ ...session, version: 'private-data' }), null);
    assert.equal(parseAnalyticsEvent({ ...session, actorId: 'license-key' }), null);
    assert.equal(parseAnalyticsEvent({ ...session, resume: 'private-data' }), null);
    assert.equal(parseAnalyticsEvent({ ...session, value: 'recorded transcript' }), null);
});

test('onboarding context telemetry accepts a classification and rejects user text', () => {
    const event = { ...common, source: 'desktop', event: 'onboarding_completed', value: 'blank', version: '1.0.11', distribution: 'installer' };
    assert.deepEqual(parseAnalyticsEvent(event), event);
    assert.deepEqual(parseAnalyticsEvent({ ...event, value: 'provided' }), { ...event, value: 'provided' });
    assert.equal(parseAnalyticsEvent({ ...event, value: 'private resume' }), null);
    assert.equal(parseAnalyticsEvent({ ...event, context: 'private resume' }), null);
});
