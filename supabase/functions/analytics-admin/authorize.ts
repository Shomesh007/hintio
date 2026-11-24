const adminEmail = 'builtbygsv@gmail.com';

type UserIdentity = {
    provider: string;
    identity_data?: Record<string, unknown>;
};

type AuthenticatedUser = {
    email?: string;
    email_confirmed_at?: string;
    identities?: UserIdentity[];
};

// The handler calls this only after Supabase has authenticated the bearer token.
export function isAnalyticsAdmin(user: AuthenticatedUser, authenticatedToken: string) {
    if (user.email?.toLowerCase() !== adminEmail || !user.email_confirmed_at) return false;
    const verifiedGoogle = user.identities?.some(identity =>
        identity.provider === 'google' &&
        identity.identity_data?.email_verified === true &&
        typeof identity.identity_data.email === 'string' &&
        identity.identity_data.email.toLowerCase() === adminEmail
    );
    if (!verifiedGoogle) return false;
    try {
        const payload = authenticatedToken.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
        const methods = JSON.parse(atob(payload)).amr;
        return Array.isArray(methods) && methods.some(entry => entry?.method === 'oauth');
    } catch {
        return false;
    }
}
