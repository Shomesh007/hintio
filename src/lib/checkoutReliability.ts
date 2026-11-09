export const REQUEST_TIMEOUT_MS = 15_000;
export const CHECKOUT_TIMEOUT_MS = 30_000;

export function abortable<T>(operation: PromiseLike<T>, signal: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason ?? new Error('Request cancelled'));
        if (signal.aborted) return abort();
        signal.addEventListener('abort', abort, { once: true });
        Promise.resolve(operation)
            .then(resolve, reject)
            .finally(() => signal.removeEventListener('abort', abort));
    });
}

export async function withDeadline<T>(operation: (signal: AbortSignal) => PromiseLike<T>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('The request took too long. Please try again.')), timeoutMs);
    try {
        return await abortable(operation(controller.signal), controller.signal);
    } finally {
        clearTimeout(timer);
    }
}

interface ScriptElement {
    src: string;
    async: boolean;
    addEventListener(event: 'load' | 'error', listener: () => void): void;
    removeEventListener(event: 'load' | 'error', listener: () => void): void;
    remove(): void;
}
export function createCheckoutScriptLoader(
    environment: {
        isReady: () => boolean;
        create: () => ScriptElement;
        append: (script: ScriptElement) => void;
    },
    timeoutMs = REQUEST_TIMEOUT_MS
): () => Promise<boolean> {
    let pending: Promise<boolean> | null = null;
    return () => {
        if (environment.isReady()) return Promise.resolve(true);
        if (pending) return pending;
        pending = new Promise<boolean>(resolve => {
            const script = environment.create();
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            const finish = (success: boolean) => {
                clearTimeout(timer);
                script.removeEventListener('load', loaded);
                script.removeEventListener('error', failed);
                if (!success) script.remove();
                resolve(success);
            };
            const loaded = () => finish(environment.isReady());
            const failed = () => finish(false);
            const timer = setTimeout(failed, timeoutMs);
            script.addEventListener('load', loaded);
            script.addEventListener('error', failed);
            try {
                environment.append(script);
            } catch {
                failed();
            }
        }).finally(() => {
            pending = null;
        });
        return pending;
    };
}

// Defer continuation outside the auth callback; cancel both the error timer and subscription on success.
export function continueAfterSignIn<T>(options: {
    subscribe: (callback: (session: T) => void) => () => void;
    onSuccess: (session: T) => void;
    onTimeout: () => void;
    timeoutMs?: number;
}): () => void {
    let settled = false;
    let unsubscribe = () => {};
    let continuation: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        unsubscribe();
        options.onTimeout();
    }, options.timeoutMs ?? 20_000);
    unsubscribe = options.subscribe(session => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        continuation = setTimeout(() => options.onSuccess(session), 0);
    });
    if (settled) unsubscribe();
    return () => {
        settled = true;
        clearTimeout(timer);
        clearTimeout(continuation);
        unsubscribe();
    };
}

interface LicenseResponse {
    data: { licenseKey?: unknown; plan?: unknown } | null;
    error: unknown;
}
export async function recoverLicenseKey(
    plan: 'monthly' | 'yearly',
    invoke: (plan: 'monthly' | 'yearly', signal: AbortSignal) => PromiseLike<LicenseResponse>,
    options: { timeoutMs?: number; intervalMs?: number; attempts?: number } = {}
): Promise<string> {
    return withDeadline(async signal => {
        const attempts = options.attempts ?? 15;
        for (let attempt = 0; attempt < attempts; attempt++) {
            const { data, error } = await abortable(invoke(plan, signal), signal);
            if (!error && typeof data?.licenseKey === 'string' && data.licenseKey && (!data.plan || data.plan === plan)) return data.licenseKey;
            if (attempt < attempts - 1) await abortable(new Promise(resolve => setTimeout(resolve, options.intervalMs ?? 2000)), signal);
        }
        throw new Error('Your payment completed, but the key is still processing. Contact support with your payment reference; do not pay again.');
    }, options.timeoutMs ?? CHECKOUT_TIMEOUT_MS).catch(() => {
        throw new Error('Your payment completed, but the key is still processing. Contact support with your payment reference; do not pay again.');
    });
}
