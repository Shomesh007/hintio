// Public production is 1.0.4 until Store release. Paid and claimed three-session trial access use the legacy contract.
// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2.99.1';
const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-intent,x-runtime-secret',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const upgrade = () =>
    reply({ error: 'A Hintio security update is required. Contact admin@builtbygsv.in.', code: 'UPDATE_REQUIRED', secretsIssued: false }, 426);
const hash = async value =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
const firstKey = raw =>
    String(raw || '')
        .trim()
        .split(/[\s,;]+/)
        .filter(Boolean)[0] || '';
const oneRow = result => (Array.isArray(result) ? result[0] : result);
const PUBLIC_DESKTOP_VERSION = '1.0.4';
function productionPaid(row) {
    const m = row?.metadata || {};
    return (
        PUBLIC_DESKTOP_VERSION === '1.0.4' &&
        ['paid_monthly', 'paid_yearly'].includes(m.plan_type) &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.billing_license_id || '')
    );
}
function productionTrial(row) {
    const m = row?.metadata || {};
    return (
        PUBLIC_DESKTOP_VERSION === '1.0.4' && Number(row?.max_interviews) === 3 && m.plan_type === 'three_usage' && m.issued_for === 'free_download'
    );
}
function eligible(row, now = Date.now()) {
    if (!row || row.provider_mode !== 'managed') return false;
    const m = row.metadata || {};
    const expiry = Date.parse(row.expires_at);
    if (!Number.isFinite(expiry) || expiry <= now) return false;
    if (productionTrial(row)) return true;
    if (Number(row.max_interviews) <= 3) return false;
    if (productionPaid(row)) return true;
    const deadline = Date.parse(m.legacyDesktopCompatibilityUntil);
    return (
        m.issued_for === 'customer' &&
        m.plan_type === 'paid_monthly' &&
        m.legacyDesktopCompatibility === '1.0.4' &&
        Number.isFinite(deadline) &&
        deadline > now &&
        deadline <= expiry
    );
}
async function confirmedEligibility(client, row) {
    if (!eligible(row)) return false;
    if (productionTrial(row)) {
        const claim = await client.from('trial_key_claims').select('token_id').eq('token_id', row.token_id).maybeSingle();
        if (claim.error) throw new Error('trial lookup');
        return claim.data?.token_id === row.token_id;
    }
    if (!productionPaid(row)) return true;
    const result = await client
        .from('licenses')
        .select('id')
        .eq('id', row.metadata.billing_license_id)
        .eq('access_token_id', row.token_id)
        .eq('plan', row.metadata.plan_type === 'paid_yearly' ? 'yearly' : 'monthly')
        .eq('status', 'active')
        .gt('valid_until', new Date().toISOString())
        .maybeSingle();
    if (result.error) throw new Error('billing lookup');
    return result.data?.id === row.metadata.billing_license_id;
}
async function speechKey(client, row) {
    // Only a managed row has reached this function. Never query a BYOK/customer fallback.
    let key =
        String(row.groq_api_key || '').trim() || firstKey(Deno.env.get('HINTIO_MANAGED_GROQ_API_KEY')) || firstKey(Deno.env.get('GROQ_API_KEY'));
    if (key) return key;
    const fallback = await client
        .from('provider_secrets')
        .select('groq_api_key')
        .eq('provider_mode', 'managed')
        .eq('metadata->>issued_for', 'free_download')
        .not('groq_api_key', 'is', null)
        .neq('groq_api_key', '')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (fallback.error) throw new Error('configuration');
    return String(fallback.data?.groq_api_key || '').trim();
}
Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return reply({ error: 'Method not allowed', secretsIssued: false }, 405);
    if (!req.headers.get('content-type')?.toLowerCase().includes('application/json'))
        return reply({ error: 'JSON required', secretsIssued: false }, 415);
    try {
        if (req.headers.has('x-runtime-secret')) return upgrade(); // No internal bypass, including empty header.
        const reader = req.body?.getReader();
        if (!reader) return reply({ error: 'Invalid request', secretsIssued: false }, 400);
        let bytes = 0;
        const chunks = [];
        while (true) {
            const item = await reader.read();
            if (item.done) break;
            bytes += item.value.length;
            if (bytes > 1024) {
                await reader.cancel();
                return reply({ error: 'Request too large', secretsIssued: false }, 413);
            }
            chunks.push(item.value);
        }
        const joined = new Uint8Array(bytes);
        let offset = 0;
        for (const c of chunks) {
            joined.set(c, offset);
            offset += c.length;
        }
        const p = JSON.parse(new TextDecoder().decode(joined));
        if (!p || typeof p !== 'object' || Array.isArray(p) || (p.consume !== undefined && typeof p.consume !== 'boolean'))
            return reply({ error: 'Invalid request', secretsIssued: false }, 400);
        const auth = req.headers.get('authorization') || '';
        const token = /^Bearer\s+([A-Za-z0-9_-]{6,256})$/i.exec(auth)?.[1] || '';
        if (!token || token.startsWith('HGW-')) return reply({ error: 'Access denied', secretsIssued: false }, 401);
        if (p.accessToken !== undefined && (typeof p.accessToken !== 'string' || p.accessToken.trim() !== token))
            return reply({ error: 'Access denied', secretsIssued: false }, 401);
        const url = Deno.env.get('SUPABASE_URL') || '';
        const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
        if (!url || !anon) return reply({ error: 'Access service unavailable', secretsIssued: false }, 503);
        if (![anon, 'sb_publishable_3QAlmxPFz8uNsjg1GaV00A_fznmgMEm'].includes(req.headers.get('apikey') || ''))
            return reply({ error: 'Access denied', secretsIssued: false }, 401);
        if (req.headers.get('x-client-intent') !== 'desktop-runtime') return reply({ error: 'Access denied', secretsIssued: false }, 403);
        if (p.consume !== true) {
            const result = await fetch(url + '/functions/v1/managed-runtime', {
                method: 'POST',
                headers: { Authorization: auth, apikey: anon, 'Content-Type': 'application/json' },
                body: JSON.stringify({ operation: 'status' }),
                signal: AbortSignal.timeout(15000),
            });
            const body = await result.json();
            // Construct an allowlisted nonsecret shape even if the upstream response changes.
            const d = body.data || {};
            const c = d.providerConfiguration || {};
            return reply(
                result.ok
                    ? {
                          success: true,
                          data: {
                              providerMode: d.providerMode,
                              llmProvider: d.llmProvider,
                              openaiModel: d.openaiModel,
                              expiresAt: d.expiresAt,
                              maxInterviews: d.maxInterviews,
                              interviewsUsed: d.interviewsUsed,
                              interviewsRemaining: d.interviewsRemaining,
                              providerConfiguration: { openaiConfigured: !!c.openaiConfigured, groqConfigured: !!c.groqConfigured },
                              secretsIssued: false,
                          },
                      }
                    : { error: 'Access service rejected validation', secretsIssued: false },
                result.status
            );
        }
        const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        if (!service) return reply({ error: 'Access service unavailable', secretsIssued: false }, 503);
        const client = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
        async function limit(id, n, seconds) {
            const r = await client.rpc('enforce_access_token_rate_limit', { p_identifier: id, p_max_attempts: n, p_window_seconds: seconds });
            if (r.error) throw new Error('limiter');
            return r.data === true;
        }
        const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
        const tokenHash = await hash(token);
        if (!(await limit('gateway-auth-ip:' + (await hash(ip)), 45, 60)) || !(await limit('gateway-auth:' + tokenHash, 12, 300)))
            return reply({ error: 'Too many attempts', secretsIssued: false }, 429);
        const resolved = await client.rpc('resolve_provider_secrets', { access_token: token });
        if (resolved.error) throw new Error('access');
        let row = oneRow(resolved.data);
        if (!row) return reply({ error: 'Invalid, expired or exhausted access', secretsIssued: false }, 403);
        if (!(await confirmedEligibility(client, row))) return upgrade();
        // Canonical company OpenAI singular env wins; only its first key is exposed.
        const openai = firstKey(Deno.env.get('HINTIO_MANAGED_OPENAI_API_KEY'));
        const groq = await speechKey(client, row);
        if (!openai || !groq)
            return reply({ error: 'Managed provider configuration unavailable. No session credit consumed.', secretsIssued: false }, 503);
        if (!(await limit('legacy-start:' + tokenHash, 5, 600))) return reply({ error: 'Too many session starts', secretsIssued: false }, 429);
        const consumed = await client.rpc('consume_interview_credit', { access_token: token });
        if (consumed.error) throw new Error('credit');
        row = oneRow(consumed.data);
        if (!row || !(await confirmedEligibility(client, row))) return upgrade(); // Recheck opt-in/expiry after atomic consumption.
        const deadline =
            productionPaid(row) || productionTrial(row) ? Date.parse(row.expires_at) : Date.parse(row.metadata.legacyDesktopCompatibilityUntil);
        const remaining = Math.min(Date.parse(row.expires_at), deadline) - Date.now();
        if (remaining <= 0) return upgrade();
        // UI convenience only: raw vendor credentials are NOT revocable/quotable by this UI timer.
        const metadata = {
            plan_type: row.metadata.plan_type,
            sessionTimeoutMs: Math.max(1, Math.min(productionTrial(row) ? 15 * 60 * 1000 : 2147483647, Math.floor(remaining))),
            paidAccessExpiresAt: productionTrial(row) ? null : row.expires_at,
        };
        return reply({
            success: true,
            data: {
                tokenId: row.token_id,
                providerMode: 'managed',
                llmProvider: 'openai',
                providerConfiguration: { openaiConfigured: true, groqConfigured: true, geminiConfigured: false },
                openaiApiKeys: [openai],
                openaiModel: (Deno.env.get('HINTIO_MANAGED_OPENAI_MODEL') || 'gpt-5.6-luna').trim(),
                groqApiKey: groq,
                geminiApiKey: '',
                geminiApiKeys: [],
                azureApiKey: '',
                azureEndpoint: '',
                azureDeployment: '',
                cloudToken: '',
                expiresAt: row.expires_at,
                metadata,
                maxInterviews: Number(row.max_interviews),
                interviewsUsed: Number(row.interviews_used),
                interviewsRemaining: Math.max(0, Number(row.max_interviews) - Number(row.interviews_used)),
                creditConsumed: true,
                secretsIssued: true,
            },
        });
    } catch {
        return reply({ error: 'Invalid request or unavailable access service', secretsIssued: false }, 503);
    }
});
